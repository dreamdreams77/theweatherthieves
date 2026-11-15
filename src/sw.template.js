// Service worker for the installed app: the whole game is precached so it plays offline; every release has its own cache.
const BUILD = '__BUILD__';
const SHELL = `weather-thieves-${BUILD}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('weather-thieves-') && k !== SHELL) await caches.delete(k); await self.clients.claim(); })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return; const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // pages: network first (so a new release shows up next visit), cached copy when offline
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put('./', copy)); } return r; }).catch(() => caches.match('./', { ignoreSearch: true, ignoreVary: true }).then((r) => r || Response.error())));
      return;
    }
    // hashed assets, models, textures: cache first
    e.respondWith((async () => { const c = await caches.open(SHELL); const hit = await c.match(req, { ignoreSearch: true, ignoreVary: true }); if (hit) return hit; const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; })());
    return;
  }
  // other origins (Google Fonts): left to the browser; offline the game falls back to system fonts
});
