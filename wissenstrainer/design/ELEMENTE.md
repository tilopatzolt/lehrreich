# Bauteile-Liste

Diese Liste wächst mit dem Prototyp. Sie hält fest, welche Bausteine die App wirklich braucht,
wo sie vorkommen und was am Design noch offen ist. Am Ende ist sie die Grundlage für den
Design-Auftrag (z. B. wieder an Stitch).

Stilgrundlage: Stitch-Entwurf „Warmes Editorial & Lorbeergrün“ in `stitch/`
(Bildschirme als `screen.png`, Code als `code.html`). Die Datei `stitch/DESIGN-fruehere-runde.md`
stammt aus einer früheren Runde mit anderen Farben und gilt nicht mehr.

**Status:** ✅ aus Stitch übernommen · 🛠 im Stil nachgebaut (Stitch hatte es nicht) · ❓ offen / Wunsch

## Grundlagen

| Baustein | Status | Notiz |
|---|---|---|
| Farben: Pergament, Elfenbein, Lorbeergrün, Cognac | ✅ | |
| Schriften: Newsreader (Überschriften, Fragen), Hanken Grotesk (Text, Zahlen) | ✅ | |
| Icons: Material Symbols | ✅ | in `app/index.html` sind nur die genutzten Symbole geladen |
| Dunkler Modus | 🛠 | von mir abgeleitet, Stitch hatte nur hell |
| App-Symbol (Startbildschirm) | 🛠 | Platzhalter in Grün; ❓ richtiges Logo |
| Name der App | ❓ | „Wissenstrainer“ ist noch eine Beschreibung |

## Heute (Startseite)

| Baustein | Status | Notiz |
|---|---|---|
| Kopfzeile mit Wortmarke und Lernserie | ✅ | Profil-Knopf aus Stitch weggelassen (es gibt kein Profil) |
| Datum, Begrüßung mit Namen, Untertitel | ✅ | Name unter „Mehr“ einstellbar |
| Tagesabruf: fällige Karten im Kreis, Anteil gefestigt | ✅ | |
| Knopf „Lernen starten“ mit Zähler | ✅ | |
| Hinweis auf neue Entwürfe | 🛠 | |
| Lernserie mit Wochentagen | ✅ | wischbar bzw. Pfeile für frühere Wochen 🛠 |
| Themen-Pakete, nummeriert, mit Filter Alle/Privat/Öffentlich | ✅ | Stitch-Filter waren Kategorien (Politik, Recht …) |
| Paket-Vorschaubild | ✅ | frei lizenziertes Foto (Openverse/Commons); Claude wählt aus mehreren Treffern; ❓ eigene Fotos hochladen |
| Leitthema des Tages (großes Bild) | ❓ | weggelassen; Idee: Paket mit den meisten fälligen Karten |
| Zitat des Tages | ✅ | nimmt jeden Tag ein anderes Zitat aus deinen Karten |
| Hinweis „Beispieldaten“ | 🛠 | verschwindet mit dem ersten echten Dokument |

## Lernen

| Baustein | Status | Notiz |
|---|---|---|
| Kopf mit Paket, Zähler, Fortschritt | ✅ | |
| Karte: Art, Fälligkeit, Frage | ✅ | |
| Antwort-Bausteine: Kernfakt, Einordnung, Debatten-Tipp | ✅ | Debatten-Tipp wird neu von Claude mit erzeugt |
| Baustein „Im Original“ (wörtliches Zitat) | 🛠 | |
| Quelle | ✅ | ❓ „Quelle extern“-Link: geht erst, wenn Dokumente einen Link haben |
| Lesezeichen auf der Karte | ❓ | in Stitch, noch ohne Funktion → weggelassen |
| Bewertung: Nochmal / Schwer / Gut / Leicht | ✅ | |
| Abschluss-Bildschirm einer Runde | 🛠 | mit „Noch eine Runde“; ❓ kleine Animation zum Feiern |
| Lernrunden mit fester Größe | 🛠 | Standard 10 Karten, einstellbar unter „Mehr“ |

## Sichten

| Baustein | Status | Notiz |
|---|---|---|
| Kopf „N Entwürfe sichten“ | ✅ | |
| Hinweisleiste Links/Rechts | ✅ | |
| Kartenstapel mit Wischen | ✅ | |
| Knöpfe Verwerfen / Editieren / Später / Behalten | ✅ | „Später“ legt die Karte ans Ende |
| Stapel-Info mit „heute geprüft“ | ✅ | „Importieren“ aus Stitch → „Alle behalten“ |
| Filter nach Paket | 🛠 | |
| Quelle wählen (Feed & Recherche) | ❓ | in Stitch; gibt es (noch) nicht |

## Bibliothek und Paket-Seite

| Baustein | Status | Notiz |
|---|---|---|
| Bibliothek: Pakete nach Privat/Öffentlich | 🛠 | Stitch hatte keinen Bibliothek-Bildschirm |
| Bibliothek: alle Karten mit Suche und Filtern | 🛠 | |
| Paket-Kopf mit Sichtbarkeit, Kartenzahl, Beschreibung | ✅ | Beschreibung = Zusammenfassung des ersten Dokuments |
| Titelfoto mit Bildnachweis | 🛠 | Bildnachweis ist bei CC-Lizenzen Pflicht |
| Bild ändern (Blatt mit Suche und Bildraster) | 🛠 | Auswahl wird im Paket gespeichert, auch für die geteilte Fassung |
| Fortschritt mit Ring, „Heute fällig“ | ✅ | |
| Knopf „Jetzt lernen“ | ✅ | |
| Schalter „Im täglichen Lernplan“ | 🛠 | |
| Weitergeben: Link, Lernzettel (PDF), Anki | ✅ | Anki als Textdatei statt `.apkg` |
| Sichtbarkeit: öffentlich teilen / nicht mehr teilen | 🛠 | |
| Liste der Dokumente | 🛠 | |
| Kartenliste mit Suche, Typ-Filter, Status | ✅ | |
| Kategorie des Pakets (z. B. „Wirtschaft & Finanzen“) | ❓ | in Stitch; bräuchte eine Kategorie pro Paket |

## Sonstiges

| Baustein | Status | Notiz |
|---|---|---|
| Mehr / Einstellungen | 🛠 | |
| Dokument hinzufügen (Blatt) | 🛠 | |
| Karte bearbeiten / eigene Karte (Blatt) | 🛠 | |
| Rückfrage-Blatt (z. B. vor dem Teilen) | 🛠 | |
| Lernzettel zum Drucken | 🛠 | |
| Kurzmeldungen unten („Gespeichert“, „Rückgängig“) | 🛠 | |
| Leerzustände („Alles gesichtet.“) | 🛠 | ❓ Illustrationen |
