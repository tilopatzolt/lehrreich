# Schüler-Import Review Workflow (Access/VBA)

Dieses Repository enthält ein VBA-Modul für einen zweistufigen Import:

1. **Import in eine Review-Queue** aus Excel (`tmp_SchuelerImport_Review`).
2. **Manuelle Prüfung/Korrektur im Formular** und danach Übernahme in `Schueler`.

## Enthalten

- `modSchuelerImportReview.bas`
  - Import versucht automatisch mehrere Blatt-Referenzformate (`Daten$`, `Daten`, `[Daten$]`, ...), um Access-Fehler 3125 zu vermeiden
  - Start des Imports (`Btn_StartImportReview` / `StartImportReview`)
  - Vorschlag für `SchuleID` über Name/Code/Fuzzy-Match (`GuessSchoolID`)
  - Verarbeitung eines geprüften Datensatzes (`Btn_SaveCurrentAndNext`)
  - Markierung unsicherer Felder (`IsFieldUncertain`)

## Erwartete Tabellen/Felder

- Tabelle `Schulen` mit mindestens `SchuleID` und in deinem Fall `SchuleCode` sowie `Name der Schule` (alternativ unterstützt der Code auch `Code`/`Name`/`NamederSchule`)
- Zieltabelle `Schueler` mit den im Insert verwendeten Feldern
- Excel-Sheet `Daten$` mit u. a.:
  - `SNachname`, `SVorname`, `SGeburtstag`, `Klassenstufe`
  - `Schulname`, `Schulcode`, `SSchuleID`
  - `UnsichereFelder`
  - `SAnmeldendeVorname`, `SAnmeldendeNachname` (Alias beim Import unterstützt auch `SAnmeldender-Vorname/Nachname`)
  - `Schülerstatus` (Alias `Schuelerstatus`)
  - Wochenzeiten (nur `von`): `SMovon`, `SDivon`, `SMivon`, `SDovon`, `SFrvon`

## Form-Integration

- Formularname: `frm_SchuelerImportReview`
- Button 1 ruft `Btn_StartImportReview` auf.
- Button 2 ruft `Btn_SaveCurrentAndNext` auf.
- Bedingte Formatierung kann über `IsFieldUncertain([SUnsichereFelder], "Feldname")` gesteuert werden.


## Schritt-für-Schritt Einrichtung

Eine ausführliche Anfänger-Anleitung findest du in `ACCESS_SETUP_GUIDE.md`.


## Dubletten-Erkennung & Merge

Beim Import werden jetzt Match-Informationen in der Review-Tabelle vorbereitet:
- `MatchType` (`none`, `soft`, `hard`)
- `MatchCount`
- `MatchedSchuelerID`
- `MergeAction` (`NEW`, `MERGE`, `ASK`, `SKIP`)
- `MatchDebugInfo` (technische Diagnose, warum ein Datensatz als `none`/`soft`/`hard` bewertet wurde)


Ablauf im Formular:
- Beim Anzeigen eines Datensatzes erscheint jetzt immer ein Popup zur Entscheidung.
- Bei `hard`/`soft`: Auswahl über `Ja=Merge`, `Nein=Neu anlegen`, `Abbrechen=Überspringen` (mit zusätzlicher Sicherheitsabfrage für Überspringen).
- Bei `none`: Info-Popup „Neue:r Schüler:in wird angelegt“, Aktion wird auf `NEW` gesetzt.

`Btn_SaveCurrentAndNext` verarbeitet die Aktion entsprechend:
- `NEW`: neuer Datensatz in `Schueler`
- `MERGE`: bestehender Datensatz wird feldweise aktualisiert (nur wenn Importwert nicht leer; Datum-Felder mit "neu > alt" Logik für Berlinpass/Zusatzbogen)
- `SKIP`: keine Übernahme
