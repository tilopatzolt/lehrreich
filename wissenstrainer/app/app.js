import { schedule, preview, isDue, isMature, dayKey, startOfDay } from "./srs.js";

/* ============================================================
   Zustand
   ============================================================ */

const STORE_KEY = "wt.v1";
const TOKEN_KEY = "wt.github";
const DAY = 86400000;

const TYPES = {
  fakt: "Fakt",
  zahl: "Zahl",
  argument: "Argument",
  beispiel: "Beispiel",
  zitat: "Zitat",
  begriff: "Begriff",
};

const DEFAULT_SETTINGS = { newPerDay: 10, autoAccept: false, theme: "auto" };

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

const state = Object.assign(
  { cards: {}, custom: [], log: {}, settings: {} },
  readJSON(STORE_KEY, {}),
);
state.settings = { ...DEFAULT_SETTINGS, ...state.settings };

let github = readJSON(TOKEN_KEY, { repo: "tilopatzolt/lehrreich", branch: "main", token: "" });

let library = { sources: [], cards: [], updated: null };
let isDemo = false;

const save = () => writeJSON(STORE_KEY, state);

function cardState(id) {
  if (!state.cards[id]) state.cards[id] = { status: state.settings.autoAccept ? "active" : "new" };
  return state.cards[id];
}

const sourceById = () => {
  const map = Object.fromEntries(library.sources.map((s) => [s.id, s]));
  map.eigene = { id: "eigene", title: "Eigene Karten", organisation: "" };
  return map;
};

function allCards() {
  const known = new Set(library.sources.map((s) => s.id));
  const base = library.cards.filter((c) => known.has(c.source)).concat(state.custom);
  return base.map((c) => {
    const st = cardState(c.id);
    return { ...c, ...(st.edits || {}), st };
  });
}

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

function studyQueue() {
  const active = byStatus("active");
  const due = active.filter((c) => isDue(c.st.srs)).sort((a, b) => a.st.srs.due - b.st.srs.due);
  const left = Math.max(0, state.settings.newPerDay - todayLog().fresh);
  const fresh = active
    .filter((c) => !c.st.srs)
    .sort((a, b) => (b.importance || 0) - (a.importance || 0) || String(a.created).localeCompare(String(b.created)))
    .slice(0, left);
  // neue Karten zwischen die Wiederholungen mischen
  const queue = [];
  while (due.length || fresh.length) {
    queue.push(...due.splice(0, 3));
    if (fresh.length) queue.push(fresh.shift());
  }
  return queue;
}

/* ============================================================
   Laden
   ============================================================ */

async function fetchLibrary() {
  // Mit GitHub-Verbindung direkt aus dem Repo lesen: neue Karten sind dann sofort da,
  // ohne auf das nächste Pages-Deployment zu warten.
  if (github.token) {
    try {
      const res = await gh(`contents/wissenstrainer/app/data/library.json?ref=${encodeURIComponent(github.branch)}`, {
        headers: { Accept: "application/vnd.github.raw+json" },
      });
      if (res.ok) return await res.json();
    } catch {
      /* auf die veröffentlichte Datei zurückfallen */
    }
  }
  const res = await fetch(`data/library.json?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`library.json: ${res.status}`);
  return res.json();
}

async function load({ quiet = true } = {}) {
  let lib;
  try {
    lib = await fetchLibrary();
  } catch {
    lib = readJSON("wt.library", null) || { sources: [], cards: [] };
  }
  isDemo = !lib.cards?.length;
  if (isDemo) {
    try {
      lib = await (await fetch("data/demo.json")).json();
    } catch {
      lib = { sources: [], cards: [] };
    }
  } else {
    writeJSON("wt.library", lib);
  }
  const before = new Set(Object.keys(state.cards));
  library = lib;
  const added = allCards().filter((c) => !before.has(c.id)).length;
  save();
  render();
  if (!quiet) toast(added ? `${added} neue Karten geladen` : "Alles aktuell");
}

/* ============================================================
   Hilfsfunktionen
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

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
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function stars(n) {
  return n ? `<span class="stars" title="Wichtigkeit">${"●".repeat(n)}${"○".repeat(3 - n)}</span>` : "";
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

function flashHTML(c, { reveal = false } = {}) {
  const src = sourceById()[c.source] || {};
  const srcLine = [src.title, src.organisation, c.location].filter(Boolean).map(esc).join(" · ");
  return `
    <article class="flash" data-type="${esc(c.type)}" data-id="${esc(c.id)}">
      <div class="meta">
        <span class="type-chip">${esc(TYPES[c.type] || c.type)}</span>
        <span class="topic-label">${esc(c.topic || "")}</span>
      </div>
      <p class="front">${esc(c.front)}</p>
      ${reveal ? `
      <div class="answer">
        <p class="back">${esc(c.back)}</p>
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
  toastTimer = setTimeout(() => el.classList.remove("show"), action ? 5000 : 2400);
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

function applyTheme() {
  const t = state.settings.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

/* ============================================================
   Router
   ============================================================ */

const routes = { heute: renderToday, sichten: renderReview, bibliothek: renderLibrary, mehr: renderSettings, lernen: renderStudy };

function currentRoute() {
  const [name, arg] = location.hash.replace(/^#\/?/, "").split("/");
  return { name: routes[name] ? name : "heute", arg };
}

function render() {
  const { name, arg } = currentRoute();
  document.body.classList.toggle("focus", name === "lernen");
  $$(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === name));
  const fresh = byStatus("new").length;
  const badge = $(".tabbar .badge");
  badge.hidden = !fresh;
  badge.textContent = fresh > 99 ? "99+" : fresh;
  routes[name]($("#view"), arg);
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

function renderToday(view) {
  const now = new Date();
  const h = now.getHours();
  const greet = h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const cards = allCards();
  const active = cards.filter((c) => c.st.status === "active");
  const fresh = cards.filter((c) => c.st.status === "new").length;
  const queue = studyQueue();
  const log = todayLog();
  const doneToday = log.reviews;
  const total = doneToday + queue.length;
  const pct = total ? doneToday / total : active.length ? 1 : 0;
  const C = 2 * Math.PI * 42;
  const newInQueue = queue.filter((c) => !c.st.srs).length;

  const topics = {};
  for (const c of active) {
    const t = (topics[c.topic || "Ohne Thema"] ||= { n: 0, m: 0, l: 0 });
    t.n++;
    if (isMature(c.st.srs)) t.m++;
    else if (c.st.srs?.reps) t.l++;
  }
  const topicList = Object.entries(topics).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  const recent = [...library.sources].filter((s) => s.status !== "fehler").sort((a, b) => String(b.added).localeCompare(String(a.added))).slice(0, 3);

  view.innerHTML = `
    <p class="eyebrow">${esc(now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }))}</p>
    <h1 class="title">${greet}</h1>

    ${isDemo ? `<div class="demo-note">${icon.info}<div><b>Beispieldaten.</b> Sobald das erste Dokument verarbeitet ist, erscheinen hier deine eigenen Karten. Dokumente kommen in <code>wissenstrainer/inbox/</code> oder über <a href="#/mehr">Mehr → Dokument hinzufügen</a>.</div></div>` : ""}

    <section class="hero">
      <div class="hero-row">
        <div class="ring">
          <svg viewBox="0 0 96 96"><circle class="track" cx="48" cy="48" r="42"/><circle class="fill" cx="48" cy="48" r="42" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
          <div class="num"><div><b>${queue.length}</b><span>offen</span></div></div>
        </div>
        <div>
          <h2>${queue.length ? `${queue.length} Karten warten` : active.length ? "Für heute geschafft" : "Noch nichts im Pool"}</h2>
          <p>${queue.length ? `${newInQueue} neu · ${queue.length - newInQueue} Wiederholung${queue.length - newInQueue === 1 ? "" : "en"}` : active.length ? `${doneToday} Karten heute gelernt` : "Übernimm Karten unter „Sichten“."}</p>
        </div>
      </div>
      ${queue.length
        ? `<a class="btn" href="#/lernen">Lernen starten</a>`
        : active.length ? `<a class="btn" href="#/lernen/frei">Freies Training</a>` : `<a class="btn" href="#/sichten">Karten sichten</a>`}
    </section>

    <div class="stats">
      <div class="stat"><b>${streak()}</b><span>Tage Serie</span></div>
      <div class="stat"><b>${active.length}</b><span>im Lernpool</span></div>
      <div class="stat"><b>${active.filter((c) => isMature(c.st.srs)).length}</b><span>gefestigt</span></div>
    </div>

    ${fresh ? `
    <a class="inbox-cta" href="#/sichten">
      <span class="stack"><i></i><i></i><i>${fresh > 99 ? "99+" : fresh}</i></span>
      <div><b>${fresh} neue Karte${fresh === 1 ? "" : "n"} zum Sichten</b><small>Übernehmen, verwerfen oder umformulieren</small></div>
      <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>
    </a>` : ""}

    ${topicList.length ? `
    <h2 class="section">Themen <small>gefestigt / im Lernen</small></h2>
    <div class="topics">
      ${topicList.map(([name, t]) => `
        <a class="topic" href="#/bibliothek" data-topic="${esc(name)}">
          <b>${esc(name)}</b><span>${plural(t.n, "Karte", "Karten")}</span>
          <div class="bar"><i class="m" style="width:${(t.m / t.n) * 100}%"></i><i class="l" style="width:${(t.l / t.n) * 100}%"></i></div>
        </a>`).join("")}
    </div>` : ""}

    ${recent.length ? `
    <h2 class="section">Zuletzt hinzugefügt</h2>
    <div class="list">${recent.map(sourceRowHTML).join("")}</div>` : ""}
  `;

  $$(".topic", view).forEach((a) => a.addEventListener("click", () => { libFilter = { ...libFilter, q: a.dataset.topic, tab: "karten" }; }));
  bindSourceRows(view);
}

/* ============================================================
   Lernen
   ============================================================ */

let session = null;

function renderStudy(view, arg) {
  if (!session) {
    const free = arg === "frei";
    const queue = free
      ? byStatus("active").sort(() => Math.random() - 0.5).slice(0, 15)
      : studyQueue();
    session = { free, queue, total: queue.length, done: 0, revealed: false };
  }
  const s = session;
  const card = s.queue[0];

  if (!card) {
    view.innerHTML = `
      <div class="study">
        <div class="done">
          <div class="big">${s.done ? "✓" : "–"}</div>
          <h2>${s.done ? "Stark gemacht" : "Nichts fällig"}</h2>
          <p class="muted">${s.done ? `${s.done} Karte${s.done === 1 ? "" : "n"} in dieser Runde.` : "Gerade gibt es nichts zu wiederholen."}</p>
          <p style="margin-top:28px"><a class="btn" href="#/heute">Zur Übersicht</a></p>
        </div>
      </div>`;
    return;
  }

  const labels = preview(card.st.srs);
  view.innerHTML = `
    <div class="study">
      <div class="study-top">
        <a class="icon-btn" href="#/heute" aria-label="Beenden">${icon.x}</a>
        <div class="progress"><i style="width:${(s.done / Math.max(1, s.done + s.queue.length)) * 100}%"></i></div>
        <span class="study-count">${s.done}/${s.done + s.queue.length}</span>
      </div>
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
  const st = cardState(card.id);
  const log = todayLog();
  if (!s.free) {
    if (!st.srs) log.fresh++;
    st.srs = schedule(st.srs, g);
    log.reviews++;
    if (g === 0) log.again++;
  } else {
    log.reviews++;
  }
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

let reviewSource = "alle";

function renderReview(view) {
  const fresh = byStatus("new").sort((a, b) => (b.importance || 0) - (a.importance || 0));
  const sources = sourceById();
  const groups = [...new Set(fresh.map((c) => c.source))];
  if (reviewSource !== "alle" && !groups.includes(reviewSource)) reviewSource = "alle";
  const list = reviewSource === "alle" ? fresh : fresh.filter((c) => c.source === reviewSource);

  view.innerHTML = `
    <p class="eyebrow">Kuratieren</p>
    <h1 class="title">Sichten</h1>
    ${fresh.length ? `
      ${groups.length > 1 ? `
      <div class="filter-row">
        <button class="chip ${reviewSource === "alle" ? "on" : ""}" data-src="alle">Alle · ${fresh.length}</button>
        ${groups.map((g) => `<button class="chip ${reviewSource === g ? "on" : ""}" data-src="${esc(g)}">${esc(sources[g]?.title || g)} · ${fresh.filter((c) => c.source === g).length}</button>`).join("")}
      </div>` : ""}
      <p class="muted" style="margin:0 0 8px;font-size:14px">${list.length} neue Karte${list.length === 1 ? "" : "n"} · nach rechts wischen = übernehmen, nach links = verwerfen</p>
      <div class="deck">
        ${list.slice(0, 3).reverse().map((c, i, arr) => {
          const depth = arr.length - 1 - i;
          return flashHTML(c, { reveal: true }).replace('class="flash"', `class="flash ${depth === 1 ? "under" : depth === 2 ? "under2" : "top"}"`);
        }).join("")}
      </div>
      <div class="review-actions">
        <button class="round drop" data-act="drop" aria-label="Verwerfen">${icon.x}</button>
        <button class="round edit" data-act="edit" aria-label="Bearbeiten">${icon.pen}</button>
        <button class="round keep" data-act="keep" aria-label="Übernehmen">${icon.check}</button>
      </div>
      <p style="text-align:center;margin-top:18px"><button class="btn ghost sm" data-all>Alle ${list.length} übernehmen</button></p>
    ` : `
      <div class="empty">
        <div class="art">∅</div>
        <h3>Alles gesichtet</h3>
        <p>Neue Karten erscheinen hier, sobald ein Dokument verarbeitet wurde.</p>
        <p style="margin-top:20px"><a class="btn ghost" href="#/mehr">Dokument hinzufügen</a></p>
      </div>`}
  `;

  $$("[data-src]", view).forEach((b) => b.addEventListener("click", () => { reviewSource = b.dataset.src; renderReview(view); }));

  const top = $(".deck .flash.top", view);
  if (!top) return;
  const id = top.dataset.id;
  const decide = (dir) => {
    const st = cardState(id);
    const prev = st.status;
    st.status = dir === "keep" ? "active" : "rejected";
    save();
    render();
    toast(dir === "keep" ? "In den Lernpool übernommen" : "Verworfen", {
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
    ids.forEach((cid) => (cardState(cid).status = "active"));
    save();
    render();
    toast(`${ids.length} Karten übernommen`, {
      label: "Rückgängig",
      run: () => { ids.forEach((cid) => (cardState(cid).status = "new")); save(); render(); },
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
  el.insertAdjacentHTML("afterbegin", '<span class="stamp keep">NEHMEN</span><span class="stamp drop">WEG</span>');
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
   Karte bearbeiten / anlegen
   ============================================================ */

function editCard(card) {
  const isNew = !card;
  const c = card || { type: "fakt", topic: "", front: "", back: "", explanation: "", tags: [] };
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
      delete cardState(card.id).edits;
      save(); closeSheet(); render(); toast("Original wiederhergestellt");
    });
    $("form", sheet).onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      if (isNew) {
        const id = "c_" + Math.random().toString(36).slice(2, 10);
        state.custom.push({ id, source: "eigene", created: new Date().toISOString(), importance: 2, tags: [], quote: "", location: "", attribution: "", ...data });
        state.cards[id] = { status: "active" };
      } else if (card.source === "eigene") {
        Object.assign(state.custom.find((x) => x.id === card.id), data);
      } else {
        cardState(card.id).edits = data;
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
      ${st.status === "new" ? "Noch nicht gesichtet" : st.status === "rejected" ? "Verworfen" : next ? `Nächste Wiederholung: ${next} · ${st.srs.reps} × richtig` : "Im Lernpool, noch nicht gelernt"}
      ${card.importance ? " · " + stars(card.importance) : ""}
    </p>
    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn ghost" data-edit>${icon.pen} Bearbeiten</button>
      ${st.status === "active"
        ? `<button class="btn ghost danger" data-status="rejected">Aus dem Pool</button>`
        : `<button class="btn accent" data-status="active">In den Lernpool</button>`}
    </div>
    ${card.source === "eigene" ? `<p style="text-align:center;margin-top:12px"><button class="btn ghost sm danger" data-delete>Karte löschen</button></p>` : ""}
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

/* ============================================================
   Bibliothek
   ============================================================ */

let libFilter = { tab: "karten", q: "", type: "", status: "", source: "" };

function sourceRowHTML(s) {
  const failed = s.status === "fehler";
  const meta = [s.organisation, s.authors, s.published].filter(Boolean).map(esc).join(" · ");
  return `
    <button class="row source-card ${failed ? "failed" : ""}" data-source="${esc(s.id)}">
      <span class="eyebrow">${esc(s.doc_type || (failed ? "Fehler" : "Dokument"))}</span>
      <h3>${esc(s.title || s.file)}</h3>
      ${meta ? `<p>${meta}</p>` : ""}
      ${failed ? `<p class="danger">Konnte nicht verarbeitet werden: ${esc(s.error || "")}</p>` : ""}
      ${s.core_thesis ? `<div class="thesis">${esc(s.core_thesis)}</div>` : ""}
      <div class="foot"><span>${plural(s.card_count ?? 0, "Karte", "Karten")}</span><span>${esc(fmtDate(s.added))}</span>${s.demo ? '<span class="pill">Beispiel</span>' : ""}</div>
    </button>`;
}

function bindSourceRows(root) {
  $$("[data-source]", root).forEach((b) => b.addEventListener("click", () => {
    libFilter = { tab: "karten", q: "", type: "", status: "", source: b.dataset.source };
    if (currentRoute().name === "bibliothek") renderLibrary($("#view"));
    else location.hash = "#/bibliothek";
  }));
}

function renderLibrary(view) {
  const f = libFilter;
  const sources = sourceById();
  view.innerHTML = `
    <p class="eyebrow">${plural(allCards().length, "Karte", "Karten")} · ${plural(library.sources.length, "Quelle", "Quellen")}</p>
    <h1 class="title">Bibliothek</h1>
    <label class="search">${icon.search}<input type="search" placeholder="Fragen, Antworten, Themen …" value="${esc(f.q)}" aria-label="Suchen"></label>
    <div class="seg"><button data-tab="karten" class="${f.tab === "karten" ? "on" : ""}">Karten</button><button data-tab="quellen" class="${f.tab === "quellen" ? "on" : ""}">Quellen</button></div>
    <div id="lib-body"></div>
    <button class="fab" aria-label="Eigene Karte anlegen">${icon.plus}</button>
  `;

  const body = $("#lib-body", view);
  const draw = () => {
    if (f.tab === "quellen") {
      const q = f.q.toLowerCase();
      const list = library.sources
        .filter((s) => !q || [s.title, s.organisation, s.authors, s.summary, s.file].join(" ").toLowerCase().includes(q))
        .sort((a, b) => String(b.added).localeCompare(String(a.added)));
      body.innerHTML = list.length
        ? `<div class="list">${list.map(sourceRowHTML).join("")}</div>`
        : `<div class="empty"><h3>Keine Quellen</h3><p>Lege Dokumente in den Inbox-Ordner.</p></div>`;
      bindSourceRows(body);
      return;
    }
    const q = f.q.toLowerCase();
    const list = allCards().filter((c) =>
      (!f.type || c.type === f.type) &&
      (!f.status || c.st.status === f.status) &&
      (!f.source || c.source === f.source) &&
      (!q || [c.front, c.back, c.topic, c.explanation, (c.tags || []).join(" ")].join(" ").toLowerCase().includes(q)),
    ).sort((a, b) => String(b.created).localeCompare(String(a.created)));
    body.innerHTML = `
      <div class="filter-row">
        ${f.source ? `<button class="chip on" data-clear-source>${esc(sources[f.source]?.title || "Quelle")} ✕</button>` : ""}
        ${[["", "Alle"], ["active", "Im Pool"], ["new", "Neu"], ["rejected", "Verworfen"]].map(([k, v]) => `<button class="chip ${f.status === k ? "on" : ""}" data-status="${k}">${v}</button>`).join("")}
      </div>
      <div class="filter-row">
        ${Object.entries(TYPES).map(([k, v]) => `<button class="chip ${f.type === k ? "on" : ""}" data-type="${k}" data-ftype="${k}">${v}</button>`).join("")}
      </div>
      ${list.length ? `<div class="list">${list.slice(0, 300).map((c) => `
        <button class="row" data-type="${esc(c.type)}" data-card="${esc(c.id)}">
          <span class="type-chip">${esc(TYPES[c.type] || c.type)}</span>
          <div class="q">${esc(c.front)}</div>
          <div class="a">${esc(c.back)}</div>
          <div class="foot">
            ${c.st.status === "new" ? '<span class="pill new">Neu</span>' : c.st.status === "rejected" ? '<span class="pill off">Verworfen</span>' : isMature(c.st.srs) ? '<span class="pill">Gefestigt</span>' : ""}
            <span>${esc(c.topic || "")}</span>
            ${c.st.edits ? "<span>bearbeitet</span>" : ""}
          </div>
        </button>`).join("")}</div>`
      : `<div class="empty"><h3>Nichts gefunden</h3><p>Filter lockern oder anders suchen.</p></div>`}
    `;
    $$("[data-status]", body).forEach((b) => b.onclick = () => { f.status = b.dataset.status; draw(); });
    $$("[data-ftype]", body).forEach((b) => b.onclick = () => { f.type = f.type === b.dataset.ftype ? "" : b.dataset.ftype; draw(); });
    $("[data-clear-source]", body)?.addEventListener("click", () => { f.source = ""; draw(); });
    $$("[data-card]", body).forEach((b) => b.onclick = () => showCard(allCards().find((c) => c.id === b.dataset.card)));
  };
  draw();

  $("input", view).addEventListener("input", (e) => { f.q = e.target.value; draw(); });
  $$(".seg button", view).forEach((b) => b.onclick = () => {
    f.tab = b.dataset.tab;
    $$(".seg button", view).forEach((x) => x.classList.toggle("on", x === b));
    draw();
  });
  $(".fab", view).onclick = () => editCard(null);
}

/* ============================================================
   Mehr / Einstellungen / Upload
   ============================================================ */

function gh(path, opts = {}) {
  return fetch(`https://api.github.com/repos/${github.repo}/${path}`, {
    ...opts,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${github.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function uploadFile(file) {
  const name = file.name.normalize("NFC").replace(/[^\p{L}\p{N}._ -]+/gu, "_").trim();
  const path = `wissenstrainer/inbox/${encodeURIComponent(name)}`;
  let sha;
  const existing = await gh(`contents/${path}?ref=${encodeURIComponent(github.branch)}`);
  if (existing.ok) sha = (await existing.json()).sha;
  const res = await gh(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Wissenstrainer: ${name} hinzugefügt`,
      content: await fileToBase64(file),
      branch: github.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return name;
}

function renderSettings(view) {
  const s = state.settings;
  view.innerHTML = `
    <p class="eyebrow">Einstellungen</p>
    <h1 class="title">Mehr</h1>

    <h2 class="section">Dokument hinzufügen</h2>
    <div class="group">
      ${github.token ? `
        <label class="dropzone">
          ${icon.upload}
          <b>PDF, Word, Text oder HTML auswählen</b>
          <span class="faint">landet in <code>inbox/</code> von ${esc(github.repo)} – Karten folgen nach ein paar Minuten</span>
          <input type="file" multiple accept=".pdf,.docx,.txt,.md,.html,.htm" hidden>
        </label>
        <div class="upload-log" id="upload-log"></div>
        <div class="item"><div><b>Neue Karten abrufen</b><small>${library.updated ? `Stand: ${esc(new Date(library.updated).toLocaleString("de-DE"))}` : "Noch keine verarbeiteten Dokumente"}</small></div><button class="icon-btn" data-refresh aria-label="Aktualisieren">${icon.refresh}</button></div>
        <div class="item"><div><b>GitHub-Verbindung</b><small>${esc(github.repo)} · ${esc(github.branch)}</small></div><button class="link" data-gh>Ändern</button></div>
      ` : `
        <div class="item"><div><b>Direkt vom Handy hochladen</b><small>Verbinde die App einmalig mit deinem GitHub-Repo. Dann kannst du Dokumente hier auswählen, sie landen im Inbox-Ordner und werden automatisch verarbeitet.</small></div></div>
        <div class="item"><button class="btn block accent" data-gh>GitHub verbinden</button></div>
        <div class="item"><div><b>Neue Karten abrufen</b><small>${library.updated ? `Stand: ${esc(new Date(library.updated).toLocaleString("de-DE"))}` : "Noch keine verarbeiteten Dokumente"}</small></div><button class="icon-btn" data-refresh aria-label="Aktualisieren">${icon.refresh}</button></div>
      `}
    </div>

    <h2 class="section">Lernen</h2>
    <div class="group">
      <div class="item"><div><b>Neue Karten pro Tag</b><small>Wie viele ungelernte Karten täglich dazukommen</small></div>
        <div class="stepper"><button data-step="-5" aria-label="weniger">−</button><output>${s.newPerDay}</output><button data-step="5" aria-label="mehr">+</button></div></div>
      <div class="item"><div><b>Neue Karten direkt übernehmen</b><small>Ohne Sichten sofort in den Lernpool</small></div>
        <label class="switch"><input type="checkbox" data-auto ${s.autoAccept ? "checked" : ""} aria-label="Neue Karten direkt übernehmen"><i></i></label></div>
    </div>

    <h2 class="section">Darstellung</h2>
    <div class="seg" style="grid-template-columns:repeat(3,1fr)">
      ${[["auto", "Automatisch"], ["light", "Hell"], ["dark", "Dunkel"]].map(([k, v]) => `<button data-theme="${k}" class="${s.theme === k ? "on" : ""}">${v}</button>`).join("")}
    </div>

    <h2 class="section">Daten</h2>
    <div class="group">
      <div class="item"><div><b>Lernstand sichern</b><small>Als Datei exportieren, z. B. zum Umzug auf ein anderes Gerät</small></div><button class="link" data-export>Export</button></div>
      <div class="item"><div><b>Lernstand einspielen</b><small>Eine exportierte Datei laden</small></div><label class="link" style="color:var(--accent);font-weight:600;cursor:pointer">Import<input type="file" accept="application/json,.json" data-import hidden></label></div>
      <div class="item"><div><b>Lernstand zurücksetzen</b><small>Löscht Fortschritt und Kuratierung auf diesem Gerät</small></div><button class="link danger" data-reset>Zurücksetzen</button></div>
    </div>
    <p class="faint" style="font-size:12.5px;text-align:center;margin-top:28px">Lernstand und Kuratierung werden nur auf diesem Gerät gespeichert.</p>
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

  const input = $(".dropzone input", view);
  input?.addEventListener("change", async () => {
    const log = $("#upload-log", view);
    for (const file of input.files) {
      const line = document.createElement("div");
      line.textContent = `⏳ ${file.name}`;
      log.append(line);
      try {
        const name = await uploadFile(file);
        line.textContent = `✅ ${name} – wird verarbeitet`;
      } catch (err) {
        line.textContent = `❌ ${file.name}: ${err.message}`;
      }
    }
    input.value = "";
  });

  $("[data-export]", view).onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wissenstrainer-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $("[data-import]", view).onchange = async (e) => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!data.cards || !data.settings) throw new Error();
      Object.assign(state, data);
      save(); applyTheme(); render(); toast("Lernstand eingespielt");
    } catch {
      toast("Datei konnte nicht gelesen werden");
    }
  };
  $("[data-reset]", view).onclick = () => {
    if (!confirm("Lernfortschritt und Kuratierung auf diesem Gerät wirklich löschen?")) return;
    state.cards = {}; state.log = {}; state.custom = [];
    save(); render(); toast("Zurückgesetzt");
  };
}

function githubSheet() {
  openSheet(`
    <h2>GitHub verbinden</h2>
    <p class="muted" style="margin-top:-6px;font-size:14px">Lege auf github.com unter <i>Settings → Developer settings → Fine-grained tokens</i> einen Token an, der nur auf dieses Repository zugreift, mit der Berechtigung <b>Contents: Read and write</b>. Der Token bleibt ausschließlich auf diesem Gerät.</p>
    <form>
      <div class="field"><label for="g-repo">Repository</label><input id="g-repo" name="repo" value="${esc(github.repo)}" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label for="g-branch">Branch</label><input id="g-branch" name="branch" value="${esc(github.branch)}" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label for="g-token">Token</label><input id="g-token" name="token" type="password" value="${esc(github.token)}" placeholder="github_pat_…" autocomplete="off"></div>
      <div class="sheet-actions">
        ${github.token ? `<button type="button" class="btn ghost danger" data-remove>Trennen</button>` : `<button type="button" class="btn ghost" data-cancel>Abbrechen</button>`}
        <button class="btn accent" type="submit">Prüfen &amp; speichern</button>
      </div>
    </form>`, (sheet) => {
    $("[data-cancel]", sheet)?.addEventListener("click", closeSheet);
    $("[data-remove]", sheet)?.addEventListener("click", () => {
      github = { ...github, token: "" };
      writeJSON(TOKEN_KEY, github);
      closeSheet(); render();
    });
    $("form", sheet).onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const prev = github;
      github = { repo: data.repo.trim(), branch: data.branch.trim() || "main", token: data.token.trim() };
      try {
        const res = await gh("");
        if (!res.ok) throw new Error(res.status === 404 ? "Repository nicht gefunden oder kein Zugriff" : `HTTP ${res.status}`);
        const repo = await res.json();
        if (!repo.permissions?.push) throw new Error("Token hat keine Schreibrechte");
        writeJSON(TOKEN_KEY, github);
        closeSheet(); render(); toast("Verbunden");
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
