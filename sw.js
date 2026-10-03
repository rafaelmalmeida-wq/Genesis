const CACHE_NAME = 'genesis-cache-v49';
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

// Instala o guardiÃƒÂ£o offline e salva os arquivos do seu app
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Ao ativar, apaga caches de versÃƒÂµes antigas e assume o controle na hora
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// EstratÃƒÂ©gia "internet primeiro, cache como reserva":
// com internet vocÃƒÂª sempre recebe a versÃƒÂ£o mais nova do app;
// sem internet, ele abre a ÃƒÂºltima versÃƒÂ£o salva.
self.addEventListener('fetch', event => {
  const req = event.request;

  // deixa passar direto o que nÃƒÂ£o ÃƒÂ© leitura de arquivo do prÃƒÂ³prio app
  // (ÃƒÂ© aqui que a sincronizaÃƒÂ§ÃƒÂ£o com o Google passa sem interferÃƒÂªncia)
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  // "no-cache": sempre pergunta ao site se hÃƒÂ¡ versÃƒÂ£o nova (o GitHub Pages deixa o navegador guardar os
  // arquivos por 10 min; sem isso uma atualizaÃƒÂ§ÃƒÂ£o demorava atÃƒÂ© 10 min para aparecer). Se nÃƒÂ£o mudou, volta rÃƒÂ¡pido.
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
