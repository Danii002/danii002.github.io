// Sube este número cada vez que cambies la lista ASSETS.
const CACHE_NAME = 'menu-semanal-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './kalam-700.woff2',
  './nunito.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: responde al instante desde la caché (funciona sin conexión)
// y, si hay internet, descarga la versión nueva en segundo plano para el siguiente arranque.
// Así, si actualizas index.html en GitHub, la app instalada lo recoge sola.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const network = fetch(req)
          .then((response) => {
            if (response && response.ok) cache.put(req, response.clone());
            return response;
          })
          .catch(() => {
            if (cached) return cached;
            if (req.mode === 'navigate') return cache.match('./index.html').then((r) => r || Response.error());
            return Response.error();
          });
        if (cached) {
          event.waitUntil(network.catch(() => {}));
          return cached;
        }
        return network;
      })
    )
  );
});
