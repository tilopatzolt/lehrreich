# Wissenstrainer – Stil-Vorgabe „Baukasten bei Tag, Laternenlicht bei Nacht“

Stand: 21.11.2026, abends · Entschieden von Tilo: Richtung 3 (Baukasten) ist der helle Modus, Richtung 4 (Laternenlicht) der dunkle. Richtung 5 (Fotomontage) läuft später als Seitenprojekt.
Gilt zusammen mit 01 (Teil A und Verbotsliste) und 05 (Aufbau). Sichtbarer Entwurf der Bedienoberfläche: Claude-Design-Artefakt „Wissenstrainer – Welt und Lernen, Tag und Nacht“.
**Geändert am 21.11. abends:** Figur, Gebäude und Laternen sind keine SVG-Zeichnungen mehr, sondern Bilder im Stil „plastisches Holzspielzeug“ (Abschnitte 5, 6, 7 und 10). Der ChatGPT-Konsistenz-Test ist bestanden. Die Bedienoberfläche bleibt flach.
**Farben neu (Tilo, 21.11.):** Palette „Erzgebirge“ – Enzianblau, Krapprot, Senfgelb, Moosgrün. Die Körperfarbe der Figur wechselt mit jeder Stufe (Abschnitt 6).

## 0. Leitsatz

Die Welt ist aus Holzbauklötzen gebaut. **Eine Logik für beide Modi: nicht gelernt = rohes Holz und dunkel, gelernt = Lackfarbe und Licht.**
Bei Tag sieht man das an der Farbe, bei Nacht zusätzlich am Licht in Fenstern und Laternen. Aufbau, Formen und Schrift sind in beiden Modi gleich – es wechseln nur Farben und Licht.
Es gibt zwei Ebenen: Die Bedienoberfläche (Knöpfe, Karten, Schrift, Navigation) ist flach. Figur, Gebäude und Laternen sind plastische Holzspielzeug-Bilder, die darauf stehen.

## 1. Farben

Nur diese Werte. Als CSS-Variablen anlegen.

### Bedienung

| Rolle | Tag | Nacht |
|---|---|---|
| Grund | #F4F5F2 | #261830 (Aubergine) |
| Fläche (Karte, Blatt von unten, Zeile) | #FFFFFF | #35223F |
| Vertiefte Fläche, Zweitknopf | #E6E9E3 | #3B284D |
| Text | #1A1C22 | #F7F3EE |
| Nebentext | #3A3E48 | #E3D9EA |
| Hauptfarbe (Hauptknopf, aktiver Reiter, „gewusst“) | Enzianblau #2F3F9E, Schrift darauf #FFFFFF | Laternengelb #FFC533, Schrift darauf #261830 |
| Akzent („nochmal“, Warnung – sparsam) | Krapprot #B8232F | helles Krapprot #DE4A56 |
| Textlink | #2F3F9E | #FFC533 |
| Grund im Lernmodus | #F4F5F2 | #1C1124 (dunkler als sonst) |
| Navigationsleiste | #F4F5F2 | #1C1124 |

### Welt

Die flachen Teile der Welt (Weltgrund, Weg, Platzhalter, Fortschritts-Klötze) nehmen genau diese Werte. Für die Holzspielzeug-Bilder sind die vier Lackfarben und Holz die Soll-Farben bei Tag; durch Licht und Schatten im Bild fallen sie dort etwas dunkler oder heller aus. Bei Nacht sind die Lackfarben im Bild gedämpft – einen festen Nachtwert braucht nur das Gelb, weil es auch flach vorkommt.

| Rolle | Tag | Nacht |
|---|---|---|
| Weltgrund (Grundplatte) | #E6E9E3 | #3B284D |
| Weg | #D3D8CF | #4D3862 |
| Holz hell / dunkel | #D6B58A / #C29F71 | #6A5570 / #57445E |
| Lack Blau – Enzianblau | #2F3F9E | im Nacht-Bild gedämpft |
| Lack Rot – Krapprot | #B8232F | im Nacht-Bild gedämpft |
| Lack Gelb – Senfgelb | #D4AC2B | #AD8E2C |
| Lack Grün – Moosgrün | #5E7F2E | im Nacht-Bild gedämpft |
| Licht (Fenster, Laternen) | – | #FFC533 |
| Lichtschein um leuchtende Bilder | – | weicher Schein in der Lichtfarbe, den die App um das Bild legt |

**Palette „Erzgebirge“** (entschieden 21.11.): vier Lackfarben wie bei alten, handbemalten Holzfiguren – Enzianblau, Krapprot, Senfgelb, Moosgrün – dazu Holz. Alle vier bleiben; Grün macht die Gebäude unterscheidbarer. Die erdigeren Töne rücken die Palette weg von den Google-Farben.

Regeln:
- Eine Hauptfarbe pro Modus. Gelb, Grün und Holz gehören der Welt, nicht den Knöpfen (Ausnahme: Gelb ist bei Nacht die Hauptfarbe, weil es das Licht ist).
- Krapprot bleibt sparsam: nur für „nochmal“ und Warnungen, nie als große Fläche.
- Das Senfgelb ist bei Nacht absichtlich stumpfer (#AD8E2C), damit echtes Licht (#FFC533) heraussticht.
- Wände mit Fenstern werden nie gelb lackiert – sonst sieht man bei Nacht das Licht in den Fenstern nicht. Gelb ist für Türen, Säulen, Wimpel und Kugeln.
- Lesbarkeit ist nachgerechnet: alle Text-/Grund-Paare oben liegen über 7:1.

## 2. Schrift

**Jost** (Google Fonts) für alles, in beiden Modi. Schnitte 500, 600, 700.

| Verwendung | Größe / Schnitt |
|---|---|
| Überschrift („Heute: 12 Karten“, Bereichsname) | 26 px / 700 |
| Kartenfrage | 26 px / 600, Zeilenabstand 1,25 |
| Antwort | 22 px / 700 |
| Knopf | 21 px / 700 |
| Text | 17 px / 500 |
| Nebentext, Quelle, Hinweise | 15–16 px / 500 |
| Beschriftung (Bereichsname auf der Karte, Reiter, Bildnachweis) | 13 px / 600 |

Nichts kleiner als 13 px. Keine Großbuchstaben-Etiketten, keine Sperrung, keine Kursive, keine zweite Schrift.

## 3. Formen und Abstände

- Ecken: 10 px (Knöpfe, Fotos, Reiter), 14 px (Lernkarte, Blatt von unten).
- **Keine Schatten, keine Rahmen, keine Verläufe** in der Bedienoberfläche. Einzige Ausnahme bei Nacht: der Lichtschein um Leuchtendes (Laterne, leuchtende Bilder, Hauptknopf, Lernkarte). Was im Inneren der Holzspielzeug-Bilder an Licht und Schatten zu sehen ist, gehört zum Bild und fällt nicht unter diese Regel.
- Flächen stehen direkt auf dem Grund, nie Kasten im Kasten.
- Abstände in 4er-Schritten (4, 8, 12, 16, 20, 24, 32). Seitenrand 20 px.
- Hauptknopf 56 px hoch, volle Breite. Alles Antippbare mindestens 48 px.
- Zweitknopf: vertiefte Fläche mit Text in Textfarbe, ohne Rand.
- Wiederkehrende Formen: Rechteck, Dreieck, Bogen, Kreis – die Klotzformen.

## 4. Icons

- Phosphor Icons, Stärke „Fill“ (frei, MIT-Lizenz, ohne Build-Schritt einbindbar). Material Symbols nicht mehr verwenden.
- Die vier Reiter unten bekommen eigene Klotz-Zeichen: Welt = Kreis, Bereiche = vier Quadrate, Üben = Dreieck, Mehr = Bogen. Immer mit Wort darunter.
- Aktiver Reiter: Klotz in Hauptfarbe mit Schrift darauf (Tag blau/weiß, Nacht gelb/dunkel).
- Keine Emojis, keine Icons im abgerundeten Quadrat als Deko.

## 5. Bereiche auf der Landkarte: drei Stufen

Jeder Bereich ist ein kleines Bauwerk aus Holzklötzen als Bild (Abschnitt 10), von vorn gesehen, auf einer Sockelplatte. Größe auf der Karte 110 × 110 px, Name darunter. Vorbild für alle Bauwerke ist die Schule aus den Testbildern.

| Stufe | Bedeutung | Tag | Nacht |
|---|---|---|---|
| 1 | noch nichts gelernt (auch ohne Karten) | alle Klötze unlackiertes Holz, niemand davor | dasselbe Bild, abgedunkelt; alle Fenster dunkel, kein Licht |
| 2 | teils gelernt | Dach und Tür lackiert, dazu etwa die Hälfte der Wandklötze und des Sockels; der Rest ist Holz | dasselbe in der Dämmerung, etwa die Hälfte der Fenster leuchtet |
| 3 | alles gelernt und gewusst | alle Klötze lackiert, Wimpel auf dem Dach, zwei jubelnde blaue Kegelfiguren davor | dasselbe in der Dämmerung, alle Fenster leuchten, die Kegelfiguren tragen kleine Laternen, weicher Lichtschein ums Bild |

- **„Heute fällig“:** flaches Fähnchen mit Zahl über dem Bild (nie Zahl im Kreis). Tag: blaues Fähnchen, weiße Zahl. Nacht: leuchtend gelbes Fähnchen, dunkle Zahl.
- Bereich „Schüler:innen“ ist kein Gebäude, sondern eine Gruppe Kegelfiguren; die Stufen gelten sinngemäß (Holz → teils lackiert → alle lackiert und jubelnd).

## 6. Figur

- Plastische **Kegelfigur aus Holz** nach den Vorlagen: lackierter Kegel als Körper, Kugel aus unlackiertem Holz als Kopf, zwei kleine Holzkugeln als Hände. Kein Gesicht. Freude zeigt sich über Haltung (Arme hoch) und Gegenstände.
- **Eine Figur für alle:** unisex, vorerst eine Hautfarbe (Holzkopf). Eine Auswahl von Geschlecht und Hautfarbe kann später dazukommen.
- **Die Körperfarbe wechselt mit jeder Stufe** – Aufstiege sind selten, der Farbwechsel ist das Belohnungszeichen. Feste Folge: **1 Moosgrün · 2 Enzianblau · 3 Krapprot · 4 Moosgrün · 5 Enzianblau · 6 Krapprot · 7 Senfgelb.** Merkhilfe: Es beginnt grün (Neuling), dann zweimal die Reihe Blau – Rot – Grün … und endet in Gelb, der Farbe, die vorher keine Stufe hatte.
- **Zuckertüte** ist auf allen 7 Stufen dabei: senfgelb mit blauem Band und blauer Schleife. Nur auf Stufe 7, wo der Körper gelb ist, ist sie umgekehrt gefärbt (blau mit gelbem Band), damit sie sichtbar bleibt.
- 7 Stufen über Gegenstände: 1 nur Zuckertüte · 2 dazu Ranzen aus Holz · 3 Mütze · 4 Zeugnisrolle · 5 Bücherstapel · 6 Schärpe · 7 Doktorhut. Die Figur ist in allen Bildern gleich groß gebaut; die App zeigt sie mit jeder Stufe etwas größer.
- Je Stufe drei Fassungen: ruhig bei Tag · bei Nacht mit kleiner leuchtender Laterne · jubelnd mit hochgereckten Armen.
- Verbindliche Vorlage für die Proportionen sind die Vorlagen C und D (Maße in Abschnitt 10).
- Auf der Startseite steht die Figur in einem Kreis von 60 px (vertiefte Fläche); Tipp darauf öffnet „Mein Fortschritt“.

## 7. Laternen (Lernserie)

- 7 Laternen am Fußweg oben in der Landkarte, eine je Wochentag. Als Bild im selben Holzspielzeug-Stil: gedrechselter Fuß, Stab, Kugel, kleine Kappe.
- Tag: gelernt = gelbe Kugel mit blauer Kappe, nicht gelernt = Holzkugel.
- Nacht: gelernt = leuchtende Kugel mit Lichtschein, nicht gelernt = dunkle Kugel.
- Keine Häkchen, keine Flamme, kein Tage-Zähler.

## 8. Fotos

- Fotos bleiben **groß und in voller Farbe**. Holzspielzeug-Bild = Überblick und Gefühl, Foto = Inhalt. Beide stehen nie im selben Rahmen.
- Feste Zuschnitte: Bereichs-Kopf 5:3, Paket-Kopf 2:1, Paket-Kachel 1:1. Ecken 10 px (Kopf-Fotos oben randlos).
- **Kein Text auf dem Foto.** Titel und Bildnachweis stehen auf einem Klotz direkt darunter (Tag: Enzianblau mit weißer Schrift; Nacht: Fläche #35223F mit heller Schrift). Der Bildnachweis ist immer sichtbar (13 px).
- Angleichung per CSS, automatisch für jedes Foto: Tag leicht mehr Kontrast, leicht weniger Sättigung (`contrast(1.05) saturate(0.92)`); Nacht zusätzlich abgedunkelt (`brightness(0.82)`) – „Abendlicht“.
- Schwache Fotos (unscharf, beliebig) bekommen die Kennzeichnung „schwach“: Sie werden schwarz-weiß und kleiner auf einem größeren Farbklotz gezeigt.
- Ohne Foto: vertiefte Fläche mit dem Bild des Bereichs.

## 9. Lernen und Feier

- **Lernen (Konzentrations-Modus):** nur die Karte, keine Navigation. Oben Schließen, 7 kleine Klötze und „3/7“. Klötze: erledigt = Hauptfarbe, aktuelle Karte = Gelb (Tag) bzw. helles Weiß (Nacht), offen = Holz.
- Tag: Karte ist eine weiße Fläche auf hellem Grund. Nacht: Grund wird dunkler (#1C1124), die Karte (#35223F) hat einen gelben Lichtschein, die Antwort erscheint in Laternengelb.
- Bewerten: 2 Wischrichtungen. Am linken und rechten Bildschirmrand je ein schmaler Klotz als Richtungsanzeige (links Akzentfarbe „nochmal“, rechts Hauptfarbe „gewusst“), beide auch antippbar. Keine Pfeile.
- **Runde geschafft:** Die Figur jubelt, und eine kleine Gabe fällt in die Zuckertüte – eine einzige kurze Bewegung. Kein Konfetti-Dauerregen, keine Zahlen-Übersicht.

## 10. So entstehen die Bilder (Figur, Gebäude, Laternen)

Entschieden am 21.11.2026 nach bestandenem Konsistenz-Test mit ChatGPT. Ersetzt das frühere Zeichnen per Code als SVG („12 Zeichentest.html“ wird nicht weiterverfolgt).

**Was ein Bild ist und was nicht**
- Bilder sind: die Figur, die Gebäude der Bereiche, die Laternen der Lernserie, dazu Regal, Bücher und Gaben. Alles andere bleibt flach.
- Alle Bilder zusammen stehen in „13 Bildliste.md“ – dort auch der feste Stil-Prompt.

**Stil – verbindlich sind die vier Vorlagen in „10 Entwürfe/ChatGPT/Vorlagen“**
- Vorlage A (Schule in drei Stufen, Tag), Vorlage B (Schule in drei Stufen, Nacht), Vorlage C (Figur nachts mit Laterne), Vorlage D (Figur jubelnd). Es sind die vier Testbilder, umgefärbt auf die Erzgebirge-Farben; Formen und Licht sind unverändert. Dazu die „Farbkarte Erzgebirge“ mit allen Farbtönen.
- Plastisches Holzspielzeug: gedrechselte und gesägte Klötze mit leicht gerundeten Kanten, deckend und seidenmatt lackiert; unlackierte Teile sind helles Buchenholz mit feiner Maserung.
- Wie ein Produktfoto genau von vorn, ohne Schrägsicht. Weiches Licht von links oben.
- Keine Gesichter, keine Schrift, keine Zahlen, keine Logos, keine Muster.

**Palette**
- Enzianblau, Krapprot, Senfgelb, Moosgrün und Holz – die Werte aus Abschnitt 1. Dazu das Licht #FFC533 bei Nacht. Keine weiteren Farben.
- Wände mit Fenstern werden nie gelb lackiert (sonst sieht man nachts das Licht nicht).

**Hintergrund**
- Durchsichtig. Kein Boden, kein Schlagschatten, kein Lichtschein über den Rand des Objekts hinaus – den Schein legt die App um das Bild.

**Jede Stufe ein Einzelbild in festem Format und Ausschnitt**
- Jede Stufe, jede Tag- und jede Nacht-Fassung ist eine eigene Datei. Keine Sammelbilder in der App.
- Format: quadratisch für Gebäude und Figur.
- Ausschnitt Gebäude: Unterkante der Sockelplatte bei 90 % der Bildhöhe, größte Breite 80 % der Bildbreite, waagerecht mittig, Dachfirst bei etwa 25 %, Wimpel höchstens bis 6 %.
- Ausschnitt Figur: Standfläche bei 90 % der Bildhöhe, Oberkante des Kopfes bei 26 %, Mittelachse des Körpers bei 50 %, Standbreite 35 % der Bildbreite.
- Innerhalb einer Serie sind Größe, Lage und Blickwinkel in allen Bildern gleich. Beim Wechsel von Stufe oder Tag/Nacht darf nichts springen.

**Figur – verbindliche Vorlage für die Proportionen**
Vorlage sind die Vorlagen C und D. Gemessen, bezogen auf die Standbreite des Kegels (= 1):

| Teil | Maß |
|---|---|
| Kopf (Durchmesser) | 0,6 |
| Körper (Höhe des Kegels) | 1,2 |
| Figur gesamt (Standfläche bis Oberkante Kopf) | 1,8 |
| Zuckertüte (Breite × Länge mit Schleife) | 0,35 × 0,95 |
| Ranzen (Breite × Höhe) | 0,4 × 0,5 |

- Der Kopf sitzt ohne Hals auf der Kegelspitze.
- Zuckertüte im Bild links vor dem Körper, Spitze nach unten; Ranzen im Bild rechts hinter dem Körper.
- Diese Maße gelten auf allen 7 Stufen. Neue Gegenstände kommen dazu und die Körperfarbe wechselt (Abschnitt 6), sonst ändert sich die Figur nicht.

**Gebäude**
- Gebaut wie die Schule im Test: Wandklötze mit vertieftem Fenster, Türklotz mit Bogen, Dach, Sockelplatte.
- Jedes Bauwerk ist an seiner Silhouette erkennbar (Schule = Giebel mit Uhr, Universitäten = Säulen, Senatsverwaltung = Hochhaus mit Anbau, Recht = Torbogen mit Waage, Lebenslanges Lernen = Flachbau mit Baum).
- Die drei Stufen stehen in Abschnitt 5.

**Tag und Nacht**
- Das Nacht-Bild ist dasselbe Bild in der Dämmerung, mit leuchtenden Fenstern und Laternen.
- Ein eigenes Nacht-Bild gibt es nur, wo nachts Licht zu sehen ist. Alles andere dunkelt die App ab.

**Herstellung**
- Mit ChatGPT und dem festen Stil-Prompt aus der Bildliste. Je Serie ein Mutterbild; alle weiteren Stufen und Nacht-Fassungen entstehen durch Bearbeiten dieses Bildes, nicht durch neues Erzeugen.
- Claude prüft jedes Bild gegen diese Vorgabe, schneidet es auf Format und Ausschnitt zu und meldet Abweichungen.

## 11. Verbote

Zusätzlich zur ganzen Verbotsliste in 01, Teil B gilt hier ausdrücklich:

- Kein Dunkelblau als Nachtgrund, keine Tailwind-Standardfarben, kein Creme/Pergament, kein Orange.
- Keine anderen Schriften als Jost.
- Keine Schatten, Rahmen, Verläufe, Glas-Effekte (Ausnahme: Lichtschein bei Nacht).
- Keine Pillen-Etiketten, keine Großbuchstaben-Überzeilen, keine Zahl im Kreis, keine Pfeile in Knöpfen oder Karten, keine farbigen Balken am Kartenrand.
- Keine Häkchen-Kreise, keine Flamme mit Tage-Zähler, keine Fortschrittsringe, keine Zeitangaben wie „~12 Min.“.
- Kein Profil, keine Begrüßung mit Namen, keine Emojis, keine erfundenen Zusatzangaben (Versionsnummern, Dateinamen).
- Bilder nur im festgelegten Holzspielzeug-Stil und nur die aus der Bildliste (Abschnitt 10). Keine anderen Illustrationen, keine plastischen Knöpfe oder Icons, keine Gesichter.
- Kein Text auf Fotos.

## 12. Offen

- Name der App und App-Symbol.
- Ob „Automatisch“ dem Gerät folgt oder der Uhrzeit (Abend = Nacht).
- Auswahl von Geschlecht und Hautfarbe der Figur – vorerst gestrichen, kann später kommen.
- Ob ChatGPT durchsichtige Hintergründe zuverlässig liefert (sonst stellt Claude frei).
- Wie „aktuell wieder alles gewusst“ markiert wird (Idee Urkunde, siehe 04).
