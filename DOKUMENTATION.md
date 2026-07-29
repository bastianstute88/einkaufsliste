# Einkaufslisten-App – Projektdokumentation

Eine eigene Einkaufslisten-App (Bring-Ersatz) für Bastian und seine Frau.

**Stand (zuletzt aktualisiert):** **Schritt 2 fertig & getestet** – Google-Login + gemeinsame Live-Liste über **Supabase** laufen. Beide (Bastian + Simone) melden sich mit Google an, sehen dieselbe Liste in Echtzeit (Draufsetzen/Abhaken/Verlauf synchronisieren live), Zugriff nur für die 2 hinterlegten Konten (RLS). localStorage bleibt als Cache. **Als Nächstes dran: echter Rezept-Scan (Schritt 3).**

---

## 1. Ziel & Motivation

- **Gemeinsame Liste in Echtzeit**: Wenn einer etwas draufsetzt, sieht es der andere; wenn einer etwas runternimmt, verschwindet es beim anderen. *(Noch nicht gebaut – siehe „Nächste Schritte".)*
- **Hauptmotivation – Rezept-Scan**: Screenshot eines Rezepts (z. B. Chefkoch) hochladen → Zutaten + Mengen werden automatisch erkannt und auf die Liste gesetzt. Kein Abtippen mehr. *(Noch nicht gebaut, nur Vorschau-Button.)*
- **Muss komplett gratis laufen** (kostenlose Dienste).
- Optik/Bedienung an **Bring** angelehnt (Kachel-Raster), aber eigen.

---

## 2. Technik & Architektur

- **Eine einzige Datei**: `index.html` – HTML + CSS + JS inline, kein Build. Einzige Abhängigkeit: `@supabase/supabase-js` wird zur Laufzeit per ESM-Import vom CDN (`esm.sh`) geladen (fürs Backend nötig).
- **PWA-tauglich**: fürs Handy gebaut, „Zum Home-Bildschirm hinzufügen" → Vollbild-App-Gefühl.
- **Backend: Supabase** (Free-Tarif) – Postgres + Auth + Realtime.
  - Projekt-Ref: `ynkvoujaqqoslbzslbvb`, URL `https://ynkvoujaqqoslbzslbvb.supabase.co`.
  - Frontend redet per Client-SDK mit Supabase; der **Publishable Key** (`sb_publishable_…`) steht im `index.html` (public-safe, durch RLS abgesichert).
  - **Login: Google OAuth** (Google-Cloud-Projekt `einkaufsliste-503918`, Freigabe-Bildschirm „In Produktion", nur Scopes email/profile → keine Warnung, kein 7-Tage-Ablauf).
  - **Zugriffsschutz (RLS)**: Nur die in Tabelle `members` hinterlegten E-Mails (Bastian + Simone) dürfen lesen/schreiben. Fremde können sich zwar mit Google anmelden, sehen aber nichts.
  - **Live-Sync** über Supabase Realtime auf `items` + `history`.
- **Cache/Offline**: `localStorage` (Key `einkauf_supabase_v1`) hält die zuletzt gesehene Liste für sofortiges Bild beim Start; echte Quelle ist Supabase.
- **Hosting**: GitHub Pages (öffentlich, weil kostenloses Pages nur bei public geht).
  - Repo: `bastianstute88/einkaufsliste`
  - Live-Link: **https://bastianstute88.github.io/einkaufsliste/**

---

## 3. Datenmodell (im JS ganz oben)

```js
state = {
  items:   [ {id, name, emo, qty, unit} ],                        // aktuell auf der Liste
  history: [ {id, name, emo, action, who, who_name, who_avatar, t} ] // Verlauf, neuester zuerst
}
```

- **`id` ist jetzt eine UUID** (`crypto.randomUUID()`) – dieselbe ID lokal wie in Supabase, damit optimistisches Einfügen und das Realtime-Echo sich decken (kein Doppel-Eintrag).
- `qty`: Zahl **oder `null`** (= „ohne Menge", kein Badge).
- `unit`: `null` (einfache Zahl) · `"g"|"kg"|"ml"|"l"` (echte Mengen) · `"Tiefkühl"` (❄️-Marker, Menge optional) · `"Vorrat"|"Sonstiges"|"Event"` (Bereichs-Marker, **ohne** Menge).
- Gleiches Produkt darf **mehrfach** vorkommen (Brot 1 Stück + Brot 1 kg = 2 Einträge). Deshalb `id` statt Name als Schlüssel.
- `action`: `"add"` (draufgesetzt) oder `"buy"` (abgehakt/gekauft). `t` = `Date.now()`.
- `who`/`who_name`/`who_avatar`: wer die Aktion gemacht hat (User-ID + Name + Google-Foto), beim Schreiben mitgespeichert.

**Supabase-Tabellen** (Schema-Datei lag im Scratchpad; hier zur Referenz):
- `members(email, display_name)` – Allowlist, **nicht** vom Client lesbar; nur im Dashboard pflegen. Enthält Bastian + Simone.
- `is_member()` – SECURITY-DEFINER-Funktion, prüft ob `auth.jwt()->>'email'` in `members` steht. Basis aller RLS-Policies.
- `profiles(user_id, email, name, avatar_url)` – für Mitglieder lesbar; jeder pflegt beim Login sein eigenes (Name+Foto, damit man den Partner sieht).
- `items(id, name, emo, qty, unit, created_at, created_by)` – die geteilte Liste. RLS: alles nur für Mitglieder.
- `history(id, name, emo, action, who, who_name, who_avatar, created_at)` – Verlauf. RLS: alles nur für Mitglieder.
- Realtime-Publication auf `items` + `history` aktiviert.

**Ein neues Mitglied hinzufügen:** im Supabase-SQL-Editor
`insert into public.members(email, display_name) values ('neue@gmail.com','Name');`

Zentrale Konstanten:
- `CATALOG` – Kategorien + Emoji + Name der Standard-Produkte.
- `UNITS = ["g","kg","ml","l"]` – echte Mengeneinheiten.
- `TAGS` – Tiefkühl/Vorrat/Sonstiges/Event mit Emoji.
- `SECTIONS = ["Vorrat","Sonstiges","Event"]` – eigene Bereiche, Menge ausgeblendet.

---

## 4. Bedienung / Interaktionen

**Draufsetzen**
- Produkt im Katalog (oder eigenes über die Suche) antippen → **Mengen-Menü** öffnet sich.
- Dort Menge/Einheit wählen ODER direkt „Übernehmen" (= ohne Menge, nur der Name).
- Menü startet auf „ohne". `+` macht 1, 2, …; `−` unter 1 = wieder „ohne".

**Abhaken (Artikel schon auf der Liste)** – Zwei-Druck-Prinzip, kein Zeitdruck:
- **1. Druck** → Artikel wird **ausgegraut** + Häkchen (= „sicher?"). **2. Druck** auf denselben → **weg**. Woanders tippen hebt die Auswahl wieder auf. (Schutz gegen Versehen; State: `armedId`.)
- **Kein Menü** beim Abhaken – Menge gibt es nur beim *Draufsetzen*. Grund: Bastian kauft einen Artikel ganz oder gar nicht (keine Teilmengen über mehrere Läden).
- **Abhaken = gekauft**: Artikel verschwindet aus der Liste und landet im **Verlauf** (dort mit 1 Tipp zurückholbar = Undo).

**Bereiche (Reihenfolge von oben)**
1. **Auf der Liste** – normale Sachen. Der Zähler enthält auch Event + Sonstiges (damit man sieht, dass noch was offen ist).
2. **🎁 Event** – Einkäufe für Weihnachten/Ostern etc.
3. **🛍️ Sonstiges** – Non-Food (Kuchenform, Batterien …).
4. **📦 Vorrat – kann, muss nicht** – optisch abgesetzt (gestrichelt). „Mitnehmen, wenn im Angebot." **Zählt NICHT** im „Auf der Liste"-Zähler.

**Verlauf (🕘 oben rechts)**
- Zeigt, **wer** was **draufgesetzt** (➕) und **gekauft** (🛒) hat, mit Personen-Kürzel (B/S) und Zeit (heute/gestern/Datum).
- Eintrag antippen → Produkt **wieder draufsetzen** (praktisch für oft Gekauftes).
- „Verlauf leeren" möglich.

**Wer bin ich (jetzt über Login, nicht mehr pro Gerät)**
- Der eingeloggte Google-Nutzer *ist* „ich" – kein Antippen mehr nötig. Oben rechts erscheinen die **Avatare** (echte Google-Profilfotos) aller, die sich schon mal angemeldet haben; der eigene hat den grünen Ring.
- Jeder Verlaufs-Eintrag wird automatisch mit der Person getaggt (Name + Foto).
- **Login-Screen**: Beim ersten Start (oder nach „Abmelden") kommt ein Vollbild-Screen „Mit Google anmelden". Wer nicht in `members` steht, sieht „kein Zugriff".
- **Sync-Punkt** (kleiner Punkt oben im Header): grün = Live-Sync verbunden.
- **Abmelden**: unten im Verlauf-Sheet.

**Rezept-Scan (📷 oben, neben 🕘)** – aktuell nur **Vorschau**. „Beispiel übernehmen" legt ein paar Zutaten an, um das Zielbild zu zeigen.

**Kachel-Text**: lange Namen werden **nicht umgebrochen**, sondern per JS (`fitText`) automatisch verkleinert – Untergrenze 9 px (bleibt lesbar).

---

## 5. Bewusste Design-Entscheidungen (Bastians Vorlieben)

- **Dunkles Theme mit true black (#000)** – OLED spart Strom. Grün als Akzent.
- **Doppel-Tipp zum Abhaken** statt Einzel-Klick (kein Versehen).
- **Keine dauerhafte „Erledigt"-Liste** (nervt bei Bring) → stattdessen Verlauf-Button oben.
- **Kein „Entfernen"-Button** im Bearbeiten-Menü.
- **Stück/Dose/Bund/Pkg entfernt** – nur echte Mengen (g/kg/ml/l) oder einfache Zahl; „Erbsen 1" reicht.
- **Icons = Emojis** (gratis, immer etwas da – wichtig, weil beim Scan beliebige Zutaten kommen). Ein paar Emojis sind Näherung (kein Emoji für Quark/Sahne o. Ä.). Echtes Icon-Set evtl. später für die „richtige" Version.
- Nur **eine** Liste → kein Dropdown-Pfeil im Titel.

---

## 6. Deployment / Änderungen pushen

```bash
cd "/Users/basti/Desktop/Privat/Einkaufslisten App"
git add -A
git -c user.name="bastianstute88" -c user.email="bastian.stute.88@gmail.com" \
    commit -m "…beschreibung…"
git push origin main
```
- Der Live-Link bleibt gleich; GitHub Pages baut nach dem Push ~1 Min neu.
- **Lokal testen** geht jetzt **nicht** mehr per Doppelklick (`file://`), weil Google-Login eine echte http-Adresse braucht. Stattdessen im Projektordner `python3 -m http.server 8000` starten und `http://localhost:8000` öffnen. `http://localhost:8000/**` ist in Supabase (Auth → URL Configuration → Redirect URLs) als erlaubte Adresse hinterlegt.
- Erlaubte Redirect-URLs in Supabase: Live-Pages-URL + `http://localhost:8000`. Neue Test-Ports müssten dort ergänzt werden.

---

## 7. Fahrplan / Nächste Schritte

Reihenfolge mit Bastian abgestimmt: von „braucht nichts" → „braucht Konto" → „braucht KI".

1. ✅ **Mehr Produkte** – erledigt (Katalog auf ~130 Produkte / 11 Kategorien erweitert).
2. ✅ **Datenbank + Login** – **erledigt & getestet** (Supabase + Google-Login).
   - Gemeinsame **Live-Liste** (Sync in Echtzeit), **Google-Login** mit echten Namen + Fotos, Zugriff nur für Bastian + Simone (RLS).
   - Getestet: Login end-to-end, Draufsetzen/Abhaken/Verlauf synchronisieren zwischen zwei Tabs live; Daten liegen wirklich in Supabase.
   - **Nächstes Mitglied hinzufügen** geht per einer SQL-Zeile (siehe Abschnitt 3).
3. ⏭️ **Echter Rezept-Scan** (NÄCHSTER SCHRITT) – Foto → Zutaten + Mengen automatisch.
   Für „gratis" voraussichtlich **Google Gemini Gratis-API** (Vision) statt Anthropic-API
   (Anthropic-API kostet extra, ~1 ct/Scan; Claude Max deckt API **nicht** ab).
4. 🎨 **Icons** (später) – ggf. hübsches Icon-Set für Standard-Produkte + Emoji-Fallback für alles andere (v. a. beliebige Scan-Zutaten).

---

## 8. Wichtige Fakten auf einen Blick

| | |
|---|---|
| Projektordner | `/Users/basti/Desktop/Privat/Einkaufslisten App` |
| Hauptdatei | `index.html` (alles drin) |
| GitHub | `bastianstute88/einkaufsliste` (public) |
| Live | https://bastianstute88.github.io/einkaufsliste/ |
| Cache | `localStorage`, Key `einkauf_supabase_v1` (nur Cache) |
| Backend | Supabase `ynkvoujaqqoslbzslbvb` (Postgres + Auth + Realtime) |
| Login | Google OAuth (Cloud-Projekt `einkaufsliste-503918`, „In Produktion") |
| Mitglieder | Bastian + Simone (Tabelle `members`, RLS) |
| Sync | Live (Supabase Realtime auf `items` + `history`) |
| Scan | noch Vorschau |
