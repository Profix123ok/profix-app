/* ProFix App 0.8.5/0.8.6 – lógica pura (sem tela): teto MEI, previsão das OS, DRE MEI simples, etiqueta QR (gerador local),
 * proposta comercial (HTML para imprimir/PDF), Módulo 9 (cotações e insumos de bancada) e Calculadora de PCs.
 * Nada aqui inventa preço: valores vêm do Financeiro/OS do CRM, das cotações com fonte, ou do que o Pedro digita (só preço de VENDA). */
(function (raiz, fabrica) {
  var V = (typeof module === 'object' && module.exports) ? require('./vista.js') : raiz.ProFixVista;
  var m = fabrica(V); if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFix085 = m;
})(typeof self !== 'undefined' ? self : this, function (V) {
  'use strict';
  var L = {};
  var r2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };
  var num = function (v) { if (v === '' || v == null) return NaN; if (typeof v === 'number') return v; var s = String(v).replace(/R\$|\s/g, ''); if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); return s === '' ? NaN : Number(s); };
  L.num = num;
  var esc = V.esc, brl = V.brl;

  // ================= 1) Teto MEI =================
  // Teto OFICIAL em vigor (financeiro.md, 16/10/2026): R$ 81.000/ano. PLP 186/2026 ainda NÃO é lei.
  // Se a lei mudar, troque SÓ esta constante (e o cache do sw.js).
  L.TETO_MEI_ANUAL = 81000;
  L.TETO_MEI_MENSAL = L.TETO_MEI_ANUAL / 12; // 6.750
  L.ALERTA_MEI_PADRAO = 0.8; // 80%: CRM usa o mesmo padrão (Configurações › "Alerta do teto")
  /** Faturamento do ano (Entradas do Financeiro, revenda de usados inclusa) × teto. Não soma nada que não esteja lançado. */
  L.tetoMEI = function (D, hoje, opc) {
    opc = opc || {}; hoje = hoje || D.hoje; var ano = String(hoje).slice(0, 4), mes = Number(String(hoje).slice(5, 7)) || 12;
    var teto = L.TETO_MEI_ANUAL, fin = D.fin || {}, alerta = Number(fin.alerta) > 0 && Number(fin.alerta) < 1 ? Number(fin.alerta) : L.ALERTA_MEI_PADRAO;
    var total = 0, porCat = {}, porMes = {};
    (D.financeiro || []).forEach(function (f) {
      if (f.tipo !== 'Entrada' || String(f.data).slice(0, 4) !== ano) return;
      var v = Number(f.receita) || 0; if (!v) return;
      total += v; var c = f.categoria || 'Sem categoria'; porCat[c] = r2((porCat[c] || 0) + v);
      var mm = String(f.data).slice(0, 7); porMes[mm] = r2((porMes[mm] || 0) + v);
    });
    total = r2(total);
    // Revenda vendida no ano SEM lançamento no Financeiro: só avisa (não soma, para não contar duas vezes).
    var semLanc = (D.revenda || []).filter(function (r) { return r.status === 'Vendido' && String(r.venda || '').slice(0, 4) === ano && r.vendaLancada !== 'Sim' && Number(r.precoVenda) > 0 && !(D.financeiro || []).some(function (f) { return f.tipo === 'Entrada' && /revenda/i.test(f.categoria || '') && String(f.descricao || '').indexOf(r.id) >= 0; }); });
    var semLancValor = r2(semLanc.reduce(function (s, r) { return s + (Number(r.precoVenda) || 0); }, 0));
    var pct = teto ? total / teto : 0, media = r2(total / mes);
    var nivel = pct > 1 ? 'estourou' : pct >= 0.95 ? 'perigo' : pct >= alerta ? 'atencao' : 'ok';
    var tetoPlanilha = Number(fin.teto) > 0 && Number(fin.teto) !== teto ? Number(fin.teto) : null;
    return { ano: ano, teto: teto, mensalRef: L.TETO_MEI_MENSAL, faturado: total, restante: r2(teto - total), pct: Math.round(pct * 1000) / 10, alertaPct: Math.round(alerta * 100),
      meses: mes, mediaMensal: media, projecaoAno: r2(media * 12), porCategoria: porCat, porMes: porMes, nivel: nivel,
      revendaSemLancamento: semLanc.map(function (r) { return r.id; }), revendaSemLancamentoValor: semLancValor, tetoPlanilha: tetoPlanilha,
      restantePorMes: mes < 12 ? r2(Math.max(0, teto - total) / (12 - mes)) : null };
  };
  L.textoNivelMEI = function (t) {
    if (t.nivel === 'estourou') return 'Passou do teto do MEI. Fale com um contador antes de emitir novas notas.';
    if (t.nivel === 'perigo') return 'Muito perto do teto (' + String(t.pct).replace('.', ',') + '%). Fale com um contador antes de fechar serviços grandes.';
    if (t.nivel === 'atencao') return 'Atenção: já passou de ' + t.alertaPct + '% do teto anual do MEI.';
    return 'Dentro do teto do MEI.';
  };

  // ================= 2) Previsão pelas OS abertas (não é dinheiro em caixa) =================
  var FECHADAS = ['Entregue', 'Cancelado'];
  L.previsaoOS = function (D) {
    var conf = [], pend = [];
    (D.os || []).forEach(function (o) {
      if (FECHADAS.indexOf(String(o.status || '').trim()) >= 0 || o.aprovacao === 'Recusado') return;
      var valor = Number(o.valor) || 0, rec = V.recebidoOS(D, o.num);
      if (valor > 0) { var falta = r2(valor - rec); if (falta > 0) conf.push({ num: o.num, cliente: o.cliente, status: o.status, valor: valor, recebido: r2(rec), falta: falta }); }
      else if (Number(o.orcamento) > 0 && (o.aprovacao === 'Pendente' || !o.aprovacao)) pend.push({ num: o.num, cliente: o.cliente, status: o.status, valor: Number(o.orcamento), validade: o.validade || '' });
    });
    var s = function (l, k) { return r2(l.reduce(function (a, x) { return a + x[k]; }, 0)); };
    return { aReceber: s(conf, 'falta'), confirmadas: conf, orcamentosPendentes: s(pend, 'valor'), pendentes: pend };
  };

  // ================= 4) Painel financeiro: DRE MEI simples =================
  // Classificação pelas categorias JÁ existentes no CRM (CATEGORIAS_FIN_PADRAO). Categoria desconhecida vai para "Outras saídas".
  L.CAT_CUSTO_DIRETO = ['Compra de peça', 'Deslocamento'];
  L.CAT_DESPESA = ['Ferramentas', 'DAS-MEI', 'Marketing', 'Outros'];
  L.dre = function (D, de, ate) {
    var out = { receita: 0, receitaPorCat: {}, custos: 0, despesas: 0, outras: 0, saidasPorCat: {}, lancamentos: 0 };
    (D.financeiro || []).forEach(function (f) {
      var d = String(f.data || '').slice(0, 10); if (!d || d < de || d > ate) return; out.lancamentos++;
      var c = f.categoria || 'Sem categoria';
      if (f.tipo === 'Entrada') { var v = Number(f.receita) || 0; out.receita += v; out.receitaPorCat[c] = r2((out.receitaPorCat[c] || 0) + v); return; }
      var s = Number(f.custo) || 0; out.saidasPorCat[c] = r2((out.saidasPorCat[c] || 0) + s);
      if (L.CAT_CUSTO_DIRETO.indexOf(c) >= 0) out.custos += s; else if (L.CAT_DESPESA.indexOf(c) >= 0) out.despesas += s; else out.outras += s;
    });
    out.receita = r2(out.receita); out.custos = r2(out.custos); out.despesas = r2(out.despesas); out.outras = r2(out.outras);
    out.margemBruta = r2(out.receita - out.custos); out.resultado = r2(out.receita - out.custos - out.despesas - out.outras);
    out.margemPct = out.receita ? Math.round(out.resultado / out.receita * 1000) / 10 : null;
    return out;
  };
  /** Saldo (entradas − saídas) dos últimos n meses até ym, inclusive. */
  L.saldosMeses = function (D, ym, n) {
    var p = ym.split('-').map(Number), out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(Date.UTC(p[0], p[1] - 1 - i, 1)), k = d.toISOString().slice(0, 7), r = V.resumoMes(D, k);
      out.push({ mes: k, entradas: r2(r.entradas), saidas: r2(r.saidas), saldo: r.saldo });
    }
    return out;
  };
  L.CORES = ['#00FF66', '#facc15', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6', '#a3b3ab'];
  /** Rosca de custos em CSS (conic-gradient), sem biblioteca. */
  L.rosca = function (porCat) {
    var ks = Object.keys(porCat).filter(function (k) { return porCat[k] > 0; }).sort(function (a, b) { return porCat[b] - porCat[a]; });
    var tot = ks.reduce(function (s, k) { return s + porCat[k]; }, 0); if (!tot) return null;
    var ac = 0, partes = ks.map(function (k, i) { var ini = ac; ac += porCat[k] / tot * 100; return { cat: k, valor: porCat[k], pct: Math.round(porCat[k] / tot * 1000) / 10, cor: L.CORES[i % L.CORES.length], ini: ini, fim: ac }; });
    return { total: r2(tot), partes: partes, css: 'conic-gradient(' + partes.map(function (p) { return p.cor + ' ' + p.ini.toFixed(2) + '% ' + p.fim.toFixed(2) + '%'; }).join(',') + ')' };
  };

  // ================= 3) Etiqueta QR: gerador local (byte, correção M, versões 1–10). Sem API externa. =================
  var ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], BLK_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  function rawMod(v) { var r = (16 * v + 128) * v + 64; if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; }
  function dataCw(v) { return Math.floor(rawMod(v) / 8) - ECC_M[v] * BLK_M[v]; }
  function gmul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
  function rsDiv(deg) { var r = [], i, j; for (i = 0; i < deg - 1; i++) r.push(0); r.push(1); var root = 1;
    for (i = 0; i < deg; i++) { for (j = 0; j < r.length; j++) { r[j] = gmul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gmul(root, 2); } return r; }
  function rsRem(data, div) { var r = div.map(function () { return 0; }); data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= gmul(c, f); }); }); return r; }
  function utf8(s) { if (typeof TextEncoder !== 'undefined') return Array.prototype.slice.call(new TextEncoder().encode(s)); var u = unescape(encodeURIComponent(s)), o = []; for (var i = 0; i < u.length; i++) o.push(u.charCodeAt(i)); return o; }
  L.qrMatriz = function (texto) {
    var bytes = utf8(String(texto)), ver;
    for (ver = 1; ver <= 10; ver++) if (4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 <= dataCw(ver) * 8) break;
    if (ver > 10) throw new Error('Texto longo demais para a etiqueta.');
    var bits = [], push = function (v, n) { for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    push(4, 4); push(bytes.length, ver <= 9 ? 8 : 16); bytes.forEach(function (b) { push(b, 8); });
    var cap = dataCw(ver) * 8; push(0, Math.min(4, cap - bits.length)); push(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
    var data = []; for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    // ECC + intercalação
    var nb = BLK_M[ver], el = ECC_M[ver], raw = Math.floor(rawMod(ver) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDiv(el), blocos = [], k = 0;
    for (i = 0; i < nb; i++) { var dat = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += dat.length; var ecc = rsRem(dat, div); if (i < nShort) dat.push(0); blocos.push(dat.concat(ecc)); }
    var cw = []; for (i = 0; i < blocos[0].length; i++) blocos.forEach(function (bl, jj) { if (i !== shortLen - el || jj >= nShort) cw.push(bl[i]); });
    var n = ver * 4 + 17, M = [], F = [];
    for (i = 0; i < n; i++) { M.push(new Array(n).fill(false)); F.push(new Array(n).fill(false)); }
    var setF = function (x, y, d) { M[y][x] = d; F[y][x] = true; };
    for (i = 0; i < n; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    var finder = function (x, y) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var xx = x + dx, yy = y + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (xx >= 0 && xx < n && yy >= 0 && yy < n) setF(xx, yy, d !== 2 && d !== 4); } };
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    if (ver > 1) { var na = Math.floor(ver / 7) + 2, step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2, pos = [6];
      for (var p = n - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
      pos.forEach(function (ay, a) { pos.forEach(function (ax, b) { if ((a === 0 && b === 0) || (a === 0 && b === na - 1) || (a === na - 1 && b === 0)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }); }); }
    var formato = function (mask) { var d = (0 << 3) | mask, rem = d; for (var t = 0; t < 10; t++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537); var fb = ((d << 10) | rem) ^ 0x5412, g = function (q) { return ((fb >>> q) & 1) !== 0; };
      for (var q = 0; q <= 5; q++) setF(8, q, g(q)); setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8)); for (q = 9; q < 15; q++) setF(14 - q, 8, g(q));
      for (q = 0; q < 8; q++) setF(n - 1 - q, 8, g(q)); for (q = 8; q < 15; q++) setF(8, n - 15 + q, g(q)); setF(8, n - 8, true); };
    formato(0);
    if (ver >= 7) { var rem = ver; for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25); var vb = (ver << 12) | rem;
      for (i = 0; i < 18; i++) { var bit = ((vb >>> i) & 1) !== 0, a2 = n - 11 + i % 3, b2 = Math.floor(i / 3); setF(a2, b2, bit); setF(b2, a2, bit); } }
    var idx = 0;
    for (var right = n - 1; right >= 1; right -= 2) { if (right === 6) right = 5;
      for (var vert = 0; vert < n; vert++) for (j = 0; j < 2; j++) { var x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert;
        if (!F[y][x] && idx < cw.length * 8) { M[y][x] = ((cw[idx >>> 3] >>> (7 - (idx & 7))) & 1) !== 0; idx++; } } }
    var cond = [function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; }, function (x) { return x % 3 === 0; }, function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; }, function (x, y) { return x * y % 2 + x * y % 3 === 0; },
      function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; }, function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }];
    var mascarar = function (mk) { for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (!F[y][x] && cond[mk](x, y)) M[y][x] = !M[y][x]; };
    var penal = function () { var pts = 0, x, y, dark = 0, linha = function (get) { var run = 1, s = ''; for (var t = 0; t < n; t++) { s += get(t) ? '1' : '0'; if (t > 0 && get(t) === get(t - 1)) run++; else { if (run >= 5) pts += run - 2; run = 1; } } if (run >= 5) pts += run - 2;
        var pd = '0000' + s + '0000'; ['10111010000', '00001011101'].forEach(function (pat) { var k2 = pd.indexOf(pat); while (k2 >= 0) { pts += 40; k2 = pd.indexOf(pat, k2 + 1); } }); };
      for (y = 0; y < n; y++) linha(function (t) { return M[y][t]; });
      for (x = 0; x < n; x++) linha(function (t) { return M[t][x]; });
      for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++) { var c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) pts += 3; }
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (M[y][x]) dark++;
      var tot = n * n; pts += (Math.ceil(Math.abs(dark * 20 - tot * 10) / tot) - 1) * 10; return pts; };
    var melhor = 0, menor = Infinity;
    for (var mk = 0; mk < 8; mk++) { mascarar(mk); formato(mk); var pp = penal(); if (pp < menor) { menor = pp; melhor = mk; } mascarar(mk); }
    mascarar(melhor); formato(melhor);
    return { versao: ver, tamanho: n, mascara: melhor, m: M };
  };
  L.qrSvg = function (texto, px) {
    var q = L.qrMatriz(texto), b = 4, t = q.tamanho + b * 2, d = '';
    for (var y = 0; y < q.tamanho; y++) for (var x = 0; x < q.tamanho; x++) if (q.m[y][x]) d += 'M' + (x + b) + ' ' + (y + b) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + ' ' + t + '"' + (px ? ' width="' + px + '" height="' + px + '"' : '') + ' shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="' + t + '" height="' + t + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  };
  /** Conteúdo do QR: só o nº da OS (sem nome, telefone ou endereço do cliente – LGPD). Opcional: link wa.me da ProFix com o nº. */
  L.conteudoEtiqueta = function (o, modo, whatsLoja) {
    if (modo === 'wa') { var n = String(whatsLoja || '').replace(/\D/g, ''); if (n.length === 10 || n.length === 11) n = '55' + n;
      return 'https://wa.me/' + n + '?text=' + encodeURIComponent('Olá, ProFix! Sobre o equipamento da ' + o.num); }
    return 'PROFIX ' + o.num;
  };
  L.etiquetaHtml = function (o, modo, whatsLoja) {
    var cont = L.conteudoEtiqueta(o, modo, whatsLoja);
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiqueta ' + esc(o.num) + '</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:8px;color:#000;background:#fff}.et{width:62mm;border:1px dashed #999;padding:3mm;display:flex;gap:3mm;align-items:center}.et svg{width:24mm;height:24mm;flex:none}.id{font-size:15pt;font-weight:bold}.p{font-size:8pt}@media print{.et{border:0}}</style></head><body>' +
      '<div class="et">' + L.qrSvg(cont) + '<div><div class="id">' + esc(o.num) + '</div><div class="p">' + esc(String(o.equipamento || '').slice(0, 40)) + '</div><div class="p">Entrada ' + esc(V.dataBR(o.entrada)) + '</div><div class="p"><b>ProFix Computadores</b><br>WhatsApp ' + esc(whatsLoja || '') + '</div></div></div></body></html>';
  };

  // ================= 5) Proposta comercial (HTML no App; o CRM só tem plGerarProposta no painel) =================
  L.INCLUI_PLANO = ['Visita preventiva no local, fora do horário comercial', 'Checagem de desempenho em cada visita', 'Limpeza interna completa de cada máquina a cada 6 meses', 'Suporte por WhatsApp nos horários de atendimento', '10% de desconto em serviços avulsos'];
  L.proposta = function (x, cfg, hoje) {
    x = x || {}; var p = V.planoOficial(x.plano); if (!p) throw new Error('Escolha o plano.');
    var cliente = String(x.cliente || '').trim().slice(0, 120); if (!cliente) throw new Error('Informe o nome da empresa/cliente.');
    var maq = Math.max(0, Math.round(num(x.maquinas) || 0)), precos = V.precosComerciais(cfg);
    if (p.valorPorPc && maq && maq < p.pcsMin) throw new Error('O ' + p.nome + ' é para ' + p.pcsMin + ' computadores ou mais.');
    var extras = !p.valorPorPc && maq > p.pcs ? maq - p.pcs : 0;
    var valor = V.valorPlano(p.nome, maq || p.pcsMin, extras, cfg), anual = !!x.anual;
    var mensalAnual = anual ? r2(valor * (1 - precos.anual / 100)) : null, total12 = anual ? V.valorComAnual(valor, cfg) : null;
    var dias = Math.max(1, Math.min(60, Math.round(num(x.validadeDias) || 7))), val = V.somaDias(hoje, dias), obs = String(x.obs || '').trim().slice(0, 600), contato = String(x.contato || '').trim().slice(0, 80);
    var linhaExtra = extras ? 'Inclui ' + extras + ' computador' + (extras > 1 ? 'es' : '') + ' a mais: ' + brl(precos.extra) + '/mês cada.' : '';
    var linhaAnual = anual ? 'Contrato anual: ' + precos.anual + '% de desconto → ' + brl(mensalAnual) + '/mês (12 meses = ' + brl(total12) + ').' : 'Fechando contrato anual, você ganha ' + precos.anual + '% de desconto na mensalidade.';
    var cobre = p.valorPorPc ? p.pcsTxt + ' computadores · ' + brl(p.valorPorPc) + ' por computador/mês' : 'até ' + p.pcs + ' computadores';
    var inclui = L.INCLUI_PLANO.concat([p.suporte + ' (sem promessa de prazo em horas)']);
    var texto = ['*Proposta ProFix – Plano ' + p.nome + '*', 'Para: ' + cliente + (maq ? ' (' + maq + ' computador' + (maq > 1 ? 'es' : '') + ')' : ''), '', 'Valor: *' + brl(valor) + '/mês*']
      .concat(linhaExtra ? [linhaExtra] : []).concat([linhaAnual, 'Cobre ' + cobre + ' · Visitas no local: ' + p.frequencia, '', 'O que está incluído:'])
      .concat(inclui.map(function (s) { return '✅ ' + s; }))
      .concat(['', 'Peças e equipamentos são orçados à parte e só comprados com sua aprovação.', p.valorPorPc ? '' : 'Passou do limite do plano? Cada computador a mais sai por ' + brl(precos.extra) + '/mês.', 'Pagamento mensal, por Pix e antecipado. Direito de arrependimento de 7 dias (CDC).', 'Atendimento com hora marcada: seg a sex, das 19h às 22h; sáb e dom, das 9h às 17h.'].filter(String))
      .concat(obs ? ['', obs] : []).concat(['', 'Proposta válida até ' + V.dataBR(val) + '.', 'ProFix Computadores · Pedro · (15) 98112-8309 · CNPJ 64.628.598/0001-40']).join('\n');
    var css = 'body{font:14px/1.5 Arial,Helvetica,sans-serif;color:#0f1a16;margin:0;background:#fff}.pp{max-width:720px;margin:0 auto;padding:28px}.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #16a34a;padding-bottom:12px;gap:12px}' +
      '.top h1{margin:0;font-size:22px}.top .m{color:#5b6b64;font-size:12px;text-align:right}.tag{display:inline-block;background:#16a34a;color:#fff;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:700}' +
      '.box{border:1px solid #e1e8e4;border-radius:12px;padding:16px 18px;margin:16px 0}.preco{font-size:30px;font-weight:800;color:#0f7a37}.preco small{font-size:14px;color:#5b6b64;font-weight:400}' +
      'ul{margin:6px 0;padding-left:20px}li{margin:3px 0}.obs{color:#5b6b64;font-size:12px}.ass{margin-top:36px;display:flex;gap:30px}.ass div{flex:1;border-top:1px solid #999;padding-top:4px;font-size:12px;color:#5b6b64;text-align:center}@media print{.pp{padding:0}}';
    var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Proposta ProFix – Plano ' + esc(p.nome) + ' – ' + esc(cliente) + '</title><style>' + css + '</style></head><body><div class="pp">' +
      '<div class="top"><div><div class="tag">Proposta de suporte mensal</div><h1>ProFix Computadores – Plano ' + esc(p.nome) + '</h1></div><div class="m">Sorocaba/SP · (15) 98112-8309<br>CNPJ 64.628.598/0001-40<br>Emitida em ' + V.dataBR(hoje) + '</div></div>' +
      '<div class="box"><b>Para:</b> ' + esc(cliente) + (contato ? ' · ' + esc(contato) : '') + (maq ? ' · ' + maq + ' computador' + (maq > 1 ? 'es' : '') : '') +
      '<div class="preco" id="ppValor">' + brl(valor) + '<small> /mês</small></div>' + (linhaExtra ? '<div class="obs">' + esc(linhaExtra) + '</div>' : '') + '<div class="obs" id="ppAnual"><b>' + esc(linhaAnual) + '</b></div></div>' +
      '<div class="box"><b>O que está incluído</b><ul>' + inclui.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul><p class="obs">Cobre ' + esc(cobre) + ' · Visitas no local: ' + esc(p.frequencia) + '. Peças e equipamentos são orçados à parte e só comprados com sua aprovação.' + (p.valorPorPc ? '' : ' Computador a mais: ' + brl(precos.extra) + '/mês cada.') + '</p></div>' +
      (obs ? '<div class="box"><b>Observações</b><p>' + esc(obs).replace(/\n/g, '<br>') + '</p></div>' : '') +
      '<p class="obs">Pagamento mensal, por Pix e antecipado. Direito de arrependimento de 7 dias (CDC). Atendimento com hora marcada: seg a sex, das 19h às 22h; sáb e dom, das 9h às 17h.</p>' +
      '<p class="obs">Proposta válida até ' + V.dataBR(val) + '.</p><div class="ass"><div>ProFix Computadores – Pedro</div><div>' + esc(cliente) + '</div></div></div></body></html>';
    return { texto: texto, html: html, valor: valor, mensalAnual: mensalAnual, total12: total12, anual: anual, anualPct: precos.anual, validade: val, extras: extras, plano: p.nome };
  };

  // ================= 7) Módulo 9: cotações e insumos de bancada (spec Compras 09/11/2026) =================
  L.STATUS_COT = ['Cotado', 'Escolhido', 'Comprado', 'Recebido', 'Descartado'];
  L.CONDICOES = ['Novo', 'Usado', 'Recondicionado'];
  L.FORMAS_FORN = ['Pix', 'Cartão', 'Boleto'];
  L.VALIDADE_ONLINE_DIAS = 3;
  L.INSUMOS_INICIAIS = ['Pasta térmica', 'Limpa contatos', 'Álcool isopropílico', 'Cabos (SATA, energia, rede)', 'Abraçadeiras / enforca-gato', 'Pincel / soprador / pano de microfibra', 'Pendrive de instalação'];
  L.RE_FORN = /^FN-\d{4}$/;
  L.custoPosto = function (unit, qtd, frete) { var u = num(unit), q = num(qtd), f = num(frete); if (!(q > 0) || !(u >= 0)) return NaN; return r2((u * q + (f > 0 ? f : 0)) / q); };
  L.lojaVazia = function () { return { versao: 1, cotacoes: [], insumos: L.INSUMOS_INICIAIS.map(function (n, i) { return { id: 'IN-' + ('000' + (i + 1)).slice(-4), item: n, qtd: '', minimo: '', fornecedor: '', ultimaCompra: '' }; }) }; };
  L.normLoja = function (s) { s = s && typeof s === 'object' ? s : {}; var b = L.lojaVazia(); return { versao: 1, cotacoes: Array.isArray(s.cotacoes) ? s.cotacoes : [], insumos: Array.isArray(s.insumos) && s.insumos.length ? s.insumos : b.insumos }; };
  L.proxId = function (lista, pre) { var n = 0; (lista || []).forEach(function (o) { var m = String(o.id || '').match(/(\d+)$/); if (m) n = Math.max(n, +m[1]); }); return pre + ('000' + (n + 1)).slice(-4); };
  /** ctx: { hoje, osNums: [...], fornecedores: [{id, nome, ativo}] | null (null = lista do CRM ainda não chega ao App) } */
  L.validarCotacao = function (c, ctx) {
    c = Object.assign({}, c); ctx = ctx || {};
    var os = String(c.os || '').trim(); if (/^insumo$/i.test(os)) os = 'Insumo';
    if (!os) throw new Error('Ligue a cotação a uma OS (ou escolha “Insumo” para material de bancada).');
    if (os !== 'Insumo' && (ctx.osNums || []).indexOf(os) < 0) throw new Error('OS ' + os + ' não encontrada.');
    var fn = String(c.fornecedor || '').trim().toUpperCase();
    if (!L.RE_FORN.test(fn)) throw new Error('Fornecedor: use o código da lista do CRM (FN-0001 a FN-0197). Não cadastre fornecedor solto.');
    if (ctx.fornecedores && ctx.fornecedores.length) { var f = ctx.fornecedores.filter(function (x) { return String(x.id).toUpperCase() === fn; })[0];
      if (!f) throw new Error('Fornecedor ' + fn + ' não está na lista do CRM.'); if (f.ativo === false) throw new Error('Fornecedor ' + fn + ' está desativado no CRM.'); }
    var peca = String(c.peca || '').trim(); if (!peca) throw new Error('Informe a peça / item.');
    var qtd = num(c.qtd); if (!(qtd > 0) || Math.round(qtd) !== qtd) throw new Error('Quantidade deve ser um número inteiro maior que zero.');
    var unit = num(c.unit); if (!(unit > 0)) throw new Error('Informe o preço unitário cotado (maior que zero).');
    var frete = c.frete === '' || c.frete == null ? 0 : num(c.frete); if (!(frete >= 0)) throw new Error('Frete inválido (use 0 se for retirada).');
    var fonte = String(c.fonte || '').trim(); if (fonte.length < 4) throw new Error('Fonte obrigatória: link, “e-mail de dd/mm” ou print. Sem fonte, não salva.');
    var data = c.data || ctx.hoje, validade = String(c.validade || '').trim() || V.somaDias(data, L.VALIDADE_ONLINE_DIAS);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validade)) throw new Error('Validade inválida.'); if (validade < data) throw new Error('A validade não pode ser antes da data da cotação.');
    var cond = c.condicao || 'Novo'; if (L.CONDICOES.indexOf(cond) < 0) throw new Error('Condição inválida.');
    if (cond !== 'Novo' && os !== 'Insumo' && !c.autorizadoUsado) throw new Error('Peça usada/recondicionada só com autorização do cliente (CDC art. 21). Marque que o cliente autorizou.');
    var forma = c.forma || ''; if (forma && L.FORMAS_FORN.indexOf(forma) < 0) throw new Error('Forma de pagamento inválida.');
    var prazo = c.prazo === '' || c.prazo == null ? '' : num(c.prazo); if (prazo !== '' && !(prazo >= 0)) throw new Error('Prazo de entrega inválido.');
    var st = c.status || 'Cotado'; if (L.STATUS_COT.indexOf(st) < 0) throw new Error('Status inválido.');
    return { id: c.id || '', data: data, os: os, fornecedor: fn, peca: peca, marca: String(c.marca || '').trim(), condicao: cond, autorizadoUsado: !!c.autorizadoUsado, qtd: qtd, unit: r2(unit), frete: r2(frete),
      custoPosto: L.custoPosto(unit, qtd, frete), prazo: prazo, forma: forma, validade: validade, fonte: fonte, status: st, garantia: String(c.garantia || '').trim() };
  };
  // 0.8.6: o servidor também diz "vencida"; qualquer um dos dois tira a cotação da Calculadora.
  L.cotacaoValida = function (c, hoje) { return !!c && c.status !== 'Descartado' && c.vencida !== true && String(c.validade || '') >= hoje; };
  L.compararOS = function (lista, numOS, hoje) {
    var da = (lista || []).filter(function (c) { return c.os === numOS; }), ord = function (a, b) { return (a.custoPosto - b.custoPosto) || ((Number(a.prazo) || 99) - (Number(b.prazo) || 99)); };
    return { validas: da.filter(function (c) { return L.cotacaoValida(c, hoje); }).sort(ord), vencidas: da.filter(function (c) { return !L.cotacaoValida(c, hoje); }).sort(ord) };
  };
  /** Marca uma como Escolhido; outra Escolhido da MESMA OS e MESMA peça volta para Cotado. */
  L.escolher = function (lista, id, hoje) {
    var c = (lista || []).filter(function (x) { return x.id === id; })[0]; if (!c) throw new Error('Cotação não encontrada.');
    if (!L.cotacaoValida(c, hoje)) throw new Error('Cotação vencida ou descartada: cote de novo antes de escolher.');
    if (c.status !== 'Cotado' && c.status !== 'Escolhido') throw new Error('Só dá para escolher uma cotação com status Cotado.');
    lista.forEach(function (x) { if (x !== c && x.os === c.os && V.norm(x.peca) === V.norm(c.peca) && x.status === 'Escolhido') x.status = 'Cotado'; });
    c.status = 'Escolhido'; return c;
  };
  /** Regra 2: pagar fornecedor só depois de receber do cliente. true = mostrar aviso. */
  L.avisoOSNaoPaga = function (c, recebido) { return c.os !== 'Insumo' && !(Number(recebido) > 0); };
  L.totalCompra = function (c) { return r2(c.unit * c.qtd + (Number(c.frete) || 0)); };
  /** Saída para o Financeiro (ação salvarLancamento, que o App já usa). Categoria escolhida da lista do CRM. */
  L.lancamentoCompra = function (c, hoje, categoria) {
    return { data: hoje, tipo: 'Saída', categoria: categoria || 'Compra de peça', os: c.os === 'Insumo' ? '' : c.os, descricao: 'Compra ' + c.id + ' – ' + c.peca + ' (' + c.fornecedor + ')', forma: c.forma === 'Cartão' ? 'Crédito à vista' : (c.forma === 'Pix' ? 'Pix' : ''), receita: '', custo: L.totalCompra(c) };
  };
  L.mudarStatus = function (lista, id, st, hoje) {
    var c = (lista || []).filter(function (x) { return x.id === id; })[0]; if (!c) throw new Error('Cotação não encontrada.');
    if (L.STATUS_COT.indexOf(st) < 0) throw new Error('Status inválido.');
    if (st === 'Escolhido') return L.escolher(lista, id, hoje);
    if (st === 'Comprado' && ['Cotado', 'Escolhido'].indexOf(c.status) < 0) throw new Error('Só dá para marcar Comprado uma cotação Cotada/Escolhida.');
    if (st === 'Comprado' && !L.cotacaoValida(c, hoje)) throw new Error('Cotação vencida: confirme o preço com o fornecedor e cadastre de novo.');
    if (st === 'Recebido' && c.status !== 'Comprado') throw new Error('Marque Comprado antes de Recebido.');
    c.status = st; if (st === 'Comprado') c.compradoEm = hoje; if (st === 'Recebido') c.recebidoEm = hoje; return c;
  };
  L.repor = function (i) { var mi = num(i.minimo), q = num(i.qtd); return isFinite(mi) && i.minimo !== '' && isFinite(q) && i.qtd !== '' && q <= mi; };
  L.ultimoCustoInsumo = function (lista, item) {
    var l = (lista || []).filter(function (c) { return (c.os === 'Insumo' || c.insumo === true) && (c.status === 'Comprado' || c.status === 'Recebido') && V.norm(c.peca) === V.norm(item); })
      .sort(function (a, b) { return String(b.compradoEm || b.data) < String(a.compradoEm || a.data) ? -1 : 1; });
    return l[0] ? { custo: l[0].custoPosto, fornecedor: l[0].fornecedor, data: l[0].compradoEm || l[0].data, id: l[0].id } : null;
  };
  /** Cotação de Insumo recebida: soma na quantidade do item (se o Pedro já informou a quantidade atual). */
  L.receberInsumo = function (loja, c, hoje) {
    if (c.os !== 'Insumo') return null; var i = loja.insumos.filter(function (x) { return V.norm(x.item) === V.norm(c.peca); })[0]; if (!i) return null;
    if (i.qtd !== '' && isFinite(num(i.qtd))) i.qtd = num(i.qtd) + c.qtd; i.ultimaCompra = hoje; if (!i.fornecedor) i.fornecedor = c.fornecedor; return i;
  };

  // ================= 8) Calculadora de PCs (Módulo 7) =================
  L.COMPONENTES = ['Processador', 'Placa-mãe', 'Memória RAM', 'SSD', 'Placa de vídeo', 'Fonte', 'Gabinete', 'Coolers']; // mesma lista do CRM (LM_COMPONENTES)
  L.MAX_COMPARAR = 4;
  /** Taxa da maquininha da planilha (Configurações). 3,15 = 3,15%; 0,0315 também é aceito. Vazio = não cadastrada. */
  L.taxaPct = function (t) { var n = num(t); if (!isFinite(n) || n < 0) return null; return n > 0 && n < 0.3 ? r2(n * 100) : n; };
  /** pc: { nome, itens:[{tipo, cotacao, qtd}], margem, preco (manual, de venda), montagem (valor do Catálogo) }. Custo de peça SÓ de cotação válida. */
  L.calcPC = function (pc, cotacoes, hoje, cfg) {
    cfg = cfg || {}; var faltam = [], custo = 0, linhas = [];
    (pc.itens || []).forEach(function (it) {
      var c = (cotacoes || []).filter(function (x) { return x.id === it.cotacao; })[0], q = Math.max(1, Math.round(num(it.qtd) || 1));
      if (!c || !L.cotacaoValida(c, hoje) || !(Number(c.custoPosto) > 0)) { faltam.push(it.tipo); linhas.push({ tipo: it.tipo, qtd: q, cot: c || null, custo: null, vencida: !!c }); return; }
      var v = r2(c.custoPosto * q); custo += v; linhas.push({ tipo: it.tipo, qtd: q, cot: c, custo: v });
    });
    custo = r2(custo); var completo = linhas.length > 0 && !faltam.length, m = num(pc.margem), mont = num(pc.montagem) > 0 ? num(pc.montagem) : 0;
    var sugerido = completo && m >= 0 && m < 90 ? r2(custo / (1 - m / 100) + mont) : null;
    var manual = num(pc.preco), preco = manual > 0 ? r2(manual) : sugerido;
    var lucro = completo && preco ? r2(preco - custo) : null, pix = Number(cfg.pix);
    var cartoes = (cfg.taxas || []).filter(function (t) { return !/^(dinheiro|pix)$/i.test(t.forma || ''); }).map(function (t) {
      var tx = L.taxaPct(t.taxa); if (tx == null || t.taxa === '' || !preco) return { forma: t.forma, taxa: null };
      return { forma: t.forma, taxa: tx, liquido: r2(preco * (1 - tx / 100)), precoParaReceber: tx < 95 ? r2(preco / (1 - tx / 100)) : null, lucro: lucro == null ? null : r2(preco * (1 - tx / 100) - custo) }; });
    return { linhas: linhas, faltam: faltam, completo: completo, custoPecas: completo ? custo : null, custoParcial: custo, montagem: mont, sugerido: sugerido, preco: preco, manual: manual > 0,
      lucro: lucro, margemReal: lucro != null && preco ? Math.round(lucro / preco * 1000) / 10 : null, prejuizo: lucro != null && lucro < 0,
      pixPct: isFinite(pix) ? pix : null, precoPix: preco && isFinite(pix) ? r2(preco * (1 - pix / 100)) : null,
      lucroPix: lucro != null && isFinite(pix) ? r2(preco * (1 - pix / 100) - custo) : null, cartoes: cartoes };
  };
  L.anuncioPC = function (pc, calc, whatsLoja) {
    var l = ['🖥️ ' + (pc.nome || 'PC montado pela ProFix'), ''];
    calc.linhas.forEach(function (x) { if (x.cot) l.push('• ' + x.tipo + ': ' + (x.qtd > 1 ? x.qtd + '× ' : '') + x.cot.peca + (x.cot.marca ? ' ' + x.cot.marca : '') + (x.cot.condicao && x.cot.condicao !== 'Novo' ? ' (' + x.cot.condicao.toLowerCase() + ')' : '')); });
    l.push('');
    if (calc.preco) { l.push('💰 ' + brl(calc.preco) + (calc.precoPix ? ' · no Pix à vista: ' + brl(calc.precoPix) : '')); }
    l.push('Montado e testado pela ProFix Computadores, em Sorocaba.', 'Atendimento com hora marcada.', '📲 WhatsApp ' + (whatsLoja || '(15) 98112-8309') + ' · Instagram @profixcomputadores');
    return l.join('\n');
  };
  L.compararPCs = function (pcs, cotacoes, hoje, cfg) { return (pcs || []).slice(0, L.MAX_COMPARAR).map(function (p) { return { pc: p, calc: L.calcPC(p, cotacoes, hoje, cfg) }; }); };

  // ================= 9) v0.8.6/0.8.7: Módulo 9 ligado ao CRM (API @113/@115) =================
  // Contrato (crm-v3/ListaMestra.gs, só leitura): listarFornecedores / listarCotacoes({os?}) / listarInsumos (leitura);
  // salvarCotacao / mudarStatusCotacao / salvarInsumo (escrita, idOperacao). NÃO existem: lmSalvarFornecedor, lmSalvarPC.
  L.ACOES_M9 = { leitura: ['listarFornecedores', 'listarCotacoes', 'listarInsumos'], escrita: ['salvarCotacao', 'mudarStatusCotacao', 'salvarInsumo'] };
  L.STATUS_COT_CRM = ['Cotado', 'Escolhido', 'Comprado', 'Descartado']; // o CRM não tem "Recebido"
  L.CAT_SAIDA = ['Compra de peça', 'Deslocamento', 'Ferramentas', 'DAS-MEI', 'Marketing', 'Outros']; // CATEGORIAS_SAIDA do crm-v3
  var RE_FN_CRM = /^FN-\d+$/;
  var simNao = function (v) { return v === true || /^(s|sim|true|1|x)$/i.test(String(v == null ? '' : v).trim()); };
  /** listarFornecedores → [{id, nome, ativo}] (sem contatos). null = lista não veio. */
  L.normFornecedores = function (l) {
    if (!Array.isArray(l)) return null;
    return l.map(function (f) { f = f || {}; var a = f.ativo; return { id: String(f.id || '').trim().toUpperCase(), nome: String(f.nome || '').trim(), ativo: !(a === false || /^(n|nao|não|false|0)$/i.test(String(a == null ? '' : a).trim())) }; })
      .filter(function (f) { return RE_FN_CRM.test(f.id); });
  };
  L.rotuloForn = function (f) { return f.id + (f.nome ? ' · ' + f.nome : '') + (f.ativo === false ? ' (desativado)' : ''); };
  /** Opções do seletor: só ativos; um desativado só aparece se já estava escolhido. */
  L.opcoesFornecedor = function (lista, atual) {
    atual = String(atual || '').trim().toUpperCase();
    return (lista || []).filter(function (f) { return f.ativo !== false || f.id === atual; }).map(function (f) { return { id: f.id, nome: f.nome, ativo: f.ativo !== false, rotulo: L.rotuloForn(f) }; });
  };
  /** "FN-0001 · Nome" → "FN-0001". Texto que não começa com FN-xxxx volta como foi digitado (a validação recusa). */
  L.idDoRotulo = function (s) { var m = String(s || '').trim().toUpperCase().match(/^(FN-\d+)/); return m ? m[1] : String(s || '').trim(); };
  /** Cotação do CRM → formato do App. Custo da Calculadora = SÓ custoPosto (do servidor; se faltar, mesma conta com unit/qtd/frete). custoFinal (preço+frete) nunca vira custo unitário. */
  L.cotDoCRM = function (x, hoje) {
    x = x || {}; var ins = simNao(x.insumo), os = String(x.os || '').trim(); if (ins && !os) os = 'Insumo';
    var q = num(x.qtd), qtd = q > 0 ? q : 1, unit = num(x.precoUnit), frete = num(x.frete); if (!(frete >= 0)) frete = 0;
    var cp = num(x.custoPosto), custoPosto = cp > 0 ? r2(cp) : L.custoPosto(unit, qtd, frete);
    var tot = num(x.total), validade = String(x.validade || '').slice(0, 10), st = L.STATUS_COT_CRM.indexOf(x.status) >= 0 ? x.status : 'Cotado';
    return { id: String(x.id || ''), data: String(x.data || '').slice(0, 10), os: os, insumo: ins, fornecedor: String(x.fornecedorId || '').trim().toUpperCase(), fornecedorNome: String(x.fornecedor || ''),
      peca: String(x.componente || x.peca || ''), marca: String(x.marcaModelo || ''), condicao: String(x.condicao || ''), qtd: qtd, unit: isFinite(unit) ? r2(unit) : NaN, frete: r2(frete),
      custoPosto: custoPosto, total: isFinite(tot) ? r2(tot) : r2(unit * qtd + frete), custoFinal: isFinite(num(x.custoFinal)) ? r2(num(x.custoFinal)) : null,
      prazo: x.prazoDias === '' || x.prazoDias == null ? '' : String(x.prazoDias), forma: String(x.formaPagamento || ''), validade: validade,
      vencida: x.vencida === true || (!!validade && !!hoje && validade < hoje) || !validade, fonte: String(x.fonte || ''), status: st, escolhida: x.escolhida === true,
      garantia: String(x.garantiaFornecedor || ''), obs: String(x.obs || ''), origem: 'crm' };
  };
  /** Cotação validada (validarCotacao) → args do salvarCotacao. Não manda custo: o servidor recalcula custoPosto e total. */
  L.cotParaCRM = function (c, obsExtra) {
    var ins = c.os === 'Insumo', obs = [];
    if (c.autorizadoUsado && c.condicao && c.condicao !== 'Novo' && !/CDC art\. 21/.test(c.obs || '')) obs.push('Cliente autorizou peça ' + c.condicao.toLowerCase() + ' (CDC art. 21).');
    if (obsExtra) obs.push(obsExtra); if (c.obs) obs.push(String(c.obs));
    var o = { os: ins ? '' : c.os, insumo: ins, componente: c.peca, fornecedorId: c.fornecedor, marcaModelo: c.marca || '', condicao: c.condicao || '', qtd: c.qtd, precoUnit: c.unit, frete: c.frete || 0,
      prazoDias: c.prazo === '' || c.prazo == null ? '' : c.prazo, formaPagamento: c.forma || '', validade: c.validade, fonte: c.fonte, garantiaFornecedor: c.garantia || '', obs: obs.join(' ') };
    if (c.id && c.origem === 'crm') o.id = c.id;
    return o;
  };
  /** Insumo do CRM (aba Estoque) → App. fornecedorId é a fonte da verdade (não adivinha pelo nome: dois FN podem ter o mesmo). fornecedor = nome para exibir. Mínimo 0 = "sem mínimo". */
  L.insumoDoCRM = function (x, forns) {
    x = x || {}; var q = num(x.qtd), mi = num(x.minimo), nome = String(x.fornecedor || '').trim();
    var fn = String(x.fornecedorId || '').trim().toUpperCase();
    if (!RE_FN_CRM.test(fn)) fn = '';
    else if (forns) { var f = forns.filter(function (k) { return k.id === fn; })[0]; if (f) nome = f.nome; }
    return { id: String(x.id || ''), item: String(x.item || ''), categoria: String(x.categoria || ''), qtd: isFinite(q) ? q : '', minimo: mi > 0 ? mi : '', fornecedor: fn, fornecedorNome: nome,
      link: /^https?:\/\//i.test(String(x.link || '')) ? String(x.link) : '', ultimaCompra: '', repor: x.repor === true, origem: 'crm' };
  };
  /** Formulário de insumo → args do salvarInsumo (API @115). O CRM exige a quantidade atual.
   *  Manda fornecedorId: 'FN-xxxx' ao escolher; '' ao limpar; omite o campo se não mudou (edição mantém) ou se o novo insumo fica sem fornecedor. */
  L.insumoParaCRM = function (v, antes, forns) {
    v = v || {}; antes = antes || {};
    var item = String(v.item || '').trim(); if (!item) throw new Error('Informe o item.');
    var qs = String(v.qtd == null ? '' : v.qtd).trim(), q = num(qs); if (qs === '' || !(q >= 0)) throw new Error('Informe a quantidade atual (0 se acabou). O CRM não grava insumo sem quantidade.');
    var ms = String(v.minimo == null ? '' : v.minimo).trim(), mi = ms === '' ? '' : num(ms); if (mi !== '' && !(mi >= 0)) throw new Error('Estoque mínimo inválido.');
    var fn = L.idDoRotulo(v.fornecedor), antesFn = String(antes.fornecedor || '').trim().toUpperCase();
    if (fn && !RE_FN_CRM.test(fn)) throw new Error('Fornecedor: use o código da lista do CRM (FN-xxxx).');
    if (fn && forns && forns.length) { var f = forns.filter(function (k) { return k.id === fn; })[0]; if (!f) throw new Error('Fornecedor "' + fn + '" não está na lista de fornecedores.'); if (!f.ativo) throw new Error('Fornecedor ' + f.nome + ' (' + f.id + ') está desativado.'); }
    var o = { item: item, qtd: q, minimo: mi }; if (antes.id && antes.origem === 'crm') o.id = antes.id;
    if (fn && fn === antesFn) return o;
    if (fn) o.fornecedorId = fn;
    else if (antesFn) o.fornecedorId = '';
    return o;
  };
  /** Há algo no aparelho (0.8.5) que vale a pena levar ao CRM? Os 7 itens-modelo vazios não contam. */
  L.temDadosLocais = function (loja) {
    loja = L.normLoja(loja);
    return loja.cotacoes.length > 0 || loja.insumos.some(function (i) { return i.qtd !== '' || i.minimo !== '' || !!i.fornecedor || L.INSUMOS_INICIAIS.indexOf(i.item) < 0; });
  };
  /**
   * Plano do envio único (aparelho → CRM). Lista do CRM vazia → envia; CRM já tem dados → vale o CRM (aparelho fica só como cópia/Exportar).
   * Comprado/Recebido do aparelho: entra Comprado SEM lançar caixa (evita lançamento em dobro); vencida fica Cotado (o CRM não aceita Comprado vencida).
   */
  L.planoEnvioCRM = function (loja, crm, forns, hoje, env) {
    loja = L.normLoja(loja); crm = crm || {}; env = env || {}; var pul = [], cots = [], ins = [], mc = env.mapa || {}, mi = env.insumos || {};
    // Envio interrompido: o que ESTE aparelho já mandou não conta como "o CRM já tem dados" e não vai de novo.
    var meus = function (m) { return Object.keys(m).map(function (k) { return m[k]; }); }, jaC = meus(mc), jaI = meus(mi);
    var crmCot = (crm.cotacoes || []).some(function (c) { return jaC.indexOf(c.id) < 0; }), crmIns = (crm.insumos || []).some(function (i) { return jaI.indexOf(i.id) < 0; });
    var fOk = function (id) { if (!forns || !forns.length) return ''; var f = forns.filter(function (k) { return k.id === String(id || '').toUpperCase(); })[0]; return !f ? 'fornecedor ' + id + ' não está na lista do CRM' : !f.ativo ? 'fornecedor ' + f.nome + ' (' + f.id + ') está desativado' : ''; };
    loja.cotacoes.forEach(function (c) {
      if (mc[c.id]) return;
      if (crmCot) return pul.push({ id: c.id, motivo: 'o CRM já tem cotações (vale o CRM)' });
      var m = fOk(c.fornecedor); if (m) return pul.push({ id: c.id, motivo: m });
      if (!String(c.fonte || '').trim()) return pul.push({ id: c.id, motivo: 'sem fonte' });
      var depois = null, nota = '';
      if (c.status === 'Escolhido') depois = L.cotacaoValida(c, hoje) ? 'Escolhido' : null;
      else if (c.status === 'Descartado') depois = 'Descartado';
      else if (c.status === 'Comprado' || c.status === 'Recebido') { if (L.cotacaoValida(Object.assign({}, c, { status: 'Cotado' }), hoje)) depois = 'Comprado'; else nota = 'estava ' + c.status + ' no aparelho, mas venceu: entra como Cotado'; }
      var extra = 'Veio do aparelho: ' + c.id + ' de ' + V.dataBR(c.data) + (c.status !== 'Cotado' ? ', status ' + c.status : '') + (c.lancadoCaixa ? ', saída já lançada no caixa em ' + V.dataBR(c.lancadoCaixa) : '') + '.';
      cots.push({ local: c.id, args: L.cotParaCRM(c, extra), depois: depois, nota: nota });
    });
    loja.insumos.forEach(function (i) {
      var vazio = i.qtd === '' && i.minimo === '' && !i.fornecedor; if ((vazio && L.INSUMOS_INICIAIS.indexOf(i.item) >= 0) || mi[i.id]) return;
      if (crmIns) return pul.push({ id: i.id, motivo: 'o CRM já tem insumos (vale o CRM)' });
      if (i.qtd === '' || !(num(i.qtd) >= 0)) return pul.push({ id: i.id, motivo: i.item + ': sem quantidade atual (o CRM exige)' });
      var fn = String(i.fornecedor || '').toUpperCase(), m = fn ? fOk(fn) : '', nota = m ? 'sem fornecedor: ' + m : '';
      var args = { item: i.item, qtd: num(i.qtd), minimo: i.minimo === '' ? '' : num(i.minimo) }; if (fn && !m) args.fornecedorId = fn;
      ins.push({ local: i.id, args: args, nota: nota });
    });
    return { cotacoes: cots, insumos: ins, pulados: pul, crmTemCotacoes: crmCot, crmTemInsumos: crmIns };
  };
  /** PCs salvos (ficam no aparelho) apontam para ids de cotação: troca os ids do aparelho pelos do CRM depois do envio. */
  L.remapPCs = function (pcs, mapa) {
    var n = 0; (pcs || []).forEach(function (p) { (p.itens || []).forEach(function (it) { if (mapa[it.cotacao]) { it.cotacao = mapa[it.cotacao]; n++; } }); }); return n;
  };
  /** Mesma lista de categorias de Saída do CRM, filtrada pelo que a planilha tem. */
  L.categoriasSaida = function (cats) { var l = (cats || []).filter(function (c) { return L.CAT_SAIDA.indexOf(c) >= 0; }); return l.length ? l : L.CAT_SAIDA.slice(); };

  return L;
});
