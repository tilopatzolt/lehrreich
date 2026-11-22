// Prüft die Kern-Logik: node wissenstrainer-v2/test/kern.test.mjs
import assert from "node:assert/strict";
import {
  tag, plusTage, woche, neuerStand, bewerten, zaehlen, bereichsStufe, paketFertig, bereichBeherrscht,
  figurPruefen, planWarteschlange, schwierigeKarten, freieKarten, faelligVorschau,
} from "../kern.js";

const heute = "2026-11-22"; // ein Sonntag
const aktiv = () => neuerStand("aktiv");

// Datum
assert.equal(plusTage("2026-12-31", 1), "2027-01-01");
assert.deepEqual(woche(heute), ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
assert.equal(woche("2026-11-16")[0], "2026-11-16");
assert.match(tag(), /^\d{4}-\d{2}-\d{2}$/);

// Bewerten: gewusst verlängert, nochmal holt zurück
let st = bewerten(aktiv(), "gewusst", heute);
assert.equal(st.iv, 1); assert.equal(st.faellig, "2026-11-23"); assert.equal(st.zuletzt, "gewusst");
st = bewerten(st, "gewusst", "2026-11-23");
assert.ok(st.iv >= 2);
const vorher = st.iv;
st = bewerten(st, "gewusst", "2026-11-25");
assert.ok(st.iv > vorher);
st = bewerten(st, "nochmal", "2026-12-01");
assert.equal(st.iv, 0); assert.equal(st.faellig, "2026-12-01"); assert.equal(st.fehler, 1); assert.equal(st.zuletzt, "nochmal");
// freies Üben ändert den Plan nicht, merkt aber das Ergebnis
const frei = bewerten({ ...aktiv(), wdh: 3, iv: 10, faellig: "2026-12-10", zuletzt: "nochmal" }, "gewusst", heute, { planen: false });
assert.equal(frei.faellig, "2026-12-10"); assert.equal(frei.iv, 10); assert.equal(frei.zuletzt, "gewusst");

// Stufen
const karten = Array.from({ length: 4 }, (_, i) => ({ id: `k${i}` }));
const gew = { ...aktiv(), wdh: 1, zuletzt: "gewusst", faellig: "2026-12-01" };
assert.equal(bereichsStufe(zaehlen([], {}, heute)), 1, "ohne Karten: Stufe 1");
assert.equal(bereichsStufe(zaehlen(karten, { k0: aktiv(), k1: aktiv(), k2: aktiv(), k3: aktiv() }, heute)), 1);
assert.equal(bereichsStufe(zaehlen(karten, { k0: gew, k1: aktiv(), k2: aktiv(), k3: aktiv() }, heute)), 2);
const alle = { k0: gew, k1: gew, k2: gew, k3: gew };
assert.equal(bereichsStufe(zaehlen(karten, alle, heute)), 3);
// Entwürfe und verworfene Karten zählen nicht mit
assert.equal(bereichsStufe(zaehlen(karten, { ...alle, k3: neuerStand("entwurf") }, heute)), 3);
assert.ok(paketFertig(zaehlen(karten, alle, heute)));
assert.ok(!paketFertig(zaehlen(karten, { ...alle, k3: aktiv() }, heute)));

// Aufstieg nur mit mindestens 20 gewussten Karten
const viele = Array.from({ length: 20 }, (_, i) => ({ id: `v${i}` }));
const st20 = Object.fromEntries(viele.map((k) => [k.id, gew]));
assert.ok(bereichBeherrscht(zaehlen(viele, st20, heute)));
assert.ok(!bereichBeherrscht(zaehlen(viele.slice(1), st20, heute)), "19 reichen nicht");
assert.ok(!bereichBeherrscht(zaehlen([...viele, { id: "x" }], { ...st20, x: aktiv() }, heute)), "nicht alles gewusst");

// Figur: jeder weitere Bereich eine Stufe, einmal erreicht bleibt, höchstens 7
let f = figurPruefen({ stufe: 1, bereiche: [] }, ["recht"]);
assert.equal(f.stufe, 2);
f = figurPruefen(f, []); // Recht nicht mehr vollständig (neue Karten): bleibt
assert.equal(f.stufe, 2);
f = figurPruefen(f, ["recht"]); // derselbe Bereich zählt nicht doppelt
assert.equal(f.stufe, 2);
f = figurPruefen(f, ["a", "b", "c", "d", "e", "f", "g"]);
assert.equal(f.stufe, 7);

// Lernrunde: fällige zuerst, dann neue bis zum Tageslimit
const ks = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}` }));
const sts = {
  p0: { ...aktiv(), wdh: 2, faellig: "2026-11-20", zuletzt: "nochmal", fehler: 2 },
  p1: { ...aktiv(), wdh: 2, faellig: "2026-11-22", zuletzt: "gewusst" },
  p2: { ...aktiv(), wdh: 2, faellig: "2026-11-30", zuletzt: "gewusst" },
  p3: aktiv(), p4: aktiv(), p5: neuerStand("entwurf"),
};
assert.deepEqual(planWarteschlange(ks, sts, heute, { neuProTag: 1 }).map((k) => k.id), ["p0", "p1", "p3"]);
assert.deepEqual(planWarteschlange(ks, sts, heute, { neuProTag: 5, neuHeuteSchon: 5 }).map((k) => k.id), ["p0", "p1"]);
assert.deepEqual(schwierigeKarten(ks, sts).map((k) => k.id), ["p0"]);
assert.deepEqual(freieKarten(ks, sts, () => 0.5).map((k) => k.id).slice(-2), ["p1", "p2"], "gewusste zuletzt");

// Vorschau für die Erinnerung: p0, p1 heute fällig, p2 am 30.11.; 2 neue Karten, 1 pro Tag
const vs = faelligVorschau(ks, sts, heute, { neuProTag: 1 }, 10);
assert.equal(vs["2026-11-22"], 3, "2 fällige + 1 neue");
assert.equal(vs["2026-11-23"], 3, "2 fällige + die zweite neue");
assert.equal(vs["2026-11-24"], 2, "keine neuen mehr");
assert.equal(vs["2026-11-30"], 3, "p2 kommt dazu");
assert.equal(faelligVorschau(ks, sts, heute, { neuProTag: 1, neuHeuteSchon: 1 }, 2)["2026-11-22"], 2, "heute schon neue gelernt");

console.log("Kern-Logik: alle Prüfungen bestanden");
