---
name: wissenstrainer-uebergabe
description: Fasst eine Recherche als Übergabe-Dokument für Tilos Wissenstrainer (Lernkarten-App) zusammen. Auslösen bei „für den Wissenstrainer“, „mach daraus Lernkarten“, „an den Wissenstrainer übergeben“ oder wenn /wissenstrainer-uebergabe aufgerufen wird.
---

# Übergabe an den Wissenstrainer

Tilo lernt politische Inhalte mit einer eigenen Lernkarten-App. Aus jedem Dokument, das dort
ankommt, macht eine automatische Auswertung kurze Lernkarten (Fakten, Zahlen, Argumente,
Beispiele, Zitate, Begriffe). Deine Aufgabe ist **nicht**, Karten zu schreiben, sondern gutes
Rohmaterial zu liefern: ein klar gegliedertes Dokument, aus dem sich viele kurze, belegte
Karten machen lassen.

## 1. Inhalt sammeln

Nimm das Thema aus dem bisherigen Gespräch bzw. der Recherche. Fehlt etwas Wichtiges (z. B.
die Gegenposition oder aktuelle Zahlen) und du kannst es recherchieren, ergänze es. Frag nur
nach, wenn unklar ist, welches Thema gemeint ist.

Regeln:
- **Nur Belegtes.** Jede Zahl und jede Aussage mit Quelle (Herausgeber, Titel, Datum; Link,
  wenn vorhanden). Nichts erfinden. Unsicheres als unsicher kennzeichnen.
- **Konkret statt allgemein.** Zahlen mit Einheit, Bezugsjahr und Bezugsgröße; Namen von
  Programmen, Gesetzen, Institutionen ausschreiben.
- **Beide Seiten.** Argumente dafür und dagegen, jeweils mit wem sie verbunden sind (Partei,
  Verband, Studie).
- **Zitate wörtlich**, mit Person, Funktion, Quelle und Datum.
- Deutsch, sachlich, kurze Sätze. Ein Punkt pro Zeile.

## 2. Dokument schreiben

Genau diese Gliederung als Markdown; leere Abschnitte weglassen:

```markdown
# <Thema> – Recherche <TT.MM.JJJJ>

## Worum es geht
2–3 Sätze Einordnung: Was ist das, warum ist es gerade Thema?

## Kernaussagen
- Die 3–5 wichtigsten Punkte, je ein Satz.

## Zahlen und Fakten
- <Fakt mit Zahl> (Quelle, Datum)

## Argumente dafür
- <Argument> – vertreten von <wem> (Quelle)

## Argumente dagegen
- <Argument> – vertreten von <wem> (Quelle)

## Zitate
- „<wörtliches Zitat>“ – <Person, Funktion>, <Quelle, Datum>

## Begriffe
- **<Begriff>**: kurze Erklärung

## Beispiele
- <konkretes Beispiel, möglichst aus Berlin oder Deutschland> (Quelle)

## Quellen
- <Herausgeber>: <Titel>, <Datum>, <Link>
```

## 3. Übergeben

1. Speichere das Dokument als Datei `<JJJJ-MM-TT> <Thema>.md` im Arbeitsordner (gibt es dort
   einen Ordner „An Wissenstrainer“, dann darin).
2. Zeig Tilo den Text zusätzlich vollständig im Chat, damit er ihn kopieren kann.
3. Schlag einen Paketnamen vor (kurz, z. B. „Bildungspolitik“, „Schuldenbremse“) und sag Tilo,
   wie es weitergeht:
   - In der Wissenstrainer-App (am Rechner im Browser: https://tilopatzolt.github.io/lehrreich/)
     **Mehr → Text einfügen**, Text einfügen, Paket eintragen, **Privat** lassen, **Hochladen**.
   - Oder **Mehr → Dokument** und die gespeicherte Datei wählen.
   - Nach ein bis drei Minuten **Mehr → Neue Karten abrufen**, dann unter **Sichten** durchgehen.

Wenn ein GitHub-Zugang mit Schreibrecht auf `tilopatzolt/wissenstrainer-privat` verfügbar ist,
biete an, die Datei direkt nach `privat/<Paket>/<Dateiname>.md` hochzuladen – aber nur nach
Tilos ausdrücklichem Ja. Niemals in die öffentliche Ablage (`tilopatzolt/lehrreich`), außer Tilo
verlangt das ausdrücklich.

Erklärungen für Tilo einfach und ohne Fachsprache.
