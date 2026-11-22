# DESIGN.md – Wissenstrainer

Stand: 21.11.2026, abends · Auftrag an Claude Code: die bestehende App auf diesen Stil umbauen.
Der Stil heißt **„Baukasten bei Tag, Laternenlicht bei Nacht“**.

**Geändert gegenüber der ersten Fassung:** Figur, Gebäude, Laternen und Regal sind keine SVG-Zeichnungen mehr, sondern **Bilddateien** im Stil „plastisches Holzspielzeug“ (Abschnitt 9). Die Bedienoberfläche bleibt flach wie bisher. Der Konsistenz-Test der Bilder ist bestanden und von Tilo freigegeben; die Bilder selbst entstehen noch. Bis sie da sind, baut Claude Code alles mit Platzhaltern.

## 0. Geltung

- Diese Datei ist verbindlich. Bei Widersprüchen gilt: DESIGN.md vor 08 Stil-Vorgabe vor 05 Skizzen Aufbau.
- Funktion, Daten und Technik der App bleiben, wie sie sind (01, Teil A). Geändert werden Aussehen und Aufbau der Bildschirme.
- **Die ganze Verbotsliste aus 01, Teil B gilt weiter.** Die wichtigsten Punkte stehen in Abschnitt 12.
- Herkunft der Maße: Bereich, Runde geschafft und Mein Fortschritt aus dem Stitch-Export (Tag-Fassung); Welt und Lernen aus dem Claude-Design-Entwurf „Welt und Lernen, Tag und Nacht“; alle Nacht-Fassungen nach 08.
- **Die Bilder selbst sind nicht Teil dieses Auftrags.** Hier steht nur, wo sie sitzen, wie groß sie sind, wie sie heißen und wie sie getauscht werden (Abschnitt 9). Welche Bilder es gibt, steht in „13 Bildliste.md“. Solange Bilder fehlen, stehen Platzhalter.

## 1. Grundsätze

- Leitsatz: **nicht gelernt = rohes Holz und dunkel, gelernt = Lackfarbe und Licht.**
- **Zwei Ebenen:** Die Bedienoberfläche (Knöpfe, Karten, Schrift, Navigation, Fähnchen, Fortschritts-Klötze) ist flach. Figur, Gebäude, Laternen und Regal sind plastische Bilder, die auf dieser flachen Oberfläche stehen.
- Aufbau, Formen, Größen und Schrift sind bei Tag und Nacht gleich. Es wechseln nur Farben, Licht und Bilder.
- Web-App ohne Build-Schritt: reines HTML, CSS, JavaScript. Hauptbreite 390 px, Bedienung mit einer Hand.
- Alle Farben und Maße als CSS-Variablen (Abschnitt 2). Keine festen Farbwerte in den Bausteinen.
- Schrift Jost (freie Lizenz). Die Schriftdateien in die App legen, damit sie ohne Netz funktioniert.

## 2. Farben und Maße als CSS-Variablen

Die Palette ist entschieden: „Erzgebirge“ (Enzianblau, Krapprot, Senfgelb, Moosgrün, dazu Holz). Überall nur die Variablen verwenden.

```css
:root {
  /* Bedienung – Tag */
  --grund: #F4F5F2;
  --flaeche: #FFFFFF;
  --vertieft: #E6E9E3;
  --text: #1A1C22;
  --text-neben: #3A3E48;
  --haupt: #2F3F9E;          /* Enzianblau */
  --auf-haupt: #FFFFFF;
  --akzent: #B8232F;         /* Krapprot, sparsam */
  --link: #2F3F9E;
  --grund-lernen: #F4F5F2;
  --nav: #F4F5F2;
  --trenner: #E6E9E3;

  /* Welt – flache Teile der Landkarte und Platzhalter */
  --welt-grund: #E6E9E3;
  --weg: #D3D8CF;
  --holz: #D6B58A;
  --holz-dunkel: #C29F71;
  --lack-gelb: #D4AC2B;        /* Senfgelb */
  --licht: #FFC533;

  /* Licht und Nacht-Behandlung – bei Tag aus */
  --schein-knopf: none;
  --schein-karte: none;
  --schein-klotz: none;
  --schein-text: none;
  --schein-bild: none;
  --nacht-filter: none;

  /* Maße */
  --ecke: 10px;
  --ecke-karte: 14px;
  --rand: 20px;
  --knopf-hoehe: 56px;
  --tipp-min: 48px;
  --nav-hoehe: 72px;
}

[data-theme="nacht"] {
  --grund: #261830;          /* Aubergine, kein Dunkelblau */
  --flaeche: #35223F;
  --vertieft: #3B284D;
  --text: #F7F3EE;
  --text-neben: #E3D9EA;
  --haupt: #FFC533;          /* Laternengelb */
  --auf-haupt: #261830;
  --akzent: #DE4A56;         /* helles Krapprot */
  --link: #FFC533;
  --grund-lernen: #1C1124;
  --nav: #1C1124;
  --trenner: #57445E;

  --welt-grund: #3B284D;
  --weg: #4D3862;
  --holz: #6A5570;
  --holz-dunkel: #57445E;
  --lack-gelb: #AD8E2C;        /* absichtlich stumpf, damit Licht heraussticht */
  --licht: #FFC533;

  --schein-knopf: 0 0 0 5px rgba(255, 197, 51, 0.16), 0 0 26px rgba(255, 197, 51, 0.45);
  --schein-karte: 0 0 44px rgba(255, 197, 51, 0.22);
  --schein-klotz: 0 0 10px rgba(255, 197, 51, 0.6);
  --schein-text: 0 0 18px rgba(255, 197, 51, 0.45);
  --schein-bild: drop-shadow(0 0 8px rgba(255, 197, 51, 0.5));
  --nacht-filter: brightness(0.62) saturate(0.85);
}
```

Regeln:
- Eine Hauptfarbe je Modus. Gelb und Holz gehören der Welt, nicht den Knöpfen (Ausnahme: Gelb ist bei Nacht die Hauptfarbe, weil es das Licht ist).
- Die Akzentfarbe bleibt sparsam: nur für „nochmal“, „verwerfen“ und Warnungen, nie als große Fläche.
- Lichtschein (`box-shadow`, `text-shadow`, `drop-shadow`) ist der einzige erlaubte Schatten und nur über die `--schein-`Variablen.

### Umschalten

- `data-theme` am `<html>`-Element: `tag` oder `nacht`.
- Die vorhandene Einstellung hell / dunkel / automatisch bleibt. „Automatisch“ folgt vorerst dem Gerät (`prefers-color-scheme`).

## 3. Schrift

Nur Jost, Schnitte 500, 600, 700. Keine zweite Schrift.

| Verwendung | Größe / Schnitt | Zeilenabstand |
|---|---|---|
| Feier-Überschrift („Geschafft.“) | 32 px / 700 | 1,2 |
| Überschrift („Heute: 12 Karten“, Bereichsname, „Stufe 2 von 7“) | 26 px / 700 | 1,15 |
| Kartenfrage | 26 px / 600 | 1,25 |
| Antwort | 22 px / 700 | 1,25 |
| Knopf | 21 px / 700 | 1 |
| Text, Paketname, Zeilenname | 17 px / 500 (Paketname 600) | 1,4 |
| Zwischenüberschrift („Fast fertig“) | 17 px / 700 | 1,2 |
| Nebentext, Quelle, Hinweise | 15–16 px / 500 | 1,3 |
| Beschriftung (Bereichsname auf der Karte, Reiter, Bildnachweis, Fähnchen-Zahl) | 13 px / 600 | 1,15 |

Nichts kleiner als 13 px. Keine Großbuchstaben-Etiketten, keine Sperrung, keine Kursive.

## 4. Formen und Abstände

- Ecken 10 px (Knöpfe, Fotos, Reiter, Zeilen), 14 px (Lernkarte, Blatt von unten, große Bildflächen).
- Keine Rahmen, keine Trennlinien zwischen Bereichen, keine Verläufe. Flächen stehen direkt auf dem Grund, nie Kasten im Kasten.
- Abstände in 4er-Schritten: 4, 8, 12, 16, 20, 24, 32, 40, 48. Seitenrand 20 px.
- Alles Antippbare mindestens 48 × 48 px.
- Unten `env(safe-area-inset-bottom)` zur Navigationsleiste addieren.

## 5. Icons

- Phosphor Icons, Stärke „Fill“, als Inline-SVG mit `fill="currentColor"`. Material Symbols entfernen.
- Regel-Größe 24 px in einer Tippfläche von 48 px.
- Die vier Reiter haben eigene, flache Klotz-Zeichen (22 px): Welt = Kreis, Bereiche = vier Quadrate, Üben = Dreieck, Mehr = Bogen.
- Icons sind immer flach – nie plastisch, nie als Bilddatei. Keine Emojis.

## 6. Bausteine

**Hauptknopf** – volle Breite, Höhe 56 px, Ecke 10 px, Fläche `--haupt`, Schrift `--auf-haupt` 21 px / 700, `box-shadow: var(--schein-knopf)`. Kein Pfeil, kein Icon. Höchstens einer je Bildschirm.

**Zweitknopf** – wie Hauptknopf, aber Fläche `--vertieft`, Schrift `--text`, kein Schein.

**Textlink** – zentriert, 16 px / 500, Farbe `--link`, unterstrichen.

**Navigation unten** – Höhe 72 px, Fläche `--nav`, Innenabstand 8 px 12 px, vier gleich breite Reiter mit 6 px Abstand: Welt · Bereiche · Üben · Mehr. Jeder Reiter 56 px hoch, Ecke 10 px, Zeichen 22 px über Wort 13 px / 600, Abstand 4 px. Aktiv: Fläche `--haupt`, Inhalt `--auf-haupt`. Inaktiv: kein Hintergrund, Inhalt `--text-neben`. Keine Linie über der Leiste.
Die Leiste fehlt in „Lernen“ und „Runde geschafft“.

**Kopfzeile mit Zurück** – Höhe 56 px, Innenabstand 0 16 px. Links Zurück-Zeichen (Phosphor CaretLeft, 24 px, Tippfläche 48 px, ohne Hintergrund), Überschrift 26 px / 700 mittig über die ganze Breite.

**Zeile** – Höhe 56 px, Fläche `--flaeche`, Ecke 10 px, Innenabstand 0 16 px, links Name 17 px / 500, rechts Nebentext 15 px / 500 in `--text-neben`. Abstand zwischen Zeilen 8 px. Ganze Zeile antippbar, kein Pfeil.

**Foto mit Titelklotz** – siehe Abschnitt 10.

**Fähnchen „heute fällig“** – flach, liegt über dem Bereichs-Bild, immer an derselben Stelle (Maße bezogen auf die Bildfläche 110 × 110 px): Mast 2 px breit von x 85, y 3 bis y 44 in `--text`; Fahne 21 × 16 px bei x 86, y 3, Ecke 2 px, Fläche `--haupt`; Zahl mittig 13 px / 700 in `--auf-haupt`. Bei Nacht zusätzlich `box-shadow: var(--schein-klotz)`. Nie eine Zahl im Kreis.

**Fortschritts-Klötze** (nur im Lernen) – flach. 7 gleich breite Klötze in einer Reihe, 14 px hoch, Ecke 4 px, Abstand 6 px. Erledigt = `--haupt` (bei Nacht mit `--schein-klotz`), aktuelle Karte = `--lack-gelb` bei Tag und `--text` bei Nacht, offen = `--holz` bei Tag und `--holz-dunkel` bei Nacht. Die Zahl der Klötze folgt der Einstellung „Karten pro Runde“.

**Blatt von unten** und **Kurzmeldung** – Fläche `--flaeche`, Ecke 14 px oben (Blatt) bzw. 10 px (Meldung), Schrift wie Text. Hinter dem Blatt eine dunkle Abdeckung (`rgba(26, 28, 34, 0.4)`, bei Nacht `rgba(0, 0, 0, 0.5)`).

## 7. Die fünf ausgearbeiteten Bildschirme

Alle Maße für 390 × 844 px. Reihenfolge jeweils von oben nach unten. „Bild-Platz“ verweist auf Abschnitt 9.

### 7.1 Welt (Startseite)

1. **Kopf** – Innenabstand 24 px 20 px 0. Links Bild-Platz „Figur klein“ (Kreis 60 × 60 px, Fläche `--vertieft`), antippbar, öffnet „Mein Fortschritt“. 14 px daneben: „Heute: 12 Karten“ (26 / 700), darunter „2 Runden à 7“ (16 / 500, `--text-neben`).
2. **Hauptknopf „Lernen“** – Abstand oben 16 px, Seitenrand 20 px. Startet die Lernrunde.
3. **Textlink „14 neue Karten zum Sichten“** – Abstand oben 16 px, unten 8 px. Nur zeigen, wenn es Karten zum Sichten gibt.
4. **Landkarte** – volle Breite, randlos, füllt den Rest bis zur Navigation (bei 844 px Höhe: 568 px). Fläche `--welt-grund`, flach. Wenn die Bereiche nicht passen, rollt nur die Landkarte.
   - Der Weg ist flach: ein 12 px breiter Strich in `--weg` mit runden Enden, als Inline-SVG über die ganze Landkarte (viewBox 0 0 390 568, Pfad `M0 80H390M70 80C70 170 200 190 195 290S110 400 115 480`). Er liegt zuunterst.
   - Bild-Platz „Laterne“: Reihe aus 7 Laternen (je 30 × 58 px, Abstand 19 px), links 33 px, oben 22 px. Eine je Wochentag, an = an diesem Tag gelernt.
   - Je Bereich ein antippbares Feld, 110 px breit: Bild-Platz „Bereich“ (110 × 110 px), 3 px darunter der Name (13 / 600, mittig, höchstens 2 Zeilen). Darüber bei Bedarf das Fähnchen.
   - Plätze in drei Spalten, leicht versetzt. Position (links / oben) in der Landkarte: 14 / 96 · 140 / 110 · 266 / 92 · 14 / 248 · 140 / 266 · 266 / 250 · 60 / 408. Weitere Bereiche setzen das Muster fort (Spalten bei 14, 140, 266; Zeilenabstand etwa 156 px).
   - Tipp auf einen Bereich öffnet den Bildschirm „Bereich“.
5. **Navigation**, „Welt“ aktiv.

Nacht: Farben und Bilder nach Abschnitt 9; Hauptknopf mit Lichtschein.

### 7.2 Bereich (Beispiel Schule)

1. **Foto** – volle Breite, randlos, 234 px hoch (Zuschnitt 5:3). Oben links (16 px / 16 px) Zurück-Knopf: 48 × 48 px, Ecke 10 px, Fläche `--flaeche`, Zeichen `--text`. Kein Text auf dem Foto.
2. **Titelklotz** – direkt darunter, ohne Abstand, volle Breite, Innenabstand 20 px. „Schule“ (26 / 700), 4 px darunter „5 Pakete · 9 fällig“ (17 / 500), 8 px darunter der Bildnachweis „Foto: Name, CC BY“ (13 / 600).
   Tag: Fläche `--haupt`, Schrift `--auf-haupt`. **Nacht: Fläche `--flaeche`, Schrift `--text`, Bildnachweis `--text-neben`** – nicht gelb.
3. **Hauptknopf „Bereich lernen (9)“** – Abstand oben 20 px, Seitenrand 20 px. Ohne fällige Karten: Zweitknopf „Bereich üben“.
4. **Paket-Raster** – Abstand oben 20 px, Seitenrand 20 px, 2 Spalten, Abstand 12 px. Je Kachel: quadratisches Foto (Ecke 10 px), 8 px darunter Paketname (17 / 600), 2 px darunter Nebentext (15 / 500, `--text-neben`): „3 fällig“, „alles gelernt“ oder „neu“. Keine Etiketten, keine Balken. Tipp öffnet die Paket-Seite.
5. 24 px Luft, dann **Navigation**, „Welt“ aktiv.

Ohne Foto: statt des Fotos Fläche `--vertieft` mit dem Bild-Platz „Bereich groß“ (220 × 220 px), mittig.

### 7.3 Lernen (Konzentrations-Modus)

Grund `--grund-lernen`. Keine Navigation. **Keine Bilder** – dieser Bildschirm ist ganz flach.

1. **Kopf** – Innenabstand 16 px 20 px 0 8 px, Abstand zwischen den Teilen 12 px. Links Schließen-Kreuz (24 px, Tippfläche 48 px), Mitte die Fortschritts-Klötze über die ganze freie Breite, rechts „3/7“ (15 / 600).
2. **Lernkarte** – Abstand oben 16 px, Seitenrand 20 px, füllt die ganze freie Höhe. Fläche `--flaeche`, Ecke 14 px, Innenabstand 28 px 24 px, `box-shadow: var(--schein-karte)`. Inhalt linksbündig und senkrecht mittig:
   - „Schule · Schulgesetz“ (15 / 500, `--text-neben`)
   - 12 px darunter die Frage (26 / 600, Zeilenabstand 1,25)
   - nach dem Aufdecken: Trennstrich (4 px hoch, Ecke 2 px, `--trenner`, Abstand 28 px oben und 24 px unten), Antwort (22 / 700; **bei Nacht in `--licht` mit `text-shadow: var(--schein-text)`**), 8 px darunter die Quelle (15 / 500, `--text-neben`)
3. **Bewerten** – Abstand oben 16 px, eine Zeile über die volle Breite ohne Seitenrand. Ganz links ein Klotz 12 × 56 px in `--akzent` (Ecken nur rechts 6 px), 12 px daneben „nochmal“ (17 / 600). Ganz rechts ein Klotz 12 × 56 px in `--haupt` (Ecken nur links 6 px, bei Nacht mit Schein), links daneben „gewusst“. Beide Seiten sind auch antippbar. Keine Pfeile, keine vier Knöpfe.
4. **Hinweis** – mittig, 15 / 500, `--text-neben`, Abstand 8 px oben, 24 px unten. Verdeckt: „Tippen zeigt die Antwort“. Aufgedeckt: „Wischen oder tippen zum Bewerten“.

Verhalten:
- Tipp auf die Karte deckt die Antwort auf.
- Bewerten erst nach dem Aufdecken: Wisch nach links = nochmal, nach rechts = gewusst. Davor sind die beiden Seiten auf 40 % Deckkraft gestellt und nicht antippbar.
- Beim Wischen folgt die Karte dem Finger und kippt leicht (höchstens 6°).
- Nach der letzten Karte folgt „Runde geschafft“.

### 7.4 Runde geschafft

Grund `--grund`. Keine Navigation. Alles mittig, Innenabstand 64 px 20 px 48 px, Inhalt als Block senkrecht mittig.

1. Bild-Platz „Feier“ – 220 × 220 px: die jubelnde Figur füllt den Platz, darüber fällt einmal eine Gabe in die Zuckertüte (Abschnitt 11).
2. 40 px darunter „Geschafft.“ (32 / 700).
3. 12 px darunter ein Satz (17 / 500, `--text-neben`, höchstens 300 px breit), Muster: „7 Karten · in der Schule freut sich jetzt die halbe Klasse“.
4. 48 px darunter Hauptknopf „Noch eine Runde“, 12 px darunter Zweitknopf „Zur Welt“.

Keine Statistik, keine Prozentzahlen, keine Sterne, kein Konfetti.

### 7.5 Mein Fortschritt

1. **Kopfzeile mit Zurück**, Überschrift „Stufe 2 von 7“.
2. Bild-Platz „Bibliothek“ – Abstand oben 16 px, Seitenrand 20 px, 350 × 300 px, Ecke 14 px, Fläche `--vertieft`. Darin, von hinten nach vorn:
   - das Regal-Bild über die ganze Fläche;
   - je fertigem Paket ein Buch-Bild (18 × 48 px) auf den Regalböden, von links nach rechts gefüllt;
   - die Figur (170 × 170 px), unten mittig;
   - links unten bis zu 3 offene Bücher (44 × 32 px) für fast fertige Pakete, antippbar über eine Tippfläche von 48 px.
   Die genauen Stellflächen im Regal werden festgelegt, sobald das Regal-Bild vorliegt; bis dahin zwei Reihen mit Unterkante bei y 96 und y 156, von x 24 bis x 326.
3. 16 px darunter mittig „Noch 1 Bereich ganz lernen bis Stufe 3“ (15 / 500, `--text-neben`).
4. 24 px darunter Zwischenüberschrift „Fast fertig“ (17 / 700), 12 px darunter die Zeilen: „Ganztag – noch 4 Karten“, „Inklusion – noch 9 Karten“. Tipp auf eine Zeile startet das Lernen dieses Pakets.
5. **Navigation**, „Üben“ aktiv.

Keine Diagramme, keine Ringe, keine Abzeichen-Sammlung.

## 8. Die übrigen Bildschirme

Sichten, Hinzufügen (Blatt von unten), Paket-Seite, Üben und Mehr folgen im Aufbau den Skizzen 5 bis 9 in „05 Skizzen Aufbau.html“ und im Aussehen den Abschnitten 2 bis 6:

- **Sichten:** Kartenstapel wie die Lernkarte (ohne Schein), darunter die zwei Seiten „verwerfen“ (`--akzent`) und „behalten“ (`--haupt`) wie beim Bewerten, darunter zwei Zweitknöpfe „Bearbeiten“ und „Alle behalten“.
- **Paket-Seite:** Foto mit Titelklotz wie beim Bereich (Zuschnitt 2:1, 195 px hoch, mit „Bild ändern“ neben dem Bildnachweis), Hauptknopf „Jetzt lernen (3)“, Schalter „Im täglichen Lernplan“, drei Zweitknöpfe in einer Reihe statt Pillen (Weitergeben, Öffentlich teilen, Lernzettel), dann Dokumente und Karten als Zeilen.
- **Üben:** oben ein Band in `--vertieft` (volle Breite, 120 px hoch) mit der Figur (110 × 110 px, links 20 px, unten bündig), darunter Zeilen in 64 px Höhe mit zweizeiligem Text; „Mein Fortschritt“ zuoberst.
- **Mehr:** Überschrift und Zeilen.
- **Hinzufügen:** Blatt von unten; Eingabefelder als Fläche `--vertieft`, Ecke 10 px, ohne Rand; Hauptknopf „Karten erzeugen“.

## 9. Bilder: Plätze, Dateien, Tausch

Figur, Gebäude, Laternen, Regal, Bücher und Gaben sind Bilddateien im Stil „plastisches Holzspielzeug“ (08, Abschnitt 10). Sie entstehen in einem eigenen Arbeitsgang (ChatGPT, siehe „13 Bildliste.md“) und werden fertig zugeschnitten geliefert. Jede Stufe und jede Tag- oder Nacht-Fassung ist ein Einzelbild in festem Format und Ausschnitt.

### Format

- **WebP mit durchsichtigem Hintergrund**, sRGB, ohne Metadaten. Kein Boden, kein Schlagschatten, kein Lichtschein im Bild.
- Jede Datei ist dreimal so groß wie ihre größte Anzeige (für scharfe Darstellung auf dem Handy).
- Ordner in der App: `bilder/`. Dateinamen klein, ohne Umlaute, mit Bindestrichen – genau wie in der Bildliste.
- Innerhalb einer Art haben alle Bilder dieselbe Bildfläche, denselben Maßstab und dieselbe Standlinie. Dadurch springt beim Tausch nichts.
- Richtwert Dateigröße: Bereich und Figur je unter 80 KB, kleine Bilder unter 20 KB.

### Plätze und Größen

| Bild-Art | Anzeige (px) | Datei (px) | Standlinie in der Datei |
|---|---|---|---|
| Bereich | 110 × 110 auf der Landkarte; 220 × 220 im Bereich ohne Foto | 660 × 660 | Unterkante der Sockelplatte bei y 594, waagerecht mittig |
| Figur | Kreis 60 × 60 (Welt) · 110 × 110 (Üben) · 170 × 170 (Mein Fortschritt) · 220 × 220 (Runde geschafft) | 660 × 660 | Standfläche bei y 594, Mittelachse bei x 330 |
| Laterne | 30 × 58 | 90 × 174 | Fuß bei y 171 |
| Regal | 350 × 300 | 1050 × 900 | füllt die Fläche |
| Buch | 18 × 48 | 54 × 144 | Unterkante = Bildkante |
| Offenes Buch | 44 × 32 | 132 × 96 | Unterkante = Bildkante |
| Gabe | 32 × 32 | 96 × 96 | mittig |

- Einbindung als `<img>` mit festen `width`- und `height`-Angaben, `object-fit: contain`, `decoding="async"`. Bilder in antippbaren Feldern bekommen `alt=""`, weil das Feld selbst beschriftet ist.
- „Figur klein“ (Welt): das Figur-Bild im Kreis, 4 px Innenabstand, unten bündig.
- Die Körperfarbe der Figur wechselt mit jeder Stufe (1 Moosgrün · 2 Enzianblau · 3 Krapprot · 4 Moosgrün · 5 Enzianblau · 6 Krapprot · 7 Senfgelb). Das steckt in den Bildern selbst; die App muss dafür nichts tun.
- **Die Figur wächst über die Darstellung, nicht über die Datei:** Alle 7 Stufen sind in der Datei gleich groß. Die App zeigt sie mit `transform: scale()` und `transform-origin: bottom center` in den Größen 0,70 · 0,75 · 0,80 · 0,85 · 0,90 · 0,95 · 1,00 für Stufe 1 bis 7.

### Welche Datei wann (Tausch)

Der Dateiname wird aus dem Zustand gebildet. Ein eigenes Nacht-Bild gibt es nur dort, wo nachts Licht zu sehen ist; sonst nimmt die App das Tag-Bild und legt `filter: var(--nacht-filter)` darauf.

**Bereich** – Kennungen: `schule`, `lehrkraefte`, `universitaeten`, `senatsverwaltung`, `recht`, `schueler`, `lebenslang`, `allgemein`.

| Stufe | Tag | Nacht |
|---|---|---|
| 1 nichts gelernt | `bereich-{kennung}-s1-tag.webp` | dieselbe Datei mit Nacht-Filter |
| 2 teils gelernt | `bereich-{kennung}-s2-tag.webp` | `bereich-{kennung}-s2-nacht.webp` |
| 3 alles gelernt | `bereich-{kennung}-s3-tag.webp` | `bereich-{kennung}-s3-nacht.webp` mit `filter: var(--schein-bild)` |

**Figur** – `{n}` = Stufe 1 bis 7.

| Zustand | Tag | Nacht |
|---|---|---|
| ruhig | `figur-s{n}-tag.webp` | `figur-s{n}-nacht.webp` (mit Laterne) |
| jubelnd (Runde geschafft) | `figur-s{n}-jubel.webp` | dieselbe Datei mit Nacht-Filter |

**Laterne**

| Zustand | Tag | Nacht |
|---|---|---|
| an | `laterne-an-tag.webp` | `laterne-an-nacht.webp` mit `filter: var(--schein-bild)` |
| aus | `laterne-aus-tag.webp` | dieselbe Datei mit Nacht-Filter |

**Regal, Bücher, Gaben** – je eine Datei (`regal.webp`, `buch-1.webp` bis `buch-4.webp`, `buch-offen.webp`, `gabe-1.webp` bis `gabe-4.webp`); nachts mit Nacht-Filter. Die Buchfarbe wechselt reihum.

Umsetzung:
- Eine Funktion `bildpfad(art, kennung, stufe, zustand, modus)` liefert Dateiname und Filter. Nur sie kennt die Regeln oben.
- Beim Wechsel von Tag/Nacht oder Stufe tauscht die App `src` und Filter. Die Bilder des anderen Modus vorab laden, damit der Wechsel nicht flackert.
- Alle Dateien in `bilder/` für die Nutzung ohne Netz zwischenspeichern.

### Wenn ein Bild fehlt

Der Reihe nach:
1. Fehlt das Nacht-Bild: Tag-Bild mit Nacht-Filter.
2. Hat ein Bereich keine eigenen Bilder (z. B. ein neu angelegter): die Bilder der Kennung `allgemein`.
3. Fehlt auch das: **Platzhalter** – Fläche `--vertieft` in der Größe des Platzes, Ecke 10 px (Figur klein: Kreis), mittig der Name des Platzes in 13 px / 600, `--text-neben`. Kein gestrichelter Rahmen. Beim Bereich zeigt der Platzhalter zusätzlich die Stufe als Wort („teils gelernt“), damit die Logik prüfbar ist. Laterne: Kreis 20 px auf einem 4 px breiten Stab; an = `--lack-gelb` (Nacht: `--licht` mit `--schein-klotz`), aus = `--holz`.

Fehlende Dateien erkennt die App über `onerror` am Bild. **Zum Start gibt es noch kein einziges Bild: Die App muss vollständig mit Platzhaltern funktionieren.**

## 10. Fotos

- Fotos bleiben groß und in voller Farbe. Zuschnitte: Bereichs-Kopf 5:3, Paket-Kopf 2:1, Paket-Kachel 1:1, immer `object-fit: cover`.
- **Kein Text auf dem Foto.** Titel und Bildnachweis stehen im Titelklotz darunter; der Bildnachweis ist immer sichtbar.
- Angleichung für jedes Foto: `filter: contrast(1.05) saturate(0.92)`; bei Nacht `filter: contrast(1.05) saturate(0.92) brightness(0.82)`.
- Fotos mit der Kennzeichnung „schwach“: zusätzlich `grayscale(1)`, und im Bereichs-Kopf nur halb so breit, mittig auf Fläche `--vertieft`.
- Fotos und Holzspielzeug-Bilder stehen nie im selben Rahmen: Fotos zeigen den Inhalt, die Bilder zeigen Welt und Figur.

## 11. Bewegung

- Sparsam und je Stelle eigen – nicht überall dieselbe Einblendung.
- Antwort aufdecken: Trennstrich und Antwort blenden in 150 ms ein.
- Karte wischen: folgt dem Finger, fliegt beim Loslassen in 200 ms hinaus; die nächste Karte steht schon da.
- Wechsel Tag/Nacht: Farben in 200 ms; Bilder blenden in 200 ms über.
- Runde geschafft: eine einzige kurze Bewegung – ein Gabe-Bild fällt in 400 ms von oben 70 px in die Zuckertüte (im Bild links an der Figur) und verschwindet dort. Danach steht alles still.
- `prefers-reduced-motion` beachten: dann ohne Bewegung.

## 12. Verbote (Auszug – vollständig in 01, Teil B)

- Keine anderen Schriften als Jost. Keine anderen Farben als in Abschnitt 2.
- Kein Dunkelblau als Nachtgrund, keine Tailwind-Standardfarben, kein Creme oder Pergament, kein Orange.
- Keine Schatten, Rahmen, Trennlinien, Verläufe, Glas-Effekte. Einzige Ausnahme: Lichtschein bei Nacht.
- Keine Pillen-Etiketten, keine Großbuchstaben-Überzeilen, keine Zahl im Kreis, keine Pfeile in Knöpfen, Zeilen oder Karten, keine farbigen Balken am Kartenrand, kein Kasten im Kasten.
- Keine Häkchen-Kreise, keine Flamme mit Tage-Zähler, keine Fortschrittsringe, keine Prozent-Balken, keine Zeitangaben wie „~12 Min.“.
- Kein Profil, kein Nutzerkonto, keine Begrüßung mit Namen, keine Emojis, keine erfundenen Zusatzangaben.
- Kein Text auf Fotos.
- **Keine anderen Bilder als die aus der Bildliste.** Keine selbst erzeugten oder aus dem Netz geholten Illustrationen, keine plastischen Knöpfe oder Icons, keine Bilder als Hintergrund der Bedienoberfläche.
- Nichts hinzufügen, was hier oder in 05 nicht steht.

## 13. Abnahme

- [ ] Alle fünf Bildschirme aus Abschnitt 7 bei 390 × 844 px, je Tag und Nacht, als Bildschirmfoto – einmal nur mit Platzhaltern, einmal mit den Testbildern, sobald sie da sind.
- [ ] Im Code kommen Farbwerte nur im Variablen-Block vor.
- [ ] Suche im Code findet keine andere Schrift als Jost und kein Material Symbols.
- [ ] `box-shadow`, `text-shadow` und `drop-shadow` kommen nur mit `--schein-`Variablen vor; `border` nur als `border-radius`.
- [ ] Jeder Text mindestens 13 px; Text auf Grund mindestens 4,5:1.
- [ ] Alles Antippbare mindestens 48 × 48 px.
- [ ] Bild-Plätze haben die Größen aus Abschnitt 9; die Regeln für den Tausch stecken in genau einer Funktion.
- [ ] Jede Stufe und jeder Modus lässt sich mit fehlenden Bildern durchspielen (Platzhalter erscheinen, nichts bricht).
- [ ] Beim Tausch von Stufe oder Tag/Nacht springt kein Bild.
- [ ] Punkt für Punkt gegen die Verbotsliste in 01, Teil B geprüft.

## 14. Offen (nicht selbst entscheiden, nachfragen)

- Name der App und App-Symbol.
- Wohin Einordnung, Debatten-Tipp und „Im Original“ wandern, die die alte Rückseite gezeigt hat. Die neue Karte zeigt nur Antwort und Quelle.
- Ob „Automatisch“ dem Gerät folgt oder der Uhrzeit.
- Die Sätze auf „Runde geschafft“ je Bereich und Stufe.
- Wie „aktuell wieder alles gewusst“ markiert wird.
- Auswahl von Geschlecht und Hautfarbe der Figur: vorerst gestrichen (eine Figur, Holzkopf), kann später kommen.
