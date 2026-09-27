// Sube este número cada vez que cambies la lista ASSETS o sustituyas iconos/fuentes.
const CACHE_NAME = 'menu-semanal-v4';
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
  // cache: 'reload' → descarga del servidor, sin usar la caché HTTP del navegador (GitHub Pages guarda 10 min).
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Iconos y fuentes no cambian: se sirven siempre desde la caché, sin volver a descargarlos.
const STATIC = /\.(png|woff2)$/;

// El resto (index.html, manifest): responde al instante desde la caché (funciona sin conexión)
// y, solo mientras la app está abierta y hay internet, descarga la versión nueva en segundo plano
// para el siguiente arranque (~100 KB por apertura). Con la app cerrada no hace nada.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (STATIC.test(url.pathname)) {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        // cache: 'no-cache' → siempre pregunta al servidor si hay versión nueva (si no la hay, no descarga nada).
        const network = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
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
