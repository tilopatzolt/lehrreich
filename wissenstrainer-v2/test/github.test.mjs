// Prüft die Umwandlung der Pakete und die Übernahme des Lernstands: node wissenstrainer-v2/test/github.test.mjs
import assert from "node:assert/strict";
import { umwandeln, standUebernehmen, lernstandUebernehmen, bereichAnlegen, paketId, SAMMELBEREICH } from "../github.js";

// Ordnername → Kennung wie in pipeline/extract.py
assert.equal(paketId("Qualitätsstrategie Senat"), "qualitaetsstrategie-senat");
assert.equal(paketId("ISQ und BliQ"), "isq-und-bliq");
assert.equal(paketId("Grundlagen Schülerinnen"), "grundlagen-schuelerinnen");
assert.equal(bereichAnlegen("schueler", "Schüler:innen", "schueler").basisOrdner, "Grundlagen Schülerinnen", "kein Doppelpunkt im Ordnernamen");

// Umwandeln: Zuordnung, Sammelbereich, Basispakete, geteilte Kopien nicht doppelt
const bd = {
  bereiche: [bereichAnlegen("senatsverwaltung", "Senatsverwaltung", "senatsverwaltung"), bereichAnlegen("bauplatz", "Bauplatz und Segelboot", "bauplatz")],
  zuordnung: { "qualitaetsstrategie-senat": "senatsverwaltung" },
};
const privat = [
  { id: "qualitaetsstrategie-senat", name: "Qualitätsstrategie Senat", sources: [{ id: "s1", title: "Strategie", organisation: "SenBJF", status: "ok", image: { thumb: "t.jpg", creator: "X", license: "CC BY" } }],
    cards: [{ id: "c1", source: "s1", front: "F?", back: "A.", tipp: "Tipp", explanation: "Einordnung" }] },
  { id: "flexmaster", name: "Flexmaster", sources: [], cards: [{ id: "c2", source: "", front: "F2?", back: "A2." }] },
];
const oeffentlich = [
  { id: "qualitaetsstrategie-senat", name: "Kopie", published_from_private: true, sources: [], cards: [{ id: "c1", front: "x", back: "y" }] },
  { id: "klimageld", name: "Klimageld", sources: [], cards: [{ id: "c3", front: "F3?", back: "A3." }] },
];
const i = umwandeln(bd, privat, oeffentlich);
const p = (id) => i.pakete.find((x) => x.id === id);
assert.equal(p("qualitaetsstrategie-senat").bereich, "senatsverwaltung");
assert.equal(p("flexmaster").bereich, SAMMELBEREICH, "ohne Zuordnung in den Sammelbereich");
assert.equal(p("klimageld").herkunft, "oeffentlich");
assert.equal(i.karten.filter((k) => k.id === "c1").length, 1, "geteilte Kopie nicht doppelt");
assert.equal(p("qualitaetsstrategie-senat").foto.thumb, "t.jpg");
assert.ok(p("grundlagen-senatsverwaltung").basis, "leeres Basispaket je Bereich");
const c1 = i.karten.find((k) => k.id === "c1");
assert.deepEqual([c1.frage, c1.antwort, c1.quelle, c1.tipp, c1.einordnung], ["F?", "A.", "SenBJF: Strategie", "Tipp", "Einordnung"]);

// Lernstand: 4 Bewertungen → gewusst / nochmal
const due = new Date(2026, 11, 3, 0, 0).getTime();
assert.deepEqual(standUebernehmen({ status: "new" }).s, "entwurf");
assert.deepEqual(standUebernehmen({ status: "rejected" }).s, "verworfen");
const neu = standUebernehmen({ status: "active" });
assert.equal(neu.s, "aktiv"); assert.equal(neu.wdh, 0, "behalten, noch nicht gelernt = neu");
const gut = standUebernehmen({ status: "active", srs: { reps: 3, interval: 8, ease: 2.6, lapses: 1, due } });
assert.deepEqual([gut.zuletzt, gut.wdh, gut.iv, gut.fehler, gut.faellig], ["gewusst", 4, 8, 1, "2026-12-03"]);
const nochmal = standUebernehmen({ status: "active", srs: { reps: 0, interval: 0, ease: 2.3, lapses: 2, due } });
assert.equal(nochmal.zuletzt, "nochmal");

const alt = {
  cards: { c1: { status: "active", srs: { reps: 2, interval: 3, ease: 2.5, lapses: 0, due }, edits: { front: "Neu?", back: "Neu." } } },
  log: { "2026-11-20": { reviews: 9, fresh: 3, again: 1 } },
  settings: { skip: { flexmaster: true } },
};
const u = lernstandUebernehmen(alt);
assert.equal(u.karten.c1.zuletzt, "gewusst");
assert.deepEqual(u.aenderungen.c1, { frage: "Neu?", antwort: "Neu." });
assert.deepEqual(u.log["2026-11-20"], { gelernt: 9, neu: 3 });
assert.deepEqual(u.pausiert, { flexmaster: true });

console.log("GitHub-Umwandlung und Übernahme: alle Prüfungen bestanden");
