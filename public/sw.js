// Upward service worker — intentionally minimal.
//
// Its job: satisfy PWA installability (a fetch handler) and make repeat loads
// of immutable static assets fast. It deliberately does NOT touch navigations,
// API calls, or auth — those always go to the network, so nothing goes stale
// and no private response is ever cached.

const CACHE = "upward-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Only content-hashed static assets + icons are safe to cache.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|svg|ico|woff2?)$/.test(url.pathname);
  if (!isStatic) return; // navigations, API, everything else → network

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
});
