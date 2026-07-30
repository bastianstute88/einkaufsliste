// Supabase Edge Function: recipe-import
// -------------------------------------------------------------
// Holt eine Rezept-URL SERVERSEITIG (der Browser darf das wegen CORS nicht selbst)
// und gibt Titel + Zutaten + Basis-Portionszahl als sauberes JSON zurück.
// Quelle der Daten: der schema.org/Recipe-Block (JSON-LD), den fast jede
// Rezeptseite (Chefkoch, Lecker, Essen&Trinken, AllRecipes …) mitliefert.
//
// Deploy: Supabase Dashboard → Edge Functions → recipe-import → Code einfügen → Deploy.
// Der Client ruft sie per supabase-js `functions.invoke("recipe-import", {body:{url}})`
// auf; die JWT-Prüfung übernimmt die Plattform (eingeloggter Nutzer nötig).

const ALLOWED_ORIGINS = [
  "https://bastianstute88.github.io",
  "http://localhost:8000",
  "http://localhost:8080",
];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "https://bastianstute88.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };

  // Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers });

  try {
    let url: string | null = null;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      url = body?.url ?? null;
    } else {
      url = new URL(req.url).searchParams.get("url");
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new Error("Keine gültige Rezept-URL übergeben.");
    }

    const page = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EinkaufslisteBot/1.0; +https://bastianstute88.github.io/einkaufsliste)",
        "Accept-Language": "de,en;q=0.8",
        "Accept": "text/html",
      },
      redirect: "follow",
    });
    if (!page.ok) throw new Error(`Seite nicht erreichbar (HTTP ${page.status}).`);

    const html = await page.text();
    const recipe = extractRecipe(html);
    if (!recipe) throw new Error("Auf der Seite wurde kein Rezept gefunden.");

    return new Response(JSON.stringify({ ok: true, ...recipe, source: url }), {
      headers,
    });
  } catch (e) {
    // Bewusst Status 200 mit ok:false: so liest der Client die Meldung sauber aus
    // (supabase-js würde bei 4xx nur einen generischen Fehler liefern).
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }),
      { headers },
    );
  }
});

/* ---------- JSON-LD Extraktion ---------- */

function extractRecipe(html: string) {
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue; // manche Seiten haben kaputtes/kommentiertes JSON-LD -> überspringen
    }
    const found = findRecipe(data);
    if (found) {
      return {
        title: cleanTitle(String(found.name ?? "")),
        ingredients: (Array.isArray(found.recipeIngredient)
          ? found.recipeIngredient
          : []).map((x: unknown) => String(x).trim()).filter(Boolean),
        servings: parseYield(found.recipeYield),
      };
    }
  }
  return null;
}

// Läuft rekursiv durch @graph / Arrays / verschachtelte Objekte, bis ein Recipe
// mit recipeIngredient auftaucht.
function findRecipe(node: unknown): any {
  const stack = [node];
  while (stack.length) {
    const x = stack.pop();
    if (x && typeof x === "object") {
      const anyX = x as Record<string, unknown>;
      const type = anyX["@type"];
      const isRecipe = type === "Recipe" ||
        (Array.isArray(type) && type.includes("Recipe"));
      if ((isRecipe || anyX.recipeIngredient) &&
        Array.isArray(anyX.recipeIngredient)) {
        return anyX;
      }
      for (const k in anyX) {
        if (anyX[k] && typeof anyX[k] === "object") stack.push(anyX[k]);
      }
    }
  }
  return null;
}

function parseYield(y: unknown): number | null {
  if (y == null) return null;
  const arr = Array.isArray(y) ? y : [y];
  for (const v of arr) {
    const mm = String(v).match(/\d+/);
    if (mm) return parseInt(mm[0], 10);
  }
  return null;
}

// Chefkoch hängt " von <benutzer>" an den Titel -> entfernen.
function cleanTitle(t: string): string {
  return t.replace(/\s+von\s+\S+\s*$/, "").trim();
}
