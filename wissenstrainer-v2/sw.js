// Offline-Fähigkeit nur für /v2/ – eigener Cache-Name, berührt die erste Version nicht.
// Bei Änderungen an der App VERSION erhöhen.
const VERSION = "wt2-6";
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "kern.js", "daten.js", "github.js", "data/demo.json", "manifest.webmanifest",
  "fonts/jost-latin.woff2", "fonts/jost-latin-ext.woff2", "icons/icon.svg", "icons/icon-192.png", "icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  // nur eigene, ältere Caches löschen (die erste Version nutzt "wt-…")
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("wt2-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // Bilder: aus dem Cache, im Hintergrund erneuern; fehlende Bilder (404) nicht speichern
  if (url.pathname.includes("/img/")) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(e.request);
        const net = fetch(e.request).then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => hit || Response.error());
        return hit || net;
      }),
    );
    return;
  }

  // App: Netz zuerst (Updates kommen sofort an), offline aus dem Cache
  const fresh = e.request.mode === "navigate" ? e.request : new Request(e.request, { cache: "no-cache" });
  e.respondWith(
    fetch(fresh)
      .then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(e.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
