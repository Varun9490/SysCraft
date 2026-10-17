/* SysCraft service worker — offline-first app shell.
 *
 * Strategy:
 *  - Immutable build assets (/_next/static/…) are cache-first: instant
 *    repeat visits and full offline operation after the first load.
 *  - Page navigations are network-first with a cache fallback, so fresh
 *    deploys are picked up immediately but previously visited pages still
 *    open with the network off.
 *  - Everything else (cross-origin requests, APIs, WebRTC signaling) is
 *    untouched — the worker never intercepts it.
 *
 * No user data flows through this cache: canvases, cards, and settings live
 * in IndexedDB/localStorage and are managed by the app itself.
 */

const CACHE_NAME = "syscraft-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const hit = await cache.match(request);
          if (hit) return hit;
          const home = await cache.match("/");
          if (home) return home;
          return new Response("Offline — this page has not been visited yet.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })(),
    );
  }
});
