import { schedule, preview, isDue, isMature, dayKey } from "./srs.js";

/* ============================================================
   Zustand
   ============================================================ */

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

function cardState(id, pkg) {
  if (!state.cards[id]) {
    // veröffentlichte Pakete sind schon gesichtet, alles andere kommt erst zum Sichten
    const curated = pkg?.published_from_private || pkg?.id === "eigene";
    state.cards[id] = { status: curated || state.settings.autoAccept ? "active" : "new" };
  }
  return state.cards[id];
}

function allCards() {
  return allPackages().flatMap((p) =>
    p.cards.map((c) => {
      const st = cardState(c.id, p);
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
  return fetch(`https://api.github.com/repos/${repo}/${path}`, {
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

const icon = {
  doc: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.7-4.3L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.7 4.3L20 16"/><path d="M20 20v-4h-4"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>',
};

function stars(n) {
  return n ? `<span class="stars" title="Wichtigkeit">${"●".repeat(n)}${"○".repeat(3 - n)}</span>` : "";
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

function originBadge(p) {
  if (p.origin === "privat") {
    return p.published
      ? `<span class="vis vis-pub">${icon.globe} Privat · geteilt</span>`
      : `<span class="vis vis-priv">${icon.lock} Privat</span>`;
  }
  return `<span class="vis vis-pub">${icon.globe} Öffentlich</span>`;
}

function flashHTML(c, { reveal = false } = {}) {
  const pkg = pkgById(c.paket) || {};
  const src = (pkg.sources || []).find((s) => s.id === c.source) || {};
  const srcLine = [src.title, src.organisation, c.location].filter(Boolean).map(esc).join(" · ");
  return `
    <article class="flash" data-type="${esc(c.type)}" data-id="${esc(c.id)}">
      <div class="meta">
        <span class="type-chip">${esc(TYPES[c.type] || c.type)}</span>
        <span class="topic-label">${esc(pkg.name || "")}${c.topic && c.topic !== pkg.name ? ` · ${esc(c.topic)}` : ""}</span>
      </div>
      <p class="front">${esc(c.front)}</p>
      ${reveal ? `
      <div class="answer">
        <p class="back"><span>${esc(c.back)}</span></p>
        ${c.explanation ? `<p class="expl">${esc(c.explanation)}</p>` : ""}
        ${c.attribution ? `<span class="attr">${esc(c.attribution)}</span>` : ""}
        ${c.quote ? `<blockquote class="quote">„${esc(c.quote)}“</blockquote>` : ""}
        ${srcLine ? `<div class="src">${icon.doc}<span>${srcLine}</span></div>` : ""}
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

function packageTileHTML(p) {
  const s = pkgStats(p);
  const base = Math.max(1, s.active);
  return `
    <a class="pkg-tile ${inPlan(p.id) ? "" : "paused"}" href="#/paket/${encodeURIComponent(p.id)}">
      ${originBadge(p)}
      <b>${esc(p.name)}</b>
      <span class="faint">${plural(s.total, "Karte", "Karten")}${s.due ? ` · ${s.due} offen` : ""}${inPlan(p.id) ? "" : " · pausiert"}</span>
      <div class="bar"><i class="m" style="width:${(s.mature / base) * 100}%"></i><i class="l" style="width:${(s.learning / base) * 100}%"></i></div>
    </a>`;
}

function renderToday(view) {
  const now = new Date();
  const h = now.getHours();
  const greet = h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const cards = allCards();
  const active = cards.filter((c) => c.st.status === "active" && inPlan(c.paket));
  const fresh = cards.filter((c) => c.st.status === "new").length;
  const queue = studyQueue();
  const doneToday = todayLog().reviews;
  const total = doneToday + queue.length;
  const pct = total ? doneToday / total : active.length ? 1 : 0;
  const C = 2 * Math.PI * 42;
  const newInQueue = queue.filter((c) => !c.st.srs).length;
  const pkgs = allPackages().filter((p) => p.cards.length);

  view.innerHTML = `
    <p class="eyebrow">${esc(now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }))}</p>
    <h1 class="title">${greet}</h1>

    ${isDemo ? `<div class="demo-note">${icon.info}<div><b>Beispieldaten.</b> Sobald dein erstes Dokument verarbeitet ist, erscheinen hier deine eigenen Pakete. <a href="#/mehr">Dokument hinzufügen</a></div></div>` : ""}

    <section class="hero">
      <div class="hero-row">
        <div class="ring">
          <svg viewBox="0 0 96 96"><circle class="track" cx="48" cy="48" r="42"/><circle class="fill" cx="48" cy="48" r="42" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
          <div class="num"><div><b>${queue.length}</b><span>offen</span></div></div>
        </div>
        <div>
          <h2>${queue.length ? `${queue.length} Karten warten` : active.length ? "Für heute geschafft" : "Noch nichts im Lernplan"}</h2>
          <p>${queue.length ? `${newInQueue} neu · ${queue.length - newInQueue} zum Wiederholen` : active.length ? `${doneToday} Karten heute gelernt` : "Übernimm Karten unter „Sichten“."}</p>
        </div>
      </div>
      ${queue.length
        ? `<a class="btn" href="#/lernen">Lernen starten</a>`
        : active.length ? `<a class="btn" href="#/lernen/frei">Freies Training</a>` : `<a class="btn" href="#/sichten">Karten sichten</a>`}
    </section>

    <div class="stats">
      <div class="stat"><b>${streak()}</b><span>Tage Serie</span></div>
      <div class="stat"><b>${active.length}</b><span>im Lernplan</span></div>
      <div class="stat"><b>${active.filter((c) => isMature(c.st.srs)).length}</b><span>gefestigt</span></div>
    </div>

    ${fresh ? `
    <a class="inbox-cta" href="#/sichten">
      <span class="stack"><i></i><i></i><i>${fresh > 99 ? "99+" : fresh}</i></span>
      <div><b>${plural(fresh, "neue Karte", "neue Karten")} zum Sichten</b><small>Übernehmen, verwerfen oder umformulieren</small></div>
      ${icon.chevron}
    </a>` : ""}

    ${pkgs.length ? `
    <h2 class="section">Deine Pakete <small><a href="#/bibliothek">alle</a></small></h2>
    <div class="pkg-scroll">${pkgs.map(packageTileHTML).join("")}</div>` : ""}
  `;
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

  if (!card) {
    view.innerHTML = `
      <div class="study">
        <div class="done">
          <div class="big">${s.done ? "✓" : "–"}</div>
          <h2>${s.done ? "Stark gemacht" : "Nichts fällig"}</h2>
          <p class="muted">${s.done ? `${plural(s.done, "Karte", "Karten")} in dieser Runde.` : "Gerade gibt es hier nichts zu lernen."}</p>
          <p style="margin-top:28px"><a class="btn" href="${back}">Zurück</a></p>
        </div>
      </div>`;
    return;
  }

  const labels = preview(card.st.srs);
  view.innerHTML = `
    <div class="study">
      <div class="study-top">
        <a class="icon-btn" href="${back}" aria-label="Beenden">${icon.x}</a>
        <div class="progress"><i style="width:${(s.done / Math.max(1, s.done + s.queue.length)) * 100}%"></i></div>
        <span class="study-count">${s.done}/${s.done + s.queue.length}</span>
      </div>
      ${s.pkg ? `<p class="eyebrow" style="margin:-6px 0 12px">${esc(pkgById(s.pkg)?.name || "")}</p>` : ""}
      <div class="study-stage">
        ${flashHTML(card, { reveal: s.revealed })}
        ${s.revealed ? "" : `<p class="tap-hint">Erst selbst überlegen – dann antippen</p>`}
      </div>
      <div class="study-actions">
        ${s.revealed ? `
          <div class="grades">
            <button class="grade again" data-g="0">Nochmal<small>${labels[0]}</small></button>
            <button class="grade" data-g="1">Schwer<small>${labels[1]}</small></button>
            <button class="grade good" data-g="2">Gut<small>${labels[2]}</small></button>
            <button class="grade" data-g="3">Leicht<small>${labels[3]}</small></button>
          </div>`
        : `<button class="btn block" data-reveal>Antwort zeigen</button>`}
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
  const fresh = byStatus("new").sort((a, b) => (b.importance || 0) - (a.importance || 0));
  const groups = [...new Set(fresh.map((c) => c.paket))];
  if (reviewPkg !== "alle" && !groups.includes(reviewPkg)) reviewPkg = "alle";
  const list = reviewPkg === "alle" ? fresh : fresh.filter((c) => c.paket === reviewPkg);

  view.innerHTML = `
    <p class="eyebrow">Kuratieren</p>
    <h1 class="title">Sichten</h1>
    ${fresh.length ? `
      ${groups.length > 1 ? `
      <div class="filter-row">
        <button class="chip ${reviewPkg === "alle" ? "on" : ""}" data-pkg="alle">Alle · ${fresh.length}</button>
        ${groups.map((g) => `<button class="chip ${reviewPkg === g ? "on" : ""}" data-pkg="${esc(g)}">${esc(pkgById(g)?.name || g)} · ${fresh.filter((c) => c.paket === g).length}</button>`).join("")}
      </div>` : ""}
      <p class="muted" style="margin:0 0 8px;font-size:14px">${plural(list.length, "neue Karte", "neue Karten")} · rechts wischen = behalten, links = verwerfen</p>
      <div class="deck">
        ${list.slice(0, 3).reverse().map((c, i, arr) => {
          const depth = arr.length - 1 - i;
          return flashHTML(c, { reveal: true }).replace('class="flash"', `class="flash ${depth === 1 ? "under" : depth === 2 ? "under2" : "top"}"`);
        }).join("")}
      </div>
      <div class="review-actions">
        <button class="round drop" data-act="drop" aria-label="Verwerfen">${icon.x}</button>
        <button class="round edit" data-act="edit" aria-label="Bearbeiten">${icon.pen}</button>
        <button class="round keep" data-act="keep" aria-label="Behalten">${icon.check}</button>
      </div>
      <p style="text-align:center;margin-top:18px"><button class="btn ghost sm" data-all>Alle ${list.length} behalten</button></p>
    ` : `
      <div class="empty">
        <div class="art">∅</div>
        <h3>Alles gesichtet</h3>
        <p>Neue Karten erscheinen hier, sobald ein Dokument verarbeitet wurde.</p>
        <p style="margin-top:20px"><button class="btn ghost" data-upload>Dokument hinzufügen</button></p>
      </div>`}
  `;

  $("[data-upload]", view)?.addEventListener("click", () => uploadSheet());
  $$("[data-pkg]", view).forEach((b) => b.addEventListener("click", () => { reviewPkg = b.dataset.pkg; renderReview(view); }));

  const top = $(".deck .flash.top", view);
  if (!top) return;
  const id = top.dataset.id;
  const decide = (dir) => {
    const st = state.cards[id];
    const prev = st.status;
    st.status = dir === "keep" ? "active" : "rejected";
    save();
    render();
    toast(dir === "keep" ? "Behalten – ist im Lernplan" : "Verworfen", {
      label: "Rückgängig",
      run: () => { st.status = prev; save(); render(); },
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
  const x = dir === "keep" ? 1 : -1;
  el.style.transform = `translateX(${x * 130}%) rotate(${x * 18}deg)`;
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
    el.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
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
  const c = card || { type: "fakt", topic: "", front: "", back: "", explanation: "" };
  openSheet(`
    <h2>${isNew ? "Eigene Karte" : "Karte bearbeiten"}</h2>
    <form>
      <div class="field"><label for="f-type">Art</label>
        <select id="f-type" name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === c.type ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label for="f-topic">Thema</label><input id="f-topic" name="topic" value="${esc(c.topic)}" placeholder="z. B. Schuldenbremse"></div>
      <div class="field"><label for="f-front">Vorderseite (Frage)</label><textarea id="f-front" name="front" required>${esc(c.front)}</textarea></div>
      <div class="field"><label for="f-back">Rückseite (Antwort)</label><textarea id="f-back" name="back" required>${esc(c.back)}</textarea></div>
      <div class="field"><label for="f-expl">Einordnung (optional)</label><textarea id="f-expl" name="explanation">${esc(c.explanation)}</textarea></div>
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
  const st = card.st;
  const next = st.srs?.due ? new Date(st.srs.due).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : null;
  openSheet(`
    ${flashHTML(card, { reveal: true })}
    <p class="faint" style="font-size:13px;margin:14px 2px 0">
      ${st.status === "new" ? "Noch nicht gesichtet" : st.status === "rejected" ? "Verworfen" : next ? `Nächste Wiederholung: ${next}` : "Im Lernplan, noch nicht gelernt"}
      ${card.importance ? " · " + stars(card.importance) : ""}
    </p>
    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn ghost" data-edit>${icon.pen} Bearbeiten</button>
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

function cardRowHTML(c) {
  return `
    <button class="row" data-type="${esc(c.type)}" data-card="${esc(c.id)}">
      <span class="type-chip">${esc(TYPES[c.type] || c.type)}</span>
      <div class="q">${esc(c.front)}</div>
      <div class="a">${esc(c.back)}</div>
      <div class="foot">
        ${c.st.status === "new" ? '<span class="pill new">Neu</span>' : c.st.status === "rejected" ? '<span class="pill off">Verworfen</span>' : isMature(c.st.srs) ? '<span class="pill">Gefestigt</span>' : ""}
        <span>${esc(c.topic || "")}</span>
        ${c.st.edits ? "<span>bearbeitet</span>" : ""}
      </div>
    </button>`;
}

function bindCardRows(root) {
  $$("[data-card]", root).forEach((b) => b.onclick = () => showCard(allCards().find((c) => c.id === b.dataset.card)));
}

/* ============================================================
   Bibliothek
   ============================================================ */

let libFilter = { tab: "pakete", q: "", type: "", status: "" };

function packageRowHTML(p) {
  const s = pkgStats(p);
  const docs = p.sources?.filter((x) => x.status !== "fehler").length || 0;
  return `
    <a class="row pkg-row" href="#/paket/${encodeURIComponent(p.id)}">
      <div class="pkg-row-top">${originBadge(p)}${inPlan(p.id) ? "" : '<span class="pill">pausiert</span>'}</div>
      <h3>${esc(p.name)}</h3>
      <div class="foot"><span>${plural(s.total, "Karte", "Karten")}</span>${docs ? `<span>${plural(docs, "Dokument", "Dokumente")}</span>` : ""}${s.fresh ? `<span class="pill new">${s.fresh} neu</span>` : ""}</div>
      <div class="bar"><i class="m" style="width:${(s.mature / Math.max(1, s.active)) * 100}%"></i><i class="l" style="width:${(s.learning / Math.max(1, s.active)) * 100}%"></i></div>
    </a>`;
}

function renderLibrary(view) {
  const f = libFilter;
  const pkgs = allPackages();
  view.innerHTML = `
    <p class="eyebrow">${plural(pkgs.length, "Paket", "Pakete")} · ${plural(allCards().length, "Karte", "Karten")}</p>
    <h1 class="title">Bibliothek</h1>
    <div class="seg"><button data-tab="pakete" class="${f.tab === "pakete" ? "on" : ""}">Pakete</button><button data-tab="karten" class="${f.tab === "karten" ? "on" : ""}">Alle Karten</button></div>
    <div id="lib-body"></div>
    <button class="fab" aria-label="Eigene Karte anlegen">${icon.plus}</button>
  `;

  const body = $("#lib-body", view);
  const draw = () => {
    if (f.tab === "pakete") {
      const priv = pkgs.filter((p) => p.origin === "privat");
      const pub = pkgs.filter((p) => p.origin !== "privat");
      body.innerHTML = `
        ${priv.length ? `<h2 class="section"><span>${icon.lock}Privat</span><small>nur für dich</small></h2><div class="list">${priv.map(packageRowHTML).join("")}</div>` : ""}
        ${pub.length ? `<h2 class="section"><span>${icon.globe}Öffentlich</span><small>für alle sichtbar</small></h2><div class="list">${pub.map(packageRowHTML).join("")}</div>` : ""}
        ${!isOwner() ? `<div class="demo-note" style="margin-top:20px">${icon.lock}<div>Deine privaten Pakete erscheinen hier, sobald die App unter <a href="#/mehr">Mehr</a> mit deinem Schlüssel verbunden ist.</div></div>` : ""}
        <p style="text-align:center;margin-top:20px"><button class="btn ghost sm" data-upload>${icon.upload} Dokument hinzufügen</button></p>`;
      $("[data-upload]", body).onclick = () => uploadSheet();
      return;
    }
    const q = f.q.toLowerCase();
    const list = allCards().filter((c) =>
      (!f.type || c.type === f.type) &&
      (!f.status || c.st.status === f.status) &&
      (!q || [c.front, c.back, c.topic, c.explanation, (c.tags || []).join(" ")].join(" ").toLowerCase().includes(q)),
    ).sort((a, b) => String(b.created).localeCompare(String(a.created)));
    body.innerHTML = `
      <label class="search">${icon.search}<input type="search" id="lib-q" placeholder="Fragen, Antworten, Themen …" value="${esc(f.q)}" aria-label="Suchen"></label>
      <div class="filter-row">
        ${[["", "Alle"], ["active", "Im Lernplan"], ["new", "Neu"], ["rejected", "Verworfen"]].map(([k, v]) => `<button class="chip ${f.status === k ? "on" : ""}" data-status="${k}">${v}</button>`).join("")}
      </div>
      <div class="filter-row">
        ${Object.entries(TYPES).map(([k, v]) => `<button class="chip ${f.type === k ? "on" : ""}" data-type="${k}" data-ftype="${k}">${v}</button>`).join("")}
      </div>
      <div id="lib-list">${list.length ? `<div class="list">${list.slice(0, 300).map(cardRowHTML).join("")}</div>`
        : `<div class="empty"><h3>Nichts gefunden</h3><p>Filter lockern oder anders suchen.</p></div>`}</div>
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

function renderPackage(view, id) {
  const p = pkgById(id);
  if (!p) {
    view.innerHTML = `<div class="empty"><h3>Paket nicht gefunden</h3><p>Vielleicht wird es gerade noch geladen.</p><p style="margin-top:16px"><a class="btn ghost" href="#/bibliothek">Zur Bibliothek</a></p></div>`;
    return;
  }
  const s = pkgStats(p);
  const isPublic = p.origin === "oeffentlich" || p.published;
  const docs = (p.sources || []).slice().sort((a, b) => String(b.added).localeCompare(String(a.added)));
  const cards = allCards().filter((c) => c.paket === p.id);
  const canPublish = isOwner() && p.origin === "privat" && p.id !== "eigene";

  view.innerHTML = `
    <a class="back-link" href="#/bibliothek">${icon.back} Bibliothek</a>
    <div class="pkg-head">${originBadge(p)}</div>
    <h1 class="title">${esc(p.name)}</h1>
    <p class="muted" style="margin:-10px 0 18px">${plural(s.total, "Karte", "Karten")} · ${s.mature} gefestigt${s.fresh ? ` · ${s.fresh} noch zu sichten` : ""}</p>

    <div class="pkg-actions">
      <a class="btn accent block" href="#/lernen/paket/${encodeURIComponent(p.id)}">${s.due ? `Dieses Paket lernen (${s.due})` : "Dieses Paket lernen"}</a>
    </div>

    <div class="group" style="margin-top:14px">
      <div class="item"><div><b>Im täglichen Lernplan</b><small>Karten dieses Pakets kommen beim normalen Lernen dran</small></div>
        <label class="switch"><input type="checkbox" id="plan-toggle" ${inPlan(p.id) ? "checked" : ""} aria-label="Im täglichen Lernplan"><i></i></label></div>
    </div>

    <h2 class="section">Weitergeben</h2>
    <div class="group">
      ${isPublic ? `
      <button class="item item-btn" data-share-link>${icon.link}<div><b>Link teilen</b><small>Andere öffnen das Paket direkt in der App, ohne Anmeldung</small></div></button>` : `
      <div class="item">${icon.lock}<div><b>Link teilen</b><small>Geht nur bei öffentlichen Paketen${canPublish ? " – siehe unten" : ""}</small></div></div>`}
      <a class="item item-btn" href="#/zettel/${encodeURIComponent(p.id)}">${icon.print}<div><b>Lernzettel</b><small>Alle Karten als Übersicht zum Drucken oder als PDF</small></div>${icon.chevron}</a>
      <button class="item item-btn" data-anki>${icon.file}<div><b>Datei für Anki</b><small>Zum Import in Anki oder andere Lernkarten-Apps</small></div></button>
    </div>
    ${isOwner() ? `<p class="faint" style="font-size:13px;margin:8px 4px 0">Weitergegeben werden nur Karten, die du behalten hast – keine Original-Dokumente.</p>` : ""}

    ${canPublish ? `
    <h2 class="section">Sichtbarkeit</h2>
    <div class="group">
      ${p.published ? `
        <div class="item">${icon.globe}<div><b>Öffentlich geteilt</b><small>Eine Kopie der Karten ist für alle in der App sichtbar. Neue Karten kommen erst beim nächsten Teilen dazu.</small></div></div>
        <div class="item"><button class="btn ghost block" data-publish>Geteilte Karten aktualisieren</button></div>
        <div class="item"><button class="btn ghost block danger" data-unpublish>Nicht mehr teilen</button></div>` : `
        <div class="item">${icon.lock}<div><b>Nur für dich</b><small>Du kannst die Karten dieses Pakets öffentlich teilen. Deine Dokumente bleiben privat.</small></div></div>
        <div class="item"><button class="btn ghost block" data-publish>Öffentlich teilen</button></div>`}
    </div>` : ""}

    ${docs.length ? `
    <h2 class="section">Dokumente <small>${docs.length}</small></h2>
    <div class="list">${docs.map((d) => `
      <div class="row source-card ${d.status === "fehler" ? "failed" : ""}">
        <span class="eyebrow">${esc(d.doc_type || (d.status === "fehler" ? "Fehler" : "Dokument"))}</span>
        <h3>${esc(d.title || d.file)}</h3>
        ${[d.organisation, d.authors, d.published].filter(Boolean).length ? `<p>${[d.organisation, d.authors, d.published].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
        ${d.status === "fehler" ? `<p class="danger">Konnte nicht verarbeitet werden: ${esc(d.error || "")}</p>` : ""}
        ${d.core_thesis ? `<div class="thesis">${esc(d.core_thesis)}</div>` : ""}
        <div class="foot"><span>${plural(d.card_count ?? 0, "Karte", "Karten")}</span><span>${esc(fmtDate(d.added))}</span></div>
      </div>`).join("")}</div>` : ""}
    ${isOwner() && p.id !== "eigene" ? `<p style="text-align:center;margin-top:16px"><button class="btn ghost sm" data-upload>${icon.upload} Dokument zu diesem Paket hinzufügen</button></p>` : ""}

    <h2 class="section">Karten <small>${cards.length}</small></h2>
    <div class="list">${cards.map(cardRowHTML).join("")}</div>
  `;

  bindCardRows(view);
  $("#plan-toggle", view).onchange = (e) => {
    if (e.target.checked) delete state.settings.skip[p.id];
    else state.settings.skip[p.id] = true;
    save();
  };
  $("[data-upload]", view)?.addEventListener("click", () => uploadSheet({ origin: p.origin, pkgName: p.name }));
  $("[data-share-link]", view)?.addEventListener("click", async () => {
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
  });
  $("[data-anki]", view).onclick = () => {
    const kept = cards.filter((c) => c.st.status === "active");
    const clean = (t) => String(t || "").replace(/[\t\r\n]+/g, " ").trim();
    const lines = [
      "#separator:tab", "#html:false", "#tags column:3",
      ...kept.map((c) => [clean(c.front), clean(c.back + (c.explanation ? ` — ${c.explanation}` : "")), clean(`${slugify(p.name)} ${c.type}`)].join("\t")),
    ];
    if (!kept.length) return toast("Noch keine behaltenen Karten in diesem Paket");
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
      <button class="btn sm" data-print>${icon.print} Drucken / als PDF</button>
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
              <dt><span class="type-chip">${esc(TYPES[c.type] || c.type)}</span>${esc(c.front)}</dt>
              <dd><mark>${esc(c.back)}</mark>${c.explanation ? `<br><span class="muted">${esc(c.explanation)}</span>` : ""}</dd>
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
    <p class="eyebrow">Einstellungen</p>
    <h1 class="title">Mehr</h1>

    <h2 class="section">Dokumente</h2>
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

    <h2 class="section">Lernen</h2>
    <div class="group">
      <div class="item"><div><b>Neue Karten pro Tag</b><small>Wie viele ungelernte Karten täglich dazukommen</small></div>
        <div class="stepper"><button data-step="-5" aria-label="weniger">−</button><output>${s.newPerDay}</output><button data-step="5" aria-label="mehr">+</button></div></div>
      <div class="item"><div><b>Neue Karten ohne Sichten übernehmen</b><small>Sie kommen dann direkt in den Lernplan</small></div>
        <label class="switch"><input type="checkbox" data-auto ${s.autoAccept ? "checked" : ""} aria-label="Neue Karten ohne Sichten übernehmen"><i></i></label></div>
    </div>

    <h2 class="section">Darstellung</h2>
    <div class="seg" style="grid-template-columns:repeat(3,1fr)">
      ${[["auto", "Automatisch"], ["light", "Hell"], ["dark", "Dunkel"]].map(([k, v]) => `<button data-theme="${k}" class="${s.theme === k ? "on" : ""}">${v}</button>`).join("")}
    </div>

    <h2 class="section">Lernstand</h2>
    <div class="group">
      <div class="item"><div><b>Sichern</b><small>Als Datei speichern, z. B. für ein anderes Gerät</small></div><button class="link" data-export>Sichern</button></div>
      <div class="item"><div><b>Einspielen</b><small>Eine gesicherte Datei laden</small></div><label class="link" style="color:var(--accent);font-weight:600;cursor:pointer">Laden<input type="file" accept="application/json,.json" data-import hidden></label></div>
      <div class="item"><div><b>Zurücksetzen</b><small>Löscht Fortschritt und Sichtung auf diesem Gerät</small></div><button class="link danger" data-reset>Zurücksetzen</button></div>
    </div>
    <p class="faint" style="font-size:12.5px;text-align:center;margin-top:28px">Dein Lernstand wird nur auf diesem Gerät gespeichert.</p>
  `;

  $$("[data-step]", view).forEach((b) => b.onclick = () => {
    s.newPerDay = Math.max(0, Math.min(100, s.newPerDay + Number(b.dataset.step)));
    $("output", view).textContent = s.newPerDay;
    save();
  });
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
          if (!res.ok) throw new Error(`${repo}: ${res.status === 404 ? "nicht gefunden oder kein Zugriff" : `Fehler ${res.status}`}`);
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
