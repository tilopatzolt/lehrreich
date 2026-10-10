# Wissenstrainer

Eine Lernkarten-App fürs Handy, die sich selbst füllt. Du legst Dokumente (PDF, Word, Text)
in einen Ordner, Claude macht daraus Lernkarten: Fakten, Zahlen, Argumente, Beispiele, Zitate
und Begriffe. In der App entscheidest du, welche Karten du behältst, und lernst sie dann wie
mit einem Vokabeltrainer.

## Das Prinzip in drei Sätzen

1. **Es gibt zwei Ablagen:** eine **private** (nur du siehst sie) und eine **öffentliche**
   (jeder kann sie sehen).
2. **Jeder Unterordner ist ein Paket**, z. B. `Schuldenbremse/` oder `Wohnungspolitik/`. Du
   kannst nach Paketen lernen und Pakete einzeln weitergeben.
3. **Ein privates Paket kannst du in der App mit einem Knopf öffentlich teilen.** Dabei werden
   nur die fertigen Karten geteilt, die du behalten hast. Deine Dokumente bleiben privat.

```
Private Ablage (nur du)              Öffentliche Ablage (alle)
privat/                              wissenstrainer/oeffentlich/
├── Schuldenbremse/                  └── Klimageld/
│   ├── paper-ifo.pdf                    └── stellungnahme.pdf
│   └── statement.docx
└── Wohnungspolitik/
    └── analyse.pdf
         │                                     │
         ▼   Claude macht daraus Karten        ▼
   Paket „Schuldenbremse“  ── teilen ──►  öffentlich in der App
   Paket „Wohnungspolitik“                Paket „Klimageld“
```

**Faustregel:** Alles, was du nicht selbst veröffentlichen würdest, kommt in die private
Ablage. Die öffentliche Ablage ist nur für Dokumente gedacht, die sowieso öffentlich im Netz
stehen.

## Was du in der App machen kannst

- **Heute:** sehen, was zu lernen ist, und loslegen.
- **Sichten:** neue Karten durchgehen. Nach rechts wischen heißt behalten, nach links heißt
  verwerfen. Mit dem Stift kannst du eine Karte umformulieren.
- **Bibliothek:** alle Pakete, getrennt nach Privat und Öffentlich. Ein Tipp auf ein Paket
  öffnet die Paket-Seite. Dort kannst du
  - nur dieses Paket lernen,
  - es aus dem täglichen Lernplan nehmen (pausieren),
  - es **weitergeben**: als Link (nur bei öffentlichen Paketen), als **Lernzettel** zum
    Drucken oder als PDF, oder als Datei für die Lernkarten-App Anki,
  - es **öffentlich teilen** oder das Teilen wieder beenden.
- **Mehr:** Dokumente hinzufügen, Einstellungen, Lernstand sichern.

## Einrichtung (einmalig, ca. 15 Minuten)

Begriffe vorab: Ein **Repository** („Repo“) ist bei GitHub ein Projektordner. Dieses Projekt
`lehrreich` ist **öffentlich**. Für die private Ablage brauchst du ein zweites, **privates**
Repository.

1. **Privates Repository anlegen.** Auf github.com oben rechts **+ → New repository**,
   Name `wissenstrainer-privat`, **Private** auswählen und **Create repository** klicken.
   Den Inhalt aus `wissenstrainer/privat-vorlage/` hineinkopieren (oder Claude bitten, das zu
   erledigen).
2. **Claude-Zugang hinterlegen, in beiden Repositories.** Einen API-Schlüssel bekommst du auf
   <https://console.anthropic.com> unter *API Keys*. Dann im Repository
   **Settings → Secrets and variables → Actions → New repository secret** klicken, als Name
   `ANTHROPIC_API_KEY` eingeben und als Wert den Schlüssel einfügen.
3. **Die App ins Netz stellen** (nur im öffentlichen Repository `lehrreich`):
   **Settings → Pages → Source: GitHub Actions**. Danach ist die App unter
   <https://tilopatzolt.github.io/lehrreich/> erreichbar.
4. **Schlüssel für die App anlegen** (damit sie deine privaten Pakete lesen und Dokumente
   hochladen darf): auf github.com **Profilbild → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token**.
   - *Repository access:* **Only select repositories**, dann `lehrreich` und
     `wissenstrainer-privat` auswählen.
   - *Permissions → Repository permissions → Contents:* **Read and write**.
   - Den angezeigten Schlüssel (beginnt mit `github_pat_`) kopieren und in der App unter
     **Mehr → Mit Schlüssel verbinden** einfügen. Er bleibt nur auf deinem Gerät.
5. **Aufs Handy holen:** App-Adresse im Handy-Browser öffnen, dann **Teilen → Zum
   Home-Bildschirm** (iPhone) oder **Menü → App installieren** (Android).

## Dokumente hinzufügen

- **Vom Handy:** in der App **Mehr → Dokument hinzufügen**. Dort wählst du die Ablage
  (Privat/Öffentlich), den Paketnamen und die Datei.
- **Am Rechner:** im passenden Repository in den Paket-Ordner gehen (z. B.
  `privat/Schuldenbremse/`) und **Add file → Upload files** klicken. Ein neues Paket entsteht,
  wenn du beim Hochladen einen neuen Ordnernamen in den Pfad schreibst.

Nach ein bis drei Minuten sind die Karten fertig. Abrufen kannst du sie in der App unter
**Mehr → Neue Karten abrufen**.

Was du bei Dokumenten beachten solltest:
- **Gelöscht:** Löschst du ein Dokument aus dem Ordner, verschwinden auch seine Karten.
- **Verschoben:** Verschiebst du ein Dokument in einen anderen Paket-Ordner, ziehen die
  Karten mit, ohne erneut Kosten zu verursachen.

## Gut zu wissen

- **Was öffentlich war, bleibt auffindbar:** GitHub merkt sich jede Änderung. Was einmal in
  der öffentlichen Ablage lag oder geteilt wurde, lässt sich im Verlauf wiederfinden, auch
  wenn du es später entfernst.
- **Dein Lernstand** (was du schon kannst, was du behalten oder verworfen hast) wird nur auf
  dem jeweiligen Gerät gespeichert. Zum Umziehen gibt es **Mehr → Lernstand sichern/einspielen**.
- **Kosten:** Ein Paper mit 20 Seiten kostet grob 20 bis 60 Cent. Die Kosten fallen nur
  einmal an, beim Umwandeln.

## Für später: Stellschrauben

Im Repository unter **Settings → Secrets and variables → Actions → Variables** lassen sich
diese Werte setzen:

| Name | Standard | Wirkung |
|---|---|---|
| `WT_MODEL` | `claude-opus-5-5` | Welches Claude-Modell die Karten macht; `claude-sonnet-5-5` ist etwa halb so teuer |
| `WT_EFFORT` | `high` | Wie gründlich gelesen wird: `low`, `medium`, `high` |
| `WT_MAX_CARDS` | `30` | Höchstens so viele Karten pro Dokument |

Wie die Karten formuliert werden, steht in `pipeline/extract.py` im Abschnitt `SYSTEM`. Das
ist ein normaler Text, den man anpassen kann.
