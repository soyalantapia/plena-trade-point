// Trade Point · Service Worker
// Network-first para navegaciones HTML (evita servir un shell viejo tras redeploy);
// cache-first para assets hasheados de Next (inmutables), con red de respaldo offline.
const CACHE = "tp-shell-v2";
// Base derivada del scope del SW: "/plena-trade-point/" en Pages, "/" en dev.
const BASE = new URL("./", self.location).pathname;
const PRECACHE = [BASE];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  // Navegaciones HTML → network-first (no quedarse con el shell viejo tras un deploy).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match(BASE))),
    );
    return;
  }

  // Assets (hasheados por Next) → cache-first con respaldo de red.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      });
    }),
  );
});
