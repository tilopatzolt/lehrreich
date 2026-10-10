"""Erzeugt Lernkarten aus Dokumenten im Ordner wissenstrainer/inbox/.

Neue oder geänderte Dateien (erkannt über SHA-256) werden an Claude geschickt,
das Ergebnis landet in wissenstrainer/app/data/library.json, die die App lädt.

Aufruf:
    python wissenstrainer/pipeline/extract.py            # neue Dokumente verarbeiten
    python wissenstrainer/pipeline/extract.py --dry-run  # nur anzeigen, was passieren würde
    python wissenstrainer/pipeline/extract.py --prune    # Quellen entfernen, deren Datei fehlt

Umgebungsvariablen:
    ANTHROPIC_API_KEY   API-Schlüssel (Pflicht, außer bei --dry-run)
    WT_MODEL            Modell, Standard: claude-opus-5-5
    WT_EFFORT           low | medium | high | xhigh | max, Standard: high
    WT_MAX_CARDS        grobe Obergrenze an Karten pro Dokument, Standard: 30
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "inbox"
LIBRARY = ROOT / "app" / "data" / "library.json"

MODEL = os.environ.get("WT_MODEL", "claude-opus-5-5")
EFFORT = os.environ.get("WT_EFFORT", "high")
MAX_CARDS = int(os.environ.get("WT_MAX_CARDS", "30"))

PDF_INLINE_LIMIT = 30 * 1024 * 1024  # Anfragen dürfen max. 32 MB groß sein
TEXT_TYPES = {".txt", ".md", ".markdown"}
HTML_TYPES = {".html", ".htm"}
SUPPORTED = {".pdf", ".docx"} | TEXT_TYPES | HTML_TYPES

CARD_TYPES = ["fakt", "zahl", "argument", "beispiel", "zitat", "begriff"]

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["document", "cards"],
    "properties": {
        "document": {
            "type": "object",
            "additionalProperties": False,
            "required": ["title", "authors", "organisation", "published", "doc_type", "summary", "core_thesis"],
            "properties": {
                "title": {"type": "string"},
                "authors": {"type": "string"},
                "organisation": {"type": "string"},
                "published": {"type": "string"},
                "doc_type": {"type": "string"},
                "summary": {"type": "string"},
                "core_thesis": {"type": "string"},
            },
        },
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "type", "topic", "front", "back", "explanation",
                    "quote", "location", "attribution", "tags", "importance",
                ],
                "properties": {
                    "type": {"type": "string", "enum": CARD_TYPES},
                    "topic": {"type": "string"},
                    "front": {"type": "string"},
                    "back": {"type": "string"},
                    "explanation": {"type": "string"},
                    "quote": {"type": "string"},
                    "location": {"type": "string"},
                    "attribution": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "importance": {"type": "integer", "enum": [1, 2, 3]},
                },
            },
        },
    },
}

SYSTEM = """Du bist Redakteur:in für einen persönlichen Wissenstrainer. Die Person liest politische \
Paper, Statements und Analysen und will die Inhalte so verinnerlichen, dass sie in Gesprächen, \
Sitzungen und Debatten sicher argumentieren kann. Du machst aus einem Dokument Lernkarten im Stil \
eines Vokabeltrainers: Vorderseite = Frage oder Stichwort, Rückseite = knappe, merkfähige Antwort.

Was eine gute Karte ausmacht:
- Sie trägt etwas, das man später tatsächlich zitieren oder verwenden will: eine belastbare Zahl, \
einen überraschenden Fakt, ein Argument samt Begründung, ein anschauliches Beispiel, eine prägnante \
Formulierung oder einen Fachbegriff, den man sauber erklären können sollte.
- Die Vorderseite ist ohne das Dokument verständlich (nicht "Was sagt der Text über ...?", sondern \
konkret nach dem Inhalt fragen) und lässt genau eine sinnvolle Antwort zu.
- Die Rückseite ist kurz: ein bis zwei Sätze oder eine Zahl mit Bezugsgröße. Hintergrund, \
Einordnung oder Einschränkungen kommen in "explanation".
- Bei Argumenten fragt die Vorderseite nach der Begründung oder dem Gegenargument zu einer \
Position; die Rückseite nennt den Kern in eigenen Worten.
- Zahlen immer mit Einheit, Bezugsjahr und Bezugsgröße, so wie im Dokument angegeben.
- "attribution" sagt, wessen Aussage das ist (z. B. die Autor:innen, eine zitierte Studie, eine \
Gegenseite, die das Paper referiert). Positionen des Papiers nicht als neutrale Tatsachen ausgeben.
- "quote" ist ein wörtlicher, kurzer Auszug aus dem Dokument, der die Karte belegt. \
"location" nennt Seite oder Abschnitt, soweit erkennbar, sonst leer.
- "topic" ist ein kurzes Themenlabel (1-3 Wörter), das über Dokumente hinweg wiederverwendbar ist \
(z. B. "Schuldenbremse", "Wohnungsbau", "Klimageld"). "tags" sind 1-4 weitere Schlagworte.
- "importance": 3 = Kernaussage des Dokuments, 2 = wichtig, 1 = nettes Detail.

Qualität vor Menge: lieber 12 starke Karten als 30 schwache. Keine Karten zu Formalia, \
Danksagungen oder Allgemeinplätzen. Schreibe auf Deutsch, auch wenn das Dokument englisch ist \
(Zitate bleiben im Original). Erfinde nichts, was nicht im Dokument steht.

Gib zusätzlich Metadaten zum Dokument zurück; unbekannte Felder bleiben leere Strings. \
"summary" sind 2-3 Sätze, "core_thesis" ist die zentrale These in einem Satz."""


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "nav", "footer", "header", "noscript"}
    BLOCK = {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "section", "article"}

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip_depth += 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip_depth:
            self._skip_depth -= 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip_depth:
            self.parts.append(data)

    def text(self) -> str:
        return re.sub(r"\n\s*\n+", "\n\n", "".join(self.parts)).strip()


def read_docx(path: Path) -> str:
    import docx  # python-docx

    document = docx.Document(str(path))
    lines = [p.text for p in document.paragraphs]
    for table in document.tables:
        for row in table.rows:
            lines.append(" | ".join(cell.text for cell in row.cells))
    return "\n".join(line for line in lines if line.strip())


def read_pdf_text(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    return "\n\n".join(
        f"[Seite {i}]\n{page.extract_text() or ''}" for i, page in enumerate(reader.pages, start=1)
    )


def document_block(path: Path) -> dict:
    """Baut den Inhaltsblock, mit dem Claude das Dokument liest."""
    suffix = path.suffix.lower()
    if suffix == ".pdf" and path.stat().st_size <= PDF_INLINE_LIMIT:
        data = base64.standard_b64encode(path.read_bytes()).decode("ascii")
        return {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": data},
            "title": path.name,
        }
    if suffix == ".pdf":
        text = read_pdf_text(path)
    elif suffix == ".docx":
        text = read_docx(path)
    elif suffix in HTML_TYPES:
        parser = _TextExtractor()
        parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        text = parser.text()
    else:
        text = path.read_text(encoding="utf-8", errors="replace")
    if not text.strip():
        raise ValueError("Kein Text gefunden (gescanntes Dokument ohne Texterkennung?)")
    return {
        "type": "document",
        "source": {"type": "text", "media_type": "text/plain", "data": text},
        "title": path.name,
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_library() -> dict:
    if LIBRARY.exists():
        return json.loads(LIBRARY.read_text(encoding="utf-8"))
    return {"version": 1, "updated": None, "sources": [], "cards": []}


def save_library(library: dict) -> None:
    library["updated"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    LIBRARY.parent.mkdir(parents=True, exist_ok=True)
    LIBRARY.write_text(json.dumps(library, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def existing_fronts(library: dict, limit: int = 400) -> str:
    fronts = [c["front"] for c in library["cards"]][-limit:]
    if not fronts:
        return ""
    joined = "\n".join(f"- {f}" for f in fronts)
    return (
        "\n\nDiese Karten gibt es im Pool schon. Lege keine inhaltlich gleichen Karten an; "
        "eine neue Karte zum selben Thema ist nur sinnvoll, wenn sie etwas Neues beiträgt "
        f"(andere Zahl, andere Perspektive, Widerspruch):\n{joined}"
    )


def call_claude(client, block: dict, library: dict) -> dict:
    prompt = (
        f"Erstelle Lernkarten aus diesem Dokument, höchstens {MAX_CARDS} Stück."
        + existing_fronts(library)
    )
    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=64000,
        system=SYSTEM,
        messages=[{"role": "user", "content": [block, {"type": "text", "text": prompt}]}],
        output_config={"effort": EFFORT, "format": {"type": "json_schema", "schema": SCHEMA}},
        betas=["server-side-fallback-2026-07-01"],
        extra_body={"fallbacks": "default"},
    ) as stream:
        response = stream.get_final_message()

    if response.stop_reason == "refusal":
        details = getattr(response, "stop_details", None)
        raise RuntimeError(f"Claude hat abgelehnt: {getattr(details, 'explanation', '') or 'ohne Begründung'}")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Antwort abgeschnitten (max_tokens erreicht)")
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def card_id(source_id: str, front: str) -> str:
    return hashlib.sha1(f"{source_id}|{front}".encode("utf-8")).hexdigest()[:12]


def process(path: Path, digest: str, client, library: dict) -> tuple[dict, list[dict]]:
    result = call_claude(client, document_block(path), library)
    meta = result["document"]
    source_id = digest[:10]
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    source = {
        "id": source_id,
        "file": path.name,
        "sha256": digest,
        "added": now,
        "model": MODEL,
        "status": "ok",
        **meta,
    }
    cards = []
    seen = set()
    for raw in result["cards"]:
        cid = card_id(source_id, raw["front"])
        if cid in seen:
            continue
        seen.add(cid)
        cards.append({"id": cid, "source": source_id, "created": now, **raw})
    source["card_count"] = len(cards)
    return source, cards


def write_summary(lines: list[str]) -> None:
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="nichts an Claude senden, nur auflisten")
    parser.add_argument("--prune", action="store_true", help="Quellen ohne Datei in inbox/ entfernen")
    parser.add_argument("--retry-failed", action="store_true", help="fehlgeschlagene Dokumente erneut versuchen")
    args = parser.parse_args()

    library = load_library()
    files = sorted(
        p for p in INBOX.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED and not p.name.startswith(".")
    )
    by_sha = {s["sha256"]: s for s in library["sources"]}
    by_file = {s["file"]: s for s in library["sources"]}

    todo = []
    for path in files:
        digest = sha256(path)
        known = by_sha.get(digest)
        if known and not (args.retry_failed and known["status"] != "ok"):
            continue
        todo.append((path, digest))

    report = ["## Wissenstrainer: Dokumente verarbeiten", ""]
    changed = False

    if args.prune:
        present = {p.name for p in files}
        gone = [s for s in library["sources"] if s["file"] not in present]
        if gone:
            gone_ids = {s["id"] for s in gone}
            library["sources"] = [s for s in library["sources"] if s["id"] not in gone_ids]
            library["cards"] = [c for c in library["cards"] if c["source"] not in gone_ids]
            report += [f"- entfernt: {s['file']}" for s in gone]
            changed = True

    if not todo:
        print("Keine neuen Dokumente.")
        report.append("Keine neuen Dokumente.")
    elif args.dry_run:
        for path, _ in todo:
            block = document_block(path)
            kind = block["source"]["type"]
            size = len(block["source"]["data"])
            print(f"würde verarbeiten: {path.name} ({kind}, {size:,} Zeichen)")
        return 0
    else:
        import anthropic

        client = anthropic.Anthropic()
        for path, digest in todo:
            print(f"→ {path.name}", flush=True)
            # Eine geänderte Datei ersetzt die alte Fassung samt ihrer Karten.
            old = by_file.get(path.name)
            if old is None and digest in by_sha:
                old = by_sha[digest]
            try:
                source, cards = process(path, digest, client, library)
            except Exception as exc:  # pro Datei weitermachen, Fehler protokollieren
                print(f"  Fehler: {exc}", file=sys.stderr)
                report.append(f"- ❌ **{path.name}**: {exc}")
                if old is None:
                    library["sources"].append({
                        "id": digest[:10], "file": path.name, "sha256": digest,
                        "added": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                        "status": "fehler", "error": str(exc), "title": path.stem, "card_count": 0,
                    })
                    changed = True
                continue
            if old is not None:
                library["sources"] = [s for s in library["sources"] if s["id"] != old["id"]]
                library["cards"] = [c for c in library["cards"] if c["source"] != old["id"]]
            library["sources"].append(source)
            library["cards"].extend(cards)
            changed = True
            print(f"  {len(cards)} Karten: {source['title']}")
            report.append(f"- ✅ **{source['title'] or path.name}**: {len(cards)} Karten")

    if changed:
        save_library(library)
    write_summary(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
