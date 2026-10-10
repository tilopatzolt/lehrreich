# Wissenstrainer

Ein Lernkarten-Trainer fürs Handy, der sich selbst befüllt: Politische Paper, Statements und
Analysen kommen in einen Ordner, Claude zieht daraus Fakten, Zahlen, Argumente, Beispiele,
Zitate und Begriffe als Lernkarten. In der App sichtest du die Karten (wischen = übernehmen
oder verwerfen) und lernst sie mit verteilter Wiederholung.

```
inbox/  ──►  GitHub Action  ──►  app/data/library.json  ──►  App (GitHub Pages, als App installierbar)
PDF, DOCX,    pipeline/extract.py     Karten + Quellen           Heute · Sichten · Bibliothek · Mehr
TXT, MD, HTML (Claude API)
```

## Einrichtung (einmalig)

1. **API-Schlüssel hinterlegen:** Auf github.com im Repo unter *Settings → Secrets and variables →
   Actions → New repository secret* einen Eintrag `ANTHROPIC_API_KEY` anlegen (Schlüssel aus
   <https://console.anthropic.com>).
2. **GitHub Pages einschalten:** *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. **Auf `main` bringen:** Der Workflow `.github/workflows/wissenstrainer.yml` läuft bei Änderungen
   unter `wissenstrainer/` auf `main`. Nach dem ersten Lauf steht die App unter
   `https://tilopatzolt.github.io/lehrreich/`.
4. **Aufs Handy holen:** Seite im Browser öffnen → *Teilen → Zum Home-Bildschirm* (iOS) bzw.
   *Menü → App installieren* (Android).

## Dokumente hinzufügen

- **Vom Handy:** In der App unter *Mehr → GitHub verbinden* einen
  [Fine-grained Token](https://github.com/settings/personal-access-tokens/new) eintragen
  (nur dieses Repository, Berechtigung *Contents: Read and write*). Danach kannst du Dateien
  direkt in der App auswählen.
- **Am Rechner:** Datei auf github.com in den Ordner `wissenstrainer/inbox/` ziehen
  (*Add file → Upload files*) oder per Git committen.

Nach ein bis drei Minuten sind die Karten da (*Mehr → Neue Karten abrufen*). Jede Datei wird
nur einmal verarbeitet (erkannt am Inhalt). Ersetzt du eine Datei durch eine neue Fassung,
werden ihre Karten neu erzeugt.

## Stellschrauben

Als Repository-Variablen (*Settings → Secrets and variables → Actions → Variables*):

| Variable | Standard | Wirkung |
|---|---|---|
| `WT_MODEL` | `claude-opus-5-5` | Modell für die Extraktion; `claude-sonnet-5-5` ist günstiger |
| `WT_EFFORT` | `high` | Gründlichkeit: `low`, `medium`, `high`, `xhigh`, `max` |
| `WT_MAX_CARDS` | `30` | Obergrenze an Karten pro Dokument |

Wie Karten aussehen sollen (Stil, Kartenarten, Umgang mit Positionen), steht im Prompt
`SYSTEM` in `pipeline/extract.py`. Das ist die wichtigste Stelle zum Feintuning.

Manuell starten: *Actions → Wissenstrainer → Run workflow* (mit Optionen zum erneuten Versuch
fehlgeschlagener Dokumente oder zum Entfernen von Karten gelöschter Dateien).

Lokal testen: `pip install -r pipeline/requirements.txt`, dann
`python pipeline/extract.py --dry-run` (ohne API-Aufruf) bzw. mit gesetztem `ANTHROPIC_API_KEY`.
App lokal ansehen: `cd app && python -m http.server` und <http://localhost:8000> öffnen.

## Gut zu wissen

- **Sichtbarkeit:** Das Repository ist öffentlich. Alles in `inbox/` und die erzeugten Karten
  sind damit für jeden lesbar – auch über die Pages-Adresse. Für nicht-öffentliche Dokumente
  das Repository auf privat stellen (GitHub Pages braucht dann einen bezahlten Plan) oder die
  App aus einem privaten Repo bei Cloudflare Pages / Netlify hosten.
- **Lernstand** und Kuratierung liegen im Browser des Geräts (*Mehr → Export/Import* zum Umziehen).
- **Kosten:** PDFs werden samt Layout gelesen (grob 1,5–3 Tsd. Tokens pro Seite). Ein 20-seitiges
  Paper kostet mit dem Standardmodell grob 20–60 Cent, mit `claude-sonnet-5-5` etwa die Hälfte.
