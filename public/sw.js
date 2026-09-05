const MASSAR_CACHE_PREFIX = "massar-pwa-";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(MASSAR_CACHE_PREFIX))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

