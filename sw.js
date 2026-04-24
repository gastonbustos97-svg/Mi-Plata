// ── Mi Plata · Service Worker ──────────────────────────────
// Cambiá el número de versión cada vez que subas cambios
const CACHE = 'mi-plata-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// INSTALL — precachear assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  // Activar inmediatamente sin esperar a que cierren las tabs viejas
  self.skipWaiting();
});

// ACTIVATE — borrar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// FETCH — Network first para index.html, cache first para el resto
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // index.html → siempre intentar red primero para tener la versión nueva
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Guardar la versión nueva en cache
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // sin red → usar cache
    );
    return;
  }

  // Resto de assets → cache first (íconos, fonts, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});

// Notificar a todas las tabs cuando hay una versión nueva disponible
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
