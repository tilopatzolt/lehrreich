# Access: Klick-für-Klick Einrichtung (Anfänger)

Diese Anleitung zeigt dir Schritt für Schritt, wie du den Import-Workflow aus `modSchuelerImportReview.bas` in **deiner Access-Datei** einrichtest.

> Kurzantwort auf deine wichtigste Frage: **Du musst die temporäre Review-Tabelle nicht manuell anlegen.**
> Der Code erstellt `tmp_SchuelerImport_Review` automatisch beim ersten Start (`EnsureReviewTable`).
> Die rohe Import-Tabelle `tmp_SchuelerImport_Raw` wird ebenfalls automatisch neu erzeugt (indirekt über `TransferSpreadsheet`).

---

## 0) Voraussetzungen prüfen

1. Deine Access-Datenbank enthält eine Zieltabelle `Schueler`.
2. Es gibt eine Tabelle `Schulen` mit `SchuleID`, `SchuleCode`, `Name der Schule` und weiteren Spalten.
3. Deine Excel-Datei hat ein Blatt `Daten` (im VBA als `Daten$`) mit den erwarteten Spalten.

Wenn die Spaltennamen in Excel genauso heißen wie in `Schueler`, passt das zum gewünschten Zielbild.

---

## 1) VBA-Modul importieren

1. Access öffnen.
2. `ALT + F11` drücken (VBA-Editor).
3. Links im Projektfenster deine Datenbank auswählen.
4. Menü: **Datei > Datei importieren...**
5. `modSchuelerImportReview.bas` auswählen.
6. Mit `Debuggen > Kompilieren` einmal prüfen, ob es ohne Fehler kompiliert.

---

## 1a) Falls du die .bas-Datei nicht herunterladen kannst

Du kannst den Code auch manuell einfügen (so wie du es gemacht hast):

1. Im VBA-Editor: **Einfügen > Modul**.
2. Gesamten Inhalt aus `modSchuelerImportReview.bas` hineinkopieren.
3. Modul speichern als `modSchuelerImportReview`.
4. Danach **Debuggen > Kompilieren**.

## 2) Formular neu anlegen

1. In Access links auf **Formulare**.
2. **Erstellen > Formularentwurf**.
3. Formular speichern als: `frm_SchuelerImportReview` (der Name muss exakt so sein).
4. Formular markieren, dann `F4` für **Eigenschaftsblatt**.
5. Register **Daten** öffnen.
6. Eigenschaft **Datensatzquelle** = `tmp_SchuelerImport_Review`.

### Wichtig zur temporären Tabelle

- Beim allerersten Start gibt es `tmp_SchuelerImport_Review` oft noch nicht.
- Der Code erstellt sie automatisch.
- Falls Access beim Entwurf meckert, kannst du trotzdem speichern und später nach erstem Import erneut öffnen.

---

## 3) Felder in das Formular ziehen

1. Im Formularentwurf auf **Vorhandene Felder hinzufügen**.
2. Wenn Felder nicht sichtbar sind: erst einmal Import starten (Schritt 5), dann Formular neu öffnen.
3. Mindestens diese Felder auf das Formular legen:
   - `ReviewID` (kann auch ausgeblendet sein)
   - `SNachname`, `SVorname`, `SGeburtstag`, `Klassenstufe`
   - `Schulname`, `Schulcode`, `SSchuleIDRaw`, `SuggestedSchuleID`
   - `SUnsichereFelder`
   - `STelefon1`, `STelefon2`, `SMobiltelefon`, `SEMail1`
   - `SFach1`, `SFach2`, `SFach3`, `Foerderwuensche`
   - `Schuelerstatus`
   - `SAnmeldendeVorname`, `SAnmeldendeNachname`
   - Wochenzeiten (nur `von`): `SMovon`, `SDivon`, `SMivon`, `SDovon`, `SFrvon`

---

## 4) Buttons einbauen

## Optional: Formular bewusst leer öffnen

Ja, das geht. Dafür gibt es jetzt einen eigenen Einstieg:

```vba
Btn_OpenReviewLeer
```

Dieser öffnet `frm_SchuelerImportReview` mit Filter `1=0`, also ohne angezeigte Datensätze.  
Sobald du danach einen Import startest, wird der Filter automatisch entfernt und die frisch importierten Datensätze werden angezeigt.


## A) Button „Import starten"

1. Im Entwurf: **Entwurf > Schaltfläche** einfügen.
2. Beschriftung z. B. `Import starten`.
3. Im Eigenschaftsblatt Register **Ereignis**:
   - **Beim Klicken** = `[Ereignisprozedur]`
4. Auf `...` klicken und VBA-Code einfügen:

```vba
Private Sub cmdStartImport_Click()
    Btn_StartImportReview
End Sub
```

## B) Button „Review leer öffnen"

```vba
Private Sub cmdOpenLeer_Click()
    Btn_OpenReviewLeer
End Sub
```

## C) Button „Speichern & Nächster"

```vba
Private Sub cmdSaveNext_Click()
    Btn_SaveCurrentAndNext
End Sub
```

---

## 5) Bedingte Formatierung für „unsichere Felder"

Beispiel für Feld `STelefon1`:

1. Textfeld `STelefon1` anklicken.
2. Menü **Format > Bedingte Formatierung**.
3. Neue Regel: **Ausdruck ist**
4. Ausdruck:

```vba
IsFieldUncertain([SUnsichereFelder];"STelefon 1")
```

5. Füllfarbe z. B. Gelb/Orange wählen.

Dasselbe für andere Felder, z. B.:

- Schulname:
  `IsFieldUncertain([SUnsichereFelder];"Schulname")`
- Förderwünsche:
  `IsFieldUncertain([SUnsichereFelder];"Förderwünsche")`

---

## 5a) Wo ist „Bedingte Formatierung" in Access?

Wichtig: Diese Einstellung ist **kein Feld im Eigenschaftsblatt**. Dass das Format-Feld dort leer ist, ist normal.

So öffnest du die richtige Stelle:

1. Formular in **Entwurfsansicht** öffnen.
2. Ein **Textfeld-Steuerelement** anklicken (z. B. `STelefon1`) – nicht nur das Bezeichnungsfeld (Label).
3. Oben im Ribbon auf **Format** klicken.
4. Dort auf **Bedingte Formatierung** klicken.
   - Alternative per Rechtsklick auf das Textfeld: **Bedingte Formatierung...**
5. Im Dialog:
   - **Neue Regel**
   - **Ausdruck ist**
   - Ausdruck eintragen, z. B.  
     `IsFieldUncertain([SUnsichereFelder];"STelefon 1")`
6. Hintergrundfarbe wählen (z. B. Gelb), mit OK bestätigen.

Wenn der Menüpunkt grau/unsichtbar ist:
- Prüfen, ob du wirklich in **Entwurfsansicht** bist (nicht Formularansicht/Layoutansicht).
- Prüfen, ob wirklich ein **Textfeld** markiert ist.
- Im Auswahlfeld oben links im Eigenschaftsblatt muss ein Feld wie `STelefon1` ausgewählt sein.


### Wichtiger Syntax-Hinweis (deutsche Access-Umgebung)

In deutscher Locale erwartet Access bei Funktionen meist ein **Semikolon `;`** statt Komma `,` als Trennzeichen.

Verwende daher in der Regel diesen Ausdruck:

```vba
IsFieldUncertain([SUnsichereFelder];"STelefon 1")
```

Wenn deine Access-Installation auf Englisch läuft, kann stattdessen Komma funktionieren.

Außerdem wichtig:
- Das Feld heißt im Review-Datensatz `SUnsichereFelder` (genau so schreiben).
- Das zweite Argument muss exakt so heißen wie in der Excel-Liste, z. B. `"STelefon 1"`.
- Test im Direktfenster (`Strg+G`):
  `? IsFieldUncertain("STelefon 1, Schulname"; "STelefon 1")`
  → sollte `True` liefern.

### Praxis-Hinweis aus deinem Test

In deiner Access-Version funktioniert die Regel zuverlässig so:
- über **Rechtsklick auf das Textfeld** → **Bedingte Formatierung** öffnen
- im Ausdruck **Semikolon `;`** als Trennzeichen verwenden
- den Ausdruck **ohne führendes `=`** eintragen

Beispiel (funktionierend):

```vba
IsFieldUncertain([SUnsichereFelder];"STelefon 1")
```

## 6) Erster Testlauf

1. Formular `frm_SchuelerImportReview` öffnen.
2. Auf **Import starten** klicken.
3. Excel-Datei auswählen (falls Standardpfad nicht gefunden wird).
4. Prüfen, ob Datensätze erscheinen.
5. Datensatz korrigieren.
6. Auf **Speichern & Nächster** klicken.
7. In Tabelle `Schueler` prüfen, ob Datensatz angekommen ist.

---

## 7) Häufige Fehler (und schnelle Lösung)

- **Fehler: Formular nicht gefunden**
  - Formularname exakt `frm_SchuelerImportReview` setzen.

- **Fehler 3211: Tabelle `tmp_SchuelerImport_Review` konnte nicht gesperrt werden**
  - Ursache: Das Review-Formular oder ein anderer Prozess hält die Tabelle noch geöffnet, oder Access gibt keinen exklusiven Schema-Lock frei.
  - Lösung in aktueller Version: Beim Importstart wird `frm_SchuelerImportReview` automatisch geschlossen.
  - Zusätzlich: Schema-Erweiterungen werden bei Lock-Fehler 3211 nicht mehr als Abbruch behandelt (Import läuft weiter).
  - Falls es dennoch auftritt: alle Formulare schließen und Import erneut starten.
  - Hinweis: Neue Versionen arbeiten pro Importlauf mit `ImportRunID`-Filter im Formular, statt die ganze Review-Tabelle vorab zu löschen.

- **Fehler 3420: Objekt ist ungültig / nicht mehr festgelegt (bei „Temp-Tabellen vorbereiten")**
  - Ursache in älteren Access/DAO-Umgebungen: Feld-Erweiterung über ein bereits referenziertes `TableDef`-Objekt kann instabil sein.
  - Lösung in der aktuellen Version: fehlende Felder werden per `ALTER TABLE ... ADD COLUMN` ergänzt.
  - Falls der Fehler noch auftaucht: Access neu starten und Import erneut ausführen.

- **Fehler 3290: Syntaxfehler in CREATE TABLE-Anweisung**
  - Ursache war in älteren/abweichenden Access-Umgebungen die SQL-`CREATE TABLE`-Variante.
  - Lösung: die aktuelle Modul-Version nutzen; dort wird die Review-Tabelle per DAO-Objektmodell erzeugt (ohne SQL-`CREATE TABLE`).
  - Falls bereits eine defekte halb angelegte Tabelle existiert: `tmp_SchuelerImport_Review` löschen und `StartImportReview` erneut ausführen.

- **Alte Daten bleiben sichtbar bis „Alle aktualisieren"**
  - Ursache: Das Formular war schon geöffnet und zeigte noch einen alten Recordset-Stand.
  - Die aktuelle Modul-Version aktualisiert das offene Formular nach dem Import automatisch (`Requery`) und springt auf den nächsten offenen Datensatz.
  - Falls du eine ältere Version nutzt: Formular kurz schließen/neu öffnen oder manuell „Alle aktualisieren".

- **Fehler 3265 trotz Header-Guards (ID-Feld in `Schueler`)**
  - Ursache: In der Zieltabelle hat das ID-/PK-Feld einen anderen Namen als erwartet.
  - Lösung in aktueller Version: PK-Feld wird über Primärindex ermittelt; falls keiner gesetzt ist, werden `SchuelerID` / `ID` / `SchülerID` probiert.
  - Empfehlung: In `Schueler` einen Primärschlüssel definieren (Access-Primärindex).

- **Fehler 3265 in „Review-Queue befüllen" nach 3211-Fällen**
  - Ursache: Neue Match-/Merge-Felder konnten wegen Lock nicht sofort an `tmp_SchuelerImport_Review` angelegt werden.
  - Lösung in aktueller Version: Import arbeitet auch ohne diese optionalen Felder weiter (feldweise Guards).
  - Empfehlung: Access später neu starten und den Import erneut ausführen, damit alle Zusatzfelder nachgezogen werden können.

- **Fehler 3265: Element in dieser Auflistung nicht gefunden (bei „Review-Queue befüllen")**
  - Ursache: Eine oder mehrere Excel-Spalten heißen anders als im VBA erwartet.
  - Die aktuelle Modul-Version ist toleranter und prüft mehrere Feldnamen (z. B. `STelefon 1`/`STelefon1`, `SE-Mail1`/`SEMail1`, `Schulname`/`NamederSchule`).
  - Trotzdem: Prüfe die Spaltenüberschriften in Zeile 1 der Excel-Datei auf Tippfehler.

- **Fehler 3125 beim Excel-Import ('Daten' ist kein gültiger Name)**
  - Prüfe, ob das Blatt in Excel wirklich `Daten` heißt (ohne Tippfehler/Leerzeichen).
  - Die aktuelle Modul-Version probiert mehrere Varianten (`Daten$`, `Daten`, `[Daten$]`, Bereichsvarianten) automatisch.
  - Wenn der Fehler bleibt: Datei öffnen und Blatt umbenennen auf exakt `Daten`, speichern, erneut importieren.

- **Fehler beim Excel-Import**
  - Blattname `Daten` prüfen.
  - Kopfzeile muss in Zeile 1 sein.

- **Felder fehlen**
  - Spaltennamen zwischen Excel und VBA abgleichen.

- **Keine automatische SchuleID**
  - Tabelle `Schulen` prüfen: `SchuleID` vorhanden? `Code`/`Name` gepflegt?

---

## Hinweis zu Screenshots

In dieser Umgebung kann ich leider keine echten **Microsoft-Access-Desktop-Screenshots** erzeugen.
Wenn du möchtest, kann ich dir im nächsten Schritt eine **Checkliste mit exakt benannten Eigenschaften (Name, Steuerelementinhalt, Ereignisse, Formatregeln)** machen, die du 1:1 abarbeitest.


## 8) Match/ Merge-Entscheidung im Review

Nach dem Import werden pro Review-Datensatz automatisch Match-Felder gesetzt:
- `MatchType`: `none`, `soft`, `hard`
- `MatchCount`: wie viele Kernfelder übereinstimmen
- `MatchedSchuelerID`: gefundene Ziel-ID (falls eindeutig)
- `MergeAction`: Vorschlag (`NEW`, `MERGE`, `ASK`, `SKIP`)
- `MatchDebugInfo`: Diagnosefeld für Matching (zeigt je Kandidat V/N/G/S-Treffer und Ergebnis)

Logik:
- **hard**: Vorname+Nachname+Geburtstag ODER Vorname+Nachname+Schule
- **soft**: sonstige Treffer mit 2 von 4 (Vorname, Nachname, Geburtstag, Schule)

Beim Anzeigen eines Datensatzes im Review-Formular erscheint ein Entscheidungs-Popup:
- bei `hard`/`soft`: `Ja=Merge`, `Nein=Neu anlegen`, `Abbrechen=Überspringen`
- bei `none`: Info-Popup, Aktion wird auf `NEW` gesetzt
- bei `Abbrechen`: zusätzliche Sicherheitsabfrage `Überspringen` vs. `Abbrechen (auf Datensatz bleiben)`
- bei bestätigtem `Überspringen`: aktueller Review-Datensatz wird sofort als verarbeitet markiert und der nächste Datensatz wird direkt geladen

Beim Speichern:
- `NEW` legt neu an
- `MERGE` aktualisiert bestehenden Datensatz (nur nicht-leere Importwerte)
- `SKIP` überspringt

Merge-Datumsregel:
- `Berlinpassdatum` und `Ablaufdatum ZB` werden nur überschrieben, wenn das Importdatum neuer ist als der bestehende Wert.



## 9) Hinweis zu Wochenzeiten als Text

Wenn die Felder `SMovon`, `SDivon`, `SMivon`, `SDovon`, `SFrvon` in der Tabelle `Schueler` als **Text** definiert sind, schreibt die aktuelle Modulversion die Werte im Format `hh:nn` (z. B. `13:10`) statt `00:00:00`.
