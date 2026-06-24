const CACHE_NAME = "voley-lisboa-static-v5";
const CACHE_PREFIX = "voley-lisboa-static-";
const PRECACHE_URLS = [
  "/offline.html",
  "/ball.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/notification-badge-96.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  const isNextStaticAsset = url.pathname.startsWith("/_next/static/");
  const isBrandAsset = PRECACHE_URLS.includes(url.pathname);

  if (!isNextStaticAsset && !isBrandAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse.ok || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        void caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, responseToCache));

        return networkResponse;
      });
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    body: "Tens uma nova atualização do Voley Lisboa.",
    title: "Voley Lisboa",
    url: "/dashboard",
  };

  if (event.data) {
    try {
      payload = {
        ...payload,
        ...event.data.json(),
      };
    } catch {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    badge: "/icons/notification-badge-96.png",
    body: payload.body,
    data: {
      url: payload.url || "/dashboard",
    },
    icon: "/icons/icon-192.png",
    tag: payload.tag,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/dashboard",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({
        includeUncontrolled: true,
        type: "window",
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
