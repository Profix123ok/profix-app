/* ProFix – perguntas na própria página (substitui confirm/alert/prompt nativos, que o celular pode bloquear).
   Tudo devolve Promise. Um modal por vez: se outro for pedido enquanto um está aberto, entra na fila.
   ProFixPergunta.confirmar(texto, {titulo, sim, nao, perigo}) -> Promise<boolean>
   ProFixPergunta.avisar(texto, {titulo, ok})                  -> Promise<void>
   ProFixPergunta.pedirTexto(texto, {titulo, rotulo, valor, exigir, somenteLeitura, sim, nao, perigo}) -> Promise<string|null>
   Com `exigir` (ex.: 'APAGAR'), o botão de confirmar só liga quando o texto digitado é exatamente esse. */
(function (raiz, fabrica) {
  var M = fabrica(); if (typeof module === 'object' && module.exports) module.exports = M; else raiz.ProFixPergunta = M;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var fila = Promise.resolve();
  function el(tag, attrs, txt) { var x = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { x.setAttribute(k, attrs[k]); }); if (txt != null) x.textContent = txt; return x; }
  function dialogo() {
    var d = document.getElementById('pergunta');
    if (!d) { d = el('dialog', { id: 'pergunta', 'aria-labelledby': 'pgTitulo', 'aria-describedby': 'pgTexto' }); document.body.appendChild(d); }
    return d;
  }
  /** Monta e abre o modal; resolve com {ok, valor} quando fecha (botão, Esc ou toque fora não contam como sim). */
  function abrir(o) {
    var d = dialogo(); d.innerHTML = '';
    var f = el('form', { method: 'dialog', id: 'fPergunta', 'class': 'pergunta' });
    f.appendChild(el('h2', { id: 'pgTitulo' }, o.titulo || 'Confirmar'));
    f.appendChild(el('p', { id: 'pgTexto' }, o.texto || ''));
    var campo = null;
    if (o.campo) {
      if (o.rotulo) { var l = el('label', { 'for': 'pgCampo' }, o.rotulo); f.appendChild(l); }
      campo = el('input', { id: 'pgCampo', autocomplete: 'off', spellcheck: 'false' });
      if (o.exigir) campo.setAttribute('autocapitalize', 'characters');
      if (o.somenteLeitura) campo.readOnly = true;
      campo.value = o.valor || ''; f.appendChild(campo);
    }
    var bt = el('div', { 'class': 'grandes' });
    var sim = el('button', { id: 'pgSim', value: 'ok', 'class': 'btn' + (o.perigo ? ' perigo' : ''), type: 'submit' }, o.sim || 'OK');
    bt.appendChild(sim);
    if (o.nao !== false) { var nao = el('button', { id: 'pgNao', value: 'cancelar', 'class': 'btn sec', type: 'submit', formnovalidate: '' }, o.nao || 'Cancelar'); bt.appendChild(nao); }
    f.appendChild(bt); d.appendChild(f);
    var confere = function () { if (o.exigir) sim.disabled = !campo || campo.value.trim() !== o.exigir; };
    if (campo) campo.addEventListener('input', confere); confere();
    return new Promise(function (res) {
      d.returnValue = '';
      d.onclose = function () { d.onclose = null; var ok = d.returnValue === 'ok' && !(o.exigir && (!campo || campo.value.trim() !== o.exigir)); res({ ok: ok, valor: campo ? campo.value : '' }); };
      d.onclick = function (ev) { if (ev.target === d) d.close('cancelar'); };
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
      if (campo) { campo.focus(); if (o.somenteLeitura) campo.select(); } else (o.nao !== false && o.focoNao ? d.querySelector('#pgNao') : sim).focus();
    });
  }
  function emFila(o) { var p = fila.then(function () { return abrir(o); }); fila = p.then(function () {}, function () {}); return p; }
  return {
    confirmar: function (texto, op) { op = op || {}; return emFila({ titulo: op.titulo || 'Confirmar', texto: texto, sim: op.sim || 'Sim', nao: op.nao || 'Cancelar', perigo: !!op.perigo, focoNao: !!op.perigo }).then(function (r) { return r.ok; }); },
    avisar: function (texto, op) { op = op || {}; return emFila({ titulo: op.titulo || 'Aviso', texto: texto, sim: op.ok || 'OK', nao: false }).then(function () {}); },
    pedirTexto: function (texto, op) { op = op || {}; return emFila({ titulo: op.titulo || 'Digite', texto: texto, campo: true, rotulo: op.rotulo, valor: op.valor, exigir: op.exigir, somenteLeitura: !!op.somenteLeitura, sim: op.sim || 'OK', nao: op.nao, perigo: !!op.perigo }).then(function (r) { return r.ok ? r.valor : null; }); }
  };
});
