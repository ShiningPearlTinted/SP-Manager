const CACHE = "sp-manager-shell-v2";
const BASE = "/SP-Manager/";
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(`${BASE}index.html`);
      if (!response.ok) return;
      await cache.put(`${BASE}index.html`, response.clone());
      await cache.put(BASE, response.clone());
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1]);
      await Promise.all([...new Set(assets)].map(async path => {
        try { const asset = await fetch(path); if (asset.ok) await cache.put(path, asset); } catch { }
      }));
    } catch { }
  })());
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("sp-manager-shell-") && key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(BASE, response.clone()));
      return response;
    }).catch(async () => (await caches.match(BASE)) || (await caches.match(`${BASE}index.html`)) || Response.error()));
    return;
  }
  if (/\.(?:js|css|svg|png|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    })));
  }
});
