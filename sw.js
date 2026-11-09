/* Service worker da ProFix: guarda a "casca" do app para abrir sem internet.
 * Os DADOS não passam por aqui: ficam no aparelho (localStorage) e a fila de envio é do api.js.
 * Ao publicar versão nova, troque o número abaixo. */
var VERSAO = 'profix-casca-v26';
var CASCA = ['./', './index.html', './estilo.css', './config.js', './api.js', './vista.js', './os_multi.js', './diferenciais.js', './pergunta.js', './app.js', './cadastro/index.html',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(CASCA.map(function (p) { return new Request(p, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('profix-casca-') === 0 && k !== VERSAO; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
// Só o demo pede este único arquivo público, inclusive no primeiro uso sem controller.
self.addEventListener('message', function (e) {
  if (e.data !== 'guardar-demonstracao') return;
  e.waitUntil(caches.open(VERSAO).then(function (c) {
    return c.match('./mock-dados.js').then(function (r) { if (!r) return c.add('./mock-dados.js'); });
  }).catch(function () {}));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return; // API nunca é cacheada
  // Casca versionada: primeiro o cache completo da instalação. O navegador continua
  // verificando sw.js; uma nova versão instala TODOS os arquivos antes de assumir.
  // Só URLs conhecidas: não cachear dados nem devolver HTML para JS/imagem ausente.
  var base = new URL('./', self.location.href), caminho = u.pathname;
  var item = CASCA.filter(function (p) { return new URL(p, base).pathname === caminho; })[0];
  var demonstracao = caminho === new URL('./mock-dados.js', base).pathname;
  if (!item && !demonstracao) return;
  e.respondWith(caches.open(VERSAO).then(function (c) {
    return c.match(new URL(item || './mock-dados.js', base).href).then(function (r) {
      if (r) return r;
      return fetch(e.request).then(function (res) {
        // Demo fica offline após o primeiro uso, mas não entra no download do uso real.
        if (demonstracao && res.ok) { var copia = res.clone(); e.waitUntil(c.put(new URL('./mock-dados.js', base).href, copia)); }
        return res;
      });
    });
  }));
});
