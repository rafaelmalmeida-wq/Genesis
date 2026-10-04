const CACHE_NAME = 'genesis-cache-v65';
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
        // só guarda resposta boa: um erro 404/500 passageiro não pode apagar a cópia que funciona (auditoria do Codex, achado 9)
        if (res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
          return res;
        }
        return reserva(req).then(c => c || res);
      })
      .catch(() => reserva(req))
  );
});

// Reserva sem internet: a cópia exata; numa navegação com endereço diferente (ex.: ./?abrir=diario, vindo da notificação),
// a página principal guardada — o app lê o endereço e abre a tela certa (auditoria do Codex, achado 10).
function reserva(req) {
  return caches.match(req).then(c => c || (req.mode === 'navigate'
    ? caches.match(req, { ignoreSearch: true }).then(c2 => c2 || caches.match('./index.html'))
    : undefined));
}

// NOTIFICAÇÕES do J.A.R.V.I.S. (fase 8): chegam cifradas da nuvem do cofre (agentes/dia.mjs) e aparecem na tela.
// Toda mensagem PRECISA virar notificação (o iPhone corta a permissão de quem recebe e não mostra).
self.addEventListener('push', event => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch (e) { m = { corpo: event.data ? event.data.text() : '' }; }
  const titulo = m.titulo || 'J.A.R.V.I.S.';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: m.corpo || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: m.tag || undefined,
    renotify: !!m.tag,
    data: { url: m.url || './?abrir=diario' }
  }));
});

// Tocar na notificação: abre (ou traz para frente) o app já na tela certa
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const alvo = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(janelas => {
    for (const j of janelas) {
      if (j.url.startsWith(self.registration.scope) && 'focus' in j) { j.postMessage({ tipo: 'abrir', url: alvo }); return j.focus(); }
    }
    return self.clients.openWindow(alvo);
  }));
});
