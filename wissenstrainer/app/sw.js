// App-Shell offline verfügbar machen. Bei Änderungen an der App VERSION erhöhen.
const VERSION = "wt-1";
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "srs.js", "manifest.webmanifest",
  "data/demo.json", "icons/icon.svg", "icons/icon-192.png", "icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Kartendaten und GitHub-API: immer frisch, die App fällt selbst auf ihre Kopie zurück
  if (url.hostname === "api.github.com" || url.pathname.endsWith("/library.json")) return;

  // Schriften: aus dem Cache, im Hintergrund aktualisieren
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(e.request);
        const net = fetch(e.request).then((res) => { cache.put(e.request, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // App-Shell: Netz zuerst (damit Updates sofort ankommen), offline aus dem Cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(e.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
