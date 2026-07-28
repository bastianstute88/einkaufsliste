# Einkaufslisten-App – Projektdokumentation

Eine eigene Einkaufslisten-App (Bring-Ersatz) für Bastian und seine Frau.
Stand: Optik-/Interaktions-Prototyp, wird für Feedback geteilt.

---

## 1. Ziel & Motivation

- **Gemeinsame Liste in Echtzeit**: Wenn einer etwas draufsetzt, sieht es der andere; wenn einer etwas runternimmt, verschwindet es beim anderen. *(Noch nicht gebaut – siehe „Nächste Schritte".)*
- **Hauptmotivation – Rezept-Scan**: Screenshot eines Rezepts (z. B. Chefkoch) hochladen → Zutaten + Mengen werden automatisch erkannt und auf die Liste gesetzt. Kein Abtippen mehr. *(Noch nicht gebaut, nur Vorschau-Button.)*
- **Muss komplett gratis laufen** (kostenlose Dienste).
- Optik/Bedienung an **Bring** angelehnt (Kachel-Raster), aber eigen.

---

## 2. Technik & Architektur

- **Eine einzige Datei**: `index.html` – komplett selbst-enthalten (HTML + CSS + JS inline, keine Abhängigkeiten, kein Build).
- **PWA-tauglich**: fürs Handy gebaut, „Zum Home-Bildschirm hinzufügen" → Vollbild-App-Gefühl.
- **Speicherung**: `localStorage` (Key `einkauf_prototyp_v2`). Läuft rein lokal im Browser – **noch kein Server, noch kein Sync**. Jedes Gerät hat aktuell seine eigene Liste.
- **Hosting**: GitHub Pages (öffentlich, weil kostenloses Pages nur bei public geht).
  - Repo: `bastianstute88/einkaufsliste`
  - Live-Link: **https://bastianstute88.github.io/einkaufsliste/**

---

## 3. Datenmodell (im JS ganz oben)

```js
state = {
  items:   [ {id, name, emo, qty, unit} ],   // was aktuell auf der Liste ist
  history: [ {name, emo, action, t} ]        // Verlauf, neuester zuerst
}
```

- `qty`: Zahl **oder `null`** (= „ohne Menge", kein Badge).
- `unit`: `null` (einfache Zahl) · `"g"|"kg"|"ml"|"l"` (echte Mengen) · `"Tiefkühl"` (❄️-Marker, Menge optional) · `"Vorrat"|"Sonstiges"|"Event"` (Bereichs-Marker, **ohne** Menge).
- Gleiches Produkt darf **mehrfach** vorkommen (Brot 1 Stück + Brot 1 kg = 2 Einträge). Deshalb `id` statt Name als Schlüssel.
- `action`: `"add"` (draufgesetzt) oder `"buy"` (abgehakt/gekauft). `t` = `Date.now()`.

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
- Zeigt, was **draufgesetzt** (➕) und was **gekauft** (🛒) wurde, mit Zeit (heute/gestern/Datum).
- Eintrag antippen → Produkt **wieder draufsetzen** (praktisch für oft Gekauftes).
- „Verlauf leeren" möglich.

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
- Lokal ansehen: `index.html` im Browser öffnen. Tab neu laden per AppleScript
  (`osascript` → Chrome-Tab mit „Einkaufslisten" reload).

---

## 7. Nächste Schritte (offen)

1. **Gemeinsame Live-Liste mit Login** – damit beide dieselbe Liste in Echtzeit sehen.
   Kostenlos machbar mit **Supabase** oder **Firebase** (Realtime + Auth, Free-Tier).
   Erst hier wird Zugriffsschutz relevant → Login, damit nur die zwei reinkommen.
2. **Echter Rezept-Scan** – Foto → Zutaten + Mengen automatisch.
   Für „gratis" voraussichtlich **Google Gemini Gratis-API** (Vision) statt Anthropic-API
   (Anthropic-API kostet extra, ~1 ct/Scan; Claude Max deckt API **nicht** ab).
3. **Icons** – ggf. hübsches Icon-Set für Standard-Produkte + Emoji-Fallback.

---

## 8. Wichtige Fakten auf einen Blick

| | |
|---|---|
| Projektordner | `/Users/basti/Desktop/Privat/Einkaufslisten App` |
| Hauptdatei | `index.html` (alles drin) |
| GitHub | `bastianstute88/einkaufsliste` (public) |
| Live | https://bastianstute88.github.io/einkaufsliste/ |
| Speicher | `localStorage`, Key `einkauf_prototyp_v2` |
| Sync/Backend | noch keins |
| Scan | noch Vorschau |
