# Einkaufslisten-App – Projektdokumentation

Eine eigene Einkaufslisten-App (Bring-Ersatz) für Bastian und seine Frau.

**Stand (zuletzt aktualisiert 01.08.2026):** **Schritt 3 + 4 fertig & live.**
- **Menge frei eintippen (01.08.2026):** Im Mengen-Menü ist die große Zahl jetzt ein **Eingabefeld** mit Zahlen-Tastatur (`inputmode="decimal"`). Man tippt z. B. **600** direkt ein, statt oft **+1** zu drücken. Die **+/−**-Knöpfe bleiben für schnelle kleine Änderungen. Umgesetzt über `<input id="amount">`; `#amount.oninput` schreibt nach `tmp.qty`, `drawSheet()` überschreibt das Feld nicht, solange es fokussiert ist.
- **Menge im Verlauf (01.08.2026):** Der Verlauf zeigt jetzt die **Menge** mit an (z. B. „🥫 Tomaten · 3", „🍖 Fleisch · 600 g"). Dafür speichert die `history` zusätzlich `qty` + `unit` (neue Spalten, siehe `supabase/history_qty.sql`), und „+ dazu" übernimmt die Menge gleich mit. **Migration nötig:** SQL aus `supabase/history_qty.sql` einmalig im Supabase-Editor ausführen.
- **Schritt 3 – Rezept-Import ohne Foto:** Ein Rezept-Link (Chefkoch & Co.) wird eingefügt oder geteilt, die Zutaten werden **exakt** ausgelesen (aus dem `schema.org/Recipe`-Datenblock der Seite), auf die gewünschte Portionszahl umgerechnet und auf die Liste gesetzt. Kein Bild-Scan, keine KI, keine Kosten.
- **Schritt 4 – Aufgeräumter Katalog + smarte Vorschläge:** Kategorien sind **einklappbar** (Standard: zu). Ganz oben ein Bereich **⭐ Oft gekauft** aus einer dauerhaften Häufigkeits-Statistik (Supabase-Tabelle `stats`). *(„Zuletzt gekauft" wurde bewusst weggelassen – das deckt der Verlauf 🕘 schon ab.)*
- Außerdem: **„Liste leeren" per 5-Sekunden-Halten**.
- Davor: Schritt 2 (Supabase-Backend + Google-Login + Live-Sync).

---

## 1. Ziel & Motivation

- **Gemeinsame Liste in Echtzeit**: Wenn einer etwas draufsetzt, sieht es der andere; wenn einer etwas runternimmt, verschwindet es beim anderen. *(✅ gebaut – Supabase Live-Sync.)*
- **Hauptmotivation – Rezept übernehmen ohne Abtippen**: Rezept-Link einfügen (oder teilen) → Zutaten + Mengen landen automatisch auf der Liste. *(✅ gebaut, siehe unten.)*
  - **Wichtige Erkenntnis:** Der ursprünglich geplante **Foto-Scan war der Umweg**. Rezeptseiten liefern die Zutaten bereits maschinenlesbar mit (`schema.org/Recipe` als JSON-LD). Das lesen wir 1:1 aus – zuverlässiger als jedes Foto, gratis und ohne KI.
- **Muss komplett gratis laufen** (kostenlose Dienste).
- Optik/Bedienung an **Bring** angelehnt (Kachel-Raster), aber eigen.

---

## 2. Technik & Architektur

- **Eine Hauptdatei**: `index.html` – HTML + CSS + JS inline, kein Build. Einzige Laufzeit-Abhängigkeit: `@supabase/supabase-js` per ESM-Import vom CDN (`esm.sh`).
- **PWA-tauglich**: fürs Handy gebaut, „Zum Home-Bildschirm hinzufügen" → Vollbild-App-Gefühl. Dateien dafür:
  - `manifest.json` – App-Name, Icon, Farben **und** `share_target` (fürs „Teilen an App", siehe Abschnitt 4).
  - `sw.js` – minimaler Service Worker (nur damit die App installierbar ist; **kein** Caching, damit die Live-Liste immer frisch ist).
  - `icon.svg` – App-Icon (grüner Einkaufswagen).
- **Backend: Supabase** (Free-Tarif) – Postgres + Auth + Realtime.
  - Projekt-Ref: `ynkvoujaqqoslbzslbvb`, URL `https://ynkvoujaqqoslbzslbvb.supabase.co`.
  - Frontend redet per Client-SDK mit Supabase; der **Publishable Key** (`sb_publishable_…`) steht im `index.html` (public-safe, durch RLS abgesichert).
  - **Login: Google OAuth** (Google-Cloud-Projekt `einkaufsliste-503918`, Freigabe-Bildschirm „In Produktion", nur Scopes email/profile → keine Warnung, kein 7-Tage-Ablauf).
  - **Zugriffsschutz (RLS)**: Nur die in Tabelle `members` hinterlegten E-Mails (Bastian + Simone) dürfen lesen/schreiben.
  - **Live-Sync** über Supabase Realtime auf `items` + `history`.
  - **Edge Function `recipe-import`** (neu, Schritt 3): holt eine Rezept-URL **serverseitig** und gibt Titel + Zutaten + Basis-Portionszahl als JSON zurück. Nötig, weil der Browser fremde Seiten (chefkoch.de) wegen **CORS nicht direkt** abrufen darf. Quelle im Repo: `supabase/functions/recipe-import/index.ts`.
- **Cache/Offline**: `localStorage` (Key `einkauf_supabase_v1`) hält die zuletzt gesehene Liste für sofortiges Bild beim Start; echte Quelle ist Supabase.
- **Hosting**: GitHub Pages (öffentlich, weil kostenloses Pages nur bei public geht).
  - Repo: `bastianstute88/einkaufsliste`
  - Live-Link: **https://bastianstute88.github.io/einkaufsliste/**

---

## 3. Datenmodell (im JS ganz oben)

```js
state = {
  items:   [ {id, name, emo, qty, unit} ],                        // aktuell auf der Liste
  history: [ {id, name, emo, action, qty, unit, who, who_name, who_avatar, t} ] // Verlauf, neuester zuerst
}
```

- **`id` ist eine UUID** (`crypto.randomUUID()`) – dieselbe ID lokal wie in Supabase (kein Doppel-Eintrag beim Realtime-Echo).
- `qty`: Zahl **oder `null`** (= „ohne Menge", kein Badge).
- `unit`: `null` (einfache Zahl) · `"g"|"kg"|"ml"|"l"` (echte Mengen) · `"Tiefkühl"` (❄️-Marker) · `"Vorrat"|"Sonstiges"|"Event"` (Bereichs-Marker, ohne Menge).
- Gleiches Produkt darf **mehrfach** vorkommen. Deshalb `id` statt Name als Schlüssel.
- `action`: `"add"` (draufgesetzt) oder `"buy"` (abgehakt/gekauft). `t` = `Date.now()`.

**Supabase-Tabellen:**
- `members(email, display_name)` – Allowlist, **nicht** vom Client lesbar; nur im Dashboard pflegen.
- `is_member()` – SECURITY-DEFINER-Funktion, Basis aller RLS-Policies.
- `profiles(user_id, email, name, avatar_url)` – für Mitglieder lesbar; jeder pflegt beim Login sein eigenes.
- `items(id, name, emo, qty, unit, created_at, created_by)` – die geteilte Liste.
- `history(id, name, emo, action, qty, unit, who, who_name, who_avatar, created_at)` – Verlauf (qty/unit seit 01.08.2026).
- `stats(name, emo, buys, last_buy)` – Kauf-Häufigkeit pro Produkt (Schritt 4). Nur für Mitglieder (RLS). Wird per Funktion `bump_stat(p_name, p_emo)` bei jedem Abhaken atomar +1 gezählt; Basis für „⭐ Oft gekauft". SQL: `supabase/stats.sql`.
- Realtime-Publication auf `items` + `history` + `stats` aktiviert.

Hinweis: Die Statistik liegt **nicht** in `state`, sondern in einer separaten Map `statsMap` (aus Tabelle `stats`).

**Ein neues Mitglied hinzufügen:** im Supabase-SQL-Editor
`insert into public.members(email, display_name) values ('neue@gmail.com','Name');`

Zentrale Konstanten: `CATALOG` (Kategorien+Emoji+Name), `UNITS = ["g","kg","ml","l"]`, `TAGS` (Tiefkühl/Vorrat/Sonstiges/Event), `SECTIONS = ["Vorrat","Sonstiges","Event"]`.

---

## 4. Bedienung / Interaktionen

**Draufsetzen**
- Produkt im Katalog (oder eigenes über die Suche) antippen → **Mengen-Menü**. Menge/Einheit wählen ODER „Übernehmen" (= ohne Menge). Menü startet auf „ohne".

**Abhaken (Artikel schon auf der Liste)** – Zwei-Druck-Prinzip:
- **1. Druck** → Artikel wird **ausgegraut** + Häkchen. **2. Druck** → **weg** (wandert in den Verlauf = Undo). Woanders tippen hebt die Auswahl auf.

**Bereiche (Reihenfolge von oben)**
1. **Auf der Liste** – normale Sachen (Zähler enthält auch Event + Sonstiges).
2. **🎁 Event** · 3. **🛍️ Sonstiges** · 4. **📦 Vorrat – kann, muss nicht** (gestrichelt, zählt NICHT mit).

**🍳 Rezept-Import (Button oben, neben 🕘) – NEU, Schritt 3**
- Öffnet ein Sheet mit **Link-Feld**: Rezept-URL (Chefkoch, Lecker, Essen&Trinken, AllRecipes …) einfügen → **„Zutaten holen"**.
- Die App ruft die Edge Function `recipe-import` (`sb.functions.invoke`) → bekommt **Titel + Zutaten + Basis-Portionszahl**.
- **Portions-Regler**: Standard = Portionszahl aus dem Rezept. Hoch/runter stellen rechnet **alle Mengen live** um. *(Wichtig: Chefkoch skaliert im Datenblock NICHT mit – nur die sichtbaren Zahlen; deshalb rechnen wir selbst.)*
- **Zutaten-Checkliste**: jede Zutat mit Emoji + umgerechneter Menge; antippen wählt ab/zu. **„Auf die Liste"** setzt die gewählten Zutaten drauf.
- **Mengen-Mapping**: `g/kg/ml/l` nativ als Badge · reine Zahl (z. B. „2 Tomaten") als einfache Zahl · andere Einheiten (EL/TL/Handvoll/Prise …) als **Notiz im Namen** (z. B. „Ketchup (3 EL)") · ohne Menge = nur der Name.
- **Teilen → Einkaufsliste** (PWA Share Target): Aus einer Rezept-App/Browser über den „Teilen"-Knopf des Handys direkt an die App. Die geteilte URL kommt als Query-Param (`share_url`/`share_text`) an, die App öffnet das Import-Sheet automatisch. **Nur Android** (iOS unterstützt Web Share Target nicht – siehe Abschnitt 7).
- **📷 Foto-Scan-Button**: ausgeblendet (`display:none`), Code bleibt im `index.html` für evtl. später. Das alte Scan-Vorschau-Sheet ist ebenfalls noch drin.

**🗑️ Liste leeren (5 Sekunden gedrückt halten) – NEU**
- Button unten am Bereich „Auf der Liste" (nur sichtbar, wenn dort etwas liegt).
- **Gedrückt halten** → füllt sich rot, Countdown „Noch 5…4…3…". **Loslassen vor Ablauf = Abbruch**, nichts passiert.
- Nach vollen **5 Sekunden**: nur der Bereich **„Auf der Liste"** wird geleert (Event/Sonstiges/Vorrat bleiben).
- **Sicherheitsnetz**: die geleerten Artikel landen im **Verlauf** (als „gekauft") und sind von dort einzeln wieder draufsetzbar.
- iPhone-tauglich über Pointer-Events; Text-Callout/Selektion beim Halten unterdrückt.

**Katalog (unten) – einklappbar + smarte Vorschläge – NEU (Schritt 4)**
- **Kategorien einklappbar**: Überschrift (z. B. „🍎 Obst & Gemüse") antippen = auf/zu; rechts steht die Anzahl. **Standard: alle zu** (aufgeräumt). Zustand wird pro Kategorie in `localStorage` gemerkt (Key `einkauf_collapsed_v1`). Beim **Suchen** werden passende Kategorien automatisch aufgeklappt.
- **⭐ Oft gekauft** (ganz oben): nach Häufigkeit sortiert – je öfter ein Artikel den Kreis *draufsetzen → abhaken* macht, desto weiter oben (bei Gleichstand kommt das zuletzt Gekaufte zuerst). Top 16.
  - **Anzeige-Filter** (Konstanten oben im JS): nur Artikel mit **mind. `OFT_MIN`=2 Käufen** (kein Einmal-Rauschen) **und** zuletzt gekauft innerhalb der letzten **`OFT_TAGE`=14 Tage** (Ruht ein Artikel 14 Tage, verschwindet er aus der Anzeige). **Der Zähler `buys` bleibt erhalten** – kauft man das Ding wieder, ist es mit seiner alten Häufigkeit sofort zurück. Nichts wird gelöscht, nur aus-/eingeblendet. Beide Zahlen leicht änderbar.
- *„Zuletzt gekauft" wurde bewusst weggelassen:* Recency deckt der **Verlauf 🕘** schon ab (letzter Eintrag antippen = wieder drauf), und beide Listen überschnitten sich zu stark.
- Datenquelle: Supabase-Tabelle **`stats`** (`name, emo, buys, last_buy`). Jedes **Abhaken** ruft `rpc('bump_stat')` auf (+1, atomar). Zählt für **beide Nutzer gemeinsam** und **übersteht „Verlauf leeren"**. Das Sammel-**„Liste leeren" zählt bewusst NICHT** (Wegwerfen ≠ Kauf). Client verträgt eine noch fehlende `stats`-Tabelle (Bereich bleibt dann einfach leer).

**Verlauf (🕘 oben rechts)**
- Zeigt, **wer** was **draufgesetzt** (➕) und **gekauft** (🛒) hat, mit Personen-Kürzel (B/S) und Zeit. Eintrag antippen → **wieder draufsetzen**. „Verlauf leeren" möglich. Abmelden unten im Sheet.

**Wer bin ich (über Login)**: Der eingeloggte Google-Nutzer *ist* „ich". Oben rechts die **Avatare** aller Angemeldeten; der eigene mit grünem Ring. Jeder Verlaufs-Eintrag wird automatisch mit der Person getaggt.

**Sync-Punkt** (im Header): grün = Live-Sync verbunden.

**Kachel-Text**: lange Namen werden per JS (`fitText`) verkleinert statt umgebrochen (Untergrenze 9 px).

---

## 5. Bewusste Design-Entscheidungen (Bastians Vorlieben)

- **Rezept-Import ohne Foto** statt Bild-Scan (zuverlässiger, gratis, ohne KI) – siehe Erkenntnis in Abschnitt 1.
- **Dunkles Theme mit true black (#000)** – OLED spart Strom. Grün als Akzent.
- **Doppel-Tipp zum Abhaken** statt Einzel-Klick (kein Versehen).
- **„Liste leeren" nur per 5-Sek-Halten** – bewusst schwer auslösbar, damit nichts aus Versehen weg ist; zusätzlich über den Verlauf rückholbar.
- **Katalog standardmäßig eingeklappt** – aufgeräumt; die häufig gebrauchten Sachen sind ja oben unter „⭐ Oft gekauft" griffbereit. Häufigkeit wird **dauerhaft** in Supabase gezählt (nicht nur aus dem Verlauf), damit sie „Verlauf leeren" übersteht und für beide zusammenzählt. **Nur „Oft gekauft", kein „Zuletzt gekauft"** – Recency deckt der Verlauf schon ab.
- **Keine dauerhafte „Erledigt"-Liste** → stattdessen Verlauf-Button oben.
- **Stück/Dose/Bund/Pkg entfernt** – nur echte Mengen (g/kg/ml/l) oder einfache Zahl.
- **Icons = Emojis** (gratis; wichtig, weil beim Import beliebige Zutaten kommen – Emoji wird gegen den Katalog geraten, sonst 🛒).
- Nur **eine** Liste → kein Dropdown-Pfeil im Titel.

---

## 6. Deployment / Änderungen pushen

**App (index.html & PWA-Dateien):**
```bash
cd "/Users/basti/Desktop/Privat/Einkaufslisten App"
git add -A
git -c user.name="bastianstute88" -c user.email="bastian.stute.88@gmail.com" \
    commit -m "…beschreibung…"
git push origin main
```
- Live-Link bleibt gleich; GitHub Pages baut nach dem Push ~1 Min neu.
- **Lokal testen**: `python3 -m http.server 8000` im Projektordner, dann `http://localhost:8000` öffnen (Google-Login braucht http, kein `file://`). `http://localhost:8000` ist in Supabase (Auth → URL Configuration → Redirect URLs) und in den erlaubten Origins der Edge Function hinterlegt.

**Edge Function `recipe-import` (Supabase):**
- Auf dem Rechner sind **weder `supabase`-CLI noch `deno`/`node`** installiert → Deploy läuft über das **Supabase-Dashboard** (kein CLI nötig):
  1. Dashboard → **Edge Functions** → **Open Editor** (bzw. „Deploy a new function").
  2. Name exakt `recipe-import`, Code aus `supabase/functions/recipe-import/index.ts` einfügen.
  3. **Deploy function**.
- Hinweis: Die Dashboard-Oberfläche rendert nur im **aktiven** Chrome-Tab.
- `verify_jwt` steht auf Default (an) und funktioniert, weil der Client per `sb.functions.invoke` automatisch den User-Token mitschickt (eingeloggter Nutzer nötig).
- Erlaubte Origins in der Function (`ALLOWED_ORIGINS`): Live-Pages-URL + `http://localhost:8000`.

**Statistik-Tabelle `stats` (Supabase, Schritt 4):**
- Einmalig die Datei `supabase/stats.sql` im **Dashboard → SQL Editor** einfügen und **Run** (legt Tabelle `stats`, RLS-Policies, Funktion `bump_stat` und Realtime an). Setzt die Funktion `is_member()` aus Schritt 2 voraus.

---

## 7. Fahrplan / Nächste Schritte

1. ✅ **Mehr Produkte** – Katalog ~130 Produkte / 11 Kategorien.
2. ✅ **Datenbank + Login** (29.07.2026) – Supabase + Google-Login, gemeinsame Live-Liste, RLS (Bastian + Simone), Verlauf mit wer/wann.
3. ✅ **Rezept-Import ohne Foto** (30.07.2026, live) – Link/Teilen → Zutaten via `schema.org/Recipe` + Edge Function, Portions-Regler, Checkliste. Plus **„Liste leeren"** (5-Sek-Halten).
4. ✅ **Katalog aufräumen + Vorschläge** (30.07.2026, live) – Kategorien einklappbar (Standard: zu); Top-Bereich **⭐ Oft gekauft** aus dauerhafter Statistik (`stats`). „Zuletzt gekauft" bewusst weggelassen (deckt der Verlauf ab).
5. 🎨 **Icons** (später) – ggf. hübsches Icon-Set + Emoji-Fallback.

**Handys: Bastian und Simone nutzen iPhone.**
- **Primärweg am iPhone:** 🍳 **Link einfügen** – funktioniert überall.
- **„Teilen → Einkaufsliste"** (Web Share Target) unterstützt **iOS nicht**. Die App ist dafür trotzdem vorbereitet (`share_url`/`share_text` werden ausgelesen; funktioniert direkt auf Android).
- **Offene iOS-Alternative (noch nicht gebaut):** ein Apple **Kurzbefehl** (Shortcuts), der aus dem Teilen-Menü den Link an `…/einkaufsliste/?share_url=<URL>` weiterreicht → App startet den Import automatisch.

**Offen/To-do:**
- iOS-Kurzbefehl für „Teilen an Einkaufsliste" einrichten (wenn gewünscht).
- Simone muss sich einmal auf der Live-URL mit ihrem Gmail (simone.horlacher89@gmail.com) anmelden, damit ihr Profil (Name/Foto) angelegt wird – ihr Konto ist in `members` schon freigeschaltet.

---

## 8. Wichtige Fakten auf einen Blick

| | |
|---|---|
| Projektordner | `/Users/basti/Desktop/Privat/Einkaufslisten App` |
| Hauptdatei | `index.html` (App komplett) |
| PWA-Dateien | `manifest.json`, `sw.js`, `icon.svg` |
| Edge Function | `supabase/functions/recipe-import/index.ts` (Rezept-Import) |
| Statistik | Tabelle `stats` + Funktion `bump_stat` (SQL: `supabase/stats.sql`) – „⭐ Oft gekauft" |
| GitHub | `bastianstute88/einkaufsliste` (public) |
| Live | https://bastianstute88.github.io/einkaufsliste/ |
| Cache | `localStorage`, Key `einkauf_supabase_v1` (nur Cache) |
| Backend | Supabase `ynkvoujaqqoslbzslbvb` (Postgres + Auth + Realtime + Edge Function) |
| Login | Google OAuth (Cloud-Projekt `einkaufsliste-503918`, „In Produktion") |
| Mitglieder | Bastian + Simone (Tabelle `members`, RLS) |
| Sync | Live (Supabase Realtime auf `items` + `history`) |
| Rezept-Import | Link/Teilen → JSON-LD → Zutaten (kein Foto, keine KI) |
| Handys | beide iPhone → „Teilen an App" nur Android; iPhone nutzt Link einfügen |
