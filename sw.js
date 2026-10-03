const CACHE_NAME = 'genesis-cache-v48';
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

// Instala o guardiÃ£o offline e salva os arquivos do seu app
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Ao ativar, apaga caches de versÃµes antigas e assume o controle na hora
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// EstratÃ©gia "internet primeiro, cache como reserva":
// com internet vocÃª sempre recebe a versÃ£o mais nova do app;
// sem internet, ele abre a Ãºltima versÃ£o salva.
self.addEventListener('fetch', event => {
  const req = event.request;

  // deixa passar direto o que nÃ£o Ã© leitura de arquivo do prÃ³prio app
  // (Ã© aqui que a sincronizaÃ§Ã£o com o Google passa sem interferÃªncia)
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  // "no-cache": sempre pergunta ao site se hÃ¡ versÃ£o nova (o GitHub Pages deixa o navegador guardar os
  // arquivos por 10 min; sem isso uma atualizaÃ§Ã£o demorava atÃ© 10 min para aparecer). Se nÃ£o mudou, volta rÃ¡pido.
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
