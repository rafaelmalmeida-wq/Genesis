const CACHE_NAME = 'genesis-cache-v13';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './jarvis3d.js',
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

// Instala o guardião offline e salva os arquivos do seu app
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Ao ativar, apaga caches de versões antigas e assume o controle na hora
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Estratégia "internet primeiro, cache como reserva":
// com internet você sempre recebe a versão mais nova do app;
// sem internet, ele abre a última versão salva.
self.addEventListener('fetch', event => {
  const req = event.request;

  // deixa passar direto o que não é leitura de arquivo do próprio app
  // (é aqui que a sincronização com o Google passa sem interferência)
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  // "no-cache": sempre pergunta ao site se há versão nova (o GitHub Pages deixa o navegador guardar os
  // arquivos por 10 min; sem isso uma atualização demorava até 10 min para aparecer). Se não mudou, volta rápido.
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
