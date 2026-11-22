// Inhalte (Bereiche, Pakete, Karten) und Lernstand – nur im Browser, unter eigenen Schlüsseln.
// Die erste Version (wt.v1 …) wird nie verändert; gelesen wird sie nur einmal, wenn Tilo seinen
// Lernstand beim ersten Verbinden übernehmen möchte (github.js).
import {
  tag, plusTage, woche, neuerStand, zaehlen, bereichsStufe, paketFertig, bereichBeherrscht, figurPruefen,
} from "./kern.js";

const K = { inhalt: "wt2.inhalt", stand: "wt2.stand", einstellungen: "wt2.einstellungen" };
export const STANDARD = { rundenGroesse: 7, neuProTag: 10, modus: "auto" };

function lesen(key, ersatz) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : ersatz;
  } catch {
    return ersatz;
  }
}
function schreiben(key, wert) {
  try {
    localStorage.setItem(key, JSON.stringify(wert));
  } catch {
    /* privater Modus o. Ä.: läuft ohne Speichern weiter */
  }
}

export const db = {
  inhalt: null, // { bereiche, pakete, karten }
  // { karten: {id: Stand}, log: {tag: {gelernt, neu}}, figur: {stufe, bereiche}, zuckertuete,
  //   aenderungen: {id: {frage, antwort}}, pausiert: {paketId: true} }
  stand: null,
  einst: { ...STANDARD },
};

export async function laden() {
  db.einst = { ...STANDARD, ...lesen(K.einstellungen, {}) };
  db.inhalt = lesen(K.inhalt, null);
  db.stand = lesen(K.stand, null);
  if (!db.inhalt || !db.stand) await beispielLaden();
  inhaltSetzen(db.inhalt);
}

// Neuer Inhalt (Beispiel oder von GitHub): eigene Änderungen anwenden, neue Karten kommen zum Sichten
export function inhaltSetzen(inhalt) {
  db.inhalt = inhalt;
  db.stand.aenderungen ||= {};
  db.stand.pausiert ||= {};
  for (const k of db.inhalt.karten) {
    if (!db.stand.karten[k.id]) db.stand.karten[k.id] = neuerStand();
    const a = db.stand.aenderungen[k.id];
    if (a) Object.assign(k, Object.fromEntries(Object.entries(a).filter(([, v]) => v)));
  }
  figurAktualisieren();
  speichern();
}

export function karteAendern(k, frage, antwort) {
  db.stand.aenderungen[k.id] = { frage, antwort };
  Object.assign(k, { frage, antwort });
  speichern();
}

export function speichern() {
  schreiben(K.inhalt, db.inhalt);
  schreiben(K.stand, db.stand);
  schreiben(K.einstellungen, db.einst);
}

// Beispieldaten mit unterschiedlichem Lernstand, damit alle Stufen sichtbar sind
export async function beispielLaden() {
  const demo = await (await fetch("data/demo.json", { cache: "no-cache" })).json();
  const heute = tag();
  const stand = { karten: {}, log: {}, figur: { stufe: 1, bereiche: [] }, zuckertuete: 0, aenderungen: {}, pausiert: {} };
  const art = Object.fromEntries(demo.pakete.map((p) => [p.id, p.demo]));
  const proPaket = {};
  for (const k of demo.karten) {
    const i = (proPaket[k.paket] = (proPaket[k.paket] ?? -1) + 1);
    const st = neuerStand(art[k.paket] === "entwurf" ? "entwurf" : "aktiv");
    if (art[k.paket] === "gelernt" || (art[k.paket] === "teils" && i % 2 === 0)) {
      Object.assign(st, { wdh: 3, iv: 6 + (i % 5) * 3, zuletzt: "gewusst" });
      st.faellig = plusTage(heute, 2 + (i % 7) * 2);
    }
    if (art[k.paket] === "teils" && i % 2 === 1) {
      // teils: jede zweite Karte zuletzt nicht gewusst und heute wieder dran
      Object.assign(st, { wdh: 2, iv: 0, zuletzt: "nochmal", fehler: 1, faellig: heute });
    }
    stand.karten[k.id] = st;
  }
  // Lernserie: die zwei Tage vor heute (sofern in dieser Woche) als gelernt
  for (const t of [plusTage(heute, -1), plusTage(heute, -2)]) {
    if (woche(heute).includes(t)) stand.log[t] = { gelernt: 7, neu: 0 };
  }
  db.inhalt = {
    bereiche: demo.bereiche, pakete: demo.pakete.map(({ demo: _d, ...p }) => p), karten: demo.karten,
    beispiel: true,
  };
  db.stand = stand;
  figurAktualisieren();
  speichern();
}

export function allesZuruecksetzen() {
  for (const key of Object.values(K)) {
    try { localStorage.removeItem(key); } catch { /* egal */ }
  }
}

/* ---------- Abfragen ---------- */

export const bereich = (id) => db.inhalt.bereiche.find((b) => b.id === id);
export const paket = (id) => db.inhalt.pakete.find((p) => p.id === id);
export const karte = (id) => db.inhalt.karten.find((k) => k.id === id);
export const stand = (id) => db.stand.karten[id];
export const paketeVon = (bid) => db.inhalt.pakete.filter((p) => p.bereich === bid)
  .sort((a, b) => (b.basis ? 1 : 0) - (a.basis ? 1 : 0));
export const kartenVonPaket = (pid) => db.inhalt.karten.filter((k) => k.paket === pid);
export const kartenVonBereich = (bid) => {
  const ids = new Set(paketeVon(bid).map((p) => p.id));
  return db.inhalt.karten.filter((k) => ids.has(k.paket));
};
export const imPlan = (pid) => !db.stand.pausiert?.[pid];
export function pausieren(pid, aus) {
  if (aus) db.stand.pausiert[pid] = true;
  else delete db.stand.pausiert[pid];
  speichern();
}
export const planKarten = () => db.inhalt.karten.filter((k) => imPlan(k.paket));

export const zahlenPaket = (pid) => zaehlen(kartenVonPaket(pid), db.stand.karten, tag());
export const zahlenBereich = (bid) => zaehlen(kartenVonBereich(bid), db.stand.karten, tag());
export const stufeBereich = (bid) => bereichsStufe(zahlenBereich(bid));
export const fertigePakete = () => db.inhalt.pakete.filter((p) => paketFertig(zahlenPaket(p.id)));

export const heuteLog = () => db.stand.log[tag()] || { gelernt: 0, neu: 0 };

export function figurAktualisieren() {
  const vorher = db.stand.figur.stufe || 1;
  const jetzt = db.inhalt.bereiche.filter((b) => bereichBeherrscht(zahlenBereich(b.id))).map((b) => b.id);
  db.stand.figur = figurPruefen(db.stand.figur, jetzt);
  return db.stand.figur.stufe > vorher;
}

/* ---------- Ändern ---------- */

// Lernstand neu beginnen (beim Wechsel von Beispieldaten zu echten Daten), optional übernommen
export function standNeu(uebernommen) {
  db.stand = {
    karten: {}, log: {}, figur: { stufe: 1, bereiche: [] }, zuckertuete: 0, aenderungen: {}, pausiert: {},
    ...(uebernommen || {}),
  };
}

export function neuerBereich(name, kennung) {
  const basis = `${slug(name)}-${Date.now().toString(36)}`;
  const b = { id: basis, name, kennung };
  db.inhalt.bereiche.push(b);
  // jeder Bereich hat genau ein Basispaket, das wachsen darf
  db.inhalt.pakete.push({ id: `${basis}-basis`, bereich: basis, name: `Grundlagen ${name}`, basis: true, quellen: [] });
  speichern();
  return b;
}

export function slug(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bereich";
}
