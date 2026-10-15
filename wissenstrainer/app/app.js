import { schedule, preview, isDue, isMature, dayKey } from "./srs.js";

/* ============================================================
   Zustand
   ============================================================ */

const APP_VERSION = "15.10.2026 b"; // bei jeder Änderung hochzählen, wird unter „Mehr“ angezeigt
const STORE_KEY = "wt.v1";
const TOKEN_KEY = "wt.github";
const CACHE_KEY = "wt.pakete";
const DAY = 86400000;

// Wo was liegt: öffentliches Repo (dieses) und private Ablage (eigenes, privates Repo)
const PUBLIC = { docs: "wissenstrainer/oeffentlich", data: "wissenstrainer/app/data/pakete" };
const PRIVATE = { docs: "privat", data: "karten" };

const TYPES = {
  fakt: "Fakt",
  zahl: "Zahl",
  argument: "Argument",
  beispiel: "Beispiel",
  zitat: "Zitat",
  begriff: "Begriff",
};

const DEFAULT_SETTINGS = { newPerDay: 10, autoAccept: false, theme: "auto", skip: {} };

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* privater Modus o. Ä. – App läuft trotzdem, nur ohne Speichern */
  }
}

const state = Object.assign({ cards: {}, custom: [], log: {}, settings: {} }, readJSON(STORE_KEY, {}));
state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
state.settings.skip ||= {};

const storedGithub = readJSON(TOKEN_KEY, {});
let github = {
  token: storedGithub.token || "",
  publicRepo: storedGithub.publicRepo || storedGithub.repo || "tilopatzolt/lehrreich",
  privateRepo: storedGithub.privateRepo ?? "tilopatzolt/wissenstrainer-privat",
  branch: storedGithub.branch || "main",
};

// Ein Paket: { id, name, origin: "privat" | "oeffentlich", published, sources, cards, ... }
let packages = [];
let publicShas = {};
let isDemo = false;
let privateError = "";

const save = () => writeJSON(STORE_KEY, state);
const isOwner = () => !!github.token;

const CUSTOM_PKG = { id: "eigene", name: "Eigene Karten", origin: "privat", sources: [], cards: [] };

function allPackages() {
  return state.custom.length ? [...packages, { ...CUSTOM_PKG, cards: state.custom }] : packages;
}

function pkgById(id) {
  return allPackages().find((p) => p.id === id);
}

function cardState(id, pkg, card) {
  if (!state.cards[id]) {
    // veröffentlichte Pakete sind schon gesichtet, alles andere kommt erst zum Sichten
    const curated = (pkg?.published_from_private && !card?.demo_new) || pkg?.id === "eigene";
    state.cards[id] = { status: curated || state.settings.autoAccept ? "active" : "new" };
  }
  return state.cards[id];
}

function allCards() {
  return allPackages().flatMap((p) =>
    p.cards.map((c) => {
      const st = cardState(c.id, p, c);
      return { ...c, ...(st.edits || {}), paket: p.id, st };
    }),
  );
}

const inPlan = (pkgId) => !state.settings.skip[pkgId];
const byStatus = (status) => allCards().filter((c) => c.st.status === status);

function todayLog() {
  const k = dayKey();
  state.log[k] ||= { reviews: 0, fresh: 0, again: 0 };
  return state.log[k];
}

function streak() {
  let n = 0;
  let t = Date.now();
  if (!state.log[dayKey(t)]?.reviews) t -= DAY; // heute noch nicht gelernt zählt nicht als Abbruch
  while (state.log[dayKey(t)]?.reviews) {
    n++;
    t -= DAY;
  }
  return n;
}

function studyQueue(pkgId) {
  const active = byStatus("active").filter((c) => (pkgId ? c.paket === pkgId : inPlan(c.paket)));
  const due = active.filter((c) => isDue(c.st.srs)).sort((a, b) => a.st.srs.due - b.st.srs.due);
  const left = Math.max(0, state.settings.newPerDay - todayLog().fresh);
  const fresh = active
    .filter((c) => !c.st.srs)
    .sort((a, b) => (b.importance || 0) - (a.importance || 0) || String(a.created).localeCompare(String(b.created)))
    .slice(0, pkgId ? Math.max(left, 10) : left);
  // neue Karten zwischen die Wiederholungen mischen
  const queue = [];
  while (due.length || fresh.length) {
    queue.push(...due.splice(0, 3));
    if (fresh.length) queue.push(fresh.shift());
  }
  return queue;
}

function pkgStats(p) {
  const cards = allCards().filter((c) => c.paket === p.id);
  const active = cards.filter((c) => c.st.status === "active");
  return {
    total: cards.length,
    active: active.length,
    fresh: cards.filter((c) => c.st.status === "new").length,
    mature: active.filter((c) => isMature(c.st.srs)).length,
    learning: active.filter((c) => c.st.srs?.reps && !isMature(c.st.srs)).length,
    due: studyQueue(p.id).length,
  };
}

/* ============================================================
   GitHub
   ============================================================ */

function gh(repo, path, opts = {}) {
  // ohne Pfad keinen Schrägstrich anhängen: …/repos/owner/name/ beantwortet GitHub mit 400
  return fetch(`https://api.github.com/repos/${repo}${path ? `/${path}` : ""}`, {
    ...opts,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${github.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
}

const encPath = (path) => path.split("/").map(encodeURIComponent).join("/");
const ref = () => `?ref=${encodeURIComponent(github.branch)}`;

async function ghList(repo, dir) {
  const res = await gh(repo, `contents/${encPath(dir)}${ref()}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`${repo}: ${res.status}`);
  return (await res.json()).filter((f) => f.type === "file" && f.name.endsWith(".json") && f.name !== "index.json");
}

async function ghRaw(repo, path) {
  const res = await gh(repo, `contents/${encPath(path)}${ref()}`, { headers: { Accept: "application/vnd.github.raw+json" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function ghPut(repo, path, base64, message) {
  let sha;
  const existing = await gh(repo, `contents/${encPath(path)}${ref()}`);
  if (existing.ok) sha = (await existing.json()).sha;
  const res = await gh(repo, `contents/${encPath(path)}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: base64, branch: github.branch, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
}

async function ghDelete(repo, path, message) {
  const existing = await gh(repo, `contents/${encPath(path)}${ref()}`);
  if (!existing.ok) return;
  const { sha } = await existing.json();
  const res = await gh(repo, `contents/${encPath(path)}`, {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: github.branch }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

function toBase64Text(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/* ============================================================
   Laden
   ============================================================ */

async function loadPublic() {
  // Mit Schlüssel direkt aus dem Repo: frisch, ohne auf die Veröffentlichung zu warten
  if (isOwner()) {
    try {
      const files = await ghList(github.publicRepo, PUBLIC.data);
      publicShas = Object.fromEntries(files.map((f) => [f.name.replace(/\.json$/, ""), f.sha]));
      return await Promise.all(files.map((f) => ghRaw(github.publicRepo, f.path)));
    } catch {
      /* auf die veröffentlichte Fassung zurückfallen */
    }
  }
  const index = await (await fetch(`data/pakete/index.json?t=${Date.now()}`, { cache: "no-store" })).json();
  return Promise.all(index.pakete.map(async (p) => (await fetch(`data/pakete/${encodeURIComponent(p.id)}.json?t=${Date.now()}`)).json()));
}

async function loadPrivate() {
  privateError = "";
  if (!isOwner() || !github.privateRepo) return [];
  try {
    const files = await ghList(github.privateRepo, PRIVATE.data);
    return await Promise.all(files.map((f) => ghRaw(github.privateRepo, f.path)));
  } catch (err) {
    privateError = String(err.message || err);
    return null;
  }
}

function merge(priv, pub) {
  const result = priv.map((p) => ({ ...p, origin: "privat", published: false }));
  for (const p of pub) {
    const own = result.find((x) => x.id === p.id);
    // Veröffentlichte Kopie eines eigenen privaten Pakets: nur einmal anzeigen
    if (own && p.published_from_private) own.published = true;
    else if (own) result.push({ ...p, id: `${p.id}~oeffentlich`, origin: "oeffentlich" });
    else result.push({ ...p, origin: "oeffentlich" });
  }
  // eigene (private) Pakete zuerst, dann alphabetisch
  return result.sort((a, b) => (a.origin === "privat" ? 0 : 1) - (b.origin === "privat" ? 0 : 1) || a.name.localeCompare(b.name, "de"));
}

async function load({ quiet = true } = {}) {
  const cached = readJSON(CACHE_KEY, { priv: [], pub: [] });
  let pub = cached.pub;
  let priv = cached.priv;
  try {
    pub = await loadPublic();
  } catch {
    /* offline: letzte bekannte Fassung */
  }
  const p = await loadPrivate();
  if (p !== null) priv = isOwner() ? p : [];
  writeJSON(CACHE_KEY, { priv, pub });

  let merged = merge(priv, pub);
  isDemo = !merged.some((x) => x.cards.length);
  if (isDemo) {
    try {
      const demo = await (await fetch("data/demo.json")).json();
      merged = [{ ...demo, origin: "oeffentlich" }];
    } catch {
      merged = [];
    }
  }
  const before = new Set(Object.keys(state.cards));
  packages = merged;
  const added = allCards().filter((c) => !before.has(c.id)).length;
  save();
  render();
  if (!quiet) toast(privateError ? `Private Ablage nicht erreichbar: ${privateError}` : added ? `${added} neue Karten geladen` : "Alles aktuell");
}

/* ============================================================
   Hilfsfunktionen
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Icons: Material Symbols (Schrift), so wie im Stitch-Entwurf
const ms = (name, fill = false) => `<span class="ms${fill ? " fill" : ""}" aria-hidden="true">${name}</span>`;

const icon = {
  doc: ms("description"),
  x: ms("close"),
  check: ms("check"),
  pen: ms("edit_note"),
  plus: ms("add"),
  search: ms("search"),
  info: ms("info"),
  upload: ms("upload_file"),
  refresh: ms("sync"),
  lock: ms("lock"),
  globe: ms("public"),
  link: ms("link"),
  print: ms("picture_as_pdf"),
  file: ms("swap_horiz"),
  chevron: ms("chevron_right"),
  back: ms("arrow_back"),
  share: ms("ios_share"),
};

// Rückseiten-Überschrift je Kartenart
const KERN_LABEL = {
  fakt: "Kernfakt", zahl: "Kernzahl", argument: "Kernargument",
  beispiel: "Beispiel", zitat: "Aussage", begriff: "Definition",
};

function stars(n) {
  return n ? `<span class="stars" title="Wichtigkeit">${"●".repeat(n)}${"○".repeat(3 - n)}</span>` : "";
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

function originBadge(p, { mini = false } = {}) {
  const cls = mini ? "mini" : "vis";
  if (p.origin === "privat") {
    return p.published
      ? `<span class="${cls} vis-pub">${icon.globe}Privat · geteilt</span>`
      : `<span class="${cls} vis-priv">${icon.lock}Privat</span>`;
  }
  return `<span class="${cls} vis-pub">${icon.globe}Öffentlich</span>`;
}

function dueLabel(st) {
  if (!st?.srs) return "Neu";
  if (isDue(st.srs)) return "Fällig: Heute";
  return `Fällig: ${new Date(st.srs.due).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`;
}

function flashHTML(c, { reveal = false, meta = true } = {}) {
  const pkg = pkgById(c.paket) || {};
  const src = (pkg.sources || []).find((s) => s.id === c.source) || {};
  const srcLine = [src.title, src.organisation, c.location].filter(Boolean).map(esc).join(" · ");
  return `
    <article class="flash" data-type="${esc(c.type)}" data-id="${esc(c.id)}">
      ${meta ? `<div class="meta">
        <span class="type-chip">${esc(TYPES[c.type] || c.type)}</span>
        <span class="due">${c.topic ? ms("folder") : ms("schedule")}${esc(c.topic || dueLabel(c.st))}</span>
      </div>` : ""}
      <p class="front ${c.type === "zitat" ? "quote-style" : ""}">${esc(c.front)}</p>
      ${reveal ? `
      <div class="answer">
        <div class="blk kern">
          <span class="lbl">${ms("flag")}${esc(KERN_LABEL[c.type] || "Kernfakt")}</span>
          <p class="main">${esc(c.back)}</p>
        </div>
        ${c.attribution ? `<span class="attr">${esc(c.attribution)}</span>` : ""}
        ${c.explanation ? `<div class="blk info"><span class="lbl">${ms("info")}Einordnung</span><p>${esc(c.explanation)}</p></div>` : ""}
        ${c.tipp ? `<div class="blk tipp"><span class="lbl">${ms("lightbulb", true)}Debatten-Tipp</span><p>${esc(c.tipp)}</p></div>` : ""}
        ${c.quote ? `<div class="blk zitat"><span class="lbl">${ms("format_quote")}Im Original</span><p>„${esc(c.quote)}“</p></div>` : ""}
        ${srcLine ? `<div class="src">${ms("verified", true)}<span>${srcLine}</span></div>` : ""}
      </div>` : ""}
    </article>`;
}

let toastTimer;
function toast(msg, action) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button">${esc(action.label)}</button>` : "");
  if (action) $("button", el).onclick = () => { action.run(); el.classList.remove("show"); };
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), action ? 5000 : 2800);
}

function openSheet(html, mount) {
  const root = $("#sheet-root");
  root.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  $(".sheet-backdrop", root).onclick = closeSheet;
  mount?.($(".sheet", root));
}

function closeSheet() {
  $("#sheet-root").innerHTML = "";
}

// Rückfrage als eigenes Blatt (confirm() ist nicht überall verfügbar)
function ask(title, text, okLabel, onOk, { danger = false } = {}) {
  openSheet(`
    <h2>${esc(title)}</h2>
    <p class="muted" style="margin-top:-6px">${text}</p>
    <div class="sheet-actions">
      <button class="btn ghost" data-no>Abbrechen</button>
      <button class="btn ${danger ? "danger-fill" : "accent"}" data-yes>${esc(okLabel)}</button>
    </div>`, (sheet) => {
    $("[data-no]", sheet).onclick = closeSheet;
    $("[data-yes]", sheet).onclick = async (e) => {
      e.currentTarget.disabled = true;
      await onOk();
      closeSheet();
    };
  });
}

function applyTheme() {
  const t = state.settings.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "paket";
}

async function shareOrDownload(filename, text, mime) {
  const file = new File([text], filename, { type: mime });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ============================================================
   Router
   ============================================================ */

const routes = {
  heute: renderToday,
  sichten: renderReview,
  bibliothek: renderLibrary,
  mehr: renderSettings,
  lernen: renderStudy,
  paket: renderPackage,
  zettel: renderSheetView,
};
const TAB_OF = { paket: "bibliothek", zettel: "bibliothek" };

function currentRoute() {
  const [name, ...rest] = location.hash.replace(/^#\/?/, "").split("/");
  return { name: routes[name] ? name : "heute", args: rest.map(decodeURIComponent) };
}

function render() {
  const { name, args } = currentRoute();
  document.body.classList.toggle("focus", name === "lernen" || name === "zettel");
  const tab = TAB_OF[name] || name;
  $$(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
  const fresh = byStatus("new").length;
  const badge = $(".tabbar .badge");
  badge.hidden = !fresh;
  badge.textContent = fresh > 99 ? "99+" : fresh;
  routes[name]($("#view"), ...args);
}

window.addEventListener("hashchange", () => {
  closeSheet();
  $("#toast").classList.remove("show");
  if (currentRoute().name === "lernen") session = null;
  render();
  window.scrollTo(0, 0);
});

/* ============================================================
   Heute
   ============================================================ */

const PKG_COLORS = ["var(--cognac)", "var(--slate)", "var(--accent)", "var(--t-zitat)", "var(--t-fakt)"];

function pkgCardHTML(p, i) {
  const s = pkgStats(p);
  const base = Math.max(1, s.active);
  const pct = Math.round((s.mature / base) * 100);
  return `
    <a class="pkg-card ${inPlan(p.id) ? "" : "paused"}" href="#/paket/${encodeURIComponent(p.id)}" style="--pc:${PKG_COLORS[i % PKG_COLORS.length]}">
      <span class="no">${String(i + 1).padStart(2, "0")}</span>
      <div>
        <h3>${esc(p.name)}</h3>
        <div class="chips">
          ${s.due ? `<span class="mini due">Heute ${s.due} fällig</span>` : s.active ? `<span class="mini done">${ms("check_circle")}Erledigt</span>` : ""}
          ${s.fresh ? `<span class="mini new">${s.fresh} neu</span>` : ""}
          ${originBadge(p, { mini: true })}
          ${inPlan(p.id) ? "" : `<span class="mini">pausiert</span>`}
        </div>
      </div>
      <div class="progress-row">
        <span><span>${pct} % von ${s.total}</span>${ms("arrow_forward")}</span>
        <div class="meter thin"><i style="width:${(s.mature / base) * 100}%"></i><i class="l" style="width:${(s.learning / base) * 100}%"></i></div>
      </div>
    </a>`;
}

function mastheadHTML() {
  const n = streak();
  return `
    <div class="masthead">
      <a class="wordmark" href="#/heute">Wissenstrainer<small>Dossier</small></a>
      <span class="streak-pill" title="Lernserie in Tagen">${ms("local_fire_department", true)}${n}</span>
    </div>`;
}

function weekHTML() {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const todayKey = dayKey();
  return `<div class="week">${days.map((d, i) => {
    const t = new Date(monday);
    t.setDate(monday.getDate() + i);
    const k = dayKey(t.getTime());
    const done = !!state.log[k]?.reviews;
    const isToday = k === todayKey;
    const future = k > todayKey;
    return `<div class="${isToday ? "is-today" : ""}"><span>${d}</span><b class="${done ? "done" : ""} ${isToday ? "today" : ""}">${done ? ms("check") : isToday ? "Heute" : future ? "" : "–"}</b></div>`;
  }).join("")}</div>`;
}

let homeFilter = "alle";

function renderToday(view) {
  const now = new Date();
  const h = now.getHours();
  const name = (state.settings.name || "").trim();
  const greet = `${h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend"}${name ? `, ${esc(name)}` : ""}.`;
  const cards = allCards();
  const active = cards.filter((c) => c.st.status === "active" && inPlan(c.paket));
  const mature = active.filter((c) => isMature(c.st.srs)).length;
  const fresh = cards.filter((c) => c.st.status === "new").length;
  const queue = studyQueue();
  const pct = active.length ? Math.round((mature / active.length) * 100) : 0;
  const n = streak();
  const learnedToday = !!todayLog().reviews;
  const pkgsAll = allPackages().filter((p) => p.cards.length);
  const pkgs = pkgsAll.filter((p) => homeFilter === "alle" || (homeFilter === "privat" ? p.origin === "privat" : p.origin !== "privat"));

  // Zitat des Tages: eine Zitat-Karte, jeden Tag eine andere
  const quotes = cards.filter((c) => c.st.status !== "rejected" && (c.type === "zitat" || c.quote));
  const qd = quotes.length ? quotes[[...dayKey()].reduce((a, ch) => a + ch.charCodeAt(0), 0) % quotes.length] : null;
  const qSrc = qd ? (pkgById(qd.paket)?.sources || []).find((s) => s.id === qd.source) : null;

  view.innerHTML = `
    ${mastheadHTML()}
    <header class="page-head">
      <div class="edition">
        <p class="eyebrow">${esc(now.toLocaleDateString("de-DE", { weekday: "long" }))} • ${esc(now.toLocaleDateString("de-DE", { day: "numeric", month: "long" }))}</p>
        ${isDemo ? `<span class="sync off"><i></i>Beispieldaten</span>` : isOwner() ? `<span class="sync"><i></i>Verbunden</span>` : ""}
      </div>
      <h1 class="title">${greet}</h1>
      <p class="lede">Bereit für die nächste Debatte?</p>
    </header>

    ${isDemo ? `<div class="demo-note">${icon.info}<div><b>Beispieldaten.</b> Sobald dein erstes Dokument verarbeitet ist, erscheinen hier deine eigenen Pakete. <a href="#/mehr">Dokument hinzufügen</a></div></div>` : ""}

    <section class="status-block">
      <div class="section-head" style="margin-top:0">
        <div><p class="eyebrow">Tagesabruf</p><h2 class="section">Status &amp; Wiederholung</h2></div>
        <small>Heute fällig</small>
      </div>
      <div class="status">
        <div class="status-num">${queue.length}</div>
        <div class="status-meta">
          <div class="row1"><span>Gefestigt</span><b>${pct} %</b></div>
          <div class="meter"><i style="width:${pct}%"></i></div>
          <p>${active.length ? `${mature} von ${active.length} Karten verinnerlicht.` : "Noch keine Karten im Lernplan."}</p>
        </div>
      </div>
      ${queue.length
        ? `<a class="cta" href="#/lernen"><span>${ms("play_circle")}Lernen starten</span><span><span class="count">${plural(queue.length, "Karte", "Karten")} fällig</span>${ms("arrow_forward").replace('class="ms"', 'class="ms arrow"')}</span></a>`
        : active.length
          ? `<a class="cta" href="#/lernen/frei"><span>${ms("fitness_center")}Freies Training</span><span><span class="count">alles erledigt</span>${ms("arrow_forward").replace('class="ms"', 'class="ms arrow"')}</span></a>`
          : `<a class="cta" href="#/sichten"><span>${ms("style")}Karten sichten</span>${ms("arrow_forward").replace('class="ms"', 'class="ms arrow"')}</a>`}
    </section>

    ${fresh ? `
    <a class="inbox-cta" href="#/sichten">
      <span class="num">${fresh > 99 ? "99+" : fresh}</span>
      <div><b>${fresh === 1 ? "Neuer Entwurf" : "Neue Entwürfe"} zum Sichten</b><small>Behalten, verwerfen oder umformulieren</small></div>
      ${icon.chevron}
    </a>` : ""}

    <div class="section-head">
      <div><p class="eyebrow">Disziplin</p><h2 class="section serie-title"><span class="flame">${ms("local_fire_department", true)}</span>${plural(n, "Tag", "Tage")} Lernserie</h2></div>
      <span class="state-pill ${learnedToday ? "" : "off"}">${learnedToday ? "Aktiv" : "Heute offen"}</span>
    </div>
    ${weekHTML()}

    ${pkgsAll.length ? `
    <div class="section-head">
      <div><p class="eyebrow">Katalog</p><h2 class="section">Themen-Pakete</h2></div>
      <a href="#/bibliothek">Alle</a>
    </div>
    <div class="filter-row">
      ${[["alle", "Alle Dossiers"], ["privat", "Privat"], ["oeffentlich", "Öffentlich"]].map(([k, v]) => `<button class="chip ${homeFilter === k ? "on" : ""}" data-hf="${k}">${v}</button>`).join("")}
    </div>
    <div class="pkg-list">${pkgs.map(pkgCardHTML).join("") || `<p class="faint">Keine Pakete in dieser Auswahl.</p>`}</div>` : ""}

    ${qd ? `
    <section class="quote-day">
      <p class="eyebrow">Zitat des Tages</p>
      <blockquote>„${esc(qd.type === "zitat" && !qd.quote ? qd.back : qd.quote || qd.back)}“</blockquote>
      <footer>
        <div><b>${esc(qd.attribution || qSrc?.organisation || qSrc?.authors || "")}</b><span>${esc(qSrc?.title || pkgById(qd.paket)?.name || "")}</span></div>
        <a href="#" data-qcard="${esc(qd.id)}">Kontext ${ms("arrow_forward")}</a>
      </footer>
    </section>` : ""}
  `;

  $$("[data-hf]", view).forEach((b) => b.onclick = () => { homeFilter = b.dataset.hf; renderToday(view); });
  $("[data-qcard]", view)?.addEventListener("click", (e) => {
    e.preventDefault();
    showCard(allCards().find((c) => c.id === e.currentTarget.dataset.qcard));
  });
}

/* ============================================================
   Lernen
   ============================================================ */

let session = null;

function renderStudy(view, mode, pkgId) {
  if (!session) {
    const free = mode === "frei";
    const pkg = mode === "paket" ? pkgId : null;
    const queue = free ? byStatus("active").filter((c) => inPlan(c.paket)).sort(() => Math.random() - 0.5).slice(0, 15) : studyQueue(pkg);
    session = { free, pkg, queue, done: 0, revealed: false };
  }
  const s = session;
  const card = s.queue[0];
  const back = s.pkg ? `#/paket/${encodeURIComponent(s.pkg)}` : "#/heute";
  const total = s.done + s.queue.length;
  const pct = total ? Math.round((s.done / total) * 100) : 0;

  if (!card) {
    view.innerHTML = `
      <div class="study">
        <div class="done">
          <div class="big">${ms(s.done ? "check" : "hourglass_empty")}</div>
          <h2>${s.done ? "Runde geschafft." : "Nichts fällig."}</h2>
          <p class="muted">${s.done ? `${plural(s.done, "Karte", "Karten")} wiederholt. Gut vorbereitet für die nächste Debatte.` : "Gerade gibt es hier nichts zu lernen."}</p>
          <p style="margin-top:28px"><a class="btn accent" href="${back}">Zurück</a></p>
        </div>
      </div>`;
    return;
  }

  const labels = preview(card.st.srs);
  view.innerHTML = `
    <div class="study">
      <div class="study-top">
        <div class="bar1">
          <a class="icon-btn" href="${back}" aria-label="Runde beenden">${icon.back}</a>
          <h1>${s.free ? "Freies Training" : "Lernen"}</h1>
          <span style="width:44px"></span>
        </div>
        <div class="bar2">
          <span class="pkg">${ms("account_balance")}${s.pkg ? `Paket: ${esc(pkgById(s.pkg)?.name || "")}` : `Paket: ${esc(pkgById(card.paket)?.name || "")}`}</span>
          <span class="cnt"><b>${s.done + 1} / ${total}</b> • <em>${pct} %</em></span>
        </div>
        <div class="meter thin"><i style="width:${pct}%"></i></div>
      </div>
      <div class="study-stage">
        ${flashHTML({ ...card, topic: "" }, { reveal: s.revealed })}
        ${s.revealed ? "" : `<p class="tap-hint">Erst selbst überlegen – dann antippen.</p>`}
      </div>
      <div class="study-actions">
        ${s.revealed ? `
          <div class="lbl-row"><span>Erinnerung bewerten</span><span>${esc(TYPES[card.type] || "")}</span></div>
          <div class="grades">
            <button class="grade" data-g="0">Nochmal<small>&lt; ${labels[0]}</small></button>
            <button class="grade" data-g="1">Schwer<small>${labels[1]}</small></button>
            <button class="grade" data-g="2">Gut<small>${labels[2]}</small></button>
            <button class="grade" data-g="3">Leicht<small>${labels[3]}</small></button>
          </div>`
        : `<button class="btn accent block" data-reveal>${ms("visibility")}Antwort aufdecken</button>`}
      </div>
    </div>`;

  const reveal = () => { s.revealed = true; renderStudy(view); };
  $(".flash", view).addEventListener("click", () => !s.revealed && reveal());
  $("[data-reveal]", view)?.addEventListener("click", reveal);
  $$(".grade", view).forEach((b) => b.addEventListener("click", () => gradeCard(Number(b.dataset.g))));
}

function gradeCard(g) {
  const s = session;
  const card = s.queue.shift();
  const st = state.cards[card.id];
  const log = todayLog();
  if (!s.free) {
    if (!st.srs) log.fresh++;
    st.srs = schedule(st.srs, g);
    if (g === 0) log.again++;
  }
  log.reviews++;
  if (g === 0) s.queue.splice(Math.min(3, s.queue.length), 0, { ...card, st });
  else s.done++;
  s.revealed = false;
  save();
  renderStudy($("#view"));
  window.scrollTo(0, 0);
}

document.addEventListener("keydown", (e) => {
  if (currentRoute().name !== "lernen" || !session?.queue.length || e.target.closest("input, textarea")) return;
  if (!session.revealed && (e.key === " " || e.key === "Enter")) {
    e.preventDefault();
    session.revealed = true;
    renderStudy($("#view"));
  } else if (session.revealed && ["1", "2", "3", "4"].includes(e.key)) {
    gradeCard(Number(e.key) - 1);
  }
});

/* ============================================================
   Sichten (Kuratieren)
   ============================================================ */

let reviewPkg = "alle";

function renderReview(view) {
  const fresh = byStatus("new").sort((a, b) => (a.st.later || 0) - (b.st.later || 0) || (b.importance || 0) - (a.importance || 0));
  const groups = [...new Set(fresh.map((c) => c.paket))];
  if (reviewPkg !== "alle" && !groups.includes(reviewPkg)) reviewPkg = "alle";
  const list = reviewPkg === "alle" ? fresh : fresh.filter((c) => c.paket === reviewPkg);
  const checked = todayLog().curated || 0;

  view.innerHTML = `
    ${mastheadHTML()}
    <div class="review-head">
      <div><p class="eyebrow">Kurator-Modus</p><h1>${fresh.length ? `${plural(list.length, "Entwurf", "Entwürfe")} sichten` : "Sichten"}</h1></div>
    </div>
    ${fresh.length ? `
      ${groups.length > 1 ? `
      <div class="filter-row">
        <button class="chip ${reviewPkg === "alle" ? "on" : ""}" data-pkg="alle">Alle · ${fresh.length}</button>
        ${groups.map((g) => `<button class="chip ${reviewPkg === g ? "on" : ""}" data-pkg="${esc(g)}">${esc(pkgById(g)?.name || g)} · ${fresh.filter((c) => c.paket === g).length}</button>`).join("")}
      </div>` : ""}
      <div class="hint-bar"><span class="l">${ms("arrow_back")}Links: Verwerfen</span><span class="r">Rechts: Behalten${ms("arrow_forward")}</span></div>
      <div class="deck">
        ${list.slice(0, 3).reverse().map((c, i, arr) => {
          const depth = arr.length - 1 - i;
          return flashHTML({ ...c, topic: pkgById(c.paket)?.name || "" }, { reveal: true }).replace('class="flash"', `class="flash ${depth === 1 ? "under" : depth === 2 ? "under2" : "top"}"`);
        }).join("")}
      </div>
      <div class="review-actions">
        <button class="act-drop" data-act="drop"><span class="round">${ms("close")}</span>Verwerfen</button>
        <button class="act-edit" data-act="edit"><span class="round">${ms("edit_note")}</span>Editieren</button>
        <button class="act-later" data-act="later"><span class="round">${ms("history")}</span>Später</button>
        <button class="act-keep" data-act="keep"><span class="round">${ms("check")}</span>Behalten</button>
      </div>
      <div class="stack-info">
        <span class="ico">${ms("stacks")}</span>
        <div><b>Noch ${list.length} im Stapel</b><small>${checked} heute geprüft</small></div>
        <button class="btn sm" data-all>Alle behalten</button>
      </div>
    ` : `
      <div class="empty">
        <div class="art">${ms("inventory_2")}</div>
        <h3>Alles gesichtet.</h3>
        <p>Neue Entwürfe erscheinen hier, sobald ein Dokument verarbeitet wurde.</p>
        <p style="margin-top:20px"><button class="btn ghost" data-upload>${icon.upload}Dokument hinzufügen</button></p>
      </div>`}
  `;

  $("[data-upload]", view)?.addEventListener("click", () => uploadSheet());
  $$("[data-pkg]", view).forEach((b) => b.addEventListener("click", () => { reviewPkg = b.dataset.pkg; renderReview(view); }));

  const top = $(".deck .flash.top", view);
  if (!top) return;
  const id = top.dataset.id;
  const decide = (dir) => {
    const st = state.cards[id];
    const prev = { status: st.status, later: st.later };
    const log = todayLog();
    if (dir === "later") {
      st.later = Date.now();
    } else {
      st.status = dir === "keep" ? "active" : "rejected";
      log.curated = (log.curated || 0) + 1;
    }
    save();
    render();
    if (dir === "later") return;
    toast(dir === "keep" ? "Behalten – ist im Lernplan" : "Verworfen", {
      label: "Rückgängig",
      run: () => { Object.assign(st, prev); log.curated = Math.max(0, (log.curated || 1) - 1); save(); render(); },
    });
  };
  bindSwipe(top, decide);
  $$("[data-act]", view).forEach((b) => b.addEventListener("click", () => {
    const act = b.dataset.act;
    if (act === "edit") return editCard(allCards().find((c) => c.id === id));
    fly(top, act, decide);
  }));
  $("[data-all]", view).addEventListener("click", () => {
    const ids = list.map((c) => c.id);
    ids.forEach((cid) => (state.cards[cid].status = "active"));
    save();
    render();
    toast(`${ids.length} Karten behalten`, {
      label: "Rückgängig",
      run: () => { ids.forEach((cid) => (state.cards[cid].status = "new")); save(); render(); },
    });
  });
}

function fly(el, dir, done) {
  el.classList.remove("dragging");
  if (dir === "later") {
    el.style.transform = "translateY(40px) scale(.92)";
  } else {
    const x = dir === "keep" ? 1 : -1;
    el.style.transform = `translateX(${x * 130}%) rotate(${x * 14}deg)`;
  }
  el.style.opacity = "0";
  setTimeout(() => done(dir), 220);
}

function bindSwipe(el, done) {
  el.insertAdjacentHTML("afterbegin", '<span class="stamp keep">BEHALTEN</span><span class="stamp drop">WEG</span>');
  const keep = $(".stamp.keep", el);
  const drop = $(".stamp.drop", el);
  let x0 = null, y0 = 0, dx = 0, mode = null;

  el.addEventListener("pointerdown", (e) => {
    x0 = e.clientX; y0 = e.clientY; dx = 0; mode = null;
  });
  el.addEventListener("pointermove", (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (mode === null) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        mode = "swipe";
        el.setPointerCapture(e.pointerId);
        el.classList.add("dragging");
      } else if (Math.abs(dy) > 10) {
        mode = "scroll";
      }
    }
    if (mode !== "swipe") return;
    el.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
    keep.style.opacity = Math.max(0, Math.min(1, dx / 100));
    drop.style.opacity = Math.max(0, Math.min(1, -dx / 100));
  });
  const end = () => {
    if (mode === "swipe") {
      if (Math.abs(dx) > 100) fly(el, dx > 0 ? "keep" : "drop", done);
      else {
        el.classList.remove("dragging");
        el.style.transform = "";
        keep.style.opacity = drop.style.opacity = 0;
      }
    }
    x0 = null; mode = null;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

/* ============================================================
   Karte bearbeiten / anlegen / ansehen
   ============================================================ */

function editCard(card) {
  const isNew = !card;
  const c = card || { type: "fakt", topic: "", front: "", back: "", explanation: "", tipp: "" };
  openSheet(`
    <h2>${isNew ? "Eigene Karte" : "Karte bearbeiten"}</h2>
    <form>
      <div class="field"><label for="f-type">Art</label>
        <select id="f-type" name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === c.type ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label for="f-topic">Thema</label><input id="f-topic" name="topic" value="${esc(c.topic)}" placeholder="z. B. Schuldenbremse"></div>
      <div class="field"><label for="f-front">Frage</label><textarea id="f-front" name="front" required>${esc(c.front)}</textarea></div>
      <div class="field"><label for="f-back">Antwort (Kernaussage)</label><textarea id="f-back" name="back" required>${esc(c.back)}</textarea></div>
      <div class="field"><label for="f-expl">Einordnung (optional)</label><textarea id="f-expl" name="explanation">${esc(c.explanation)}</textarea></div>
      <div class="field"><label for="f-tipp">Debatten-Tipp (optional)</label><textarea id="f-tipp" name="tipp">${esc(c.tipp)}</textarea></div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" data-cancel>Abbrechen</button>
        <button type="submit" class="btn accent">Speichern</button>
      </div>
      ${!isNew && card.st.edits ? `<p style="text-align:center;margin-top:14px"><button type="button" class="btn ghost sm" data-reset>Original wiederherstellen</button></p>` : ""}
    </form>`, (sheet) => {
    $("[data-cancel]", sheet).onclick = closeSheet;
    $("[data-reset]", sheet)?.addEventListener("click", () => {
      delete state.cards[card.id].edits;
      save(); closeSheet(); render(); toast("Original wiederhergestellt");
    });
    $("form", sheet).onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      if (isNew) {
        const id = "c_" + Math.random().toString(36).slice(2, 10);
        state.custom.push({ id, source: "", created: new Date().toISOString(), importance: 2, tags: [], quote: "", location: "", attribution: "", ...data });
        state.cards[id] = { status: "active" };
      } else if (card.paket === "eigene") {
        Object.assign(state.custom.find((x) => x.id === card.id), data);
      } else {
        state.cards[card.id].edits = data;
      }
      save(); closeSheet(); render();
      toast(isNew ? "Karte angelegt" : "Gespeichert");
    };
  });
}

function showCard(card) {
  if (!card) return;
  const st = card.st;
  const next = st.srs?.due ? new Date(st.srs.due).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : null;
  openSheet(`
    ${flashHTML({ ...card, topic: pkgById(card.paket)?.name || "" }, { reveal: true })}
    <p class="faint" style="font-size:13px;margin:12px 2px 0">
      ${st.status === "new" ? "Noch nicht gesichtet" : st.status === "rejected" ? "Verworfen" : next ? `Nächste Wiederholung: ${next}` : "Im Lernplan, noch nicht gelernt"}
      ${card.importance ? " · " + stars(card.importance) : ""}
    </p>
    <div class="sheet-actions" style="margin-top:14px">
      <button class="btn ghost" data-edit>${icon.pen}Bearbeiten</button>
      ${st.status === "active"
        ? `<button class="btn ghost danger" data-status="rejected">Verwerfen</button>`
        : `<button class="btn accent" data-status="active">Behalten</button>`}
    </div>
    ${card.paket === "eigene" ? `<p style="text-align:center;margin-top:12px"><button class="btn ghost sm danger" data-delete>Karte löschen</button></p>` : ""}
  `, (sheet) => {
    $("[data-edit]", sheet).onclick = () => editCard(card);
    $("[data-status]", sheet).onclick = (e) => {
      st.status = e.currentTarget.dataset.status;
      save(); closeSheet(); render();
    };
    $("[data-delete]", sheet)?.addEventListener("click", () => {
      state.custom = state.custom.filter((x) => x.id !== card.id);
      delete state.cards[card.id];
      save(); closeSheet(); render(); toast("Gelöscht");
    });
  });
}

function statusBadge(c) {
  if (c.st.status === "new") return `<span class="status-badge fresh">${ms("fiber_new")}Neu</span>`;
  if (c.st.status === "rejected") return `<span class="status-badge off">Verworfen</span>`;
  if (c.st.srs && isDue(c.st.srs)) return `<span class="status-badge repeat">${ms("replay")}Wiederholen</span>`;
  if (c.st.srs?.reps) return `<span class="status-badge learned">${ms("check_circle")}Gelernt</span>`;
  return `<span class="status-badge off">Noch offen</span>`;
}

function cardRowHTML(c) {
  return `
    <button class="row" data-type="${esc(c.type)}" data-card="${esc(c.id)}">
      <div class="top"><span class="type-tag">${esc(TYPES[c.type] || c.type)}</span><span class="ctx">${esc(c.topic || "")}</span>${statusBadge(c)}</div>
      <div class="q">${esc(c.front)}</div>
      <div class="a">${esc(c.back)}</div>
    </button>`;
}

function bindCardRows(root) {
  $$("[data-card]", root).forEach((b) => b.onclick = () => showCard(allCards().find((c) => c.id === b.dataset.card)));
}

/* ============================================================
   Bibliothek
   ============================================================ */

let libFilter = { tab: "pakete", q: "", type: "", status: "" };

function renderLibrary(view) {
  const f = libFilter;
  const pkgs = allPackages();
  view.innerHTML = `
    ${mastheadHTML()}
    <header class="page-head">
      <p class="eyebrow">${plural(pkgs.length, "Paket", "Pakete")} · ${plural(allCards().length, "Karte", "Karten")}</p>
      <h1 class="title">Bibliothek</h1>
    </header>
    <div class="seg"><button data-tab="pakete" class="${f.tab === "pakete" ? "on" : ""}">${ms("folder_copy")}Pakete</button><button data-tab="karten" class="${f.tab === "karten" ? "on" : ""}">${ms("style")}Alle Karten</button></div>
    <div id="lib-body"></div>
    <button class="fab" aria-label="Eigene Karte anlegen">${icon.plus}</button>
  `;

  const body = $("#lib-body", view);
  const draw = () => {
    if (f.tab === "pakete") {
      const priv = pkgs.filter((p) => p.origin === "privat");
      const pub = pkgs.filter((p) => p.origin !== "privat");
      body.innerHTML = `
        ${priv.length ? `<h2 class="sub-head">${icon.lock}Privat<small>nur für dich</small></h2><div class="pkg-list">${priv.map(pkgCardHTML).join("")}</div>` : ""}
        ${pub.length ? `<h2 class="sub-head">${icon.globe}Öffentlich<small>für alle sichtbar</small></h2><div class="pkg-list">${pub.map((p, i) => pkgCardHTML(p, i + priv.length)).join("")}</div>` : ""}
        ${!isOwner() ? `<div class="demo-note" style="margin-top:20px">${icon.lock}<div>Deine privaten Pakete erscheinen hier, sobald die App unter <a href="#/mehr">Mehr</a> mit deinem Schlüssel verbunden ist.</div></div>` : ""}
        <p style="text-align:center;margin-top:20px"><button class="btn ghost sm" data-upload>${icon.upload}Dokument hinzufügen</button></p>`;
      $("[data-upload]", body).onclick = () => uploadSheet();
      return;
    }
    const q = f.q.toLowerCase();
    const list = allCards().filter((c) =>
      (!f.type || c.type === f.type) &&
      (!f.status || c.st.status === f.status) &&
      (!q || [c.front, c.back, c.topic, c.explanation, c.tipp, (c.tags || []).join(" ")].join(" ").toLowerCase().includes(q)),
    ).sort((a, b) => String(b.created).localeCompare(String(a.created)));
    body.innerHTML = `
      <label class="search">${icon.search}<input type="search" id="lib-q" placeholder="Fragen, Antworten, Themen …" value="${esc(f.q)}" aria-label="Suchen"></label>
      <div class="filter-row">
        ${[["", "Alle"], ["active", "Im Lernplan"], ["new", "Neu"], ["rejected", "Verworfen"]].map(([k, v]) => `<button class="chip ${f.status === k ? "on" : ""}" data-status="${k}">${v}</button>`).join("")}
      </div>
      <div class="filter-row">
        ${Object.entries(TYPES).map(([k, v]) => `<button class="chip ${f.type === k ? "on" : ""}" data-type="${k}" data-ftype="${k}">${v}</button>`).join("")}
      </div>
      ${list.length ? `<div class="list">${list.slice(0, 300).map(cardRowHTML).join("")}</div>`
        : `<div class="empty"><h3>Nichts gefunden.</h3><p>Filter lockern oder anders suchen.</p></div>`}
    `;
    $$("[data-status]", body).forEach((b) => b.onclick = () => { f.status = b.dataset.status; draw(); });
    $$("[data-ftype]", body).forEach((b) => b.onclick = () => { f.type = f.type === b.dataset.ftype ? "" : b.dataset.ftype; draw(); });
    $("#lib-q", body).addEventListener("input", (e) => {
      f.q = e.target.value;
      const pos = e.target.selectionStart;
      draw();
      const input = $("#lib-q", body);
      input.focus();
      input.setSelectionRange(pos, pos);
    });
    bindCardRows(body);
  };
  draw();

  $$(".seg button", view).forEach((b) => b.onclick = () => {
    f.tab = b.dataset.tab;
    $$(".seg button", view).forEach((x) => x.classList.toggle("on", x === b));
    draw();
  });
  $(".fab", view).onclick = () => editCard(null);
}

/* ============================================================
   Paket-Seite: lernen, weitergeben, veröffentlichen
   ============================================================ */

function shareUrl(p) {
  const base = location.href.split("#")[0];
  return `${base}#/paket/${encodeURIComponent(p.id)}`;
}

let pkgFilter = { q: "", type: "", id: null };

function renderPackage(view, id) {
  const p = pkgById(id);
  if (pkgFilter.id !== id) pkgFilter = { q: "", type: "", id };
  if (!p) {
    view.innerHTML = `<div class="empty"><h3>Paket nicht gefunden.</h3><p>Vielleicht wird es gerade noch geladen.</p><p style="margin-top:16px"><a class="btn ghost" href="#/bibliothek">Zur Bibliothek</a></p></div>`;
    return;
  }
  const s = pkgStats(p);
  const isPublic = p.origin === "oeffentlich" || p.published;
  const docs = (p.sources || []).slice().sort((a, b) => String(b.added).localeCompare(String(a.added)));
  const cards = allCards().filter((c) => c.paket === p.id);
  const canPublish = isOwner() && p.origin === "privat" && p.id !== "eigene";
  const pct = s.active ? Math.round((s.mature / s.active) * 100) : 0;
  const C = 2 * Math.PI * 26;
  const desc = docs.find((d) => d.summary)?.summary || (docs.length ? `Aus ${plural(docs.filter((d) => d.status !== "fehler").length, "Dokument", "Dokumenten")}.` : "Eigene Karten.");
  const typeCounts = Object.keys(TYPES).map((t) => [t, cards.filter((c) => c.type === t).length]).filter(([, n]) => n);

  view.innerHTML = `
    <div class="top-bar">
      <a class="icon-btn" href="#/bibliothek" aria-label="Zur Bibliothek">${icon.back}</a>
      <h1>Kartensatz</h1>
      ${isPublic ? `<button class="icon-btn" data-share-link aria-label="Link teilen">${icon.share}</button>` : `<span style="width:44px"></span>`}
    </div>

    <section class="pkg-hero">
      <div class="badges">${originBadge(p)}${inPlan(p.id) ? "" : `<span class="mini">pausiert</span>`}<span class="count">${ms("style")}${plural(s.total, "Karte", "Karten")}</span></div>
      <h1>${esc(p.name)}</h1>
      <p class="desc">${esc(desc)}</p>
      <div class="mastery">
        <div>
          <span class="pct">${pct} %<small>gefestigt</small></span>
          <ul><li>${s.mature + s.learning} gelernt</li><li>${s.learning} im Training</li></ul>
          ${s.due ? `<span class="due-now">${ms("alarm")}Heute fällig</span>` : ""}
        </div>
        <div class="ring"><svg viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="26"/><circle class="fill" cx="32" cy="32" r="26" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg></div>
      </div>
      <a class="cta" href="#/lernen/paket/${encodeURIComponent(p.id)}"><span>${ms("play_arrow")}${s.due ? `Jetzt lernen (${s.due} fällig)` : "Dieses Paket üben"}</span>${ms("arrow_forward").replace('class="ms"', 'class="ms arrow"')}</a>
    </section>

    <div class="group" style="margin-top:14px">
      <div class="item"><div><b>Im täglichen Lernplan</b><small>Karten dieses Pakets kommen beim normalen Lernen dran</small></div>
        <label class="switch"><input type="checkbox" id="plan-toggle" ${inPlan(p.id) ? "checked" : ""} aria-label="Im täglichen Lernplan"><i></i></label></div>
    </div>

    <div class="section-head"><h2 class="section">Weitergeben &amp; Export</h2><small>Formate</small></div>
    <div class="share-tiles">
      <button class="tile t-link ${isPublic ? "" : "off"}" data-share-link><i>${icon.link}</i><b>Link</b><small>${isPublic ? "Teilen" : "nur öffentlich"}</small></button>
      <a class="tile t-pdf" href="#/zettel/${encodeURIComponent(p.id)}"><i>${icon.print}</i><b>Lernzettel</b><small>PDF / Druck</small></a>
      <button class="tile t-anki" data-anki><i>${icon.file}</i><b>Anki</b><small>Import-Datei</small></button>
    </div>
    ${isOwner() ? `<p class="faint" style="font-size:12.5px;margin:10px 2px 0">Weitergegeben werden nur Karten, die du behalten hast – keine Original-Dokumente.</p>` : ""}

    ${canPublish ? `
    <div class="section-head"><h2 class="section">Sichtbarkeit</h2></div>
    <div class="group">
      ${p.published ? `
        <div class="item">${icon.globe}<div><b>Öffentlich geteilt</b><small>Eine Kopie der Karten ist für alle in der App sichtbar. Neue Karten kommen erst beim nächsten Teilen dazu.</small></div></div>
        <div class="item"><button class="btn ghost block" data-publish>Geteilte Karten aktualisieren</button></div>
        <div class="item"><button class="btn ghost block danger" data-unpublish>Nicht mehr teilen</button></div>` : `
        <div class="item">${icon.lock}<div><b>Nur für dich</b><small>Du kannst die Karten dieses Pakets öffentlich teilen. Deine Dokumente bleiben privat.</small></div></div>
        <div class="item"><button class="btn ghost block" data-publish>${icon.globe}Öffentlich teilen</button></div>`}
    </div>` : ""}

    ${docs.length ? `
    <div class="section-head"><h2 class="section">Dokumente <span class="faint">(${docs.length})</span></h2></div>
    <div class="list">${docs.map((d) => `
      <div class="row source-card ${d.status === "fehler" ? "failed" : ""}">
        <p class="eyebrow">${esc(d.doc_type || (d.status === "fehler" ? "Fehler" : "Dokument"))}</p>
        <h3>${esc(d.title || d.file)}</h3>
        ${[d.organisation, d.authors, d.published].filter(Boolean).length ? `<p>${[d.organisation, d.authors, d.published].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
        ${d.status === "fehler" ? `<p class="danger">Konnte nicht verarbeitet werden: ${esc(d.error || "")}</p>` : ""}
        ${d.core_thesis ? `<div class="thesis">${esc(d.core_thesis)}</div>` : ""}
        <div class="foot"><span>${plural(d.card_count ?? 0, "Karte", "Karten")}</span><span>${esc(fmtDate(d.added))}</span></div>
      </div>`).join("")}</div>` : ""}
    ${isOwner() && p.id !== "eigene" ? `<p style="text-align:center;margin-top:14px"><button class="btn ghost sm" data-upload>${icon.upload}Dokument zu diesem Paket hinzufügen</button></p>` : ""}

    <div class="section-head"><h2 class="section">Enthaltene Karten <span class="faint">(${cards.length})</span></h2></div>
    <label class="search">${icon.search}<input type="search" id="pkg-q" placeholder="Paket durchsuchen …" value="${esc(pkgFilter.q)}" aria-label="Paket durchsuchen"></label>
    <div class="filter-row">
      <button class="chip ${pkgFilter.type ? "" : "on"}" data-ptype="">Alle (${cards.length})</button>
      ${typeCounts.map(([t, n]) => `<button class="chip ${pkgFilter.type === t ? "on" : ""}" data-type="${t}" data-ptype="${t}">${esc(TYPES[t])} (${n})</button>`).join("")}
    </div>
    <div class="list" id="pkg-cards"></div>
  `;

  const drawCards = () => {
    const q = pkgFilter.q.toLowerCase();
    const shown = cards.filter((c) => (!pkgFilter.type || c.type === pkgFilter.type) && (!q || [c.front, c.back, c.topic].join(" ").toLowerCase().includes(q)));
    const box = $("#pkg-cards", view);
    box.innerHTML = shown.map(cardRowHTML).join("") || `<p class="faint">Keine Karten gefunden.</p>`;
    bindCardRows(box);
  };
  drawCards();
  $("#pkg-q", view).addEventListener("input", (e) => { pkgFilter.q = e.target.value; drawCards(); });
  $$("[data-ptype]", view).forEach((b) => b.onclick = () => {
    pkgFilter.type = b.dataset.ptype;
    $$("[data-ptype]", view).forEach((x) => x.classList.toggle("on", x === b));
    drawCards();
  });

  $("#plan-toggle", view).onchange = (e) => {
    if (e.target.checked) delete state.settings.skip[p.id];
    else state.settings.skip[p.id] = true;
    save();
  };
  $("[data-upload]", view)?.addEventListener("click", () => uploadSheet({ origin: p.origin, pkgName: p.name }));
  $$("[data-share-link]", view).forEach((btn) => btn.addEventListener("click", async () => {
    if (!isPublic) return toast(canPublish ? "Erst öffentlich teilen, dann gibt es einen Link" : "Nur öffentliche Pakete haben einen Link");
    const url = shareUrl(p);
    if (navigator.share) {
      try { await navigator.share({ title: p.name, text: `Lernkarten: ${p.name}`, url }); return; } catch (err) { if (err.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link kopiert");
    } catch {
      openSheet(`<h2>Link zum Paket</h2><div class="field"><input readonly value="${esc(url)}" id="share-url"></div>`, (sh) => $("#share-url", sh).select());
    }
  }));
  $("[data-anki]", view).onclick = () => {
    const kept = cards.filter((c) => c.st.status === "active");
    const clean = (t) => String(t || "").replace(/[\t\r\n]+/g, " ").trim();
    if (!kept.length) return toast("Noch keine behaltenen Karten in diesem Paket");
    const lines = [
      "#separator:tab", "#html:false", "#tags column:3",
      ...kept.map((c) => [clean(c.front), clean(c.back + (c.explanation ? ` — ${c.explanation}` : "")), clean(`${slugify(p.name)} ${c.type}`)].join("\t")),
    ];
    shareOrDownload(`${slugify(p.name)}-anki.txt`, lines.join("\n") + "\n", "text/plain");
  };
  $("[data-publish]", view)?.addEventListener("click", () => {
    const kept = cards.filter((c) => c.st.status === "active").length;
    ask(
      p.published ? "Geteilte Karten aktualisieren?" : "Paket öffentlich teilen?",
      `Die ${kept} Karten, die du behalten hast, werden für alle sichtbar – mit Titel und Kernaussage der Dokumente. Die Dokumente selbst bleiben privat.<br><br>Hinweis: Was einmal öffentlich war, lässt sich bei GitHub im Verlauf wiederfinden, auch wenn du das Teilen später beendest.`,
      p.published ? "Aktualisieren" : "Öffentlich teilen",
      () => publishPackage(p),
    );
  });
  $("[data-unpublish]", view)?.addEventListener("click", () => ask(
    "Nicht mehr teilen?",
    "Das Paket verschwindet aus der öffentlichen App. Deine private Fassung bleibt unverändert.",
    "Nicht mehr teilen",
    () => unpublishPackage(p),
    { danger: true },
  ));
}

async function publishPackage(p) {
  const kept = allCards().filter((c) => c.paket === p.id && c.st.status === "active");
  const usedSources = new Set(kept.map((c) => c.source));
  const strip = ({ st, paket, ...card }) => card;
  const copy = {
    version: 2,
    id: p.id,
    name: p.name,
    visibility: "oeffentlich",
    published_from_private: true,
    updated: new Date().toISOString(),
    // Nur Metadaten der Dokumente, keine Dateinamen oder Dateien
    sources: (p.sources || []).filter((s) => usedSources.has(s.id)).map((s) => ({
      id: s.id, title: s.title, authors: s.authors, organisation: s.organisation, published: s.published,
      doc_type: s.doc_type, summary: s.summary, core_thesis: s.core_thesis, added: s.added, status: "ok",
      card_count: kept.filter((c) => c.source === s.id).length,
    })),
    cards: kept.map(strip),
  };
  try {
    await ghPut(github.publicRepo, `${PUBLIC.data}/${p.id}.json`, toBase64Text(JSON.stringify(copy, null, 1) + "\n"), `Wissenstrainer: Paket „${p.name}“ geteilt`);
    toast("Geteilt – in ein paar Minuten öffentlich sichtbar");
    await load();
  } catch (err) {
    toast(`Teilen fehlgeschlagen: ${err.message}`);
  }
}

async function unpublishPackage(p) {
  try {
    await ghDelete(github.publicRepo, `${PUBLIC.data}/${p.id}.json`, `Wissenstrainer: Paket „${p.name}“ nicht mehr geteilt`);
    toast("Wird nicht mehr geteilt");
    await load();
  } catch (err) {
    toast(`Fehlgeschlagen: ${err.message}`);
  }
}

/* ============================================================
   Lernzettel (druckbare Übersicht)
   ============================================================ */

function renderSheetView(view, id) {
  const p = pkgById(id);
  if (!p) return renderPackage(view, id);
  const cards = allCards().filter((c) => c.paket === p.id && c.st.status !== "rejected");
  const topics = {};
  for (const c of cards) (topics[c.topic || "Weitere"] ||= []).push(c);
  view.innerHTML = `
    <div class="zettel-bar no-print">
      <a class="icon-btn" href="#/paket/${encodeURIComponent(p.id)}" aria-label="Zurück">${icon.back}</a>
      <button class="btn accent sm" data-print>${icon.print}Drucken / als PDF</button>
    </div>
    <article class="zettel">
      <p class="eyebrow">Lernzettel · ${esc(new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }))}</p>
      <h1>${esc(p.name)}</h1>
      ${(p.sources || []).filter((s) => s.status !== "fehler").length ? `<p class="zettel-src">Quellen: ${(p.sources || []).filter((s) => s.status !== "fehler").map((s) => esc([s.title, s.organisation].filter(Boolean).join(", "))).join(" · ")}</p>` : ""}
      ${Object.entries(topics).map(([t, list]) => `
        <section>
          <h2>${esc(t)}</h2>
          <dl>${list.map((c) => `
            <div data-type="${esc(c.type)}">
              <dt><span class="type-tag">${esc(TYPES[c.type] || c.type)}</span>${esc(c.front)}</dt>
              <dd><mark>${esc(c.back)}</mark>${c.explanation ? `<br><span class="muted">${esc(c.explanation)}</span>` : ""}${c.tipp ? `<br><span class="muted"><b>Debatten-Tipp:</b> ${esc(c.tipp)}</span>` : ""}</dd>
            </div>`).join("")}</dl>
        </section>`).join("")}
    </article>`;
  $("[data-print]", view).onclick = () => window.print();
}

/* ============================================================
   Dokument hinzufügen
   ============================================================ */

function uploadSheet({ origin = "privat", pkgName = "" } = {}) {
  if (!isOwner()) {
    location.hash = "#/mehr";
    toast("Zuerst die App mit deinem Schlüssel verbinden");
    return;
  }
  const hasPrivate = !!github.privateRepo;
  if (!hasPrivate) origin = "oeffentlich";
  const names = (o) => [...new Set(packages.filter((p) => p.origin === o && !p.demo).map((p) => p.name))];

  openSheet(`
    <h2>Dokument hinzufügen</h2>
    <form>
      <div class="field"><label>Ablage</label>
        <div class="seg" style="margin:0">
          <button type="button" data-origin="privat" ${hasPrivate ? "" : "disabled"}>${icon.lock} Privat</button>
          <button type="button" data-origin="oeffentlich">${icon.globe} Öffentlich</button>
        </div>
        <small class="faint" id="origin-hint"></small>
      </div>
      <div class="field"><label for="u-pkg">Paket</label>
        <input id="u-pkg" name="pkg" list="u-pkg-list" value="${esc(pkgName)}" placeholder="z. B. Schuldenbremse" required autocomplete="off">
        <datalist id="u-pkg-list"></datalist>
        <small class="faint">Vorhandenes Paket wählen oder neuen Namen eingeben</small>
      </div>
      <div class="field"><label for="u-file">Dateien</label>
        <input id="u-file" type="file" multiple accept=".pdf,.docx,.txt,.md,.html,.htm" required>
      </div>
      <div class="upload-log" id="upload-log" style="margin:0 0 12px"></div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" data-cancel>Schließen</button>
        <button type="submit" class="btn accent">Hochladen</button>
      </div>
    </form>`, (sheet) => {
    const setOrigin = (o) => {
      origin = o;
      $$("[data-origin]", sheet).forEach((b) => b.classList.toggle("on", b.dataset.origin === o));
      $("#origin-hint", sheet).textContent = o === "privat"
        ? "Dokument und Karten bleiben nur für dich sichtbar."
        : "Achtung: Das Dokument selbst und alle Karten sind für jeden sichtbar.";
      $("#u-pkg-list", sheet).innerHTML = names(o).map((n) => `<option value="${esc(n)}">`).join("");
    };
    setOrigin(origin);
    $$("[data-origin]", sheet).forEach((b) => b.onclick = () => setOrigin(b.dataset.origin));
    $("[data-cancel]", sheet).onclick = closeSheet;
    $("form", sheet).onsubmit = async (e) => {
      e.preventDefault();
      const pkg = $("#u-pkg", sheet).value.trim().replace(/[\/\\]+/g, "-");
      const files = [...$("#u-file", sheet).files];
      const log = $("#upload-log", sheet);
      const btn = $("button[type=submit]", sheet);
      btn.disabled = true;
      const repo = origin === "privat" ? github.privateRepo : github.publicRepo;
      const dir = origin === "privat" ? PRIVATE.docs : PUBLIC.docs;
      for (const file of files) {
        const name = file.name.normalize("NFC").replace(/[^\p{L}\p{N}._ -]+/gu, "_").trim();
        const line = document.createElement("div");
        line.textContent = `⏳ ${name}`;
        log.append(line);
        try {
          await ghPut(repo, `${dir}/${pkg}/${name}`, await fileToBase64(file), `Wissenstrainer: ${name} → ${pkg}`);
          line.textContent = `✅ ${name} – wird in ein paar Minuten zu Karten`;
        } catch (err) {
          line.textContent = `❌ ${name}: ${err.message}`;
        }
      }
      btn.disabled = false;
      $("#u-file", sheet).value = "";
    };
  });
}

/* ============================================================
   Mehr / Einstellungen
   ============================================================ */

function renderSettings(view) {
  const s = state.settings;
  view.innerHTML = `
    ${mastheadHTML()}
    <header class="page-head">
      <p class="eyebrow">Einstellungen</p>
      <h1 class="title">Mehr</h1>
    </header>

    <div class="section-head" style="margin-top:0"><h2 class="section">Dokumente</h2></div>
    <div class="group">
      ${isOwner() ? `
        <div class="item"><button class="btn block accent" data-upload>${icon.upload} Dokument hinzufügen</button></div>
        <div class="item"><div><b>Neue Karten abrufen</b><small>${privateError ? `Private Ablage nicht erreichbar: ${esc(privateError)}` : "Holt fertig verarbeitete Dokumente"}</small></div><button class="icon-btn" data-refresh aria-label="Aktualisieren">${icon.refresh}</button></div>
        <div class="item"><div><b>Verbunden</b><small>Privat: ${esc(github.privateRepo || "–")}<br>Öffentlich: ${esc(github.publicRepo)}</small></div><button class="link" data-gh>Ändern</button></div>
      ` : `
        <div class="item"><div><b>Deine eigenen Pakete</b><small>Verbinde die App einmalig mit deinem Schlüssel. Dann siehst du deine privaten Pakete und kannst Dokumente direkt vom Handy hinzufügen.</small></div></div>
        <div class="item"><button class="btn block accent" data-gh>Mit Schlüssel verbinden</button></div>
        <div class="item"><div><b>Neue Karten abrufen</b><small>Öffentliche Pakete neu laden</small></div><button class="icon-btn" data-refresh aria-label="Aktualisieren">${icon.refresh}</button></div>
      `}
    </div>

    <div class="section-head"><h2 class="section">Lernen</h2></div>
    <div class="group">
      <div class="item"><div><b>Dein Vorname</b><small>Für die Begrüßung auf der Startseite</small></div>
        <input id="set-name" value="${esc(s.name || "")}" placeholder="optional" autocomplete="given-name" style="width:120px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--surface-2);font-size:15px"></div>
      <div class="item"><div><b>Neue Karten pro Tag</b><small>Wie viele ungelernte Karten täglich dazukommen</small></div>
        <div class="stepper"><button data-step="-5" aria-label="weniger">−</button><output>${s.newPerDay}</output><button data-step="5" aria-label="mehr">+</button></div></div>
      <div class="item"><div><b>Neue Karten ohne Sichten übernehmen</b><small>Sie kommen dann direkt in den Lernplan</small></div>
        <label class="switch"><input type="checkbox" data-auto ${s.autoAccept ? "checked" : ""} aria-label="Neue Karten ohne Sichten übernehmen"><i></i></label></div>
    </div>

    <div class="section-head"><h2 class="section">Darstellung</h2></div>
    <div class="seg" style="grid-template-columns:repeat(3,1fr)">
      ${[["auto", "Automatisch"], ["light", "Hell"], ["dark", "Dunkel"]].map(([k, v]) => `<button data-theme="${k}" class="${s.theme === k ? "on" : ""}">${v}</button>`).join("")}
    </div>

    <div class="section-head"><h2 class="section">Lernstand</h2></div>
    <div class="group">
      <div class="item"><div><b>Sichern</b><small>Als Datei speichern, z. B. für ein anderes Gerät</small></div><button class="link" data-export>Sichern</button></div>
      <div class="item"><div><b>Einspielen</b><small>Eine gesicherte Datei laden</small></div><label class="link">Laden<input type="file" accept="application/json,.json" data-import hidden></label></div>
      <div class="item"><div><b>Zurücksetzen</b><small>Löscht Fortschritt und Sichtung auf diesem Gerät</small></div><button class="link danger" data-reset>Zurücksetzen</button></div>
    </div>
    <p class="faint" style="font-size:12.5px;text-align:center;margin-top:28px">Dein Lernstand wird nur auf diesem Gerät gespeichert.<br>Version ${APP_VERSION}</p>
  `;

  $$("[data-step]", view).forEach((b) => b.onclick = () => {
    s.newPerDay = Math.max(0, Math.min(100, s.newPerDay + Number(b.dataset.step)));
    $("output", view).textContent = s.newPerDay;
    save();
  });
  $("#set-name", view).onchange = (e) => { s.name = e.target.value.trim(); save(); };
  $("[data-auto]", view).onchange = (e) => { s.autoAccept = e.target.checked; save(); };
  $$("[data-theme]", view).forEach((b) => b.onclick = () => { s.theme = b.dataset.theme; save(); applyTheme(); renderSettings(view); });
  $$("[data-refresh]", view).forEach((b) => b.onclick = () => load({ quiet: false }));
  $$("[data-gh]", view).forEach((b) => b.onclick = githubSheet);
  $("[data-upload]", view)?.addEventListener("click", () => uploadSheet());

  $("[data-export]", view).onclick = () =>
    shareOrDownload(`wissenstrainer-lernstand-${dayKey()}.json`, JSON.stringify(state, null, 1), "application/json");
  $("[data-import]", view).onchange = async (e) => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!data.cards || !data.settings) throw new Error();
      Object.assign(state, data);
      state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
      save(); applyTheme(); render(); toast("Lernstand eingespielt");
    } catch {
      toast("Datei konnte nicht gelesen werden");
    }
  };
  $("[data-reset]", view).onclick = () => ask(
    "Lernstand zurücksetzen?",
    "Fortschritt, Sichtung und eigene Karten auf diesem Gerät werden gelöscht. Pakete und Dokumente bleiben erhalten.",
    "Zurücksetzen",
    () => { state.cards = {}; state.log = {}; state.custom = []; save(); render(); toast("Zurückgesetzt"); },
    { danger: true },
  );
}

function githubSheet() {
  openSheet(`
    <h2>Mit Schlüssel verbinden</h2>
    <p class="muted" style="margin-top:-6px;font-size:14px">Der Schlüssel (bei GitHub „Token“ genannt) erlaubt der App, Dokumente in deine Ablagen zu legen und deine privaten Pakete zu lesen. Er bleibt nur auf diesem Gerät. Eine Anleitung steht in der README unter „Schlüssel anlegen“.</p>
    <form>
      <div class="field"><label for="g-token">Schlüssel</label><input id="g-token" name="token" type="password" value="${esc(github.token)}" placeholder="github_pat_…" autocomplete="off"></div>
      <div class="field"><label for="g-priv">Private Ablage (Repository)</label><input id="g-priv" name="privateRepo" value="${esc(github.privateRepo)}" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label for="g-pub">Öffentliche Ablage (Repository)</label><input id="g-pub" name="publicRepo" value="${esc(github.publicRepo)}" autocapitalize="off" spellcheck="false"></div>
      <div class="sheet-actions">
        ${github.token ? `<button type="button" class="btn ghost danger" data-remove>Trennen</button>` : `<button type="button" class="btn ghost" data-cancel>Abbrechen</button>`}
        <button class="btn accent" type="submit">Prüfen &amp; speichern</button>
      </div>
    </form>`, (sheet) => {
    $("[data-cancel]", sheet)?.addEventListener("click", closeSheet);
    $("[data-remove]", sheet)?.addEventListener("click", () => {
      github = { ...github, token: "" };
      writeJSON(TOKEN_KEY, github);
      closeSheet();
      load();
    });
    $("form", sheet).onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const prev = github;
      github = { ...github, token: data.token.trim(), privateRepo: data.privateRepo.trim(), publicRepo: data.publicRepo.trim() };
      try {
        for (const repo of [github.publicRepo, github.privateRepo].filter(Boolean)) {
          const res = await gh(repo, "");
          if (res.status === 401) throw new Error("Schlüssel ungültig oder abgelaufen");
          if (!res.ok) throw new Error(`${repo}: ${res.status === 404 ? "nicht gefunden oder kein Zugriff" : "Fehler"} (Code ${res.status})`);
          if (!(await res.json()).permissions?.push) throw new Error(`${repo}: Schlüssel darf dort nichts ablegen`);
        }
        writeJSON(TOKEN_KEY, github);
        closeSheet();
        toast("Verbunden");
        load();
      } catch (err) {
        github = prev;
        toast(err.message);
      }
    };
  });
}

/* ============================================================
   Start
   ============================================================ */

applyTheme();
render();
load();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
