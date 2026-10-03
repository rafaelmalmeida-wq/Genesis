const CACHE_NAME = 'genesis-cache-v52';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './jarvis3d.js',
  './expositor3d.js',
  './secadora3d.js',
  './fabrica3d.js',
  './vendor/three.module.min.js',
  './img/primos-p.png',
  './img/primos-logo.jpg',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.svg',
  './favicon-32.png',
  './favicon-64.png'
];

// Instala o guardiÃƒÆ’Ã‚Â£o offline e salva os arquivos do seu app
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Ao ativar, apaga caches de versÃƒÆ’Ã‚Âµes antigas e assume o controle na hora
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// EstratÃƒÆ’Ã‚Â©gia "internet primeiro, cache como reserva":
// com internet vocÃƒÆ’Ã‚Âª sempre recebe a versÃƒÆ’Ã‚Â£o mais nova do app;
// sem internet, ele abre a ÃƒÆ’Ã‚Âºltima versÃƒÆ’Ã‚Â£o salva.
self.addEventListener('fetch', event => {
  const req = event.request;

  // deixa passar direto o que nÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© leitura de arquivo do prÃƒÆ’Ã‚Â³prio app
  // (ÃƒÆ’Ã‚Â© aqui que a sincronizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com o Google passa sem interferÃƒÆ’Ã‚Âªncia)
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  // "no-cache": sempre pergunta ao site se hÃƒÆ’Ã‚Â¡ versÃƒÆ’Ã‚Â£o nova (o GitHub Pages deixa o navegador guardar os
  // arquivos por 10 min; sem isso uma atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o demorava atÃƒÆ’Ã‚Â© 10 min para aparecer). Se nÃƒÆ’Ã‚Â£o mudou, volta rÃƒÆ’Ã‚Â¡pido.
  const pedido = req.mode === 'navigate' ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(req, { cache: 'no-cache' });
  event.respondWith(
    fetch(pedido)
      .then(res => {
        const copia = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
