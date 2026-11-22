# Wissenstrainer – Design-Neustart, Schritt 1: Briefing aufgeteilt

Stand: 21.11.2026 · Grundlage: Design-Briefing aus Claude Code (21.11.), ELEMENTE.md, Blick in die laufende App (Beispieldaten), AInauten-Artikel „Warum alle AI-Designs gleich aussehen“ (19.11.2026) und Web-Recherche zu „AI-Slop“-Design.

**Kernbefund:** Der bisherige Stil (Serifenschrift, cremefarbener Hintergrund, orange Akzente, farbige Balken am Kartenrand) ist fast genau der Standardstil, den Claude ohne Vorgaben wählt (so beschreibt es Anthropic-Designer Nate Parrott). Die „warme Wochenzeitung“ ist zudem die typische zweite Welle, die kommt, wenn man um „weniger KI-Look“ bittet. Deshalb wirkt die App KI-mäßig, obwohl sie sorgfältig gebaut ist.

---

## A. Bleibt – Funktion, Inhalte, Technik, gelernte Regeln

Das ist kein Geschmack, sondern gilt für jeden neuen Entwurf.

### Was die App macht
- Persönliche Lernkarten-App fürs Handy für Politik/Bildungspolitik. Tilo legt Dokumente ab, Claude macht daraus Lernkarten; Tilo sichtet (behalten/verwerfen) und lernt mit Wiederholung in Abständen.
- Karten sind nach Themen-Paketen geordnet; Pakete privat oder öffentlich, weitergebbar (Link, Lernzettel/PDF, Anki).
- Kein Nutzerkonto, kein Profil.

### Bildschirme und Bauteile (Funktion, nicht Aussehen)
- **Heute:** fällige Karten, Lernrunde starten, neue Entwürfe zum Sichten, Lernserie der Woche (wischbar für frühere Wochen), Pakete mit Fortschritt und Filter Alle/Privat/Öffentlich, Zitat des Tages, Hinweis „Beispieldaten“.
- **Hinweis:** Navigation, Bewerten (2 Wischrichtungen), Sichten (2 Gesten + Knopf Bearbeiten) sind seit 21.11. in 05 Skizzen Aufbau.html neu festgelegt – diese Datei hat Vorrang.
- **Lernen:** Paket, Zähler, Fortschritt; Karte mit Art, Fälligkeit, Frage; nach dem Aufdecken Kernfakt, Einordnung, Debatten-Tipp, „Im Original“ (Zitat), Quelle; vier Bewertungen (Nochmal, Schwer, Gut, Leicht) mit Intervall; Abschluss mit „Noch eine Runde“.
- **Sichten:** Kartenstapel wischen (rechts behalten, links verwerfen), Verwerfen/Editieren/Später/Behalten, Filter nach Paket, „Alle behalten“.
- **Bibliothek:** Pakete (Privat/Öffentlich), alle Karten mit Suche, Typ-Filter, Status.
- **Paket-Seite:** Titelfoto mit Bildnachweis und „Bild ändern“, Sichtbarkeit, Kartenzahl, Beschreibung, Fortschritt, „Jetzt lernen“, Schalter „Im täglichen Lernplan“, Weitergeben, öffentlich teilen, Dokument- und Kartenliste.
- **Mehr:** Dokument/Text hinzufügen, neue Karten abrufen, Verbindung, Einstellungen (Vorname, Karten pro Runde, neue Karten pro Tag, hell/dunkel/automatisch), Lernstand sichern.
- **Blätter von unten:** Dokument hinzufügen (Datei/Text), Karte bearbeiten, Rückfragen, Bild wählen. **Kurzmeldungen** unten („Gespeichert“, „Rückgängig“).

### Gelernt aus dem Handy-Test (22.10.) – gilt weiter
- Eine Information pro Karte. Vorderseite eine Frage, Rückseite unter ca. 20 Wörtern.
- Lernrunden à **7 Karten** (Standard, geändert 21.11.; einstellbar), danach „Noch eine Runde“.
- Wochen-Kreise wirklich rund, mit Häkchen; Woche wischbar plus Pfeile.
- Pakete haben ein Foto; Auswahl frei lizenziert (Openverse, Wikimedia Commons), selbst änderbar, Bildnachweis immer sichtbar.

### Inhalte (variieren, sind echt)
- Kartenfragen 1–2 Zeilen, Antworten kurz, Paketnamen 1–4 Wörter.
- Fotos in sehr unterschiedlicher Qualität (oft alte oder beliebige Schulfotos) – das Design muss damit umgehen können.
- Alles auf Deutsch.

### Technik
- Web-App (PWA) ohne Build-Schritt: reines HTML/CSS/JavaScript auf GitHub Pages, auf dem Handy als App zum Startbildschirm hinzugefügt. Hauptbreite ca. 390 px.
- Gestaltung als CSS-Variablen, freie Schriften (Google Fonts), freie Icons; keine kostenpflichtigen Schriften oder Bildpakete.
- Hell und dunkel müssen beide funktionieren.
- Einhandbedienung, Wischgesten (Sichten, Woche).
- Umsetzung durch Claude Code: konkrete Vorgaben (Farbwerte, Schriftgrößen, Abstände, Screens als Bild oder Stitch-Export) statt Stimmungsbeschreibungen.
- Budget: möglichst 0 €, höchstens ein kleines Probeabo.

---

## B. Verbotsliste

Alles hier darf im neuen Entwurf **nicht** wieder auftauchen. Wichtig (laut AInauten-Test): Die Liste allein reicht nicht – sie verhindert nur den alten Anstrich. Die neue Richtung muss zusätzlich aus Vorbildern und Kontext kommen (Schritte 3–5).

### B1. Unsere bisherigen Stile
- **Textmarker-Stil:** Tintenblau + Leuchtgelb, markierte Zeitungsartikel.
- **„Dialectic Editorial“:** kühles Blau/Petrol, Schwarz als Hauptfarbe, Newsreader.
- **„Warmes Editorial & Lorbeergrün“ (aktuell):** Pergament #faecd0, Elfenbein #fffaf0, vertiefte Fläche #f1dfb8, Lorbeergrün #2b5948, Cognac #c87018, Schiefer #192231, Tinte #181410; Newsreader + Hanken Grotesk.
- **Bildwelten/Metaphern:** Zeitung, Wochenzeitung, Editorial, Notizbuch, „Dossier“.

### B2. In der laufenden App gefunden (Blick am 21.11.)
- Kleine Überzeile in gesperrten Großbuchstaben über jeder Überschrift („TAGESABRUF“, „DISZIPLIN“, „KATALOG“) und rechts daneben noch ein zweites Großbuchstaben-Etikett („HEUTE FÄLLIG“, „ALLE“).
- Kursive Serifen-Unterzeile unter der Begrüßung („Bereit für die nächste Debatte?“).
- Farbiger Balken am linken Kartenrand (Paket-Karte).
- Nummerierung „01, 02 …“ in großer, dünner Ziffer.
- Strich + Etikett als Abschnittsmarke („—— ZITAT DES TAGES“), dunkle Karte mit kursivem Serifen-Zitat.
- Kästen in Kästen; jede Fläche abgerundet, mit dünnem Rand und leichtem Schatten.
- Pastell-getönte Infokästen mit Icon + Großbuchstaben-Etikett (Kernfakt, Einordnung).
- Pastellfarbene Pillen-Etiketten („Heute 8 fällig“, „3 neu“, „Öffentlich“).
- Große Zahl im Kreis; Pfeil „→“ in Knöpfen und Karten.
- Vier pastellfarbene Bewertungsknöpfe nebeneinander.
- Lernkarte klein oben, darunter viel leerer Raum.
- Gleichmäßige Abstände ohne klare Hierarchie; lange Startseite.

### B3. Bekannte KI-Standards (aus Recherche)
- Serifenschrift + Creme-Hintergrund + Orange + farbige Kartenränder (Claudes Standard laut Nate Parrott).
- Creme + Terrakotta; fast schwarz + eine Neon-Akzentfarbe (die „geschmackvolle“ zweite Welle).
- Inter, Roboto, Arial, Systemschrift für alles; Space Grotesk als „sichere“ Nicht-Entscheidung.
- Lila-blaue Verläufe, Verlaufstext in Überschriften, Glas-Effekt.
- Schreibmaschinenschrift in Großbuchstaben als Etikett; ein farbiges Wort in der Überschrift.
- Zentrierter Kopf + drei gleiche Karten; Icon im abgerundeten Quadrat; Emojis oder Funkel-Symbole als Icons.
- Zaghafte, gleichmäßig verteilte Paletten statt einer klaren Hauptfarbe mit scharfem Akzent.
- Volle Symmetrie; überall dieselbe Einblend-Animation.
- Floskeln in Texten und Knöpfen.

### B4. Was Stitch schon zweimal geliefert hat (Export auf GitHub, design/stitch)
- Beide Stitch-Runden landeten bei **Newsreader + Hanken Grotesk** und beim Bild „Zeitung/Broadsheet“ – Runde 1 beschreibt sich selbst als „Swiss-inspired editorial … broadsheet journalism“. Die Schriften haben also schon den Wechsel von Runde 1 zu 2 überlebt.
- Erfundene Pseudo-Details, die „echt“ wirken sollen: „Ausgabe · Nr. 142“, „SRS Synchronisiert“, „SRS v2.4“.
- Profil-Knopf oben rechts, Begrüßung mit erfundenem Namen („Alex“).
- Großes Leitthema-Bild mit gelbem Etikett, Paket-Karten mit farbigem Linksbalken, Kürzel-Etikett („WIRT.“, „STADT“) und Foto rechts.
- Lernkarte: drei getönte Kästen untereinander (gelb, blau, grün) mit Icon + Großbuchstaben-Titel.

### B5. Macken-Test in Stitch (21.11., Details in „02 Macken-Test.md“)
- Tailwind-Standardfarben: Dunkelblau #0F172A, Petrol #0D9488, Bernstein #F59E0B, Schiefergrau #64748B – und allgemein „Dunkelblau + Grün/Petrol + Orange/Gelb“.
- Plus Jakarta Sans + Inter.
- „Politi-“-Namen; „Guten Tag, [Name]! 👋“ mit Profilfoto; Flamme + Tage-Zähler; Häkchen-Kreise; „~12 Min.“; „5-Minuten-Express“.
- Dunkler Kasten mit großer Zahl + Unterkästen; Paket-Karten mit Dateiname, Kategorie-Pille, Fortschrittsbalken und Pfeil-/Play-Kreis; Import-Karte auf der Startseite; Profil-Reiter.

---

## C. Offen – wird im neuen Entwurf entschieden

- **Name** der App („Wissenstrainer“ ist nur eine Beschreibung) und **App-Symbol**.
- **Dunkler Modus** richtig gestalten (nicht nur abgeleitet).
- **Farbsystem:** Braucht es sechs Kartenarten-Farben plus vier Bewertungsfarben? Oder unterscheidet man anders (Form, Symbol, Schrift)?
- **Icons:** Material Symbols war Teil des alten Looks; freie Alternativen sind möglich, solange ohne Build-Schritt einbindbar.
- **Umgang mit Fotos** unterschiedlicher Qualität (z. B. einheitliche Bildbehandlung).
- **Dichte:** Startseite und Paket-Seite kürzen; was muss wirklich auf „Heute“?
- Leitthema des Tages als großes Bild auf der Startseite (Idee: Paket mit den meisten fälligen Karten).
- Kleine Feier nach einer Lernrunde; Illustrationen für Leerzustände („Alles gesichtet.“).
- Kategorien für Pakete; Lesezeichen auf der Karte; „Quelle wählen“ beim Sichten.

---

## D. Nächste Schritte

1. ✅ Briefing aufteilen (dieses Dokument).
2. ✅ Macken-Test (21.11.) → Teil B5.
3. ✅ Vorbilder (03 Vorbilder.md, Leitidee in 04). Vorbilder sammeln: Lern-Apps (Duolingo, Babbel, Busuu, Drops, Speak) **und ikonische Apps aus anderen Bereichen** – je mit einem Satz, warum.
4. ✅ Aufbau-Skizzen (05 Skizzen Aufbau.html). Aufbau ohne Farbe: Heute, Lernen, Sichten, Paket als graue Skizzen.
5. ✅ Richtungen (07): gewählt Mischung 3 Baukasten (Tag) + 4 Laternenlicht (Nacht); 5 Fotomontage als Seitenprojekt. Startprompt lag in 06. Fünf grundverschiedene Richtungen (in einem Chat), die ersten ein, zwei bewusst verwerfen.
6. Ausarbeiten: Stitch-Prompts pro Bildschirm (von Fable), Bau in Stitch, Prüfung + Vergleichsentwurf.
   - Seitenprojekt A: Zeichenserie (Figur 7 Stufen × 3 Varianten, Landkarte, Bereichs-Szenen in 3 Stufen, Zuckertüte, Bibliothek, Leerzustände) – startet, sobald in Schritt 5 der Zeichenstil feststeht.
   - ChatGPT (Bilder) zum Vergleich: (a) optional in Schritt 5 je ein Stimmungsbild pro Richtung zur Entscheidung; (b) im Seitenprojekt A als Vergleich zu SVG-Zeichnungen (Achtung: Einheitlichkeit über 21 Varianten, Hautfarbe umfärben). Nicht für Fotos – dort nur echte Fotos.
   - Seitenprojekt B: Fotosuche und Bildbehandlung (freie Quellen, Qualität, eigene Fotos, Einverständnis bei Personen) – unabhängig, jederzeit.
7. DESIGN.md + Screens als Auftrag an Claude Code.
