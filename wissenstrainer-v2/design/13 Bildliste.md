# Wissenstrainer – Bildliste und Stil-Prompt

Stand: 21.11.2026, abends · gehört zu 08 Stil-Vorgabe (Abschnitt 10) und DESIGN.md (Abschnitt 9).
**Der ChatGPT-Konsistenz-Test ist bestanden.** Stil, Palette (Erzgebirge) und Figur stehen fest; diese Liste gilt.

## Auf einen Blick

- **74 Bilder** insgesamt. Für den Start reichen **52** (Lieferung 1); die übrigen 22 (Lieferung 2) sind die Figur ab Stufe 3, das Ersatz-Gebäude für neue Bereiche und zwei weitere Gaben.
- **Jede Stufe ist ein Einzelbild** in festem Format und Ausschnitt, mit durchsichtigem Hintergrund. Keine Sammelbilder wie im Test.
- **Stilvorlage sind die vier Vorlagen A bis D** – die Testbilder, umgefärbt auf die Erzgebirge-Farben. Die Figur darin ist die verbindliche Vorlage für die Proportionen.
- Palette „Erzgebirge“: Enzianblau, Krapprot, Senfgelb, Moosgrün und Holz.
- Die Körperfarbe der Figur wechselt mit jeder Stufe: 1 Moosgrün · 2 Enzianblau · 3 Krapprot · 4 Moosgrün · 5 Enzianblau · 6 Krapprot · 7 Senfgelb.
- Ein eigenes Nacht-Bild gibt es nur, wo nachts Licht zu sehen ist. Alles andere dunkelt die App ab. Das spart 26 Bilder.
- Die Figur ist in der Datei auf allen Stufen gleich groß; größer wird sie in der App.

## Die vier Vorlagen

Sie liegen in `10 Entwürfe/ChatGPT/Vorlagen`. Es sind die vier Testbilder, von Claude auf die Erzgebirge-Farben umgefärbt (Blau, Rot und Gelb getauscht; Formen, Holz und Licht unverändert). **Immer diese Dateien anhängen, nicht die ursprünglichen Testbilder** – sonst setzt ChatGPT an den alten Farben an. In die App kommen sie nicht selbst (Sammelbilder, mit Hintergrund); sie sind die Vorlage, nach der die Serie neu entsteht.

| Kurzname | Datei | Vorlage für |
|---|---|---|
| Vorlage A | `Vorlage A - Schule Tag.png` | Stil und Bauweise der Gebäude; die drei Stufen bei Tag |
| Vorlage B | `Vorlage B - Schule Nacht.png` | Nacht-Fassungen der Gebäude |
| Vorlage C | `Vorlage C - Figur Nacht mit Laterne.png` | Figur: Proportionen, Nacht-Fassung mit Laterne |
| Vorlage D | `Vorlage D - Figur jubelnd.png` | Figur: Proportionen, jubelnde Fassung |

Moosgrün kommt in den Vorlagen A bis D nicht vor (die Testbilder enthielten kein Grün). Dafür liegt im selben Ordner die `Farbkarte Erzgebirge.png` mit allen sechs Farbtönen. Sie bei jedem Bild mit anhängen und beim ersten grünen Bild (Lehrkräfte oder Figur Stufe 1) besonders auf den Ton achten.

## Wer macht was

1. **Tilo** erzeugt die Bilder in ChatGPT und legt sie als PNG unter dem Namen aus der Liste (Endung `.png` statt `.webp`) in `10 Entwürfe/ChatGPT/Serie/`.
2. **Claude** prüft jedes Bild gegen die Prüfliste unten, schneidet es auf Format und Ausschnitt zu, wandelt es in WebP um und legt einen Kontaktbogen an (alle Stufen, Tag und Nacht nebeneinander). Abweichungen kommen als Liste zurück.

## Festes Format und fester Ausschnitt

Gilt für jedes Bild einer Art gleich – so springt in der App nichts, wenn Stufe oder Tag/Nacht wechseln. Die Spalte „Datei (px)“ in der Liste nennt die Größe nach dem Zuschnitt.

| Art | Format beim Erzeugen | Ausschnitt |
|---|---|---|
| Gebäude | quadratisch | Unterkante der Sockelplatte bei 90 % der Bildhöhe · größte Breite 80 % der Bildbreite · waagerecht mittig · Dachfirst bei etwa 25 % · Wimpel höchstens bis 6 % |
| Figur | quadratisch | Standfläche bei 90 % der Bildhöhe · Oberkante des Kopfes bei 26 % · Mittelachse des Körpers bei 50 % · Standbreite 35 % der Bildbreite |
| Laterne | hochkant | Fuß bei 95 %, Kappe bei 8 %, mittig |
| Regal | quer | füllt 90 % der Bildbreite, mittig |
| Buch | hochkant | füllt 85 % der Bildhöhe, mittig |
| Gabe, offenes Buch | quadratisch | Objekt füllt etwa 70 % des Bildes, mittig |

Die Figur steht in der Serie bewusst kleiner im Bild als in den Testbildern: Oben und an den Seiten bleibt Platz für Doktorhut, hochgereckte Arme und Bücherstapel, ohne dass sich der Ausschnitt je ändert.

## Die Figur: verbindliche Proportionen

Gemessen an den Vorlagen C und D, bezogen auf die Standbreite des Kegels (= 1):

| Teil | Maß |
|---|---|
| Kopf (Durchmesser) | 0,6 |
| Körper (Höhe des Kegels) | 1,2 |
| Figur gesamt (Standfläche bis Oberkante Kopf) | 1,8 |
| Zuckertüte (Breite × Länge mit Schleife) | 0,35 × 0,95 |
| Ranzen (Breite × Höhe) | 0,4 × 0,5 |

Der Kopf sitzt ohne Hals auf der Kegelspitze. Zuckertüte im Bild links vor dem Körper, Ranzen im Bild rechts hinter dem Körper. Kopf und Hände unlackiertes Holz, kein Gesicht. Die Körperfarbe richtet sich nach der Stufe (siehe „Motive“).

---

## Fester Stil-Prompt

Diesen Block bei **jedem** Bild unverändert voranstellen. Dazu immer die passenden Vorlagen anhängen: für Gebäude A und B, für die Figur C und D, für alles andere A und D – und jedes Mal die Farbkarte.

```
STIL – gilt für jedes Bild dieser Serie, nichts davon ändern:
Holzspielzeug genau im Stil der angehängten Vorlagen (die Farbkarte zeigt nur die Farbtöne, nicht den Stil): gedrechselte und gesägte Holzklötze mit leicht gerundeten Kanten, deckend und seidenmatt lackiert; unlackierte Teile sind helles Buchenholz mit feiner Maserung. Gleiche Lackoberfläche, gleiche Holzart, gleiches Licht wie in den Vorlagen.
Keine Gesichter, keine Augen, kein Mund. Keine Schrift, keine Zahlen, keine Logos, keine Muster.

EIN EINZELNES OBJEKT:
Genau ein Objekt im Bild, kein Sammelbild, keine Reihe.

AUFNAHME:
Wie ein Produktfoto, genau von vorn auf Augenhöhe, ohne Weitwinkel und ohne Schrägsicht. Weiches, gleichmäßiges Licht von links oben.

HINTERGRUND:
Vollständig durchsichtig (PNG mit Alphakanal). Kein Boden, kein Schlagschatten, kein Lichtschein über den Rand des Objekts hinaus.

FARBEN – ausschließlich diese:
Enzianblau #2F3F9E, Krapprot #B8232F, Senfgelb #D4AC2B, Moosgrün #5E7F2E, unlackiertes Holz #D6B58A. Leuchtende Teile bei Nacht: #FFC533. Wo im Motiv „blau“, „rot“, „gelb“ oder „grün“ steht, ist genau dieser Ton gemeint – kein reines Grundfarben-Blau, -Rot, -Gelb oder -Grün.

NICHTS HINZUFÜGEN, was nicht im Motiv steht.

FORMAT UND AUSSCHNITT:
```

Unter „FORMAT UND AUSSCHNITT:“ kommt die passende Zeile:

| Art | Zeile |
|---|---|
| Gebäude | Quadratisches Bild. Unterkante der Sockelplatte bei 90 % der Bildhöhe, größte Breite des Gebäudes 80 % der Bildbreite, waagerecht mittig, Dachfirst bei etwa 25 % der Bildhöhe. |
| Figur | Quadratisches Bild. Standfläche der Figur bei 90 % der Bildhöhe, Oberkante des Kopfes bei 26 %, Körper waagerecht mittig, Standbreite 35 % der Bildbreite. Proportionen der Figur genau wie in den Vorlagen: Kopf 0,6 · Kegelhöhe 1,2 · Gesamthöhe 1,8 der Standbreite. |
| Laterne | Hochkant. Fuß bei 95 % der Bildhöhe, Kappe bei 8 %, mittig. |
| Regal | Querformat. Das Regal füllt 90 % der Bildbreite, mittig. |
| Buch | Hochkant. Das Buch füllt 85 % der Bildhöhe, mittig. |
| Gabe, offenes Buch | Quadratisches Bild. Das Objekt füllt etwa 70 % des Bildes, mittig. |

Darunter „MOTIV:“ und der Text aus dem Abschnitt „Motive“.

### Prompt zum Ableiten (für alles, was nicht „neu“ ist)

Die Spalte „Entsteht aus“ nennt das Ausgangsbild. Dieses Bild anhängen und schreiben:

```
Bearbeite genau das angehängte Bild. Form, Größe, Position, Ausschnitt, Blickwinkel, Licht und alle nicht genannten Teile bleiben unverändert. Hintergrund bleibt durchsichtig. Ändere nur Folgendes:
```

Darunter den passenden Baustein:

| Schritt | Baustein |
|---|---|
| Gebäude Stufe 3 → Stufe 2 | Entferne den Wimpel und die beiden kleinen Figuren. Dach und Tür bleiben lackiert. Von den Wandklötzen bleibt etwa die Hälfte lackiert, die anderen sind unlackiertes Holz. Die Sockelplatte ist zur Hälfte lackiert. Fensterrahmen, Uhr und alle anderen Details sind unlackiertes Holz. |
| Gebäude Stufe 2 → Stufe 1 | Jetzt ist kein Teil mehr lackiert: Das ganze Gebäude ist unlackiertes Holz. |
| Gebäude Tag → Nacht, Stufe 2 | Dieselbe Szene in der Abenddämmerung wie in Vorlage B: gedämpftes Umgebungslicht, alle Farben dunkler. Etwa die Hälfte der Fenster leuchtet warm gelb (#FFC533), die anderen sind dunkel. |
| Gebäude Tag → Nacht, Stufe 3 | Dieselbe Szene in der Abenddämmerung wie in Vorlage B: gedämpftes Umgebungslicht, alle Farben dunkler. Alle Fenster leuchten warm gelb (#FFC533). Die beiden kleinen Figuren halten je eine kleine Holzlaterne mit Bügel, darin eine warm leuchtende Kugel. |
| Figur → nächste Stufe | Der Kegelkörper bekommt die unten genannte neue Farbe, und der unten genannte Gegenstand kommt dazu. Sonst bleibt die Figur gleich: nicht größer, nicht anders gebaut. |
| Figur Tag → Nacht | Abenddämmerung wie in Vorlage C: gedämpftes Umgebungslicht. Die Figur hält zusätzlich in der im Bild rechten Hand eine kleine Holzlaterne mit Bügel, darin eine warm leuchtende Kugel (#FFC533). |
| Figur ruhig → jubelnd | Die Figur jubelt wie in Vorlage D: zwei runde Holzstäbe als Arme, schräg nach oben gereckt, an den Enden die Kugel-Hände. Die Zuckertüte bleibt, wo sie ist. |
| Laterne an → aus | Kugel und Kappe sind jetzt unlackiertes Holz. |
| Laterne Tag → Nacht | Abenddämmerung: gedämpftes Umgebungslicht. Die Kugel leuchtet warm gelb (#FFC533). |

### Regeln für die Serie

- Der fertige Prompt, der alle fünf Bilder je Bereich für alle restlichen Bereiche bestellt, steht in `15 Serien-Prompts.md`. Dort ist je Gebäude genau festgelegt, was bei Stufe 2 lackiert bleibt und was nachts leuchtet.
- Eine Serie (ein Bereich, die Figur) immer in **einem** ChatGPT-Chat erzeugen, in der Reihenfolge Mutterbild → Ableitungen.
- Nie ein abgeleitetes Bild neu erzeugen lassen – immer das Ausgangsbild bearbeiten lassen.
- Wenn ein Bild abweicht: im selben Chat sagen, was abweicht, und noch einmal bearbeiten lassen. Erst weitergehen, wenn es stimmt.
- Mutterbilder zuerst alle nebeneinander ansehen (8 Gebäude, Figur, Laterne): Passen Größe, Licht und Lack zusammen? Erst dann ableiten.
- **Wenn ChatGPT keinen durchsichtigen Hintergrund liefert:** stattdessen einen völlig einfarbigen Hintergrund verlangen – bei Tag-Bildern #E6E9E3, bei Nacht-Bildern #3B284D –, weiterhin ohne Boden, Schatten und Schein. Claude stellt dann frei. Diese beiden Farben sind der Grund der Landkarte; ein Rest-Saum fällt dort nicht auf.
- **Wenn Einzelbilder einer Serie untereinander abweichen:** Rückfall auf den Weg aus dem Test – alle drei Stufen als ein Sammelbild erzeugen lassen. Claude schneidet es in drei Einzelbilder im festen Ausschnitt.

### Prüfliste je Bild

- Hintergrund durchsichtig (oder genau die Ersatzfarbe), kein Boden, kein Schatten.
- Genau ein Objekt, vollständig, genau von vorn, im festen Ausschnitt.
- Nur die fünf Farben plus Leuchtgelb; keine Gesichter, keine Schrift.
- Abgeleitetes Bild: Umriss und Position deckungsgleich mit dem Ausgangsbild.
- Nacht-Bild: Licht nur in Fenstern und Laternen, kein Schein über den Rand hinaus.
- Figur: Proportionen wie in der Tabelle oben; Körperfarbe passend zur Stufe; Zuckertüte gelb mit blauem Band und blauer Schleife (Stufe 7: umgekehrt).
- Farbtöne: erdig wie in den Vorlagen, nicht die reinen Grundfarben.

---

## Motive

### Gebäude (Mutterbild = Stufe 3 bei Tag)

Alle Gebäude sind gebaut wie die Schule in Vorlage A: einzelne Wandklötze mit vertieftem Fenster, ein Türklotz mit Bogentür, Dach, darunter eine flache Sockelplatte. Zu Stufe 3 gehören immer: alle Klötze lackiert, Sockelplatte gelb, ein gelber Wimpel an blauem Stab auf dem Dach und links und rechts davor je eine kleine jubelnde blaue Kegelfigur mit Holzkopf und erhobenen Armen.

| Kennung | Motiv (Stufe 3 bei Tag) |
|---|---|
| `schule` | Genau das rechte Schulhaus aus Vorlage A: vier blaue Wandklötze mit roten Fensterrahmen (zwei übereinander links, zwei rechts), in der Mitte ein blauer Klotz mit gelber Bogentür, rotes Giebeldach mit rotem Giebelfeld, darin eine runde gelbe Uhr mit zwei blauen Zeigern ohne Ziffern. |
| `lehrkraefte` | Kein Gebäude (Tilo, 21.11.2026 – das zuerst gebaute Wohnhaus war der Schule im Umriss zu ähnlich): zwei gleich große, große Kegelfiguren mit Holzköpfen (links rot, rechts blau) auf einer gelben Sockelplatte, zwischen ihnen eine grüne Schultafel mit Holzrahmen auf zwei kurzen Beinen, ohne Schrift. Beide mit erhobenen Armen; die linke hält einen gelben Wimpel. Keine zusätzlichen kleinen Figuren. |
| `universitaeten` | Säulenhalle mit Kuppel (kein Giebel, damit sie sich von der Schule abhebt): vier gelbe runde Säulen auf einer breiten blauen Stufenplatte, darüber ein gerader roter Querbalken, mitten darauf eine blaue Halbkugel als Kuppel; zwischen den mittleren Säulen ein offener Eingang, dahinter eine blaue Wand. Wimpel auf der Kuppel, die beiden kleinen Figuren außen neben den Säulen. Nachts leuchten Eingang und Wand hinter den Säulen (Stufe 2: nur der Eingang). |
| `senatsverwaltung` | Hochhaus mit Anbau: blauer Turm aus sechs Wandklötzen mit roten Fensterrahmen (zwei nebeneinander, drei übereinander) und gelber Bogentür unten, rote Dachplatte; rechts ein niedrigerer grüner Anbau aus zwei Wandklötzen mit roter Dachplatte. |
| `recht` | Gerichtsgebäude: blauer Baukörper mit großem offenem Torbogen in der Mitte, links und rechts je ein Wandklotz mit schmalem Fenster und rotem Rahmen, rote Dachplatte; darauf eine gelbe Balkenwaage aus Stab, Querbalken und zwei Halbschalen. |
| `schueler` | Kein Gebäude: eine Gruppe aus drei Kegelfiguren unterschiedlicher Größe (rot, blau, grün) mit Holzköpfen auf einer gelben Sockelplatte, alle mit erhobenen Armen; die mittlere hält einen gelben Wimpel. Keine zusätzlichen kleinen Figuren. |
| `lebenslang` | Flachbau: drei rote Wandklötze nebeneinander, zwei mit Fenster und blauem Rahmen, einer mit gelber Bogentür, blaue Flachdach-Platte; rechts daneben ein Baum aus gelbem Stamm und grüner Kugel. |
| `allgemein` | Runder Pavillon (kein spitzes Dach, damit er sich von der Schule abhebt): blauer runder Baukörper mit rundem Fenster mit rotem Rahmen und gelber Bogentür, darüber ein breites, flaches rotes Schirmdach – Umriss wie ein Pilz. |

Sonderfall `schueler`: Stufe 2 = ohne erhobene Arme und ohne Wimpel, die mittlere Figur und die halbe Sockelplatte sind unlackiert. Stufe 1 = alles unlackiert. Nacht Stufe 3 = jede Figur hält eine kleine leuchtende Holzlaterne; Nacht Stufe 2 = nur die linke Figur hält eine.

Sonderfall `lehrkraefte`: Stufe 2 = ohne Arme und ohne Wimpel, linke Figur und Tafel bleiben lackiert, rechte Figur und halbe Sockelplatte unlackiert. Stufe 1 = alles unlackiert. Nacht wie bei `schueler`.

**Unterscheidbarkeit:** Jeder Bereich hat einen eigenen Umriss – Schule Giebel mit Uhr, Universitäten Kuppel mit Säulen, Senatsverwaltung Turm mit Anbau, Recht Flachdach mit Torbogen und Waage, Lebenslanges Lernen Flachbau mit Baum, Allgemein Pilzdach, Lehrkräfte und Schüler:innen Figurengruppen (mit und ohne Tafel).

### Figur (Mutterbild = Stufe 1 bei Tag)

Die Figur ist auf allen Stufen gebaut wie in den Vorlagen C und D: gleiche Größe, gleiche Proportionen. **Mit jeder Stufe wechselt die Körperfarbe**, und ein Gegenstand kommt dazu. Die Vorlagen zeigen Stufe 2 (blauer Körper, mit Ranzen).

Feste Farbfolge: **1 Moosgrün · 2 Enzianblau · 3 Krapprot · 4 Moosgrün · 5 Enzianblau · 6 Krapprot · 7 Senfgelb.** Die Zuckertüte ist immer gelb mit blauem Band und blauer Schleife – außer auf Stufe 7.

| Stufe | Körperfarbe | Motiv bzw. was dazukommt |
|---|---|---|
| 1 | Moosgrün | Die Kegelfigur aus den Vorlagen C und D, aber mit grünem Körper, ohne Ranzen, ohne Laterne, Arme nicht erhoben: Kegel als Körper, Kugel aus unlackiertem Holz als Kopf, zwei kleine Holzkugeln als Hände. Im Bild links vor dem Körper die gelbe Zuckertüte mit blauem Band und blauer Schleife, Spitze nach unten. Steht frei, ohne Sockel. |
| 2 | Enzianblau | dazu der Ranzen aus den Vorlagen: Kasten aus unlackiertem Holz mit Deckel, im Bild rechts hinter dem Körper |
| 3 | Krapprot | dazu eine gelbe Mütze mit blauem Rand und blauer Bommel |
| 4 | Moosgrün | dazu eine Zeugnisrolle aus unlackiertem Holz mit roter Schleife, schräg vor dem Körper |
| 5 | Enzianblau | dazu im Bild rechts neben der Figur ein Stapel aus drei Büchern (rot, gelb, grün) |
| 6 | Krapprot | dazu eine blaue Schärpe schräg über dem Körper |
| 7 | Senfgelb | statt der Mütze ein blauer Doktorhut mit roter Quaste; die Zuckertüte ist jetzt blau mit gelbem Band und gelber Schleife |

Gegenstände haben nie die Farbe des Körpers, vor dem sie stehen – deshalb die Farben in der letzten Spalte.

### Laterne, Regal, Bücher, Gaben

| Datei | Motiv |
|---|---|
| `laterne-an-tag` | Straßenlaterne aus gedrechseltem Holz: runder Fuß und schlanker Stab aus unlackiertem Holz, oben eine gelbe Kugel, darauf eine kleine blaue Kappe. |
| `regal` | Leeres Bücherregal aus unlackiertem Holz, genau von vorn, drei Bretter (zwei Fächer), Rückwand etwas dunkler, keine Bücher. |
| `buch-1` bis `buch-4` | Ein stehendes Buch von vorn (man sieht den Buchrücken): lackierter Holzklotz in Blau, mit einem schmalen Streifen unlackiertem Holz. Buch 2 bis 4: dasselbe in Rot, Gelb, Grün. |
| `buch-offen` | Ein aufgeschlagenes Buch aus unlackiertem Holz, flach liegend, leicht von oben gesehen. |
| `gabe-1` | Apfel: rote Holzkugel mit kurzem Stiel aus unlackiertem Holz. |
| `gabe-2` | Bonbon: gelber Zylinder mit je einem kleinen Kegel an beiden Enden. |
| `gabe-3` | Buntstift: blauer Stab mit Spitze aus unlackiertem Holz. |
| `gabe-4` | Radiergummi: grüner Quader mit einem Streifen unlackiertem Holz. |

---

## Die Liste

„Lieferung 1“ = für den Start nötig. „Tag (nachts abgedunkelt)“ = kein eigenes Nacht-Bild, die App dunkelt ab.

### Bereich Schule

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 1 | `bereich-schule-s3-tag.webp` | 660 × 660 | 3 | Tag | Landkarte, Bereich ohne Foto | neu – Mutterbild | 1 |
| 2 | `bereich-schule-s2-tag.webp` | 660 × 660 | 2 | Tag | Landkarte, Bereich ohne Foto | bereich-schule-s3-tag | 1 |
| 3 | `bereich-schule-s1-tag.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Landkarte, Bereich ohne Foto | bereich-schule-s2-tag | 1 |
| 4 | `bereich-schule-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Landkarte, Bereich ohne Foto | bereich-schule-s3-tag | 1 |
| 5 | `bereich-schule-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Landkarte, Bereich ohne Foto | bereich-schule-s2-tag | 1 |

### Bereich Lehrkräfte

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 6 | `bereich-lehrkraefte-s3-tag.webp` | 660 × 660 | 3 | Tag | Landkarte, Bereich ohne Foto | neu – Mutterbild | 1 |
| 7 | `bereich-lehrkraefte-s2-tag.webp` | 660 × 660 | 2 | Tag | Landkarte, Bereich ohne Foto | bereich-lehrkraefte-s3-tag | 1 |
| 8 | `bereich-lehrkraefte-s1-tag.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Landkarte, Bereich ohne Foto | bereich-lehrkraefte-s2-tag | 1 |
| 9 | `bereich-lehrkraefte-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Landkarte, Bereich ohne Foto | bereich-lehrkraefte-s3-tag | 1 |
| 10 | `bereich-lehrkraefte-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Landkarte, Bereich ohne Foto | bereich-lehrkraefte-s2-tag | 1 |

### Bereich Universitäten

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 11 | `bereich-universitaeten-s3-tag.webp` | 660 × 660 | 3 | Tag | Landkarte, Bereich ohne Foto | neu – Mutterbild | 1 |
| 12 | `bereich-universitaeten-s2-tag.webp` | 660 × 660 | 2 | Tag | Landkarte, Bereich ohne Foto | bereich-universitaeten-s3-tag | 1 |
| 13 | `bereich-universitaeten-s1-tag.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Landkarte, Bereich ohne Foto | bereich-universitaeten-s2-tag | 1 |
| 14 | `bereich-universitaeten-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Landkarte, Bereich ohne Foto | bereich-universitaeten-s3-tag | 1 |
| 15 | `bereich-universitaeten-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Landkarte, Bereich ohne Foto | bereich-universitaeten-s2-tag | 1 |

### Bereich Senatsverwaltung

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 16 | `bereich-senatsverwaltung-s3-tag.webp` | 660 × 660 | 3 | Tag | Landkarte, Bereich ohne Foto | neu – Mutterbild | 1 |
| 17 | `bereich-senatsverwaltung-s2-tag.webp` | 660 × 660 | 2 | Tag | Landkarte, Bereich ohne Foto | bereich-senatsverwaltung-s3-tag | 1 |
| 18 | `bereich-senatsverwaltung-s1-tag.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Landkarte, Bereich ohne Foto | bereich-senatsverwaltung-s2-tag | 1 |
| 19 | `bereich-senatsverwaltung-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Landkarte, Bereich ohne Foto | bereich-senatsverwaltung-s3-tag | 1 |
| 20 | `bereich-senatsverwaltung-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Landkarte, Bereich ohne Foto | bereich-senatsverwaltung-s2-tag | 1 |

### Bereich Recht

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 21 | `bereich-recht-s3-tag.webp` | 660 × 660 | 3 | Tag | Landkarte, Bereich ohne Foto | neu – Mutterbild | 1 |
| 22 | `bereich-recht-s2-tag.webp` | 660 × 660 | 2 | Tag | Landkarte, Bereich ohne Foto | bereich-recht-s3-tag | 1 |
| 23 | `bereich-recht-s1-tag.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Landkarte, Bereich ohne Foto | bereich-recht-s2-tag | 1 |
| 24 | `bereich-recht-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Landkarte, Bereich ohne Foto | bereich-recht-s3-tag | 1 |
| 25 | `bereich-recht-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Landkarte, Bereich ohne Foto | bereich-recht-s2-tag | 1 |

### Bereich Schüler:innen

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 26 | `bereich-schueler-s3-tag.webp` | 660 × 660 | 3 | Tag | Landkarte, Bereich ohne Foto | neu – Mutterbild | 1 |
| 27 | `bereich-schueler-s2-tag.webp` | 660 × 660 | 2 | Tag | Landkarte, Bereich ohne Foto | bereich-schueler-s3-tag | 1 |
| 28 | `bereich-schueler-s1-tag.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Landkarte, Bereich ohne Foto | bereich-schueler-s2-tag | 1 |
| 29 | `bereich-schueler-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Landkarte, Bereich ohne Foto | bereich-schueler-s3-tag | 1 |
| 30 | `bereich-schueler-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Landkarte, Bereich ohne Foto | bereich-schueler-s2-tag | 1 |

### Bereich Lebenslanges Lernen

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 31 | `bereich-lebenslang-s3-tag.webp` | 660 × 660 | 3 | Tag | Landkarte, Bereich ohne Foto | neu – Mutterbild | 1 |
| 32 | `bereich-lebenslang-s2-tag.webp` | 660 × 660 | 2 | Tag | Landkarte, Bereich ohne Foto | bereich-lebenslang-s3-tag | 1 |
| 33 | `bereich-lebenslang-s1-tag.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Landkarte, Bereich ohne Foto | bereich-lebenslang-s2-tag | 1 |
| 34 | `bereich-lebenslang-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Landkarte, Bereich ohne Foto | bereich-lebenslang-s3-tag | 1 |
| 35 | `bereich-lebenslang-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Landkarte, Bereich ohne Foto | bereich-lebenslang-s2-tag | 1 |

### Bereich Allgemein (für neue Bereiche)

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 36 | `bereich-allgemein-s3-tag.webp` | 660 × 660 | 3 | Tag | Landkarte, Bereich ohne Foto | neu – Mutterbild | 2 |
| 37 | `bereich-allgemein-s2-tag.webp` | 660 × 660 | 2 | Tag | Landkarte, Bereich ohne Foto | bereich-allgemein-s3-tag | 2 |
| 38 | `bereich-allgemein-s1-tag.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Landkarte, Bereich ohne Foto | bereich-allgemein-s2-tag | 2 |
| 39 | `bereich-allgemein-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Landkarte, Bereich ohne Foto | bereich-allgemein-s3-tag | 2 |
| 40 | `bereich-allgemein-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Landkarte, Bereich ohne Foto | bereich-allgemein-s2-tag | 2 |

### Figur

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 41 | `figur-s1-tag.webp` | 660 × 660 | 1 | Tag | Welt (Kopf), Üben, Mein Fortschritt | neu – Mutterbild | 1 |
| 42 | `figur-s1-nacht.webp` | 660 × 660 | 1 | Nacht | Welt (Kopf), Üben, Mein Fortschritt | figur-s1-tag | 1 |
| 43 | `figur-s1-jubel.webp` | 660 × 660 | 1 | Tag (nachts abgedunkelt) | Runde geschafft | figur-s1-tag | 1 |
| 44 | `figur-s2-tag.webp` | 660 × 660 | 2 | Tag | Welt (Kopf), Üben, Mein Fortschritt | figur-s1-tag | 1 |
| 45 | `figur-s2-nacht.webp` | 660 × 660 | 2 | Nacht | Welt (Kopf), Üben, Mein Fortschritt | figur-s2-tag | 1 |
| 46 | `figur-s2-jubel.webp` | 660 × 660 | 2 | Tag (nachts abgedunkelt) | Runde geschafft | figur-s2-tag | 1 |
| 47 | `figur-s3-tag.webp` | 660 × 660 | 3 | Tag | Welt (Kopf), Üben, Mein Fortschritt | figur-s2-tag | 2 |
| 48 | `figur-s3-nacht.webp` | 660 × 660 | 3 | Nacht | Welt (Kopf), Üben, Mein Fortschritt | figur-s3-tag | 2 |
| 49 | `figur-s3-jubel.webp` | 660 × 660 | 3 | Tag (nachts abgedunkelt) | Runde geschafft | figur-s3-tag | 2 |
| 50 | `figur-s4-tag.webp` | 660 × 660 | 4 | Tag | Welt (Kopf), Üben, Mein Fortschritt | figur-s3-tag | 2 |
| 51 | `figur-s4-nacht.webp` | 660 × 660 | 4 | Nacht | Welt (Kopf), Üben, Mein Fortschritt | figur-s4-tag | 2 |
| 52 | `figur-s4-jubel.webp` | 660 × 660 | 4 | Tag (nachts abgedunkelt) | Runde geschafft | figur-s4-tag | 2 |
| 53 | `figur-s5-tag.webp` | 660 × 660 | 5 | Tag | Welt (Kopf), Üben, Mein Fortschritt | figur-s4-tag | 2 |
| 54 | `figur-s5-nacht.webp` | 660 × 660 | 5 | Nacht | Welt (Kopf), Üben, Mein Fortschritt | figur-s5-tag | 2 |
| 55 | `figur-s5-jubel.webp` | 660 × 660 | 5 | Tag (nachts abgedunkelt) | Runde geschafft | figur-s5-tag | 2 |
| 56 | `figur-s6-tag.webp` | 660 × 660 | 6 | Tag | Welt (Kopf), Üben, Mein Fortschritt | figur-s5-tag | 2 |
| 57 | `figur-s6-nacht.webp` | 660 × 660 | 6 | Nacht | Welt (Kopf), Üben, Mein Fortschritt | figur-s6-tag | 2 |
| 58 | `figur-s6-jubel.webp` | 660 × 660 | 6 | Tag (nachts abgedunkelt) | Runde geschafft | figur-s6-tag | 2 |
| 59 | `figur-s7-tag.webp` | 660 × 660 | 7 | Tag | Welt (Kopf), Üben, Mein Fortschritt | figur-s6-tag | 2 |
| 60 | `figur-s7-nacht.webp` | 660 × 660 | 7 | Nacht | Welt (Kopf), Üben, Mein Fortschritt | figur-s7-tag | 2 |
| 61 | `figur-s7-jubel.webp` | 660 × 660 | 7 | Tag (nachts abgedunkelt) | Runde geschafft | figur-s7-tag | 2 |

### Laternen

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 62 | `laterne-an-tag.webp` | 90 × 174 | – | Tag | Landkarte: Lernserie, Tag gelernt | neu – Mutterbild | 1 |
| 63 | `laterne-aus-tag.webp` | 90 × 174 | – | Tag (nachts abgedunkelt) | Landkarte: Lernserie, Tag nicht gelernt | laterne-an-tag | 1 |
| 64 | `laterne-an-nacht.webp` | 90 × 174 | – | Nacht | Landkarte: Lernserie, Tag gelernt | laterne-an-tag | 1 |

### Bibliothek

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 65 | `regal.webp` | 1050 × 900 | – | Tag (nachts abgedunkelt) | Mein Fortschritt: Hintergrund | neu | 1 |
| 66 | `buch-1.webp` | 54 × 144 | – | Tag (nachts abgedunkelt) | Mein Fortschritt: Buch je fertigem Paket (Blau) | neu – Mutterbild | 1 |
| 67 | `buch-2.webp` | 54 × 144 | – | Tag (nachts abgedunkelt) | Mein Fortschritt: Buch je fertigem Paket (Rot) | buch-1 (nur Farbe) | 1 |
| 68 | `buch-3.webp` | 54 × 144 | – | Tag (nachts abgedunkelt) | Mein Fortschritt: Buch je fertigem Paket (Gelb) | buch-1 (nur Farbe) | 1 |
| 69 | `buch-4.webp` | 54 × 144 | – | Tag (nachts abgedunkelt) | Mein Fortschritt: Buch je fertigem Paket (Grün) | buch-1 (nur Farbe) | 1 |
| 70 | `buch-offen.webp` | 132 × 96 | – | Tag (nachts abgedunkelt) | Mein Fortschritt: fast fertiges Paket | neu | 1 |

### Gaben

| Nr. | Dateiname | Datei (px) | Stufe | Tag/Nacht | Verwendung | Entsteht aus | Lieferung |
|---|---|---|---|---|---|---|---|
| 71 | `gabe-1.webp` | 96 × 96 | – | Tag (nachts abgedunkelt) | Runde geschafft: fällt in die Zuckertüte (Apfel) | neu | 1 |
| 72 | `gabe-2.webp` | 96 × 96 | – | Tag (nachts abgedunkelt) | Runde geschafft: fällt in die Zuckertüte (Bonbon) | neu | 1 |
| 73 | `gabe-3.webp` | 96 × 96 | – | Tag (nachts abgedunkelt) | Runde geschafft: fällt in die Zuckertüte (Buntstift) | neu | 2 |
| 74 | `gabe-4.webp` | 96 × 96 | – | Tag (nachts abgedunkelt) | Runde geschafft: fällt in die Zuckertüte (Radiergummi) | neu | 2 |

## Zählung

| Gruppe | Bilder | davon Lieferung 1 |
|---|---|---|
| Gebäude (8 Kennungen × 5) | 40 | 35 |
| Figur (7 Stufen × 3) | 21 | 6 |
| Laternen | 3 | 3 |
| Regal und Bücher | 6 | 6 |
| Gaben | 4 | 2 |
| **Summe** | **74** | **52** |

## Offen

- Ob ChatGPT durchsichtige Hintergründe zuverlässig liefert (Ersatz siehe „Regeln für die Serie“).
- Ob Einzelbilder genauso deckungsgleich werden wie die Sammelbilder im Test (Rückfall siehe „Regeln für die Serie“).
- Ob „Schüler:innen“ in Stufe 2 und 3 nachts gut lesbar ist (viele kleine Lichter auf kleiner Fläche).
- Auswahl von Geschlecht und Hautfarbe der Figur: vorerst gestrichen.
- Ob ChatGPT beim Ableiten der Figur den Farbwechsel des Körpers sauber hinbekommt, ohne die Form zu ändern.
