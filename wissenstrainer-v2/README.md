# Wissenstrainer – zweite Version

Neu aufgebaute Fassung der Lernkarten-App im Stil „Baukasten bei Tag, Laternenlicht bei Nacht“.
Die erste Version in `wissenstrainer/` bleibt unverändert und nutzbar.

- **Adresse:** <https://tilopatzolt.github.io/lehrreich/v2/> (die erste Version bleibt unter
  <https://tilopatzolt.github.io/lehrreich/>)
- **Getrennt von der ersten Version:** eigener Lernstand (Speicherschlüssel `wt2.…`) und eigene
  Offline-Ablage. Was du in der einen Version lernst, sieht die andere nicht.

## Mit deinen echten Daten verbinden

**Mehr → Verbindung**: Auf einem Gerät, auf dem die erste Version schon verbunden ist, reicht
„Verbindung aus der ersten Version übernehmen“. Sonst den GitHub-Schlüssel (`github_pat_…`)
einfügen. Danach fragt die App, ob sie deinen Lernstand aus der ersten Version übernehmen soll
(gelernte, gesichtete und verworfene Karten, Änderungen, pausierte Pakete). Die erste Version
bleibt dabei unverändert.

- **Bereiche:** Welche Pakete zu welchem Bereich gehören, steht in `bereiche.json` im privaten
  Repository. Die App legt die Datei beim ersten Verbinden an und pflegt sie. Die Ordner und die
  Auswertung bleiben wie bisher. Pakete ohne Zuordnung landen im Sammelbereich „Bildungsreise“.
- **Hinzufügen:** Text, Datei oder **Foto**, Titel, Bereich. Fotos von Textseiten werden auf dem
  Handy zu einem PDF (je Foto eine Seite, verkleinert auf 2000 px); Claude liest den Text darauf. „Neues Paket“ legt einen neuen Ordner in
  `privat/` an; „Zum Basispaket“ legt das Dokument in `privat/Grundlagen <Bereich>/`. Nach ein bis
  drei Minuten **Mehr → Neue Karten abrufen**.
- **Paket in einen anderen Bereich:** auf der Paket-Seite die Zeile „Bereich“ antippen. Nur die
  Zuordnung in `bereiche.json` ändert sich; Basispakete bleiben fest in ihrem Bereich.
- **Neue Bereiche:** Mehr → Bereiche verwalten. Sie haben keinen eigenen Bauplatz und fahren mit
  der Bildungsreise.

## Landkarte

Filz-Spielteppich als Hintergrund (`img/welt-tag.webp`, `img/welt-nacht.webp`). Die sieben
Bereiche mit eigenem Bauplatz stehen fest an ihrem Platz (Schule, Lehrkräfte, Universitäten &
Wissenschaft, Senatsverwaltung, Recht, Schüler:innen, Berufsbildung und lebenslanges Lernen). Alle
anderen Bereiche, auch die Bildungsreise selbst, erreichst du über das Boot am Steg unten. Die
Plätze stehen in `app.js` in `KARTEN_PLAETZE` (Prozent der Karte, aus DESIGN.md 7.1).

## Stand: Schritt 3 (mit Bildern)

- Bildschirme: Welt, Bereiche, Bereich, Paket, Lernen, Runde geschafft, Mein Fortschritt, Üben,
  Mehr, Sichten, Hinzufügen; Tag und Nacht.
- Aufbau Bereich → Paket → Karten. Pakete bleiben, wie sie sind; nur das Basispaket eines Bereichs
  wächst.
- Ohne Verbindung: Beispieldaten mit drei Bereichen (Schule, Senatsverwaltung, Recht).
  Zurücksetzen unter **Mehr → Lernstand sichern**.
- Mit Verbindung: deine echten Pakete aus der privaten und der öffentlichen Ablage, acht Bereiche.
- Rückseite der Karte: Antwort, Quelle (höchstens 2 Zeilen) und – wo vorhanden – „Für die Debatte“
  (Vorschlag, wird nach dem Testen entschieden). Die Detailansicht zeigt zusätzlich die Einordnung.
- Paket-Seite: **Bild ändern** (freie Fotos aus Openverse und Wikimedia Commons, auch „Kein Bild“),
  **Weitergeben** (Link – nur für öffentliche oder geteilte Pakete, er öffnet das Paket in der ersten
  Version, die öffentliche Pakete auch ohne Schlüssel zeigt –, Anki-Datei, Lernzettel), **Teilen**
  (behaltene Karten als Kopie in die öffentliche Ablage, aktualisieren, nicht mehr teilen) und
  **Lernzettel** zum Drucken oder als PDF.
- Noch nicht: eigene Fotos, Quiz, Spiele.

## Regeln (kurz)

- Lernrunde: 7 Karten (einstellbar). Bewerten: nach links „nochmal“, nach rechts „gewusst“.
- Bereich auf der Landkarte: Stufe 1 nichts gewusst · 2 teils · 3 alle behaltenen Karten gewusst.
- Paket fertig (alle Karten gewusst) = ein Buch im Regal.
- Figur: Jeder Bereich, der einmal vollständig gewusst war und mindestens 20 gewusste Karten hat,
  bringt eine Stufe (höchstens 7). Einmal erreicht bleibt.
- Jede geschaffte Runde = eine Gabe in der Zuckertüte.

## Bilder

Figur, Gebäude, Laternen, Regal, Bücher und Gaben kommen als WebP-Dateien nach `img/`, mit den
Namen aus `design/13 Bildliste.md` (z. B. `bereich-schule-s3-tag.webp`, `figur-s1-tag.webp`).
Fehlt ein Bild, zeigt die App der Reihe nach: das Tag-Bild abgedunkelt, das Bild des Bereichs
„allgemein“, dann einen Platzhalter mit Name und Stufe.

## Unterlagen

`design/` enthält die Vorgaben. Vorrang: `DESIGN.md` vor `08 Stil-Vorgabe.md` vor
`05 Skizzen Aufbau.html`; `01 Briefing aufgeteilt.md` ist der ältere Stand.

Prüfen der Logik: `node wissenstrainer-v2/test/kern.test.mjs` und `node wissenstrainer-v2/test/github.test.mjs`
