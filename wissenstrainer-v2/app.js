// Wissenstrainer v2 – Bildschirme. Aussehen nach design/DESIGN.md, Aufbau nach design/05 Skizzen Aufbau.html.
import {
  tag, woche, istNeu, istFaellig, bewerten, paketFertig,
  planWarteschlange, schwierigeKarten, freieKarten, MAX_STUFE,
} from "./kern.js";
import {
  db, laden, speichern, beispielLaden, allesZuruecksetzen, bereich, paket, karte, stand,
  paketeVon, kartenVonPaket, kartenVonBereich, planKarten, zahlenPaket, zahlenBereich, stufeBereich,
  fertigePakete, heuteLog, figurAktualisieren, neuerBereich, inhaltSetzen, karteAendern, pausieren, standNeu, imPlan,
} from "./daten.js";
import {
  verbunden, verbindung, verbindungSpeichern, trennen, pruefen, inhaltLaden, hochladen, ersteVersion,
  lernstandUebernehmen, bereicheStand, bereicheSpeichern, bereichAnlegen, paketId, SAMMELBEREICH,
} from "./github.js";

const APP_STAND = "22.11.2026b";

/* ============================================================
   Hilfen
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mehrzahl = (n, eins, viele) => `${n} ${n === 1 ? eins : viele}`;
const modus = () => document.documentElement.dataset.theme === "nacht" ? "nacht" : "tag";

// Phosphor Icons (MIT), Stärke „Fill“; Kreuz, Plus und Minus in „Bold“, weil ihre Fill-Fassung ein gefülltes Quadrat ist
const PH = {
  zurueck: '<path d="M168,48V208a8,8,0,0,1-13.66,5.66l-80-80a8,8,0,0,1,0-11.32l80-80A8,8,0,0,1,168,48Z"/>',
  schliessen: '<path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"/>',
  plus: '<path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"/>',
  minus: '<path d="M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128Z"/>',
  auf: '<path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,48,88H208a8,8,0,0,1,5.66,13.66Z"/>',
  suche: '<path d="M168,112a56,56,0,1,1-56-56A56,56,0,0,1,168,112Zm61.66,117.66a8,8,0,0,1-11.32,0l-50.06-50.07a88,88,0,1,1,11.32-11.31l50.06,50.06A8,8,0,0,1,229.66,229.66ZM112,184a72,72,0,1,0-72-72A72.08,72.08,0,0,0,112,184Z"/>',
};
const ic = (name) => `<svg class="ic" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${PH[name]}</svg>`;

// Klotz-Zeichen der vier Reiter: Kreis, vier Quadrate, Dreieck, Bogen
const REITER = [
  { id: "welt", name: "Welt", svg: '<circle cx="12" cy="12" r="10"/>' },
  { id: "bereiche", name: "Bereiche", svg: '<rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/>' },
  { id: "ueben", name: "Üben", svg: '<path d="M12 2.5 22.5 21h-21z"/>' },
  { id: "mehr", name: "Mehr", svg: '<path d="M2 22V12a10 10 0 0 1 20 0v10h-6.5v-8a3.5 3.5 0 0 0-7 0v8z"/>' },
];

/* ============================================================
   Bilder: Plätze, Dateien, Tausch (DESIGN.md Abschnitt 9)
   ============================================================ */

const STUFEN_WORT = { 1: "nichts gelernt", 2: "teils gelernt", 3: "alles gelernt" };
const FIGUR_SKALA = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];
const NACHT = "var(--nacht-filter)";
const SCHEIN = "var(--schein-bild)";

// Die einzige Stelle, die weiß, welche Datei wann gilt.
// Liefert die Dateien in der Ersatz-Reihenfolge und, falls keine da ist, den Platzhalter.
export function bildpfad(art, o, m) {
  const nacht = m === "nacht";
  const k = [];
  if (art === "bereich") {
    const s = o.stufe;
    for (const id of o.kennung === "allgemein" ? ["allgemein"] : [o.kennung, "allgemein"]) {
      const tagBild = `bereich-${id}-s${s}-tag.webp`;
      if (!nacht || s === 1) k.push({ src: tagBild, filter: nacht ? NACHT : "none" });
      else k.push({ src: `bereich-${id}-s${s}-nacht.webp`, filter: s === 3 ? SCHEIN : "none" }, { src: tagBild, filter: NACHT });
    }
    return { k, platz: { typ: "text", text: o.name, zusatz: STUFEN_WORT[s] } };
  }
  if (art === "figur") {
    const n = o.stufe;
    if (o.zustand === "jubel") k.push({ src: `figur-s${n}-jubel.webp`, filter: nacht ? NACHT : "none" });
    else if (nacht) k.push({ src: `figur-s${n}-nacht.webp`, filter: "none" }, { src: `figur-s${n}-tag.webp`, filter: NACHT });
    else k.push({ src: `figur-s${n}-tag.webp`, filter: "none" });
    return { k, platz: { typ: "text", text: "Figur", zusatz: o.klein ? "" : `Stufe ${n}${o.zustand === "jubel" ? " jubelt" : ""}`, rund: o.klein } };
  }
  if (art === "laterne") {
    if (o.an && nacht) k.push({ src: "laterne-an-nacht.webp", filter: SCHEIN }, { src: "laterne-an-tag.webp", filter: NACHT });
    else k.push({ src: `laterne-${o.an ? "an" : "aus"}-tag.webp`, filter: nacht ? NACHT : "none" });
    return { k, platz: { typ: "laterne", an: o.an } };
  }
  // Regal, Bücher, offenes Buch, Gaben: je eine Datei, nachts abgedunkelt
  const datei = { regal: "regal", buch: `buch-${o.nummer}`, "buch-offen": "buch-offen", gabe: `gabe-${o.nummer}` }[art];
  k.push({ src: `${datei}.webp`, filter: nacht ? NACHT : "none" });
  const platz = art === "buch" ? { typ: "buch", nummer: o.nummer }
    : art === "gabe" ? { typ: "gabe" }
      : art === "buch-offen" ? { typ: "buch", nummer: 4 }
        : { typ: "text", text: "Regal" };
  return { k, platz };
}

const fehlend = new Set(); // Dateien, die es (noch) nicht gibt – nicht immer wieder anfragen

function platzHTML(p) {
  if (p.typ === "laterne") return `<span class="platz-laterne ${p.an ? "an" : ""}"><i></i></span>`;
  if (p.typ === "buch") return `<span class="platz-buch f${p.nummer}"></span>`;
  if (p.typ === "gabe") return `<span class="platz"></span>`;
  return `<span class="platz ${p.rund ? "rund" : ""}">${esc(p.text)}${p.zusatz ? `<br>${esc(p.zusatz)}` : ""}</span>`;
}

function bildHTML(art, o = {}, stil = "") {
  const { k, platz } = bildpfad(art, o, modus());
  const offen = k.filter((x) => !fehlend.has(x.src));
  const skala = art === "figur" ? `--skala:${FIGUR_SKALA[(o.stufe || 1) - 1]};` : "";
  const inhalt = offen.length
    ? `<img src="img/${offen[0].src}" alt="" decoding="async" style="filter:${offen[0].filter}" data-rest="${esc(JSON.stringify(offen.slice(1)))}" onerror="wtBildFehlt(this)">`
    : platzHTML(platz);
  return `<span class="bild ${art}" style="${skala}${stil}" data-platz="${esc(JSON.stringify(platz))}">${inhalt}</span>`;
}

// Ersatz-Reihenfolge: nächste Datei versuchen, zuletzt Platzhalter
window.wtBildFehlt = (img) => {
  fehlend.add(img.getAttribute("src").replace(/^img\//, ""));
  const rest = JSON.parse(img.dataset.rest || "[]").filter((x) => !fehlend.has(x.src));
  if (rest.length) {
    img.dataset.rest = JSON.stringify(rest.slice(1));
    img.style.filter = rest[0].filter;
    img.src = `img/${rest[0].src}`;
  } else {
    const box = img.parentNode;
    box.innerHTML = platzHTML(JSON.parse(box.dataset.platz));
  }
};

function fotoHTML(foto, klasse) {
  return `<img class="bildfoto ${klasse || ""}" src="${esc(foto.thumb)}" alt="" referrerpolicy="no-referrer" decoding="async" onerror="this.remove()">`;
}
function nachweis(foto) {
  const wer = [foto.creator, foto.license].filter(Boolean).map(esc).join(", ");
  return foto.page ? `<a href="${esc(foto.page)}" target="_blank" rel="noopener">Foto: ${wer || "Quelle"}</a>` : `<span>Foto: ${wer}</span>`;
}

/* ============================================================
   Modus Tag/Nacht
   ============================================================ */

const dunkel = matchMedia("(prefers-color-scheme: dark)");
function modusAnwenden() {
  const m = db.einst.modus === "auto" ? (dunkel.matches ? "nacht" : "tag") : db.einst.modus;
  const wechsel = document.documentElement.dataset.theme !== m;
  document.documentElement.dataset.theme = m;
  $('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue("--grund").trim();
  if (wechsel) zeichnen();
}
dunkel.addEventListener("change", () => db.einst.modus === "auto" && modusAnwenden());

/* ============================================================
   Blatt von unten, Kurzmeldung
   ============================================================ */

function blatt(html, binden) {
  const platz = $("#blatt-platz");
  platz.innerHTML = `<div class="abdeckung"></div><div class="blatt" role="dialog" aria-modal="true"><div class="griff"></div>${html}</div>`;
  $(".abdeckung", platz).onclick = blattZu;
  binden?.($(".blatt", platz));
}
function blattZu() {
  $("#blatt-platz").innerHTML = "";
}

let meldungUhr;
function melden(text, aktion) {
  const el = $("#meldung");
  el.innerHTML = `<span>${esc(text)}</span>${aktion ? `<button type="button">${esc(aktion.text)}</button>` : ""}`;
  el.classList.add("an");
  if (aktion) $("button", el).onclick = () => { aktion.tun(); el.classList.remove("an"); };
  clearTimeout(meldungUhr);
  meldungUhr = setTimeout(() => el.classList.remove("an"), aktion ? 5000 : 2600);
}
const spaeter = (was) => melden(`${was} kommt im nächsten Schritt.`);

function frage(titel, text, ja, tun) {
  blatt(`<h2 class="ue">${esc(titel)}</h2><p class="neben" style="margin-bottom:16px">${esc(text)}</p>
    <div class="knoepfe"><button class="knopf" data-ja>${esc(ja)}</button><button class="knopf zweit" data-nein>Abbrechen</button></div>`, (b) => {
    $("[data-nein]", b).onclick = blattZu;
    $("[data-ja]", b).onclick = () => { blattZu(); tun(); };
  });
}

/* ============================================================
   Lernplan
   ============================================================ */

const heute = () => tag();
function plan(karten = planKarten()) {
  return planWarteschlange(karten, db.stand.karten, heute(), { neuProTag: db.einst.neuProTag, neuHeuteSchon: heuteLog().neu });
}
const anzahlVon = (liste, test) => liste.filter(test).length;

/* ============================================================
   Router
   ============================================================ */

const view = () => $("#view");
const routen = {
  welt: zeigeWelt, bereiche: zeigeBereiche, bereich: zeigeBereich, paket: zeigePaket,
  lernen: zeigeLernen, geschafft: zeigeGeschafft, fortschritt: zeigeFortschritt, ueben: zeigeUeben,
  mehr: zeigeMehr, sichten: zeigeSichten, verwalten: zeigeVerwalten, suche: zeigeSuche,
  einstellungen: zeigeEinstellungen, sichern: zeigeSichern, verbindung: zeigeVerbindung,
};
const REITER_VON = {
  welt: "welt", bereich: "welt", paket: "welt", bereiche: "bereiche", ueben: "ueben", fortschritt: "ueben",
  mehr: "mehr", sichten: "mehr", verwalten: "mehr", suche: "mehr", einstellungen: "mehr", sichern: "mehr", verbindung: "mehr",
};

function route() {
  const [name, ...rest] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  return { name: routen[name] ? name : "welt", rest };
}

function zeichnen() {
  if (!db.inhalt) return;
  const { name, rest } = route();
  const ohneNav = name === "lernen" || name === "geschafft";
  document.body.classList.toggle("ohne-nav", ohneNav);
  $(".nav-innen").innerHTML = REITER.map((r) => `<a href="#/${r.id}" class="${REITER_VON[name] === r.id ? "an" : ""}" ${REITER_VON[name] === r.id ? 'aria-current="page"' : ""}>
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${r.svg}</svg><span>${r.name}</span></a>`).join("");
  routen[name](view(), ...rest);
}

window.addEventListener("hashchange", () => {
  blattZu();
  zeichnen();
  window.scrollTo(0, 0);
});

/* ============================================================
   1 · Welt
   ============================================================ */

const ORTE = [[14, 96], [140, 110], [266, 92], [14, 248], [140, 266], [266, 250], [60, 408]];
function ortPosition(i) {
  if (i < ORTE.length) return ORTE[i];
  const j = i - ORTE.length; // danach drei Spalten, Zeilenabstand 156
  return [[14, 140, 266][j % 3], 96 + (3 + Math.floor(j / 3)) * 156];
}

function zeigeWelt(v) {
  const p = plan();
  const n = p.length;
  const groesse = db.einst.rundenGroesse;
  const runden = Math.ceil(n / groesse);
  const entwuerfe = anzahlVon(db.inhalt.karten, (k) => stand(k.id)?.s === "entwurf");
  const proBereich = {};
  for (const k of p) {
    const b = paket(k.paket).bereich;
    proBereich[b] = (proBereich[b] || 0) + 1;
  }
  const lernTage = new Set(Object.keys(db.stand.log).filter((t) => db.stand.log[t].gelernt > 0));
  const bereiche = db.inhalt.bereiche;
  const hoehe = Math.max(568, ...bereiche.map((_, i) => ortPosition(i)[1] + 160));

  v.innerHTML = `
    <section class="welt">
      <div class="welt-kopf">
        <a class="figur-klein" href="#/fortschritt" aria-label="Mein Fortschritt">${bildHTML("figur", { stufe: db.stand.figur.stufe, klein: true })}</a>
        <div>
          <h1 class="ue">${n ? `Heute: ${mehrzahl(n, "Karte", "Karten")}` : "Heute: alles gelernt"}</h1>
          <p class="neben" style="font-size:16px">${n ? `${mehrzahl(runden, "Runde", "Runden")} à ${Math.min(groesse, n)}` : "Frei üben geht immer."}</p>
        </div>
      </div>
      <div class="welt-start">
        ${n ? `<a class="knopf" href="#/lernen/plan">Lernen</a>` : `<button class="knopf zweit" data-frei>Frei üben</button>`}
        ${entwuerfe ? `<a class="textlink" href="#/sichten">${mehrzahl(entwuerfe, "neue Karte", "neue Karten")} zum Sichten</a>` : ""}
      </div>
      <div class="karte-land">
        <div class="land" style="height:calc(var(--u) * ${hoehe})">
          <svg class="weg" viewBox="0 0 390 568" aria-hidden="true"><path d="M0 80H390M70 80C70 170 200 190 195 290S110 400 115 480"/></svg>
          <div class="laternen" aria-label="Lernserie dieser Woche">
            ${woche(heute()).map((t) => bildHTML("laterne", { an: lernTage.has(t) })).join("")}
          </div>
          ${bereiche.map((b, i) => {
            const [x, y] = ortPosition(i);
            const f = proBereich[b.id] || 0;
            return `<a class="ort" href="#/bereich/${encodeURIComponent(b.id)}" style="left:calc(var(--u) * ${x});top:calc(var(--u) * ${y})" aria-label="${esc(b.name)}${f ? `, heute ${f} fällig` : ""}">
              ${bildHTML("bereich", { kennung: b.kennung, stufe: stufeBereich(b.id), name: b.name })}
              ${f ? `<span class="faehnchen"><span class="mast"></span><span class="fahne">${f}</span></span>` : ""}
              <span class="name">${esc(b.name)}</span>
            </a>`;
          }).join("")}
        </div>
      </div>
    </section>`;
  $("[data-frei]", v)?.addEventListener("click", bereichWaehlen);
}

/* ============================================================
   Bereiche (Liste) und Bereich
   ============================================================ */

function bereichStatus(b) {
  const f = plan(kartenVonBereich(b.id)).length;
  const z = zahlenBereich(b.id);
  if (f) return `${f} fällig`;
  if (stufeBereich(b.id) === 3) return "alles gelernt";
  if (!z.aktiv) return z.entwurf ? `${z.entwurf} zum Sichten` : "noch leer";
  return `${z.gewusst} von ${z.aktiv} gewusst`;
}

function zeigeBereiche(v) {
  v.innerHTML = `
    <header class="seitenkopf"><h1 class="ue">Bereiche</h1></header>
    <div class="seite zeilen">
      ${db.inhalt.bereiche.map((b) => `<a class="zeile" href="#/bereich/${encodeURIComponent(b.id)}"><span class="zeile-text">${esc(b.name)}</span><span class="rechts">${esc(bereichStatus(b))}</span></a>`).join("")}
    </div>`;
}

function paketStatus(p) {
  const f = plan(kartenVonPaket(p.id)).length;
  const z = zahlenPaket(p.id);
  if (f) return `${f} fällig`;
  if (paketFertig(z)) return "alles gelernt";
  if (!z.aktiv) return z.entwurf ? `${z.entwurf} zum Sichten` : "noch leer";
  return z.gewusst ? `noch ${z.aktiv - z.gewusst} offen` : "neu";
}

function zeigeBereich(v, id) {
  const b = bereich(id);
  if (!b) return nichtGefunden(v, "Bereich");
  const pakete = paketeVon(b.id);
  const f = plan(kartenVonBereich(b.id)).length;
  const z = zahlenBereich(b.id);
  v.innerHTML = `
    <div class="foto kopf-5-3">
      <a class="zurueck" href="#/welt" aria-label="Zurück">${ic("zurueck")}</a>
      ${b.foto ? fotoHTML(b.foto) : `<div class="ohne">${bildHTML("bereich", { kennung: b.kennung, stufe: stufeBereich(b.id), name: b.name }, "width:220px;height:220px")}</div>`}
    </div>
    <div class="titelklotz">
      <h1 class="ue">${esc(b.name)}</h1>
      <p class="info">${mehrzahl(pakete.length, "Paket", "Pakete")} · ${f} fällig</p>
      ${b.foto ? `<p class="nachweis">${nachweis(b.foto)}</p>` : ""}
    </div>
    <div class="seite" style="margin-top:20px">
      ${f ? `<a class="knopf" href="#/lernen/bereich/${encodeURIComponent(b.id)}">Bereich lernen (${f})</a>`
        : `<a class="knopf zweit" href="#/lernen/frei/${encodeURIComponent(b.id)}" ${z.aktiv ? "" : 'aria-disabled="true" data-leer'}>Bereich üben</a>`}
      <div class="raster" style="margin-top:20px">
        ${pakete.map((p) => `
          <a class="kachel" href="#/paket/${encodeURIComponent(p.id)}">
            <div class="foto">${p.foto ? fotoHTML(p.foto) : `<div class="ohne">${bildHTML("bereich", { kennung: b.kennung, stufe: paketStufe(p), name: "" }, "width:60%;height:60%")}</div>`}</div>
            <b>${esc(p.name)}</b><small>${esc(paketStatus(p))}</small>
          </a>`).join("")}
      </div>
    </div>`;
  $("[data-leer]", v)?.addEventListener("click", (e) => { e.preventDefault(); melden("In diesem Bereich gibt es noch keine Karten."); });
}

function paketStufe(p) {
  const z = zahlenPaket(p.id);
  return !z.aktiv || !z.gewusst ? 1 : z.gewusst === z.aktiv ? 3 : 2;
}

/* ============================================================
   Paket
   ============================================================ */

const STATUS_WORT = (st) => !st ? "" : st.s === "entwurf" ? "zum Sichten" : st.s === "verworfen" ? "verworfen"
  : st.wdh === 0 ? "neu" : st.zuletzt === "gewusst" ? "gewusst" : "nochmal";

function zeigePaket(v, id) {
  const p = paket(id);
  if (!p) return nichtGefunden(v, "Paket");
  const b = bereich(p.bereich);
  const karten = kartenVonPaket(p.id);
  const z = zahlenPaket(p.id);
  const f = plan(karten).length;
  v.innerHTML = `
    <div class="foto kopf-2-1">
      <a class="zurueck" href="#/bereich/${encodeURIComponent(b.id)}" aria-label="Zurück">${ic("zurueck")}</a>
      ${p.foto ? fotoHTML(p.foto) : `<div class="ohne">${bildHTML("bereich", { kennung: b.kennung, stufe: paketStufe(p), name: b.name }, "width:150px;height:150px")}</div>`}
    </div>
    <div class="titelklotz">
      <p class="ober">${esc(b.name)}${p.basis ? " · Basispaket" : ""}</p>
      <h1 class="ue">${esc(p.name)}</h1>
      <p class="info">${mehrzahl(z.aktiv, "Karte", "Karten")} · ${f} fällig</p>
      <p class="nachweis">${p.foto ? nachweis(p.foto) : ""}<button class="link" data-bild>${p.foto ? "Bild ändern" : "Bild wählen"}</button></p>
    </div>
    <div class="seite" style="margin-top:20px">
      ${f ? `<a class="knopf" href="#/lernen/paket/${encodeURIComponent(p.id)}">Jetzt lernen (${f})</a>`
        : `<a class="knopf zweit" href="#/lernen/paketfrei/${encodeURIComponent(p.id)}" ${z.aktiv ? "" : "data-leer"}>Paket üben</a>`}
      <div class="zeile" style="margin-top:12px"><span>Im täglichen Lernplan</span>
        <label class="schalter"><input type="checkbox" id="im-plan" ${imPlan(p.id) ? "checked" : ""} aria-label="Im täglichen Lernplan"><i></i></label></div>
      <div class="knopf-reihe" style="margin-top:12px">
        <button class="knopf zweit" data-spaeter="Weitergeben">Weitergeben</button>
        <button class="knopf zweit" data-spaeter="Öffentlich teilen">Teilen</button>
        <button class="knopf zweit" data-spaeter="Der Lernzettel">Lernzettel</button>
      </div>
      ${(p.quellen || []).length ? `<h2 class="zw abschnitt">Dokumente</h2>
        <div class="zeilen">${p.quellen.map((q) => `<div class="zeile"><span class="zeile-text">${esc(q.titel)}</span><span class="rechts">${esc(q.herausgeber || "")}</span></div>`).join("")}</div>` : ""}
      <h2 class="zw abschnitt">Karten</h2>
      <div class="zeilen">${karten.length ? karten.map((k) => `<button class="zeile" data-karte="${esc(k.id)}"><span class="zeile-text">${esc(k.frage)}</span><span class="rechts">${esc(STATUS_WORT(stand(k.id)))}</span></button>`).join("")
        : `<p class="neben">Noch keine Karten.${p.basis ? " Dieses Basispaket wächst mit jedem Dokument, das du hinzufügst." : ""}</p>`}</div>
    </div>`;
  $("#im-plan", v).onchange = (e) => pausieren(p.id, !e.target.checked);
  $("[data-bild]", v).onclick = () => spaeter("Die Bildauswahl");
  $$("[data-spaeter]", v).forEach((x) => x.onclick = () => spaeter(x.dataset.spaeter));
  $$("[data-karte]", v).forEach((x) => x.onclick = () => karteZeigen(karte(x.dataset.karte)));
  $("[data-leer]", v)?.addEventListener("click", (e) => { e.preventDefault(); melden("Erst Karten sichten, dann üben."); });
}

function karteZeigen(k) {
  const p = paket(k.paket);
  blatt(`
    <p class="neben">${esc(bereich(p.bereich).name)} · ${esc(p.name)}</p>
    <p style="font-size:26px;font-weight:600;line-height:1.25;margin-top:12px">${esc(k.frage)}</p>
    <div style="height:4px;border-radius:2px;background:var(--trenner);margin:24px 0 20px"></div>
    <p style="font-size:22px;font-weight:700;line-height:1.25">${esc(k.antwort)}</p>
    ${k.quelle ? `<p class="neben" style="margin-top:8px">Quelle: ${esc(k.quelle)}</p>` : ""}
    <div class="knoepfe" style="margin-top:24px"><button class="knopf zweit" data-bearbeiten>Bearbeiten</button><button class="knopf zweit" data-zu>Schließen</button></div>`, (bl) => {
    $("[data-zu]", bl).onclick = blattZu;
    $("[data-bearbeiten]", bl).onclick = () => bearbeiten(k);
  });
}

function bearbeiten(k, danach) {
  blatt(`
    <h2 class="ue">Karte bearbeiten</h2>
    <div class="feld"><label for="b-frage">Frage</label><textarea id="b-frage" style="min-height:96px">${esc(k.frage)}</textarea></div>
    <div class="feld"><label for="b-antwort">Antwort</label><textarea id="b-antwort" style="min-height:96px">${esc(k.antwort)}</textarea></div>
    <div class="knoepfe"><button class="knopf" data-speichern>Speichern</button><button class="knopf zweit" data-zu>Abbrechen</button></div>`, (bl) => {
    $("[data-zu]", bl).onclick = blattZu;
    $("[data-speichern]", bl).onclick = () => {
      const fr = $("#b-frage", bl).value.trim();
      const an = $("#b-antwort", bl).value.trim();
      if (!fr || !an) return melden("Frage und Antwort brauchen Text.");
      karteAendern(k, fr, an);
      blattZu();
      melden("Gespeichert");
      danach ? danach() : zeichnen();
    };
  });
}

/* ============================================================
   3 · Lernen
   ============================================================ */

let runde = null; // { schluessel, karten: [ids], i, ergebnis: [], fertig, aufstieg, bereich }

function rundeBauen(art, id) {
  let liste;
  if (art === "plan") liste = plan();
  else if (art === "bereich") liste = plan(kartenVonBereich(id));
  else if (art === "paket") liste = plan(kartenVonPaket(id));
  else if (art === "frei") liste = freieKarten(kartenVonBereich(id), db.stand.karten);
  else if (art === "paketfrei") liste = freieKarten(kartenVonPaket(id), db.stand.karten);
  else if (art === "wiederholen") liste = schwierigeKarten(db.inhalt.karten, db.stand.karten);
  else liste = [];
  // im Bereich oder Paket ohne Fälliges: frei üben
  if (!liste.length && art === "bereich") liste = freieKarten(kartenVonBereich(id), db.stand.karten);
  if (!liste.length && art === "paket") liste = freieKarten(kartenVonPaket(id), db.stand.karten);
  return { art, id, karten: liste.slice(0, db.einst.rundenGroesse).map((k) => k.id), i: 0, ergebnis: [], fertig: false };
}

function zeigeLernen(v, art = "plan", id) {
  if (!runde || runde.fertig || runde.art !== art || runde.id !== id) runde = rundeBauen(art, id);
  if (!runde.karten.length) {
    runde = null;
    melden(art === "wiederholen" ? "Gerade keine schwierigen Karten." : "Gerade nichts zu lernen.");
    location.replace("#/welt");
    return;
  }
  const k = karte(runde.karten[runde.i]);
  const p = paket(k.paket);
  const gesamt = runde.karten.length;
  v.innerHTML = `
    <section class="lernen">
      <div class="lernen-kopf">
        <a class="tipp" href="#/welt" aria-label="Lernrunde beenden">${ic("schliessen")}</a>
        <div class="kloetze" aria-hidden="true">${runde.karten.map((_, j) => `<i class="${j < runde.i ? "ok" : j === runde.i ? "jetzt" : ""}"></i>`).join("")}</div>
        <span class="zahl">${runde.i + 1}/${gesamt}</span>
      </div>
      <div class="lernkarte-platz">
        <div class="lernkarte" role="button" tabindex="0" aria-label="Antwort zeigen">
          <p class="wo">${esc(bereich(p.bereich).name)} · ${esc(p.name)}</p>
          <p class="frage">${esc(k.frage)}</p>
          <div class="rueck">
            <div class="strich"></div>
            <p class="antwort">${esc(k.antwort)}</p>
            ${k.quelle ? `<p class="quelle">Quelle: ${esc(k.quelle)}</p>` : ""}
          </div>
        </div>
      </div>
      <div class="bewerten">
        <button class="links" data-urteil="nochmal" disabled><span class="klotz"></span>nochmal</button>
        <button class="rechts" data-urteil="gewusst" disabled>gewusst<span class="klotz"></span></button>
      </div>
      <p class="lernen-hinweis">Tippen zeigt die Antwort</p>
    </section>`;

  const el = $(".lernkarte", v);
  const aufdecken = () => {
    if (el.classList.contains("offen")) return;
    el.classList.add("offen");
    el.setAttribute("aria-label", "Antwort");
    $$("[data-urteil]", v).forEach((b) => b.disabled = false);
    $(".lernen-hinweis", v).textContent = "Wischen oder tippen zum Bewerten";
  };
  const urteilen = (u) => {
    if (!el.classList.contains("offen")) return;
    fliegen(el, u === "gewusst" ? 1 : -1, () => werten(k, u));
  };
  el.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); aufdecken(); }
    if (e.key === "ArrowLeft") urteilen("nochmal");
    if (e.key === "ArrowRight") urteilen("gewusst");
  });
  $$("[data-urteil]", v).forEach((b) => b.onclick = () => urteilen(b.dataset.urteil));
  wischen(el, {
    tippen: aufdecken,
    darf: () => el.classList.contains("offen"),
    fertig: (r) => werten(k, r > 0 ? "gewusst" : "nochmal"),
  });
}

function werten(k, urteil) {
  const st = stand(k.id);
  const war = { neu: istNeu(st), faellig: istFaellig(st, heute()) };
  db.stand.karten[k.id] = bewerten(st, urteil, heute(), { planen: war.neu || war.faellig });
  const log = (db.stand.log[heute()] ||= { gelernt: 0, neu: 0 });
  log.gelernt++;
  if (war.neu) log.neu++;
  if (figurAktualisieren()) runde.aufstieg = true;
  runde.ergebnis.push(urteil);
  speichern();
  if (runde.i + 1 < runde.karten.length) {
    runde.i++;
    zeichnen();
  } else {
    runde.fertig = true;
    db.stand.zuckertuete = (db.stand.zuckertuete || 0) + 1;
    speichern();
    location.replace("#/geschafft");
  }
}

// Wischen: Karte folgt dem Finger und kippt höchstens 6°
function wischen(el, { tippen, darf, fertig }) {
  let x0 = null, y0 = 0, dx = 0, bewegt = false;
  el.addEventListener("pointerdown", (e) => {
    x0 = e.clientX; y0 = e.clientY; dx = 0; bewegt = false;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    if (Math.abs(dx) > 8 || Math.abs(e.clientY - y0) > 8) bewegt = true;
    if (!darf()) return;
    el.style.transition = "none";
    el.style.transform = `translateX(${dx}px) rotate(${Math.max(-6, Math.min(6, dx / 20))}deg)`;
  });
  const los = () => {
    if (x0 === null) return;
    x0 = null;
    if (!bewegt) { tippen?.(); return; }
    if (darf() && Math.abs(dx) > 80) return fliegen(el, Math.sign(dx), () => fertig(Math.sign(dx)));
    el.style.transition = "transform 200ms";
    el.style.transform = "";
  };
  el.addEventListener("pointerup", los);
  el.addEventListener("pointercancel", () => { x0 = null; el.style.transform = ""; });
}

function fliegen(el, richtung, danach) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return danach();
  el.style.transition = "transform 200ms ease-in, opacity 200ms";
  el.style.transform = `translateX(${richtung * 120}%) rotate(${richtung * 6}deg)`;
  el.style.opacity = "0";
  setTimeout(danach, 200);
}

/* ============================================================
   4 · Runde geschafft
   ============================================================ */

function zeigeGeschafft(v) {
  if (!runde?.fertig) { location.replace("#/welt"); return; }
  const n = runde.karten.length;
  // Bereich, aus dem die meisten Karten der Runde kamen
  const zaehler = {};
  for (const id of runde.karten) {
    const b = paket(karte(id).paket).bereich;
    zaehler[b] = (zaehler[b] || 0) + 1;
  }
  const bid = Object.entries(zaehler).sort((a, b) => b[1] - a[1])[0][0];
  const b = bereich(bid);
  const s = stufeBereich(bid);
  const satz = runde.aufstieg
    ? `Aufstieg auf Stufe ${db.stand.figur.stufe} von ${MAX_STUFE}`
    : s === 3 ? `im Bereich ${b.name} freut sich jetzt die ganze Klasse`
      : s === 2 ? `im Bereich ${b.name} freut sich jetzt die halbe Klasse`
        : `im Bereich ${b.name} geht es los`;
  const gabe = ((db.stand.zuckertuete - 1) % 4) + 1;
  v.innerHTML = `
    <section class="feier">
      <div class="feier-bild">
        ${bildHTML("figur", { stufe: db.stand.figur.stufe, zustand: "jubel" })}
        <div class="gabe">${bildHTML("gabe", { nummer: gabe })}</div>
      </div>
      <h1 class="feier-ue">Geschafft.</h1>
      <p class="satz">${mehrzahl(n, "Karte", "Karten")} · ${esc(satz)}</p>
      <div class="knoepfe">
        <button class="knopf" data-nochmal>Noch eine Runde</button>
        <a class="knopf zweit" href="#/welt">Zur Welt</a>
      </div>
    </section>`;
  $("[data-nochmal]", v).onclick = () => {
    const { art, id } = runde;
    runde = rundeBauen(art, id);
    if (!runde.karten.length) { runde = null; melden("Für heute ist alles gelernt."); location.replace("#/welt"); return; }
    location.replace(`#/lernen/${art}${id ? `/${encodeURIComponent(id)}` : ""}`);
  };
}

/* ============================================================
   10 · Mein Fortschritt
   ============================================================ */

function fastFertig() {
  return db.inhalt.pakete.map((p) => ({ p, z: zahlenPaket(p.id) }))
    .filter(({ z }) => z.aktiv > 0 && z.gewusst > 0 && z.gewusst < z.aktiv)
    .sort((a, b) => (a.z.aktiv - a.z.gewusst) - (b.z.aktiv - b.z.gewusst))
    .slice(0, 3);
}

function zeigeFortschritt(v) {
  const s = db.stand.figur.stufe;
  const buecher = fertigePakete();
  const fast = fastFertig();
  const reihen = [buecher.slice(0, 14), buecher.slice(14, 28)];
  v.innerHTML = `
    <header class="kopfzeile"><a class="tipp" href="#/ueben" aria-label="Zurück">${ic("zurueck")}</a><h1>Stufe ${s} von ${MAX_STUFE}</h1><span></span></header>
    <div class="seite">
      <div class="bibliothek">
        <div class="regal">${bildHTML("regal", {}, "position:absolute;inset:0")}</div>
        ${[96, 156].map((y, r) => `
          <div class="boden" style="top:${(y / 300) * 100}%"></div>
          <div class="buecher" style="bottom:${100 - (y / 300) * 100}%">${reihen[r].map((p, i) => bildHTML("buch", { nummer: ((r * 14 + i) % 4) + 1 })).join("")}</div>`).join("")}
        <div class="figur-gross">${bildHTML("figur", { stufe: s })}</div>
        <div class="offen">${fast.map(({ p }) => `<button aria-label="${esc(p.name)} lernen" data-paket="${esc(p.id)}">${bildHTML("buch-offen", {})}</button>`).join("")}</div>
      </div>
      <p class="neben mittig" style="margin-top:16px">${s < MAX_STUFE ? `Noch 1 Bereich ganz lernen bis Stufe ${s + 1}` : "Höchste Stufe erreicht."}</p>
      ${fast.length ? `<h2 class="zw" style="margin:24px 0 12px">Fast fertig</h2>
        <div class="zeilen">${fast.map(({ p, z }) => `<button class="zeile" data-paket="${esc(p.id)}"><span class="zeile-text">${esc(p.name)}</span><span class="rechts">noch ${mehrzahl(z.aktiv - z.gewusst, "Karte", "Karten")}</span></button>`).join("")}</div>` : ""}
    </div>`;
  $$("[data-paket]", v).forEach((x) => x.onclick = () => { location.hash = `#/lernen/paketfrei/${encodeURIComponent(x.dataset.paket)}`; });
}

/* ============================================================
   8 · Üben
   ============================================================ */

function zeigeUeben(v) {
  const s = db.stand.figur.stufe;
  const schwer = schwierigeKarten(db.inhalt.karten, db.stand.karten).length;
  const buecher = fertigePakete().length;
  v.innerHTML = `
    <div class="band"><a href="#/fortschritt" aria-label="Mein Fortschritt" style="position:absolute;left:20px;bottom:0;width:110px;height:110px">${bildHTML("figur", { stufe: s })}</a></div>
    <header class="seitenkopf"><h1 class="ue">Üben</h1></header>
    <div class="seite zeilen">
      <a class="zeile hoch" href="#/fortschritt"><span class="zwei"><b>Mein Fortschritt</b><small>Stufe ${s} · ${mehrzahl(buecher, "Buch", "Bücher")} · ${fastFertig().length} fast fertig</small></span></a>
      <button class="zeile hoch" data-wiederholen><span class="zwei"><b>Wiederholungstrainer</b><small>${schwer ? `${mehrzahl(schwer, "schwierige Karte", "schwierige Karten")} nochmal` : "gerade keine schwierigen Karten"}</small></span></button>
      <button class="zeile hoch" data-frei><span class="zwei"><b>Bereich wählen</b><small>frei üben, ohne Lernplan</small></span></button>
      <div class="zeile hoch aus"><span class="zwei"><b>Quiz</b><small>kommt bald</small></span></div>
      <h2 class="zw" style="margin-top:16px">Spiele</h2>
      <div class="zeile hoch aus"><span class="zwei"><b>Spiele</b><small>später, z. B. Foto-Quiz</small></span></div>
    </div>`;
  $("[data-wiederholen]", v).onclick = () => {
    if (!schwer) return melden("Gerade keine schwierigen Karten.");
    location.hash = "#/lernen/wiederholen";
  };
  $("[data-frei]", v).onclick = bereichWaehlen;
}

function bereichWaehlen() {
  const mit = db.inhalt.bereiche.filter((b) => zahlenBereich(b.id).aktiv > 0);
  blatt(`<h2 class="ue">Bereich wählen</h2>
    <div class="zeilen">${mit.map((b) => `<a class="zeile" href="#/lernen/frei/${encodeURIComponent(b.id)}" style="background:var(--vertieft)"><span>${esc(b.name)}</span><span class="rechts">${mehrzahl(zahlenBereich(b.id).aktiv, "Karte", "Karten")}</span></a>`).join("")
      || '<p class="neben">Noch keine behaltenen Karten.</p>'}</div>`);
}

/* ============================================================
   9 · Mehr und Unterseiten
   ============================================================ */

function zeigeMehr(v) {
  const e = anzahlVon(db.inhalt.karten, (k) => stand(k.id)?.s === "entwurf");
  v.innerHTML = `
    <header class="seitenkopf"><h1 class="ue">Mehr</h1></header>
    <div class="seite zeilen">
      <a class="zeile" href="#/sichten"><span>Sichten</span><span class="rechts">${e ? `${e} neu` : ""}</span></a>
      <button class="zeile" data-hinzu><span>Neues Paket hinzufügen</span></button>
      ${verbunden() ? `<button class="zeile" data-abrufen><span>Neue Karten abrufen</span></button>` : ""}
      <div class="zeile aus"><span>Fotos</span><span class="rechts">später</span></div>
      <a class="zeile" href="#/verwalten"><span>Bereiche verwalten</span></a>
      <a class="zeile" href="#/suche"><span>Alle Karten durchsuchen</span></a>
      <a class="zeile" href="#/verbindung"><span>Verbindung</span><span class="rechts">${verbunden() ? "verbunden" : "Beispieldaten"}</span></a>
      <a class="zeile" href="#/einstellungen"><span>Einstellungen</span></a>
      <a class="zeile" href="#/sichern"><span>Lernstand sichern</span></a>
    </div>`;
  $("[data-hinzu]", v).onclick = () => hinzufuegen();
  $("[data-abrufen]", v)?.addEventListener("click", () => abrufen(true));
}

const kopf = (titel, zurueck = "#/mehr") => `<header class="kopfzeile"><a class="tipp" href="${zurueck}" aria-label="Zurück">${ic("zurueck")}</a><h1>${esc(titel)}</h1><span></span></header>`;

/* ---------- 5 · Sichten ---------- */

function zeigeSichten(v) {
  const offen = db.inhalt.karten.filter((k) => stand(k.id)?.s === "entwurf");
  if (!offen.length) {
    v.innerHTML = `${kopf("Sichten")}<div class="leer"><h2 class="ue">Alles gesichtet.</h2><p>Neue Karten erscheinen hier, sobald ein Dokument ausgewertet ist.</p><a class="knopf zweit" href="#/welt">Zur Welt</a></div>`;
    return;
  }
  const k = offen[0];
  const p = paket(k.paket);
  v.innerHTML = `
    ${kopf("Sichten")}
    <div class="seite">
      <h2 class="ue">${mehrzahl(offen.length, "neue Karte", "neue Karten")}</h2>
      <p class="neben" style="margin-top:4px">aus „${esc(p.name)}“ · ${esc(bereich(p.bereich).name)}</p>
      <div class="stapel">
        ${offen.length > 1 ? '<div class="hinten"></div>' : ""}
        <div class="lernkarte offen" role="group" aria-label="Karte">
          <p class="frage" style="margin-top:0">${esc(k.frage)}</p>
          <div class="rueck"><div class="strich"></div><p class="antwort">${esc(k.antwort)}</p>${k.quelle ? `<p class="quelle">Quelle: ${esc(k.quelle)}</p>` : ""}</div>
        </div>
      </div>
    </div>
    <div class="bewerten">
      <button class="links" data-urteil="verworfen"><span class="klotz"></span>verwerfen</button>
      <button class="rechts" data-urteil="aktiv">behalten<span class="klotz"></span></button>
    </div>
    <div class="seite knopf-reihe" style="margin-top:12px">
      <button class="knopf zweit" data-bearbeiten>Bearbeiten</button>
      <button class="knopf zweit" data-alle>Alle behalten</button>
    </div>`;
  const el = $(".stapel .lernkarte", v);
  const entscheiden = (s) => fliegen(el, s === "aktiv" ? 1 : -1, () => sichten([k], s));
  $$("[data-urteil]", v).forEach((b) => b.onclick = () => entscheiden(b.dataset.urteil));
  wischen(el, { darf: () => true, fertig: (r) => sichten([k], r > 0 ? "aktiv" : "verworfen") });
  $("[data-bearbeiten]", v).onclick = () => bearbeiten(k);
  $("[data-alle]", v).onclick = () => sichten(offen, "aktiv");
}

function sichten(karten, s) {
  const vorher = karten.map((k) => [k.id, { ...stand(k.id) }]);
  for (const k of karten) db.stand.karten[k.id].s = s;
  speichern();
  zeichnen();
  const text = karten.length > 1 ? `${karten.length} Karten behalten` : s === "aktiv" ? "Behalten" : "Verworfen";
  melden(text, { text: "Rückgängig", tun: () => { for (const [id, st] of vorher) db.stand.karten[id] = st; speichern(); zeichnen(); } });
}

/* ---------- 6 · Hinzufügen ---------- */

function hinzufuegen(bereichId) {
  if (!verbunden()) {
    melden("Erst unter „Mehr → Verbindung“ mit GitHub verbinden.");
    return;
  }
  // Vorschlag: der offene Sammelbereich, sofern kein Bereich vorgegeben ist
  bereichId ||= db.inhalt.bereiche.some((b) => b.id === SAMMELBEREICH) ? SAMMELBEREICH : db.inhalt.bereiche[0]?.id;
  let art = "text";
  let ziel = "neu";
  const bereiche = db.inhalt.bereiche;
  blatt(`
    <h2 class="ue">Neues Paket</h2>
    <div class="wahl" data-gruppe="art" style="margin-bottom:16px">
      <button type="button" data-wert="text" class="an">Text einfügen</button>
      <button type="button" data-wert="datei">Datei</button>
      <button type="button" disabled>Foto (später)</button>
    </div>
    <div class="feld" data-fuer="text"><label for="h-text">Text</label><textarea id="h-text" placeholder="Text hier einfügen …"></textarea></div>
    <div class="feld" data-fuer="datei" hidden><label for="h-datei">Datei (PDF, Word, Text)</label><input id="h-datei" type="file" accept=".pdf,.docx,.txt,.md,.html,.htm"></div>
    <div class="feld"><label for="h-titel">Titel</label><input id="h-titel" autocomplete="off" placeholder="z. B. Startchancen-Programm"></div>
    <div class="feld"><label for="h-bereich">Bereich</label>
      <span class="auswahl"><select id="h-bereich">${bereiche.map((b) => `<option value="${esc(b.id)}" ${b.id === bereichId ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select>${ic("auf")}</span></div>
    <div class="wahl" data-gruppe="ziel" style="margin-bottom:8px">
      <button type="button" data-wert="neu" class="an">Neues Paket</button>
      <button type="button" data-wert="basis">Zum Basispaket</button>
    </div>
    <p class="neben" style="margin-bottom:16px">Pakete bleiben, wie sie sind. Nur das Basispaket eines Bereichs wächst. Neue Bereiche legst du unter „Mehr“ an.</p>
    <button class="knopf" data-los>Karten erzeugen</button>`, (bl) => {
    $$("[data-gruppe] button[data-wert]", bl).forEach((b) => b.onclick = () => {
      const g = b.closest("[data-gruppe]");
      $$("button", g).forEach((x) => x.classList.toggle("an", x === b));
      if (g.dataset.gruppe === "art") {
        art = b.dataset.wert;
        $$("[data-fuer]", bl).forEach((f) => f.hidden = f.dataset.fuer !== art);
      } else ziel = b.dataset.wert;
    });
    $("[data-los]", bl).onclick = async (e) => {
      const text = $("#h-text", bl).value;
      const datei = $("#h-datei", bl).files[0];
      const titel = $("#h-titel", bl).value.trim();
      if (art === "text" && !text.trim()) return melden("Bitte zuerst Text einfügen.");
      if (art === "datei" && !datei) return melden("Bitte eine Datei wählen.");
      if (!titel) return melden("Bitte einen Titel eingeben.");
      const knopf = e.currentTarget;
      knopf.disabled = true;
      knopf.textContent = "Wird hochgeladen …";
      try {
        const r = await hochladen({
          bereich: $("#h-bereich", bl).value, ziel, titel,
          text: art === "text" ? text : "", datei: art === "datei" ? datei : null,
          vorhandeneIds: new Set(db.inhalt.pakete.map((x) => x.id)),
        });
        blattZu();
        melden(`„${r.ordner}“ ist hochgeladen. In ein bis drei Minuten gibt es Karten.`);
      } catch (err) {
        knopf.disabled = false;
        knopf.textContent = "Karten erzeugen";
        melden(`Hochladen fehlgeschlagen: ${err.message}`);
      }
    };
  });
}

/* ---------- Bereiche verwalten ---------- */

const BILDER = [
  ["allgemein", "Allgemein"], ["schule", "Schule"], ["lehrkraefte", "Lehrkräfte"], ["universitaeten", "Universitäten"],
  ["senatsverwaltung", "Senatsverwaltung"], ["recht", "Recht"], ["schueler", "Schüler:innen"], ["lebenslang", "Lebenslanges Lernen"],
];

function zeigeVerwalten(v) {
  v.innerHTML = `
    ${kopf("Bereiche verwalten")}
    <div class="seite">
      <div class="zeilen">${db.inhalt.bereiche.map((b) => `<a class="zeile" href="#/bereich/${encodeURIComponent(b.id)}"><span class="zeile-text">${esc(b.name)}</span><span class="rechts">${mehrzahl(paketeVon(b.id).length, "Paket", "Pakete")}</span></a>`).join("")}</div>
      <button class="knopf" style="margin-top:20px" data-neu>Neuer Bereich</button>
    </div>`;
  $("[data-neu]", v).onclick = () => blatt(`
    <h2 class="ue">Neuer Bereich</h2>
    <div class="feld"><label for="n-name">Name</label><input id="n-name" autocomplete="off" placeholder="z. B. Kita"></div>
    <div class="feld"><label for="n-bild">Bild auf der Landkarte</label><span class="auswahl"><select id="n-bild">${BILDER.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("")}</select>${ic("auf")}</span></div>
    <p class="neben" style="margin-bottom:16px">Der Bereich bekommt ein leeres Basispaket.</p>
    <div class="knoepfe"><button class="knopf" data-anlegen>Anlegen</button><button class="knopf zweit" data-zu>Abbrechen</button></div>`, (bl) => {
    $("[data-zu]", bl).onclick = blattZu;
    $("[data-anlegen]", bl).onclick = async (e) => {
      const name = $("#n-name", bl).value.trim();
      const kennung = $("#n-bild", bl).value;
      if (!name) return melden("Bitte einen Namen eingeben.");
      if (db.inhalt.bereiche.some((b) => b.name.toLowerCase() === name.toLowerCase())) return melden("Diesen Bereich gibt es schon.");
      if (!verbunden()) {
        neuerBereich(name, kennung);
      } else {
        e.currentTarget.disabled = true;
        try {
          await bereichSpeichern(name, kennung);
        } catch (err) {
          e.currentTarget.disabled = false;
          return melden(`Speichern fehlgeschlagen: ${err.message}`);
        }
      }
      blattZu();
      melden("Bereich angelegt");
      zeichnen();
    };
  });
}

// Neuer Bereich in bereiche.json – vor dem Sammelbereich, der unten auf der Karte bleibt
async function bereichSpeichern(name, kennung) {
  const bd = bereicheStand();
  let id = paketId(name);
  while (bd.bereiche.some((b) => b.id === id)) id += "-2";
  const b = bereichAnlegen(id, name, kennung);
  const unten = bd.bereiche.findIndex((x) => x.id === SAMMELBEREICH);
  bd.bereiche.splice(unten < 0 ? bd.bereiche.length : unten, 0, b);
  await bereicheSpeichern(`Wissenstrainer v2: Bereich „${name}“ angelegt`);
  const i = db.inhalt.bereiche.findIndex((x) => x.id === SAMMELBEREICH);
  db.inhalt.bereiche.splice(i < 0 ? db.inhalt.bereiche.length : i, 0, { id, name, kennung, basis: b.basis });
  db.inhalt.pakete.push({ id: b.basis, bereich: id, name: b.basisOrdner, basis: true, quellen: [] });
  inhaltSetzen(db.inhalt);
}

/* ---------- Suche ---------- */

let suchText = "";
function zeigeSuche(v) {
  v.innerHTML = `
    ${kopf("Alle Karten")}
    <div class="seite">
      <div class="feld suche"><label for="s-q" hidden>Suchen</label><input id="s-q" type="search" placeholder="Suchen …" value="${esc(suchText)}" enterkeyhint="search"></div>
      <div class="zeilen" id="treffer"></div>
    </div>`;
  const zeigen = () => {
    const q = suchText.toLowerCase();
    const liste = db.inhalt.karten.filter((k) => stand(k.id)?.s !== "verworfen" && (!q || `${k.frage} ${k.antwort}`.toLowerCase().includes(q))).slice(0, 60);
    $("#treffer", v).innerHTML = liste.map((k) => {
      const p = paket(k.paket);
      return `<button class="zeile hoch" data-karte="${esc(k.id)}"><span class="zwei" style="min-width:0"><b class="zeile-text">${esc(k.frage)}</b><small>${esc(bereich(p.bereich).name)} · ${esc(p.name)}</small></span></button>`;
    }).join("") || '<p class="neben">Nichts gefunden.</p>';
    $$("[data-karte]", v).forEach((x) => x.onclick = () => karteZeigen(karte(x.dataset.karte)));
  };
  $("#s-q", v).addEventListener("input", (e) => { suchText = e.target.value; zeigen(); });
  zeigen();
}

/* ---------- Einstellungen ---------- */

function zeigeEinstellungen(v) {
  const e = db.einst;
  const zahl = (key, min, max, schritt) => `<span class="zahlwahl"><button class="tipp" data-key="${key}" data-d="${-schritt}" data-min="${min}" data-max="${max}" aria-label="weniger">${ic("minus")}</button><b>${e[key]}</b><button class="tipp" data-key="${key}" data-d="${schritt}" data-min="${min}" data-max="${max}" aria-label="mehr">${ic("plus")}</button></span>`;
  v.innerHTML = `
    ${kopf("Einstellungen")}
    <div class="seite">
      <div class="zeilen">
        <div class="zeile"><span>Karten pro Runde</span>${zahl("rundenGroesse", 3, 20, 1)}</div>
        <div class="zeile"><span>Neue Karten pro Tag</span>${zahl("neuProTag", 0, 50, 5)}</div>
      </div>
      <h2 class="zw abschnitt">Darstellung</h2>
      <div class="wahl" data-gruppe="modus">
        ${[["tag", "Tag"], ["nacht", "Nacht"], ["auto", "Automatisch"]].map(([w, n]) => `<button type="button" data-modus="${w}" class="${e.modus === w ? "an" : ""}">${n}</button>`).join("")}
      </div>
      <p class="neben" style="margin-top:8px">Automatisch folgt der Einstellung deines Geräts.</p>
      <p class="neben" style="margin-top:32px">Stand der App: ${APP_STAND}</p>
    </div>`;
  $$("[data-key]", v).forEach((b) => b.onclick = () => {
    const { key, d, min, max } = b.dataset;
    e[key] = Math.max(+min, Math.min(+max, e[key] + +d));
    speichern();
    zeichnen();
  });
  $$("[data-modus]", v).forEach((b) => b.onclick = () => {
    e.modus = b.dataset.modus;
    speichern();
    modusAnwenden();
    zeichnen();
  });
}

/* ---------- Lernstand sichern ---------- */

function zeigeSichern(v) {
  v.innerHTML = `
    ${kopf("Lernstand sichern")}
    <div class="seite">
      <p class="neben" style="margin-bottom:16px">Dein Lernstand liegt nur auf diesem Gerät. Mit einer Sicherung kannst du ihn auf ein anderes Gerät mitnehmen.</p>
      <div class="zeilen" style="gap:12px">
        <button class="knopf zweit" data-raus>Lernstand herunterladen</button>
        <button class="knopf zweit" data-rein>Lernstand einspielen</button>
        <input type="file" id="sicherung" accept="application/json,.json" hidden>
      </div>
      ${verbunden() ? "" : `<h2 class="zw abschnitt">Beispieldaten</h2>
      <p class="neben" style="margin-bottom:16px">Setzt alles auf den Anfang zurück: drei Bereiche mit Beispielkarten.</p>
      <button class="knopf zweit" data-reset>Beispieldaten zurücksetzen</button>`}
    </div>`;
  $("[data-raus]", v).onclick = () => {
    const blob = new Blob([JSON.stringify({ app: "wissenstrainer-v2", gesichert: new Date().toISOString(), inhalt: db.inhalt, stand: db.stand, einst: db.einst }, null, 1)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `wissenstrainer-v2-${tag()}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("[data-rein]", v).onclick = () => $("#sicherung", v).click();
  $("#sicherung", v).onchange = async (e) => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (d.app !== "wissenstrainer-v2" || !d.inhalt || !d.stand) throw new Error();
      Object.assign(db, { inhalt: d.inhalt, stand: d.stand, einst: { ...db.einst, ...d.einst } });
      speichern();
      melden("Lernstand eingespielt");
      modusAnwenden();
      zeichnen();
    } catch {
      melden("Diese Datei ist keine Sicherung des Wissenstrainers.");
    }
  };
  $("[data-reset]", v)?.addEventListener("click", () => frage("Beispieldaten zurücksetzen?", "Dein Lernstand in dieser Version geht dabei verloren.", "Zurücksetzen", async () => {
    allesZuruecksetzen();
    runde = null;
    await beispielLaden();
    melden("Zurückgesetzt");
    location.hash = "#/welt";
    zeichnen();
  }));
}

/* ---------- Verbindung ---------- */

function zeigeVerbindung(v) {
  if (verbunden()) {
    v.innerHTML = `
      ${kopf("Verbindung")}
      <div class="seite">
        <p class="neben" style="margin-bottom:16px">Verbunden mit deinen beiden Ablagen bei GitHub. Neue Karten kommen beim Öffnen der App und über „Neue Karten abrufen“.</p>
        <div class="zeilen">
          <div class="zeile"><span>Privat</span><span class="rechts zeile-text" style="text-align:right">${esc(verbindung.privatRepo)}</span></div>
          <div class="zeile"><span>Öffentlich</span><span class="rechts zeile-text" style="text-align:right">${esc(verbindung.oeffentlichRepo)}</span></div>
        </div>
        <div class="zeilen" style="gap:12px;margin-top:20px">
          <button class="knopf zweit" data-abrufen>Neue Karten abrufen</button>
          <button class="knopf zweit" data-trennen>Verbindung trennen</button>
        </div>
      </div>`;
    $("[data-abrufen]", v).onclick = () => abrufen(true);
    $("[data-trennen]", v).onclick = () => frage("Verbindung trennen?", "Der Schlüssel wird auf diesem Gerät gelöscht. Dein Lernstand und die zuletzt geladenen Karten bleiben.", "Trennen", () => {
      trennen();
      melden("Verbindung getrennt");
      zeichnen();
    });
    return;
  }
  const alt = ersteVersion();
  v.innerHTML = `
    ${kopf("Verbindung")}
    <div class="seite">
      <p class="neben" style="margin-bottom:16px">Gerade siehst du Beispieldaten. Mit deinem GitHub-Schlüssel siehst du deine echten Pakete und kannst neue hinzufügen.</p>
      ${alt.token ? `<button class="knopf" data-uebernehmen>Verbindung aus der ersten Version übernehmen</button>
        <p class="neben" style="margin:8px 0 24px">Dein Schlüssel ist auf diesem Gerät schon gespeichert.</p>
        <h2 class="zw" style="margin-bottom:12px">Oder Schlüssel eingeben</h2>` : ""}
      <div class="feld"><label for="v-token">GitHub-Schlüssel (beginnt mit github_pat_)</label><input id="v-token" type="password" autocomplete="off" spellcheck="false"></div>
      <button class="knopf ${alt.token ? "zweit" : ""}" data-verbinden>Verbinden</button>
    </div>`;
  $("[data-uebernehmen]", v)?.addEventListener("click", (e) => verbinden(alt.token, e.currentTarget));
  $("[data-verbinden]", v).onclick = (e) => {
    const token = $("#v-token", v).value.trim();
    if (!token) return melden("Bitte den Schlüssel einfügen.");
    verbinden({ token }, e.currentTarget);
  };
}

async function verbinden(daten, knopf) {
  knopf.disabled = true;
  verbindungSpeichern(daten);
  try {
    await pruefen();
  } catch (err) {
    trennen();
    knopf.disabled = false;
    return melden(`Keine Verbindung: ${err.message}`);
  }
  const alt = ersteVersion();
  if (alt.stand && (alt.gelernt || alt.gesichtet)) {
    blatt(`<h2 class="ue">Lernstand übernehmen?</h2>
      <p class="neben" style="margin-bottom:16px">Auf diesem Gerät gibt es aus der ersten Version ${mehrzahl(alt.gelernt, "gelernte Karte", "gelernte Karten")} und ${mehrzahl(alt.gesichtet, "gesichtete Karte", "gesichtete Karten")}. Die erste Version bleibt dabei unverändert.</p>
      <div class="knoepfe"><button class="knopf" data-ja>Lernstand übernehmen</button><button class="knopf zweit" data-nein>Neu beginnen</button></div>`, (bl) => {
      $("[data-ja]", bl).onclick = () => { blattZu(); einrichten(lernstandUebernehmen(alt.stand)); };
      $("[data-nein]", bl).onclick = () => { blattZu(); einrichten(null); };
    });
  } else {
    einrichten(null);
  }
}

// Von Beispieldaten auf echte Daten wechseln
async function einrichten(uebernommen) {
  melden("Lade deine Pakete …");
  try {
    const inhalt = await inhaltLaden();
    standNeu(uebernommen);
    runde = null;
    inhaltSetzen(inhalt);
    melden(`Verbunden: ${mehrzahl(inhalt.pakete.filter((p) => !p.basis || kartenVonPaket(p.id).length).length, "Paket", "Pakete")} geladen`);
    location.hash = "#/welt";
    zeichnen();
  } catch (err) {
    melden(`Laden fehlgeschlagen: ${err.message}`);
    zeichnen();
  }
}

// Karten neu von GitHub holen (beim Start leise, über „Neue Karten abrufen“ mit Meldung)
async function abrufen(laut) {
  if (!verbunden()) return;
  if (laut) melden("Frage GitHub …");
  try {
    const vorher = new Set(db.inhalt.karten.map((k) => k.id));
    const inhalt = await inhaltLaden();
    inhaltSetzen(inhalt);
    const neu = inhalt.karten.filter((k) => !vorher.has(k.id)).length;
    if (route().name !== "lernen") zeichnen();
    if (laut) melden(neu ? `${mehrzahl(neu, "neue Karte", "neue Karten")} zum Sichten` : "Alles aktuell");
  } catch (err) {
    if (laut) melden(`GitHub nicht erreichbar: ${err.message}`);
  }
}

function nichtGefunden(v, was) {
  v.innerHTML = `${kopf(was, "#/welt")}<div class="leer"><h2 class="ue">${esc(was)} nicht gefunden.</h2><p>Vielleicht wurde es gelöscht.</p><a class="knopf zweit" href="#/welt">Zur Welt</a></div>`;
}

/* ============================================================
   Start
   ============================================================ */

await laden();
modusAnwenden();
zeichnen();
if (verbunden() && !db.inhalt.beispiel) abrufen(false);

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
