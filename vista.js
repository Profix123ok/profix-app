/* Funções de APRESENTAÇÃO (sem regra de negócio de CRM). Se o crm-v3 mandar listas prontas
 * (ex.: dados.praHoje), o app usa as dele; o que está aqui é só o fallback do protótipo. */
(function (raiz, fabrica) { var m = fabrica(); if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFixVista = m; })(typeof self !== 'undefined' ? self : this, function () {
  var V = {};
  V.somaDias = function (iso, n) { var p = iso.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); };
  V.dataBR = function (iso) { if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || ''; var p = iso.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  V.brl = function (v) { var n = Number(v); if (v === '' || v == null || isNaN(n)) return '—'; return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  V.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  V.norm = function (s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  V.numeroWa = function (tel) { var d = String(tel || '').replace(/\D/g, '').replace(/^0+/, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return (d.length === 12 || d.length === 13) && d.indexOf('55') === 0 ? d : null; };

  // ---- Regras de contato ESPELHADAS do crm-v3 (Index.html: L.bloqueadaOp, L.modeloOp, L.temWhatsCliente) ----
  // Oportunidade: bloqueada se status "Não contatar" ou consentimento "Não contatar"/"Recusou"/"Revogado".
  V.bloqueadaOp = function (o) { if (!o) return true; if (o.status === 'Não contatar') return true; var c = V.norm(o.consentOp).trim(); return ['nao contatar', 'recusou', 'revogado', 'revogou'].indexOf(c) >= 0; };
  V.podeWaOp = function (o) { return !V.bloqueadaOp(o) && !!V.numeroWa(o.whatsapp); }; // só o WhatsApp comercial publicado pela empresa
  // Cliente: consentimento "Sim" e número de celular (13 dígitos com 9).
  V.podeWaCliente = function (c) { var n = c && c.consent === 'Sim' && V.numeroWa(c.whatsapp); return !!n && n.length === 13 && n.charAt(4) === '9'; };
  V.MODELO_OP = { 'Nova': 'Empresa – Primeiro contato', 'Contatada': 'Empresa – Lembrete único (3 dias)', 'Sem resposta': 'Empresa – Lembrete único (3 dias)',
    'Virou lead': 'Empresa – Respondeu com interesse', 'Descartada': 'Empresa – Agora não' };
  V.preencher = function (texto, o) {
    var nome = String(o.contato || o.responsavel || o.nome || o.empresa || '').trim();
    return String(texto || '').replace(/\{empresa\}/g, o.empresa || nome).replace(/\{contato\}/g, o.responsavel || 'tudo bem').replace(/\{primeiro_nome\}/g, nome.split(' ')[0]).replace(/\{equipamento\}/g, o.equipamento || 'equipamento').replace(/\{os\}/g, o.num || '');
  };
  // Nome de modelo normalizado: travessões/hífens iguais, espaços colapsados, sem caixa e sem acento.
  V.normModelo = function (s) { return V.norm(String(s || '').replace(/[\u2010-\u2015\u2212-]/g, '-')).replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim(); };
  V.acharModelo = function (modelos, nome) { var n = V.normModelo(nome); if (!n) return null; return (modelos || []).filter(function (x) { return x && x.texto && V.normModelo(x.modelo) === n; })[0] || null; };
  /** Nome do modelo da oportunidade: modeloSugerido do servidor (API v19) se existir na lista; senão a regra por etapa. */
  V.nomeModeloOp = function (modelos, o) {
    if (V.bloqueadaOp(o)) return '';
    var sug = o && o.modeloSugerido ? V.acharModelo(modelos, o.modeloSugerido) : null;
    if (sug) return sug.modelo;
    var nome = V.MODELO_OP[o.status || 'Nova'] || V.MODELO_OP.Nova;
    var m = (modelos || []).filter(function (x) { return x.modelo === nome; })[0];
    return m ? m.modelo : '';
  };
  /** Texto de um modelo (nome escolhido pelo usuário ou o padrão) preenchido para a oportunidade. Bloqueada → ''. */
  V.modeloOp = function (modelos, o, nomeEscolhido) {
    if (V.bloqueadaOp(o)) return '';
    var nome = nomeEscolhido != null ? nomeEscolhido : V.nomeModeloOp(modelos, o);
    var m = (modelos || []).filter(function (x) { return x.modelo === nome; })[0];
    return m ? V.preencher(m.texto, o) : '';
  };
  V.linkWaOp = function (modelos, o, nomeEscolhido) { if (!V.podeWaOp(o)) return null; var t = V.modeloOp(modelos, o, nomeEscolhido); return 'https://wa.me/' + V.numeroWa(o.whatsapp) + (t ? '?text=' + encodeURIComponent(t) : ''); };
  V.linkWaCliente = function (c, texto) { if (!V.podeWaCliente(c)) return null; return 'https://wa.me/' + V.numeroWa(c.whatsapp) + (texto ? '?text=' + encodeURIComponent(texto) : ''); };
  /** Espelho local de registrarContatoOp (crm-v3) para a tela mudar na hora, inclusive sem internet. O servidor é quem decide. */
  V.aplicarContatoOp = function (o, hoje, canal) {
    var antes = o.status || 'Nova';
    if (antes === 'Nova') { o.status = 'Contatada'; o.lembrete = V.somaDias(hoje, 3); if (!o.proximoPasso) o.proximoPasso = 'Cobrar retorno (uma vez só)'; }
    else if (antes === 'Contatada') { o.status = 'Sem resposta'; o.lembrete = ''; o.proximoPasso = 'Lembrete único enviado: aguardar a empresa'; }
    o.ultimoContato = hoje; o.historico = (o.historico ? o.historico + '\n' : '') + V.dataBR(hoje) + ' – ' + (canal || 'WhatsApp');
    return o;
  };

  // ---- OS ----
  V.recebidoOS = function (D, num) { return (D.financeiro || []).filter(function (f) { return f.os === num && f.tipo === 'Entrada'; }).reduce(function (s, f) { return s + (Number(f.receita) || 0); }, 0); };
  V.saldoOS = function (D, o) { var v = Number(o.valor) || 0; return Math.round((v - V.recebidoOS(D, o.num)) * 100) / 100; };
  V.pecasOS = function (D, num) { return (D.pecas || []).filter(function (p) { return p.os === num; }); };
  V.custoPecasOS = function (D, num) { return V.pecasOS(D, num).reduce(function (s, p) { return s + (Number(p.custoUnit) || 0) * (Number(p.qtd) || 1); }, 0); };
  /** Senha do aparelho: só aparece se o servidor mandou E o ajuste "Mostrar senha do aparelho" estiver ligado. */
  V.textoSenha = function (o, mostrar) {
    if (!('senha' in o)) return 'não enviada pelo servidor';
    if (!o.senha) return '—';
    return mostrar ? String(o.senha) : '•••• (oculta)';
  };
  // ---- Revenda / Financeiro ----
  V.custoRevenda = function (r) { return ['precoCompra', 'frete', 'pecas', 'insumos'].reduce(function (s, k) { return s + (Number(r[k]) || 0); }, 0); };
  V.lucroRevenda = function (r) { var p = Number(r.precoVenda || r.anunciado) || 0; return p ? Math.round((p - V.custoRevenda(r)) * 100) / 100 : null; };
  V.resumoMes = function (D, ym) {
    var e = 0, s = 0; (D.financeiro || []).forEach(function (f) { if (String(f.data).slice(0, 7) !== ym) return; if (f.tipo === 'Entrada') e += Number(f.receita) || 0; else s += Number(f.custo) || 0; });
    return { entradas: e, saidas: s, saldo: Math.round((e - s) * 100) / 100 };
  };
  V.funil = function (D) { var g = {}; (D.etapas || []).forEach(function (et) { g[et] = []; }); (D.clientes || []).forEach(function (c) { (g[c.etapa || 'Lead'] = g[c.etapa || 'Lead'] || []).push(c); }); return g; };
  /** A planilha tem a coluna? (o crm-v3 só manda o campo se a coluna existir) */
  V.temCampo = function (lista, k, colunas) { if (Array.isArray(colunas)) return colunas.indexOf(k) >= 0; return (lista || []).some(function (x) { return x && k in x; }); };
  // ---- Maps / Agenda / Gmail ----
  /** Link de rota no Google Maps (sem chave de API). '' se não houver endereço. */
  V.linkMaps = function (end) { end = String(end || '').trim(); return end ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(end) : ''; };
  V.enderecoOS = function (D, o) { var c = (D.clientes || []).find(function (k) { return k.nome === o.cliente; }); return String((o && o.endereco) || (c && c.endereco) || '').trim(); };
  V.clienteDaOS = function (D, o) { return (D.clientes || []).find(function (k) { return k.nome === o.cliente; }) || null; };
  /** E-mail só com consentimento LGPD = Sim e endereço de e-mail válido. */
  V.podeEmailCliente = function (c) { return !!c && c.consent === 'Sim' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(c.email || '').trim()); };
  /** Textos padrão copiados de crm/emails-prontos-os.md (rascunho do Atendimento ProFix, 25/10/2026). */
  V.EMAILS = {
    orcamento: { rotulo: 'Orçamento', assunto: 'Orçamento do seu {equipamento} — ProFix Computadores',
      corpo: 'Oi, {nome}, tudo bem?\nTerminei a avaliação do seu {equipamento}:\n- O que encontrei: {diagnostico}\n- O que precisa ser feito: {servico}\n- Valor: R$ {valor}\n- Prazo: {prazo}\nEste orçamento vale por {validade_dias} dias. Se quiser seguir, é só responder este e-mail ou me chamar no WhatsApp {whatsapp_loja}. Qualquer dúvida, fico à disposição.\nAbraço,\nPedro — ProFix Computadores' },
    pronto: { rotulo: 'Pronto para retirar', assunto: 'Seu {equipamento} está pronto — ProFix Computadores',
      corpo: 'Oi, {nome}!\nSeu {equipamento} está pronto. Me chama no WhatsApp {whatsapp_loja} pra combinarmos o melhor horário de retirada.\nO serviço tem {garantia_dias} dias de garantia a partir da entrega.\nObrigado pela confiança!\nPedro — ProFix Computadores' }
  };
  // O rodapé LGPD é acrescentado PELO SERVIDOR (crm-v3 RODAPE_LGPD_EMAIL); o app não repete para não sair duplicado.
  V.RODAPE_LGPD_SERVIDOR = 'ProFix Computadores. Você recebe esta mensagem porque autorizou o contato. Para não receber mais mensagens, responda SAIR.';
  /** Monta {assunto, corpo} para a OS. Validade/garantia vêm do config (null = pendente -> "[CONFIRMAR …]", que bloqueia o envio). */
  V.montarEmail = function (tipo, o, c, cfg) {
    cfg = cfg || {}; var t = V.EMAILS[tipo]; o = o || {};
    var nome = String((c && c.nome) || o.cliente || '').trim().split(' ')[0] || 'tudo bem';
    var val = o.orcamento || o.valor;
    var dados = { nome: nome, equipamento: o.equipamento || 'equipamento', diagnostico: o.diagnostico || '[descreva o diagnóstico]', servico: o.itensOrc || o.servico || '[descreva o serviço]',
      valor: val === '' || val == null ? '[valor]' : Number(val).toFixed(2).replace('.', ','), prazo: o.previsao ? V.dataBR(o.previsao) : 'a combinar',
      validade_dias: cfg.VALIDADE_ORCAMENTO_DIAS ? String(cfg.VALIDADE_ORCAMENTO_DIAS) : '[CONFIRMAR validade]',
      garantia_dias: cfg.GARANTIA_DIAS ? String(cfg.GARANTIA_DIAS) : '[CONFIRMAR garantia]', whatsapp_loja: cfg.WHATSAPP_LOJA || '[WhatsApp da loja]' };
    var f = function (x) { return x.replace(/\{(\w+)\}/g, function (m, k) { return k in dados ? dados[k] : m; }); };
    return { assunto: f(t.assunto), corpo: f(t.corpo) };
  };
  V.temPendencia = function (texto) { return /\[CONFIRMAR/.test(String(texto || '')); };
  V.PRI = ['Alta', 'Média', 'Baixa'];
  // Cidade das oportunidades (getDados: oportunidades[].cidade). Vazia/ausente = "Sem cidade".
  V.SEM_CIDADE = '__sem__';
  V.limparCidade = function (c) { return String(c == null ? '' : c).replace(/\s+/g, ' ').trim(); };
  V.chaveCidade = function (c) { var l = V.limparCidade(c); return l ? V.norm(l) : V.SEM_CIDADE; };
  V.cidadesOps = function (lista) {
    var g = {};
    (lista || []).forEach(function (o) {
      var k = V.chaveCidade(o.cidade), nome = V.limparCidade(o.cidade);
      var x = g[k] || (g[k] = { chave: k, nome: k === V.SEM_CIDADE ? 'Sem cidade' : '', n: 0, variantes: {} });
      x.n++; if (nome) x.variantes[nome] = (x.variantes[nome] || 0) + 1;
    });
    var bom = function (v) { return v !== v.toUpperCase() && v !== v.toLowerCase() ? 1 : 0; };
    return Object.keys(g).map(function (k) {
      var x = g[k];
      if (!x.nome) {
        var vs = Object.keys(x.variantes).sort(function (a, b) { return (bom(b) - bom(a)) || (x.variantes[b] - x.variantes[a]) || (a < b ? -1 : 1); });
        x.nome = vs[0];
        if (!bom(x.nome)) x.nome = x.nome.toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/ (Da|De|Do|Das|Dos|E) /g, function (m) { return m.toLowerCase(); });
      }
      return { chave: x.chave, nome: x.nome, n: x.n };
    }).sort(function (a, b) { return (b.n - a.n) || ((a.chave === V.SEM_CIDADE) - (b.chave === V.SEM_CIDADE)) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  };
  V.filtrarOps = function (lista, f) {
    var q = V.norm(f.q);
    return (lista || []).filter(function (o) {
      if (f.status && o.status !== f.status) return false;
      if (f.prioridade && (o.prioridade || '') !== f.prioridade) return false;
      if (f.segmento && o.segmento !== f.segmento) return false;
      if (f.cidade && V.chaveCidade(o.cidade) !== f.cidade) return false;
      if (q && V.norm([o.empresa, o.segmento, o.bairro, o.proximoPasso, o.telefone, o.whatsapp, o.obs].join(' ')).indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) {
      var pa = V.PRI.indexOf(a.prioridade), pb = V.PRI.indexOf(b.prioridade); pa = pa < 0 ? 9 : pa; pb = pb < 0 ? 9 : pb;
      if (pa !== pb) return pa - pb; var la = a.lembrete || '9', lb = b.lembrete || '9'; return la < lb ? -1 : la > lb ? 1 : 0;
    });
  };

  /** Tela Hoje = "Pra hoje" do crm-v3 (L.praHoje): quem chamar, sem resposta há 3+ dias, OS para cobrar (saldo), paradas,
   *  mais tarefas e agenda. Se o servidor mandar dados.praHoje pronto, o app usa o dele. */
  V.hoje = function (D) {
    if (D.praHoje) return D.praHoje;
    var h = D.hoje, fim = V.somaDias(h, 7), chamar = [], semResposta = [], cobrar = [], paradas = [];
    var dias = function (a, b) { return /^\d{4}-/.test(a || '') ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : null; };
    (D.clientes || []).forEach(function (c) {
      if (c.proximo && c.proximo <= h && c.etapa !== 'Perdido') chamar.push({ tipo: 'cliente', ref: c, nome: c.nome, data: c.proximo, acao: c.acao || c.etapa });
      else if (c.etapa === 'Orçamento enviado' && dias(c.ultimo, h) >= 3) semResposta.push({ tipo: 'cliente', ref: c, nome: c.nome, data: c.ultimo, acao: 'Orçamento sem resposta' });
    });
    (D.oportunidades || []).forEach(function (o) {
      if (V.bloqueadaOp(o) || ['Virou lead', 'Descartada'].indexOf(o.status) >= 0) return;
      if (o.status === 'Contatada' && dias(o.ultimoContato, h) >= 3) semResposta.push({ tipo: 'op', ref: o, nome: o.empresa, data: o.ultimoContato, acao: 'Lembrete único (uma vez só)' });
      else if (o.lembrete && o.lembrete <= h) chamar.push({ tipo: 'op', ref: o, nome: o.empresa, data: o.lembrete, acao: o.proximoPasso || o.status });
    });
    (D.os || []).forEach(function (o) {
      var s = V.saldoOS(D, o);
      if (s > 0 && (o.status === 'Entregue' || o.status === 'Pronto')) cobrar.push({ ref: o, num: o.num, cliente: o.cliente, saldo: s, status: o.status });
      else if (['Entregue', 'Cancelado', 'Pronto'].indexOf(o.status) < 0 && dias(o.statusEm, h) >= 5) paradas.push({ ref: o, num: o.num, cliente: o.cliente, status: o.status });
    });
    var ord = function (a, b) { return String(a.data || '') < String(b.data || '') ? -1 : 1; };
    return { chamar: chamar.sort(ord), semResposta: semResposta.sort(ord), cobrar: cobrar, paradas: paradas,
      tarefas: (D.tarefas || []).filter(function (t) { return t.status !== 'Feita' && t.data && t.data <= h; }),
      agenda: (D.agenda || []).filter(function (a) { return a.data >= h && a.data <= fim; }) };
  };
  return V;
});
