// Minimal, hand-written service worker — no Workbox/build step. Caches
// only the static app shell (hashed /_next/static/* chunks and the PWA
// icons); everything else passes straight through to the network. Never
// caches /api/*, /api/v1/uploads/*, or page navigations themselves, since
// those carry per-tenant/per-user data — this is read-only "install faster,
// work offline for the shell" behavior, not an offline data cache.
const CACHE_VERSION = "v1";
const STATIC_CACHE = `bee-vending-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isNeverCached(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/_next/data/")
  );
}

function isStaticShellAsset(pathname) {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCached(url.pathname)) return; // let the browser handle it normally

  // Page navigations: network-first so logged-in users always see live,
  // authenticated content — only fall back to the generic offline page
  // when the network request itself fails.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static shell assets (hashed build chunks, icons): cache-first, since
  // their filenames change whenever their content does.
  if (isStaticShellAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }

  // Everything else (RSC payloads, the manifest, etc.) — not intercepted.
});
