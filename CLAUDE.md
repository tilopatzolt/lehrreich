# Hinweise für Claude

## Zusammenarbeit mit Tilo

- Tilo ist Einsteiger bei GitHub und Claude Code. Erklärungen auf Deutsch, einfach und ohne
  Fachsprache; Fachbegriffe beim ersten Mal kurz erklären. Schritte zum Klicken als nummerierte
  Liste.
- Änderungen kommen als Pull Request. Tilo übernimmt sie selbst per **Merge pull request →
  Confirm merge**. Danach prüfen, ob der Workflow grün ist, und sagen, was Tilo in der App tun
  muss (meist: App neu öffnen, **Mehr → Neue Karten abrufen**).
- Geld: möglichst nichts ausgeben, höchstens kleine Beträge. Kostenlose Dienste bevorzugen.
- Schlüssel (GitHub-Token, API-Key) nie in den Chat schreiben lassen.

## Wissenstrainer (`wissenstrainer/`)

Lernkarten-App fürs Handy: Dokumente in einem Ordner → Claude macht Karten → in der App sichten
und lernen. Ausführliche Anleitung für Tilo: `wissenstrainer/README.md`.

**Aufbau**
- `app/` – App ohne Build-Schritt (HTML, CSS, JavaScript), läuft auf GitHub Pages unter
  <https://tilopatzolt.github.io/lehrreich/>. Lernstand liegt nur im Browser (localStorage).
- `pipeline/extract.py` – macht aus Dokumenten Karten (Claude-API) und sucht Bilder
  (Openverse, Wikimedia Commons; Claude wählt das passendste). Ein Unterordner = ein Paket.
- `oeffentlich/` – öffentliche Dokumente → `app/data/pakete/`.
- Private Ablage: eigenes privates Repo `tilopatzolt/wissenstrainer-privat` (`privat/` →
  `karten/`). Dessen Workflow holt `pipeline/` aus diesem Repo (main). Vorlage dafür in
  `privat-vorlage/`; Änderungen am Workflow in beiden Repos nachziehen.
- Workflows: `.github/workflows/wissenstrainer.yml` (öffentlich + Veröffentlichung der App) und
  `wissenstrainer-privat.yml` im privaten Repo. Optionen beim manuellen Start: fehlgeschlagene
  Dokumente erneut, alles neu auswerten (Lernstand der Karten geht verloren), Bilder neu suchen.
- `design/ELEMENTE.md` – Liste aller Bausteine mit Design-Stand; bei jeder sichtbaren Änderung
  mitpflegen. Design-Vorlage aus Google Stitch in `design/stitch/`.

**Bei Änderungen an der App beachten**
- `APP_VERSION` in `app/app.js` hochzählen (wird unter „Mehr“ angezeigt) und `VERSION` in
  `app/sw.js` erhöhen, sonst sieht Tilo die alte Fassung.
- Neue Icons `ms("…")` auch in die `icon_names=`-Liste in `app/index.html` eintragen
  (alphabetisch), sonst erscheint nur der Name als Text.
- Vor dem Pull Request im Browser testen (Playwright/Chromium, Handygröße 390×844).
- Tilos echter Lernstand hängt an den Karten-IDs: nicht ohne Rückfrage neu auswerten.

**Stand und offene Wünsche**: siehe ❓-Einträge in `design/ELEMENTE.md`.
