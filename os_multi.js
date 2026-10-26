/* ProFix – OS com vários equipamentos (v0.6.0).
 * Cópia FIEL da conta do crm-v3 (Code.gs: montarOSMulti_, calcularBlocoOS_, whatsOrcamentoOS_, avaliarCondicaoOS_).
 * O servidor continua sendo a fonte da verdade: isto serve só para mostrar os totais enquanto digita,
 * para o modo demonstração e como prévia sem internet. Nada aqui grava ou envia nada.
 */
(function (raiz, fabrica) {
  var m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFixOSM = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TIPOS = ['peça', 'serviço', 'mão de obra', 'adicional', 'desconto'];
  var LIM = { equip: 20, itens: 100, valor: 1000000, qtd: 9999 };
  var LIMITE_MEDIANA = 0.11; // igual a CONDICAO_LIMITE_MEDIANA do crm-v3
  var PROFIX = { nome: 'ProFix Computadores', whatsapp: '(15) 98112-8309', instagram: '@profixcomputadores' };
  // Atalhos iguais aos do painel do CRM (adicionais/descontos).
  var ATALHOS = [
    { rot: 'Pacote −10%', tipo: 'desconto', modo: '%', valorUnit: 10, descricao: 'Pacote 2+ serviços' },
    { rot: 'Contrato −10%', tipo: 'desconto', modo: '%', valorUnit: 10, descricao: 'Empresa com contrato mensal' },
    { rot: 'PIX −5%', tipo: 'desconto', modo: '%', valorUnit: 5, descricao: 'Pagamento no PIX' },
    { rot: 'Urgência +30%', tipo: 'adicional', modo: '%', valorUnit: 30, descricao: 'Urgência / mesmo dia' },
    { rot: 'Fora do horário +50%', tipo: 'adicional', modo: '%', valorUnit: 50, descricao: 'Fora do horário / sábado' }
  ];
  // Catálogo do MODO DEMONSTRAÇÃO (o real vem do catalogoOS do servidor): as 21 sugestões de precos_mercado_sorocaba.csv.
  var CATALOGO_DEMO = [{"id": "CAT0001", "categoria": "Serviço", "descricao": "Diagnóstico/orçamento (bancada)", "valor": 114.9}, {"id": "CAT0002", "categoria": "Serviço", "descricao": "Formatação com backup", "valor": 190.0}, {"id": "CAT0003", "categoria": "Serviço", "descricao": "Formatação sem backup", "valor": 114.9}, {"id": "CAT0004", "categoria": "Serviço", "descricao": "Instalação de programas (por programa)", "valor": 56.0}, {"id": "CAT0005", "categoria": "Serviço", "descricao": "Remoção de vírus", "valor": 150.0}, {"id": "CAT0006", "categoria": "Serviço", "descricao": "Limpeza interna + pasta térmica (desktop)", "valor": 169.9}, {"id": "CAT0007", "categoria": "Serviço", "descricao": "Limpeza interna + pasta térmica (notebook)", "valor": 249.9}, {"id": "CAT0008", "categoria": "Mão de obra", "descricao": "Troca de tela de notebook", "valor": 135.0}, {"id": "CAT0009", "categoria": "Mão de obra", "descricao": "Troca de teclado de notebook", "valor": 114.9}, {"id": "CAT0010", "categoria": "Mão de obra", "descricao": "Troca de HD/SSD + clonagem", "valor": 204.9}, {"id": "CAT0011", "categoria": "Mão de obra", "descricao": "Upgrade de memória (instalação)", "valor": 124.9}, {"id": "CAT0012", "categoria": "Mão de obra", "descricao": "Montagem de PC (peças do cliente)", "valor": 389.9}, {"id": "CAT0013", "categoria": "Mão de obra", "descricao": "Reparo/troca de conector DC (notebook)", "valor": 315.0}, {"id": "CAT0014", "categoria": "Serviço", "descricao": "Recuperação de dados (lógica/física)", "valor": 1829.9}, {"id": "CAT0015", "categoria": "Serviço", "descricao": "Configuração de rede/roteador", "valor": 129.9}, {"id": "CAT0016", "categoria": "Serviço", "descricao": "Instalação/configuração de impressora", "valor": 159.9}, {"id": "CAT0017", "categoria": "Serviço", "descricao": "Visita técnica / atendimento no local (empresa)", "valor": 174.9}, {"id": "CAT0018", "categoria": "Mão de obra", "descricao": "Hora técnica", "valor": 135.0}, {"id": "CAT0019", "categoria": "Serviço", "descricao": "Manutenção preventiva mensal empresa (por máquina/mês)", "valor": 100.0}, {"id": "CAT0020", "categoria": "Serviço", "descricao": "Configuração de PC novo (out-of-box)", "valor": 100.0}, {"id": "CAT0021", "categoria": "Serviço", "descricao": "Backup/migração de dados (até 200GB)", "valor": 225.0}];

  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function centavos(n) { return Math.round((Number(n) || 0) * 100 + (n >= 0 ? 1e-9 : -1e-9)) / 100; }
  function numero(v, nome, max) {
    if (v === '' || v === null || v === undefined) return 0;
    var n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, function (p, i, s) { return s.indexOf(',') >= 0 ? '' : p; }).replace(',', '.'));
    if (isNaN(n) || !isFinite(n) || n < 0 || n > max) throw new Error(nome + ' inválido.');
    return n;
  }
  function tipoItem(t) { var n = norm(t), ok = TIPOS.filter(function (x) { return norm(x) === n; })[0]; if (!ok) throw new Error('Tipo de item inválido: use peça, serviço, mão de obra, adicional ou desconto.'); return ok; }
  function ehAjuste(i) { return i.tipo === 'adicional' || i.tipo === 'desconto'; }
  function txt(v) { return v == null ? '' : String(v).trim(); }

  function validarItem(it) {
    if (!it || typeof it !== 'object') throw new Error('Item inválido.');
    var tipo = tipoItem(it.tipo), descricao = txt(it.descricao);
    if (!descricao) throw new Error('Informe a descrição do item.');
    var aj = tipo === 'adicional' || tipo === 'desconto';
    var modo = aj ? (String(it.modo || 'R$').trim() === '%' ? '%' : 'R$') : '';
    var valor = numero(it.valorUnit, 'Valor', modo === '%' ? 100 : LIM.valor);
    var qtd = aj ? 1 : (it.qtd === '' || it.qtd == null ? 1 : numero(it.qtd, 'Quantidade', LIM.qtd));
    if (!aj && qtd <= 0) throw new Error('Quantidade inválida.');
    return { tipo: tipo, descricao: descricao, qtd: qtd, valorUnit: modo === '%' ? valor : centavos(valor), modo: modo, origem: txt(it.origem) };
  }
  /** Subtotal -> adicionais (% sobre subtotal) -> descontos (% sobre subtotal+adicionais). Nunca negativo. */
  function calcularBloco(itens, baseExtra) {
    var sub = centavos(baseExtra || 0), linhas = [];
    itens.forEach(function (i) { if (!ehAjuste(i)) { var t = centavos(i.qtd * i.valorUnit); sub = centavos(sub + t); linhas.push(Object.assign({}, i, { total: t })); } });
    var adic = 0;
    itens.forEach(function (i) { if (i.tipo === 'adicional') { var t = centavos(i.modo === '%' ? sub * i.valorUnit / 100 : i.valorUnit); adic = centavos(adic + t); linhas.push(Object.assign({}, i, { total: t })); } });
    var base = centavos(sub + adic), desc = 0;
    itens.forEach(function (i) { if (i.tipo === 'desconto') { var t = centavos(i.modo === '%' ? base * i.valorUnit / 100 : i.valorUnit); desc = centavos(desc + t); linhas.push(Object.assign({}, i, { total: -t })); } });
    return { itens: linhas, subtotal: sub, adicionais: adic, descontos: desc, total: Math.max(0, centavos(base - desc)) };
  }
  /** Normaliza a OS e calcula os totais (mesma estrutura do montarOSMulti_ do servidor). */
  function montar(x) {
    if (!x || typeof x !== 'object') throw new Error('Dados da OS inválidos.');
    var eqs = x.equipamentos;
    if (!Array.isArray(eqs) || !eqs.length) throw new Error('Informe pelo menos um equipamento.');
    if (eqs.length > LIM.equip) throw new Error('No máximo ' + LIM.equip + ' equipamentos por OS.');
    var lista = eqs.map(function (e, n) {
      var o = { equipId: txt(e.equipId) || ('EQ' + (n + 1)), identificacao: txt(e.identificacao), tipo: txt(e.tipo), modelo: txt(e.modelo), serie: txt(e.serie), defeito: txt(e.defeito), servico: txt(e.servico), obs: txt(e.obs) };
      if (!o.identificacao && !o.modelo && !o.tipo) throw new Error('Equipamento ' + (n + 1) + ': informe a identificação ou a marca/modelo.');
      if (!o.identificacao) o.identificacao = 'Equipamento ' + (n + 1);
      var its = e.itens || [];
      if (its.length > LIM.itens) throw new Error('No máximo ' + LIM.itens + ' itens por equipamento.');
      var c = calcularBloco(its.map(validarItem));
      o.itens = c.itens; o.totais = { subtotal: c.subtotal, adicionais: c.adicionais, descontos: c.descontos, total: c.total };
      return o;
    });
    var gerais = (x.itensOS || []).map(validarItem).filter(ehAjuste);
    var somaEq = lista.reduce(function (s, e) { return centavos(s + e.totais.total); }, 0);
    var g = calcularBloco(gerais, somaEq);
    return { num: txt(x.num), cliente: txt(x.cliente), previsao: txt(x.previsao), acessorios: txt(x.acessorios), obsInt: txt(x.obsInt), equipamentos: lista, itensOS: g.itens,
      totais: { equipamentos: somaEq, adicionais: g.adicionais, descontos: g.descontos, total: g.total } };
  }
  /** Totais "enquanto digita": nunca lança erro (linhas incompletas são ignoradas). */
  function totaisTolerante(x) {
    var limpo = function (its) { return (its || []).filter(function (i) { try { validarItem(i); return true; } catch (e) { return false; } }); };
    var eqs = (x.equipamentos || []).map(function (e, n) { return Object.assign({}, e, { identificacao: txt(e.identificacao) || ('Equipamento ' + (n + 1)), itens: limpo(e.itens) }); });
    if (!eqs.length) return { equipamentos: [], totais: { equipamentos: 0, adicionais: 0, descontos: 0, total: 0 } };
    return montar(Object.assign({}, x, { equipamentos: eqs, itensOS: limpo(x.itensOS) }));
  }

  function brl(n) { var neg = n < 0, s = Math.abs(centavos(n)).toFixed(2).split('.'); return (neg ? '−' : '') + 'R$ ' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1]; }
  function dataBR(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }
  function rotulo(i) { return ehAjuste(i) ? (i.tipo === 'adicional' ? 'Adicional' : 'Desconto') + (i.modo === '%' ? ' (' + String(i.valorUnit).replace('.', ',') + '%)' : '') : i.tipo.charAt(0).toUpperCase() + i.tipo.slice(1); }
  function economia(m) { return centavos(m.equipamentos.reduce(function (s, e) { return s + e.totais.descontos; }, 0) + m.totais.descontos); }

  /** Texto de WhatsApp idêntico ao whatsOrcamentoOS_ do crm-v3. */
  function textoWhatsApp(m, cli, termos) {
    cli = cli || {}; termos = termos || {};
    var l = ['🧾 *ProFix Computadores – Confirmação de orçamento' + (m.num ? ' ' + m.num : '') + '*', 'Cliente: ' + (cli.nome || m.cliente), ''];
    m.equipamentos.forEach(function (q, n) {
      var tm = [q.tipo, q.modelo].filter(String);
      l.push('*' + (n + 1) + '. ' + q.identificacao + '*' + (tm.length ? ' (' + tm.join(' ') + ')' : '') + (q.serie ? ' – nº série ' + q.serie : ''));
      if (q.defeito) l.push('Defeito: ' + q.defeito);
      q.itens.forEach(function (i) { l.push('• ' + (ehAjuste(i) ? rotulo(i) + ': ' + i.descricao : i.descricao + (i.qtd !== 1 ? ' x' + String(i.qtd).replace('.', ',') : '')) + ' – ' + brl(i.total)); });
      l.push('Total do equipamento: ' + brl(q.totais.total), '');
    });
    m.itensOS.forEach(function (i) { l.push('• ' + rotulo(i) + ': ' + i.descricao + ' – ' + brl(i.total)); });
    var ec = economia(m);
    if (ec > 0) l.push('Você economiza: ' + brl(ec));
    l.push('💰 *Total geral: ' + brl(m.totais.total) + '*', '📅 Previsão de entrega: ' + (m.previsao ? dataBR(m.previsao) : 'a combinar'));
    if (termos.validade) l.push('Validade do orçamento: ' + termos.validade);
    if (termos.garantia) l.push('Garantia: ' + termos.garantia);
    if (termos.obs) l.push(termos.obs);
    l.push('', 'Pode confirmar se aprova o orçamento? 🙂', 'WhatsApp ' + PROFIX.whatsapp + ' · Instagram ' + PROFIX.instagram);
    return l.join('\n');
  }
  function telefoneBR(v) { var d = String(v == null ? '' : v).replace(/\D/g, ''); if ((d.length === 12 || d.length === 13) && d.slice(0, 2) === '55') d = d.slice(2); return (d.length === 10 || d.length === 11) && d[0] !== '0' ? d : ''; }
  /** Só monta o link wa.me (quem envia é o Pedro). */
  function linkWhatsApp(tel, texto) { var d = telefoneBR(tel); return 'https://wa.me/' + (d ? '55' + d : '') + '?text=' + encodeURIComponent(texto); }

  /** Mesma regra do avaliarCondicaoOS_: aviso (não bloqueia) acima de ~11%. */
  function avaliarCondicao(totalAntes, modo, valor) {
    if (modo !== '%' && modo !== 'R$') throw new Error('Modo inválido: use R$ ou %.');
    var v = numero(valor, 'Valor da condição', modo === '%' ? 100 : LIM.valor);
    if (!(v > 0)) throw new Error('Informe o valor da condição especial.');
    var desc = Math.min(centavos(totalAntes), centavos(modo === '%' ? totalAntes * v / 100 : v));
    var pct = totalAntes > 0 ? desc / totalAntes : 0, acima = Math.round(pct * 1000) / 1000 > LIMITE_MEDIANA;
    return { valor: v, modo: modo, desconto: desc, totalAntes: centavos(totalAntes), novoTotal: Math.max(0, centavos(totalAntes - desc)), pct: Math.round(pct * 10000) / 100, abaixoMediana: acima,
      aviso: acima ? 'Atenção: com ' + String(Math.round(pct * 1000) / 10).replace('.', ',') + '% de desconto o preço fica abaixo da mediana do mercado (sua margem é de ~10-15% sobre a mediana).' : '' };
  }
  function semNegociacao(x) { return Object.assign({}, x, { itensOS: (x.itensOS || []).filter(function (i) { return i.origem !== 'negociacao'; }) }); }
  function condicaoDe(x) { return (x.itensOS || []).filter(function (i) { return i.origem === 'negociacao'; })[0] || null; }
  /** Linha da condição especial (gravada em R$, como no servidor). */
  function itemCondicao(av, motivo, validoHoje) {
    var d = txt(motivo) || 'Condição especial para fechamento hoje';
    if (av.modo === '%') d += ' – ' + String(av.valor).replace('.', ',') + '%';
    if (validoHoje !== false) d += ' (válido só hoje)';
    return { tipo: 'desconto', descricao: d, modo: 'R$', valorUnit: av.desconto, origem: 'negociacao' };
  }
  /** Categoria do catálogo -> tipo do item. */
  function tipoDaCategoria(c) { var n = norm(c); return n === 'peca' ? 'peça' : n === 'mao de obra' ? 'mão de obra' : 'serviço'; }
  function buscarCatalogo(itens, q, max) {
    var n = norm(q); if (!n) return (itens || []).slice(0, max || 8);
    var p = n.split(/\s+/);
    return (itens || []).filter(function (c) { var d = norm(c.descricao + ' ' + (c.categoria || '')); return p.every(function (w) { return d.indexOf(w) >= 0; }); }).slice(0, max || 8);
  }
  /** Mesmo formato do orcamentoOS do servidor (sem o HTML), para prévia offline e modo demonstração. */
  function orcamentoLocal(x, cli, termos) {
    var m = montar(x); cli = cli || {};
    var t = textoWhatsApp(m, cli, termos);
    return { ok: true, num: m.num, cliente: { nome: cli.nome || m.cliente, whatsapp: cli.whatsapp || '' }, profix: PROFIX, previsao: m.previsao, equipamentos: m.equipamentos, itensOS: m.itensOS,
      totais: m.totais, economia: economia(m), condicao: condicaoDe(m), termos: termos || {}, whatsappTexto: t, whatsappUrl: linkWhatsApp(cli.whatsapp, t), local: true };
  }
  return { TIPOS: TIPOS, ATALHOS: ATALHOS, CATALOGO_DEMO: CATALOGO_DEMO, LIMITE_MEDIANA: LIMITE_MEDIANA, PROFIX: PROFIX,
    centavos: centavos, validarItem: validarItem, calcularBloco: calcularBloco, montar: montar, totaisTolerante: totaisTolerante, brl: brl, dataBR: dataBR, rotulo: rotulo,
    ehAjuste: ehAjuste, economia: economia, textoWhatsApp: textoWhatsApp, linkWhatsApp: linkWhatsApp, telefoneBR: telefoneBR, avaliarCondicao: avaliarCondicao,
    semNegociacao: semNegociacao, condicaoDe: condicaoDe, itemCondicao: itemCondicao, tipoDaCategoria: tipoDaCategoria, buscarCatalogo: buscarCatalogo, orcamentoLocal: orcamentoLocal };
});
