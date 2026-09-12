/* Service worker: deixa o app abrir sem internet.
   Ao subir uma versão nova dos arquivos, mude o número do CACHE abaixo. */

const CACHE = 'treino-v4.0';
const ARQUIVOS = [
  './',
  'index.html',
  'styles.css?v=4.0',
  'seed.js?v=4.0',
  'db.js?v=4.0',
  'app.js?v=4.0',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* rede primeiro, cache como reserva — assim uma atualização no GitHub
   chega assim que você abrir o app com internet */
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    fetch(ev.request)
      .then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(ev.request, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(ev.request)
        .then(r => r || caches.match(ev.request, { ignoreSearch: true }))
        .then(r => r || caches.match('index.html')))
  );
});
