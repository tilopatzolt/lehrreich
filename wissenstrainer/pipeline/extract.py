"""Erzeugt Lernkarten-Pakete aus Dokumenten.

Jeder Unterordner der Ablage ist ein Paket, z. B. oeffentlich/Schuldenbremse/.
Dateien direkt in der Ablage landen im Paket "Allgemein". Neue oder geänderte
Dateien (erkannt am Inhalt) werden an Claude geschickt; pro Paket entsteht eine
JSON-Datei im Ausgabeordner, dazu eine index.json mit allen Paketen.

Aufruf (Standard ist die öffentliche Ablage dieses Repos):
    python wissenstrainer/pipeline/extract.py
    python wissenstrainer/pipeline/extract.py --dry-run   # nur anzeigen
    python wissenstrainer/pipeline/extract.py --prune     # Karten gelöschter Dateien entfernen
    python extract.py --inbox privat --out karten --visibility privat   # private Ablage

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
DEFAULT_INBOX = ROOT / "oeffentlich"
DEFAULT_OUT = ROOT / "app" / "data" / "pakete"
LOOSE_PACKAGE = "Allgemein"

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


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def slugify(name: str) -> str:
    s = name.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "paket"


def load_json(path: Path) -> dict | None:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def existing_fronts(package: dict, limit: int = 400) -> str:
    fronts = [c["front"] for c in package["cards"]][-limit:]
    if not fronts:
        return ""
    joined = "\n".join(f"- {f}" for f in fronts)
    return (
        "\n\nDiese Karten gibt es in diesem Paket schon. Lege keine inhaltlich gleichen Karten an; "
        "eine neue Karte zum selben Thema ist nur sinnvoll, wenn sie etwas Neues beiträgt "
        f"(andere Zahl, andere Perspektive, Widerspruch):\n{joined}"
    )


def call_claude(client, block: dict, package: dict) -> dict:
    prompt = (
        f"Erstelle Lernkarten aus diesem Dokument, höchstens {MAX_CARDS} Stück."
        + existing_fronts(package)
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


def card_id(package_id: str, source_id: str, front: str) -> str:
    return hashlib.sha1(f"{package_id}|{source_id}|{front}".encode("utf-8")).hexdigest()[:12]


def build_cards(package_id: str, source_id: str, raw_cards: list[dict], created: str) -> list[dict]:
    cards, seen = [], set()
    for raw in raw_cards:
        raw = {k: v for k, v in raw.items() if k not in ("id", "source", "created")}
        cid = card_id(package_id, source_id, raw["front"])
        if cid in seen:
            continue
        seen.add(cid)
        cards.append({"id": cid, "source": source_id, "created": created, **raw})
    return cards


def scan_inbox(inbox: Path) -> dict[str, list[Path]]:
    """Ordnet jede unterstützte Datei ihrem Paket (= Unterordner) zu."""
    packages: dict[str, list[Path]] = {}
    if not inbox.exists():
        return packages
    for path in sorted(inbox.rglob("*")):
        rel = path.relative_to(inbox)
        if not path.is_file() or path.suffix.lower() not in SUPPORTED:
            continue
        if any(part.startswith(".") for part in rel.parts):
            continue
        name = rel.parts[0] if len(rel.parts) > 1 else LOOSE_PACKAGE
        packages.setdefault(name, []).append(path)
    return packages


def write_index(out: Path) -> bool:
    entries = []
    for path in sorted(out.glob("*.json")):
        if path.name == "index.json":
            continue
        p = json.loads(path.read_text(encoding="utf-8"))
        entries.append({
            "id": p["id"], "name": p["name"], "visibility": p.get("visibility", ""),
            "cards": len(p.get("cards", [])), "sources": len(p.get("sources", [])),
            "updated": p.get("updated"),
        })
    index = {"version": 2, "pakete": entries}
    old = load_json(out / "index.json")
    if old == index:
        return False
    write_json(out / "index.json", index)
    return True


def write_summary(lines: list[str]) -> None:
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--inbox", type=Path, default=DEFAULT_INBOX, help="Ablage mit Paket-Unterordnern")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Ordner für die Paket-Dateien")
    parser.add_argument("--visibility", choices=["oeffentlich", "privat"], default="oeffentlich")
    parser.add_argument("--dry-run", action="store_true", help="nichts an Claude senden, nur auflisten")
    parser.add_argument("--prune", action="store_true", help="Karten gelöschter Dateien entfernen")
    parser.add_argument("--retry-failed", action="store_true", help="fehlgeschlagene Dokumente erneut versuchen")
    args = parser.parse_args()

    inbox_files = scan_inbox(args.inbox)
    existing = {p.stem: load_json(p) for p in args.out.glob("*.json") if p.name != "index.json"} if args.out.exists() else {}

    # Bereits verarbeitete Dokumente aus allen Paketen: verschiebt man eine Datei in ein
    # anderes Paket, werden ihre Karten übernommen statt neu erzeugt.
    known: dict[str, tuple[dict, list[dict]]] = {}
    for pkg in existing.values():
        for src in pkg.get("sources", []):
            if src.get("status") == "ok":
                known[src["sha256"]] = (src, [c for c in pkg["cards"] if c["source"] == src["id"]])

    report = ["## Wissenstrainer: Dokumente verarbeiten", ""]
    client = None
    changed_any = False

    for name, files in inbox_files.items():
        pid = slugify(name)
        pkg = existing.get(pid) or {
            "version": 2, "id": pid, "name": name, "visibility": args.visibility,
            "managed": True, "updated": None, "sources": [], "cards": [],
        }
        pkg["name"] = name
        changed = False
        by_sha = {s["sha256"]: s for s in pkg["sources"]}
        by_file = {s["file"]: s for s in pkg["sources"]}
        present = set()

        for path in files:
            base = args.inbox if path.parent == args.inbox else args.inbox / name
            rel = str(path.relative_to(base))
            present.add(rel)
            digest = sha256(path)
            mine = by_sha.get(digest)
            if mine and not (args.retry_failed and mine.get("status") != "ok"):
                continue
            old = by_file.get(rel) or mine

            if args.dry_run:
                how = "übernehmen" if digest in known else "an Claude senden"
                print(f"[{name}] {rel}: {how}")
                continue

            created = now_iso()
            source_id = digest[:10]
            if digest in known:
                prev_src, prev_cards = known[digest]
                source = {**prev_src, "file": rel, "added": created}
                cards = build_cards(pid, source_id, prev_cards, created)
                note = "übernommen"
            else:
                if client is None:
                    import anthropic
                    client = anthropic.Anthropic()
                print(f"→ [{name}] {rel}", flush=True)
                try:
                    result = call_claude(client, document_block(path), pkg)
                except Exception as exc:  # pro Datei weitermachen, Fehler protokollieren
                    print(f"  Fehler: {exc}", file=sys.stderr)
                    report.append(f"- ❌ **{name} / {rel}**: {exc}")
                    if old is None:
                        pkg["sources"].append({
                            "id": source_id, "file": rel, "sha256": digest, "added": created,
                            "status": "fehler", "error": str(exc), "title": path.stem, "card_count": 0,
                        })
                        changed = True
                    continue
                source = {
                    "id": source_id, "file": rel, "sha256": digest, "added": created,
                    "model": MODEL, "status": "ok", **result["document"],
                }
                cards = build_cards(pid, source_id, result["cards"], created)
                note = "neu"

            if old is not None:
                pkg["sources"] = [s for s in pkg["sources"] if s["id"] != old["id"]]
                pkg["cards"] = [c for c in pkg["cards"] if c["source"] != old["id"]]
            source["card_count"] = len(cards)
            pkg["sources"].append(source)
            pkg["cards"].extend(cards)
            changed = True
            print(f"  {len(cards)} Karten ({note}): {source.get('title') or rel}")
            report.append(f"- ✅ **{name}**: {source.get('title') or rel} – {len(cards)} Karten")

        if args.prune and not args.dry_run:
            gone = [s for s in pkg["sources"] if s["file"] not in present]
            if gone:
                ids = {s["id"] for s in gone}
                pkg["sources"] = [s for s in pkg["sources"] if s["id"] not in ids]
                pkg["cards"] = [c for c in pkg["cards"] if c["source"] not in ids]
                report += [f"- 🗑 {name}: {s['file']} entfernt" for s in gone]
                changed = True

        if changed:
            pkg["updated"] = now_iso()
            write_json(args.out / f"{pid}.json", pkg)
            changed_any = True

    if args.prune and not args.dry_run:
        wanted = {slugify(n) for n in inbox_files}
        for pid, pkg in existing.items():
            # Nur Pakete aus Ordnern entfernen, nicht veröffentlichte Pakete aus der privaten Ablage.
            if pkg.get("managed") and pid not in wanted:
                (args.out / f"{pid}.json").unlink()
                report.append(f"- 🗑 Paket {pkg['name']} entfernt (Ordner gelöscht)")
                changed_any = True

    if args.dry_run:
        return 0
    if args.out.exists() and write_index(args.out):
        changed_any = True
    if not changed_any:
        print("Keine neuen Dokumente.")
        report.append("Keine neuen Dokumente.")
    write_summary(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
