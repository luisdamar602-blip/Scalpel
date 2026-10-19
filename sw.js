// Service Worker mínimo para habilitar la instalación de la PWA
// No cachea nada agresivamente para evitar problemas con las actualizaciones

const CACHE_NAME = 'cirugia-general-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './scalpel.png'
];

// Instalación: precarga los assets básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('No se pudieron precargar algunos assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación: limpia cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia network-first para HTML, cache-first para el resto
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo manejar peticiones GET
  if (request.method !== 'GET') return;

  // Ignorar peticiones a otros dominios
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Para HTML: network-first (siempre trae lo último, con fallback a caché)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Para el resto: cache-first con actualización en segundo plano
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      });
    })
  );
});