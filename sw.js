/* Service worker da ProFix: guarda a "casca" do app para abrir sem internet.
 * Os DADOS não passam por aqui: ficam no aparelho (localStorage) e a fila de envio é do api.js.
 * Ao publicar versão nova, troque o número abaixo. */
var VERSAO = 'profix-casca-v9';
var CASCA = ['./', './index.html', './estilo.css', './config.js', './mock-dados.js', './api.js', './vista.js', './app.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(CASCA); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return; // API (script.google.com) nunca é cacheada
  // Rede primeiro (pega versão nova), cache se estiver sem internet.
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var copia = r.clone(); caches.open(VERSAO).then(function (c) { c.put(e.request, copia); }); }
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('./index.html'); }); }));
});
