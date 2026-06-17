// WC Predictor SW - offline cache + push notifications
const CACHE = "wcp-v3";
const PRECACHE = ["/", "/dashboard", "/icons/icon.svg", "/manifest.webmanifest"];
const NAV_TIMEOUT_MS = 3500;  // navigate: po 3.5s rezygnuj z sieci, pokaż cache
const BG_TIMEOUT_MS = 5000;   // background refresh: po 5s anuluj fetch żeby nie wisiał

// Pomocnicza funkcja - fetch z timeout via AbortController
function fetchWithTimeout(req, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(req, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => null)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/data/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) {
          // Mamy w cache - oddaj NATYCHMIAST, refresh w tle z timeoutem
          fetchWithTimeout(req, BG_TIMEOUT_MS).then((res) => {
            if (res.ok) cache.put(req, res.clone());
          }).catch(() => {});
          return cached;
        }
        // Brak w cache - musi czekać na sieć (z timeoutem)
        return fetchWithTimeout(req, BG_TIMEOUT_MS).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => Response.error());
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(req, NAV_TIMEOUT_MS);
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        } catch {
          // Sieć padła lub trwa zbyt długo - pokaż cache lub fallback /dashboard
          const fallback = await caches.match(req);
          if (fallback) return fallback;
          const dashCache = await caches.match("/dashboard");
          if (dashCache) return dashCache;
          return Response.error();
        }
      })()
    );
  }
});

// Push notifications
self.addEventListener("push", (e) => {
  let data = { title: "WC Predictor", body: "Nowe powiadomienie" };
  try { if (e.data) data = e.data.json(); } catch {}
  const opts = {
    body: data.body,
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    data: { url: data.url || "/dashboard" },
    vibrate: [200, 100, 200],
  };
  e.waitUntil(self.registration.showNotification(data.title, opts));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/dashboard";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) { client.navigate(url); return client.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});
