const CACHE = "sp-manager-shell-v3";
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

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch { payload = {body: "A new booking is waiting for your outlet."}; }
    const title = String(payload.title || "SP-Manager");
    const reference = /^[A-Za-z0-9-]{8,32}$/.test(String(payload.data?.reference || "")) ? String(payload.data.reference) : "";
    const outlet = /^[1-9][0-9]{0,17}$/.test(String(payload.data?.outlet_id || "")) ? String(payload.data.outlet_id) : "";
    const query = new URLSearchParams();
    if (reference) query.set("reference", reference);
    if (outlet) query.set("outlet", outlet);
    const url = new URL(self.registration.scope);
    if (reference) url.hash = "booking?" + query.toString();
    await self.registration.showNotification(title, {
      body: String(payload.body || "A new booking is waiting for your outlet."),
      tag: String(payload.tag || (reference ? "sp-booking-" + reference : "sp-notification")),
      data: {url: url.href}
    });
    const clients = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    for (const client of clients) client.postMessage({type: "SP_NOTIFICATION_RECEIVED"});
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || self.registration.scope);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    for (const client of windows) {
      if (new URL(client.url).origin !== target.origin) continue;
      const navigated = await client.navigate(target.href);
      return (navigated || client).focus();
    }
    return self.clients.openWindow(target.href);
  })());
});
self.addEventListener("pushsubscriptionchange", event => {
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    for (const client of clients) client.postMessage({type: "SP_PUSH_SUBSCRIPTION_CHANGE"});
  })());
});