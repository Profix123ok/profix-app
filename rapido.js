/* ProFix 0.9.3 – velocidade: cópia no aparelho (IndexedDB) e assinatura dos dados (redesenhar só se mudou).
 * Nada de regra de negócio aqui. A cópia guardada NÃO leva segredos (o api.js tira senha/token antes de gravar). */
(function (raiz, fabrica) {
  var m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFixRapido = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var R = {};
  /** Persistência {ler(k), salvar(k, v), apagar(k)} em IndexedDB. null se o navegador não tiver IndexedDB. */
  R.criarPersistencia = function (nome, idb) {
    idb = idb || (typeof indexedDB !== 'undefined' ? indexedDB : null);
    if (!idb) return null;
    var dbP = null;
    function abrir() {
      if (dbP) return dbP;
      dbP = new Promise(function (ok, falha) {
        var r; try { r = idb.open(nome || 'profix-app', 1); } catch (e) { return falha(e); }
        r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains('copia')) r.result.createObjectStore('copia'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { falha(r.error || new Error('IndexedDB indisponível')); };
        r.onblocked = function () { falha(new Error('IndexedDB bloqueado')); };
      });
      dbP.catch(function () { dbP = null; });
      return dbP;
    }
    function tx(modo, fn) {
      return abrir().then(function (db) {
        return new Promise(function (ok, falha) {
          var t = db.transaction('copia', modo), st = t.objectStore('copia'), req = fn(st);
          t.oncomplete = function () { ok(req && req.result); };
          t.onerror = t.onabort = function () { falha(t.error || new Error('Falha no IndexedDB')); };
        });
      });
    }
    return {
      ler: function (k) { return tx('readonly', function (st) { return st.get(k); }).then(function (v) { return v === undefined ? null : v; }); },
      salvar: function (k, v) { return tx('readwrite', function (st) { return st.put(v, k); }); },
      apagar: function (k) { return tx('readwrite', function (st) { return st.delete(k); }); }
    };
  };
  /** FNV-1a 32 bits em hexadecimal (rápido, só para comparar "mudou ou não"). */
  R.hash = function (s) { var h = 0x811c9dc5; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
  /** Assinatura dos dados: tudo menos oportunidades (JSON) + resumo das oportunidades (linha, status, último contato, tamanho do histórico, @). */
  R.assinatura = function (d) {
    if (!d) return '';
    var n = {}; Object.keys(d).forEach(function (k) { if (k !== 'oportunidades' && k.charAt(0) !== '_') n[k] = d[k]; });
    var ops = Array.isArray(d.oportunidades) ? d.oportunidades : [], partes = [];
    for (var i = 0; i < ops.length; i++) { var o = ops[i] || {}; partes.push(o._row + ':' + (o.status || '') + ':' + (o.ultimoContato || '') + ':' + String(o.historico || '').length + ':' + (o.instagram || '') + ':' + (o.whatsapp || '') + ':' + (o.empresa || '').length); }
    return R.hash(JSON.stringify(n)) + '.' + ops.length + '.' + R.hash(partes.join('|'));
  };
  /** Id provisório de registro criado no aparelho (vale como idApp quando o CRM aceitar). */
  R.idProvisorio = function () { return 'app' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  return R;
});
