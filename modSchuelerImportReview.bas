Option Compare Database
Option Explicit

' ============================================================
'  Schueler-Import mit Review-Schritt + Markierung unsicherer Felder
' ============================================================

Private Const C_DEFAULT_PATH As String = _
  "C:\Users\Public\343681 lehrreich Wilmersdorf GmbH\lehrreich - Dokumente\General\Dauerhaft\Allgemeine Arbeitsdateien\Lernfoerderung_Auswertung.xlsx"

Private Const C_SHEET As String = "Daten$"
Private Const C_RAW_TABLE As String = "tmp_SchuelerImport_Raw"
Private Const C_REVIEW_TABLE As String = "tmp_SchuelerImport_Review"
Private Const C_SCHOOL_TABLE As String = "Schulen"
Private Const C_TARGET_TABLE As String = "Schueler"
Private Const C_REVIEW_FORM As String = "frm_SchuelerImportReview"

Private gStage As String
Private gCurrentRunId As String


' ========= Einstieg für Formular-Button =========
Public Sub Btn_StartImportReview()
    StartImportReview
End Sub

Public Sub Btn_OpenReviewLeer()
    OpenReviewFormEmpty
End Sub

' ========= 1) Excel importieren und Review-Datensätze erzeugen =========
Public Sub StartImportReview(Optional ByVal filePath As String = "")
    On Error GoTo ErrH

    gStage = "Datei bestimmen"
    If Len(filePath) = 0 Then filePath = C_DEFAULT_PATH
    If Dir(filePath) = "" Then
        With Application.FileDialog(msoFileDialogFilePicker)
            .Title = "Excel-Datei auswählen"
            .AllowMultiSelect = False
            .Filters.Clear
            .Filters.Add "Excel", "*.xlsx;*.xlsm;*.xls"
            If .Show <> -1 Then Exit Sub
            filePath = .SelectedItems(0)
        End With
    End If

    Randomize
    gCurrentRunId = Format$(Now(), "yyyymmddhhnnss") & "_" & CStr(Int((Rnd() * 9000) + 1000))

    gStage = "Offenes Review-Form schließen"
    CloseReviewFormIfOpen

    gStage = "Temp-Tabellen vorbereiten"
    RecreateRawTable
    EnsureReviewTable
    TryClearReviewQueue

    gStage = "Excel importieren"
    ImportExcelToRaw filePath

    gStage = "Review-Queue befüllen"
    Dim rowsQueued As Long
    rowsQueued = BuildReviewQueue(gCurrentRunId)

    gStage = "Review-Form aktualisieren"
    RefreshReviewFormAfterImport rowsQueued

    Exit Sub
ErrH:
    MsgBox "Fehler in Schritt: " & gStage & vbCrLf & _
           "Fehler " & Err.Number & ": " & Err.Description, vbCritical
End Sub



Public Sub OpenReviewFormEmpty()
    On Error GoTo ErrH
    DoCmd.OpenForm C_REVIEW_FORM, , , "1=0"
    Exit Sub
ErrH:
    MsgBox "Fehler beim Öffnen des leeren Review-Formulars:" & vbCrLf & _
           "Fehler " & Err.Number & ": " & Err.Description, vbExclamation
End Sub


Private Sub CloseReviewFormIfOpen()
    If IsFormLoaded(C_REVIEW_FORM) Then
        DoCmd.Close acForm, C_REVIEW_FORM, acSaveNo
        DoEvents
    End If
End Sub

Private Sub ImportExcelToRaw(ByVal filePath As String)
    Dim sheetRefs(1 To 5) As String
    Dim baseSheet As String
    Dim i As Long
    Dim ok As Boolean
    Dim errNo As Long
    Dim errTxt As String

    baseSheet = Replace(C_SHEET, "$", "")

    sheetRefs(1) = C_SHEET
    sheetRefs(2) = baseSheet
    sheetRefs(3) = "[" & baseSheet & "$]"
    sheetRefs(4) = baseSheet & "$A:ZZ"
    sheetRefs(5) = "[" & baseSheet & "$A:ZZ]"

    For i = LBound(sheetRefs) To UBound(sheetRefs)
        On Error Resume Next
        DoCmd.TransferSpreadsheet acImport, acSpreadsheetTypeExcel12Xml, _
                                  C_RAW_TABLE, filePath, True, sheetRefs(i)
        errNo = Err.Number
        errTxt = Err.Description
        On Error GoTo 0

        If errNo = 0 Then
            ok = True
            Exit For
        End If

        If errNo <> 3125 Then
            Err.Raise errNo, "ImportExcelToRaw", errTxt
        End If

        If TableExists(C_RAW_TABLE) Then
            On Error Resume Next
            DoCmd.DeleteObject acTable, C_RAW_TABLE
            On Error GoTo 0
        End If
    Next i

    If Not ok Then
        Err.Raise 3125, "ImportExcelToRaw", _
                  "Excel-Blatt nicht gefunden. Erwartet wurde Blattname '" & baseSheet & _
                  "' (z. B. Daten)."
    End If
End Sub


Private Sub TryClearReviewQueue()
    On Error GoTo EH
    CurrentDb.Execute "DELETE FROM [" & C_REVIEW_TABLE & "]", dbFailOnError
    Exit Sub
EH:
    If Err.Number = 3211 Then
        Err.Clear
        Exit Sub
    End If
    Err.Raise Err.Number, "TryClearReviewQueue", Err.Description
End Sub

Private Sub RefreshReviewFormAfterImport(ByVal rowsQueued As Long)
    Dim frm As Form

    If rowsQueued = 0 Then
        OpenReviewFormEmpty
        Exit Sub
    End If

    If IsFormLoaded(C_REVIEW_FORM) Then
        Set frm = Forms(C_REVIEW_FORM)
        If HasField(CurrentDb.TableDefs(C_REVIEW_TABLE), "ImportRunID") Then
            frm.Filter = "[ImportRunID]='" & SqlEsc(gCurrentRunId) & "'"
            frm.FilterOn = True
        Else
            frm.FilterOn = False
        End If
        frm.Requery
        If MoveFormToNextOpenReview(frm) Then PromptDecisionPopupForCurrent frm
    Else
        DoCmd.OpenForm C_REVIEW_FORM
        Set frm = Forms(C_REVIEW_FORM)
        If HasField(CurrentDb.TableDefs(C_REVIEW_TABLE), "ImportRunID") Then
            frm.Filter = "[ImportRunID]='" & SqlEsc(gCurrentRunId) & "'"
            frm.FilterOn = True
        Else
            frm.FilterOn = False
        End If
        frm.Requery
        If MoveFormToNextOpenReview(frm) Then PromptDecisionPopupForCurrent frm
    End If
End Sub

Private Function IsFormLoaded(ByVal formName As String) As Boolean
    IsFormLoaded = (SysCmd(acSysCmdGetObjectState, acForm, formName) And acObjStateOpen) <> 0
End Function

' ========= 2) Datensatz aus Review in Schueler überführen =========
Public Sub Btn_SaveCurrentAndNext()
    On Error GoTo ErrH

    Dim frm As Form
    Set frm = Forms(C_REVIEW_FORM)

    If IsNull(frm!SNachname) Or IsNull(frm!SVorname) Then
        MsgBox "Nachname und Vorname sind Pflichtfelder.", vbExclamation
        Exit Sub
    End If

    gStage = "Aktion ausführen"
    If Not ProcessReviewDecision(frm) Then Exit Sub

    gStage = "Aktuellen Review-Datensatz markieren"
    CurrentDb.Execute _
        "UPDATE [" & C_REVIEW_TABLE & "] " & _
        "SET IsProcessed = True, ProcessedAt = Now() " & _
        "WHERE ReviewID = " & CLng(frm!ReviewID), dbFailOnError

    gStage = "Nächsten Datensatz laden"
    frm.Requery
    If MoveFormToNextOpenReview(frm) Then PromptDecisionPopupForCurrent frm

    Exit Sub
ErrH:
    MsgBox "Fehler in Schritt: " & gStage & vbCrLf & _
           "Fehler " & Err.Number & ": " & Err.Description, vbCritical
End Sub


' ========= Farb-Logik für unsichere Felder =========
Public Function IsFieldUncertain(ByVal uncertainList As Variant, ByVal fieldName As String) As Boolean
    If IsNull(uncertainList) Then Exit Function

    Dim s As String
    s = LCase$(Trim$(CStr(uncertainList)))
    If Len(s) = 0 Then Exit Function

    IsFieldUncertain = (InStr(1, "," & Replace(s, " ", "") & ",", _
                               "," & LCase$(Replace(fieldName, " ", "")) & ",", vbTextCompare) > 0)
End Function


' ========= Schul-ID-Vermutung =========
Public Function GuessSchoolID(ByVal schoolName As Variant, _
                              ByVal schoolCode As Variant, _
                              ByVal schoolIdRaw As Variant) As Variant
    On Error GoTo EH

    Dim db As DAO.Database
    Dim rs As DAO.Recordset
    Dim sql As String
    Dim tSchool As DAO.TableDef
    Dim schoolCodeField As String
    Dim schoolNameField1 As String
    Dim schoolNameField2 As String

    Dim vName As String: vName = LCase$(Trim$(Nz(schoolName, "")))
    Dim vCode As String: vCode = LCase$(Trim$(Nz(schoolCode, "")))
    Dim vId As String: vId = Trim$(Nz(schoolIdRaw, ""))

    Set db = CurrentDb
    Set tSchool = db.TableDefs(C_SCHOOL_TABLE)

    schoolCodeField = FirstExistingField(tSchool, "SchuleCode", "Code")
    schoolNameField1 = FirstExistingField(tSchool, "Name der Schule", "Name")
    schoolNameField2 = FirstExistingField(tSchool, "NamederSchule")

    ' 1) Wenn bereits numerische ID geliefert wurde, direkt versuchen
    If Len(vId) > 0 And IsNumeric(vId) Then
        sql = "SELECT TOP 1 SchuleID FROM [" & C_SCHOOL_TABLE & "] WHERE SchuleID = " & CLng(vId)
        Set rs = db.OpenRecordset(sql)
        If Not rs.EOF Then
            GuessSchoolID = rs!SchuleID
            rs.Close
            Exit Function
        End If
        rs.Close
    End If

    ' 2) Exakter Code-Match (SchuleCode oder Code)
    If Len(vCode) > 0 And Len(schoolCodeField) > 0 Then
        sql = "SELECT TOP 1 SchuleID FROM [" & C_SCHOOL_TABLE & "] " & _
              "WHERE LCase(Trim(Nz([" & schoolCodeField & "],''))) = '" & SqlEsc(vCode) & "'"
        Set rs = db.OpenRecordset(sql)
        If Not rs.EOF Then
            GuessSchoolID = rs!SchuleID
            rs.Close
            Exit Function
        End If
        rs.Close
    End If

    ' 3) Exakter Namens-Match (Name der Schule / Name / NamederSchule)
    If Len(vName) > 0 Then
        If Len(schoolNameField1) > 0 Then
            sql = "SELECT TOP 1 SchuleID FROM [" & C_SCHOOL_TABLE & "] " & _
                  "WHERE LCase(Trim(Nz([" & schoolNameField1 & "],''))) = '" & SqlEsc(vName) & "'"
            Set rs = db.OpenRecordset(sql)
            If Not rs.EOF Then
                GuessSchoolID = rs!SchuleID
                rs.Close
                Exit Function
            End If
            rs.Close
        End If

        If Len(schoolNameField2) > 0 Then
            sql = "SELECT TOP 1 SchuleID FROM [" & C_SCHOOL_TABLE & "] " & _
                  "WHERE LCase(Trim(Nz([" & schoolNameField2 & "],''))) = '" & SqlEsc(vName) & "'"
            Set rs = db.OpenRecordset(sql)
            If Not rs.EOF Then
                GuessSchoolID = rs!SchuleID
                rs.Close
                Exit Function
            End If
            rs.Close
        End If
    End If

    ' 4) Fuzzy: enthält / beginnt mit
    GuessSchoolID = GuessSchoolIDFuzzy(vName, vCode)
    Exit Function
EH:
    GuessSchoolID = Null
End Function



Private Function FirstExistingField(ByVal t As DAO.TableDef, ParamArray candidates() As Variant) As String
    Dim i As Long
    For i = LBound(candidates) To UBound(candidates)
        If HasField(t, CStr(candidates(i))) Then
            FirstExistingField = CStr(candidates(i))
            Exit Function
        End If
    Next
    FirstExistingField = ""
End Function

' ========= Interne Helfer =========
Private Sub RecreateRawTable()
    If TableExists(C_RAW_TABLE) Then
        DoCmd.DeleteObject acTable, C_RAW_TABLE
    End If
End Sub

Private Sub EnsureReviewTable()
    Dim db As DAO.Database
    Dim tdf As DAO.TableDef
    Dim fld As DAO.Field
    Dim idx As DAO.Index

    Set db = CurrentDb

    If Not TableExists(C_REVIEW_TABLE) Then
        Set tdf = db.CreateTableDef(C_REVIEW_TABLE)

        Set fld = tdf.CreateField("ReviewID", dbLong)
        fld.Attributes = dbAutoIncrField
        tdf.Fields.Append fld

        tdf.Fields.Append tdf.CreateField("SNachname", dbText, 255)
        tdf.Fields.Append tdf.CreateField("SVorname", dbText, 255)
        tdf.Fields.Append tdf.CreateField("SGeburtstag", dbDate)
        tdf.Fields.Append tdf.CreateField("Klassenstufe", dbText, 50)
        tdf.Fields.Append tdf.CreateField("Schulname", dbText, 255)
        tdf.Fields.Append tdf.CreateField("Schulcode", dbText, 100)
        tdf.Fields.Append tdf.CreateField("SSchuleIDRaw", dbText, 100)
        tdf.Fields.Append tdf.CreateField("SuggestedSchuleID", dbLong)
        tdf.Fields.Append tdf.CreateField("SUnsichereFelder", dbMemo)
        tdf.Fields.Append tdf.CreateField("STelefon1", dbText, 50)
        tdf.Fields.Append tdf.CreateField("STelefon2", dbText, 50)
        tdf.Fields.Append tdf.CreateField("SMobiltelefon", dbText, 50)
        tdf.Fields.Append tdf.CreateField("SEMail1", dbText, 255)
        tdf.Fields.Append tdf.CreateField("SFach1", dbText, 100)
        tdf.Fields.Append tdf.CreateField("SFach2", dbText, 100)
        tdf.Fields.Append tdf.CreateField("SFach3", dbText, 100)
        tdf.Fields.Append tdf.CreateField("Foerderwuensche", dbMemo)
        tdf.Fields.Append tdf.CreateField("Schuelerstatus", dbText, 100)
        tdf.Fields.Append tdf.CreateField("SAnmeldendeVorname", dbText, 255)
        tdf.Fields.Append tdf.CreateField("SAnmeldendeNachname", dbText, 255)
        tdf.Fields.Append tdf.CreateField("SMovon", dbDate)
        tdf.Fields.Append tdf.CreateField("SDivon", dbDate)
        tdf.Fields.Append tdf.CreateField("SMivon", dbDate)
        tdf.Fields.Append tdf.CreateField("SDovon", dbDate)
        tdf.Fields.Append tdf.CreateField("SFrvon", dbDate)
        tdf.Fields.Append tdf.CreateField("IsProcessed", dbBoolean)
        tdf.Fields.Append tdf.CreateField("ProcessedAt", dbDate)
        tdf.Fields.Append tdf.CreateField("ImportRunID", dbText, 40)

        db.TableDefs.Append tdf

        Set idx = tdf.CreateIndex("PK_Review")
        idx.Primary = True
        idx.Unique = True
        idx.Fields.Append idx.CreateField("ReviewID")
        tdf.Indexes.Append idx

        tdf.Fields("IsProcessed").DefaultValue = "False"
    End If

    EnsureReviewTableFields
End Sub


Private Sub EnsureReviewTableFields()
    On Error GoTo EH

    AddFieldIfMissingSQL C_REVIEW_TABLE, "Berlinpassdatum", "DATETIME"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "AblaufdatumZB", "DATETIME"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "MatchType", "TEXT(30)"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "MatchCount", "INTEGER"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "MatchedSchuelerID", "LONG"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "MergeAction", "TEXT(20)"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "MatchCandidates", "LONGTEXT"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "MatchDebugInfo", "LONGTEXT"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "ImportRunID", "TEXT(40)"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "Schuelerstatus", "TEXT(100)"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "SAnmeldendeVorname", "TEXT(255)"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "SAnmeldendeNachname", "TEXT(255)"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "SMovon", "DATETIME"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "SDivon", "DATETIME"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "SMivon", "DATETIME"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "SDovon", "DATETIME"
    AddFieldIfMissingSQL C_REVIEW_TABLE, "SFrvon", "DATETIME"
    Exit Sub
EH:
    ' In manchen Access-Umgebungen ist während des Imports kein exklusiver Schema-Lock möglich.
    ' Dann Schema-Migration nicht als Fehler abbrechen lassen.
    If Err.Number = 3211 Then Exit Sub
    Err.Raise Err.Number, "EnsureReviewTableFields", Err.Description
End Sub

Private Sub AddFieldIfMissingSQL(ByVal tableName As String, ByVal fieldName As String, ByVal fieldTypeSql As String)
    On Error GoTo EH

    If HasField(CurrentDb.TableDefs(tableName), fieldName) Then Exit Sub

    CurrentDb.Execute "ALTER TABLE [" & tableName & "] ADD COLUMN [" & fieldName & "] " & fieldTypeSql
    Exit Sub
EH:
    If Err.Number = 3211 Then Exit Sub
    Err.Raise Err.Number, "AddFieldIfMissingSQL", Err.Description
End Sub

Private Function BuildReviewQueue(ByVal runId As String) As Long
    Dim db As DAO.Database
    Dim rsSrc As DAO.Recordset
    Dim rsDst As DAO.Recordset

    Dim vNachname As Variant
    Dim vVorname As Variant
    Dim vSchulname As Variant
    Dim vSchulcode As Variant
    Dim vSchuleID As Variant

    Set db = CurrentDb
    Set rsSrc = db.OpenRecordset("SELECT * FROM [" & C_RAW_TABLE & "]", dbOpenSnapshot)
    Set rsDst = db.OpenRecordset(C_REVIEW_TABLE, dbOpenDynaset)

    Dim inserted As Long

    Do While Not rsSrc.EOF
        vNachname = SrcFieldValue(rsSrc, "SNachname", "Nachname")
        vVorname = SrcFieldValue(rsSrc, "SVorname", "Vorname")

        If Len(Trim$(Nz(vNachname, ""))) > 0 _
           And Len(Trim$(Nz(vVorname, ""))) > 0 Then

            vSchulname = SrcFieldValue(rsSrc, "Schulname", "NamederSchule", "Name der Schule")
            vSchulcode = SrcFieldValue(rsSrc, "Schulcode", "SchuleCode")
            vSchuleID = SrcFieldValue(rsSrc, "SSchuleID", "SchuleID")

            Dim vGeb As Variant
            Dim vBerlinpass As Variant
            Dim vAblauf As Variant
            Dim matchType As String
            Dim matchCount As Integer
            Dim matchedId As Variant
            Dim matchCandidates As String
            Dim mergeAction As String
            Dim matchDebug As String

            vGeb = ConvertDate(SrcFieldValue(rsSrc, "SGeburtstag", "Geburtstag"))
            vBerlinpass = ConvertDate(SrcFieldValue(rsSrc, "Berlinpassdatum", "Berlinpass"))
            vAblauf = ConvertDate(SrcFieldValue(rsSrc, "Ablaufdatum ZB", "ZusatzbogenDatum", "AblaufdatumZB"))

            rsDst.AddNew
            rsDst!SNachname = CleanText(vNachname)
            rsDst!SVorname = CleanText(vVorname)
            rsDst!SGeburtstag = vGeb
            rsDst!Klassenstufe = CleanText(SrcFieldValue(rsSrc, "Klassenstufe"))
            rsDst!Schulname = CleanText(vSchulname)
            rsDst!Schulcode = CleanText(vSchulcode)
            rsDst!SSchuleIDRaw = CleanText(vSchuleID)
            rsDst!SUnsichereFelder = CleanText(SrcFieldValue(rsSrc, "UnsichereFelder", "Unsichere Felder"))
            rsDst!STelefon1 = CleanText(SrcFieldValue(rsSrc, "STelefon 1", "STelefon1"))
            rsDst!STelefon2 = CleanText(SrcFieldValue(rsSrc, "STelefon 2", "STelefon2"))
            rsDst!SMobiltelefon = CleanText(SrcFieldValue(rsSrc, "SMobiltelefon"))
            rsDst!SEMail1 = CleanText(SrcFieldValue(rsSrc, "SE-Mail1", "SEMail1", "SEMail"))
            rsDst!SFach1 = CleanText(SrcFieldValue(rsSrc, "SFach1"))
            rsDst!SFach2 = CleanText(SrcFieldValue(rsSrc, "SFach2"))
            rsDst!SFach3 = CleanText(SrcFieldValue(rsSrc, "SFach3"))
            rsDst!Foerderwuensche = CleanText(SrcFieldValue(rsSrc, "Förderwünsche", "Foerderwuensche"))
            If HasField(rsDst, "Schuelerstatus") Then rsDst!Schuelerstatus = CleanText(SrcFieldValue(rsSrc, "Schülerstatus", "Schuelerstatus"))
            If HasField(rsDst, "SAnmeldendeVorname") Then
                rsDst!SAnmeldendeVorname = CleanText(SrcFieldValue(rsSrc, "SAnmeldendeVorname", "SAnmeldender-Vorname", "SAnmeldender Vorname", "AnmeldenderVorname"))
            End If
            If HasField(rsDst, "SAnmeldendeNachname") Then
                rsDst!SAnmeldendeNachname = CleanText(SrcFieldValue(rsSrc, "SAnmeldendeNachname", "SAnmeldender-Nachname", "SAnmeldender Nachname", "AnmeldenderNachname"))
            End If
            If HasField(rsDst, "SMovon") Then rsDst!SMovon = ConvertDate(SrcFieldValue(rsSrc, "SMovon", "SMo von", "SMoVon"))
            If HasField(rsDst, "SDivon") Then rsDst!SDivon = ConvertDate(SrcFieldValue(rsSrc, "SDivon", "SDi von", "SDiVon"))
            If HasField(rsDst, "SMivon") Then rsDst!SMivon = ConvertDate(SrcFieldValue(rsSrc, "SMivon", "SMi von", "SMiVon"))
            If HasField(rsDst, "SDovon") Then rsDst!SDovon = ConvertDate(SrcFieldValue(rsSrc, "SDovon", "SDo von", "SDoVon"))
            If HasField(rsDst, "SFrvon") Then rsDst!SFrvon = ConvertDate(SrcFieldValue(rsSrc, "SFrvon", "SFr von", "SFrVon"))
            If HasField(rsDst, "Berlinpassdatum") Then rsDst!Berlinpassdatum = vBerlinpass
            If HasField(rsDst, "AblaufdatumZB") Then rsDst!AblaufdatumZB = vAblauf

            rsDst!SuggestedSchuleID = GuessSchoolID(vSchulname, vSchulcode, vSchuleID)

            EvaluateMatch rsDst!SVorname, rsDst!SNachname, rsDst!SGeburtstag, rsDst!SuggestedSchuleID, _
                          matchType, matchCount, matchedId, matchCandidates, matchDebug
            If HasField(rsDst, "MatchType") Then rsDst!MatchType = matchType
            If HasField(rsDst, "MatchCount") Then rsDst!MatchCount = matchCount
            If HasField(rsDst, "MatchedSchuelerID") Then
                If Not IsNull(matchedId) Then rsDst!MatchedSchuelerID = CLng(matchedId)
            End If

            If matchType = "hard" Then
                mergeAction = "MERGE"
            ElseIf matchType = "soft" Then
                mergeAction = "ASK"
            Else
                mergeAction = "NEW"
            End If
            If HasField(rsDst, "MergeAction") Then rsDst!MergeAction = mergeAction
            If HasField(rsDst, "MatchCandidates") Then rsDst!MatchCandidates = matchCandidates
            If HasField(rsDst, "MatchDebugInfo") Then rsDst!MatchDebugInfo = matchDebug

            rsDst!IsProcessed = False
            If HasField(rsDst, "ImportRunID") Then rsDst!ImportRunID = runId
            rsDst.Update
            inserted = inserted + 1
        End If

        rsSrc.MoveNext
    Loop

    rsSrc.Close
    rsDst.Close
    BuildReviewQueue = inserted
End Function


Private Function ProcessReviewDecision(ByVal frm As Form) As Boolean
    Dim action As String
    Dim matchTypeVal As String

    action = UCase$(Trim$(Nz(GetFormFieldValue(frm, "MergeAction"), "")))
    matchTypeVal = LCase$(Trim$(Nz(GetFormFieldValue(frm, "MatchType"), "")))

    If action = "" Then
        If matchTypeVal = "hard" Then
            action = "MERGE"
        ElseIf matchTypeVal = "soft" Then
            action = "ASK"
        Else
            action = "NEW"
        End If
    End If

    If action = "ASK" Then
        action = AskUserActionForSoftMatch(frm)
        If action = "" Then Exit Function
        SetFormFieldValue frm, "MergeAction", action
    End If

    Select Case action
        Case "NEW"
            InsertCurrentReviewRecord frm
        Case "SKIP"
            ' nichts schreiben
        Case "MERGE"
            MergeIntoExistingRecord frm
        Case Else
            MsgBox "Unbekannte MergeAction: " & action, vbExclamation
            Exit Function
    End Select
    ProcessReviewDecision = True
End Function

Private Function AskUserActionForSoftMatch(ByVal frm As Form) As String
    Dim txt As String
    Dim r As VbMsgBoxResult

    txt = "Möglicher Dubletten-Treffer gefunden (" & Nz(GetFormFieldValue(frm, "MatchCandidates"), "") & ")." & vbCrLf & _
          "Ja = Merge" & vbCrLf & _
          "Nein = Neu anlegen" & vbCrLf & _
          "Abbrechen = Überspringen"

    r = MsgBox(txt, vbYesNoCancel + vbQuestion, "Soft Match")

    Select Case r
        Case vbYes
            AskUserActionForSoftMatch = "MERGE"
        Case vbNo
            AskUserActionForSoftMatch = "NEW"
        Case vbCancel
            If ConfirmSkipOrAbort("Soft Match") Then
                AskUserActionForSoftMatch = "SKIP"
            Else
                AskUserActionForSoftMatch = ""
            End If
    End Select
End Function

Private Function ConfirmSkipOrAbort(ByVal titleText As String) As Boolean
    Dim r As VbMsgBoxResult

    r = MsgBox("Soll der Datensatz wirklich übersprungen werden?" & vbCrLf & _
               "Ja = Überspringen" & vbCrLf & _
               "Nein = Abbrechen (auf Datensatz bleiben)", _
               vbYesNo + vbQuestion, titleText)
    ConfirmSkipOrAbort = (r = vbYes)
End Function

Private Sub MergeIntoExistingRecord(ByVal frm As Form)
    Dim targetId As Variant
    targetId = Nz(GetFormFieldValue(frm, "MatchedSchuelerID"), Null)

    If IsNull(targetId) Then
        targetId = FirstIdFromCandidateList(Nz(GetFormFieldValue(frm, "MatchCandidates"), ""))
    End If

    If IsNull(targetId) Then
        MsgBox "Kein eindeutiger Zieldatensatz zum Mergen gefunden. Bitte 'Neu anlegen' oder 'Überspringen' wählen.", vbExclamation
        Exit Sub
    End If

    UpdateExistingSchuelerRecord CLng(targetId), frm
End Sub

Private Function FirstIdFromCandidateList(ByVal s As String) As Variant
    Dim p As Long
    Dim one As String
    s = Trim$(s)
    If Len(s) = 0 Then
        FirstIdFromCandidateList = Null
        Exit Function
    End If

    p = InStr(1, s, ",")
    If p > 0 Then
        one = Left$(s, p - 1)
    Else
        one = s
    End If

    one = Trim$(one)
    If IsNumeric(one) Then
        FirstIdFromCandidateList = CLng(one)
    Else
        FirstIdFromCandidateList = Null
    End If
End Function

Private Sub UpdateExistingSchuelerRecord(ByVal schuelerId As Long, ByVal frm As Form)
    Dim db As DAO.Database
    Dim rs As DAO.Recordset
    Dim pkName As String

    Set db = CurrentDb
    pkName = GetPrimaryKeyFieldName(db.TableDefs(C_TARGET_TABLE))
    If Len(pkName) = 0 Then pkName = FirstExistingField(db.TableDefs(C_TARGET_TABLE), "SchuelerID", "ID", "SchülerID")
    If Len(pkName) = 0 Then
        MsgBox "Primärschlüssel in Tabelle " & C_TARGET_TABLE & " nicht gefunden.", vbExclamation
        Exit Sub
    End If

    Set rs = db.OpenRecordset("SELECT * FROM [" & C_TARGET_TABLE & "] WHERE [" & pkName & "]=" & schuelerId, dbOpenDynaset)
    If rs.EOF Then
        rs.Close
        MsgBox "Zieldatensatz nicht gefunden (ID=" & schuelerId & ").", vbExclamation
        Exit Sub
    End If

    rs.Edit
    UpdateFieldText rs, "SNachname", frm!SNachname
    UpdateFieldText rs, "SVorname", frm!SVorname
    UpdateFieldDate rs, "SGeburtstag", frm!SGeburtstag
    UpdateFieldText rs, "Klassenstufe", frm!Klassenstufe
    UpdateFieldNumber rs, "SSchuleID", frm!SuggestedSchuleID
    UpdateFieldText rs, "STelefon 1", frm!STelefon1
    UpdateFieldText rs, "STelefon 2", frm!STelefon2
    UpdateFieldText rs, "SMobiltelefon", frm!SMobiltelefon
    UpdateFieldText rs, "SE-Mail1", frm!SEMail1
    UpdateFieldText rs, "SFach1", frm!SFach1
    UpdateFieldText rs, "SFach2", frm!SFach2
    UpdateFieldText rs, "SFach3", frm!SFach3
    UpdateFieldText rs, "Förderwünsche", frm!Foerderwuensche
    UpdateFieldText rs, "Schülerstatus", GetFormFieldValue(frm, "Schuelerstatus")
    UpdateFieldText rs, "SAnmeldendeVorname", GetFormFieldValue(frm, "SAnmeldendeVorname")
    UpdateFieldText rs, "SAnmeldendeNachname", GetFormFieldValue(frm, "SAnmeldendeNachname")
    UpdateFieldDate rs, "SMovon", GetFormFieldValue(frm, "SMovon")
    UpdateFieldDate rs, "SDivon", GetFormFieldValue(frm, "SDivon")
    UpdateFieldDate rs, "SMivon", GetFormFieldValue(frm, "SMivon")
    UpdateFieldDate rs, "SDovon", GetFormFieldValue(frm, "SDovon")
    UpdateFieldDate rs, "SFrvon", GetFormFieldValue(frm, "SFrvon")

    UpdateFieldDateIfLater rs, "Berlinpassdatum", GetFormFieldValue(frm, "Berlinpassdatum")
    UpdateFieldDateIfLater rs, "Ablaufdatum ZB", GetFormFieldValue(frm, "AblaufdatumZB")

    rs.Update
    rs.Close
End Sub

Private Sub InsertCurrentReviewRecord(ByVal frm As Form)
    Dim db As DAO.Database
    Dim sql As String

    Set db = CurrentDb

    sql = "INSERT INTO [" & C_TARGET_TABLE & "] ("
    sql = sql & "SNachname, SVorname, SGeburtstag, Klassenstufe, SSchuleID, "
    sql = sql & "[STelefon 1], [STelefon 2], SMobiltelefon, [SE-Mail1], "
    sql = sql & "SFach1, SFach2, SFach3, [Förderwünsche], [Schülerstatus], "
    sql = sql & "SAnmeldendeVorname, SAnmeldendeNachname, "
    sql = sql & "SMovon, SDivon, SMivon, SDovon, SFrvon) VALUES ("

    sql = sql & SqlText(frm!SNachname) & ","
    sql = sql & SqlText(frm!SVorname) & ","
    sql = sql & SqlDate(frm!SGeburtstag) & ","
    sql = sql & SqlText(frm!Klassenstufe) & ","
    sql = sql & SqlNumber(frm!SuggestedSchuleID) & ","
    sql = sql & SqlText(frm!STelefon1) & ","
    sql = sql & SqlText(frm!STelefon2) & ","
    sql = sql & SqlText(frm!SMobiltelefon) & ","
    sql = sql & SqlText(frm!SEMail1) & ","
    sql = sql & SqlText(frm!SFach1) & ","
    sql = sql & SqlText(frm!SFach2) & ","
    sql = sql & SqlText(frm!SFach3) & ","
    sql = sql & SqlText(frm!Foerderwuensche) & ","
    sql = sql & SqlText(GetFormFieldValue(frm, "Schuelerstatus")) & ","
    sql = sql & SqlText(GetFormFieldValue(frm, "SAnmeldendeVorname")) & ","
    sql = sql & SqlText(GetFormFieldValue(frm, "SAnmeldendeNachname")) & ","
    sql = sql & SqlDate(GetFormFieldValue(frm, "SMovon")) & ","
    sql = sql & SqlDate(GetFormFieldValue(frm, "SDivon")) & ","
    sql = sql & SqlDate(GetFormFieldValue(frm, "SMivon")) & ","
    sql = sql & SqlDate(GetFormFieldValue(frm, "SDovon")) & ","
    sql = sql & SqlDate(GetFormFieldValue(frm, "SFrvon")) & ")"

    db.Execute sql, dbFailOnError
End Sub

Private Function MoveFormToNextOpenReview(ByVal frm As Form) As Boolean
    Dim rs As DAO.Recordset
    Set rs = frm.RecordsetClone

    rs.FindFirst "IsProcessed = False"
    If rs.NoMatch Then
        MsgBox "Alle Datensätze verarbeitet.", vbInformation
        MoveFormToNextOpenReview = False
    Else
        frm.Bookmark = rs.Bookmark
        MoveFormToNextOpenReview = True
    End If

    rs.Close
End Function

Private Sub PromptDecisionPopupForCurrent(ByVal frm As Form)
    On Error GoTo EH

    Dim matchType As String
    Dim action As String
    Dim cand As String
    Dim targetId As Variant
    Dim info As String
    Dim promptTxt As String

    matchType = LCase$(Trim$(Nz(GetFormFieldValue(frm, "MatchType"), "")))
    action = UCase$(Trim$(Nz(GetFormFieldValue(frm, "MergeAction"), "")))

    If matchType = "hard" Or matchType = "soft" Then
        cand = CStr(Nz(GetFormFieldValue(frm, "MatchCandidates"), ""))
        targetId = Nz(GetFormFieldValue(frm, "MatchedSchuelerID"), Null)
        If IsNull(targetId) Then targetId = FirstIdFromCandidateList(cand)

        info = GetMatchedStudentSummary(targetId)
        If Len(info) = 0 Then info = "(Bestehender Datensatz konnte nicht gelesen werden)"

        promptTxt = "Achtung: Schüler:in möglicherweise schon vorhanden (" & UCase$(matchType) & ")." & vbCrLf & vbCrLf & _
                    "Gefundener Datensatz:" & vbCrLf & info & vbCrLf & vbCrLf & _
                    "Ja = Merge" & vbCrLf & _
                    "Nein = Neu anlegen" & vbCrLf & _
                    "Abbrechen = Überspringen"

        Select Case MsgBox(promptTxt, vbYesNoCancel + vbExclamation, "Dubletten-Prüfung")
            Case vbYes
                action = "MERGE"
            Case vbNo
                action = "NEW"
            Case vbCancel
                If ConfirmSkipOrAbort("Dubletten-Prüfung") Then
                    action = "SKIP"
                Else
                    Exit Sub
                End If
        End Select
    Else
        MsgBox "Keine passende vorhandene Schüler:in gefunden." & vbCrLf & _
               "Neue:r Schüler:in wird angelegt.", vbInformation, "Dubletten-Prüfung"
        action = "NEW"
    End If

    SetFormFieldValue frm, "MergeAction", action
    Exit Sub
EH:
    ' Popup darf Import/Navigation nicht abbrechen
End Sub

Private Function GetMatchedStudentSummary(ByVal targetId As Variant) As String
    On Error GoTo EH

    Dim db As DAO.Database
    Dim rs As DAO.Recordset
    Dim sql As String
    Dim pkName As String

    If IsNull(targetId) Then Exit Function

    Set db = CurrentDb
    pkName = GetPrimaryKeyFieldName(db.TableDefs(C_TARGET_TABLE))
    If Len(pkName) = 0 Then pkName = FirstExistingField(db.TableDefs(C_TARGET_TABLE), "SchuelerID", "ID", "SchülerID")
    If Len(pkName) = 0 Then Exit Function

    sql = "SELECT * FROM [" & C_TARGET_TABLE & "] WHERE [" & pkName & "]=" & CLng(targetId)
    Set rs = db.OpenRecordset(sql, dbOpenSnapshot)
    If rs.EOF Then
        rs.Close
        Exit Function
    End If

    GetMatchedStudentSummary = Nz(SafeRsValue(rs, "SVorname"), "") & " " & Nz(SafeRsValue(rs, "SNachname"), "") & _
                              " | Geburtstag: " & Nz(SafeRsValue(rs, "SGeburtstag"), "") & _
                              " | SchuleID: " & Nz(SafeRsValue(rs, "SSchuleID"), "")
    rs.Close
    Exit Function
EH:
    GetMatchedStudentSummary = ""
End Function

Private Function GuessSchoolIDFuzzy(ByVal vName As String, ByVal vCode As String) As Variant
    On Error GoTo EH

    Dim db As DAO.Database
    Dim rs As DAO.Recordset
    Dim score As Long, bestScore As Long
    Dim bestId As Variant
    Dim candName As String, candCode As String
    Dim tSchool As DAO.TableDef
    Dim schoolCodeField As String
    Dim schoolNameField1 As String
    Dim schoolNameField2 As String

    Set db = CurrentDb
    Set tSchool = db.TableDefs(C_SCHOOL_TABLE)

    schoolCodeField = FirstExistingField(tSchool, "SchuleCode", "Code")
    schoolNameField1 = FirstExistingField(tSchool, "Name der Schule", "Name")
    schoolNameField2 = FirstExistingField(tSchool, "NamederSchule")

    Set rs = db.OpenRecordset("SELECT * FROM [" & C_SCHOOL_TABLE & "]", dbOpenSnapshot)

    bestScore = 0
    bestId = Null

    Do While Not rs.EOF
        score = 0

        candName = ""
        If Len(schoolNameField1) > 0 Then
            candName = LCase$(Trim$(Nz(rs.Fields(schoolNameField1).Value, "")))
        ElseIf Len(schoolNameField2) > 0 Then
            candName = LCase$(Trim$(Nz(rs.Fields(schoolNameField2).Value, "")))
        End If

        candCode = ""
        If Len(schoolCodeField) > 0 Then
            candCode = LCase$(Trim$(Nz(rs.Fields(schoolCodeField).Value, "")))
        End If

        If Len(vCode) > 0 And Len(candCode) > 0 Then
            If InStr(1, candCode, vCode, vbTextCompare) > 0 Or InStr(1, vCode, candCode, vbTextCompare) > 0 Then score = score + 80
        End If

        If Len(vName) > 0 And Len(candName) > 0 Then
            If candName = vName Then score = score + 100
            If Left$(candName, 5) = Left$(vName, 5) Then score = score + 20
            If InStr(1, candName, vName, vbTextCompare) > 0 Or InStr(1, vName, candName, vbTextCompare) > 0 Then score = score + 40
        End If

        If score > bestScore Then
            bestScore = score
            bestId = rs.Fields("SchuleID").Value
        End If

        rs.MoveNext
    Loop

    rs.Close

    If bestScore >= 40 Then
        GuessSchoolIDFuzzy = bestId
    Else
        GuessSchoolIDFuzzy = Null
    End If
    Exit Function
EH:
    GuessSchoolIDFuzzy = Null
End Function

Public Function CleanText(ByVal v As Variant) As Variant
    If IsNull(v) Then
        CleanText = Null
    ElseIf Len(Trim$(CStr(v))) = 0 Then
        CleanText = Null
    Else
        CleanText = Trim$(CStr(v))
    End If
End Function

Public Function ConvertDate(ByVal v As Variant) As Variant
    If IsNull(v) Then
        ConvertDate = Null
    ElseIf IsDate(v) Then
        ConvertDate = CDate(v)
    ElseIf IsNumeric(v) Then
        ConvertDate = DateSerial(1899, 12, 30) + CLng(v)
    Else
        ConvertDate = Null
    End If
End Function

Private Function SqlEsc(ByVal s As String) As String
    SqlEsc = Replace(s, "'", "''")
End Function

Private Function SqlText(ByVal v As Variant) As String
    If IsNull(v) Or Len(Trim$(Nz(v, ""))) = 0 Then
        SqlText = "Null"
    Else
        SqlText = "'" & SqlEsc(CStr(v)) & "'"
    End If
End Function

Private Function SqlDate(ByVal v As Variant) As String
    If IsNull(v) Then
        SqlDate = "Null"
    Else
        SqlDate = "#" & Format$(CDate(v), "yyyy-mm-dd") & "#"
    End If
End Function

Private Function SqlNumber(ByVal v As Variant) As String
    If IsNull(v) Or Len(Trim$(Nz(v, ""))) = 0 Then
        SqlNumber = "Null"
    Else
        SqlNumber = CStr(CLng(v))
    End If
End Function



Private Sub EvaluateMatch(ByVal vVor As Variant, ByVal vNach As Variant, ByVal vGeb As Variant, ByVal vSchule As Variant, _
                          ByRef matchType As String, ByRef matchCount As Integer, _
                          ByRef matchedId As Variant, ByRef candidateList As String, _
                          ByRef debugInfo As String)
    Dim db As DAO.Database
    Dim rs As DAO.Recordset
    Dim pkName As String
    Dim hardCount As Long, softCount As Long
    Dim currCount As Integer
    Dim isHard As Boolean
    Dim idVal As Variant
    Dim mVor As Boolean, mNach As Boolean, mGeb As Boolean, mSchule As Boolean
    Dim dbgLines As Long

    Set db = CurrentDb
    pkName = GetPrimaryKeyFieldName(db.TableDefs(C_TARGET_TABLE))
    If Len(pkName) = 0 Then
        pkName = FirstExistingField(db.TableDefs(C_TARGET_TABLE), "SchuelerID", "ID", "SchülerID")
    End If

    Set rs = db.OpenRecordset("SELECT * FROM [" & C_TARGET_TABLE & "]", dbOpenSnapshot)

    matchType = "none"
    matchCount = 0
    matchedId = Null
    candidateList = ""
    debugInfo = "IN: Vorname='" & Nz(vVor, "") & "' Nachname='" & Nz(vNach, "") & "' Geburtstag='" & Nz(vGeb, "") & "' SchuleID='" & Nz(vSchule, "") & "'"

    If Len(pkName) = 0 Or Not HasField(rs, pkName) Then
        rs.Close
        Exit Sub
    End If

    Do While Not rs.EOF
        currCount = CountMatchScore(vVor, vNach, vGeb, vSchule, rs)
        isHard = IsHardMatch(vVor, vNach, vGeb, vSchule, rs)
        idVal = rs.Fields(pkName).Value
        mVor = IsSameText(vVor, SafeRsValue(rs, "SVorname"))
        mNach = IsSameText(vNach, SafeRsValue(rs, "SNachname"))
        mGeb = IsSameDate(vGeb, SafeRsValue(rs, "SGeburtstag"))
        mSchule = IsSameNumber(vSchule, SafeRsValue(rs, "SSchuleID"))

        If dbgLines < 25 And (mVor Or mNach Or mGeb Or mSchule) Then
            debugInfo = debugInfo & vbCrLf & "ID=" & Nz(idVal, "?") & _
                        " V=" & IIf(mVor, "1", "0") & _
                        " N=" & IIf(mNach, "1", "0") & _
                        " G=" & IIf(mGeb, "1", "0") & _
                        " S=" & IIf(mSchule, "1", "0") & _
                        " hard=" & IIf(isHard, "1", "0") & _
                        " score=" & currCount
            dbgLines = dbgLines + 1
        End If

        If isHard Then
            hardCount = hardCount + 1
            candidateList = AppendId(candidateList, idVal)
            If IsNull(matchedId) Then matchedId = idVal
            If currCount > matchCount Then matchCount = currCount
        ElseIf currCount >= 2 Then
            softCount = softCount + 1
            candidateList = AppendId(candidateList, idVal)
            If IsNull(matchedId) Then matchedId = idVal
            If currCount > matchCount Then matchCount = currCount
        End If

        rs.MoveNext
    Loop
    rs.Close

    If hardCount = 1 Then
        matchType = "hard"
    ElseIf hardCount > 1 Then
        matchType = "soft"
        matchedId = Null
    ElseIf softCount > 0 Then
        matchType = "soft"
        If softCount > 1 Then matchedId = Null
    End If

    debugInfo = debugInfo & vbCrLf & "RESULT: matchType=" & matchType & " matchCount=" & matchCount & _
                " hardCount=" & hardCount & " softCount=" & softCount & _
                " matchedId=" & Nz(matchedId, "") & " candidates='" & candidateList & "'"
End Sub

Private Function CountMatchScore(ByVal vVor As Variant, ByVal vNach As Variant, ByVal vGeb As Variant, _
                                 ByVal vSchule As Variant, ByVal rs As DAO.Recordset) As Integer
    Dim c As Integer
    If IsSameText(vVor, SafeRsValue(rs, "SVorname")) Then c = c + 1
    If IsSameText(vNach, SafeRsValue(rs, "SNachname")) Then c = c + 1
    If IsSameDate(vGeb, SafeRsValue(rs, "SGeburtstag")) Then c = c + 1
    If IsSameNumber(vSchule, SafeRsValue(rs, "SSchuleID")) Then c = c + 1
    CountMatchScore = c
End Function

Private Function IsHardMatch(ByVal vVor As Variant, ByVal vNach As Variant, ByVal vGeb As Variant, _
                             ByVal vSchule As Variant, ByVal rs As DAO.Recordset) As Boolean
    Dim mVor As Boolean, mNach As Boolean, mGeb As Boolean, mSchule As Boolean
    mVor = IsSameText(vVor, SafeRsValue(rs, "SVorname"))
    mNach = IsSameText(vNach, SafeRsValue(rs, "SNachname"))
    mGeb = IsSameDate(vGeb, SafeRsValue(rs, "SGeburtstag"))
    mSchule = IsSameNumber(vSchule, SafeRsValue(rs, "SSchuleID"))
    IsHardMatch = (mVor And mNach And (mGeb Or mSchule))
End Function

Private Function AppendId(ByVal list As String, ByVal idVal As Variant) As String
    If IsNull(idVal) Then
        AppendId = list
    ElseIf Len(list) = 0 Then
        AppendId = CStr(idVal)
    Else
        AppendId = list & "," & CStr(idVal)
    End If
End Function

Private Function SafeRsValue(ByVal rs As DAO.Recordset, ByVal fieldName As String) As Variant
    If HasField(rs, fieldName) Then
        SafeRsValue = rs.Fields(fieldName).Value
    Else
        SafeRsValue = Null
    End If
End Function

Private Function IsSameText(ByVal a As Variant, ByVal b As Variant) As Boolean
    Dim aa As String, bb As String
    aa = NormalizeCompareText(a)
    bb = NormalizeCompareText(b)
    IsSameText = (aa = bb) And Len(aa) > 0
End Function

Private Function NormalizeCompareText(ByVal v As Variant) As String
    Dim s As String
    s = LCase$(CStr(Nz(v, "")))
    s = Replace(s, Chr$(160), " ")
    s = Replace(s, vbTab, " ")
    Do While InStr(s, "  ") > 0
        s = Replace(s, "  ", " ")
    Loop
    NormalizeCompareText = Trim$(s)
End Function

Private Function IsSameDate(ByVal a As Variant, ByVal b As Variant) As Boolean
    If IsNull(a) Or IsNull(b) Then Exit Function
    If Not IsDate(a) Or Not IsDate(b) Then Exit Function
    IsSameDate = (CLng(CDate(a)) = CLng(CDate(b)))
End Function

Private Function IsSameNumber(ByVal a As Variant, ByVal b As Variant) As Boolean
    If IsNull(a) Or IsNull(b) Then Exit Function
    If Not IsNumeric(a) Or Not IsNumeric(b) Then Exit Function
    IsSameNumber = (CLng(a) = CLng(b))
End Function

Private Function GetPrimaryKeyFieldName(ByVal tdf As DAO.TableDef) As String
    Dim idx As DAO.Index
    For Each idx In tdf.Indexes
        If idx.Primary Then
            If idx.Fields.Count > 0 Then
                GetPrimaryKeyFieldName = idx.Fields(0).Name
                Exit Function
            End If
        End If
    Next
End Function

Private Sub UpdateFieldText(ByVal rs As DAO.Recordset, ByVal fieldName As String, ByVal value As Variant)
    If Not HasField(rs, fieldName) Then Exit Sub
    If IsNull(value) Or Len(Trim$(Nz(value, ""))) = 0 Then Exit Sub
    rs.Fields(fieldName).Value = Trim$(CStr(value))
End Sub

Private Sub UpdateFieldNumber(ByVal rs As DAO.Recordset, ByVal fieldName As String, ByVal value As Variant)
    If Not HasField(rs, fieldName) Then Exit Sub
    If IsNull(value) Or Len(Trim$(Nz(value, ""))) = 0 Then Exit Sub
    If IsNumeric(value) Then rs.Fields(fieldName).Value = CLng(value)
End Sub

Private Sub UpdateFieldDate(ByVal rs As DAO.Recordset, ByVal fieldName As String, ByVal value As Variant)
    If Not HasField(rs, fieldName) Then Exit Sub
    If IsNull(value) Then Exit Sub
    If IsDate(value) Then rs.Fields(fieldName).Value = CDate(value)
End Sub

Private Sub UpdateFieldDateIfLater(ByVal rs As DAO.Recordset, ByVal fieldName As String, ByVal newValue As Variant)
    Dim oldValue As Variant
    If Not HasField(rs, fieldName) Then Exit Sub
    If IsNull(newValue) Or Not IsDate(newValue) Then Exit Sub
    oldValue = rs.Fields(fieldName).Value

    If IsNull(oldValue) Then
        rs.Fields(fieldName).Value = CDate(newValue)
    ElseIf IsDate(oldValue) Then
        If CDate(newValue) > CDate(oldValue) Then rs.Fields(fieldName).Value = CDate(newValue)
    End If
End Sub

Private Function GetFormFieldValue(ByVal frm As Form, ByVal fieldName As String) As Variant
    On Error GoTo EH

    If HasField(frm.Recordset, fieldName) Then
        GetFormFieldValue = frm.Recordset.Fields(fieldName).Value
        Exit Function
    End If

    If HasControl(frm, fieldName) Then
        GetFormFieldValue = frm.Controls(fieldName).Value
        Exit Function
    End If

    GetFormFieldValue = Null
    Exit Function
EH:
    GetFormFieldValue = Null
End Function

Private Sub SetFormFieldValue(ByVal frm As Form, ByVal fieldName As String, ByVal v As Variant)
    On Error Resume Next
    If HasControl(frm, fieldName) Then frm.Controls(fieldName).Value = v
End Sub

Private Function HasControl(ByVal frm As Form, ByVal ctrlName As String) As Boolean
    On Error GoTo EH
    Dim c As Control
    Set c = frm.Controls(ctrlName)
    HasControl = True
    Exit Function
EH:
    HasControl = False
End Function

Private Function SrcFieldValue(ByVal rs As DAO.Recordset, ParamArray names() As Variant) As Variant
    On Error GoTo EH
    Dim i As Long
    For i = LBound(names) To UBound(names)
        If HasField(rs, CStr(names(i))) Then
            SrcFieldValue = rs.Fields(CStr(names(i))).Value
            Exit Function
        End If
    Next
    SrcFieldValue = Null
    Exit Function
EH:
    SrcFieldValue = Null
End Function

Private Function TableExists(ByVal Name As String) As Boolean
    Dim t As DAO.TableDef
    For Each t In CurrentDb.TableDefs
        If StrComp(t.Name, Name, vbTextCompare) = 0 Then
            TableExists = True
            Exit Function
        End If
    Next
End Function

Private Function HasField(ByVal t As Object, ByVal fieldName As String) As Boolean
    On Error GoTo EH
    Dim f As DAO.Field
    Set f = t.Fields(fieldName)
    HasField = True
    Exit Function
EH:
    HasField = False
End Function
