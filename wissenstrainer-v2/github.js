// Verbindung zu GitHub: Pakete laden, Bereiche-Zuordnung (bereiche.json im privaten Repo), Hochladen.
// Die Pakete selbst (karten/*.json) schreibt weiterhin die Auswertung – dasselbe Format wie für die erste Version.
import { tag, neuerStand } from "./kern.js";

const SCHLUESSEL = "wt2.github";
const PRIVAT = { docs: "privat", data: "karten", bereiche: "bereiche.json" };
const OEFFENTLICH = { data: "wissenstrainer/app/data/pakete" };

export const verbindung = {
  token: "", privatRepo: "tilopatzolt/wissenstrainer-privat", oeffentlichRepo: "tilopatzolt/lehrreich", branch: "main",
};
try { Object.assign(verbindung, JSON.parse(localStorage.getItem(SCHLUESSEL) || "{}")); } catch { /* ohne Speicher */ }

export const verbunden = () => !!verbindung.token;
export function verbindungSpeichern(daten) {
  Object.assign(verbindung, daten);
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(verbindung)); } catch { /* egal */ }
}
export function trennen() {
  verbindung.token = "";
  try { localStorage.removeItem(SCHLUESSEL); } catch { /* egal */ }
}

/* ---------- GitHub-API ---------- */

function gh(repo, pfad, opts = {}) {
  return fetch(`https://api.github.com/repos/${repo}${pfad ? `/${pfad}` : ""}`, {
    ...opts,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${verbindung.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
}
const kodiert = (p) => p.split("/").map(encodeURIComponent).join("/");
const ref = () => `?ref=${encodeURIComponent(verbindung.branch)}`;

async function liste(repo, ordner) {
  const res = await gh(repo, `contents/${kodiert(ordner)}${ref()}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`${repo}: ${res.status}`);
  return (await res.json()).filter((f) => f.type === "file" && f.name.endsWith(".json") && f.name !== "index.json");
}

async function roh(repo, pfad) {
  const res = await gh(repo, `contents/${kodiert(pfad)}${ref()}`, { headers: { Accept: "application/vnd.github.raw+json" }, cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${pfad}: ${res.status}`);
  return res.json();
}

async function schreiben(repo, pfad, base64, nachricht) {
  let sha;
  const alt = await gh(repo, `contents/${kodiert(pfad)}${ref()}`, { cache: "no-store" });
  if (alt.ok) sha = (await alt.json()).sha;
  const res = await gh(repo, `contents/${kodiert(pfad)}`, {
    method: "PUT",
    body: JSON.stringify({ message: nachricht, content: base64, branch: verbindung.branch, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) {
    const f = await res.json().catch(() => ({}));
    throw new Error(f.message || `HTTP ${res.status}`);
  }
}

async function loeschen(repo, pfad, nachricht) {
  const alt = await gh(repo, `contents/${kodiert(pfad)}${ref()}`, { cache: "no-store" });
  if (alt.status === 404) return;
  if (!alt.ok) throw new Error(`HTTP ${alt.status}`);
  const { sha } = await alt.json();
  const res = await gh(repo, `contents/${kodiert(pfad)}`, {
    method: "DELETE", body: JSON.stringify({ message: nachricht, sha, branch: verbindung.branch }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export function textBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function dateiBase64(datei) {
  return new Promise((ok, fehler) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = () => fehler(r.error);
    r.readAsDataURL(datei);
  });
}

// Prüft den Schlüssel: Zugriff auf beide Repositorys?
export async function pruefen() {
  for (const repo of [verbindung.privatRepo, verbindung.oeffentlichRepo]) {
    const res = await gh(repo, "");
    if (!res.ok) throw new Error(`${repo}: ${res.status === 404 || res.status === 403 ? "nicht gefunden oder kein Zugriff" : res.status}`);
  }
}

/* ---------- Bereiche ---------- */

// Gleiche Regel wie die Auswertung (pipeline/extract.py): Ordnername → Paket-Kennung
export function paketId(name) {
  return String(name).toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "paket";
}

const STANDARD_BEREICHE = [
  ["schule", "Schule", "schule"], ["lehrkraefte", "Lehrkräfte", "lehrkraefte"],
  ["universitaeten", "Universitäten & Wissenschaft", "universitaeten"], ["senatsverwaltung", "Senatsverwaltung", "senatsverwaltung"],
  ["recht", "Recht", "recht"], ["schueler", "Schüler:innen", "schueler"],
  ["lebenslang", "Berufsbildung und lebenslanges Lernen", "lebenslang"], ["bildungsreise", "Bildungsreise", "allgemein"],
];
// offener Sammelbereich am Steg: Pakete ohne Zuordnung landen hier
export const SAMMELBEREICH = "bildungsreise";

export function bereichAnlegen(id, name, kennung) {
  // Ordnernamen ohne Doppelpunkt (unter Windows nicht erlaubt): „Schüler:innen“ → „Schülerinnen“
  const ordner = `Grundlagen ${name.replace(/[:\\/]+/g, "")}`;
  return { id, name, kennung, basisOrdner: ordner, basis: paketId(ordner) };
}

function standardBereiche() {
  return {
    version: 1,
    hinweis: "Zuordnung der Pakete zu Bereichen für den Wissenstrainer v2. Wird von der App gepflegt.",
    bereiche: STANDARD_BEREICHE.map(([id, name, kennung]) => bereichAnlegen(id, name, kennung)),
    zuordnung: { "qualitaetsstrategie-senat": "senatsverwaltung", "isq-und-bliq": "senatsverwaltung", migration: "schueler" },
  };
}

let bereicheDatei = null;
export const bereicheStand = () => bereicheDatei;

export async function bereicheSpeichern(nachricht) {
  await schreiben(verbindung.privatRepo, PRIVAT.bereiche, textBase64(JSON.stringify(bereicheDatei, null, 1) + "\n"), nachricht);
}

// Paket in einen anderen Bereich legen (nur die Zuordnung ändert sich, Ordner und Karten bleiben)
export async function paketZuordnen(pid, bereichId, paketName, bereichName) {
  if (!bereicheDatei) bereicheDatei = await roh(verbindung.privatRepo, PRIVAT.bereiche);
  if (!bereicheDatei) throw new Error("bereiche.json fehlt");
  bereicheDatei.zuordnung[pid] = bereichId;
  await bereicheSpeichern(`Wissenstrainer v2: Paket „${paketName}“ → ${bereichName}`);
}

/* ---------- Laden ---------- */

// Pakete im Format der ersten Version → Inhalt der zweiten Version (Bereich → Paket → Karten)
export function umwandeln(bd, privat, oeffentlich) {
  const pakete = [];
  const karten = [];
  const geteilt = new Set(oeffentlich.filter((p) => p.published_from_private).map((p) => p.id));
  const nimm = (p, herkunft) => {
    const ids = new Set(bd.bereiche.map((b) => b.id));
    const ziel = bd.zuordnung[p.id] || bd.bereiche.find((b) => b.basis === p.id)?.id;
    const bereich = ids.has(ziel) ? ziel : ids.has(SAMMELBEREICH) ? SAMMELBEREICH : bd.bereiche.at(-1)?.id;
    const quellen = Object.fromEntries((p.sources || []).map((s) => [s.id, s]));
    const bild = p.image === false ? null : p.image?.thumb ? p.image : (p.sources || []).find((s) => s.image?.thumb)?.image;
    pakete.push({
      id: p.id, bereich, name: p.name, herkunft,
      basis: bd.bereiche.some((b) => b.basis === p.id),
      ...(herkunft === "privat" && geteilt.has(p.id) ? { geteilt: true } : {}),
      ...(bild ? { foto: { thumb: bild.thumb, creator: bild.creator, license: bild.license, page: bild.page, query: bild.query } } : {}),
      quellen: (p.sources || []).filter((s) => s.status !== "fehler").map((s) => ({ titel: s.title || s.file, herausgeber: s.organisation || "" })),
    });
    for (const c of p.cards || []) {
      const q = quellen[c.source];
      karten.push({
        id: c.id, paket: p.id, frage: c.front, antwort: c.back,
        quelle: q ? [q.organisation, q.title].filter(Boolean).join(": ") : "",
        ...(c.tipp ? { tipp: c.tipp } : {}), ...(c.explanation ? { einordnung: c.explanation } : {}),
        ...(c.quote ? { zitat: c.quote } : {}), ...(c.type ? { typ: c.type } : {}), ...(c.topic ? { thema: c.topic } : {}),
      });
    }
  };
  for (const p of privat) nimm(p, "privat");
  const eigene = new Set(privat.map((p) => p.id));
  // geteilte Kopien eigener Pakete nicht doppelt zeigen
  for (const p of oeffentlich) if (!p.published_from_private && !eigene.has(p.id)) nimm(p, "oeffentlich");
  // Basispakete gibt es auch ohne Datei (noch leer)
  for (const b of bd.bereiche) {
    if (!pakete.some((p) => p.id === b.basis)) pakete.push({ id: b.basis, bereich: b.id, name: b.basisOrdner, basis: true, quellen: [] });
  }
  return {
    bereiche: bd.bereiche.map(({ id, name, kennung, basis, foto }) => ({ id, name, kennung, basis, ...(foto ? { foto } : {}) })),
    pakete, karten, beispiel: false,
  };
}

export async function inhaltLaden() {
  bereicheDatei = await roh(verbindung.privatRepo, PRIVAT.bereiche);
  if (!bereicheDatei) {
    bereicheDatei = standardBereiche();
    await bereicheSpeichern("Wissenstrainer v2: Bereiche angelegt");
  }
  const [pd, od] = await Promise.all([liste(verbindung.privatRepo, PRIVAT.data), liste(verbindung.oeffentlichRepo, OEFFENTLICH.data)]);
  const [privat, oeffentlich] = await Promise.all([
    Promise.all(pd.map((f) => roh(verbindung.privatRepo, f.path))),
    Promise.all(od.map((f) => roh(verbindung.oeffentlichRepo, f.path))),
  ]);
  return umwandeln(bereicheDatei, privat.filter(Boolean), oeffentlich.filter(Boolean));
}

/* ---------- Hochladen ---------- */

const sauber = (n) => n.normalize("NFC").replace(/\s*:\s*/g, " - ").replace(/[\\/]+/g, "-").replace(/[^\p{L}\p{N}._ -]+/gu, "_").replace(/\s+/g, " ").trim();

// Neues Paket (eigener Ordner) oder zum Basispaket des Bereichs
export async function hochladen({ bereich, ziel, titel, text, datei, vorhandeneIds }) {
  const b = bereicheDatei.bereiche.find((x) => x.id === bereich);
  let ordner = ziel === "basis" ? b.basisOrdner : sauber(titel);
  if (ziel !== "basis") {
    // Pakete bleiben, wie sie sind: gibt es den Namen schon, wird ein neues Paket daraus
    let n = 2;
    const basisName = ordner;
    while (vorhandeneIds.has(paketId(ordner))) ordner = `${basisName} ${n++}`;
    bereicheDatei.zuordnung[paketId(ordner)] = bereich;
    await bereicheSpeichern(`Wissenstrainer v2: Paket „${ordner}“ → ${b.name}`);
  }
  const name = datei ? sauber(datei.name) : `${tag()} ${sauber(titel).slice(0, 60).replace(/[\s.]+$/, "")}.md`;
  const inhalt = datei ? await dateiBase64(datei) : textBase64(`# ${titel}\n\n${text.trim()}\n`);
  await schreiben(verbindung.privatRepo, `${PRIVAT.docs}/${ordner}/${name}`, inhalt, `Wissenstrainer: ${name} → ${ordner}`);
  return { ordner, id: paketId(ordner) };
}

/* ---------- Bild, Teilen ---------- */

// Wo die Datei eines Pakets liegt (eigene Ablage) und wo seine geteilte Kopie liegt
const paketPfad = (p) => p.herkunft === "oeffentlich"
  ? { repo: verbindung.oeffentlichRepo, pfad: `${OEFFENTLICH.data}/${p.id}.json` }
  : { repo: verbindung.privatRepo, pfad: `${PRIVAT.data}/${p.id}.json` };
const kopiePfad = (p) => ({ repo: verbindung.oeffentlichRepo, pfad: `${OEFFENTLICH.data}/${p.id}.json` });

// Bild eines Pakets speichern (false = bewusst kein Bild), auch in der geteilten Kopie
export async function paketBildSpeichern(p, bild) {
  const ziele = [paketPfad(p), ...(p.geteilt ? [kopiePfad(p)] : [])];
  let geschrieben = 0;
  for (const { repo, pfad } of ziele) {
    const daten = await roh(repo, pfad);
    if (!daten) continue;
    daten.image = bild;
    await schreiben(repo, pfad, textBase64(JSON.stringify(daten, null, 1) + "\n"), `Wissenstrainer: Bild für „${p.name}“ ${bild ? "gewählt" : "entfernt"}`);
    geschrieben++;
  }
  if (!geschrieben) throw new Error("Das Paket hat noch keine Karten");
}

// Behaltene Karten eines privaten Pakets öffentlich teilen – nur Karten und Metadaten, keine Dokumente
export async function paketTeilen(p, behalten, aenderungen) {
  const quelle = await roh(verbindung.privatRepo, `${PRIVAT.data}/${p.id}.json`);
  if (!quelle) throw new Error("Das Paket hat noch keine Karten");
  const karten = quelle.cards.filter((c) => behalten.has(c.id)).map((c) => {
    const a = aenderungen[c.id];
    return a ? { ...c, front: a.frage || c.front, back: a.antwort || c.back } : c;
  });
  if (!karten.length) throw new Error("Noch keine behaltenen Karten");
  const genutzt = new Set(karten.map((c) => c.source));
  const kopie = {
    version: 2, id: p.id, name: quelle.name, visibility: "oeffentlich", published_from_private: true,
    updated: new Date().toISOString(),
    sources: (quelle.sources || []).filter((s) => genutzt.has(s.id)).map((s) => ({
      id: s.id, title: s.title, authors: s.authors, organisation: s.organisation, published: s.published,
      doc_type: s.doc_type, summary: s.summary, core_thesis: s.core_thesis, added: s.added, status: "ok",
      ...(s.image ? { image: s.image } : {}),
      card_count: karten.filter((c) => c.source === s.id).length,
    })),
    ...(quelle.image !== undefined ? { image: quelle.image } : {}),
    cards: karten,
  };
  const { repo, pfad } = kopiePfad(p);
  await schreiben(repo, pfad, textBase64(JSON.stringify(kopie, null, 1) + "\n"), `Wissenstrainer: Paket „${p.name}“ geteilt`);
}

export async function paketNichtTeilen(p) {
  const { repo, pfad } = kopiePfad(p);
  await loeschen(repo, pfad, `Wissenstrainer: Paket „${p.name}“ nicht mehr geteilt`);
}

// Link zum öffentlichen Paket – die erste Version zeigt öffentliche Pakete auch ohne Schlüssel
export const paketLink = (p) => `https://${verbindung.oeffentlichRepo.split("/")[0]}.github.io/${verbindung.oeffentlichRepo.split("/")[1]}/#/paket/${encodeURIComponent(p.id)}`;

/* ---------- Lernstand aus der ersten Version ---------- */

// Nur lesen: die erste Version und ihr Speicher bleiben unverändert.
export function ersteVersion() {
  let st = null;
  let gh1 = null;
  try { st = JSON.parse(localStorage.getItem("wt.v1") || "null"); } catch { /* nichts */ }
  try { gh1 = JSON.parse(localStorage.getItem("wt.github") || "null"); } catch { /* nichts */ }
  const karten = st?.cards ? Object.values(st.cards) : [];
  return {
    token: gh1?.token ? { token: gh1.token, privatRepo: gh1.privateRepo || verbindung.privatRepo, oeffentlichRepo: gh1.publicRepo || gh1.repo || verbindung.oeffentlichRepo, branch: gh1.branch || "main" } : null,
    stand: st,
    gelernt: karten.filter((c) => c.srs && c.srs.reps + c.srs.lapses > 0).length,
    gesichtet: karten.filter((c) => c.status === "active" || c.status === "rejected").length,
  };
}

// Kartenzustand der ersten Version (4 Bewertungen) → zweite Version (gewusst / nochmal)
export function standUebernehmen(alt) {
  const s = alt.status === "active" ? "aktiv" : alt.status === "rejected" ? "verworfen" : "entwurf";
  const n = neuerStand(s);
  const r = alt.srs;
  if (r && r.reps + r.lapses > 0) {
    Object.assign(n, {
      wdh: r.reps + r.lapses,
      iv: r.interval || 0,
      ease: r.ease || 2.5,
      fehler: r.lapses || 0,
      faellig: r.due ? tag(new Date(r.due)) : tag(),
      // „nochmal“ setzt in der ersten Version die Wiederholungen auf 0 zurück
      zuletzt: r.reps === 0 ? "nochmal" : "gewusst",
    });
  }
  return n;
}

export function lernstandUebernehmen(alt) {
  const karten = {};
  const aenderungen = {};
  for (const [id, c] of Object.entries(alt.cards || {})) {
    karten[id] = standUebernehmen(c);
    if (c.edits?.front || c.edits?.back) aenderungen[id] = { frage: c.edits.front, antwort: c.edits.back };
  }
  const log = {};
  for (const [t, l] of Object.entries(alt.log || {})) log[t] = { gelernt: l.reviews || 0, neu: l.fresh || 0 };
  const pausiert = { ...(alt.settings?.skip || {}) };
  return { karten, aenderungen, log, pausiert };
}
