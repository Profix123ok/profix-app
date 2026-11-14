/* ProFix – Orçamento rápido (v0.9.0).
 * Conta do orçamento de uma tela só: itens da tabela oficial ou livres (descrição, qtd, valor), desconto por item e no total (R$ ou %),
 * total nunca negativo. Guarda no campo "Itens do orçamento" (itensOrc) que o CRM já aceita, em texto legível:
 *   "2x Formatação com backup (R$ 147,90 cada; desconto 10%) – R$ 266,22"
 * Cada linha termina em "– R$ valor líquido", o mesmo formato que o crm-v3 (osClassicaComoMulti_) já sabe ler.
 * Nada aqui grava ou envia nada: só conta, formata e lê de volta.
 */
(function (raiz, fabrica) {
  var m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFixOrc = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LIM = { itens: 60, valor: 1000000, qtd: 9999 };
  function c2(n) { return Math.round((Number(n) || 0) * 100 + (n >= 0 ? 1e-9 : -1e-9)) / 100; }
  function txt(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
  /** "1.234,56", "R$ 150", "150.5", "10%" -> número; vazio -> null; inválido -> NaN. */
  function numBR(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var s = String(v == null ? '' : v).replace(/R\$|%|\s/gi, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
    return Number(s);
  }
  function brl(n) { var v = c2(n), neg = v < 0; v = Math.abs(v); var p = v.toFixed(2).split('.'); return (neg ? '−' : '') + 'R$ ' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1]; }
  function numTxt(n) { return String(c2(n)).replace('.', ','); }
  function dataBR(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }
  function isoDeBR(br) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function modo(m) { return String(m || '').trim() === '%' ? '%' : 'R$'; }

  /** Item vazio (linha livre). */
  function itemVazio(p) { return Object.assign({ tipo: 'serviço', descricao: '', qtd: '1', valor: '', descModo: '%', desc: '', origem: '', validoAte: '' }, p || {}); }
  /** Item a partir de uma linha da tabela de preços (catalogoOS / tabela oficial). Sem valor = "Sob orçamento": valor fica para o Pedro digitar. */
  function itemDoCatalogo(c) {
    var v = numBR(c && c.valor), n = String((c && c.categoria) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return itemVazio({ tipo: n === 'peca' ? 'peça' : 'serviço', descricao: txt(c && c.descricao), valor: v != null && v > 0 ? numTxt(v) : '', origem: 'Tabela de preços' + (c && c.id ? ' ' + c.id : '') });
  }
  /** Item a partir de uma cotação VÁLIDA da OS. v0.9.1: o custo posto fica só como referência interna (campo custo, nunca vai para o cliente); o preço de venda o Pedro digita. Sem cotação válida não se inventa valor nem data. */
  function itemDaCotacao(c, hoje) {
    if (!cotacaoUsavel(c, hoje)) return null;
    var nome = txt(c.peca || c.componente) + (txt(c.marca || c.marcaModelo) ? ' ' + txt(c.marca || c.marcaModelo) : '');
    return itemVazio({ tipo: 'peça', descricao: nome, qtd: String(Number(c.qtd) > 0 ? c.qtd : 1), valor: '', custo: numTxt(c.custoPosto), origem: 'Cotação ' + txt(c.id), validoAte: String(c.validade).slice(0, 10) });
  }
  function cotacaoUsavel(c, hoje) {
    return !!c && c.status !== 'Descartado' && c.vencida !== true && /^\d{4}-\d{2}-\d{2}/.test(String(c.validade || '')) && String(c.validade).slice(0, 10) >= String(hoje || '') && Number(c.custoPosto) > 0;
  }

  /**
   * Calcula tudo. itens: [{descricao, qtd, valor, descModo, desc}], total: {modo, valor}.
   * Ordem: bruto da linha (qtd × valor) -> desconto do item -> soma -> desconto no total (sobre a soma já com os descontos dos itens).
   * Devolve erros por linha em vez de lançar (a tela mostra enquanto digita). Total nunca negativo.
   */
  function calcular(itens, total) {
    var linhas = [], erros = [], soma = 0, bruto = 0, descItens = 0;
    (itens || []).forEach(function (it, i) {
      var d = txt(it.descricao), q = numBR(it.qtd), v = numBR(it.valor), dm = modo(it.descModo), dv = numBR(it.desc), er = '';
      var vazia = !d && (v == null) && (dv == null);
      if (vazia) { linhas.push({ i: i, vazia: true, bruto: 0, desconto: 0, liquido: 0 }); return; }
      if (q == null) q = 1;
      if (!d) er = 'Informe a descrição.';
      else if (isNaN(q) || q <= 0 || q > LIM.qtd) er = 'Quantidade inválida.';
      else if (v == null) er = 'Informe o valor (R$).';
      else if (isNaN(v) || v < 0 || v > LIM.valor) er = 'Valor inválido.';
      else if (dv != null && (isNaN(dv) || dv < 0)) er = 'Desconto inválido.';
      else if (dv != null && dm === '%' && dv > 100) er = 'Desconto acima de 100%.';
      var b = er ? 0 : c2(q * v), ds = 0;
      if (!er && dv) { ds = c2(dm === '%' ? b * dv / 100 : dv); if (ds > b + 0.004) { er = 'Desconto maior que o valor do item.'; ds = 0; } }
      if (er) { erros.push({ i: i, msg: er }); linhas.push({ i: i, erro: er, bruto: 0, desconto: 0, liquido: 0 }); return; }
      var l = c2(b - ds);
      bruto = c2(bruto + b); descItens = c2(descItens + ds); soma = c2(soma + l);
      linhas.push({ i: i, tipo: it.tipo || 'serviço', descricao: d, qtd: q, valor: c2(v), descModo: dm, desc: dv || 0, bruto: b, desconto: ds, liquido: l, origem: txt(it.origem), validoAte: String(it.validoAte || '').slice(0, 10) });
    });
    var tm = modo(total && total.modo), tv = numBR(total && total.valor), dt = 0, erroTotal = '';
    if (tv != null) {
      if (isNaN(tv) || tv < 0) erroTotal = 'Desconto no total inválido.';
      else if (tm === '%' && tv > 100) erroTotal = 'Desconto no total acima de 100%.';
      else { dt = c2(tm === '%' ? soma * tv / 100 : tv); if (dt > soma + 0.004) { erroTotal = 'Desconto no total maior que o valor dos itens.'; dt = 0; } }
    }
    var validos = linhas.filter(function (l) { return !l.vazia && !l.erro; });
    if (!validos.length && !erros.length) erros.push({ i: -1, msg: 'Adicione pelo menos um item.' });
    if (erroTotal) erros.push({ i: 'total', msg: erroTotal });
    return { linhas: linhas, validos: validos, bruto: bruto, descontoItens: descItens, subtotal: soma, descontoTotal: dt, descontoTotalModo: tm, descontoTotalValor: tv || 0,
      descontos: c2(descItens + dt), total: Math.max(0, c2(soma - dt)), erros: erros, ok: !erros.length && validos.length > 0 };
  }

  function textoDesconto(m, v, valorRS) { return m === '%' ? numTxt(v) + '%' : brl(valorRS); }
  /** Linha legível (e que o CRM já sabe ler: termina em "– R$ líquido"). */
  function linhaTexto(l) {
    var det = [];
    if (l.qtd !== 1 || l.desconto) det.push(brl(l.valor) + (l.qtd !== 1 ? ' cada' : ''));
    if (l.desconto) det.push('desconto ' + textoDesconto(l.descModo, l.desc, l.desconto));
    return (l.qtd !== 1 ? numTxt(l.qtd) + 'x ' : '') + l.descricao + (l.validoAte ? ' – O valor da peça vale até ' + dataBR(l.validoAte) : '') +
      (det.length ? ' (' + det.join('; ') + ')' : '') + ' – ' + brl(l.liquido);
  }
  /** Texto do campo itensOrc (uma linha por item + linha do desconto no total, se houver). */
  function paraItensOrc(calc) {
    var t = calc.validos.map(linhaTexto);
    if (calc.descontoTotal) t.push('Desconto no total' + (calc.descontoTotalModo === '%' ? ' (' + numTxt(calc.descontoTotalValor) + '%)' : '') + ': −' + brl(calc.descontoTotal).replace('−', ''));
    return t.join('\n');
  }
  /** Lê de volta o itensOrc gravado (formato acima). Linhas antigas/livres viram itens só com descrição (valor para conferir). */
  function lerItensOrc(texto, orcamento) {
    var itens = [], total = { modo: '%', valor: '' }, livres = [];
    String(texto || '').split('\n').map(function (s) { return s.replace(/^[\s•*·-]+/, '').trim(); }).filter(String).forEach(function (s) {
      var mt = /^Desconto no total(?: \(([\d.,]+)%\))?: [−-]\s?R\$\s*([\d.,]+)$/.exec(s);
      if (mt) { total = mt[1] ? { modo: '%', valor: mt[1] } : { modo: 'R$', valor: mt[2] }; return; }
      var m = /^(?:([\d.,]+)x )?(.*?)(?: \(([^()]*)\))? [–-] R\$\s*([\d.,]+)$/.exec(s);
      if (!m) { livres.push(s); return; }
      var q = m[1] ? numBR(m[1]) : 1, desc = m[2], det = m[3] || '', liq = numBR(m[4]), validoAte = '';
      var mv = / – O valor da peça vale até (\d{2}\/\d{2}\/\d{4})$/.exec(desc); if (mv) { validoAte = isoDeBR(mv[1]); desc = desc.slice(0, mv.index); }
      var mu = /R\$\s*([\d.,]+)/.exec(det.split(';')[0] || ''), md = /desconto (?:([\d.,]+)%|R\$\s*([\d.,]+))/.exec(det);
      var unit = mu ? numBR(mu[1]) : c2(liq / (q || 1));
      itens.push(itemVazio({ tipo: /pe[çc]a/i.test(desc) || validoAte ? 'peça' : 'serviço', descricao: desc, qtd: numTxt(q), valor: numTxt(unit),
        descModo: md && md[1] ? '%' : 'R$', desc: md ? (md[1] || md[2]) : '', validoAte: validoAte }));
    });
    if (livres.length) {
      var v = numBR(orcamento), resto = itens.length ? null : (v != null && v > 0 ? numTxt(v) : '');
      itens.push(itemVazio({ descricao: livres.join('; '), valor: resto == null ? '' : resto }));
    } else if (!itens.length) {
      var o = numBR(orcamento); if (o != null && o > 0) itens.push(itemVazio({ descricao: 'Serviço', valor: numTxt(o) }));
    }
    return { itens: itens, total: total };
  }
  /** Texto do WhatsApp (o Pedro toca para abrir; nada é enviado sozinho). */
  function textoWhats(p) {
    var calc = p.calc, c = p.cliente || {}, nome = String(c.nome || '').split(' ')[0];
    var t = 'Olá' + (nome ? ', ' + nome : '') + '! Orçamento ProFix Computadores' + (p.num ? ' · ' + p.num : '') +
      (p.equipamento ? '\nEquipamento: ' + p.equipamento : '') + (p.diagnostico ? '\nDiagnóstico: ' + p.diagnostico : '') + '\n\nItens:\n' +
      calc.validos.map(function (l) { return '• ' + (l.qtd !== 1 ? numTxt(l.qtd) + 'x ' : '') + l.descricao + ' – ' + brl(l.liquido) + (l.desconto ? ' (desconto ' + textoDesconto(l.descModo, l.desc, l.desconto) + ')' : ''); }).join('\n');
    if (calc.descontos) t += '\n\nSubtotal: ' + brl(calc.bruto) + '\nDescontos: −' + brl(calc.descontos).replace('−', '');
    t += '\n*Total: ' + brl(calc.total) + '*';
    calc.validos.filter(function (l) { return l.validoAte; }).forEach(function (l) { t += '\nO valor da peça (' + l.descricao + ') vale até ' + dataBR(l.validoAte) + '.'; });
    if (p.validade) t += '\nValidade do orçamento: até ' + dataBR(p.validade) + (p.dias ? ' (' + p.dias + ' dias).' : '.');
    if (p.previsao) t += '\nPrevisão de entrega: ' + dataBR(p.previsao) + '.';
    if (p.link) t += '\nAcompanhe e responda pelo link: ' + p.link;
    return t + '\nPodemos seguir com o serviço?';
  }
  /** Peças com cotação que vence antes da validade do orçamento (só aviso). */
  function pecasVencendoAntes(calc, validade) { return calc.validos.filter(function (l) { return l.validoAte && validade && l.validoAte < validade; }); }
  return { LIM: LIM, numBR: numBR, brl: brl, numTxt: numTxt, dataBR: dataBR, itemVazio: itemVazio, itemDoCatalogo: itemDoCatalogo, itemDaCotacao: itemDaCotacao, cotacaoUsavel: cotacaoUsavel,
    calcular: calcular, linhaTexto: linhaTexto, paraItensOrc: paraItensOrc, lerItensOrc: lerItensOrc, textoWhats: textoWhats, pecasVencendoAntes: pecasVencendoAntes };
});
