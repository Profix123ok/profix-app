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
  V.podeWaCliente = function (c) { var n = c && c.consent === 'Sim' && !/^s/i.test(String(c.naoContatar || '').trim()) && V.numeroWa(c.whatsapp); return !!n && n.length === 13 && n.charAt(4) === '9'; };
  V.MODELO_OP = { 'Nova': 'Empresa – Primeiro contato', 'Contatada': 'Empresa – Lembrete único (3 dias)', 'Sem resposta': 'Empresa – Lembrete único (3 dias)',
    'Virou lead': 'Empresa – Respondeu com interesse', 'Descartada': 'Empresa – Agora não' };
  // v0.8.8: texto OFICIAL do 1º contato (Atendimento ProFix, 11/11/2026). Vale no App mesmo se a planilha ainda tiver o modelo antigo.
  V.NOME_PRIMEIRO_CONTATO = 'Empresa – Primeiro contato';
  V.SITE_OFICIAL = 'https://profixcomputadores.github.io/';
  V.TEXTO_PRIMEIRO_CONTATO = 'Olá! Tudo bem?\n\n' +
    'Me chamo Pedro, sou responsável pela ProFix Computadores. Oferecemos suporte técnico e manutenção preventiva em TI para empresas em Sorocaba, como a {empresa} ({segmento}), para que o escritório de vocês trabalhe com mais velocidade e menos interrupções por falhas ou travamentos nos equipamentos.\n\n' +
    'Deixo abaixo o link do nosso site oficial para consulta rápida das nossas soluções:\n🌐 ' + 'https://profixcomputadores.github.io/' + '\n\n' +
    'Gostaria de agendar uma breve ligação de 5 a 10 minutos esta semana para entender a estrutura de TI de vocês e apresentar como podemos otimizar o desempenho da sua equipe. Qual o melhor dia e horário para conversarmos?\n\n' +
    'Se preferir não receber mensagens, é só me avisar.';
  /** Ramo/segmento da empresa (campo existente o.segmento; aceita ramo/setor se vier). '' se vazio ou genérico ("Outro"). */
  V.ramoOp = function (o) { var r = String((o && (o.segmento || o.ramo || o.setor)) || '').trim(); return /^(outro|outros|-|—|n\/?a)$/i.test(r) ? '' : r; };
  V.preencher = function (texto, o) {
    o = o || {};
    var nome = String(o.contato || o.responsavel || o.nome || o.empresa || '').trim(), ramo = V.ramoOp(o);
    var t = String(texto || '');
    // v0.8.8: {segmento}/{ramo} vazio some sem deixar "()" nem "no ramo de" sobrando; onde precisa de substantivo, vira "empresas".
    if (!ramo) t = t.replace(/\s*\(\s*\{(segmento|ramo)\}\s*\)/g, '').replace(/,?\s*(no|do) (ramo|segmento) (de |da |do )?\{(segmento|ramo)\}/g, '');
    return t.replace(/\{empresa\}/g, o.empresa || nome).replace(/\{contato\}/g, o.responsavel || 'tudo bem').replace(/\{primeiro_nome\}/g, nome.split(' ')[0])
      .replace(/\{segmento\}|\{ramo\}/g, ramo || 'empresas')
      .replace(/\{equipamento\}/g, o.equipamento || 'equipamento').replace(/\{os\}/g, o.num || '');
  };
  /** Modelos do CRM com o 1º contato oficial do App (substitui o texto antigo da planilha ou entra na lista se faltar). */
  V.modelosOp = function (modelos) {
    var l = (modelos || []).slice(), achou = false;
    l = l.map(function (m) { if (m && V.normModelo(m.modelo) === V.normModelo(V.NOME_PRIMEIRO_CONTATO)) { achou = true; return Object.assign({}, m, { modelo: V.NOME_PRIMEIRO_CONTATO, texto: V.TEXTO_PRIMEIRO_CONTATO, oficialApp: true }); } return m; });
    if (!achou) l.unshift({ modelo: V.NOME_PRIMEIRO_CONTATO, texto: V.TEXTO_PRIMEIRO_CONTATO, quando: 'Oportunidade Nova', oficialApp: true });
    return l;
  };
  // Nome de modelo normalizado: travessões/hífens iguais, espaços colapsados, sem caixa e sem acento.
  V.normModelo = function (s) { return V.norm(String(s || '').replace(/[\u2010-\u2015\u2212-]/g, '-')).replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim(); };
  V.acharModelo = function (modelos, nome) { var n = V.normModelo(nome); if (!n) return null; return (modelos || []).filter(function (x) { return x && x.texto && V.normModelo(x.modelo) === n; })[0] || null; };
  /** Nome do modelo da oportunidade: modeloSugerido do servidor (API v19) se existir na lista; senão a regra por etapa. */
  V.nomeModeloOp = function (modelos, o) {
    if (V.bloqueadaOp(o)) return '';
    // v0.8.8: 1º contato (status Nova) usa sempre o texto oficial do App; os modelos por segmento continuam na lista para escolher.
    if (V.primeiroContatoOp(o)) return V.NOME_PRIMEIRO_CONTATO;
    var ms = V.modelosOp(modelos);
    var sug = o && o.modeloSugerido ? V.acharModelo(ms, o.modeloSugerido) : null;
    if (sug) return sug.modelo;
    var nome = V.MODELO_OP[o.status || 'Nova'] || V.MODELO_OP.Nova;
    var m = ms.filter(function (x) { return x.modelo === nome; })[0];
    return m ? m.modelo : '';
  };
  /** Texto de um modelo (nome escolhido pelo usuário ou o padrão) preenchido para a oportunidade. Bloqueada → ''. */
  V.modeloOp = function (modelos, o, nomeEscolhido) {
    if (V.bloqueadaOp(o)) return '';
    var nome = nomeEscolhido != null ? nomeEscolhido : V.nomeModeloOp(modelos, o);
    var m = V.modelosOp(modelos).filter(function (x) { return x.modelo === nome; })[0];
    return m ? V.preencher(m.texto, o) : '';
  };
  V.linkWaOp = function (modelos, o, nomeEscolhido) { if (!V.podeWaOp(o)) return null; var t = V.modeloOp(modelos, o, nomeEscolhido); return 'https://wa.me/' + V.numeroWa(o.whatsapp) + (t ? '?text=' + encodeURIComponent(t) : ''); };
  // v0.6.1: regra LGPD do WhatsApp. Mensagem da própria OS (status, orçamento, pronto para retirar, pós-entrega) pode sair sem
  // consentimento (com aviso). Marketing (reativação, aniversário, promoção, preventiva oferecida) só com consentimento "Sim".
  V.RE_MARKETING = /reativ|anivers|promo|preventiv|oferta|cupom|black ?friday|novidade|campanha|sumid|saudade/i;
  V.ehMarketing = function (texto) { return V.RE_MARKETING.test(V.norm(texto || '').replace(/[^a-z0-9 ]/g, ' ') + ' ' + String(texto || '')); };
  /** 'os' ou 'marketing'. Sem palavra de marketing e com OS do cliente = 'os'; cliente sem OS = 'marketing' (na dúvida, esconde). */
  V.tipoMsgCliente = function (D, c, texto) {
    if (V.ehMarketing(texto)) return 'marketing';
    return c && (D && D.os || []).some(function (o) { return o.cliente === c.nome; }) ? 'os' : 'marketing';
  };
  /** {href, aviso} ou null. Só monta link wa.me: nunca envia. */
  V.botaoWaCliente = function (c, tipo, texto) {
    var n = c && V.numeroWa(c.whatsapp); if (!n || n.length !== 13 || n.charAt(4) !== '9') return null;
    if (/^s/i.test(String(c.naoContatar || '').trim())) return null; // v0.7.0: "Não contatar" = Sim bloqueia tudo (contrato crm-v3)
    var href = 'https://wa.me/' + n + (texto ? '?text=' + encodeURIComponent(texto) : '');
    if (c.consent === 'Sim') return { href: href, aviso: false };
    return tipo === 'os' ? { href: href, aviso: true } : null;
  };
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
  /** Monta {assunto, corpo} para a OS. Validade/garantia vêm do servidor (cfg.validadeDias/garantiaDias, de getDados().config; sem valor = pendente -> "[CONFIRMAR …]", que bloqueia o envio). */
  V.montarEmail = function (tipo, o, c, cfg) {
    cfg = cfg || {}; var t = V.EMAILS[tipo]; o = o || {};
    var nome = String((c && c.nome) || o.cliente || '').trim().split(' ')[0] || 'tudo bem';
    var val = o.orcamento || o.valor;
    var dados = { nome: nome, equipamento: o.equipamento || 'equipamento', diagnostico: o.diagnostico || '[descreva o diagnóstico]', servico: o.itensOrc || o.servico || '[descreva o serviço]',
      valor: val === '' || val == null ? '[valor]' : Number(val).toFixed(2).replace('.', ','), prazo: o.previsao ? V.dataBR(o.previsao) : 'a combinar',
      validade_dias: cfg.validadeDias ? String(cfg.validadeDias) : '[CONFIRMAR validade]',
      garantia_dias: cfg.garantiaDias ? String(cfg.garantiaDias) : '[CONFIRMAR garantia]', whatsapp_loja: cfg.WHATSAPP_LOJA || '[WhatsApp da loja]' };
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
  /** Filtro "WhatsApp" (v0.5.6): empresa que dá para chamar no WhatsApp pelo app agora (WhatsApp comercial válido e não bloqueada). */
  V.temWaOp = function (o) { return V.podeWaOp(o); };
  /** 1º contato? Só status inicial (Nova/vazio). Status posteriores nunca mudam por toque em contato. */
  V.primeiroContatoOp = function (o) { return !!o && !V.bloqueadaOp(o) && ['', 'Nova', 'Novo', 'Aberta', 'Aberto'].indexOf(String(o.status || '').trim()) >= 0; };
  // v0.8.8: "Ainda não contactei" × "Já contactei". Nova/vazio sem registro de contato = não contactei; Descartada/Não contatar sem contato ficam fora dos dois.
  V.SITUACAO_CONTATO = { nao: 'Ainda não contactei', sim: 'Já contactei' };
  V.contatoOp = function (o) {
    if (!o) return '';
    var st = String(o.status || '').trim(), teve = !!(o.ultimoContato || String(o.historico || '').trim());
    if (['', 'Nova', 'Novo', 'Aberta', 'Aberto'].indexOf(st) >= 0) return teve ? 'sim' : 'nao';
    if ((st === 'Descartada' || st === 'Não contatar') && !teve) return '';
    return 'sim';
  };
  V.contagemContatoOps = function (lista) { var c = { nao: 0, sim: 0 }; (lista || []).forEach(function (o) { var k = V.contatoOp(o); if (k) c[k]++; }); return c; };
  /** Linhas do histórico (mais recente primeiro). Cada linha: { data (dd/mm/aaaa ou ISO como veio), canal, texto }. */
  V.historicoOp = function (o) {
    return String((o && o.historico) || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m = l.match(/^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2})?)?\s*[–—-]\s*(.*)$/);
      var resto = m ? m[2] : l, canal = (resto.match(/^(WhatsApp|Liga[çc][ãa]o|E-?mail|Telefone|Visita|Instagram|Presencial)/i) || [])[1] || '';
      return { data: m ? m[1] : '', canal: canal, texto: resto };
    }).reverse();
  };
  /** Último contato: { data ISO/BR, canal } a partir de ultimoContato + histórico (o canal só aparece se o histórico disser). */
  V.ultimoContatoOp = function (o) {
    var h = V.historicoOp(o)[0], data = (o && o.ultimoContato) || (h && h.data) || '';
    if (!data) return null;
    var canal = (o && o.canalUltimoContato) || (h ? h.canal : '') || '';
    return { data: data, canal: canal };
  };
  V.linkTelOp = function (o) { if (V.bloqueadaOp(o)) return null; var d = String(o.telefone || o.whatsapp || '').replace(/[^\d+]/g, ''); return d.replace(/\D/g, '').length >= 8 ? 'tel:' + d : null; };
  V.linkEmailOp = function (o) { if (V.bloqueadaOp(o)) return null; var m = String(o.email || '').trim(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m) ? 'mailto:' + m : null; };
  V.filtrarOps = function (lista, f) {
    var q = V.norm(f.q);
    return (lista || []).filter(function (o) {
      if (f.status && o.status !== f.status) return false;
      if (f.prioridade && (o.prioridade || '') !== f.prioridade) return false;
      if (f.segmento && o.segmento !== f.segmento) return false;
      if (f.cidade && V.chaveCidade(o.cidade) !== f.cidade) return false;
      if (f.wa && !V.temWaOp(o)) return false;
      if (f.contato && V.contatoOp(o) !== f.contato) return false;
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
      else if (['Entregue', 'Cancelado', 'Pronto'].indexOf(o.status) < 0 && dias(o.statusEm || o.entrada, h) >= 3) paradas.push({ ref: o, num: o.num, cliente: o.cliente, status: o.status });
    });
    var ord = function (a, b) { return String(a.data || '') < String(b.data || '') ? -1 : 1; };
    return { chamar: chamar.sort(ord), semResposta: semResposta.sort(ord), cobrar: cobrar, paradas: paradas,
      tarefas: (D.tarefas || []).filter(function (t) { return t.status !== 'Feita' && t.data && t.data <= h; }),
      agenda: (D.agenda || []).filter(function (a) { return a.data >= h && a.data <= fim; }) };
  };
  // v0.7.8: helpers puros do fluxo rápido; preços e prazos vêm dos dados.
  V.buscarClientesOS = function (clientes, busca) {
    var q = V.norm(busca || ''), dig = String(busca || '').replace(/\D/g, '');
    return (clientes || []).filter(function (c) { return !q || V.norm(c.nome).indexOf(q) >= 0 || (dig && String(c.whatsapp || '').replace(/\D/g, '').indexOf(dig) >= 0); });
  };
  V.precoServicoOS = function (s) {
    if (!s || s.preco === '' || s.preco == null || /sob or/i.test(s.tipo || '')) return '';
    var n = Number(String(s.preco).replace(',', '.')); return isFinite(n) && n >= 0 ? String(n) : '';
  };
  V.proximaAcaoOS = function (o) {
    if (o.status === 'Em reparo') return ['os-pronto', 'Marcar pronto e preparar aviso'];
    if (o.status === 'Pronto' || o.status === 'Aguardando aprovação') return ['os-msg', '📲 Avisar status'];
    if (o.status === 'Recebido') return ['os-chk', '✅ Checklist'];
    if (o.status === 'Em diagnóstico') return ['os-orc', 'Orçamento'];
    return ['os-status', 'Mudar status'];
  };
  V.textoOrcamentoSimples = function (o, c, validade, dias) {
    return 'Olá, ' + String(c.nome || '').split(' ')[0] + '! Orçamento ProFix Computadores · ' + o.num +
      '\nEquipamento: ' + (o.equipamento || '—') + (o.diagnostico ? '\nDiagnóstico: ' + o.diagnostico : '') +
      (o.itensOrc ? '\nItens: ' + o.itensOrc : '') + '\nValor: ' + V.brl(Number(String(o.orcamento).replace(',', '.'))) +
      '\nValidade: até ' + V.dataBR(validade) + (dias ? ' (' + dias + ' dias).' : '.') +
      (o.previsao ? '\nPrevisão: ' + V.dataBR(o.previsao) : '') + '\nPodemos seguir com o serviço?';
  };
  V.prontasOS = function (D) { return (D.os || []).filter(function (o) { return o.status === 'Pronto'; }); };

  // v0.8.0: helpers da especificação 09/11 (bancada, entregas, SLA 3d, revisão, garantia, templates, planos).
  V.diasOS = function (a, b) { return /^\d{4}-/.test(a || '') && /^\d{4}-/.test(b || '') ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : null; };
  V.diasSemMovOS = function (o, hoje) { return V.diasOS(o.statusEm || o.entrada, hoje); };
  V.osAberta = function (o) { return ['Entregue', 'Cancelado'].indexOf(String(o.status || '')) < 0; };
  V.emBancada = function (D) {
    return (D.os || []).filter(function (o) {
      return ['Recebido', 'Em diagnóstico', 'Aguardando aprovação', 'Aguardando peça', 'Em reparo'].indexOf(o.status) >= 0;
    }).sort(function (a, b) { return String(b.statusEm || b.entrada) < String(a.statusEm || a.entrada) ? -1 : 1; });
  };
  V.entregasDoDia = function (D) {
    var h = D.hoje;
    return (D.os || []).filter(function (o) {
      if (o.status === 'Cancelado' || o.status === 'Entregue') return false;
      return o.status === 'Pronto' || o.previsao === h;
    }).sort(function (a, b) { return String(a.num) < String(b.num) ? -1 : 1; });
  };
  V.badgeParada3d = function (o, hoje) {
    if (!V.osAberta(o) || o.status === 'Pronto') return null;
    var d = V.diasSemMovOS(o, hoje); if (d == null || d < 3) return null;
    return { dias: d, texto: 'Sem movimento há ' + d + ' dias' };
  };
  V.revisoes30dias = function (D) {
    var h = D.hoje, out = [];
    (D.os || []).forEach(function (o) {
      if (o.status !== 'Entregue' || !o.entrega) return;
      var d = V.diasOS(o.entrega, h); if (d == null || d < 30 || d > 37) return;
      out.push({ ref: o, num: o.num, cliente: o.cliente, entrega: o.entrega, dias: d, aparelho: o.equipamento || 'aparelho' });
    });
    return out.sort(function (a, b) { return a.dias - b.dias; });
  };
  V.fimGarantia = function (D, diasGar) {
    diasGar = Number(diasGar) || 0; if (!diasGar) return [];
    var h = D.hoje, out = [];
    (D.os || []).forEach(function (o) {
      if (o.status !== 'Entregue' || !o.entrega) return;
      var ate = V.somaDias(o.entrega, diasGar), restam = V.diasOS(h, ate);
      if (restam == null || restam < 0 || restam > 5) return;
      out.push({ ref: o, num: o.num, cliente: o.cliente, aparelho: o.equipamento || 'aparelho', ate: ate, restam: restam });
    });
    return out.sort(function (a, b) { return a.restam - b.restam; });
  };
  /** Motivos curtos (Atendimento 09/11). Preferir esta lista no App; a planilha pode ainda ter a antiga. */
  V.MOTIVOS_PERDA = ['Preço', 'Resolveu com outra pessoa', 'Desistiu do conserto', 'Comprou um aparelho novo', 'Não respondeu', 'Fora da região', 'Serviço que a ProFix não faz', 'Outro'];
  V.motivoPerdaObrigatorio = function (status) { return status === 'Descartada' || status === 'Perdido'; };
  V.motivosPerda = function (D) { return (D && D.motivosPerda && D.motivosPerda.length) ? D.motivosPerda : V.MOTIVOS_PERDA; };
  /** Templates “pronto” por tipo de serviço (textos Atendimento). Placeholders entre [colchetes] o Pedro edita. */
  V.TIPOS_SERVICO_MSG = [
    { id: 'formatacao', rotulo: 'Formatação', linha: 'Instalei o sistema do zero[, com backup dos seus arquivos]. Os programas que você pediu já estão instalados: [lista].' },
    { id: 'limpeza', rotulo: 'Limpeza preventiva', linha: 'Fiz a limpeza interna[ e troquei a pasta térmica]. A temperatura antes era [__] °C e agora está em [__] °C.' },
    { id: 'upgrade', rotulo: 'Upgrade SSD/RAM', linha: 'Instalei [SSD de ___ GB / ___ GB de memória][ e passei o seu sistema para o novo SSD]. Testei e ele já liga [mais rápido / sem travar].' },
    { id: 'diagnostico', rotulo: 'Diagnóstico/ajustes', linha: 'Descobri que o problema era [causa] e [resolvi assim / deixei para você decidir sobre o orçamento].' }
  ];
  V.textoMsgServico = function (tipoId, o, c) {
    var t = V.TIPOS_SERVICO_MSG.filter(function (x) { return x.id === tipoId; })[0]; if (!t) return '';
    var nome = String((c && c.nome) || (o && o.cliente) || '').split(' ')[0] || '';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Aqui é o Pedro, da ProFix.\n' +
      'Sua OS ' + ((o && o.num) || '[____]') + ' (' + ((o && o.equipamento) || '[aparelho]') + ') está pronta.\n' +
      'O que foi feito: ' + t.linha + '\n' +
      'Valor: ' + (o && (o.valor || o.orcamento) ? V.brl(o.valor || o.orcamento) : '[R$ __]') +
      '\nPagamento: [Pix / dinheiro / cartão]. Entrega: [combinar].';
  };
  V.textoRevisao30 = function (c, o) {
    var nome = String((c && c.nome) || (o && o.cliente) || '').split(' ')[0] || '';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Aqui é o Pedro, da ProFix. Faz um mês que entregamos seu ' +
      ((o && o.equipamento) || 'aparelho') + '. Ele continua funcionando bem? Se notou qualquer coisa, me chama que eu vejo. 🙂';
  };
  V.textoFimGarantia = function (c, o, ate) {
    var nome = String((c && c.nome) || (o && o.cliente) || '').split(' ')[0] || '';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Só um aviso: a garantia do serviço no seu ' +
      ((o && o.equipamento) || 'aparelho') + ' (OS ' + ((o && o.num) || '[____]') + ') vai até **' + V.dataBR(ate) +
      '**. Se apareceu qualquer coisa ligada ao que foi feito, me chama até essa data que eu resolvo sem custo. Se está tudo certo, ótimo! *(Se não quiser mais esse tipo de aviso, é só me falar.)*';
  };
  V.textoReativacao = function (tipo, c, aparelho) {
    var nome = String((c && c.nome) || '').split(' ')[0] || '';
    var ap = aparelho || 'aparelho';
    if (tipo === 'orcamento') return 'Oi' + (nome ? ', ' + nome : '') + '! Aqui é o Pedro, da ProFix. Ficou alguma dúvida sobre o orçamento do seu ' + ap + '? Se mudou de ideia ou já resolveu, sem problema nenhum. É só me avisar e eu fecho por aqui.';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Conversamos sobre o seu ' + ap + ' uns dias atrás. Se ainda precisar, posso marcar um horário. Se não for o momento, tudo bem também.';
  };
  V.AVISO_NAO_CONTATAR = 'Este cliente pediu para não receber mensagens. Fale com ele só se ele te procurar.';
  /** Planos B2B — Financeiro 09/11. Extra R$35; Pix/anual % vêm do CRM (planosPublicos / getDados.config); fallback abaixo. */
  V.PLANOS_B2B = [
    { nome: 'Essencial', pcs: 5, pcsTxt: 'até 5', visitas: 1, frequencia: '1x por mês', valor: 359.50, limpeza: 6, suporte: 'Suporte remoto', para: 'Para quem está começando e quer um cuidado básico.' },
    { nome: 'Empresa', pcs: 10, pcsTxt: 'até 10', visitas: 2, frequencia: '2x por mês', valor: 719.00, limpeza: 6, suporte: 'Suporte remoto prioritário', para: 'Para empresas que dependem do computador o dia todo.', selo: true },
    { nome: 'Empresa+', pcsMin: 11, pcsTxt: '11 ou mais', visitas: 3, frequencia: '3x por mês', valorPorPc: 71.90, valorMin: 790.90, limpeza: 6, suporte: 'Atendimento prioritário', para: 'Para equipes maiores, com prioridade na agenda.' }
  ];
  V.EXTRA_MAQUINA = 35; // R$/PC/mês (Pedro 09/11)
  V.DESCONTO_PIX = 5; // % fallback se CRM offline/ausente (fonte: getDados.config.pixPct / planosPublicos.pixPct)
  V.DESCONTO_ANUAL = 10; // % fallback; fonte CRM: planosPublicos.anualPct
  V.DESCONTO_FIDELIDADE = V.DESCONTO_ANUAL; // alias legado
  V.planoOficial = function (nome) { return V.PLANOS_B2B.filter(function (p) { return p.nome === nome; })[0]; };
  /** cfg opcional: { extra, pix, anual } — pix/anual preferencialmente do CRM (cache local). */
  V.precosComerciais = function (cfg) {
    cfg = cfg || {};
    return {
      extra: cfg.extra != null && cfg.extra !== '' ? Number(cfg.extra) : V.EXTRA_MAQUINA,
      pix: cfg.pix != null && cfg.pix !== '' ? Number(cfg.pix) : V.DESCONTO_PIX,
      anual: cfg.anual != null && cfg.anual !== '' ? Number(cfg.anual) : V.DESCONTO_ANUAL
    };
  };
  V.valorPlano = function (nome, pcs, extras, cfg) {
    var p = V.planoOficial(nome); if (!p) return null;
    extras = Number(extras) || 0;
    var precos = V.precosComerciais(cfg), extra = precos.extra;
    var v;
    if (p.valorPorPc) {
      var n = Math.max(Number(pcs) || p.pcsMin || 11, p.pcsMin || 11);
      v = Math.round(n * p.valorPorPc * 100) / 100;
      v = Math.max(v, p.valorMin || 0);
    } else {
      v = p.valor;
    }
    if (extra != null && extras > 0) v = Math.round((v + extras * extra) * 100) / 100;
    return v;
  };
  /** Aplica % Pix sobre um valor. Combos oficiais NÃO usam este desconto (já têm 5% próprio). */
  V.valorComPix = function (valor, cfg) {
    var p = V.precosComerciais(cfg).pix;
    if (valor == null || !(p > 0)) return valor;
    return Math.round(valor * (1 - p / 100) * 100) / 100;
  };
  V.valorComAnual = function (valorMensal, cfg) {
    var p = V.precosComerciais(cfg).anual;
    if (valorMensal == null || !(p > 0)) return valorMensal == null ? null : Math.round(valorMensal * 12 * 100) / 100;
    return Math.round(valorMensal * 12 * (1 - p / 100) * 100) / 100;
  };
  V.precoTxtPlano = function (p) {
    if (!p) return 'a definir';
    if (p.valorPorPc) return V.brl(p.valorPorPc) + ' por PC' + (p.valorMin ? ' (a partir de ' + V.brl(p.valorMin) + ')' : '');
    return p.valor != null ? V.brl(p.valor) : 'a definir';
  };
  V.contadoresPlanos = function (contratos) {
    var out = {}; V.PLANOS_B2B.forEach(function (p) { out[p.nome] = { ativos: 0, pcs: 0 }; });
    (contratos || []).forEach(function (k) {
      if (k.status && k.status !== 'Ativo') return;
      var p = V.planoOficial(k.plano); if (!p) return;
      out[p.nome].ativos += 1;
      if (p.pcs) out[p.nome].pcs += p.pcs; else if (p.pcsMin) out[p.nome].pcs += p.pcsMin;
    });
    return out;
  };
  /** Combos oficiais: 5% próprio no preço; não soma com desconto Pix das Configurações. */
  V.COMBOS_OFICIAIS = [
    { servico: 'Combo PC Novo de Novo (sem backup)', preco: 157.51, tipo: 'Fixo', descricao: 'Formatação sem backup + limpeza interna de desktop. Combo com 5% de desconto em qualquer forma de pagamento; não soma com desconto do Pix.', ativo: 'Sim', status: 'Ativo', combo: true },
    { servico: 'Combo PC Novo de Novo (com backup)', preco: 234.46, tipo: 'Fixo', descricao: 'Formatação com backup + limpeza interna de desktop. Combo com 5% de desconto em qualquer forma de pagamento; não soma com desconto do Pix.', ativo: 'Sim', status: 'Ativo', combo: true }
  ];
  V.catalogoComCombos = function (catalogo) {
    var nomes = {}; (catalogo || []).forEach(function (s) { nomes[V.norm(s.servico)] = 1; });
    var extra = V.COMBOS_OFICIAIS.filter(function (c) { return !nomes[V.norm(c.servico)]; });
    return (catalogo || []).concat(extra);
  };
  V.textoTermoEntrada = function (o, c) {
    return 'Recebimento do equipamento: OS ' + ((o && o.num) || '[____]') +
      '\nCliente: ' + ((c && c.nome) || (o && o.cliente) || '[nome]') +
      ' · Equipamento: ' + ((o && o.equipamento) || '[tipo, marca, modelo]') +
      '\nComo chegou: [riscos, peças faltando, tela, teclado, carregador, bateria] · Liga? [sim/não]' +
      '\nAcessórios entregues: ' + ((o && o.acessorios) || '[carregador, bolsa…]') +
      '\nProblema relatado: ' + ((o && o.defeito) || '[texto do cliente]') +
      '\n\nNenhum conserto é feito sem o seu ok. Primeiro fazemos o diagnóstico e passamos o valor. Você só aprova se quiser.' +
      '\nRecomendamos ter cópia dos seus arquivos. Se o serviço incluir backup, ele aparece no orçamento.' +
      '\n\nSeus dados (LGPD): usamos seu nome e telefone só para este atendimento e para avisos que você aceitar. Não passamos seus dados para ninguém. Você pode pedir para ver, corrigir ou apagar seus dados no WhatsApp (15) 98112-8309.';
  };

  // v0.8.2+: horários e textos de visita técnica (Atendimento §9 + config).
  V.DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  V.horariosVisitaCfg = function (CFG) {
    var h = (CFG && CFG.HORARIOS_VISITA) || {}, passo = Number((CFG && CFG.PASSO_VISITA_MIN) != null ? CFG.PASSO_VISITA_MIN : 30) || 30;
    return {
      passoMin: passo,
      util: Object.assign({ inicio: '19:00', fim: '22:00', passoMin: passo }, h.util || {}, h.util && h.util.passoMin ? {} : { passoMin: passo }),
      fimDeSemana: Object.assign({ inicio: '09:00', fim: '17:00', passoMin: passo }, h.fimDeSemana || {}, h.fimDeSemana && h.fimDeSemana.passoMin ? {} : { passoMin: passo })
    };
  };
  V.minutosDeHora = function (hhmm) {
    var p = String(hhmm || '').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0);
  };
  V.horaDeMinutos = function (m) {
    var h = Math.floor(m / 60), mi = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  };
  V.diaSemanaISO = function (iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
    var p = iso.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  };
  /** Slots do dia: horas cheias primeiro (destacadas), depois as de :30 etc. */
  V.slotsVisita = function (iso, CFG) {
    var dow = V.diaSemanaISO(iso); if (dow == null) return [];
    var cfg = V.horariosVisitaCfg(CFG), reg = (dow === 0 || dow === 6) ? cfg.fimDeSemana : cfg.util;
    var passo = Math.max(15, Number(reg.passoMin) || cfg.passoMin || 30);
    var ini = V.minutosDeHora(reg.inicio), fim = V.minutosDeHora(reg.fim);
    var ultimo = fim - passo, cheias = [], meias = [];
    if (ultimo < ini) return [];
    for (var m = ini; m <= ultimo; m += passo) {
      var h = V.horaDeMinutos(m);
      if (m % 60 === 0) cheias.push(h); else meias.push(h);
    }
    return cheias.concat(meias);
  };
  V.slotEhHoraCheia = function (hhmm) { return V.minutosDeHora(hhmm) % 60 === 0; };
  V.horaVisita = function (v) {
    if (!v) return '';
    if (v.hora && /^\d{2}:\d{2}$/.test(v.hora)) return v.hora;
    var m = String(v.obs || '').match(/Hor[aá]rio:\s*(\d{2}:\d{2})/i);
    return m ? m[1] : '';
  };
  V.obsComHora = function (hora, obs) {
    var base = String(obs || '').replace(/^Hor[aá]rio:\s*\d{2}:\d{2}\s*\n?/i, '').trim();
    return 'Horário: ' + hora + (base ? '\n' + base : '');
  };
  V.visitasDoDia = function (visitas, hoje) {
    return (visitas || []).filter(function (v) {
      return v && v.data === hoje && v.status !== 'Concluída' && v.status !== 'Cancelada';
    }).sort(function (a, b) { return String(V.horaVisita(a)).localeCompare(String(V.horaVisita(b))); });
  };
  V.conflitoVisita = function (visitas, data, hora, excetoId) {
    return (visitas || []).filter(function (v) {
      if (!v || v.id === excetoId) return false;
      if (v.status === 'Concluída' || v.status === 'Cancelada') return false;
      return v.data === data && V.horaVisita(v) === hora;
    });
  };
  V.contratoAtivoCliente = function (contratos, nome) {
    return (contratos || []).filter(function (k) { return k.cliente === nome && k.status === 'Ativo'; })[0] || null;
  };
  // ---- v0.8.8: quem assinou (contratos) e Agendamento ----
  /** Data inicial do contrato (campo inicio do CRM). '' se o CRM não mandou. */
  V.inicioContrato = function (k) { var i = k && (k.inicio || k.dataInicio || k.inicioEm); return i ? String(i) : ''; };
  V.ativoContrato = function (k) { return !!k && (!k.status || k.status === 'Ativo'); };
  /** filtro: 'ativos' (padrão) | 'outros' | 'todos'. Ativos primeiro; dentro do grupo, início mais recente primeiro (sem data no fim). */
  V.listarContratos = function (contratos, filtro) {
    filtro = filtro || 'ativos';
    return (contratos || []).filter(function (k) { return filtro === 'todos' ? true : filtro === 'outros' ? !V.ativoContrato(k) : V.ativoContrato(k); })
      .slice().sort(function (a, b) {
        var aa = V.ativoContrato(a) ? 0 : 1, bb = V.ativoContrato(b) ? 0 : 1; if (aa !== bb) return aa - bb;
        var ia = String(V.inicioContrato(a)).slice(0, 10), ib = String(V.inicioContrato(b)).slice(0, 10);
        if (ia !== ib) return !ia ? 1 : !ib ? -1 : ib.localeCompare(ia);
        return String(a.cliente || '').localeCompare(String(b.cliente || ''), 'pt-BR');
      });
  };
  V.contagemContratos = function (contratos) { var c = { ativos: 0, outros: 0, todos: 0 }; (contratos || []).forEach(function (k) { c.todos++; if (V.ativoContrato(k)) c.ativos++; else c.outros++; }); return c; };
  /** Visitas em aberto (não concluídas/canceladas), da mais próxima para a mais distante. atrasada = data antes de hoje. */
  V.proximasVisitas = function (visitas, hoje) {
    return (visitas || []).filter(function (v) { return v && v.status !== 'Concluída' && v.status !== 'Cancelada'; })
      .map(function (v) { return Object.assign({}, v, { atrasada: !!(v.data && hoje && v.data < hoje) }); })
      .sort(function (a, b) { return (String(a.data) + ' ' + V.horaVisita(a)).localeCompare(String(b.data) + ' ' + V.horaVisita(b)); });
  };
  /** Próxima visita em aberto de um contrato (pelo id do contrato ou, sem id, pelo nome do cliente). */
  V.proximaVisitaContrato = function (visitas, k, hoje) {
    return V.proximasVisitas(visitas, hoje).filter(function (v) { return (v.contrato && v.contrato === k.id) || (!v.contrato && v.cliente === k.cliente); })[0] || null;
  };
  /** PJ = tem contrato OU tipoCli PJ/Empresa OU nome sugere empresa. PF = resto. */
  V.clienteEhEmpresa = function (c) {
    if (!c) return false;
    if (/^(pj|empresa)/i.test(String(c.tipoCli || '').trim())) return true;
    return /\b(ltda|eireli|me\b|mei\b|ss\b|sa\b|empresa|comércio|comercio|contabil|advocacia|clínica|clinica|escola|loja|imobili)/i.test(String(c.nome || ''));
  };
  /** Texto da linha de valor: plano → incluída; empresa sem plano → R$ 179,90; PF → '' (omitir). */
  V.linhaValorVisita = function (c, contrato, preco) {
    if (contrato) return 'Incluída no seu plano' + (contrato.plano ? ' (' + contrato.plano + ')' : '') + '.';
    if (!V.clienteEhEmpresa(c)) return '';
    if (preco != null && preco !== '') return 'Visita avulsa à empresa: ' + V.brl(preco) + ', cobrada à parte.';
    return '';
  };
  V.dataExtensoVisita = function (iso) {
    var dow = V.diaSemanaISO(iso); if (dow == null) return V.dataBR(iso);
    return V.DIAS_SEMANA[dow] + ', ' + V.dataBR(iso);
  };
  V.primeiroNome = function (c, v) {
    return String((c && c.nome) || (v && v.cliente) || '').split(' ')[0] || '';
  };
  // Textos oficiais Atendimento §9 (lista-melhorias 09/11).
  V.textoConfirmarVisita = function (c, v, contrato, preco) {
    var nome = V.primeiroNome(c, v), empresa = V.clienteEhEmpresa(c) ? String(c.nome || '') : '';
    var linhaVal = V.linhaValorVisita(c, contrato, preco);
    var oque = contrato ? ('visita do plano ' + (contrato.plano || '')) : '[o que será feito]';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Aqui é o Pedro, da ProFix. Sua visita técnica está marcada para **' +
      V.dataExtensoVisita(v.data) + ', às ' + (V.horaVisita(v) || '[hora]') + '**' + (empresa ? ', na ' + empresa : '') + '.\n' +
      '🛠️ O que vou fazer: ' + oque + '\n' +
      (linhaVal ? linhaVal + '\n' : '') +
      'Pode me confirmar com um "ok"? Se precisar mudar, é só me avisar.';
  };
  V.textoLembreteVisita = function (c, v) {
    var nome = V.primeiroNome(c, v);
    return 'Oi' + (nome ? ', ' + nome : '') + '! Lembrando da nossa visita **hoje às ' + (V.horaVisita(v) || '[hora]') + '**. Se algo mudou, me avisa por aqui. 🙂';
  };
  V.textoACaminhoVisita = function (c, v) {
    var nome = V.primeiroNome(c, v);
    return 'Oi' + (nome ? ', ' + nome : '') + '! Estou a caminho para a visita das ' + (V.horaVisita(v) || '[hora]') + '. Chego em cerca de [__] minutos.';
  };
  // v0.8.3: Remarcar separado (§9) — cliente pediu vs Pedro precisa mudar (sem colchete de escolha).
  V.textoRemarcarClientePediu = function (c, v) {
    var nome = V.primeiroNome(c, v);
    return 'Oi' + (nome ? ', ' + nome : '') + '! Sem problema, vamos mudar a visita de ' + V.dataBR(v.data) + ' às ' + (V.horaVisita(v) || '[hora]') +
      '. Tenho estes horários: [opção 1] ou [opção 2]. Qual fica melhor pra você?';
  };
  V.textoRemarcarPedroPrecisa = function (c, v) {
    var nome = V.primeiroNome(c, v);
    return 'Oi' + (nome ? ', ' + nome : '') + '! Vou precisar mudar a nossa visita de ' + V.dataBR(v.data) + ' às ' + (V.horaVisita(v) || '[hora]') +
      ', desculpa pelo transtorno. Tenho estes horários: [opção 1] ou [opção 2]. Qual fica melhor pra você?';
  };
  /** @deprecated 0.8.3 — use textoRemarcarClientePediu / textoRemarcarPedroPrecisa */
  V.textoRemarcarVisita = function (c, v) { return V.textoRemarcarClientePediu(c, v); };
  V.textoVisitaFeita = function (c, v, contrato) {
    var nome = V.primeiroNome(c, v);
    var onde = v && v.os ? ('na OS ' + v.os) : (contrato ? 'no seu plano' : '[na OS / no seu plano]');
    return 'Obrigado' + (nome ? ', ' + nome : '') + '! A visita de hoje está registrada ' + onde +
      '. O que foi feito: [resumo].' + (contrato ? ' Próxima visita do plano: [data].' : '') +
      ' Se notar qualquer coisa, me chama aqui.';
  };

  // ---- v0.8.3: Mensagens prontas (§10 + visitas §9 + kit 19). Sem etapas? Inclui 3 da peça. ----
  V.parseAgendadoPara = function (s) {
    var m = String(s || '').trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    return m ? { data: m[1], hora: m[2], quando: m[1] + ' ' + m[2] } : null;
  };
  V.PRECO_DIAGNOSTICO = 62.90;
  V.osPaga = function (D, o) {
    if (!o) return false;
    var rec = V.recebidoOS(D, o.num);
    if (!(rec > 0)) return false;
    return V.saldoOS(D, o) <= 0;
  };
  V.textoConfirmarAgendamentoTraz = function (c, o, dataIso, hora) {
    var nome = V.primeiroNome(c, o), ap = (o && o.equipamento) || '[aparelho]', motivo = (o && o.defeito) || '[o que o cliente contou]';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Aqui é o Pedro, da ProFix. Seu atendimento está confirmado para **' +
      V.dataExtensoVisita(dataIso) + ', às ' + (hora || '[hora]') + '**. ✅\n' +
      '💻 Aparelho: ' + ap + ' · Motivo: ' + motivo + '\n' +
      '📍 [O local eu te mando aqui, combinado só com você.]\n' +
      'O diagnóstico é ' + V.brl(V.PRECO_DIAGNOSTICO) + '. Depois disso eu te passo o valor do conserto, e você só aprova se quiser.\n' +
      'Pode me confirmar com um "ok"? Se precisar mudar, é só avisar.';
  };
  V.textoConfirmarEntregaRetirada = function (c, o, dataIso, hora) {
    var nome = V.primeiroNome(c, o), ap = (o && o.equipamento) || '[aparelho]', num = (o && o.num) || '[____]';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Combinado: a entrega do seu ' + ap + ' (OS ' + num + ') fica para **' +
      V.dataExtensoVisita(dataIso) + ', às ' + (hora || '[hora]') + '**[, aí com você / aqui com hora marcada]. Na entrega a gente testa junto, e eu te passo o termo de garantia. 🙂 Pode confirmar com um "ok"?';
  };
  V.textoLembreteAgendamento = function (c, hora) {
    var nome = V.primeiroNome(c);
    return 'Oi' + (nome ? ', ' + nome : '') + '! Lembrando do nosso horário **hoje às ' + (hora || '[hora]') + '**. Se algo mudou, me avisa por aqui. 🙂';
  };
  V.textoRecebiAparelho = function (c, o, link) {
    var nome = V.primeiroNome(c, o), ap = (o && o.equipamento) || '[aparelho]', num = (o && o.num) || '[____]';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Seu ' + ap + ' ficou comigo, OS ' + num +
      '. Você pode acompanhar por aqui: ' + (link || '[link da OS]') +
      '. Assim que eu terminar o diagnóstico, te passo o valor do conserto. Nada é feito sem o seu ok.';
  };
  V.textoOrcamentoProntoMsg = function (c, o, link) {
    var nome = V.primeiroNome(c, o) || '[nome]', ap = (o && o.equipamento) || '[aparelho]', num = (o && o.num) || '[____]';
    var causa = (o && (o.diagnostico || o.defeito)) || '[causa]', serv = (o && o.servico) || '[serviço]';
    var valor = (o && (o.orcamento || o.valor)) ? V.brl(o.orcamento || o.valor) : 'R$ [__]';
    var validade = (o && o.validade) ? V.dataBR(o.validade) : '[data]';
    return nome + ', terminei o diagnóstico do seu ' + ap + ' (OS ' + num + ').\n' +
      '🔎 O que encontrei: ' + causa + '\n' +
      '🛠️ O que proponho: ' + serv + ' · **' + valor + '**[, peça não inclusa / peça: R$ __]\n' +
      '⏱️ Prazo: [__] · Orçamento válido até ' + validade + '\n' +
      'Você pode aprovar por aqui ou pelo link: ' + (link || '[link]') + '. Se preferir não fazer, tudo bem também.';
  };
  V.textoAparelhoPronto = function (c, o) {
    var nome = V.primeiroNome(c, o) || '[nome]', ap = (o && o.equipamento) || '[aparelho]', num = (o && o.num) || '[____]';
    var valor = (o && (o.valor || o.orcamento)) ? V.brl(o.valor || o.orcamento) : 'R$ [__]';
    return 'Boa notícia, ' + nome + '! Seu ' + ap + ' está pronto e testado ✅ (OS ' + num +
      '). Valor final: **' + valor + '**. Pagamento: Pix, dinheiro ou cartão (até 3x sem juros ou até 12x com juros). Vamos combinar a entrega? [opção 1] ou [opção 2].';
  };
  V.textoAgradecimentoEntrega = function (c) {
    var nome = V.primeiroNome(c);
    return 'Obrigado pela confiança' + (nome ? ', ' + nome : '') + '! 🙏 A garantia do serviço é de 30 dias a partir de hoje. Qualquer coisa, me chama aqui.';
  };
  /** kit-whatsapp §19 — sem review gating; nunca ofereça brinde/desconto. */
  V.textoAvaliacaoGoogle = function (c, o, url) {
    var nome = V.primeiroNome(c, o) || '[nome]';
    return nome + ', obrigado pela confiança 🙏\n' +
      'A ProFix está começando e a opinião sincera de quem foi atendido ajuda outras pessoas de Sorocaba a decidir. Se quiser deixar sua avaliação no Google, leva 1 minutinho:\n' +
      '👉 ' + (url || 'https://g.page/r/CZQuYc9gn5lJECE/review') + '\n' +
      'Se algo não saiu como você esperava, me conta aqui também, que eu quero resolver.';
  };
  V.textoOrcamentoPeca = function (c, o, link, validadeIso) {
    var nome = V.primeiroNome(c, o) || '[nome]', ap = (o && o.equipamento) || '[aparelho]', num = (o && o.num) || '[____]';
    var val = validadeIso ? V.dataBR(validadeIso) : '[data]';
    return nome + ', para o seu ' + ap + ' (OS ' + num + ') vai precisar de [peça]. A peça fica **R$ [__]**[ com frete] e o serviço, R$ [__]. O valor da peça vale até ' + val + '. A peça leva cerca de [__] dias para chegar depois que você aprovar e pagar. Pode aprovar por aqui ou pelo link: ' + (link || '[link]') + '. Se preferir não fazer, tudo bem também.';
  };
  V.textoPecaEncomendada = function (c, o) {
    var nome = V.primeiroNome(c, o), ap = (o && o.equipamento) || '[aparelho]', num = (o && o.num) || '[____]';
    return 'Oi' + (nome ? ', ' + nome : '') + '! Recebi o pagamento e já encomendei a [peça] do seu ' + ap + ' (OS ' + num +
      '). A previsão do fornecedor é [data / "ainda sem data confirmada; te aviso assim que ela sair"]. 🙂';
  };
  V.textoPecaChegou = function (c, o) {
    var nome = V.primeiroNome(c, o), ap = (o && o.equipamento) || '[aparelho]';
    return 'Boa notícia' + (nome ? ', ' + nome : '') + '! A [peça] chegou. Já vou instalar no seu ' + ap + ' e a previsão é deixar pronto até [data]. Te aviso quando terminar.';
  };
  V.ASSUNTOS_MSG_EMAIL = {
    'ag-traz': 'Confirmação do seu atendimento — ProFix',
    'ag-entrega': 'Entrega/retirada combinada — ProFix',
    'ag-lembrete': 'Lembrete do horário de hoje — ProFix',
    'vis-confirmar': 'Confirmação da visita técnica — ProFix',
    'vis-lembrete': 'Lembrete da visita — ProFix',
    'vis-caminho': 'Estou a caminho — ProFix',
    'vis-remarcar-cli': 'Remarcação da visita — ProFix',
    'vis-remarcar-pedro': 'Preciso remarcar a visita — ProFix',
    'vis-feita': 'Visita registrada — ProFix',
    'os-recebi': 'Recebemos seu aparelho — ProFix',
    'os-orc': 'Orçamento pronto — ProFix',
    'os-pronto': 'Aparelho pronto — ProFix',
    'os-peca-orc': 'Orçamento da peça — ProFix',
    'os-peca-encom': 'Peça encomendada — ProFix',
    'os-peca-chegou': 'Peça chegou — ProFix',
    'pos-agrade': 'Obrigado pela confiança — ProFix',
    'pos-revisao': 'Tudo certo com o aparelho? — ProFix',
    'pos-garantia': 'Aviso de garantia — ProFix',
    'pos-google': 'Sua opinião ajuda a ProFix — ProFix'
  };
  /**
   * ctx: { cliente, os, visita, D, googleReviewUrl, linkOS, contrato, precoVisita, hoje }
   */
  V.catalogoMensagensProntas = function (ctx) {
    ctx = ctx || {};
    var c = ctx.cliente || {}, o = ctx.os || null, v = ctx.visita || null, D = ctx.D || {};
    var st = o ? String(o.status || '') : '';
    var osAberta = !!(o && ['Entregue', 'Cancelada', 'Descartada'].indexOf(st) < 0);
    var osEntregue = !!(o && st === 'Entregue');
    var temVisita = !!(v && v.status !== 'Concluída' && v.status !== 'Cancelada');
    var paga = !!(o && V.osPaga(D, o));
    var item = function (id, grupo, rotulo, opts) {
      return Object.assign({ id: id, grupo: grupo, rotulo: rotulo, precisaHorario: false, tipoWa: 'os', marketing: false }, opts || {});
    };
    var todas = [
      item('ag-traz', 'Agendamento', 'Confirmar agendamento: traz o aparelho', { precisaHorario: true }),
      item('ag-entrega', 'Agendamento', 'Confirmar entrega ou retirada', { precisaHorario: true, precisaOS: true }),
      item('ag-lembrete', 'Agendamento', 'Lembrete do agendamento', { precisaHorario: true }),
      item('vis-confirmar', 'Agendamento', 'Confirmar visita', { precisaVisita: true }),
      item('vis-lembrete', 'Agendamento', 'Lembrete da visita', { precisaVisita: true }),
      item('vis-caminho', 'Agendamento', 'A caminho (visita)', { precisaVisita: true }),
      item('vis-remarcar-cli', 'Agendamento', 'Remarcar: cliente pediu', { precisaVisita: true }),
      item('vis-remarcar-pedro', 'Agendamento', 'Remarcar: eu preciso mudar', { precisaVisita: true }),
      item('vis-feita', 'Agendamento', 'Visita feita', { precisaVisita: true }),
      item('os-recebi', 'OS', 'Recebi o aparelho', { precisaOS: true }),
      item('os-orc', 'OS', 'Orçamento pronto', { precisaOS: true }),
      item('os-pronto', 'OS', 'Aparelho pronto', { precisaOS: true }),
      item('os-peca-orc', 'OS', 'Orçamento da peça', { precisaOS: true }),
      item('os-peca-encom', 'OS', 'Peça encomendada', { precisaOS: true, precisaPaga: true }),
      item('os-peca-chegou', 'OS', 'Peça chegou', { precisaOS: true }),
      item('pos-agrade', 'Pós-venda', 'Agradecimento pós-entrega', { precisaOS: true }),
      item('pos-revisao', 'Pós-venda', 'Revisão 30 dias', { precisaOS: true, marketing: true }),
      item('pos-garantia', 'Pós-venda', 'Fim de garantia', { precisaOS: true }),
      item('pos-google', 'Pós-venda', 'Avaliação no Google', { precisaOS: true, precisaGoogle: true })
    ];
    var idsM = {};
    if (temVisita || ctx.agendado) {
      ['ag-traz', 'ag-lembrete', 'vis-confirmar', 'vis-lembrete', 'vis-remarcar-cli', 'vis-remarcar-pedro', 'vis-caminho'].forEach(function (id) { idsM[id] = 1; });
    }
    if (osAberta) {
      ['os-recebi', 'os-orc', 'os-pronto', 'ag-entrega', 'os-peca-orc', 'os-peca-chegou'].forEach(function (id) { idsM[id] = 1; });
      if (paga) idsM['os-peca-encom'] = 1;
      if (st === 'Pronto' || /retirada|pronto/i.test(st)) { idsM['ag-entrega'] = 1; idsM['os-pronto'] = 1; }
    }
    if (osEntregue) {
      ['pos-agrade', 'pos-revisao', 'pos-garantia', 'pos-google'].forEach(function (id) { idsM[id] = 1; });
    }
    if (!o) {
      ['ag-traz', 'ag-lembrete'].forEach(function (id) { idsM[id] = 1; });
      if (temVisita) ['vis-confirmar', 'vis-lembrete', 'vis-remarcar-cli', 'vis-remarcar-pedro', 'vis-caminho'].forEach(function (id) { idsM[id] = 1; });
    }
    var ok = function (it) {
      if (it.precisaOS && !o) return false;
      if (it.precisaVisita && !v) return false;
      if (it.precisaGoogle && !ctx.googleReviewUrl) return false;
      if (it.precisaPaga && !paga) return false;
      return true;
    };
    var momento = todas.filter(function (it) { return idsM[it.id] && ok(it); });
    var resto = todas.filter(function (it) { return ok(it) && !idsM[it.id]; });
    return { momento: momento, resto: resto, todas: todas.filter(ok) };
  };
  V.montarMensagemPronta = function (id, ctx, dataIso, hora) {
    ctx = ctx || {};
    var c = ctx.cliente || {}, o = ctx.os, v = ctx.visita, link = ctx.linkOS || '';
    if (id === 'ag-traz') return V.textoConfirmarAgendamentoTraz(c, o, dataIso, hora);
    if (id === 'ag-entrega') return V.textoConfirmarEntregaRetirada(c, o, dataIso, hora);
    if (id === 'ag-lembrete') return V.textoLembreteAgendamento(c, hora);
    if (id === 'vis-confirmar') return V.textoConfirmarVisita(c, v, ctx.contrato, ctx.precoVisita);
    if (id === 'vis-lembrete') return V.textoLembreteVisita(c, v);
    if (id === 'vis-caminho') return V.textoACaminhoVisita(c, v);
    if (id === 'vis-remarcar-cli') return V.textoRemarcarClientePediu(c, v);
    if (id === 'vis-remarcar-pedro') return V.textoRemarcarPedroPrecisa(c, v);
    if (id === 'vis-feita') return V.textoVisitaFeita(c, v, ctx.contrato);
    if (id === 'os-recebi') return V.textoRecebiAparelho(c, o, link);
    if (id === 'os-orc') return V.textoOrcamentoProntoMsg(c, o, link);
    if (id === 'os-pronto') return V.textoAparelhoPronto(c, o);
    if (id === 'os-peca-orc') {
      var valPeca = ctx.hoje ? V.somaDias(ctx.hoje, 3) : (dataIso ? V.somaDias(dataIso, 3) : '');
      return V.textoOrcamentoPeca(c, o, link, valPeca);
    }
    if (id === 'os-peca-encom') return V.textoPecaEncomendada(c, o);
    if (id === 'os-peca-chegou') return V.textoPecaChegou(c, o);
    if (id === 'pos-agrade') return V.textoAgradecimentoEntrega(c);
    if (id === 'pos-revisao') return V.textoRevisao30(c, o);
    if (id === 'pos-garantia') {
      var ate = o && o.entrega ? V.somaDias(o.entrega, 30) : (dataIso || ctx.hoje);
      return V.textoFimGarantia(c, o, ate);
    }
    if (id === 'pos-google') return V.textoAvaliacaoGoogle(c, o, ctx.googleReviewUrl);
    return '';
  };


  // Texto do rodapé de atendimento (crm-v3 RODAPE_ATEND_EMAIL). O App NÃO anexa no corpo: passa rodape:'atendimento' e o servidor acrescenta.
  V.RODAPE_EMAIL_PARAR = "Recebeu este e-mail porque tem um atendimento com a ProFix. Para não receber mais, responda com 'parar'.";
  /** Assunto+corpo de e-mail §12.3 quando há correspondente; senão null (usa texto da mensagem). Sem rodapé — servidor. */
  V.emailMensagemPronta = function (id, ctx, dataIso, hora) {
    ctx = ctx || {};
    var c = ctx.cliente || {}, o = ctx.os, nome = V.primeiroNome(c, o) || '[primeiro nome]';
    var ap = (o && o.equipamento) || '[aparelho]', num = (o && o.num) || '[____]', link = ctx.linkOS || '[link da OS / Minha Área]';
    var dataExt = dataIso ? V.dataExtensoVisita(dataIso) : '[dia da semana], [data]';
    var hr = hora || '[hora]';
    if (id === 'ag-traz' || id === 'ag-entrega' || id === 'ag-lembrete' || id === 'vis-confirmar') {
      var oque = id === 'ag-entrega' ? 'entrega do aparelho' : (id === 'vis-confirmar' ? 'visita na empresa' : 'atendimento com hora marcada');
      var dataBr = dataIso ? V.dataBR(dataIso) : '[data]';
      return {
        assunto: 'Seu atendimento na ProFix: ' + dataBr + ' às ' + hr,
        corpo: 'Olá, ' + nome + '!\nSeu atendimento está marcado para **' + dataExt + ', às ' + hr + '** (' + oque + ').\nAcompanhe ou confirme por aqui: ' + link + '\nPrecisa mudar? Fale com o Pedro no WhatsApp (15) 98112-8309.\nProFix Computadores · Sorocaba'
      };
    }
    if (id === 'os-pronto') {
      var valor = (o && (o.valor || o.orcamento)) ? V.brl(o.valor || o.orcamento) : 'R$ [__]';
      return {
        assunto: 'Seu ' + ap + ' está pronto (OS ' + num + ')',
        corpo: 'Olá, ' + nome + '! Seu ' + ap + ' está pronto e testado. Valor final: ' + valor + '. Para combinar a entrega, responda no WhatsApp (15) 98112-8309 ou veja a OS: ' + link + '.'
      };
    }
    if (id === 'pos-google' || id === 'pos-agrade') {
      var ate = o && o.entrega ? V.dataBR(V.somaDias(o.entrega, 30)) : '[data]';
      var url = ctx.googleReviewUrl || 'https://g.page/r/CZQuYc9gn5lJECE/review';
      return {
        assunto: 'Obrigado, ' + nome + '! Como foi o atendimento?',
        corpo: 'Olá, ' + nome + '!\nObrigado por confiar na ProFix. A garantia do serviço vai até **' + ate + '**. Se notar qualquer coisa, é só chamar no WhatsApp (15) 98112-8309.\nSe puder, conte como foi no Google. Leva 1 minuto: ' + url + '\nUm abraço,\nPedro · ProFix Computadores'
      };
    }
    return null;
  };

  return V;
});
