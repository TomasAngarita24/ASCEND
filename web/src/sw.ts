import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

type PrecacheEntry = { url: string; revision: string | null };

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: PrecacheEntry[] };

precacheAndRoute(self.__WB_MANIFEST);

// SPA shell: navigations are served from the precached index.html when offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// Images: cache-first, pruned after 30 days.
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'ascend-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

// Google Fonts: cache-first, long-lived.
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'ascend-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
);

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: { url?: string };
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {};
  const data = event.data;
  if (data) {
    try {
      payload = data.json() as PushPayload;
    } catch {
      payload = { title: data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'ASCEND', {
      body: payload.body,
      icon: payload.icon || '/icons/icon.svg',
      badge: payload.badge || '/icons/icon.svg',
      tag: payload.tag || 'ascend',
      data: payload.data || {},
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin);

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.navigate(targetUrl);
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

// autoUpdate mode: activate the fresh service worker as soon as it installs.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});