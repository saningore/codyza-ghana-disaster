const SHELL = "ghanadisaster-shell-v1";
const DATA = "ghanadisaster-data-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(["/", "/sources", "/about", "/helplines", "/manifest.webmanifest"].map(async (path) => {
      try {
        await cache.add(path);
      } catch {
        // A missing shell page should not block the worker.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== SHELL && key !== DATA).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (event.request.mode !== "navigate") return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      const cache = await caches.open(SHELL);
      cache.put(event.request, response.clone());
      return response;
    } catch {
      const cached = await caches.match(event.request);
      return cached || caches.match("/") || Response.error();
    }
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "cache-report" && data.report && typeof data.report === "object") {
    event.waitUntil(caches.open(DATA).then((cache) => cache.put(
      new Request("/offline-hazard-report"),
      new Response(JSON.stringify(data.report), { headers: { "Content-Type": "application/json" } }),
    )));
  }
  if (data.type === "watch" && Array.isArray(data.locations)) {
    const seen = Array.isArray(data.seen) ? data.seen.filter((item) => typeof item === "string").slice(-200) : [];
    event.waitUntil(writeValue("watch", { locations: data.locations.slice(0, 5), seen }));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = typeof event.notification.data?.url === "string" ? event.notification.data.url : "/";
  event.waitUntil(self.clients.openWindow(target));
});

async function readValue(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("kv", "readonly").objectStore("kv").get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeValue(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("kv", "readwrite");
    transaction.objectStore("kv").put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ghanadisaster", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("kv")) request.result.createObjectStore("kv");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
