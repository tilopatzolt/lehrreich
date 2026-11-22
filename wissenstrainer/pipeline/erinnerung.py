"""Tägliche Erinnerung für den Wissenstrainer v2 (Web-Push).

Läuft im privaten Repo per Zeitplan (Workflow erinnerung.yml) und schickt um 10 Uhr Berliner Zeit
eine Mitteilung an alle Geräte, die in der App die Erinnerung eingeschaltet haben.

Dateien im Ordner erinnerung/ des privaten Repos:
  vapid.json  – Schlüsselpaar zum Senden; wird beim ersten Lauf hier erzeugt (der private Teil
                verlässt GitHub nie)
  schluessel-oeffentlich.json – nur der öffentliche Teil; den liest die App beim Einschalten
  abos.json   – Push-Abos der Geräte; schreibt die App
  stand.json  – fällige Karten je Tag; schreibt die App, wenn sich etwas ändert

Aufruf: python erinnerung.py [--ordner erinnerung] [--jetzt]
  --jetzt  ohne Uhrzeit-Prüfung senden (zum Ausprobieren über „Run workflow“)
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

ZEITZONE = ZoneInfo("Europe/Berlin")
STUNDE = 10
ABSENDER = "https://tilopatzolt.github.io"  # Kontaktangabe für die Push-Dienste (nur Adresse, ohne Pfad)


def lesen(pfad: Path, ersatz):
    try:
        return json.loads(pfad.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return ersatz


def schreiben(pfad: Path, daten) -> None:
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def schluessel_erzeugen(pfad: Path) -> dict:
    """Erzeugt das Schlüsselpaar (P-256). Den öffentlichen Teil liest die App beim Einschalten."""
    from cryptography.hazmat.primitives import serialization
    from py_vapid import Vapid02

    v = Vapid02()
    v.generate_keys()
    roh = v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    daten = {
        "hinweis": "Schlüssel für die tägliche Erinnerung (Web-Push). Nicht weitergeben.",
        "oeffentlich": base64.urlsafe_b64encode(roh).rstrip(b"=").decode(),
        "privat": v.private_pem().decode(),
    }
    schreiben(pfad, daten)
    schreiben(pfad.parent / "schluessel-oeffentlich.json", {"oeffentlich": daten["oeffentlich"]})
    return daten


def nachricht(stand: dict, heute: str) -> dict | None:
    """Text und Zahl für heute; None = heute nichts zu tun, nicht stören."""
    if not stand.get("faellig"):
        return {"titel": "Wissenstrainer", "text": "Zeit für deine Lernrunde.", "zahl": None}
    n = stand["faellig"].get(heute)
    if n is None:  # Stand zu alt (App länger nicht geöffnet): allgemein erinnern
        return {"titel": "Wissenstrainer", "text": "Zeit für deine Lernrunde.", "zahl": None}
    if n <= 0:
        return None
    return {"titel": "Wissenstrainer", "text": f"Heute {'wartet 1 Karte' if n == 1 else f'warten {n} Karten'} auf dich.", "zahl": n}


def senden(abos: list, daten: dict, schluessel: dict) -> tuple[list, int]:
    """Schickt an alle Abos; abgelaufene (404/410) fallen heraus."""
    from py_vapid import Vapid02
    from pywebpush import WebPushException, webpush

    vapid = Vapid02.from_pem(schluessel["privat"].encode())
    behalten, gesendet = [], 0
    for abo in abos:
        try:
            webpush(abo["abo"], data=json.dumps(daten, ensure_ascii=False), vapid_private_key=vapid,
                    vapid_claims={"sub": ABSENDER}, ttl=6 * 3600, timeout=30)
            gesendet += 1
            behalten.append(abo)
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):
                print(f"Abo abgelaufen, entfernt ({abo.get('geraet', '?')})")
                continue
            print(f"Senden fehlgeschlagen ({status}): {exc}", file=sys.stderr)
            behalten.append(abo)
    return behalten, gesendet


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ordner", type=Path, default=Path("erinnerung"))
    ap.add_argument("--jetzt", action="store_true", help="ohne Uhrzeit-Prüfung senden")
    args = ap.parse_args()

    pfad_schluessel = args.ordner / "vapid.json"
    schluessel = lesen(pfad_schluessel, None)
    if not schluessel:
        schluessel_erzeugen(pfad_schluessel)
        print("Schlüssel erzeugt. Jetzt in der App unter Mehr → Erinnerung einschalten.")
        return 0

    jetzt = dt.datetime.now(ZEITZONE)
    if not args.jetzt and jetzt.hour != STUNDE:
        print(f"Es ist {jetzt:%H:%M} in Berlin – gesendet wird um {STUNDE} Uhr.")
        return 0

    abos = lesen(args.ordner / "abos.json", [])
    if not abos:
        print("Noch kein Gerät hat die Erinnerung eingeschaltet.")
        return 0
    daten = nachricht(lesen(args.ordner / "stand.json", {}), jetzt.strftime("%Y-%m-%d"))
    if daten is None:
        print("Heute ist nichts fällig – keine Mitteilung.")
        return 0
    behalten, gesendet = senden(abos, daten, schluessel)
    print(f"{gesendet} Mitteilung(en) gesendet: {daten['text']}")
    if len(behalten) != len(abos):
        schreiben(args.ordner / "abos.json", behalten)
    return 0


if __name__ == "__main__":
    sys.exit(main())
