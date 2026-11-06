/* Service worker de dailytracker: recibe notificaciones push y abre la app al tocarlas.
   No guarda caché de la app, para no servir versiones viejas después de un deploy. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'dailytracker ❣';
  const options = {
    body: data.body || 'Tienes una novedad esperándote.',
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    tag: data.tag || 'dailytracker',
    data: { url: data.url || '/' },
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      if (typeof data.unread === 'number' && self.navigator.setAppBadge) {
        try {
          await self.navigator.setAppBadge(data.unread);
        } catch (e) {}
      }
      // Avisa a las pestañas abiertas para que actualicen la campanita.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach((c) => c.postMessage({ type: 'dt-notification' }));
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clients) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          if ('navigate' in c) await c.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
