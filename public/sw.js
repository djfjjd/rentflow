const CACHE_NAME = "rentflow-pwa-v1";
const APP_SHELL = ["/app", "/manifest.json", "/offline.html", "/icons/icon-192x192.png", "/icons/icon-512x512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

self.addEventListener("push", function (event) {
  let data = {};
  let rawPayload = "";
  try {
    rawPayload = event.data ? event.data.text() : "";
    data = rawPayload ? JSON.parse(rawPayload) : {};
  } catch {
    data = {
      title: "RentFlow 테스트 알림",
      body: rawPayload || "푸시알림 테스트입니다.",
    };
  }
  if (!data || typeof data !== "object") {
    data = {
      title: "RentFlow 테스트 알림",
      body: rawPayload || "푸시알림 테스트입니다.",
    };
  }
  const title = data.title || "RentFlow 알림";
  const tag = data.tag || "rentflow-notification";
  const clickUrl = data.url || defaultNotificationUrl(tag);
  const options = {
    body: data.body || "새 알림이 있습니다.",
    subtitle: data.subtitle || "from 렌트플로우",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    renotify: true,
    tag,
    data: { ...(data.data || {}), url: clickUrl, tag, receivedAt: Date.now() },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      broadcastPushDebug({
        type: "PUSH_RECEIVED",
        legacyType: "push-received",
        payload: rawPayload,
        title,
        body: options.body,
        tag,
        url: clickUrl,
        receivedAt: new Date(options.data.receivedAt).toISOString(),
      }),
    ]),
  );
});

function defaultNotificationUrl(tag) {
  if (String(tag).startsWith("drive-upload")) return "/photos";
  if (String(tag).startsWith("reservation")) return "/app/reservation";
  if (String(tag).includes("dispatch") || String(tag).startsWith("return")) return "/app/dispatch";
  return "/app";
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/app";

  event.waitUntil(self.clients.openWindow(url));
});

function broadcastPushDebug(message) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage(message);
    }
  });
}
