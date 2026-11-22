// Kern-Logik des Wissenstrainers v2: Wiederholung, Stufen, Figur, Lernrunden.
// Reine Funktionen ohne Zugriff auf Bildschirm oder Speicher – so lassen sie sich einzeln prüfen.

export const MIN_GEWUSST_FUER_AUFSTIEG = 20;
export const MAX_STUFE = 7;

/* ---------- Datum ---------- */

// Tages-Schlüssel in Ortszeit, z. B. "2026-11-22"
export function tag(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function plusTage(t, n) {
  const [y, m, d] = t.split("-").map(Number);
  return tag(new Date(y, m - 1, d + n));
}

// Montag bis Sonntag der Woche, in der t liegt
export function woche(t) {
  const [y, m, d] = t.split("-").map(Number);
  const wt = (new Date(y, m - 1, d).getDay() + 6) % 7; // Montag = 0
  return Array.from({ length: 7 }, (_, i) => plusTage(t, i - wt));
}

/* ---------- Karten-Zustand ---------- */

// s: "entwurf" (noch sichten) · "aktiv" (behalten, wird gelernt) · "verworfen"
export function neuerStand(s = "entwurf") {
  return { s, faellig: null, iv: 0, ease: 2.5, wdh: 0, fehler: 0, zuletzt: null };
}

export const istAktiv = (st) => st?.s === "aktiv";
export const istGewusst = (st) => istAktiv(st) && st.zuletzt === "gewusst";
export const istNeu = (st) => istAktiv(st) && st.wdh === 0;
export const istFaellig = (st, heute) => istAktiv(st) && st.wdh > 0 && st.faellig <= heute;

// Zwei Bewertungen: "gewusst" verlängert den Abstand, "nochmal" holt die Karte zurück.
// planen = false (freies Üben einer nicht fälligen Karte): nur „zuletzt“ merken, Plan bleibt.
export function bewerten(st, urteil, heute, { planen = true } = {}) {
  const n = { ...st, zuletzt: urteil };
  if (!planen) return n;
  if (urteil === "gewusst") {
    n.iv = st.wdh === 0 || st.iv === 0 ? 1 : Math.max(st.iv + 1, Math.round(st.iv * st.ease));
    n.ease = Math.min(3, st.ease + 0.05);
  } else {
    n.iv = 0;
    n.ease = Math.max(1.3, st.ease - 0.2);
    n.fehler = st.fehler + 1;
  }
  n.wdh = st.wdh + 1;
  n.faellig = plusTage(heute, n.iv);
  return n;
}

/* ---------- Zählen ---------- */

// zaehlen(karten, staende, heute) → { aktiv, gewusst, faellig, neu, entwurf }
export function zaehlen(karten, staende, heute) {
  const z = { aktiv: 0, gewusst: 0, faellig: 0, neu: 0, entwurf: 0 };
  for (const k of karten) {
    const st = staende[k.id];
    if (st?.s === "entwurf") z.entwurf++;
    if (!istAktiv(st)) continue;
    z.aktiv++;
    if (istGewusst(st)) z.gewusst++;
    if (istFaellig(st, heute)) z.faellig++;
    if (istNeu(st)) z.neu++;
  }
  return z;
}

// Stufe eines Bereichs auf der Landkarte:
// 1 nichts gelernt (auch ohne Karten) · 2 teils gelernt · 3 alles gelernt und gewusst (nur mit Karten)
export function bereichsStufe(z) {
  if (z.aktiv === 0 || z.gewusst === 0) return 1;
  return z.gewusst === z.aktiv ? 3 : 2;
}

// Paket fertig = alle behaltenen Karten gewusst → Buch im Regal
export const paketFertig = (z) => z.aktiv > 0 && z.gewusst === z.aktiv;

// Bereich zählt für den Aufstieg der Figur
export const bereichBeherrscht = (z) => bereichsStufe(z) === 3 && z.gewusst >= MIN_GEWUSST_FUER_AUFSTIEG;

// Figur: Stufe = 1 + Zahl der Bereiche, die je einmal beherrscht waren (höchstens 7).
// Einmal erreicht bleibt: bereits gezählte Bereiche werden nie wieder entfernt.
export function figurPruefen(figur, beherrschteJetzt) {
  const liste = [...new Set([...(figur.bereiche || []), ...beherrschteJetzt])];
  const stufe = Math.min(MAX_STUFE, 1 + liste.length);
  return { bereiche: liste, stufe: Math.max(figur.stufe || 1, stufe) };
}

/* ---------- Lernrunden ---------- */

// Täglicher Plan: fällige Karten zuerst (die am längsten überfälligen vorn), dann neue bis zum Tageslimit.
export function planWarteschlange(karten, staende, heute, { neuProTag = 10, neuHeuteSchon = 0 } = {}) {
  const faellig = karten.filter((k) => istFaellig(staende[k.id], heute))
    .sort((a, b) => staende[a.id].faellig.localeCompare(staende[b.id].faellig));
  const frei = Math.max(0, neuProTag - neuHeuteSchon);
  const neu = karten.filter((k) => istNeu(staende[k.id])).slice(0, frei);
  return [...faellig, ...neu];
}

// Wiederholungstrainer: Karten, die zuletzt nicht gewusst wurden, die schwierigsten zuerst
export function schwierigeKarten(karten, staende) {
  return karten.filter((k) => istAktiv(staende[k.id]) && staende[k.id].zuletzt === "nochmal")
    .sort((a, b) => staende[b.id].fehler - staende[a.id].fehler);
}

// Freies Üben: alle behaltenen Karten, ungewusste zuerst, sonst zufällig
export function freieKarten(karten, staende, zufall = Math.random) {
  return karten.filter((k) => istAktiv(staende[k.id]))
    .map((k) => [istGewusst(staende[k.id]) ? 1 : 0, zufall(), k])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map((x) => x[2]);
}

// Fällige Karten je Tag für die nächsten Tage (für die tägliche Erinnerung um 10 Uhr):
// alle bis dahin fälligen Wiederholungen plus die neuen Karten, die der Plan an dem Tag zulässt.
// Grobe Vorschau: Was heute gelernt wird, verschiebt die Zahlen beim nächsten Melden.
export function faelligVorschau(karten, staende, heute, { neuProTag = 10, neuHeuteSchon = 0 } = {}, tage = 14) {
  const faellig = karten.map((k) => staende[k.id]).filter((st) => istAktiv(st) && st.wdh > 0).map((st) => st.faellig).sort();
  let neu = karten.filter((k) => istNeu(staende[k.id])).length;
  const ergebnis = {};
  for (let i = 0; i < tage; i++) {
    const t = plusTage(heute, i);
    const neuHeute = Math.min(neu, Math.max(0, neuProTag - (i === 0 ? neuHeuteSchon : 0)));
    ergebnis[t] = faellig.filter((f) => f <= t).length + neuHeute;
    neu -= neuHeute;
  }
  return ergebnis;
}
