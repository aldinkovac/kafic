// Service worker za Kafić: prima obavještenja i otvara sajt kad se klikne na njih.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "Kafić", body: "Imaš novu poruku ☕", url: "/poruke" };
  try { data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/badge.png",
    tag: "kafic",
    renotify: true,
    data: { url: data.url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/poruke";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if ("focus" in c) { await c.focus(); if ("navigate" in c) await c.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});
