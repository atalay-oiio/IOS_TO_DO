/* Glass Todo service worker — çevrimdışı çalışma + hatırlatma bildirimleri */
const CACHE = "glass-todo-v1";
const EXTRA = ["/manifest.webmanifest", "/icon", "/apple-icon", "/pwa/192", "/pwa/512", "/badge"];
const ASSET_RE = /(?:\/_next\/)?static\/[^"'\s)\\]+/g;

// HTML'in başvurduğu /_next/static dosyaları
const assetsOf = (html) => [
  ...new Set((html.match(ASSET_RE) || []).map((p) => (p.startsWith("/_next/") ? p : "/_next/" + p))),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        const res = await fetch("/", { cache: "no-store" });
        if (res.ok) {
          const html = await res.clone().text();
          await cache.put("/", res);
          await Promise.all([...assetsOf(html), ...EXTRA].map((u) => cache.add(u).catch(() => {})));
        }
      } catch {}
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) return;
  if (req.mode === "navigate") return event.respondWith(page(event, url));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(req));
  event.respondWith(staleWhileRevalidate(event));
});

// Sayfa: önce ağ (3 sn), gelmezse önbellek — çevrimdışıyken anında açılır
async function page(event, url) {
  const cache = await caches.open(CACHE);
  const isHome = url.pathname === "/";
  const network = fetch(event.request).then(async (res) => {
    if (res.ok && isHome) {
      await cache.put("/", res.clone());
      await prune(cache, res.clone());
    }
    return res;
  });
  event.waitUntil(network.catch(() => {}));
  const cached = await cache.match(isHome ? "/" : event.request);
  if (!cached) return network.catch(() => Response.error());
  return Promise.race([network.catch(() => cached), new Promise((r) => setTimeout(() => r(cached), 3000))]);
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(event.request);
  const network = fetch(event.request)
    .then((res) => {
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(network);
    return hit;
  }
  return (await network) || Response.error();
}

// Yeni sürüm yayınlanınca artık kullanılmayan eski dosyaları sil
async function prune(cache, res) {
  try {
    const keep = new Set(assetsOf(await res.text()).map((u) => u.split("?")[0]));
    if (keep.size < 3) return;
    for (const req of await cache.keys()) {
      const path = new URL(req.url).pathname;
      if (path.startsWith("/_next/static/") && !path.startsWith("/_next/static/media/") && !keep.has(path))
        await cache.delete(req);
    }
  } catch {}
}

// ---------- Bildirimler ----------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Hatırlatma", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(show(data));
});

function show(d) {
  const actions = [{ action: "done", title: "Tamamlandı" }];
  if (d.snooze) actions.push({ action: "snooze", title: "10 dk ertele" });
  return self.registration.showNotification(d.title || "Hatırlatma", {
    body: d.body || "",
    tag: d.tag || "glass-todo",
    renotify: true,
    icon: "/pwa/192",
    badge: "/badge",
    vibrate: [120, 60, 120],
    data: d,
    actions,
  });
}

self.addEventListener("notificationclick", (event) => {
  const d = event.notification.data || {};
  event.notification.close();
  if (event.action === "snooze") return event.waitUntil(snooze(d));
  const done = event.action === "done";
  const url = d.id ? `/?${done ? "done" : "task"}=${encodeURIComponent(d.id)}` : "/";
  event.waitUntil(focusOrOpen(url, d.id ? { type: done ? "done" : "open", id: d.id } : null));
});

async function focusOrOpen(url, message) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const client = windows.find((c) => new URL(c.url).origin === self.location.origin);
  if (client) {
    if (message) client.postMessage(message);
    return client.focus();
  }
  return self.clients.openWindow(url);
}

async function snooze(d) {
  const sub = await self.registration.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      at: Date.now() + 10 * 60 * 1000,
      title: d.title,
      body: "Ertelendi · " + (d.body || ""),
      tag: d.tag,
      id: d.id,
    }),
  }).catch(() => {});
}
