/*
 * Nexora service worker (Phase 6h.3). Kept deliberately small: it makes the
 * app installable and shows a clean offline page when a page can't load.
 * Data is never cached here - it lives in the app and, later, on the server.
 */
const CACHE = "nexora-shell-v1"
const SHELL = ["/offline.html", "/icons/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  // Only page navigations get the offline fallback; everything else goes to the network as usual
  if (event.request.mode !== "navigate") return
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")))
})
