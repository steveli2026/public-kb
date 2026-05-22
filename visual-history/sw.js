const ASSET_CACHE = "visual-history-assets-v1";
const DATA_CACHE = "visual-history-data-v1";
const SHELL_CACHE = "visual-history-shell-v1";
const KNOWN_CACHES = new Set([ASSET_CACHE, DATA_CACHE, SHELL_CACHE]);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => (KNOWN_CACHES.has(key) ? null : caches.delete(key)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/vendor/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (url.pathname.startsWith("/data/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (request.mode === "navigate" || url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(networkFirst(request, SHELL_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}
