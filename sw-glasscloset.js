// Glass Closet — image cache
// Caches item thumbnail images (png/jpg/webp) after their first load, so
// switching categories or revisiting the page serves them instantly from
// disk instead of re-downloading. It never touches or alters the images
// themselves — same files, just faster on repeat use.

const CACHE_NAME = 'glass-closet-images-v1';
const IMAGE_EXT = /\.(png|jpg|jpeg|webp|gif)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only intervene for same-origin image requests — everything else
  // (HTML, JS, CSS, external placeholders) goes straight to the network
  // as normal so the page always stays up to date.
  if (url.origin !== self.location.origin || !IMAGE_EXT.test(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        return cached || Response.error();
      }
    })
  );
});
