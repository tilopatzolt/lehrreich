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
  lernstandUebernehmen, bereicheStand, bereicheSpeichern, bereichAnlegen, paketId, SAMMELBEREICH, paketZuordnen,
  paketBildSpeichern, paketTeilen, paketNichtTeilen, paketLink,
} from "./github.js";

const APP_STAND = "23.11.2026d";

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
  if (art === "welt") {
    // Hintergrund der Landkarte: eigenes Bild für Tag und Nacht, ohne Filter
    k.push({ src: `welt-${nacht ? "nacht" : "tag"}.webp`, filter: "none" });
    return { k, platz: { typ: "welt" } };
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
  if (p.typ === "welt") return `<span class="platz-welt"></span>`;
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
  return `<span class="bild bild-${art}" style="${skala}${stil}" data-platz="${esc(JSON.stringify(platz))}">${inhalt}</span>`;
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
  einstellungen: zeigeEinstellungen, sichern: zeigeSichern, verbindung: zeigeVerbindung, zettel: zeigeZettel,
};
const REITER_VON = {
  welt: "welt", bereich: "welt", paket: "welt", zettel: "welt", bereiche: "bereiche", ueben: "ueben", fortschritt: "ueben",
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

// Alle Plätze der Landkarte an einer Stelle (DESIGN.md 7.1, gemessen am Bild welt-tag/-nacht).
// x in % der Kartenbreite, y in % der Kartenhöhe. Bauplätze sind fest einem Bereich zugeordnet;
// Bereiche ohne Bauplatz sammelt die Bildungsreise am Steg.
const KARTEN_PLAETZE = {
  bauplaetze: {
    schule: [18.2, 31.3], lehrkraefte: [50.5, 31.4], universitaeten: [82.9, 31.3],
    senatsverwaltung: [21.2, 56.7], recht: [50.3, 56.7], schueler: [79.3, 56.7], lebenslang: [22.0, 74.0],
  },
  laternen: { y: 12.8, x: [12.3, 24.9, 37.4, 50.0, 62.6, 75.2, 87.7] },
  boot: { links: 38.1, oben: 80.1, breite: 44.1, hoehe: 16.3 },
};

const hatBauplatz = (b) => !!KARTEN_PLAETZE.bauplaetze[b.id];
const amSteg = () => db.inhalt.bereiche.filter((b) => !hatBauplatz(b));

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
  const steg = amSteg();
  const stegFaellig = steg.reduce((s, b) => s + (proBereich[b.id] || 0), 0);
  const { boot, laternen } = KARTEN_PLAETZE;
  const faehnchen = (f) => f ? `<span class="faehnchen"><span class="mast"></span><span class="fahne">${f}</span></span>` : "";

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
        <div class="land">
          ${bildHTML("welt", {}, "position:absolute;inset:0;width:100%;height:100%")}
          ${woche(heute()).map((t, i) => `<span class="laterne" style="left:${laternen.x[i]}%;top:${laternen.y}%" aria-hidden="true">${bildHTML("laterne", { an: lernTage.has(t) }, "width:100%;height:100%")}</span>`).join("")}
          ${db.inhalt.bereiche.filter(hatBauplatz).map((b) => {
            const [x, y] = KARTEN_PLAETZE.bauplaetze[b.id];
            const f = proBereich[b.id] || 0;
            const link = `#/bereich/${encodeURIComponent(b.id)}`;
            return `<a class="ort" href="${link}" style="left:${x}%;top:${y}%" aria-label="${esc(b.name)}${f ? `, heute ${f} fällig` : ""}">
                ${bildHTML("bereich", { kennung: b.kennung, stufe: stufeBereich(b.id), name: b.name }, "width:100%;height:100%")}
                ${faehnchen(f)}
              </a>
              <a class="schild" href="${link}" style="left:${x}%;top:${y}%" tabindex="-1" aria-hidden="true">${esc(b.name)}</a>`;
          }).join("")}
          <button class="boot" style="left:${boot.links}%;top:${boot.oben}%;width:${boot.breite}%;height:${boot.hoehe}%"
            ${steg.length ? `aria-label="Bildungsreise${stegFaellig ? `, heute ${stegFaellig} fällig` : ""}" data-boot` : 'disabled aria-hidden="true" tabindex="-1"'}>${faehnchen(stegFaellig)}</button>
        </div>
      </div>
    </section>`;
  $("[data-frei]", v)?.addEventListener("click", bereichWaehlen);
  $("[data-boot]", v)?.addEventListener("click", bildungsreise);
}

// Blatt „Bildungsreise“: alle Bereiche ohne eigenen Bauplatz, auch der Sammelbereich selbst
function bildungsreise() {
  blatt(`<h2 class="ue">Bildungsreise</h2>
    <div class="zeilen">${amSteg().map((b) => `
      <a class="zeile hoch" href="#/bereich/${encodeURIComponent(b.id)}" style="background:var(--vertieft)">
        <span style="display:flex;align-items:center;gap:12px;min-width:0">${bildHTML("bereich", { kennung: "allgemein", stufe: stufeBereich(b.id), name: "" }, "width:48px;height:48px")}<span class="zeile-text">${esc(b.name)}</span></span>
        <span class="rechts">${esc(bereichStatus(b))}</span>
      </a>`).join("")}</div>`);
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
      ${p.basis ? "" : `<button class="zeile" style="margin-top:12px" data-bereich-aendern><span>Bereich</span><span class="rechts">${esc(b.name)}</span></button>`}
      <div class="zeile" style="margin-top:${p.basis ? 12 : 8}px"><span>Im täglichen Lernplan</span>
        <label class="schalter"><input type="checkbox" id="im-plan" ${imPlan(p.id) ? "checked" : ""} aria-label="Im täglichen Lernplan"><i></i></label></div>
      <div class="knopf-reihe" style="margin-top:12px">
        <button class="knopf zweit" data-weitergeben>Weitergeben</button>
        <button class="knopf zweit" data-teilen>${p.geteilt || p.herkunft === "oeffentlich" ? "Öffentlich" : "Teilen"}</button>
        <a class="knopf zweit" href="#/zettel/${encodeURIComponent(p.id)}">Lernzettel</a>
      </div>
      ${(p.quellen || []).length ? `<h2 class="zw abschnitt">Dokumente</h2>
        <div class="zeilen">${p.quellen.map((q) => `<div class="zeile"><span class="zeile-text">${esc(q.titel)}</span><span class="rechts">${esc(q.herausgeber || "")}</span></div>`).join("")}</div>` : ""}
      <h2 class="zw abschnitt">Karten</h2>
      <div class="zeilen">${karten.length ? karten.map((k) => `<button class="zeile" data-karte="${esc(k.id)}"><span class="zeile-text">${esc(k.frage)}</span><span class="rechts">${esc(STATUS_WORT(stand(k.id)))}</span></button>`).join("")
        : `<p class="neben">Noch keine Karten.${p.basis ? " Dieses Basispaket wächst mit jedem Dokument, das du hinzufügst." : ""}</p>`}</div>
    </div>`;
  $("#im-plan", v).onchange = (e) => pausieren(p.id, !e.target.checked);
  $("[data-bild]", v).onclick = () => bildWaehlen(p);
  $("[data-weitergeben]", v).onclick = () => weitergeben(p);
  $("[data-teilen]", v).onclick = () => teilenBlatt(p);
  $("[data-bereich-aendern]", v)?.addEventListener("click", () => bereichAendern(p));
  $$("[data-karte]", v).forEach((x) => x.onclick = () => karteZeigen(karte(x.dataset.karte)));
  $("[data-leer]", v)?.addEventListener("click", (e) => { e.preventDefault(); melden("Erst Karten sichten, dann üben."); });
}

// Paket einem anderen Bereich zuordnen (Basispakete gehören fest zu ihrem Bereich)
function bereichAendern(p) {
  blatt(`<h2 class="ue">Bereich für „${esc(p.name)}“</h2>
    <div class="zeilen">${db.inhalt.bereiche.map((b) => `
      <button class="zeile" data-ziel="${esc(b.id)}" style="background:var(--${b.id === p.bereich ? "haupt" : "vertieft"});color:var(--${b.id === p.bereich ? "auf-haupt" : "text"})" ${b.id === p.bereich ? 'aria-current="true"' : ""}>
        <span class="zeile-text">${esc(b.name)}</span></button>`).join("")}</div>`, (bl) => {
    $$("[data-ziel]", bl).forEach((x) => x.onclick = async () => {
      const ziel = x.dataset.ziel;
      if (ziel === p.bereich) return blattZu();
      $$("[data-ziel]", bl).forEach((y) => y.disabled = true);
      try {
        if (verbunden()) await paketZuordnen(p.id, ziel, p.name, bereich(ziel).name);
        p.bereich = ziel;
        inhaltSetzen(db.inhalt);
        blattZu();
        melden(`„${p.name}“ liegt jetzt in ${bereich(ziel).name}`);
        zeichnen();
      } catch (err) {
        $$("[data-ziel]", bl).forEach((y) => y.disabled = false);
        melden(`Speichern fehlgeschlagen: ${err.message}`);
      }
    });
  });
}

/* ---------- Bild wählen ---------- */

// Freie Fotos aus Openverse und Wikimedia Commons (wie die Auswertung), abwechselnd aus beiden Quellen
async function bilderSuchen(q) {
  const json = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const openverse = json(`https://api.openverse.org/v1/images/?${new URLSearchParams({
    q, license_type: "all-cc", category: "photograph", aspect_ratio: "wide", mature: "false", page_size: "12",
  })}`).then((d) => (d.results || []).filter((r) => r.thumbnail && r.url).map((r) => ({
    query: q, thumb: r.thumbnail, url: r.url, title: r.title || "", creator: r.creator || "",
    license: `${(r.license || "").toUpperCase()} ${r.license_version || ""}`.trim(),
    license_url: r.license_url || "", page: r.foreign_landing_url || "",
  })));
  const ohneTags = (t) => String(t || "").replace(/<[^>]+>/g, "").trim();
  const commons = json(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
    action: "query", format: "json", origin: "*", generator: "search", gsrnamespace: "6",
    gsrsearch: `${q} filetype:bitmap`, gsrlimit: "12", prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "800",
  })}`).then((d) => Object.values(d.query?.pages || {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99)).map((pg) => {
    const info = pg.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    if (!info.thumburl || (info.width || 0) < (info.height || 1)) return null; // nur Querformat
    return {
      query: q, thumb: info.thumburl, url: info.url || "",
      title: ohneTags(meta.ObjectName?.value) || pg.title || "", creator: ohneTags(meta.Artist?.value).slice(0, 80),
      license: ohneTags(meta.LicenseShortName?.value), license_url: meta.LicenseUrl?.value || "", page: info.descriptionurl || "",
    };
  }).filter(Boolean));
  const erg = await Promise.allSettled([openverse, commons]);
  if (erg.every((r) => r.status === "rejected")) throw new Error("Bildsuche nicht erreichbar");
  const listen = erg.map((r) => (r.status === "fulfilled" ? r.value : []));
  const gemischt = [];
  for (let i = 0; i < Math.max(...listen.map((l) => l.length)); i++) listen.forEach((l) => l[i] && gemischt.push(l[i]));
  return gemischt;
}

function bildWaehlen(p) {
  if (!verbunden()) return melden("Erst unter „Mehr → Verbindung“ verbinden.");
  if (!kartenVonPaket(p.id).length) return melden("Ein Bild gibt es, sobald das Paket Karten hat.");
  blatt(`
    <h2 class="ue">Bild für „${esc(p.name)}“</h2>
    <form data-suche class="feld"><label for="b-q">Suchwörter (auf Englisch findet sich meist mehr)</label>
      <input id="b-q" type="search" enterkeyhint="search" value="${esc(p.foto?.query || p.name)}"></form>
    <div class="bildraster" data-raster></div>
    <div class="knoepfe">
      ${p.foto ? `<button class="knopf zweit" data-keins>Kein Bild</button>` : ""}
      <button class="knopf zweit" data-zu>Abbrechen</button>
    </div>`, (bl) => {
    let treffer = [];
    const raster = $("[data-raster]", bl);
    const suchen = async () => {
      const q = $("#b-q", bl).value.trim();
      if (!q) return;
      raster.innerHTML = `<p class="neben">Suche …</p>`;
      try {
        treffer = await bilderSuchen(q);
      } catch (err) {
        raster.innerHTML = `<p class="neben">${esc(err.message)}</p>`;
        return;
      }
      raster.innerHTML = treffer.length
        ? treffer.map((t, i) => `<button type="button" data-wahl="${i}" aria-label="${esc(t.title || "Foto")} wählen"><img src="${esc(t.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></button>`).join("")
        : `<p class="neben">Nichts gefunden. Andere Suchwörter?</p>`;
    };
    $("[data-suche]", bl).onsubmit = (e) => { e.preventDefault(); $("#b-q", bl).blur(); suchen(); };
    raster.onclick = (e) => {
      const b = e.target.closest("[data-wahl]");
      if (b) speichernBild(p, treffer[+b.dataset.wahl], bl);
    };
    $("[data-keins]", bl)?.addEventListener("click", () => speichernBild(p, false, bl));
    $("[data-zu]", bl).onclick = blattZu;
    suchen();
  });
}

async function speichernBild(p, bild, bl) {
  $$("button", bl).forEach((x) => x.disabled = true);
  try {
    await paketBildSpeichern(p, bild);
    if (bild) p.foto = { thumb: bild.thumb, creator: bild.creator, license: bild.license, page: bild.page, query: bild.query };
    else delete p.foto;
    inhaltSetzen(db.inhalt);
    blattZu();
    melden(bild ? "Bild gespeichert" : "Bild entfernt");
    zeichnen();
  } catch (err) {
    $$("button", bl).forEach((x) => x.disabled = false);
    melden(`Speichern fehlgeschlagen: ${err.message}`);
  }
}

/* ---------- Weitergeben, Teilen ---------- */

async function dateiTeilen(name, text, typ) {
  const datei = new File([text], name, { type: typ });
  if (navigator.canShare?.({ files: [datei] })) {
    try { await navigator.share({ files: [datei], title: name }); return; } catch (err) { if (err.name === "AbortError") return; }
  }
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(datei), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function weitergeben(p) {
  const oeffentlich = p.herkunft === "oeffentlich" || p.geteilt;
  blatt(`<h2 class="ue">Weitergeben</h2>
    <div class="zeilen">
      <button class="zeile hoch" data-link style="background:var(--vertieft)" ${oeffentlich ? "" : "disabled"}><span class="zwei"><b>Link</b><small>${oeffentlich ? "Andere sehen das Paket in der App" : "Erst öffentlich teilen"}</small></span></button>
      <button class="zeile hoch" data-anki style="background:var(--vertieft)"><span class="zwei"><b>Anki</b><small>Datei für die Lernkarten-App Anki</small></span></button>
      <a class="zeile hoch" href="#/zettel/${encodeURIComponent(p.id)}" style="background:var(--vertieft)"><span class="zwei"><b>Lernzettel</b><small>Zum Drucken oder als PDF</small></span></a>
    </div>`, (bl) => {
    $("[data-link]", bl).onclick = async () => {
      const url = paketLink(p);
      if (navigator.share) {
        try { await navigator.share({ title: p.name, text: `Lernkarten: ${p.name}`, url }); return; } catch (err) { if (err.name === "AbortError") return; }
      }
      try { await navigator.clipboard.writeText(url); melden("Link kopiert"); } catch { melden(url); }
    };
    $("[data-anki]", bl).onclick = () => {
      const behalten = kartenVonPaket(p.id).filter((k) => stand(k.id)?.s === "aktiv");
      if (!behalten.length) return melden("Noch keine behaltenen Karten in diesem Paket.");
      const sauber = (t) => String(t || "").replace(/[\t\r\n]+/g, " ").trim();
      const zeilen = ["#separator:tab", "#html:false", "#tags column:3",
        ...behalten.map((k) => [sauber(k.frage), sauber(k.antwort + (k.tipp ? ` — Für die Debatte: ${k.tipp}` : "")), sauber(paketId(p.name))].join("\t"))];
      dateiTeilen(`${paketId(p.name)}-anki.txt`, zeilen.join("\n") + "\n", "text/plain");
    };
  });
}

function teilenBlatt(p) {
  if (p.herkunft === "oeffentlich") return melden("Dieses Paket liegt in der öffentlichen Ablage und ist für alle sichtbar.");
  if (!verbunden()) return melden("Erst unter „Mehr → Verbindung“ verbinden.");
  const behalten = kartenVonPaket(p.id).filter((k) => stand(k.id)?.s === "aktiv");
  const hinweis = "Was einmal öffentlich war, lässt sich bei GitHub im Verlauf wiederfinden, auch wenn du das Teilen später beendest.";
  blatt(`<h2 class="ue">${p.geteilt ? "Öffentlich geteilt" : "Öffentlich teilen?"}</h2>
    <p class="neben" style="margin-bottom:16px">${p.geteilt
      ? `Eine Kopie der Karten ist für alle sichtbar. Neue Karten kommen erst dazu, wenn du die geteilten Karten aktualisierst.`
      : `${mehrzahl(behalten.length, "behaltene Karte wird", "behaltene Karten werden")} für alle sichtbar, mit Titel und Kernaussage der Dokumente. Die Dokumente selbst bleiben privat. ${hinweis}`}</p>
    <div class="knoepfe">
      <button class="knopf" data-ja ${behalten.length ? "" : "disabled"}>${p.geteilt ? "Geteilte Karten aktualisieren" : "Öffentlich teilen"}</button>
      ${p.geteilt ? `<button class="knopf zweit" data-beenden>Nicht mehr teilen</button>` : ""}
      <button class="knopf zweit" data-zu>Abbrechen</button>
    </div>`, (bl) => {
    $("[data-zu]", bl).onclick = blattZu;
    $("[data-ja]", bl).onclick = async (e) => {
      e.currentTarget.disabled = true;
      try {
        await paketTeilen(p, new Set(behalten.map((k) => k.id)), db.stand.aenderungen || {});
        p.geteilt = true;
        inhaltSetzen(db.inhalt);
        blattZu();
        melden("Geteilt – in ein paar Minuten öffentlich sichtbar");
        zeichnen();
      } catch (err) {
        e.currentTarget.disabled = false;
        melden(`Teilen fehlgeschlagen: ${err.message}`);
      }
    };
    $("[data-beenden]", bl)?.addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      try {
        await paketNichtTeilen(p);
        delete p.geteilt;
        inhaltSetzen(db.inhalt);
        blattZu();
        melden("Wird nicht mehr geteilt");
        zeichnen();
      } catch (err) {
        e.currentTarget.disabled = false;
        melden(`Fehlgeschlagen: ${err.message}`);
      }
    });
  });
}

/* ---------- Lernzettel ---------- */

function zeigeZettel(v, id) {
  const p = paket(id);
  if (!p) return nichtGefunden(v, "Paket");
  const karten = kartenVonPaket(p.id).filter((k) => stand(k.id)?.s !== "verworfen");
  const themen = {};
  for (const k of karten) (themen[k.thema || "Weitere"] ||= []).push(k);
  const datum = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  v.innerHTML = `
    <header class="kopfzeile nicht-drucken"><a class="tipp" href="#/paket/${encodeURIComponent(p.id)}" aria-label="Zurück">${ic("zurueck")}</a><h1>Lernzettel</h1><span></span></header>
    <div class="seite nicht-drucken"><button class="knopf" data-drucken>Drucken oder als PDF</button></div>
    <article class="zettel seite">
      <p class="neben">Lernzettel · ${esc(datum)}</p>
      <h1 class="ue" style="margin-top:4px">${esc(p.name)}</h1>
      ${(p.quellen || []).length ? `<p class="neben" style="margin-top:8px">Quellen: ${p.quellen.map((q) => esc([q.titel, q.herausgeber].filter(Boolean).join(", "))).join(" · ")}</p>` : ""}
      ${Object.entries(themen).map(([t, liste]) => `
        <section>
          <h2 class="zw">${esc(t)}</h2>
          ${liste.map((k) => `<div class="zettel-karte">
            <p class="z-frage">${esc(k.frage)}</p>
            <p class="z-antwort">${esc(k.antwort)}</p>
            ${k.tipp ? `<p class="z-tipp">Für die Debatte: ${esc(k.tipp)}</p>` : ""}
          </div>`).join("")}
        </section>`).join("") || '<p class="neben" style="margin-top:24px">Noch keine Karten.</p>'}
    </article>`;
  $("[data-drucken]", v).onclick = () => window.print();
}

function karteZeigen(k) {
  const p = paket(k.paket);
  blatt(`
    <p class="neben">${esc(bereich(p.bereich).name)} · ${esc(p.name)}</p>
    <p style="font-size:26px;font-weight:600;line-height:1.25;margin-top:12px">${esc(k.frage)}</p>
    <div style="height:4px;border-radius:2px;background:var(--trenner);margin:24px 0 20px"></div>
    <p style="font-size:22px;font-weight:700;line-height:1.25">${esc(k.antwort)}</p>
    ${k.quelle ? `<p class="neben" style="margin-top:8px">Quelle: ${esc(k.quelle)}</p>` : ""}
    ${k.tipp ? `<div class="tipp-block"><p class="tipp-titel">Für die Debatte</p><p class="tipp-text">${esc(k.tipp)}</p></div>` : ""}
    ${k.einordnung ? `<div class="tipp-block"><p class="tipp-titel">Einordnung</p><p class="tipp-text">${esc(k.einordnung)}</p></div>` : ""}
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
            ${k.tipp ? `<div class="tipp-block"><p class="tipp-titel">Für die Debatte</p><p class="tipp-text">${esc(k.tipp)}</p></div>` : ""}
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

// Stellflächen im Regal-Bild, gemessen an der Anzeige 350 × 300 (DESIGN.md 7.5)
const REGAL = { breite: 350, hoehe: 300, buchUnten: [142, 239], offenUnten: 240, startX: 40, abstand: 17, jeReihe: 15 };
const imRegal = (x, unten, b, h) => `left:${(x / REGAL.breite) * 100}%;top:${((unten - h) / REGAL.hoehe) * 100}%;width:${(b / REGAL.breite) * 100}%;height:${(h / REGAL.hoehe) * 100}%`;

function zeigeFortschritt(v) {
  const s = db.stand.figur.stufe;
  const buecher = fertigePakete();
  const fast = fastFertig();
  // obere Reihe: 15 Bücher; untere Reihe: links die offenen Bücher (je 48 px Tippfläche), danach weitere Bücher
  const obenB = buecher.slice(0, REGAL.jeReihe);
  const untenStart = REGAL.startX + fast.length * 48;
  const untenPlatz = Math.floor((310 - untenStart) / REGAL.abstand);
  const untenB = buecher.slice(REGAL.jeReihe, REGAL.jeReihe + Math.max(0, untenPlatz));
  v.innerHTML = `
    <header class="kopfzeile"><a class="tipp" href="#/ueben" aria-label="Zurück">${ic("zurueck")}</a><h1>Stufe ${s} von ${MAX_STUFE}</h1><span></span></header>
    <div class="seite">
      <div class="bibliothek">
        ${bildHTML("regal", {}, "position:absolute;inset:0;width:100%;height:100%")}
        ${obenB.map((p, i) => `<span class="buch" style="${imRegal(REGAL.startX + i * REGAL.abstand, REGAL.buchUnten[0], 18, 48)}">${bildHTML("buch", { nummer: (i % 4) + 1 }, "width:100%;height:100%")}</span>`).join("")}
        ${untenB.map((p, i) => `<span class="buch" style="${imRegal(untenStart + i * REGAL.abstand, REGAL.buchUnten[1], 18, 48)}">${bildHTML("buch", { nummer: ((REGAL.jeReihe + i) % 4) + 1 }, "width:100%;height:100%")}</span>`).join("")}
        <div class="figur-gross">${bildHTML("figur", { stufe: s }, "width:100%;height:100%")}</div>
        ${fast.map(({ p }, i) => `<button class="offen" style="${imRegal(REGAL.startX + i * 48, REGAL.offenUnten, 48, 48)}" aria-label="${esc(p.name)} lernen" data-paket="${esc(p.id)}">${bildHTML("buch-offen", {}, "width:91.7%;height:66.7%")}</button>`).join("")}
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
          <div class="rueck"><div class="strich"></div><p class="antwort">${esc(k.antwort)}</p>${k.quelle ? `<p class="quelle">Quelle: ${esc(k.quelle)}</p>` : ""}${k.tipp ? `<div class="tipp-block"><p class="tipp-titel">Für die Debatte</p><p class="tipp-text">${esc(k.tipp)}</p></div>` : ""}</div>
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
      <button type="button" data-wert="foto">Foto</button>
    </div>
    <div class="feld" data-fuer="text"><label for="h-text">Text</label><textarea id="h-text" placeholder="Text hier einfügen …"></textarea></div>
    <div class="feld" data-fuer="datei" hidden><label for="h-datei">Datei (PDF, Word, Text)</label><input id="h-datei" type="file" accept=".pdf,.docx,.txt,.md,.html,.htm"></div>
    <div class="feld" data-fuer="foto" hidden><label for="h-foto">Fotos von Textseiten – mehrere werden ein Dokument, je Foto eine Seite</label><input id="h-foto" type="file" accept="image/*" multiple></div>
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
      const fotos = [...$("#h-foto", bl).files];
      const titel = $("#h-titel", bl).value.trim();
      if (art === "text" && !text.trim()) return melden("Bitte zuerst Text einfügen.");
      if (art === "datei" && !datei) return melden("Bitte eine Datei wählen.");
      if (art === "foto" && !fotos.length) return melden("Bitte ein Foto aufnehmen oder auswählen.");
      if (!titel) return melden("Bitte einen Titel eingeben.");
      const knopf = e.currentTarget;
      knopf.disabled = true;
      knopf.textContent = "Wird hochgeladen …";
      try {
        const r = await hochladen({
          bereich: $("#h-bereich", bl).value, ziel, titel,
          text: art === "text" ? text : "",
          datei: art === "datei" ? datei : art === "foto" ? await fotosAlsPdf(fotos, titel, knopf) : null,
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

/* ---------- Fotos → PDF ---------- */

// Fotos von Textseiten werden auf dem Gerät zu einem PDF (je Foto eine Seite). Die Auswertung liest
// PDFs samt Bildern; so bleibt sie unverändert und mehrere Seiten bleiben ein Dokument.
async function fotosAlsPdf(fotos, titel, knopf) {
  const seiten = [];
  for (const [i, f] of fotos.entries()) {
    knopf.textContent = `Foto ${i + 1} von ${fotos.length} …`;
    seiten.push(await alsJpeg(f));
  }
  const name = `${tag()} ${titel.replace(/[\\/:]+/g, " - ").slice(0, 60).trim()}.pdf`;
  return new File([pdfAusJpegs(seiten)], name, { type: "application/pdf" });
}

// Foto laden, auf höchstens 2000 px Kantenlänge verkleinern, als JPEG kodieren
function alsJpeg(datei, max = 2000) {
  return new Promise((ok, fehler) => {
    const url = URL.createObjectURL(datei);
    const img = new Image();
    img.onload = () => {
      const f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * f), h = Math.round(img.naturalHeight * f);
      const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob(async (b) => b ? ok({ bytes: new Uint8Array(await b.arrayBuffer()), w, h }) : fehler(new Error("Foto nicht lesbar")), "image/jpeg", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); fehler(new Error("Foto nicht lesbar")); };
    img.src = url;
  });
}

// Kleinstes gültiges PDF: je Seite ein JPEG (DCTDecode), Seitengröße = Bildgröße in Punkt
function pdfAusJpegs(seiten) {
  const teile = [];
  const ab = [];
  let laenge = 0;
  const raus = (x) => {
    const b = typeof x === "string" ? new TextEncoder().encode(x) : x;
    teile.push(b);
    laenge += b.length;
  };
  const obj = (n, kopf, strom) => {
    ab[n] = laenge;
    raus(`${n} 0 obj\n${kopf}\n`);
    if (strom) { raus("stream\n"); raus(strom); raus("\nendstream\n"); }
    raus("endobj\n");
  };
  raus("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const anzahl = seiten.length;
  const seitenNr = seiten.map((_, i) => 3 + i * 3);
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Count ${anzahl} /Kids [${seitenNr.map((n) => `${n} 0 R`).join(" ")}] >>`);
  seiten.forEach((s, i) => {
    const n = seitenNr[i];
    const pw = (s.w * 0.75).toFixed(2), ph = (s.h * 0.75).toFixed(2);
    const inhalt = `q ${pw} 0 0 ${ph} 0 0 cm /Bild Do Q`;
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Bild ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    obj(n + 1, `<< /Length ${inhalt.length} >>`, new TextEncoder().encode(inhalt));
    obj(n + 2, `<< /Type /XObject /Subtype /Image /Width ${s.w} /Height ${s.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.bytes.length} >>`, s.bytes);
  });
  const gesamt = 3 + anzahl * 3;
  const xref = laenge;
  raus(`xref\n0 ${gesamt}\n0000000000 65535 f \n`);
  for (let n = 1; n < gesamt; n++) raus(`${String(ab[n]).padStart(10, "0")} 00000 n \n`);
  raus(`trailer\n<< /Size ${gesamt} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(teile, { type: "application/pdf" });
}

/* ---------- Bereiche verwalten ---------- */

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
    <p class="neben" style="margin-bottom:16px">Der Bereich bekommt ein leeres Basispaket. Auf der Landkarte findest du ihn bei der Bildungsreise am Steg.</p>
    <div class="knoepfe"><button class="knopf" data-anlegen>Anlegen</button><button class="knopf zweit" data-zu>Abbrechen</button></div>`, (bl) => {
    $("[data-zu]", bl).onclick = blattZu;
    $("[data-anlegen]", bl).onclick = async (e) => {
      const name = $("#n-name", bl).value.trim();
      const kennung = "allgemein";
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
      <p class="neben" style="margin-bottom:16px">Dein Lernstand liegt nur auf diesem Gerät. Mit einer Sicherung kannst du ihn auf ein anderes Gerät mitnehmen. Einspielen nimmt auch eine Sicherung der ersten Version an.</p>
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
      // Sicherung der ersten Version (Mehr → Lernstand → Sichern): Lernstand übernehmen, Inhalte bleiben
      if (!d.app && d.cards && d.settings) {
        if (!verbunden()) return melden("Erst unter „Mehr → Verbindung“ verbinden, dann die Sicherung einspielen.");
        standNeu(lernstandUebernehmen(d));
        runde = null;
        inhaltSetzen(db.inhalt);
        melden("Lernstand aus der ersten Version übernommen");
        zeichnen();
        return;
      }
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
    einrichten(null, true);
  }
}

// Von Beispieldaten auf echte Daten wechseln
async function einrichten(uebernommen, ohneAltdaten = false) {
  melden("Lade deine Pakete …");
  try {
    const inhalt = await inhaltLaden();
    standNeu(uebernommen);
    runde = null;
    inhaltSetzen(inhalt);
    const n = mehrzahl(inhalt.pakete.filter((p) => !p.basis || kartenVonPaket(p.id).length).length, "Paket", "Pakete");
    melden(ohneAltdaten ? `${n} geladen. Lernstand der ersten Version: unter „Mehr → Lernstand sichern“ einspielen.` : `Verbunden: ${n} geladen`);
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
