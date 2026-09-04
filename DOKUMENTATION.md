# Einkaufslisten-App – Projektdokumentation

Eine eigene Einkaufslisten-App (Bring-Ersatz) für Bastian und seine Frau.

**Stand (zuletzt aktualisiert 04.09.2026):** **Schritt 3 + 4 fertig & live.**
- **🍜 Asia Markt (04.09.2026, live – auf iPhone und Mac bestätigt):** Neuer **Marker im Mengen-Menü** (hinten in der zweiten Reihe, nach Vorrat/Sonstiges/Event) und dazu ein eigener **Bereich auf der Liste**. Anlass: Bastian fährt öfter in den Asia-Markt, die Sachen lagen bisher in „Sonstiges" zwischen allem Möglichen. Damit vorhandene Artikel umziehen können, ohne sie neu anzulegen: **Kachel auf der Liste ~0,6 s gedrückt halten = Menge/Bereich nachträglich ändern.** Details in Abschnitt 4.
- **Dock-Kachel lädt jetzt neu (04.09.2026):** Der Launcher holte ein offenes Chrome-Fenster nur nach vorn – **ohne eine einzige Anfrage**, also lief dort weiter der Code vom letzten Seitenaufbau. Deshalb fehlte der Asia-Markt-Bereich am Mac, während er auf dem iPhone sofort da war. `reload active tab of w` behebt es. Details in Abschnitt 6.
- **Emojis & Kachel-Text nachgebessert (04.09.2026):** ☕ statt 🫘 bei „Kaffeebohnen", 🥐 für Semmeln/Brötchen, 🧅 statt 🥬 bei „Lauchzwiebeln", 🥛 für Joghurt/Skyr/Sahne/Schmand, 🐟 statt 🥫 bei Thunfisch, 🍝 statt 🍜 bei Spaghetti, 🌽 statt 🥫 bei Dosenmais, 🍄‍🟫 statt Fliegenpilz bei Champignons – und lange Namen werden jetzt getrennt statt abgeschnitten. Details in Abschnitt 4.
- **Dock-Kachel am Mac (04.09.2026):** Ein Startknopf im Dock öffnet die Liste als eigenes Fenster ohne Browser-Rahmen – inkl. eigenem Mac-Icon. Details in Abschnitt 6.
- **⭐-Kacheln rauswerfen (21.08.2026):** Eine Kachel unter „Oft gekauft" **~0,6 s gedrückt halten** → Sicherheitsfrage → weg. Anlass: Ein Rezept-Link war versehentlich als Artikel „Https://www.chefkoch.de/…" auf der Liste gelandet, zweimal abgehakt worden und stand dadurch dauerhaft unter „Oft gekauft", ohne dass man ihn wieder loswurde.
- **Links landen im Rezept-Import (21.08.2026):** Steht ein `https://…` oder `www.…` im Suchfeld, wird daraus **kein** Artikel mehr – der Knopf heißt dann „🍳 Rezept importieren" und öffnet direkt den Import. Behebt die Ursache des Punkts darüber.
- **Emoji-Raten repariert (21.08.2026):** Statt vieler 🛒-Platzhalter gibt es jetzt ein gemeinsames Rate-Verfahren mit Stichwortliste (`EMO_WORDS`) – Hafermilch 🥛, Datteln 🌴, Kefir 🥛, Wurst 🌭, Hummus 🥣 usw. Beim Tippen über die Suche wurde vorher **fest** 🛒 gesetzt, ohne überhaupt im Katalog nachzusehen. Details in Abschnitt 4.
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
  - **Live-Sync** über Supabase Realtime auf `items` + `history` + `stats` (letzteres, damit ein rausgeworfener ⭐-Eintrag auch beim anderen sofort verschwindet).
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
- `unit`: `null` (einfache Zahl) · `"g"|"kg"|"ml"|"l"` (echte Mengen) · `"Tiefkühl"` (❄️-Marker) · `"Asia Markt"|"Vorrat"|"Sonstiges"|"Event"` (Bereichs-Marker, ohne Menge).
- Gleiches Produkt darf **mehrfach** vorkommen. Deshalb `id` statt Name als Schlüssel.
- `action`: `"add"` (draufgesetzt) oder `"buy"` (abgehakt/gekauft). `t` = `Date.now()`.

**Supabase-Tabellen:**
- `members(email, display_name)` – Allowlist, **nicht** vom Client lesbar; nur im Dashboard pflegen.
- `is_member()` – SECURITY-DEFINER-Funktion, Basis aller RLS-Policies.
- `profiles(user_id, email, name, avatar_url)` – für Mitglieder lesbar; jeder pflegt beim Login sein eigenes.
- `items(id, name, emo, qty, unit, created_at, created_by)` – die geteilte Liste.
- `history(id, name, emo, action, qty, unit, who, who_name, who_avatar, created_at)` – Verlauf (qty/unit seit 01.08.2026).
- `stats(name, emo, buys, last_buy)` – Kauf-Häufigkeit pro Produkt (Schritt 4). Nur für Mitglieder (RLS). Wird per Funktion `bump_stat(p_name, p_emo)` bei jedem Abhaken atomar +1 gezählt; Basis für „⭐ Oft gekauft". SQL: `supabase/stats.sql`. **Achtung:** `stats.sql` legt nur select/insert/update-Policies an – **kein delete**. Fürs echte Löschen einzelner Einträge gibt es `supabase/stats_delete.sql` (optional, siehe Abschnitt 4 und 6).
- Realtime-Publication auf `items` + `history` + `stats` aktiviert.

Hinweis: Die Statistik liegt **nicht** in `state`, sondern in einer separaten Map `statsMap` (aus Tabelle `stats`).

**Ein neues Mitglied hinzufügen:** im Supabase-SQL-Editor
`insert into public.members(email, display_name) values ('neue@gmail.com','Name');`

Zentrale Konstanten: `CATALOG` (Kategorien+Emoji+Name), `EMO_WORDS` (Stichwörter fürs Emoji-Raten außerhalb des Katalogs), `UNITS = ["g","kg","ml","l"]`, `TAGS` (Tiefkühl/Vorrat/Sonstiges/Event/Asia Markt), `SECTIONS = ["Vorrat","Sonstiges","Event","Asia Markt"]`.

---

## 4. Bedienung / Interaktionen

**Draufsetzen**
- Produkt im Katalog (oder eigenes über die Suche) antippen → **Mengen-Menü**. Menge/Einheit wählen ODER „Übernehmen" (= ohne Menge). Menü startet auf „ohne".
- **Link im Suchfeld** (`https://…` oder `www.…`): wird **nicht** als Artikel angelegt – der Hinzufügen-Knopf heißt dann „🍳 Rezept importieren" und Enter/Tippen öffnet direkt den Rezept-Import mit der URL. (Vorher landete ein eingefügter Rezept-Link als Artikel „Https://www.chefkoch.de/…" auf der Liste und nach zweimaligem Abhaken sogar unter „⭐ Oft gekauft".)

**Abhaken (Artikel schon auf der Liste)** – Zwei-Druck-Prinzip:
- **1. Druck** → Artikel wird **ausgegraut** + Häkchen. **2. Druck** → **weg** (wandert in den Verlauf = Undo). Woanders tippen hebt die Auswahl auf.

**Bereiche (Reihenfolge von oben)**
1. **Auf der Liste** – normale Sachen (Zähler enthält auch Asia Markt + Event + Sonstiges).
2. **🍜 Asia Markt** · 3. **🎁 Event** · 4. **🛍️ Sonstiges** · 5. **📦 Vorrat – kann, muss nicht** (gestrichelt, zählt NICHT mit).
- Jeder Bereich taucht nur auf, wenn etwas drin liegt, und blendet die Mengen-Badges aus (der Bereich sagt ja schon alles).

**🍜 Asia Markt – NEU (04.09.2026)**
- **Warum:** Zeug aus dem Asia-Markt landete bisher in „Sonstiges" und stand dort zwischen allem Möglichen. Jetzt ist es ein eigener Bereich – beim Einkaufen sieht man auf einen Blick, was es nur dort gibt.
- **Marker im Mengen-Menü:** zweite Chip-Reihe, **hinten nach Vorrat/Sonstiges/Event** (bewusst nicht davor, damit die gewohnten drei da bleiben, wo sie waren). Auf dem iPhone rutscht er dadurch in eine dritte Zeile.
- **Bereich auf der Liste:** direkt unter „Auf der Liste", vor Event/Sonstiges/Vorrat. Verhält sich wie die anderen Bereiche – erscheint nur, wenn etwas drin liegt, blendet die Mengen-Badges aus, **zählt** beim Zähler „X Artikel zu kaufen" mit (anders als Vorrat) und **überlebt „Liste leeren"**.
- **Bewusst NICHT gebaut:** keine eigene Katalog-Kategorie mit Asia-Produkten und keine Auto-Vorauswahl beim Draufsetzen. Der Marker wird von Hand gesetzt – wie bei Vorrat/Sonstiges/Event auch.
- **Emoji-Raten** kennt die typischen Begriffe trotzdem (`EMO_WORDS`, greift auch beim Rezept-Import): ramen/udon/soba/reisnudeln → 🍜, sojasauce/mirin/reisessig → 🍶, fischsauce/hoisin/teriyaki → 🫙, sriracha/sambal/gochujang → 🌶️, gyoza/wan tan/dumpling → 🥟, nori → 🍙, pak choi/chinakohl → 🥬, zitronengras/koriander/wasabi → 🌿, matcha → 🍵, panko → 🌾, krupuk/tempura → 🍤, miso → 🫘. Vorher gab es dafür 🛒.

**Menge/Bereich nachträglich ändern: Listen-Kachel ~0,6 s gedrückt halten – NEU (04.09.2026)**
- Anlass: Ohne das müsste man einen Artikel abhaken und neu draufsetzen, nur um ihn von „Sonstiges" nach „🍜 Asia Markt" zu schieben.
- **Kachel im Bereich „Auf der Liste"/Asia/Event/Sonstiges/Vorrat halten** → sie wird grün umrandet und etwas kleiner, dann öffnet sich das gewohnte **Mengen-Menü mit den aktuellen Werten**. „Übernehmen" schreibt Menge + Bereich zurück (`updateItem` → `sb.from("items").update(...)`), der Artikel springt sofort in den passenden Bereich.
- Scrollen/Wegrutschen (>10 px) bricht ab; der Tap nach dem Halten wird geschluckt, damit nichts versehentlich abgehakt wird. Gleiches Prinzip wie beim Langdruck auf ⭐-Kacheln, nur mit `edit-hold` (grün) statt `fav-hold` (rot).
- Technisch: `openEdit(id)` setzt `pending.id`; `#saveBtn` entscheidet daran zwischen **ändern** (`updateItem`) und **neu anlegen** (`addItem`).
- Läuft **auf iPhone und Mac** (dort: Maustaste gedrückt halten). Die Kacheln haben `user-select:none`, es markiert sich beim Halten also kein Text.

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
- Nach vollen **5 Sekunden**: nur der Bereich **„Auf der Liste"** wird geleert (Asia Markt/Event/Sonstiges/Vorrat bleiben).
- **Sicherheitsnetz**: die geleerten Artikel landen im **Verlauf** (als „gekauft") und sind von dort einzeln wieder draufsetzbar.
- iPhone-tauglich über Pointer-Events; Text-Callout/Selektion beim Halten unterdrückt.

**Katalog (unten) – einklappbar + smarte Vorschläge – NEU (Schritt 4)**
- **Kategorien einklappbar**: Überschrift (z. B. „🍎 Obst & Gemüse") antippen = auf/zu; rechts steht die Anzahl. **Standard: alle zu** (aufgeräumt). Zustand wird pro Kategorie in `localStorage` gemerkt (Key `einkauf_collapsed_v1`). Beim **Suchen** werden passende Kategorien automatisch aufgeklappt.
- **⭐ Oft gekauft** (ganz oben): nach Häufigkeit sortiert – je öfter ein Artikel den Kreis *draufsetzen → abhaken* macht, desto weiter oben (bei Gleichstand kommt das zuletzt Gekaufte zuerst). Top 16.
  - **Anzeige-Filter** (Konstanten oben im JS): nur Artikel mit **mind. `OFT_MIN`=2 Käufen** (kein Einmal-Rauschen) **und** zuletzt gekauft innerhalb der letzten **`OFT_TAGE`=14 Tage** (Ruht ein Artikel 14 Tage, verschwindet er aus der Anzeige). **Der Zähler `buys` bleibt erhalten** – kauft man das Ding wieder, ist es mit seiner alten Häufigkeit sofort zurück. Nichts wird gelöscht, nur aus-/eingeblendet. Beide Zahlen leicht änderbar.
  - **Rauswerfen: ⭐-Kachel ~0,6 s gedrückt halten** → sie wird rot/klein, Sicherheitsfrage, dann weg (für Tippfehler oder Blödsinn, der versehentlich zweimal abgehakt wurde). Scrollen/Wegrutschen (>10 px) bricht ab; der Tap danach wird geschluckt, damit sich nicht das Mengen-Menü öffnet. Gilt **nur** für ⭐-Kacheln (`data-fav`), nicht für den normalen Katalog. Technisch: `sb.from("stats").delete()` – falls die DB das (noch) nicht erlaubt, setzt die App als Fallback `buys=0, last_buy=null`, wodurch die Kachel genauso verschwindet. Für echtes Löschen einmalig `supabase/stats_delete.sql` im SQL Editor ausführen (fügt die fehlende DELETE-Policy hinzu).
- *„Zuletzt gekauft" wurde bewusst weggelassen:* Recency deckt der **Verlauf 🕘** schon ab (letzter Eintrag antippen = wieder drauf), und beide Listen überschnitten sich zu stark.
- Datenquelle: Supabase-Tabelle **`stats`** (`name, emo, buys, last_buy`). Jedes **Abhaken** ruft `rpc('bump_stat')` auf (+1, atomar). Zählt für **beide Nutzer gemeinsam** und **übersteht „Verlauf leeren"**. Das Sammel-**„Liste leeren" zählt bewusst NICHT** (Wegwerfen ≠ Kauf). Client verträgt eine noch fehlende `stats`-Tabelle (Bereich bleibt dann einfach leer).

**Verlauf (🕘 oben rechts)**
- Zeigt, **wer** was **draufgesetzt** (➕) und **gekauft** (🛒) hat, mit Personen-Kürzel (B/S) und Zeit. Eintrag antippen → **wieder draufsetzen**. „Verlauf leeren" möglich. Abmelden unten im Sheet.

**Wer bin ich (über Login)**: Der eingeloggte Google-Nutzer *ist* „ich". Oben rechts die **Avatare** aller Angemeldeten; der eigene mit grünem Ring. Jeder Verlaufs-Eintrag wird automatisch mit der Person getaggt.

**Sync-Punkt** (im Header): grün = Live-Sync verbunden.

**Kachel-Text**: lange Namen werden per JS (`fitText`) verkleinert (Untergrenze 9 px) **und zusätzlich umgebrochen** (`overflow-wrap:anywhere` + `hyphens:auto`, greift dank `<html lang="de">` mit deutscher Silbentrennung). *Vorher (04.09.2026 behoben):* Ein langes Wort ohne Leerzeichen wie „Aufbacksemmeln" ließ sich nicht umbrechen, wurde bis 9 px geschrumpft und dann **mitten im Wort abgeschnitten** („Aufbacksemmelr"). Jetzt steht da „Aufbacksem-meln".

**Emoji-Raten (`emoFor`)** – warum früher so viele 🛒-Karren auftauchten: der Fallback greift, sobald ein Name nicht *exakt* im Katalog steht. Beim Tippen über die Suche wurde sogar fest `"🛒"` gesetzt, ohne überhaupt nachzusehen (deshalb hatte selbst „Brot" einen Karren, obwohl 🍞 im Katalog liegt). Jetzt sucht **eine** Funktion in dieser Reihenfolge: exakter Katalog-Treffer → exaktes Stichwort aus `EMO_WORDS` → Stichwort als Teiltreffer (ab 4 Zeichen, **längere Stichwörter zuerst**, damit „hafermilch" 🥛 schlägt statt nur „milch") → Katalogname als Teiltreffer in **beide** Richtungen (fängt Einzahl/Mehrzahl: „Banane" ↔ „Bananen") → erst dann 🛒.
- `EMO_WORDS` ist die Erweiterungsliste für alles außerhalb des Katalogs (Milchalternativen, Wurstsorten, Aufstriche, Drogerie …). Neue Wünsche einfach dort in die passende Emoji-Zeile eintragen – der Katalog selbst muss nicht wachsen.
- `guessEmo` (Rezept-Import) ist nur noch ein Alias auf `emoFor` – vorher waren es zwei leicht verschiedene Rate-Funktionen.
- `showEmo(emo, name)` bessert beim **Anzeigen** nach: es wird **immer neu geraten**, und das Ergebnis gewinnt, sobald es *nicht* 🛒 ist; nur wenn das Raten aufgibt, bleibt das gespeicherte Emoji stehen. **Warum so (04.09.2026):** Vorher wurde nur der alte 🛒 ersetzt – ein *falsch* geratenes Emoji (🫘 bei „Kaffeebohnen") stand damit für immer in der Datenbank und blieb auch nach einer Korrektur der Liste sichtbar. Jetzt wirkt jede Verbesserung an `EMO_WORDS`/Katalog **rückwirkend** auf Liste, Verlauf und ⭐-Kacheln, ohne dass in Supabase etwas umgeschrieben werden muss. (Ein von Hand gewähltes Emoji gibt es nicht – alle gespeicherten Emojis stammen selbst aus dem Raten.)
- **Korrekturen vom 04.09.2026** (alle als Stichwort, damit auch Verbunde wie „Filterkaffee" greifen): ☕ `kaffee`/`espresso` – sonst gewann bei „Kaffeebohnen" der Katalogname **Bohnen** 🫘, weil er in der Katalogreihenfolge vor „Kaffee" steht. 🥐 `semmel`/`brötchen` – „Aufbacksemmeln" hatte gar keinen Treffer (🛒). 🧅 `zwiebel` – „Lauchzwiebeln" wurde zu 🥬 Salat, weil das Stichwort `lauch` traf; `zwiebel` ist mit 7 Zeichen länger und wird deshalb zuerst geprüft. Und die Milchprodukte auf **🥛** vereinheitlicht: Joghurt (war 🍦 Eis), Skyr (war 🥤 Becher), Sahne und Schmand (beide 🍶 Sakeflasche) plus Stichwörter `joghurt`, `skyr`, `sahne`, `schmand`, `sauerrahm`, `crème fraîche`. `kaffeesahne` steht extra drin, sonst hätte das längere `kaffee` gewonnen. 🐟 **Thunfisch** stand als 🥫 im Katalog (gemeint war die *Dose*, auf dem iPhone sieht das aber wie eine Tomatendose aus) – jetzt Fisch wie Lachs & Co., plus Stichwörter `thunfisch`, `sardinen`, `sardellen`. 🥫 bleibt nur noch bei **Tomatensoße** – da ist die Tomatendose ja richtig.
- **Katalog-Durchsicht am 04.09.2026** (einmal alle ~130 Kacheln nebeneinander gerendert, statt sie einzeln beim Einkaufen zu entdecken): 🍝 **Spaghetti** (war 🍜 = asiatische Nudelsuppe), 🌽 **Dosenmais** (war 🥫), 🥩 **Schnitzel** (war 🥓 Bacon), 🫧 **Sprudel** (war 💧 wie Wasser – zwei identische Tropfen), 🥣 **Cornflakes** (war 🌽 Maiskolben), 🫙 **Hefe** (war 🧈, sah aus wie Butter), 🍄‍🟫 **Champignons** (war 🍄 – der rote *Fliegenpilz*). **Suppe** und **Bonbons** sind ganz aus dem Katalog geflogen (wird beides nicht gekauft) – nebenbei ist damit auch die Dopplung „Zucker 🍬 = Bonbons 🍬" erledigt.
- ⚠️ **Der braune Pilz 🍄‍🟫 ist eine ZWJ-Verbindung aus Emoji 15.1** (🍄 + Zero-Width-Joiner + 🟫) und braucht **mindestens iOS 17.4** (März 2024). Auf älteren Geräten zerfällt er sichtbar in zwei Zeichen: 🍄🟫. Für Bastian und Simone geprüft und in Ordnung – aber der einzige Katalog-Eintrag mit so einer Mindestversion, deshalb hier notiert.
- **Bewusst nicht geändert** (kein besseres Emoji vorhanden, einmal durchgesprochen): Linsen/Bohnen/Kichererbsen teilen sich 🫘, Öl und Olivenöl teilen sich 🫒, Chips bleibt 🥔, und Schokolade/Nutella/Kakao/Backkakao bleiben alle 🍫.
- **Merke fürs nächste Mal:** Der Katalog lässt sich schnell komplett anschauen, indem man `CATALOG` in eine Test-Seite mit der Kachel-CSS rendert und per `chrome --headless --screenshot` abfotografiert – so fallen doppelte oder irreführende Emojis auf einen Blick auf.

---

## 5. Bewusste Design-Entscheidungen (Bastians Vorlieben)

- **Rezept-Import ohne Foto** statt Bild-Scan (zuverlässiger, gratis, ohne KI) – siehe Erkenntnis in Abschnitt 1.
- **Dunkles Theme mit true black (#000)** – OLED spart Strom. Grün als Akzent.
- **Doppel-Tipp zum Abhaken** statt Einzel-Klick (kein Versehen).
- **„Liste leeren" nur per 5-Sek-Halten** – bewusst schwer auslösbar, damit nichts aus Versehen weg ist; zusätzlich über den Verlauf rückholbar.
- **Katalog standardmäßig eingeklappt** – aufgeräumt; die häufig gebrauchten Sachen sind ja oben unter „⭐ Oft gekauft" griffbereit. Häufigkeit wird **dauerhaft** in Supabase gezählt (nicht nur aus dem Verlauf), damit sie „Verlauf leeren" übersteht und für beide zusammenzählt. **Nur „Oft gekauft", kein „Zuletzt gekauft"** – Recency deckt der Verlauf schon ab.
- **Keine dauerhafte „Erledigt"-Liste** → stattdessen Verlauf-Button oben.
- **Stück/Dose/Bund/Pkg entfernt** – nur echte Mengen (g/kg/ml/l) oder einfache Zahl.
- **Icons = Emojis** (gratis; wichtig, weil beim Import und beim freien Eintippen beliebige Namen kommen). Geraten wird gegen Katalog **+ Stichwortliste `EMO_WORDS`**; 🛒 ist nur noch die letzte Notlösung. Ein echtes Icon-Set wäre möglich, ist aber bewusst offen (Punkt 5 im Fahrplan) – Emojis sind gratis, brauchen keine Dateien und decken auch Exoten ab.
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
- **Optional, noch offen:** `supabase/stats_delete.sql` genauso ausführen – ergänzt die fehlende **DELETE-Policy**, damit rausgeworfene ⭐-Einträge wirklich aus der Tabelle verschwinden statt nur auf `buys=0` gesetzt zu werden. Ohne den Schritt funktioniert das Rauswerfen trotzdem (Fallback), es bleiben nur Karteileichen in `stats` stehen.

**Keepalive – Supabase vor dem Auto-Pausieren schützen (20.08.2026):**
- **Warum:** Supabase pausiert Projekte im Free-Tarif nach **7 Tagen ohne API-Aktivität** (Warnmail kommt schon vorher). Bei nur einem Wocheneinkauf zu zweit liegt die echte Nutzung genau auf dieser Kante – ein Urlaub oder ein verschobener Einkaufstag reicht zum Pausieren.
- **Lösung:** GitHub Action `.github/workflows/supabase-keepalive.yml` – läuft per Cron **täglich** um 6:17 UTC und ist zusätzlich per `workflow_dispatch` manuell startbar (GitHub → Actions → „Supabase wachhalten" → Run workflow). Zwei bewusst **entkoppelte** Aufgaben:
  1. **Ping (täglich):** `curl` auf `/rest/v1/items?select=id&limit=1` mit dem publishable Key → zählt bei Supabase als Aktivität. Täglich statt alle 3 Tage, weil GitHub geplante Läufe bei hoher Last verzögern oder **ganz überspringen** darf; so überleben wir mehrere Ausfälle am Stück, ohne die 7-Tage-Grenze zu reißen. Die 6:17 (nicht zur vollen Stunde) meidet die Lastspitze.
  2. **Zeitstempel-Commit (nur ~1×/Monat):** `.keepalive` wird nur neu geschrieben und committet, wenn er älter als `COMMIT_ALLE_TAGE` (=20) ist. Zweck ist allein die **60-Tage-Regel** (GitHub schaltet Cron-Workflows in Repos ohne Aktivität ab) – dafür reicht ein Commit im Monat, und es spart tägliche Bot-Commits samt Pages-Rebuilds.
  - Merke: Ping-Frequenz und Commit-Frequenz sind getrennt einstellbar (Cron ↔ `COMMIT_ALLE_TAGE`). Beim `git pull` gelegentlich einen Bot-Commit mitziehen.
- **Fehlerlogik:** `2xx` und `401/403` (RLS blockt anonym – Anfrage zählt trotzdem) gelten als **ok**. *Nachgemessen am 21.08.2026:* der anonyme Ping auf `items` liefert tatsächlich **HTTP 200 mit leerem Array `[]`** – RLS filtert die Zeilen weg, statt die Anfrage abzulehnen. Der 401/403-Fall ist also nur die Absicherung, der Normalfall ist 200. Wichtig zu wissen: ein „erfolgreicher" Ping beweist **nicht**, dass Daten lesbar sind – er beweist nur, dass das Projekt wach ist (genau das ist ja der Zweck). nur echte Ausfälle (5xx / keine Antwort) machen den Job rot. Eine Fehlschlag-Mail von GitHub ist also das echte Warnsignal.
- **Der Key im Workflow ist der publishable Key** – steht ohnehin öffentlich in `index.html`, kein Secret nötig.
- **Stolperstein beim Pushen:** Dateien unter `.github/workflows/` brauchen den `workflow`-Scope. Falls `git push` mit *„refusing to allow an OAuth App to create or update workflow"* abbricht: einmalig `gh auth refresh -h github.com -s workflow` ausführen (Geräte-Code im Browser bestätigen), dann erneut pushen.
- Ein Pro-Upgrade (25 $/Monat) ist dafür **nicht** nötig.

**Dock-Kachel „Einkaufsliste" auf dem Mac (04.09.2026):**
- **Warum:** Am Handy ist die App aufs Home-Display gelegt – am Mac musste man sie sich bisher aus den Lesezeichen suchen. Jetzt liegt sie als **Startknopf im Dock**, wie das Artikel-Dashboard.
- **Was passiert beim Klick:** `/Applications/Einkaufsliste.app` öffnet die Live-App in einem **eigenen Chrome-Fenster ohne Adressleiste und Tabs** (`open -na "Google Chrome" --args --app=<URL>`) – sieht aus wie ein echtes Programm. Ist das Fenster schon offen, wird es **neu geladen und nach vorn geholt** statt ein zweites aufzumachen.
- 🚨 **`reload active tab of w` ist Pflicht (04.09.2026):** Ohne das holt der Dock-Klick nur ein Fenster nach vorn, das seit Stunden offen steht – **es wird keine einzige Anfrage gestellt**, also läuft dort weiter der alte Code. Genau so ist der 🍜-Asia-Markt-Bereich am Mac „nicht angekommen", während er auf dem iPhone (App geschlossen → echter Seitenaufbau) sofort da war. **Kein Cache-Problem:** Der Service Worker cached bewusst nichts, und der HTTP-Cache von GitHub Pages (`max-age=600`) wäre nach 10 Minuten durch. Der `reload` steckt in einem eigenen `try`, damit ohne Automations-Freigabe wenigstens das Nach-vorn-Holen bleibt.
- **Nach jeder Änderung an `tools/launcher.applescript` muss das Bundle neu gebaut werden** – die `.app` enthält eine kompilierte Kopie (`Contents/Resources/Scripts/main.scpt`), die Quelldatei allein bewirkt nichts. Befehle siehe unten; danach `osadecompile …/main.scpt` zur Kontrolle.
- **Quellen im Repo:** `tools/launcher.applescript` (Starter), `tools/mac-icon.svg` (Icon-Vorlage), `tools/icon.icns` (fertiges Mac-Icon).
- **App neu bauen** – Reihenfolge ist wichtig:
  ```bash
  cd "/Users/basti/Desktop/Privat/Einkaufslisten App"
  osacompile -o "/Applications/Einkaufsliste.app" tools/launcher.applescript
  cp tools/icon.icns "/Applications/Einkaufsliste.app/Contents/Resources/applet.icns"
  rm -f "/Applications/Einkaufsliste.app/Contents/Resources/Assets.car"   # sonst gewinnt das Standard-Icon
  codesign --force --deep --sign - "/Applications/Einkaufsliste.app"
  ```
  Icon **vor** dem Signieren hineinkopieren, sonst bricht die Signatur und die Kachel startet nicht.
- 🚨 **`Assets.car` muss weg** (gleicher Stolperstein wie beim Artikel-Dashboard, dort in `PROJEKT.md` §3 dokumentiert): `osacompile` legt neben `applet.icns` einen Asset-Katalog mit dem Standard-Applet-Icon ab, und **den bevorzugt macOS gegenüber der `.icns`** – das eigene Icon steckt zwar drin, wird aber nie angezeigt (weiße Schriftrolle). Nach dem Löschen greift `CFBundleIconFile = applet` sofort; Dock ggf. auffrischen mit `touch` + `lsregister -f` + `killall Dock`.
- **Icon-Vorlage getrennt vom PWA-Icon:** `icon.svg` bleibt wie es ist (maskable, **voller** schwarzer Bleed – richtig fürs Handy, auf dem Mac aber ein hässliches schwarzes Quadrat). `tools/mac-icon.svg` ist die Mac-Fassung: transparent außen, macOS-typisches abgerundetes Quadrat mit Rand, grüner Verlauf, gleicher Einkaufswagen. Umgewandelt mit Bordmitteln – `sips` rendert das SVG nach PNG, `sips -z` erzeugt die Größen 16…1024, `iconutil -c icns` macht daraus die `.icns`.
- **Ins Dock gelegt** per `defaults write com.apple.dock persistent-apps -array-add …` + `killall Dock`; danach lässt sich die Kachel wie jede andere an die gewünschte Stelle ziehen.
- **Einmalige Rückfrage von macOS:** Beim ersten Klick fragt das System „Einkaufsliste möchte Google Chrome steuern" → **erlauben**. Lehnt man ab, funktioniert der Knopf trotzdem, macht dann aber bei jedem Klick ein neues Fenster auf (eingebauter Fallback). Ohne Chrome öffnet der Knopf den Standardbrowser.

---

## 7. Fahrplan / Nächste Schritte

1. ✅ **Mehr Produkte** – Katalog ~150 Produkte / 11 Kategorien.
2. ✅ **Datenbank + Login** (29.07.2026) – Supabase + Google-Login, gemeinsame Live-Liste, RLS (Bastian + Simone), Verlauf mit wer/wann.
3. ✅ **Rezept-Import ohne Foto** (30.07.2026, live) – Link/Teilen → Zutaten via `schema.org/Recipe` + Edge Function, Portions-Regler, Checkliste. Plus **„Liste leeren"** (5-Sek-Halten).
4. ✅ **Katalog aufräumen + Vorschläge** (30.07.2026, live) – Kategorien einklappbar (Standard: zu); Top-Bereich **⭐ Oft gekauft** aus dauerhafter Statistik (`stats`). „Zuletzt gekauft" bewusst weggelassen (deckt der Verlauf ab).
5. ✅ **Emoji-Raten + ⭐ aufräumen** (21.08.2026, live) – gemeinsames Rate-Verfahren mit `EMO_WORDS` statt 🛒-Platzhalter; ⭐-Kacheln per Langdruck entfernbar; Links gehen in den Rezept-Import.
6. ✅ **Asia Markt** (04.09.2026, live) – neuer Marker 🍜 im Mengen-Menü + eigener Listen-Bereich; dazu **Langdruck auf Listen-Kacheln**, um Menge/Bereich nachträglich zu ändern. Katalog-Kategorie mit Asia-Produkten + Auto-Vorauswahl waren gebaut und wurden auf Bastians Wunsch **wieder verworfen** (zu viel des Guten – der Marker wird von Hand gesetzt wie Vorrat/Sonstiges/Event auch). Nachgezogen: Dock-Kachel lädt neu (Abschnitt 6), sonst kommen Updates am Mac nie an.
7. 🎨 **Icons** (später, weiterhin offen) – ggf. hübsches Icon-Set statt Emojis. Durch die Stichwortliste ist der Druck dahinter deutlich kleiner geworden.

**Handys: Bastian und Simone nutzen iPhone.**
- **Primärweg am iPhone:** 🍳 **Link einfügen** – funktioniert überall.
- **„Teilen → Einkaufsliste"** (Web Share Target) unterstützt **iOS nicht**. Die App ist dafür trotzdem vorbereitet (`share_url`/`share_text` werden ausgelesen; funktioniert direkt auf Android).
- **Offene iOS-Alternative (noch nicht gebaut):** ein Apple **Kurzbefehl** (Shortcuts), der aus dem Teilen-Menü den Link an `…/einkaufsliste/?share_url=<URL>` weiterreicht → App startet den Import automatisch.

**Offen/To-do:**
- `supabase/stats_delete.sql` einmalig im SQL Editor ausführen (optional, siehe Abschnitt 6).
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
| Statistik | Tabelle `stats` + Funktion `bump_stat` (SQL: `supabase/stats.sql`) – „⭐ Oft gekauft"; DELETE-Policy optional per `supabase/stats_delete.sql` |
| Emojis | Katalog + Stichwortliste `EMO_WORDS` in `index.html`; `emoFor()` rät, `showEmo()` bessert alte 🛒 beim Anzeigen nach |
| Keepalive | GitHub Action `.github/workflows/supabase-keepalive.yml` – pingt täglich die DB an (Free-Tarif pausiert nach 7 Tagen Inaktivität), Bot-Commit nur ~1×/Monat |
| Mac-Start | Dock-Kachel `/Applications/Einkaufsliste.app` (Quellen: `tools/launcher.applescript`, `tools/icon.icns`) – öffnet die Live-App als eigenes Chrome-Fenster |
| GitHub | `bastianstute88/einkaufsliste` (public) |
| Live | https://bastianstute88.github.io/einkaufsliste/ |
| Cache | `localStorage`, Key `einkauf_supabase_v1` (nur Cache) |
| Backend | Supabase `ynkvoujaqqoslbzslbvb` (Postgres + Auth + Realtime + Edge Function) |
| Login | Google OAuth (Cloud-Projekt `einkaufsliste-503918`, „In Produktion") |
| Mitglieder | Bastian + Simone (Tabelle `members`, RLS) |
| Sync | Live (Supabase Realtime auf `items` + `history` + `stats`) |
| Rezept-Import | Link/Teilen → JSON-LD → Zutaten (kein Foto, keine KI) |
| Handys | beide iPhone → „Teilen an App" nur Android; iPhone nutzt Link einfügen |
