/* ProFix – telas, navegação e formulários. Dados e gravações passam SEMPRE pelo adaptador (api.js). */
(async function () {
  'use strict';
  var V = ProFixVista, CFG = window.PROFIX_CONFIG || {};
  var demo = /[?&]demo=1/.test(location.search) || !CFG.API_URL;
  // Dados fictícios só são baixados/interpretados ao abrir o modo demonstração.
  if (demo && !window.ProFixMock) {
    var demoPronto = await new Promise(function (ok) {
      var script = document.createElement('script'); script.src = 'mock-dados.js';
      script.onload = function () { ok(true); }; script.onerror = function () { ok(false); };
      document.head.appendChild(script);
    });
    if (!demoPronto) { document.getElementById('erro-senha').textContent = 'Não foi possível carregar a demonstração. Conecte à internet e tente novamente.'; return; }
  }
  // v0.9.3: cópia dos dados no IndexedDB do aparelho (sem segredos): o App abre NA HORA com ela e atualiza por trás.
  var RAP = window.ProFixRapido, PERSIST = RAP && !/[?&]semCopia=1/.test(location.search) ? RAP.criarPersistencia(demo ? 'profix-demo' : 'profix-app') : null;
  var api = demo ? ProFixAPI.criarAdaptadorMock({ hoje: CFG.HOJE_FIXO, enviarSenha: true, persistencia: PERSIST, velocidade: CFG.LEITURAS_VELOCIDADE || [], atraso: Number((location.search.match(/[?&]atraso=(\d+)/) || [])[1]) || 0, semAcoes: ((location.search.match(/[?&]semAcoes=([\w,]+)/) || [])[1] || '').split(',').filter(Boolean) })
    : ProFixAPI.criarAdaptadorGas(CFG.API_URL, { liberadas: CFG.ACOES_SERVIDOR, persistencia: PERSIST, velocidade: CFG.LEITURAS_VELOCIDADE || [] });
  var D = null, offline = false;
  var F = { op: { status: '', prioridade: '', segmento: '', q: '', retorno: '' }, os: { status: '', q: '' }, cli: { q: '' }, lead: { sit: 'Novo' } };
  var $ = function (id) { return document.getElementById(id); }, e = V.esc;
  // v0.7.2: confirm/alert/prompt nativos podem ser bloqueados no celular -> modal na própria página (pergunta.js), sempre com Promise.
  var P = window.ProFixPergunta, perguntar = function (t, op) { return P.confirmar(t, op); };
  var AJ = 'profix.ajustes', ajustes = (function () {
    try { return JSON.parse(localStorage.getItem(AJ)) || {}; } catch (x) { return {}; }
  })();
  // v0.8.4: Pix/anual vêm do CRM (cache local = fallback offline). Não são editáveis neste aparelho.
  if (ajustes.descontoPix == null) ajustes.descontoPix = V.DESCONTO_PIX;
  if (ajustes.descontoAnual == null) ajustes.descontoAnual = V.DESCONTO_ANUAL;
  function salvarAjustes() { localStorage.setItem(AJ, JSON.stringify(ajustes)); }
  // v0.9.2: dados do Pix (chave, recebedor, cidade). Fonte: SERVIDOR primeiro (config do CRM, quando existir – ver ProFixPix.daConfigServidor);
  // os campos de Mais › Ajustes valem só se o servidor não informar; sem nada, o padrão da ProFix (CNPJ 64.628.598/0001-40).
  var PIX = window.ProFixPix;
  function pixConfig() { return PIX.escolherConfig(D && D.config, { chave: ajustes.pixChave || '', nome: ajustes.pixNome || '', cidade: ajustes.pixCidade || '' }); }
  /** Bloco "Pagamento via Pix" (texto + código). valor 0 = código sem valor. null se a chave estiver inválida. Nunca leva custo. */
  function blocoPix(valor, num) { try { return PIX.bloco(pixConfig(), valor, num); } catch (x) { return null; } }
  function copiarTexto(t, ok) { return (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { aviso(ok || 'Copiado.'); }, function () { P.pedirTexto('Não deu para copiar sozinho. Toque e segure no texto abaixo para copiar.', { titulo: 'Copiar', valor: t, somenteLeitura: true, sim: 'Fechar', nao: false }); }); }
  function cfgPrecos() { return V.precosComerciais({ pix: ajustes.descontoPix, anual: ajustes.descontoAnual, extra: V.EXTRA_MAQUINA }); }
  /** Lê pixPct/anualPct do getDados.config (+ planosPublicos mesclado em api.js) e grava no cache local. */
  function aplicarPrecosDoCrm(dados) {
    var cfg = (dados && dados.config) || {}, mudou = false;
    var pix = Number(cfg.pixPct != null ? cfg.pixPct : cfg.pix && cfg.pix.pct); // v0.9.2: config.pix.pct (API @127) é o mesmo % do Pix
    if (isFinite(pix) && pix >= 0 && pix <= 20) { if (ajustes.descontoPix !== pix) { ajustes.descontoPix = pix; mudou = true; } ajustes.pixFonte = 'crm'; }
    var an = Number(cfg.anualPct);
    if (isFinite(an) && an >= 0 && an <= 100) { if (ajustes.descontoAnual !== an) { ajustes.descontoAnual = an; mudou = true; } ajustes.anualFonte = 'crm'; }
    if (mudou) salvarAjustes();
  }
  var WAF = 'profix.waOp'; try { F.op.wa = localStorage.getItem(WAF) === '1'; } catch (x) { F.op.wa = false; }
  var IGF = 'profix.igOp'; try { F.op.ig = localStorage.getItem(IGF) === '1'; } catch (x) { F.op.ig = false; }
  var CID = 'profix.cidadeOp'; try { F.op.cidade = localStorage.getItem(CID) || ''; } catch (x) { F.op.cidade = ''; }

  function aviso(t) { var a = $('aviso'); a.textContent = t; a.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.classList.remove('on'); }, 3500); }
  function faixa() {
    var f = $('faixa'), n = api.fila().length, er = api.filaErros ? api.filaErros() : [], p = [];
    if (api.tipo === 'mock') p.push('Modo demonstração – dados fictícios');
    if (offline) p.push('Sem internet – mostrando os últimos dados salvos');
    if (n) p.push(offline || !navigator.onLine ? n + ' alteração(ões) aguardando envio' : '⏳ ' + n + ' alteração(ões) enviando ao CRM…');
    // v0.9.3: recusa do servidor NUNCA some calada: fica aqui até tentar de novo ou descartar.
    var html = e(p.join(' · '));
    if (er.length) html += (html ? '<br>' : '') + er.map(function (x) {
      return '<span class="faixa-erro" data-erro-op="' + e(x.id) + '">⚠️ Não salvou no CRM (' + e(ROTULO_ACAO[x.acao] || x.acao) + '): ' + e(x.erro) + ' <button type="button" class="btn sec peq" data-erro-tentar="' + e(x.id) + '">Tentar de novo</button> <button type="button" class="btn sec peq" data-erro-descartar="' + e(x.id) + '">Descartar</button></span>';
    }).join('<br>');
    f.innerHTML = html; f.hidden = !html; f.classList.toggle('com-erro', !!er.length);
    f.querySelectorAll('[data-erro-tentar]').forEach(function (b) { b.onclick = function () { api.reenviarErro(b.dataset.erroTentar); faixa(); aviso('Enviando de novo…'); }; });
    f.querySelectorAll('[data-erro-descartar]').forEach(function (b) { b.onclick = function () { api.descartarErro(b.dataset.erroDescartar); faixa(); aviso('Descartado. Atualizando com o que está no CRM…'); atualizarFundo(true); }; });
  }
  var ROTULO_ACAO = { salvarCliente: 'cliente', salvarOS: 'OS', mudarStatusOS: 'status da OS', salvarOrcamento: 'orçamento', registrarInteracao: 'conversa', moverEtapa: 'etapa',
    salvarOportunidade: 'oportunidade', registrarContatoOp: 'contato da empresa', decidirOrcamento: 'decisão do orçamento', salvarPeca: 'peça', salvarLancamento: 'lançamento',
    mudarStatusTarefa: 'tarefa', salvarVisita: 'visita', salvarContrato: 'contrato', virarLead: 'virar lead' };

  // ---------- Entrada: senha (padrão) ou chave de acesso ----------
  function modoEntrada(chave) {
    $('form-senha').hidden = !!chave; $('form-chave').hidden = !chave;
    $('erro-senha').textContent = ''; $('erro-chave').textContent = '';
    (chave ? $('chave') : $('senha')).focus();
  }
  function telaChave(msg, usarChave) {
    $('app').hidden = true; $('tela-chave').hidden = false; $('dica-demo').hidden = api.tipo !== 'mock';
    modoEntrada(usarChave);
    $(usarChave ? 'erro-chave' : 'erro-senha').textContent = msg || '';
    $('lUsarChave').onclick = function (ev) { ev.preventDefault(); modoEntrada(true); };
    $('lUsarSenha').onclick = function (ev) { ev.preventDefault(); modoEntrada(false); };
    $('bVerSenha').onclick = function () {
      var ver = $('senha').type === 'password'; $('senha').type = ver ? 'text' : 'password';
      this.textContent = ver ? 'Ocultar' : 'Mostrar'; this.setAttribute('aria-pressed', String(ver));
    };
    $('form-senha').onsubmit = function (ev) {
      ev.preventDefault(); $('erro-senha').textContent = '';
      var s = $('senha').value;
      api.loginSenha(s).then(function () { $('senha').value = ''; $('senha').type = 'password'; $('bVerSenha').textContent = 'Mostrar'; iniciar(); },
        function (er) { $('erro-senha').textContent = er.message; });
    };
    $('form-chave').onsubmit = function (ev) {
      ev.preventDefault(); $('erro-chave').textContent = '';
      try { api.salvarToken($('chave').value); } catch (er) { $('erro-chave').textContent = er.message; return; }
      api.validarToken().then(function (ok) {
        if (!ok) { api.esquecerToken(); $('erro-chave').textContent = 'Chave incorreta. Confira e tente de novo.'; return; }
        $('chave').value = ''; iniciar();
      }, function () { api.esquecerToken(); $('erro-chave').textContent = 'Sem conexão com o servidor. A primeira entrada precisa de internet.'; });
    };
  }
  // Qualquer chamada com TOKEN_INVALIDO: o api.js já limpou o acesso (fila offline fica); volta para a senha.
  var MSG_EXPIROU = 'Sua sessão expirou. Digite a senha de novo (as alterações pendentes continuam salvas no aparelho).';
  api.aoExpirar = function () { if ($('tela-chave').hidden) telaChave(MSG_EXPIROU); };

  // ---------- Carregar e navegar ----------
  var ESTAT = { iniciar: 0, fundo: 0, renders: 0, primeiraTela: 0, daCopia: false, redesenhosEvitados: 0, leituras: 0 }; // v0.8.8: recargas completas; v0.9.3: leituras em 2º plano e redesenhos
  /** Abre a cópia do aparelho (IndexedDB) e desenha na hora. Oportunidades vêm logo depois, fora do caminho crítico. */
  function abrirDaCopia() {
    if (D) return Promise.resolve();
    return api.abrirCopia({ semOps: true }).then(function (d) {
      if (d && !D) { D = d; ESTAT.daCopia = true; aplicarPrecosDoCrm(D); ASSIN = assinatura(D); if (D._extras) usarExtras(D._extras); }
    }, function () {});
  }
  function carregarOpsDepois() {
    if (!D || !D._opsPendentes) return;
    var vai = function () { api.lerOpsCopia().then(function () { opsMexeu(); if (['hoje', 'vendas', 'clientes'].indexOf(rota().tela) >= 0) renderSuave(); }); };
    if (window.requestIdleCallback) requestIdleCallback(vai, { timeout: 600 }); else setTimeout(vai, 50);
  }
  function assinatura(d) { try { return RAP ? RAP.assinatura(d) : String(Math.random()); } catch (x) { return String(Math.random()); } }
  var ASSIN = '';
  /** Recarga completa (botão Atualizar, entrada, testes). v0.9.3: desenha a cópia do aparelho NA HORA e só redesenha se o CRM trouxer algo diferente. */
  function iniciar(opc) {
    ESTAT.iniciar++; var forcar = !(opc && opc.abertura);
    if (!api.temToken()) return Promise.resolve(telaChave());
    $('tela-chave').hidden = true; $('app').hidden = false;
    carregando = true;
    return abrirDaCopia().then(function () {
      render(); if (D && !ESTAT.primeiraTela) ESTAT.primeiraTela = Math.round(performance.now());
      carregarOpsDepois();
      return api.carregar(forcar ? { completo: true } : null);
    }).then(function (r) { carregando = false; aplicarLeitura(r, forcar); opsEmFundo(r); },
      function (er) { carregando = false; render(); if (er.codigo === 'TOKEN_INVALIDO' || er.codigo === 'SEM_TOKEN') { api.esquecerToken(); telaChave(MSG_EXPIROU); } else aviso(er.message); });
  }
  /** Resultado de api.carregar(): troca D e redesenha só se mudou (forçar = recarga pedida, ex.: testes/botão). */
  function aplicarLeitura(r, forcar) {
    ESTAT.leituras++; var antes = D; offline = r.offline;
    if (r.dados && r.dados !== D) { D = r.dados; aplicarPrecosDoCrm(D); }
    if (r.extras) usarExtras(r.extras);
    if (typeof M9 !== 'undefined') M9.pendente = true;
    faixa(); opsMexeu();
    var nova = assinatura(D), mudou = nova !== ASSIN || !antes; ASSIN = nova;
    if (!mudou && !forcar) { ESTAT.redesenhosEvitados++; return; } // mesma coisa: não mexe na tela (rolagem, campos)
    if (forcar) { var y = window.scrollY; render(); window.scrollTo(0, y); } else renderSuave();
  }
  /** aberturaApp (quando o CRM publicar) já traz contratos e catálogo: evita mais duas chamadas. */
  function usarExtras(x) {
    if (x.listaContratos && typeof CTX !== 'undefined' && !CTX.comp) CT = x.listaContratos;
    if (x.catalogoOS && Array.isArray(x.catalogoOS.itens)) { CAT = x.catalogoOS.itens; carregarCatalogo.quando = Date.now(); try { localStorage.setItem(CATK, JSON.stringify(CAT)); } catch (e2) { /* cota */ } }
  }
  /** Leitura em 2º plano (sem "Carregando", sem travar): depois de gravações que dependem do servidor, ao voltar ao App, botão Atualizar etc. */
  var FUNDO = { p: null, timer: null, quando: 0 };
  /** Oportunidades pela lista leve (API @131) em 2º plano: a lista guardada continua na tela; só um aviso discreto enquanto baixa. */
  var OPS_ATUALIZANDO = false;
  function opsEmFundo(r) { if (r && r.opsLeve && !r.semMudanca && !r.offline && api.atualizarOps) api.atualizarOps(); }
  function indicadorOps() { var el = $('opsAtualizando'); if (el) el.hidden = !OPS_ATUALIZANDO; }
  function atualizarFundo(ja, espera) {
    if (FUNDO.p) return FUNDO.p;
    clearTimeout(FUNDO.timer);
    var vai = function () {
      if (!api.temToken() || !D) return Promise.resolve();
      ESTAT.fundo++;
      FUNDO.p = api.carregar().then(function (r) { FUNDO.p = null; FUNDO.quando = Date.now(); aplicarLeitura(r, false); opsEmFundo(r); },
        function (er) { FUNDO.p = null; if (er.codigo === 'TOKEN_INVALIDO' || er.codigo === 'SEM_TOKEN') { api.esquecerToken(); telaChave(MSG_EXPIROU); } });
      return FUNDO.p;
    };
    if (ja) return vai();
    return new Promise(function (ok) { FUNDO.timer = setTimeout(function () { ok(vai()); }, espera || 800); });
  }
  /** Redesenha a tela atual sem perder a rolagem. Com formulário aberto ou campo em edição, espera (não apaga o que o Pedro digita). */
  var REDESENHO_PENDENTE = false;
  function renderSuave() {
    var m = $('modal'), pg = document.getElementById('pergunta'), foco = document.activeElement;
    var editando = foco && foco !== document.body && /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName) && $('conteudo').contains(foco) && !/^(button|checkbox|radio)$/i.test(foco.type || '');
    if ((m && m.open) || (pg && pg.open) || editando) { REDESENHO_PENDENTE = true; return false; }
    REDESENHO_PENDENTE = false; var y = window.scrollY; render(); window.scrollTo(0, y); return true;
  }
  function talvezRedesenhar() { if (REDESENHO_PENDENTE) setTimeout(renderSuave, 0); }
  function rota() { var h = (location.hash || '#hoje').slice(1).split('/'); return { tela: h[0] || 'hoje', sub: h[1] || '' }; }
  var carregando = false;
  var buscaTimer;
  function render() {
    clearTimeout(buscaTimer); ESTAT.renders++;
    var r = rota();
    var telaMenu = r.tela === 'osm' ? 'servicos' : r.tela === 'cliente' ? 'clientes' : r.tela === 'leads' ? 'hoje' : r.tela;
    document.querySelectorAll('.menu a').forEach(function (a) { var on = a.dataset.tela === telaMenu; a.classList.toggle('ativo', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var c = $('conteudo');
    if (!D) { c.innerHTML = carregando ? '<div class="vazio">Carregando dados da planilha… (pode levar uns 20 segundos)</div>' : '<div class="vazio">Ainda não há dados salvos neste aparelho. Conecte à internet e abra o app.</div>'; var fab0 = $('fab'); if (fab0) fab0.hidden = true; return; }
    c.innerHTML = (TELAS[r.tela] || TELAS.hoje)(r.sub);
    ligar(c);
    var fab = $('fab');
    if (fab) {
      fab.hidden = false;
      fab.innerHTML = '<button type="button" class="fab-btn" data-a="os-nova" aria-label="Nova OS">+ OS</button>' +
        '<button type="button" class="fab-btn sec" data-a="cli-novo" aria-label="Novo cliente / lead">+ Lead</button>';
      ligarAcoes(fab, false);
    }
  }

  // ---------- Peças de tela ----------
  function card(t, m, tags, acoes, extra) { return '<div class="card"' + (extra || '') + '><div class="t">' + t + (tags || '') + '</div>' + (m ? '<div class="m">' + m + '</div>' : '') + (acoes ? '<div class="acoes">' + acoes + '</div>' : '') + '</div>'; }
  function tag(t, cls) { return t ? '<span class="tag ' + (cls || 'cinza') + '">' + e(t) + '</span>' : ''; }
  function tagPri(p) { return p ? tag(p, V.norm(p)) : ''; }
  function lista(itens, fn, vazio) { return itens.length ? '<div class="lista2">' + itens.map(fn).join('') + '</div>' : '<div class="vazio">' + vazio + '</div>'; }
  function botao(rot, acao, dados, cls) { var env = ENVIANDO[acao + '|' + dados]; if (env) return '<button class="btn ' + (cls || 'sec') + ' peq" disabled data-enviando="' + e(acao) + '">⏳ ' + e(env) + '</button>'; return '<button class="btn ' + (cls || 'sec') + ' peq" data-a="' + acao + '" data-k="' + e(dados) + '"' + (bloq(acao) ? ' title="Ainda não liberado no servidor"' : '') + '>' + rot + '</button>'; }
  var PRECISA = { 'op-editar': 'salvarOportunidade', 'op-lead': 'virarLead', 'os-status': 'mudarStatusOS', 'os-editar': 'salvarOS', 'os-orc': 'salvarOrcamento', 'os-decidir': 'decidirOrcamento',
    'os-receber': 'lancarRecebimento', 'os-peca': 'salvarPeca', 'cli-editar': 'salvarCliente', 'cli-novo': 'salvarCliente', 'cli-inter': 'registrarInteracao', 'cli-etapa': 'moverEtapa',
    'rv-editar': 'salvarRevenda', 'rv-novo': 'salvarRevenda', 'rv-vender': 'venderRevenda', 'fin-novo': 'salvarLancamento', 'cat-editar': 'salvarServicoCatalogo', 'cat-novo': 'salvarServicoCatalogo',
    'mod-editar': 'salvarModelo', 'mod-novo': 'salvarModelo', 'tar-feita': 'mudarStatusTarefa', 'os-nova': 'salvarOS', 'orc-novo': 'salvarOrcamento' };
  function bloq(a) { return PRECISA[a] && !api.pode(PRECISA[a]); }
  function waOp(o) {
    var l = V.linkWaOp(D.modelos, o); if (!l) return '';
    var atual = V.nomeModeloOp(D.modelos, o), nomes = V.modelosOp(D.modelos).map(function (m) { return m.modelo; }).filter(Boolean);
    var sel = nomes.length ? '<select class="peq" aria-label="Modelo da mensagem" data-wa-mod="' + o._row + '">' + (atual ? '' : '<option value="">(sem modelo)</option>') +
      nomes.map(function (n) { return '<option' + (n === atual ? ' selected' : '') + '>' + e(n) + '</option>'; }).join('') + '</select>' : '';
    return '<a class="btn wa peq" target="_blank" rel="noopener" href="' + e(l) + '" data-wa-op="' + o._row + '" data-contato-op="' + o._row + '" data-canal="WhatsApp">📲 WhatsApp</a>' + sel;
  }
  // v0.5.6: outros contatos (tel/mailto). Tocar = 1º contato registrado (se ainda Nova).
  function contatoOp(o) {
    var t = V.linkTelOp(o), m = V.linkEmailOp(o);
    return (t ? '<a class="btn sec peq" href="' + e(t) + '" data-contato-op="' + o._row + '" data-canal="Ligação">📞 Ligar</a>' : '') +
      (m ? '<a class="btn sec peq" href="' + e(m) + '" data-contato-op="' + o._row + '" data-canal="E-mail">✉️ E-mail</a>' : '');
  }
  // v0.6.1: tipo 'os' (status, orçamento, pronto, pós-entrega) aparece com aviso sem consentimento; 'marketing' some.
  function waCli(c, texto, tipo, motivo) {
    tipo = tipo || V.tipoMsgCliente(D, c, [motivo, texto].filter(Boolean).join(' '));
    var b = V.botaoWaCliente(c, tipo, texto);
    if (!b) return '<span class="muted" data-wa-tipo="' + tipo + '">' + (c && /^s/i.test(String(c.naoContatar || '').trim()) ? '⛔ Cliente marcado como “Não contatar”.' : c && c.consent !== 'Sim' ? (tipo === 'marketing' ? 'Sem consentimento LGPD: mensagem de marketing não pode. Ligue.' : 'Sem consentimento para WhatsApp: ligue.') : 'WhatsApp inválido: ligue.') + '</span>';
    return '<a class="btn wa peq" target="_blank" rel="noopener" data-wa-tipo="' + tipo + '" href="' + e(b.href) + '"' + attrReg(c, tipo === 'os' ? 'servico' : tipo, texto || motivo || '') + '>📲 WhatsApp</a>' +
      (b.aviso ? '<span class="muted aviso-lgpd">⚠️ Sem consentimento LGPD: só mensagem sobre a OS.</span>' : '');
  }
  // v0.7.9: corpo de Oportunidades reutilizado em #vendas e #clientes/oportunidades.
  function corpoOportunidades() {
      if (D._opsPendentes) return '<div class="vazio" id="opsCarregando">Carregando as oportunidades guardadas no aparelho…</div>'; // v0.9.3: fora do caminho crítico da abertura
      // Filtro por cidade (chips com contagem). Some se nenhuma oportunidade tem cidade.
      var cids = memoOps('cids', V.cidadesOps), temCid = cids.some(function (c) { return c.chave !== V.SEM_CIDADE; });
      var fOp = Object.assign({}, F.op);
      if (!temCid || !cids.some(function (c) { return c.chave === fOp.cidade; })) fOp.cidade = '';
      var chip = function (k, rot) { return '<button type="button" class="chip" data-cidade="' + e(k) + '" aria-pressed="' + (fOp.cidade === k) + '">' + e(rot) + '</button>'; };
      var barraCid = temCid ? '<div class="chips" id="fCidade" role="group" aria-label="Filtrar por cidade">' + chip('', 'Todas (' + (D.oportunidades || []).length + ')') +
        cids.map(function (c) { return chip(c.chave, c.nome + ' (' + c.n + ')'); }).join('') + '</div>' : '';
      var nWa = memoOps('nWa', function (l) { return (l || []).filter(V.temWaOp).length; }), nIg = memoOps('nIg', function (l) { return (l || []).filter(V.temIgOp).length; });
      var barraWa = '<div class="chips" role="group" aria-label="Filtrar por WhatsApp e Instagram"><button type="button" class="chip" id="fWa" aria-pressed="' + !!F.op.wa + '">📲 WhatsApp (' + nWa + ')</button>' +
        '<button type="button" class="chip" id="fIg" aria-pressed="' + !!F.op.ig + '">📸 Tem Instagram (' + nIg + ')</button></div>';
      // v0.8.8: Ainda não contactei × Já contactei (com contagem).
      var cc = memoOps('cc', V.contagemContatoOps), chipC = function (k, rot) { return '<button type="button" class="chip" data-contato="' + k + '" aria-pressed="' + ((F.op.contato || '') === k) + '">' + rot + '</button>'; };
      var barraContato = '<div class="chips" id="fContato" role="group" aria-label="Filtrar por contato">' + chipC('', 'Todas') + chipC('nao', '🆕 ' + V.SITUACAO_CONTATO.nao + ' (' + cc.nao + ')') + chipC('sim', '✅ ' + V.SITUACAO_CONTATO.sim + ' (' + cc.sim + ')') + '</div>';
      // v0.9.2: 50 por vez (o toque não trava com centenas de cards). Busca e filtros valem sobre a lista toda; mudou o filtro, volta para 50.
      var filtroRetorno = [
        ['', 'Todos os retornos'], ['atrasado', 'Retornos atrasados'], ['hoje', 'Retornos de hoje']
      ].map(function (x) {
        return '<button type="button" class="chip" data-retorno-op="' + x[0] + '" aria-pressed="' + (F.op.retorno === x[0]) + '">' + x[1] + '</button>';
      }).join('');
      fOp.retorno = F.op.retorno;
      fOp.hoje = D.hoje;
      var sig = JSON.stringify([fOp.retorno, fOp.hoje, fOp.status, fOp.prioridade, fOp.segmento, fOp.q, fOp.cidade, fOp.wa, fOp.contato, fOp.ig]);
      var indice = memoOps('busca', function (lista) {
        return { ordenadas: V.prepararBuscaOps(lista), textos: new WeakMap() };
      });
      if (indice.sig !== sig) {
        indice.resultados = V.filtrarOps(null, fOp, indice.ordenadas, indice.textos);
        indice.sig = sig;
      }
      var ops = indice.resultados;
      if (sig !== F.op.sig || !F.op.qtd) { F.op.sig = sig; F.op.qtd = OP_PASSO; }
      var mostra = Math.min(ops.length, F.op.qtd);
      return '<div class="chips" role="group" aria-label="Filtrar por data de retorno">' + filtroRetorno + '</div>' + barraContato + barraCid + barraWa + '<div class="filtros">' + sel('fSt', D.statusOp, F.op.status, 'Todos os status') + sel('fPri', V.PRI, F.op.prioridade, 'Todas as prioridades') + sel('fSeg', D.segmentos, F.op.segmento, 'Todos os segmentos') + busca('fQ', F.op.q, 'Buscar empresa, bairro…') + '</div>' +
        '<p class="muted" id="contagem">' + ops.length + ' de ' + (D.oportunidades || []).length + ' empresas</p>' +
        '<p class="muted" id="opsAtualizando"' + (OPS_ATUALIZANDO ? '' : ' hidden') + '>🔄 Atualizando a lista com o CRM… (pode usar normalmente)</p>' +
        (ops.length > mostra ? '<p class="muted" id="opMostrando">Mostrando ' + mostra + ' de ' + ops.length + '.</p>' : '') +
        lista(ops.slice(0, mostra), function (o) {
          return card(e(o.empresa), e(o.segmento) + ' · ' + e(o.bairro) + (o.lembrete ? ' · ⏰ ' + V.dataBR(o.lembrete) : '') + (o.proximoPasso ? '<br>' + e(o.proximoPasso) : '') + (o.valorEst ? '<br>Valor estimado ' + V.brl(o.valorEst) : '') + blocoContatoOp(o),
            tagPri(o.prioridade) + '<span data-op-st="' + o._row + '">' + tag(o.status) + '</span>', waOp(o) + igOp(o) + contatoOp(o) + botao('Editar', 'op-editar', o._row) + (o.status !== 'Virou lead' && !V.bloqueadaOp(o) ? botao('➜ Virar lead', 'op-lead', o._row) : ''));
        }, 'Nenhuma empresa com esse filtro.') +
        (ops.length > mostra ? '<div class="acoes"><button type="button" class="btn sec" id="opMais">Ver mais ' + Math.min(OP_PASSO, ops.length - mostra) + '</button></div>' : '');
  }
  // v0.9.3: 📸 Instagram (só com @ válido e as mesmas regras do WhatsApp). Toque = copia o texto curto do Direct e abre o perfil.
  function igOp(o) {
    if (!V.podeIgOp(o)) return '';
    var h = V.instagramOp(o), ja = V.canaisUsadosOp(o).indexOf('Instagram') >= 0, niv = V.camposIgOp(o).nivel;
    return '<a class="btn ig peq" target="_blank" rel="noopener" href="' + e(V.linkInstagram(h)) + '" data-ig-op="' + o._row + '" data-ig-handle="' + e(h) + '" title="@' + e(h) + (niv && !/confirm/i.test(niv) ? ' (perfil ' + e(niv) + ': confira antes)' : '') + '">' + rotuloIg(ja) + '</a>';
  }
  function rotuloIg(ja) { return '📸 Instagram' + (ja ? ' (já enviado)' : ''); }
  function linhaCanaisOp(o) { var l = V.canaisUsadosOp(o); return '<div class="canais-op muted" data-op-canais="' + o._row + '"' + (l.length ? '' : ' hidden') + '>Já usado: ' + l.map(function (c) { return (c === 'WhatsApp' ? '📲 ' : c === 'Instagram' ? '📸 ' : '') + e(c); }).join(' · ') + '</div>'; }
  // v0.8.8: último contato em destaque + histórico abrível no próprio card (sem abrir Editar).
  function blocoContatoOp(o) {
    var u = V.ultimoContatoOp(o), h = V.historicoOp(o);
    var ult = '<div class="ult-contato' + (u ? '' : ' nunca') + '" data-op-ult="' + o._row + '">' + (u ? '📌 <b>Último contato: ' + e(V.dataBR(u.data)) + '</b>' + (u.canal ? ' · ' + e(u.canal) : '') : '🆕 Ainda não contactei') + '</div>';
    var hist = '<details class="hist-op" data-op-hist="' + o._row + '"' + (h.length ? '' : ' hidden') + '><summary>🕘 Histórico (' + h.length + ')</summary><ul>' +
      h.map(function (x) { return '<li>' + (x.data ? '<b>' + e(V.dataBR(x.data)) + '</b> – ' : '') + e(x.texto) + '</li>'; }).join('') + '</ul></details>';
    var parc = o._parcial ? '<div class="muted" data-op-parcial="' + o._row + '">⏳ Empresa nova na lista: consentimento e histórico chegam na próxima atualização completa (🔄 Atualizar). Até lá, sem botões de contato.</div>' : '';
    return parc + ult + linhaCanaisOp(o) + hist;
  }
  function abas(base, itens, sub) { return '<div class="abas">' + itens.map(function (x, i) { var on = (sub || itens[0][0]) === x[0]; return '<a href="#' + base + (i ? '/' + x[0] : '') + '" class="' + (on ? 'ativo' : '') + '">' + x[1] + '</a>'; }).join('') + '</div>'; }
  function sel(id, lst, v, todos) { return '<select id="' + id + '" aria-label="' + todos + '"><option value="">' + todos + '</option>' + (lst || []).map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + e(x) + '</option>'; }).join('') + '</select>'; }
  function busca(id, v, ph) { return '<input class="q" id="' + id + '" type="search" placeholder="' + ph + '" value="' + e(v) + '">'; }
  // Maps / Agenda / Gmail. Agenda e Gmail = ações PROPOSTAS: o botão só aparece se api.pode() (some se o servidor disser "ação desconhecida").
  function mapsBtn(end) { var l = V.linkMaps(end); return l ? '<a class="btn sec peq" data-maps target="_blank" rel="noopener" href="' + e(l) + '">🗺️ Abrir no Maps</a>' : ''; }
  // eventoId da OS: vem do getDados (coluna "Evento da agenda (ID)") ou, se o getDados não mandar, do registro local do aparelho.
  function eventoDaOS(o) { return String(o.eventoId || ''); } // vem do servidor (coluna "Evento da agenda (ID)")
  function temCol(lista, k) { return V.temCampo(D[lista], k, D.colunas && D.colunas[lista]); }
  function agendaBtn(o) { var id = eventoDaOS(o); if (!api.pode('criarEventoAgenda')) return id ? '<span class="tag ok">Na agenda ✓</span>' : '';
    return id ? '<span class="tag ok" id="naAgenda">Na agenda ✓</span>' + botao('Atualizar na agenda', 'ag-os', o._row) + (api.pode('removerEventoAgenda') ? botao('Tirar da agenda', 'ag-rem-os', o._row) : '') : botao('📅 Pôr na agenda', 'ag-os', o._row); }
  function emailBtn(c, acao, row) { return api.pode('enviarEmailCliente') && V.podeEmailCliente(c) ? botao('✉️ Enviar e-mail', acao, row) : ''; }
  function achar(lista, row) {
    var numero = Number(row);
    return (D[lista] || []).find(function (x) { return x._row === numero; });
  }
  var LIMITE = 100, OP_PASSO = 50, OS_PASSO = 50;
  var tagStatusOS = function (s) { return tag(s, s === 'Pronto' ? 'media' : s === 'Aguardando aprovação' || s === 'Aguardando peça' ? 'alta' : 'cinza'); };

  // v0.5.4: leads que chegaram pela página pública de cadastro (leadsLink). WhatsApp só manual, um a um (link wa.me).
  // v0.7.1: leads com situação do servidor (Novo, Contatado, Sem interesse, Convertido) + chips + definirStatusLead.
  var SIT_LEAD = ['Novo', 'Contatado', 'Sem interesse', 'Convertido'];
  function situacaoLead(l) { if (l.situacao) return l.situacao; var s = String(l.status || '').trim(); return !s || /^novo/i.test(s) ? 'Novo' : /^convert/i.test(s) ? 'Convertido' : /^contatad/i.test(s) ? 'Contatado' : /^sem interesse/i.test(s) ? 'Sem interesse' : /^exclu/i.test(s) ? 'Excluído' : s; }
  function leadsVisiveis() { return (D && D.leadsLink || []).filter(function (l) { return situacaoLead(l) !== 'Excluído'; }); }
  function leadsNovos() { return leadsVisiveis().filter(function (l) { return situacaoLead(l) === 'Novo'; }); }
  function waLead(l) { var n = l.consentimento === true || /^(sim|true)$/i.test(String(l.consentimento)) ? V.numeroWa(l.telefone) : null;
    var t = 'Olá ' + String(l.nome || '').split(' ')[0] + ', aqui é da ProFix Computadores. Recebemos seu cadastro' + (l.servico ? ' sobre: ' + l.servico : '') + '. Como podemos ajudar?';
    return n ? '<a class="btn wa peq" data-wa-lead="' + l._row + '" target="_blank" rel="noopener" href="' + e(V.urlWhats(n, t)) + '">📲 WhatsApp</a>' : '<span class="muted">Telefone inválido ou sem consentimento.</span>'; }
  function secaoLeadsLink() { var todos = leadsVisiveis(); if (!todos.length) return '';
    var sit = F.lead.sit, cont = {}; SIT_LEAD.forEach(function (k) { cont[k] = 0; }); todos.forEach(function (l) { var k = situacaoLead(l); cont[k] = (cont[k] || 0) + 1; });
    var l = todos.filter(function (x) { return !sit || situacaoLead(x) === sit; });
    var chips = '<div class="chips" id="fLeadChips" role="group" aria-label="Filtrar leads">' + [['', 'Todos (' + todos.length + ')']].concat(SIT_LEAD.map(function (k) { return [k, k + ' (' + cont[k] + ')']; })).map(function (k) { return '<button type="button" class="chip" data-chip-lead="' + e(k[0]) + '" aria-pressed="' + (sit === k[0]) + '">' + e(k[1]) + '</button>'; }).join('') + '</div>';
    return '<h2 id="leads-link">🔗 Cadastros pelo link <span class="tag alta">' + cont.Novo + '</span></h2>' + chips + lista(l, function (x) {
      var st = situacaoLead(x), muda = api.pode('definirStatusLead') ? SIT_LEAD.filter(function (k) { return k !== st && st !== 'Convertido'; }).map(function (k) { return botao(k === 'Convertido' ? '✅ Converter em cliente' : '→ ' + k, 'lead-st', x._row + '|' + k); }).join('') : '';
      return card(e(x.nome), [e(x.telefone), x.cidade ? e(x.cidade) : '', x.servico ? e(x.servico) : '', x.dataHora ? '⏰ ' + e(x.dataHora) : ''].filter(Boolean).join(' · ') + (x.clienteExistente ? '<br>⚠️ Telefone já é do cliente ' + e(x.clienteExistente.nome) + ' (não junta sozinho).' : '') + (x.statusEm ? '<br><span class="muted">' + e(st) + ' em ' + e(x.statusEm) + '</span>' : ''),
        tag(st, st === 'Novo' ? 'alta' : st === 'Convertido' ? 'ok' : 'cinza') + (x.followup ? tag('follow-up', 'media') : ''), (st !== 'Convertido' ? waLead(x) : '') + muda + (api.pode('excluirRegistro') ? botao('🗑 Excluir', 'lead-excluir', x._row, 'perigo') : ''), ' data-lead="' + x._row + '"'); }, 'Nenhum lead com esse filtro.'); }
  // v0.8.8: novos cadastros do site em destaque no topo do Hoje, com atalho para a tela só deles (#leads).
  function bannerLeadsSite() {
    var todos = leadsVisiveis(); if (!todos.length) return '';
    var n = leadsNovos().length;
    return '<a class="banner-leads' + (n ? ' tem' : '') + '" id="bannerLeads" href="#leads">🔗 ' + (n ? '<b>' + n + '</b> cadastro' + (n === 1 ? ' novo' : 's novos') + ' pelo site' : 'Cadastros pelo site: nenhum novo') + '<span>Ver ' + (n ? 'agora' : 'todos') + ' ›</span></a>';
  }
  function telaLeads() {
    var todos = leadsVisiveis();
    return '<a class="mais-voltar" href="#hoje">← Voltar para Hoje</a><h1>🔗 Cadastros pelo site</h1>' +
      '<p class="muted">Quem preencheu o formulário do site já está no CRM. WhatsApp só um a um, tocado por você, e só com consentimento.</p>' +
      (todos.length ? secaoLeadsLink() : '<div class="vazio">Nenhum cadastro pelo site ainda.</div>');
  }
  function acoesHojeOS(o) {
    if (!o) return '';
    return (api.pode('textoStatusOS') ? botao('📲 Avisar status', 'os-msg', o._row) : '') +
      (api.pode('mudarStatusOS') ? botao('Mudar status', 'os-status', o._row) : '') + botao('Abrir OS', 'os-abrir', o._row);
  }
  function cartaoHojeOS(o) { return card(e(o.num) + ' · ' + e(o.cliente), e(o.equipamento), tagStatusOS(o.status), acoesHojeOS(o), ' data-hoje-os="' + o._row + '"'); }
  function proximaOS(o) {
    var a = V.proximaAcaoOS(o), acao = { 'os-pronto': 'mudarStatusOS', 'os-msg': 'textoStatusOS', 'os-chk': 'salvarChecklistOS', 'os-orc': 'salvarOrcamento', 'os-status': 'mudarStatusOS' };
    if (!api.pode(acao[a[0]])) return '';
    return '<div class="grandes" id="proximaOS">' + botao(a[1], a[0], o._row, 'primaria').replace(' peq', '') + '</div>';
  }
  // ---------- Telas ----------
  var TELAS = {
    hoje: function () {
      if (!CT && api.pode('listaContratos')) carregarCT();
      var H = V.hoje(D), bancada = V.emBancada(D), entregas = V.entregasDoDia(D);
      var rev = V.revisoes30dias(D), fimG = V.fimGarantia(D, Dif.padroes(D).garantiaDias);
      var visitasHoje = V.visitasDoDia((CT && CT.visitas) || [], D.hoje);
      var itemContato = function (x) {
        if (x.tipo === 'op') { var o = x.ref; return card(e(o.empresa), 'Empresa · ' + e(x.acao) + ' · ⏰ ' + V.dataBR(x.data), tagPri(o.prioridade), waOp(o) + botao('Editar', 'op-editar', o._row) + botao('Reativar 1×', 'op-reativar', o._row)); }
        var c = x.ref; return card(e(c.nome), e(x.acao) + ' · ⏰ ' + V.dataBR(x.data), x.data < D.hoje ? tag('atrasado', 'vencido') : '', waCli(c, '', '', x.acao) + botao('Registrar conversa', 'cli-inter', c._row) + botao('Reativar 1×', 'cli-reativar', c._row));
      };
      var badgeParada = function (o) { var b = V.badgeParada3d(o, D.hoje); return b ? tag('🐢 ' + b.texto, 'parada') : ''; };
      return '<h1>Hoje · ' + V.dataBR(D.hoje) + '</h1>' +
        '<div class="acoes">' + botao('+ Nova OS', 'os-nova', '', 'primaria') +
          (api.pode('salvarOrcamento') ? botao('Orçamento rápido', 'orc-novo', '', 'sec') : '') + '</div>' +
        bannerLeadsSite() +
        '<div class="resumo"><div><b>' + H.chamar.length + '</b>para chamar</div><div><b>' + bancada.length + '</b>em bancada</div><div><b>' + entregas.length + '</b>entregas do dia</div><div><b>' + H.cobrar.length + '</b>OS para cobrar</div></div>' +
        secaoLeadsLink() +
        '<section id="emBancada"><h2>🔧 Em bancada</h2>' + lista(bancada, function (o) { return card(e(o.num) + ' · ' + e(o.cliente), e(o.equipamento || '') + (o.statusEm ? ' · desde ' + V.dataBR(o.statusEm) : ''), tagStatusOS(o.status) + badgeParada(o), acoesHojeOS(o) + botao('Msg serviço', 'os-msg-tipo', o._row)); }, 'Nada em bancada.') + '</section>' +
        '<section id="entregasDia"><h2>📦 Entregas do dia</h2>' + lista(entregas, function (o) { return card(e(o.num) + ' · ' + e(o.cliente), e(o.equipamento || '') + (o.previsao ? ' · previsão ' + V.dataBR(o.previsao) : ''), tagStatusOS(o.status), acoesHojeOS(o)); }, 'Nenhuma entrega prevista para hoje.') + '</section>' +
        '<section id="visitasHoje"><h2>🚗 Visitas de hoje <a class="link-sec" href="#agenda">Agendamento ›</a></h2>' + (!CT && api.pode('listaContratos') ? '<div class="vazio">Carregando visitas…</div>' : lista(visitasHoje, function (v) {
          var c = (D.clientes || []).filter(function (k) { return k.nome === v.cliente; })[0];
          return card(e(v.id) + ' · ' + e(v.cliente), (V.horaVisita(v) ? e(V.horaVisita(v)) + ' · ' : '') + e(v.status) + (v.os ? ' · ' + e(v.os) : ''), tag(v.prioridade, V.norm(v.prioridade)), botao('Lembrete', 'vis-msg', v.id + '|lembrete') + botao('Confirmar', 'vis-msg', v.id + '|confirmar') + (c ? botao('📇 Ficha', 'cli-ficha', c._row) : ''), ' data-visita-hoje="' + e(v.id) + '"');
        }, 'Nenhuma visita agendada para hoje.')) + '</section>' +
        '<section id="prontasAvisar"><h2>📲 Prontas para avisar o cliente</h2><p class="muted">OS com status Pronto. Abrir o WhatsApp não confirma envio nem leitura.</p>' + lista(V.prontasOS(D), cartaoHojeOS, 'Nenhuma OS pronta.') + '</section>' +
        '<section id="revisao30"><h2>🔁 Revisão 30 dias</h2><p class="muted">Só para quem aceitou lembretes. Uma mensagem; quem envia é você.</p>' + lista(rev, function (x) {
          var c = V.clienteDaOS(D, x.ref) || { nome: x.cliente }; var txt = V.textoRevisao30(c, x.ref);
          return card(e(x.num) + ' · ' + e(x.cliente), 'Entregue há ' + x.dias + ' dias · ' + e(x.aparelho), tag('revisão', 'media'), waCli(c, txt, 'marketing') + botao('Abrir OS', 'os-abrir', x.ref._row));
        }, 'Nenhuma revisão nesta janela.') + '</section>' +
        '<section id="fimGarantia"><h2>🛡 Fim de garantia (até 5 dias)</h2>' + lista(fimG, function (x) {
          var c = V.clienteDaOS(D, x.ref) || { nome: x.cliente }; var txt = V.textoFimGarantia(c, x.ref, x.ate);
          return card(e(x.num) + ' · ' + e(x.cliente), 'Garantia até ' + V.dataBR(x.ate) + ' · restam ' + x.restam + ' dia(s)', tag('garantia', x.restam <= 1 ? 'vencido' : 'media'), waCli(c, txt, 'os') + botao('Abrir OS', 'os-abrir', x.ref._row));
        }, 'Nenhuma garantia acabando agora.') + '</section>' +
        '<h2>📞 Quem chamar hoje</h2>' + lista(H.chamar, itemContato, 'Ninguém para chamar hoje 🎉') +
        '<h2>⏳ Sem resposta há 3 dias ou mais</h2>' + lista(H.semResposta, itemContato, 'Nenhum contato parado.') +
        '<h2>💰 OS para cobrar</h2>' + lista(H.cobrar, function (x) { return card(e(x.num) + ' · ' + e(x.cliente), 'Saldo ' + V.brl(x.saldo), tagStatusOS(x.status), botao('Receber', 'os-receber', x.ref._row, '') + botao('💬 Cobrar (Pix)', 'os-cobrar', x.ref._row, '') + acoesHojeOS(x.ref)); }, 'Nenhuma OS para cobrar.') +
        secaoPecasComprar() +
        (H.paradas && H.paradas.length ? '<h2>🐢 OS paradas (3+ dias sem movimento)</h2>' + lista(H.paradas, function (x) { var o = x.ref || achar('os', x.row); return card(e(x.num) + ' · ' + e(x.cliente), e(x.status) + (o ? ' · ' + e((V.badgeParada3d(o, D.hoje) || {}).texto || '') : ''), tag('parada', 'parada'), acoesHojeOS(o)); }, '') : '') +
        '<h2>✅ Tarefas</h2>' + lista(H.tarefas || [], function (t) { return card(e(t.tarefa), e(t.cliente || '') + ' · ' + V.dataBR(t.data), t.data < D.hoje ? tag('atrasada', 'vencido') : '', botao('Marcar feita', 'tar-feita', t._row)); }, 'Sem tarefas para hoje.') +
        '<h2>📅 Agenda</h2>' + lista(H.agenda || [], function (a) { return card(e(a.titulo), V.dataBR(a.data) + ' · ' + e(a.inicio || '') + (a.local ? ' · ' + e(a.local) : ''), a.eventoId ? '<span class="tag ok">Na agenda ✓</span>' : '', mapsBtn(a.local && a.local.length > 12 ? a.local : '') + (a.eventoId && api.pode('criarEventoAgenda') ? botao('Remarcar', 'ag-ev', a.eventoId) : '') + (a.eventoId && api.pode('removerEventoAgenda') ? botao('Tirar da agenda', 'ag-rem', a.eventoId) : '')); }, 'Agenda livre nos próximos 7 dias.');
    },
    servicos: function () {
      var q = V.norm(F.os.q), l = (D.os || []).filter(function (o) { return (!F.os.status || o.status === F.os.status) && (!q || V.norm([o.num, o.cliente, o.equipamento, o.defeito].join(' ')).indexOf(q) >= 0); })
        .sort(function (a, b) { return String(b.num) < String(a.num) ? -1 : 1; });
      var filtro = JSON.stringify([F.os.status, F.os.q]);
      if (F.os.filtro !== filtro) { F.os.filtro = filtro; F.os.qtd = OS_PASSO; }
      var mostra = Math.min(l.length, F.os.qtd);
      return '<div class="row"><h1>Serviços (OS)</h1>' + botao('+ Nova OS', 'os-nova', '', 'primaria') + (api.pode('salvarOrcamento') ? botao('⚡ Orçamento rápido', 'orc-novo', '', 'primaria') : '') + '</div>' +
        '<div class="filtros">' + sel('fOsSt', D.statusOS, F.os.status, 'Todos os status') + busca('fOsQ', F.os.q, 'Buscar OS, cliente, equipamento…') + '</div>' +
        '<p class="muted" id="contagem">' + l.length + ' OS</p>' +
        lista(l.slice(0, mostra), function (o) { var s = ['Pronto', 'Entregue'].indexOf(o.status) >= 0 ? V.saldoOS(D, o) : 0, b = V.badgeParada3d(o, D.hoje); return card(e(o.num) + ' · ' + e(o.cliente), e(o.equipamento) + ' · ' + (o.valor ? V.brl(o.valor) : o.orcamento ? 'Orçamento ' + V.brl(o.orcamento) : 'sem valor') + (s > 0 ? ' · saldo ' + V.brl(s) : ''), tagStatusOS(o.status) + (b ? tag('🐢 ' + b.dias + 'd', 'parada') : ''), botao('Abrir', 'os-abrir', o._row, '') + (o.status === 'Em diagnóstico' && api.pode('salvarOrcamento') ? botao('Orçamento', 'os-orc', o._row) : '') + botao('Msg', 'os-msg-tipo', o._row)); }, 'Nenhuma OS com esse filtro.') +
        (mostra < l.length ? '<div class="acoes"><button type="button" class="btn sec" id="osMais">Ver mais ' + Math.min(OS_PASSO, l.length - mostra) + ' OS</button></div>' : '');
    },
    clientes: function (sub) {
      var cab = '<div class="row"><h1>Clientes</h1>' + botao('+ Novo cliente', 'cli-novo', '', '') + '</div>' + abas('clientes', [['lista', 'Lista'], ['funil', 'Funil'], ['oportunidades', 'Oportunidades']], sub).replace('<div class="abas">', '<nav class="abas clientes-abas" aria-label="Seções de Clientes">').replace(/<\/div>$/, '</nav>');
      if (sub === 'oportunidades') return cab + corpoOportunidades(); // v0.7.9: mesma visão de Vendas
      if (sub === 'funil') {
        var g = V.funil(D);
        return cab + '<div class="funil">' + Object.keys(g).map(function (et) {
          return '<section class="col"><h2>' + e(et) + ' <span class="muted">(' + g[et].length + ')</span></h2>' + (g[et].map(function (c) {
            return card(e(c.nome), e(c.origem || '') + (c.valorEst ? ' · ' + V.brl(c.valorEst) : '') + (c.motivoPerda ? ' · motivo: ' + e(c.motivoPerda) : ''), '', botao('Mover etapa', 'cli-etapa', c._row));
          }).join('') || '<div class="muted">—</div>') + '</section>';
        }).join('') + '</div>';
      }
      return telaClientesLista(cab); // v0.7.0: busca única + chips + cartão (diferenciais.js)
    },
    vendas: function (sub) {
      var itens = [['oportunidades', 'Oportunidades'], ['revenda', 'Revenda']], atual = itens.find(function (i) { return i[0] === sub; });
      var links = function (lista) { return itens.map(function (i) { return '<a href="#vendas/' + i[0] + '"' + (!lista && (sub || 'oportunidades') === i[0] ? ' class="ativo" aria-current="page"' : '') + '>' + i[1] + (lista ? '<span aria-hidden="true">›</span>' : '') + '</a>'; }).join(''); };
      var cab = (sub ? '<a class="mais-voltar vendas-voltar" href="#vendas">← Voltar para Vendas</a>' : '') +
        '<h1><span class="mais-titulo-desktop">Vendas</span><span class="mais-titulo-mobile">' + (atual ? atual[1] : 'Vendas') + '</span></h1>' +
        '<nav class="abas mais-abas vendas-abas" aria-label="Seções de Vendas">' + links(false) + '</nav>' +
        (!sub ? '<nav class="mais-lista vendas-lista" aria-label="Opções de Vendas">' + links(true) + '</nav>' : '');
      if (sub === 'revenda') return cab + '<div class="row">' + botao('+ Novo item', 'rv-novo', '', '') + '</div>' + lista(D.revenda || [], function (r) {
        var lu = V.lucroRevenda(r);
        return card(e(r.id) + ' · ' + e(r.equipamento), e(r.config || '') + '<br>Custo ' + V.brl(V.custoRevenda(r)) + ' · ' + (r.status === 'Vendido' ? 'vendido por ' + V.brl(r.precoVenda) : 'anunciado ' + V.brl(r.anunciado)) + (lu != null ? ' · lucro ' + V.brl(lu) : ''),
          tag(r.status), botao('Editar', 'rv-editar', r._row) + (r.status !== 'Vendido' ? botao('Registrar venda', 'rv-vender', r._row, '') : ''));
      }, 'Nada na revenda.');
      return cab + '<div' + (!sub ? ' class="mais-padrao"' : '') + '>' + corpoOportunidades() + '</div>';
    },
    mais: function (sub) {
      // v0.7.7: no celular, Mais é uma lista; dentro da seção só fica o caminho de volta.
      // CSS acompanha o breakpoint da barra lateral, inclusive ao girar/redimensionar a tela.
      var itens = [['financeiro', 'Financeiro'], ['visitas', 'Visitas'], ['mes', 'Mês'], ['suprimentos', 'Suprimentos'], ['calculadora', 'Calculadora PC'], ['catalogo', 'Catálogo'], ['precos', 'Preços OS'], ['modelos', 'Modelos'], ['lixeira', 'Lixeira'], ['ajustes', 'Ajustes']];
      var atual = itens.filter(function (x) { return x[0] === sub; })[0];
      var links = function (lista) { return itens.map(function (x) {
        var on = (sub || 'financeiro') === x[0];
        return '<a href="#mais/' + x[0] + '"' + (!lista && on ? ' class="ativo" aria-current="page"' : '') + '>' + x[1] + (lista ? '<span aria-hidden="true">›</span>' : '') + '</a>';
      }).join(''); };
      var cab = (sub ? '<a class="mais-voltar" href="#mais">← Voltar para Mais</a>' : '') +
        '<h1><span class="mais-titulo-desktop">Mais</span><span class="mais-titulo-mobile">' + (atual ? atual[1] : 'Mais') + '</span></h1>' +
        '<nav class="abas mais-abas" aria-label="Seções de Mais">' + links(false) + '</nav>' +
        (!sub ? '<nav class="mais-lista" aria-label="Opções de Mais">' + links(true) + '</nav>' : '');
      if (sub === 'precos') return cab + telaPrecos();
      if (sub === 'visitas') return cab + telaVisitas();
      if (sub === 'mes') return cab + telaMes();
      if (sub === 'lixeira') return cab + telaLixeira();
      if (sub === 'suprimentos') return cab + telaSuprimentos();
      if (sub === 'calculadora') return cab + telaCalculadora();
      if (sub === 'catalogo') {
        var cats = V.catalogoComCombos(D.catalogo || []);
        return cab + '<div class="row">' + botao('+ Novo serviço', 'cat-novo', '', '') + '</div>' +
          '<section id="combosOficiais"><h2>Combos oficiais</h2><p class="muted">Valores à vista do Financeiro (09/11). Cada combo já tem 5% próprio; <b>não soma</b> com o desconto Pix do CRM (' + e(String(cfgPrecos().pix)) + '%).</p>' +
          lista(V.COMBOS_OFICIAIS, function (s) { return card(e(s.servico), V.brl(s.preco) + ' · ' + e(s.descricao), tag('Combo', 'ok'), ''); }, '') + '</section>' +
          lista(D.catalogo || [], function (s) { return card(e(s.servico), e(s.tipo || '') + ' · ' + V.brl(s.preco) + (s.sugerido ? '<br>Sugerido: ' + e(s.sugerido) : '') + (s.descricao ? '<br>' + e(s.descricao) : ''), tag(s.status || (s.ativo === 'Sim' ? 'Ativo' : 'Inativo')), botao('Editar', 'cat-editar', s._row)); }, 'Catálogo vazio.');
      }
      if (sub === 'modelos') return cab + '<div class="row">' + botao('+ Novo modelo', 'mod-novo', '', '') + '</div>' + lista(D.modelos || [], function (m) { return card(e(m.modelo), e(m.quando || '') + '<br><span class="pre">' + e(String(m.texto || '').slice(0, 160)) + (String(m.texto || '').length > 160 ? '…' : '') + '</span>', '', botao('Editar', 'mod-editar', m._row)); }, 'Nenhum modelo.') +
        '<p class="muted">Backup: continua pela planilha (menu ProFix CRM > Fazer backup agora / backup semanal).</p>';
      if (sub === 'ajustes') {
        var pc = cfgPrecos();
        var pixSrc = ajustes.pixFonte === 'crm' ? 'CRM (painel · Desconto no Pix)' : 'cache local / padrão ' + V.DESCONTO_PIX + '%';
        var anSrc = ajustes.anualFonte === 'crm' ? 'CRM (planosPublicos.anualPct)' : 'cache local / padrão ' + V.DESCONTO_ANUAL + '%';
        return cab + '<div class="card"><label class="chk"><input type="checkbox" id="ajSenha"' + (ajustes.mostrarSenha ? ' checked' : '') + '> Mostrar senha do aparelho</label><div class="m">Desligado: a senha das OS fica oculta. Mesmo ligado, ela só aparece se o servidor enviar (no crm-v3 isso também vem desligado).</div></div>' +
          '<div class="card" id="ajPrecos"><h3 style="margin:0 0 8px">Descontos comerciais</h3>' +
          '<p class="muted">Máquina extra fixa: <b>' + e(V.brl(V.EXTRA_MAQUINA)) + '/PC/mês</b>. Combos oficiais têm 5% próprio e <b>não somam</b> com o Pix.</p>' +
          '<p><b>Desconto no Pix:</b> ' + e(String(pc.pix)) + '% <span class="muted">· ' + e(pixSrc) + '</span></p>' +
          '<p><b>Contrato anual:</b> ' + e(String(pc.anual)) + '% <span class="muted">· ' + e(anSrc) + '</span></p>' +
          '<p class="muted">O % do Pix é um lugar só no CRM (API planosPublicos / getDados.config.pixPct). Mude no <b>painel do CRM</b> (Mais · Desconto no Pix). Sem internet, vale o último valor guardado neste aparelho (padrão 5% / 10%).</p></div>' +
          (function () { var pc = pixConfig(), srv = pc.fonte === 'servidor';
            return '<div class="card" id="ajRecebPix"><h3 style="margin:0 0 8px">💠 Pix para receber dos clientes</h3>' +
              '<p class="muted" id="ajPixFonte">' + (srv ? 'Usando a chave do <b>CRM</b> (painel). Os campos abaixo ficam guardados só como reserva.' : 'O CRM ainda não informa a chave Pix: vale o que está aqui (usado só se o servidor não informar).') + '</p>' +
              '<div><label for="ajPixChave">Chave Pix <span class="muted">(usado só se o servidor não informar)</span></label><input id="ajPixChave" autocomplete="off" value="' + e(ajustes.pixChave || PIX.PADRAO.chave) + '"></div>' +
              '<div><label for="ajPixNome">Nome do recebedor <span class="muted">(usado só se o servidor não informar)</span></label><input id="ajPixNome" autocomplete="off" maxlength="25" value="' + e(ajustes.pixNome || PIX.PADRAO.nome) + '"></div>' +
              '<div><label for="ajPixCidade">Cidade <span class="muted">(usado só se o servidor não informar)</span></label><input id="ajPixCidade" autocomplete="off" maxlength="15" value="' + e(ajustes.pixCidade || PIX.PADRAO.cidade) + '"></div>' +
              '<p class="muted" id="ajPixPrev">Chave em uso: <b>' + e(pc.chaveTexto) + '</b> · ' + e(pc.nome) + ' · ' + e(pc.cidade) + '</p>' +
              '<p class="erro" id="ajPixErro"></p><div class="acoes"><button type="button" class="btn sec" id="ajPixSalvar">Salvar Pix</button><button type="button" class="btn sec" id="ajPixPadrao">Voltar ao padrão</button></div>' +
              '<p class="muted">O código “copia e cola” é montado no aparelho, sem custo. Nenhuma mensagem sai sozinha.</p></div>'; })() +
          '<div class="acoes"><button class="btn" id="bInstalar" hidden>📲 Instalar o app</button><button class="btn sec" id="bSync">🔄 Atualizar agora</button><button class="btn sec" id="bSair">Sair deste aparelho</button></div>' +
          '<p class="muted" id="dicaIos"></p><p class="muted">Versão ' + e(CFG.VERSAO_APP || '') + ' · ' + (api.tipo === 'mock' ? 'modo demonstração' : 'conectado à planilha') + (api.ultimaAtualizacao() ? ' · dados de ' + new Date(api.ultimaAtualizacao()).toLocaleString('pt-BR') : '') + '</p>';
      }
      var ym = D.hoje.slice(0, 7), R = V.resumoMes(D, ym), l = (D.financeiro || []).slice().sort(function (a, b) { return String(b.data) < String(a.data) ? -1 : 1; });
      return cab + '<div' + (!sub ? ' class="mais-padrao"' : '') + '><div class="resumo"><div><b>' + V.brl(R.entradas) + '</b>entradas no mês</div><div><b>' + V.brl(R.saidas) + '</b>saídas no mês</div><div><b>' + V.brl(R.saldo) + '</b>saldo do mês</div><div><b>' + l.length + '</b>lançamentos</div></div>' +
        '<div class="row">' + botao('+ Novo lançamento', 'fin-novo', '', '') + '</div>' +
        blocoMEI() + blocoPainelFin() + blocoPrevisao() + '<h2>Lançamentos</h2>' +
        lista(l, function (f) { return card(e(f.descricao || f.categoria), V.dataBR(f.data) + ' · ' + e(f.categoria) + (f.os ? ' · ' + e(f.os) : '') + ' · ' + e(f.forma || ''), tag(f.tipo, f.tipo === 'Entrada' ? '' : 'alta') + ' <b>' + V.brl(f.tipo === 'Entrada' ? f.receita : f.custo) + '</b>'); }, 'Sem lançamentos.') + '</div>';
    }
  };

  // ---------- Formulário genérico ----------
  /** campos: [{k, r: rótulo, t: text|number|date|select|textarea, o: opções, req, ajuda}] → Promise(valores | null) */
  function formulario(titulo, campos, val, info) {
    val = val || {};
    var m = $('modal');
    m.innerHTML = '<form method="dialog" id="fGen"><h2 style="margin:0">' + titulo + '</h2>' + (info || '') + campos.map(function (c) {
      var id = 'c_' + c.k, v = val[c.k] == null ? '' : val[c.k], inp;
      if (c.t === 'select') inp = '<select id="' + id + '"' + (c.req ? ' required' : '') + '><option value=""></option>' + (c.o || []).map(function (x) { return '<option' + (String(x) === String(v) ? ' selected' : '') + '>' + e(x) + '</option>'; }).join('') + '</select>';
      else if (c.t === 'textarea') inp = '<textarea id="' + id + '" rows="3">' + e(v) + '</textarea>';
      else if (c.t === 'checkbox') return '<label class="chk"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + '> ' + c.r + '</label>';
      else inp = '<input id="' + id + '" type="' + (c.t === 'number' ? 'text" inputmode="decimal' : c.t || 'text') + '" value="' + e(v) + '"' + (c.req ? ' required' : '') + '>';
      return '<div><label for="' + id + '">' + c.r + (c.req ? ' *' : '') + '</label>' + inp + (c.ajuda ? '<div class="muted">' + c.ajuda + '</div>' : '') + '</div>';
    }).join('') + '<p class="erro" id="fErro"></p><div class="acoes"><button class="btn" value="ok" id="fSalvar">Salvar</button><button class="btn sec" value="cancelar" formnovalidate>Cancelar</button></div></form>';
    // v0.9.0: campos de dinheiro aceitam "1.234,56" / "157,51" (um só leitor: V.dinheiro) e chegam ao servidor como número em texto ("1234.56").
    $('fGen').addEventListener('submit', function (ev) {
      if (ev.submitter && ev.submitter.value === 'cancelar') return;
      var ruim = campos.filter(function (c) { var el = $('c_' + c.k); return V.campoDinheiro(c) && el && el.value.trim() !== '' && isNaN(V.dinheiro(el.value)); })[0];
      if (ruim) { ev.preventDefault(); ev.stopImmediatePropagation(); $('fErro').textContent = 'Valor inválido em “' + String(ruim.r).replace(/<[^>]*>/g, '') + '”. Ex.: 1.234,56'; }
    });
    return new Promise(function (ok) {
      m.onclose = function () {
        if (m.returnValue !== 'ok') return ok(null);
        var r = {}; campos.forEach(function (c) { var el = $('c_' + c.k); r[c.k] = c.t === 'checkbox' ? el.checked : el.value.trim(); if (V.campoDinheiro(c) && r[c.k] !== '') { var n = V.dinheiro(r[c.k]); if (!isNaN(n)) r[c.k] = String(n); } }); ok(r);
      };
      m.returnValue = ''; m.showModal();
    });
  }
  /** Pôr na agenda: confirma título/data/hora; chama criarEventoAgenda e marca eventoId na linha. */
  function agendar(p) {
    // Sem opção "convidar cliente": a aba Clientes não tem coluna de e-mail (convidarCliente vai sempre false).
    formulario('📅 Pôr na agenda', [{ k: 'titulo', r: 'Título', req: true }, { k: 'data', r: 'Dia', t: 'date', req: true }, { k: 'hora', r: 'Hora', t: 'time', req: true }, { k: 'duracao', r: 'Duração (min)', t: 'number' },
      { k: 'local', r: 'Local' }, { k: 'descricao', r: 'Descrição', t: 'textarea' }],
      { titulo: p.titulo, data: p.data, hora: p.hora || '10:00', duracao: '60', local: p.local, descricao: p.descricao }).then(function (v) {
      if (!v) return;
      var ini = new Date(v.data + 'T' + v.hora + ':00'), fim = new Date(ini.getTime() + (Number(v.duracao) || 60) * 60000), pad = function (n) { return ('0' + n).slice(-2); };
      var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00'; };
      escrever('criarEventoAgenda', [{ titulo: v.titulo, inicio: iso(ini), fim: iso(fim), descricao: v.descricao, local: v.local, refTipo: p.refTipo, refId: p.refId, linha: p.linha, convidarCliente: false }],
        function (cache, r) { if (!r || !r.eventoId || p.refTipo !== 'os') return;
          (cache.os || []).forEach(function (x) { if (x.num === p.refId) x.eventoId = r.eventoId; }); });
    });
  }
  /** Tela de confirmação do e-mail: texto pronto e editável; só envia depois do "Enviar e-mail". */
  function emailTela(c, o) {
    var tipo = o && ['Pronto', 'Entregue'].indexOf(o.status) >= 0 ? 'pronto' : 'orcamento';
    var t = o ? V.montarEmail(tipo, o, c, cfgEmail()) : { assunto: 'ProFix Computadores', corpo: 'Oi, ' + c.nome.split(' ')[0] + '!\n\n\nPedro — ProFix Computadores' };
    var cota = D.cotaEmail == null ? 'não informada' : String(D.cotaEmail);
    var p = formulario('✉️ Enviar e-mail', (o ? [{ k: 'modelo', r: 'Modelo', t: 'select', o: [V.EMAILS.orcamento.rotulo, V.EMAILS.pronto.rotulo] }] : []).concat([{ k: 'assunto', r: 'Assunto', req: true }, { k: 'corpo', r: 'Texto (pode editar)', t: 'textarea', req: true }]),
      { modelo: V.EMAILS[tipo].rotulo, assunto: t.assunto, corpo: t.corpo },
      '<div class="muted">Para: <b id="emPara">' + e(c.email) + '</b> · cota restante hoje: <b id="emCota">' + e(cota) + '</b><br>O servidor acrescenta o rodapé de atendimento (opt-out \u201cparar\u201d).</div><p class="alerta" id="emPend"' + (V.temPendencia(t.corpo) ? '' : ' hidden') + '>Texto com [CONFIRMAR …]: troque pelo valor certo antes de enviar (validade/garantia ainda não confirmadas no config.js).</p>');
    $('c_corpo').rows = 12; $('fSalvar').textContent = 'Enviar e-mail';
    if ($('c_modelo')) $('c_modelo').onchange = function () { var k = this.value === V.EMAILS.pronto.rotulo ? 'pronto' : 'orcamento', n = V.montarEmail(k, o, c, cfgEmail()); $('c_assunto').value = n.assunto; $('c_corpo').value = n.corpo; $('c_corpo').oninput(); };
    $('c_corpo').oninput = function () { $('emPend').hidden = !V.temPendencia(this.value); };
    $('fSalvar').addEventListener('click', function (ev) { if (V.temPendencia($('c_corpo').value)) { ev.preventDefault(); $('fErro').textContent = 'Troque o [CONFIRMAR …] antes de enviar.'; } });
    p.then(function (v) {
      if (!v) return;
      escrever('enviarEmailCliente', [{ clienteId: c.id, assunto: v.assunto, corpo: v.corpo, refId: o ? o.num : '', rodape: 'atendimento' }], function (cache, r) { if (r && r.restanteCota != null) cache.cotaEmail = r.restanteCota; });
    });
  }
  // v0.7.1: validade/garantia do e-mail vêm do servidor (getDados().config), nunca de valor fixo no app.
  function cfgEmail() { var p = window.ProFixDif.padroes(D); return Object.assign({}, CFG, { validadeDias: p.validadeDias, garantiaDias: p.garantiaDias }); }
  // ---------- v0.9.3: gravação otimista (a tela muda na hora; o envio vai pela fila em 2º plano, sem recarregar tudo) ----------
  function precisaServidor(acao) { return ProFixAPI.SO_ONLINE.indexOf(acao) >= 0 || (ProFixAPI.CONFIRMAR || []).indexOf(acao) >= 0; }
  /** opc: { recarregar (o servidor calcula algo que a tela não sabe: leitura em 2º plano depois do envio), tmp, salvo (texto do aviso) } */
  function escrever(acao, args, local, opc) {
    opc = opc || {}; opsMexeu();
    if (precisaServidor(acao)) return api.escrever(acao, args, local).then(function (r) { aviso(r.msg); renderSuave(); atualizarFundo(); return r; }, function (er) { aviso('Não salvou: ' + er.message); });
    return api.enviar(acao, args, local, { recarregar: !local || !!opc.recarregar, tmp: opc.tmp, idOp: opc.idOp, aoConfirmar: opc.aoConfirmar, aoFalhar: opc.aoFalhar }).then(function (r) {
      aviso(r.enfileirado ? r.msg : (opc.salvo || 'Salvo ✓')); faixa(); renderSuave(); return r;
    }, function (er) { aviso('Não salvou: ' + er.message); });
  }
  /** Pagamento recebido, Pix, mensalidade, Comprado: só aparece como feito DEPOIS do servidor (pedido do Compras). Enquanto isso: "enviando…". */
  var ENVIANDO = {};
  function enviarConfirmado(chave, rotulo, acao, args, local, idOp) {
    if (ENVIANDO[chave]) { aviso(ENVIANDO[chave] + ' Aguarde a confirmação do CRM.'); return Promise.reject(new Error('em andamento')); }
    ENVIANDO[chave] = rotulo + ' enviando…'; aviso(rotulo + ' enviando… só conta como feito quando o CRM confirmar.'); renderSuave();
    return api.escreverConfirmado(acao, args, local, idOp).then(function (r) { delete ENVIANDO[chave]; aviso(r.msg); renderSuave(); return r; },
      function (er) { delete ENVIANDO[chave]; aviso(rotulo + ' NÃO foi lançado: ' + er.message); renderSuave(); throw er; });
  }
  var ROT_OS_NOVA = 'OS nova (enviando…)';
  function rowProvisoria() { return -((Date.now() % 1000000000) + Math.floor(Math.random() * 1000)); }
  function acharProvisorio(tmp) { var a = null; ['os', 'clientes'].forEach(function (l) { ((D && D[l]) || []).forEach(function (x) { if (x._tmp === tmp) a = { lista: l, reg: x }; }); }); return a; }
  /** Resposta do servidor para um registro criado no aparelho: troca o provisório pelo número/linha reais (sem recarregar). */
  api.aoConfirmado = function (op, r) {
    if (!op.tmp) return; var a = acharProvisorio(op.tmp); if (!a) return;
    var row = r && (r._row || r.row), num = r && r.num;
    if (!row && !num) return; // repetição sem número ("Já recebido."): a leitura em 2º plano traz o registro (api.js marca recarregar)
    if (row) a.reg._row = Number(row); if (num) a.reg.num = num; if (r.id) a.reg.id = r.id;
    delete a.reg._tmp; delete a.reg._pendente; delete a.reg._erro; api.tocou(false); renderSuave();
  };
  api.aoRecusado = function (op, er) {
    if (!op.tmp) return; var a = acharProvisorio(op.tmp); if (!a) return;
    a.reg._erro = er.message; if (a.lista === 'os') a.reg.num = 'OS nova (NÃO salva no CRM)'; api.tocou(false); renderSuave();
  };
  api.aoMudar(function (ev) {
    faixa();
    if (ev.tipo === 'confirmado') { var msg = ev.dados && ev.dados.msg; if (msg && !/^J[aá] recebido/.test(msg) && !ev.op.silencioso) aviso(msg); }
    else if (ev.tipo === 'recusado') aviso('⚠️ O CRM não aceitou: ' + ev.erro.message + ' (está na faixa de cima: tente de novo ou descarte).');
    else if (ev.tipo === 'vazia' && ev.recarregar) atualizarFundo(false, 3000); // API @131: nada de getDados logo depois de gravar (o CRM fica lento ~16 s); aberturaApp com desde, um pouco depois
    else if (ev.tipo === 'ops') { OPS_ATUALIZANDO = ev.estado === 'inicio'; if (ev.estado !== 'inicio') { opsMexeu(); if (rota().tela === 'vendas' && (ev.mudou || ev.estado === 'erro')) renderSuave(); } indicadorOps(); }
  });
  // Oportunidades: contagens (cidade, WhatsApp, Instagram, contato) calculadas uma vez por versão da lista, não a cada toque.
  var OPS_MEMO = { v: 0 };
  function opsMexeu() { OPS_MEMO.v++; }
  function memoOps(chave, fn) {
    var lst = D.oportunidades; if (OPS_MEMO.ref !== lst || OPS_MEMO.vRef !== OPS_MEMO.v) { OPS_MEMO.ref = lst; OPS_MEMO.vRef = OPS_MEMO.v; OPS_MEMO.c = {}; }
    if (!(chave in OPS_MEMO.c)) OPS_MEMO.c[chave] = fn(lst); return OPS_MEMO.c[chave];
  }
  function aplicar(lista, row, mud) { return function (cache) { var x = (cache[lista] || []).filter(function (y) { return y._row === Number(row); })[0]; if (x) Object.keys(mud).forEach(function (k) { if (k[0] !== '_') x[k] = mud[k]; }); }; }

  // ---------- v0.7.8: OS rápida, sem sair do formulário ----------
  function opcoesClienteRapido(busca, select, escolhido) {
    var limite = 40;
    var clientes = V.buscarClientesOS(D.clientes, busca.value, limite + 1);
    var temMais = clientes.length > limite;
    if (temMais) clientes.pop();
    if (escolhido && !clientes.some(function (c) { return c._row === escolhido._row; })) clientes.unshift(escolhido);
    select.innerHTML = '<option value="">Escolha o cliente</option>' + clientes.map(function (c) {
      return '<option value="' + c._row + '"' + (escolhido && c._row === escolhido._row ? ' selected' : '') + '>' + e(c.nome) + (c.whatsapp ? ' · ' + e(c.whatsapp) : '') + '</option>';
    }).join('') + (temMais ? '<option disabled>Digite mais para encontrar outros clientes</option>' : '');
  }
  function abrirOSRapida(row, pre) {
    var o = row ? achar('os', row) : Object.assign({ cliente: '' }, pre), ocupada = false, clientePendente = false;
    var campos = [{ k: 'cliente', r: 'Cliente', t: 'select', req: true }, { k: 'equipamento', r: 'Equipamento', req: true }, { k: 'defeito', r: 'Defeito relatado' },
      { k: 'servico', r: 'Serviço', t: 'select', o: V.catalogoComCombos(D.catalogo || []).filter(function (s) { return s.ativo !== 'Não' && s.status !== 'Inativo'; }).map(function (s) { return s.servico; }) },
      { k: 'valor', r: 'Valor cobrado (R$)', t: 'number', ajuda: '<span id="precoAjuda">Preço do catálogo, editável. Peças à parte.</span>' },
      { k: 'previsao', r: 'Previsão de entrega', t: 'date' }, { k: 'acessorios', r: 'Acessórios deixados' }, { k: 'obsInt', r: 'Observações internas', t: 'textarea' }];
    formulario(row ? 'Editar ' + e(o.num) : 'Nova OS', campos, o,
      '<div><label for="osBuscaCli">Buscar cliente por nome ou WhatsApp</label><input id="osBuscaCli" type="search" autocomplete="off"></div>' +
      '<details id="osClienteNovo"><summary>Cadastrar cliente aqui</summary><label for="osCliNome">Nome *</label><input id="osCliNome" autocomplete="off">' +
      '<label for="osCliWa">WhatsApp *</label><input id="osCliWa" type="tel" autocomplete="off"><label class="chk"><input id="osCliConsent" type="checkbox">Cliente autorizou contato por WhatsApp</label>' +
      '<p class="muted">Sem marcar: consentimento Não. Não altera clientes já existentes.</p><button type="button" class="btn sec" id="osCliSalvar">Cadastrar cliente</button><p id="osCliResultado" role="status"></p></details>');
    var m = $('modal'), f = $('fGen'), selecao = o._rowCliente || ((D.clientes || []).find(function (c) { return c.nome === o.cliente; }) || {})._row;
    function opcoes() {
      var escolhido = (D.clientes || []).find(function (c) { return c._row === Number(selecao); });
      opcoesClienteRapido($('osBuscaCli'), $('c_cliente'), escolhido);
    }
    opcoes(); $('osBuscaCli').oninput = opcoes; $('c_cliente').onchange = function () { selecao = this.value; };
    $('c_servico').onchange = function () {
      var s = V.catalogoComCombos(D.catalogo || []).find(function (s) { return s.servico === $('c_servico').value; });
      $('c_valor').value = V.precoServicoOS(s);
      $('precoAjuda').textContent = (!s ? 'Selecione um serviço.' : V.precoServicoOS(s) === '' ? 'Sob orçamento: informe o valor após avaliar.' : (s.tipo === 'A partir de' ? 'A partir de: ' : 'Preço do catálogo: ') + V.brl(Number(V.precoServicoOS(s))) + '. Valor editável.') + (s && s.descricao ? ' ' + s.descricao : '') + ' Peças à parte (peça não inclusa).';
    };
    function valores() { var v = {}; campos.forEach(function (c) { v[c.k] = $('c_' + c.k).value.trim(); }); return v; }
    function travar(sim) { ocupada = sim; f.querySelectorAll('button').forEach(function (b) { b.disabled = sim; }); }
    $('osCliSalvar').onclick = async function () {
      if (ocupada) return;
      var nome = $('osCliNome').value.trim(), wa = $('osCliWa').value.trim(), out = $('osCliResultado');
      if (clientePendente) { out.textContent = 'Cadastro na fila: conecte e sincronize antes de criar a OS. Não cadastre outra vez.'; return; }
      if (!api.pode('salvarCliente')) { out.textContent = 'Cadastro ainda não liberado no servidor.'; return; }
      if (!navigator.onLine || offline) { out.textContent = 'Conecte para cadastrar e obter o vínculo do cliente antes de salvar a OS.'; return; }
      if (!nome || !V.numeroWa(wa)) { out.textContent = 'Informe nome e WhatsApp válido.'; return; }
      var igual = (D.clientes || []).find(function (c) { return V.norm(c.nome) === V.norm(nome) || (V.numeroWa(c.whatsapp) && V.numeroWa(c.whatsapp) === V.numeroWa(wa)); });
      if (igual) { selecao = igual._row; opcoes(); out.textContent = 'Cliente já cadastrado: selecionado, sem duplicar. Confira os dados.'; return; }
      travar(true);
      try {
        var consent = $('osCliConsent').checked;
        var r = await api.escrever('salvarCliente', [{ nome: nome, whatsapp: wa, consent: consent ? 'Sim' : 'Não', naoContatar: 'Não', dataConsent: consent ? D.hoje : '' }]);
        clientePendente = true;
        if (r.enfileirado) { out.textContent = 'Cadastro na fila: sincronize antes de criar a OS. Não cadastre outra vez.'; faixa(); return; }
        // v0.9.3: o CRM devolve a linha do cliente novo (row/id): entra na lista sem baixar tudo de novo.
        var dr = r.dados || {}, novo = null;
        if (dr.row || dr._row) { novo = { _row: Number(dr.row || dr._row), id: dr.id || '', nome: nome, whatsapp: wa, consent: consent ? 'Sim' : 'Não', naoContatar: 'Não', dataConsent: consent ? D.hoje : '', etapa: 'Lead', primeiro: D.hoje }; (D.clientes = D.clientes || []).push(novo); api.tocou(false); }
        else { var carga = await api.carregar(); if (carga.dados) D = carga.dados;
          novo = (D.clientes || []).find(function (c) { return V.norm(c.nome) === V.norm(nome) && V.numeroWa(c.whatsapp) === V.numeroWa(wa); }); }
        if (!novo) { out.textContent = 'Cliente salvo, mas vínculo ainda não retornou. Atualize os dados antes de criar a OS; não cadastre novamente.'; return; }
        if (!f.isConnected) return;
        clientePendente = false; selecao = novo._row; opcoes(); $('osClienteNovo').open = false; out.textContent = 'Cliente cadastrado e selecionado.';
      } catch (er) { if (f.isConnected) out.textContent = 'Não foi possível confirmar o cadastro: ' + er.message; }
      finally { if (f.isConnected) travar(false); }
    };
    if (!row && api.pode('salvarOSMulti')) {
      var multi = document.createElement('button'); multi.type = 'button'; multi.id = 'osMaisEquipamentos'; multi.className = 'btn sec'; multi.textContent = 'Usar vários equipamentos'; f.querySelector('.acoes').appendChild(multi);
      multi.onclick = function () {
        if (ocupada || clientePendente) return;
        if ($('osCliNome').value.trim() && $('osClienteNovo').open) { $('fErro').textContent = 'Cadastre ou selecione o cliente antes de mudar para vários equipamentos.'; return; }
        var v = valores(), c = achar('clientes', v.cliente), eq = eqVazio(1);
        eq.identificacao = v.equipamento; eq.defeito = v.defeito; eq.servico = v.servico;
        if (v.valor !== '') eq.itens = [{ tipo: 'serviço', descricao: v.servico || 'Serviço', qtd: '1', valorUnit: v.valor }];
        PRE_OSM = { cliente: c ? c.nome : '', equipamentos: [eq] }; OSM = null; abrirOSM('');
        OSM.d.previsao = v.previsao; OSM.d.acessorios = v.acessorios; OSM.d.obsInt = v.obsInt;
        m.close(''); location.hash = '#osm';
      };
    }
    f.onsubmit = async function (ev) {
      if (ev.submitter && ev.submitter.value === 'cancelar') return;
      ev.preventDefault(); if (ocupada) return;
      if (clientePendente) { $('fErro').textContent = 'Sincronize o cadastro pendente antes de vincular a OS.'; return; }
      var v = valores(), cli = achar('clientes', v.cliente);
      if (!cli || !v.equipamento) { $('fErro').textContent = 'Selecione o cliente e informe o equipamento.'; return; }
      if (v.valor !== '' && isNaN(V.dinheiro(v.valor))) { $('fErro').textContent = 'Informe um valor válido, igual ou maior que zero (ex.: 1.234,56).'; return; }
      if (v.valor !== '') v.valor = V.dinheiro(v.valor);
      v.cliente = cli.nome; var d = Object.assign({}, v, { _rowCliente: cli._row }); if (row) { d._row = o._row; d.num = o.num; }
      // v0.9.3: salva NA HORA. OS nova aparece como "OS nova (enviando…)" e ganha o número quando o CRM responder.
      if (row) { m.close(''); escrever('salvarOS', [d], aplicar('os', row, v), { salvo: 'OS salva ✓' }); return; }
      var tmp = RAP ? RAP.idProvisorio() : 'app' + Date.now().toString(36), prov = Object.assign({}, v, { _row: rowProvisoria(), _tmp: tmp, _pendente: true, num: ROT_OS_NOVA, _rowCliente: cli._row, status: 'Recebido', statusEm: D.hoje, entrada: D.hoje });
      if (api.usaIdApp) d.idApp = tmp; // só quando o CRM publicar idApp (config.LEITURAS_VELOCIDADE)
      m.close('');
      escrever('salvarOS', [d], function (c) { (c.os = c.os || []).push(prov); }, { tmp: tmp, idOp: tmp, salvo: 'OS salva ✓ O número chega em instantes.' });
    };
  }
  // v0.9.0: ORÇAMENTO RÁPIDO numa tela só. Itens da tabela oficial ou livres, peça de cotação válida, desconto por item e no total (R$ ou %),
  // total na hora (nunca negativo). Grava com salvarOrcamento (campos que o CRM já tem: itensOrc em texto legível + orcamento = total).
  // Sem OS (cliente novo/sem OS): cria a OS com salvarOS e grava o orçamento nela (precisa de internet). Nada é enviado sozinho.
  var ORC = window.ProFixOrc, ORC_RASC = 'profix.orcRascunho.';
  function osVariosEquip(o) { return !!o && /^\d+ equipamentos:/.test(String(o.equipamento || '')); }
  function catalogoOrc() { carregarCatalogo(); return (CAT && CAT.length ? CAT : O.CATALOGO_DEMO).filter(function (c) { return c.ativo !== 'Não'; }); }
  function cotacoesOrc(num) {
    if (!num) return [];
    try { return m9Dados().cotacoes.filter(function (c) { return c.os === num && ORC.cotacaoUsavel(c, D.hoje); }).sort(function (a, b) { return a.custoPosto - b.custoPosto; }); } catch (x) { return []; }
  }
  function orcamentoRapido(row, pre) {
    var o = row ? achar('os', row) : null;
    if (o && osVariosEquip(o) && api.pode('lerOSMulti')) {
      return perguntar('A ' + o.num + ' tem vários equipamentos: o orçamento dela é feito na tela 💻 Vários equipamentos (itens por máquina). Abrir lá?', { titulo: 'OS com vários equipamentos', sim: 'Abrir' }).then(function (ok) { if (ok) ACOES['osm-abrir'](row); });
    }
    var c = o ? (V.clienteDaOS(D, o) || {}) : null, dias = Dif.padroes(D).validadeDias || 7, busy = false, chave = ORC_RASC + (o ? o.num : 'novo');
    var Q = null, rasc = lerJSON(chave, null);
    if (rasc && rasc.itens) { Q = rasc; } else if (o) { var l = ORC.lerItensOrc(o.itensOrc, o.orcamento); Q = { itens: l.itens, total: l.total, diagnostico: o.diagnostico || '', previsao: o.previsao || '', validade: '' }; }
    else Q = { itens: [], total: { modo: '%', valor: '' }, diagnostico: '', previsao: '', validade: '', cliente: pre && pre.cliente ? String(pre.cliente) : '', equipamento: '' };
    if (!Q.itens.length) Q.itens.push(ORC.itemVazio());
    var cots = cotacoesOrc(o && o.num), cat = catalogoOrc();
    function htmlCots() {
      return cots.length ? '<span class="muted">Peças com cotação válida nesta OS (custo posto em Sorocaba):</span>' + cots.map(function (k, i) { return '<button type="button" class="osm-cat" data-orc-cot="' + i + '"><span>🔩 ' + e(k.peca || k.componente || '') + ' <span class="muted">vale até ' + V.dataBR(k.validade) + '</span></span><b>' + V.brl(k.custoPosto) + '</b></button>'; }).join('')
        : '<p class="muted" id="orcSemCot">Sem cotação válida nesta OS: o valor da peça fica para você digitar.</p>';
    }
    var regra = c ? V.botaoWaCliente(c, 'os', 'Orçamento') : true;
    var dt = function (v) { return /^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : ''; };
    var m = $('modal');
    m.innerHTML = '<form method="dialog" id="fGen" class="orc-rap"><h2 style="margin:0">⚡ Orçamento' + (o ? ' da ' + e(o.num) + ' · ' + e(o.cliente) : ' rápido') + '</h2>' +
      (rasc && rasc.itens ? '<p class="muted" id="orcRascAviso">Rascunho recuperado (ainda não salvo). <button type="button" class="btn sec peq" id="orcDescartar">Descartar rascunho</button></p>' : '') +
      (o ? '<p class="muted">' + e(o.equipamento || '') + '</p>' :
        '<div><label for="orcBuscaCli">Cliente (buscar por nome ou WhatsApp) *</label><input id="orcBuscaCli" type="search" autocomplete="off"><select id="orcCliente" aria-label="Cliente"></select></div>' +
        '<div><label for="orcEquip">Equipamento *</label><input id="orcEquip" autocomplete="off" placeholder="Ex.: Notebook Dell Inspiron" value="' + e(Q.equipamento || '') + '"></div>') +
      '<div><label for="c_diagnostico">Diagnóstico / laudo</label><textarea id="c_diagnostico" rows="2">' + e(Q.diagnostico || '') + '</textarea></div>' +
      '<div><label for="orcBusca">Adicionar da tabela de preços</label><input id="orcBusca" type="search" autocomplete="off" placeholder="Ex.: formatação, SSD, limpeza"><div class="osm-res" id="orcRes"></div></div>' +
      '<div class="chips" id="orcAdd"><button type="button" class="chip" id="orcLivre">+ Item livre</button><button type="button" class="chip" id="orcPeca">+ Peça</button><button type="button" class="chip" id="orcComprar">🛒 Peça a comprar</button></div>' +
      (o ? '<div id="orcCotsBox">' + htmlCots() + '</div>' : '') +
      '<div id="orcItens"></div>' +
      '<div class="orc-desc-total"><label for="orcDescTotal">Desconto no total</label><div class="orc-par"><input id="orcDescTotal" inputmode="decimal" placeholder="0" value="' + e(Q.total.valor || '') + '"><select id="orcDescTotalModo" aria-label="Desconto no total em % ou R$"><option' + (Q.total.modo === '%' ? ' selected' : '') + '>%</option><option' + (Q.total.modo === 'R$' ? ' selected' : '') + '>R$</option></select></div>' +
      '<div class="chips">' + O.ATALHOS.filter(function (a) { return a.tipo === 'desconto'; }).map(function (a) { return '<button type="button" class="chip" data-orc-atalho="' + a.valorUnit + '">' + e(a.rot) + '</button>'; }).join('') + '</div></div>' +
      '<div class="osm-bar" id="orcResumo"></div>' +
      '<p class="alerta" id="orcCompraAviso" hidden>🛒 Compre só depois do Pix confirmado. A compra é marcada na própria cotação (🧾 Cotações › Comprado), que lança o custo no caixa uma vez só.</p>' +
      '<div class="card" id="orcPix"></div>' +
      '<div class="lin"><div><label for="c_validade">Válido até</label><input id="c_validade" type="date" value="' + e(dt(Q.validade)) + '"><div class="muted">Em branco = ' + dias + ' dias (padrão do servidor).</div></div><div><label for="c_previsao">Previsão de entrega</label><input id="c_previsao" type="date" value="' + e(dt(Q.previsao)) + '"></div></div>' +
      '<p class="alerta" id="orcAvisoPeca" hidden></p>' +
      (c && !regra ? '<p class="muted">' + (Dif.naoContatar(c) ? 'Cliente marcado como Não contatar.' : 'WhatsApp inválido: salve o orçamento e combine por outro canal.') + '</p>' : '') +
      (c && regra && regra.aviso ? '<p class="alerta">Sem consentimento LGPD: só mensagem sobre a OS.</p>' : '') +
      '<p class="erro" id="fErro"></p><div class="acoes orc-acoes">' + (regra ? '<button class="btn wa" value="ok" id="fSalvarWa">Salvar e abrir WhatsApp</button>' : '') +
      (api.pode('linkClienteOS') ? '<button class="btn sec" value="ok" id="orcSalvarLink">Salvar e gerar link</button>' : '') +
      '<button class="btn' + (regra ? ' sec' : '') + '" value="ok" id="fSalvar">Salvar</button><button class="btn sec" value="cancelar" formnovalidate>Cancelar</button></div>' +
      '<p class="muted">Só abre o WhatsApp com o texto pronto: quem envia é você.</p></form>';
    var f = $('fGen'), sel = null;
    if (!o) {
      var opcoesCli = function () {
        var esc = (D.clientes || []).find(function (k) { return String(k._row) === String(sel) || (!sel && Q.cliente && k.nome === Q.cliente); });
        if (esc) sel = esc._row;
        opcoesClienteRapido($('orcBuscaCli'), $('orcCliente'), esc);
      };
      opcoesCli(); $('orcBuscaCli').oninput = opcoesCli; $('orcCliente').onchange = function () { sel = this.value; Q.cliente = (achar('clientes', sel) || {}).nome || ''; };
      $('orcEquip').oninput = function () { Q.equipamento = this.value; };
    }
    function guardar() { Q.diagnostico = $('c_diagnostico').value; Q.validade = $('c_validade').value; Q.previsao = $('c_previsao').value; try { localStorage.setItem(chave, JSON.stringify(Q)); } catch (x) { /* cota */ } }
    function limparRasc() { try { localStorage.removeItem(chave); } catch (x) { /* ok */ } }
    function desenharItens() {
      $('orcItens').innerHTML = Q.itens.map(function (it, i) {
        return '<div class="orc-it" data-i="' + i + '"><div class="orc-l1"><input data-f="descricao" aria-label="Descrição do item ' + (i + 1) + '" placeholder="' + (it.tipo === 'peça' ? 'Peça (ex.: SSD 480 GB)' : 'Descrição do serviço') + '" value="' + e(it.descricao) + '">' +
          '<button type="button" class="btn sec peq" data-orc-del="' + i + '" aria-label="Remover item ' + (i + 1) + '">✕</button></div>' +
          '<div class="orc-l2"><label>Qtd<input data-f="qtd" inputmode="decimal" value="' + e(it.qtd) + '"></label><label>Valor R$<input data-f="valor" inputmode="decimal" placeholder="' + (it.tipo === 'peça' ? 'digite' : '0,00') + '" value="' + e(it.valor) + '"></label>' +
          '<label>Desconto<span class="orc-par"><input data-f="desc" inputmode="decimal" placeholder="0" value="' + e(it.desc) + '"><select data-f="descModo" aria-label="Desconto do item em % ou R$"><option' + (it.descModo !== 'R$' ? ' selected' : '') + '>%</option><option' + (it.descModo === 'R$' ? ' selected' : '') + '>R$</option></select></span></label>' +
          '<b class="orc-lt" data-lt="' + i + '">—</b></div>' +
          (it.tipo === 'peça' ? (it.cotacao ? '<label class="chk orc-comprar"><input type="checkbox" data-f="comprar"' + (it.comprar ? ' checked' : '') + '> 🛒 Peça encomendada: a ProFix compra para o cliente (' + e(it.cotacao) + ')</label>'
            : '<div class="muted orc-comprar-dica">Vai comprar esta peça para o cliente? Use uma cotação da OS (🛒 Peça a comprar).</div>') : '') +
          (it.validoAte ? '<div class="muted">' + e(it.origem || 'Cotação') + ' · O valor da peça vale até ' + V.dataBR(it.validoAte) + (it.custo ? ' · <b>custo posto R$ ' + e(it.custo) + ' (só você vê): digite o preço de venda</b>' : '') + '</div>' : it.origem ? '<div class="muted">' + e(it.origem) + '</div>' : '') +
          '<div class="erro" data-le="' + i + '"></div></div>';
      }).join('');
      totais();
    }
    function totais() {
      Q.total = { modo: $('orcDescTotalModo').value, valor: $('orcDescTotal').value };
      var k = ORC.calcular(Q.itens, Q.total);
      k.linhas.forEach(function (l) { var b = f.querySelector('[data-lt="' + l.i + '"]'), er = f.querySelector('[data-le="' + l.i + '"]'); if (b) b.textContent = l.vazia || l.erro ? '—' : ORC.brl(l.liquido); if (er) { var cu = ORC.numBR(Q.itens[l.i].custo), abaixo = !l.vazia && !l.erro && cu > 0 && l.valor != null && l.valor <= cu; er.textContent = l.erro && !(l.erro === 'Informe o valor (R$).' && Q.itens[l.i].valor === '') ? l.erro : abaixo ? 'Atenção: o preço de venda está igual ou abaixo do custo posto (R$ ' + Q.itens[l.i].custo + ').' : ''; } });
      var et = k.erros.filter(function (x) { return x.i === 'total'; })[0];
      $('orcResumo').innerHTML = '<span class="muted">' + k.validos.length + ' item(ns) · subtotal ' + ORC.brl(k.bruto) + (k.descontos ? ' · descontos −' + ORC.brl(k.descontos).replace('−', '') : '') + '</span>' +
        '<b class="osm-total">Total: <span id="orcTotal">' + ORC.brl(k.total) + '</span></b>' + (et ? '<span class="erro" id="orcErroTotal">' + e(et.msg) + '</span>' : '');
      $('orcCompraAviso').hidden = !k.validos.some(function (l) { return l.comprar; });
      var pb = k.total > 0 ? blocoPix(k.total, o ? o.num : '') : null, pc = pixConfig();
      var hPix = pb ? '<b>💠 Pagamento via Pix</b> <span class="muted">(vai na mensagem do cliente)</span><br>Chave: <b>' + e(pc.chaveTexto) + '</b> · ' + e(pc.nome) + ' · valor ' + ORC.brl(k.total) +
        '<div class="acoes"><button type="button" class="btn sec peq" id="orcCopiarPix">📋 Copiar Pix</button></div>' : '<span class="muted">💠 O Pix (chave e copia e cola) entra na mensagem quando o total passar de R$ 0,00.</span>';
      if ($('orcPix').dataset.h !== hPix) { $('orcPix').innerHTML = hPix; $('orcPix').dataset.h = hPix; } // só redesenha se mudou (senão o toque em 📋 Copiar Pix logo após digitar se perde)
      var vp = ORC.pecasVencendoAntes(k, $('c_validade').value || V.somaDias(D.hoje, dias));
      $('orcAvisoPeca').hidden = !vp.length; $('orcAvisoPeca').textContent = vp.length ? 'Atenção: o valor da peça (' + vp.map(function (l) { return l.descricao + ' até ' + V.dataBR(l.validoAte); }).join('; ') + ') vence antes da validade do orçamento.' : '';
      return k;
    }
    function addItem(it) { Q.itens = Q.itens.filter(function (x) { return String(x.descricao || '').trim() || String(x.valor || '').trim(); }); Q.itens.push(it); desenharItens(); guardar(); var ls = f.querySelectorAll('.orc-it'), u = ls[ls.length - 1]; if (u) { var alvo = !it.descricao ? u.querySelector('[data-f=descricao]') : it.valor === '' ? u.querySelector('[data-f=valor]') : null; if (alvo) alvo.focus(); } }
    function resultados() {
      var q = $('orcBusca').value.trim(), r = q ? O.buscarCatalogo(cat, q, 8) : cat.slice(0, 6);
      $('orcRes').innerHTML = r.map(function (k) { var v = ORC.numBR(k.valor); return '<button type="button" class="osm-cat" data-orc-cat="' + cat.indexOf(k) + '"><span>' + e(k.descricao) + '</span><b>' + (v > 0 ? V.brl(v) : 'Sob orçamento') + '</b></button>'; }).join('') +
        (q ? '<button type="button" class="osm-cat" data-orc-livre-q="1"><span>+ Lançar “' + e(q) + '” com valor livre</span></button>' : '');
    }
    desenharItens(); resultados();
    $('orcBusca').oninput = resultados;
    $('orcBusca').onkeydown = function (ev) {
      if (ev.key !== 'Enter' || ev.isComposing) return;
      ev.preventDefault();
      var resultado = $('orcRes').querySelector('button');
      if (resultado) resultado.focus();
    };
    function atualizarOrcamento(ev) {
      var t = ev.target, item = t.closest('.orc-it');
      if (t.id === 'orcBusca' || t.id === 'orcBuscaCli') return;
      if (item && t.dataset.f) {
        Q.itens[Number(item.dataset.i)][t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value;
      }
      $('fErro').textContent = '';
      if (item || ['orcDescTotal', 'orcDescTotalModo', 'c_validade'].indexOf(t.id) >= 0) totais();
      guardar();
    }
    f.addEventListener('input', atualizarOrcamento);
    f.addEventListener('change', atualizarOrcamento);
    f.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b || b.type === 'submit') return;
      if (b.dataset.orcCat !== undefined) { addItem(ORC.itemDoCatalogo(cat[Number(b.dataset.orcCat)])); $('orcBusca').value = ''; resultados(); }
      else if (b.dataset.orcLivreQ) { addItem(ORC.itemVazio({ descricao: $('orcBusca').value.trim() })); $('orcBusca').value = ''; resultados(); }
      else if (b.dataset.orcCot !== undefined) { var it = ORC.itemDaCotacao(cots[Number(b.dataset.orcCot)], D.hoje); if (it) addItem(it); }
      else if (b.dataset.orcDel !== undefined) { Q.itens.splice(Number(b.dataset.orcDel), 1); if (!Q.itens.length) Q.itens.push(ORC.itemVazio()); desenharItens(); guardar(); }
      else if (b.dataset.orcAtalho !== undefined) { $('orcDescTotal').value = b.dataset.orcAtalho; $('orcDescTotalModo').value = '%'; totais(); guardar(); }
      else if (b.id === 'orcLivre') addItem(ORC.itemVazio());
      else if (b.id === 'orcPeca') addItem(ORC.itemVazio({ tipo: 'peça' }));
      else if (b.id === 'orcCopiarPix') { var kk = totais(), pbx = blocoPix(kk.total, o ? o.num : ''); if (pbx) copiarTexto(pbx.codigo, 'Pix copia e cola copiado.'); }
      else if (b.id === 'orcComprar') {
        // v0.9.2: peça comprada para o cliente = cotação do Módulo 9 (a mesma que vira Comprado e lança o custo no caixa). Sem cotação, não inventa.
        if (!o) return aviso('Salve o orçamento primeiro (a OS nasce no CRM). Depois cadastre a cotação da peça em 🧾 Cotações da OS e volte ao ⚡ Orçamento.');
        if (cots.length) { var cb = $('orcCotsBox'); if (cb) cb.scrollIntoView({ block: 'center' }); return aviso('Toque na cotação da peça: ela entra como peça encomendada (custo só para você).'); }
        guardar();
        perguntar('Esta OS não tem cotação válida. Abrir 🧾 Cotações para cadastrar a peça (com fornecedor e link)? O rascunho do orçamento fica guardado.', { titulo: '🛒 Peça a comprar', sim: 'Abrir Cotações' }).then(function (ok) { if (ok) { m.close(''); ACOES['os-cot'](o._row); } });
      }
      else if (b.id === 'orcDescartar') { limparRasc(); m.close(''); orcamentoRapido(row, pre); }
    });
    m.onclose = null; m.returnValue = ''; m.showModal();
    // Cotações vêm do CRM (Módulo 9): abre já com a cópia do aparelho e atualiza a lista quando a leitura voltar.
    if (o && m9UsaCRM() && !semRede()) carregarM9(true).then(function () { if (!f.isConnected || !$('orcCotsBox')) return; cots = cotacoesOrc(o.num); $('orcCotsBox').innerHTML = htmlCots(); });
    f.onsubmit = async function (ev) {
      if (ev.submitter && ev.submitter.value === 'cancelar') return;
      ev.preventDefault(); if (busy) return;
      $('fErro').textContent = '';
      var k = totais();
      if (!k.ok) { var pe = k.erros[0]; $('fErro').textContent = (typeof pe.i === 'number' && pe.i >= 0 ? 'Item ' + (pe.i + 1) + ': ' : '') + pe.msg; return; }
      if (!(k.total > 0)) { $('fErro').textContent = 'O total ficou R$ 0,00: confira os valores e os descontos.'; return; }
      var cli = o ? c : achar('clientes', sel), equip = o ? o.equipamento : $('orcEquip').value.trim();
      if (!o && (!cli || !equip)) { $('fErro').textContent = 'Escolha o cliente e informe o equipamento.'; return; }
      var semRedeAgora = !navigator.onLine || offline;
      if (!o && semRedeAgora) { guardar(); $('fErro').textContent = 'Sem internet: para cliente sem OS é preciso conectar (a OS é criada no CRM). O rascunho ficou guardado neste aparelho.'; return; }
      // v0.9.2: itens[] estruturados (CRM API @123 monta o mesmo itensOrc e confere o total); itensOrc/orcamento seguem juntos (compatível com servidor antigo).
      var v = { diagnostico: $('c_diagnostico').value.trim(), itensOrc: ORC.paraItensOrc(k), orcamento: k.total, validade: $('c_validade').value, previsao: $('c_previsao').value };
      var itensEstr = ORC.paraItens(k);
      var prazoPadrao = !v.validade; v.validade = v.validade || V.somaDias(D.hoje, dias);
      var modo = ev.submitter && ev.submitter.id === 'fSalvarWa' ? 'wa' : ev.submitter && ev.submitter.id === 'orcSalvarLink' ? 'link' : 'so', popup = null;
      // Abrir no gesto do usuário evita bloqueio de popup após a espera da API.
      if (modo === 'wa' && !semRedeAgora && !V.ehCelular()) { popup = window.open('about:blank', '_blank'); if (popup) { popup.opener = null; popup.document.body.textContent = 'Salvando orçamento… O WhatsApp abrirá após a confirmação.'; } }
      busy = true; f.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      try {
        var os = o;
        if (!os) {
          var rOS = await api.escrever('salvarOS', [{ cliente: cli.nome, _rowCliente: cli._row, equipamento: equip, previsao: v.previsao }]);
          var dOS = rOS.dados || {};
          // v0.9.3: OS nova entra na cópia com o número que o CRM devolveu (antes: recarregava tudo).
          if (dOS.num && dOS._row && !(D.os || []).some(function (x) { return x.num === dOS.num; })) { (D.os = D.os || []).push({ _row: Number(dOS._row), num: dOS.num, cliente: cli.nome, _rowCliente: cli._row, equipamento: equip, previsao: v.previsao, status: 'Recebido', statusEm: D.hoje, entrada: D.hoje }); api.tocou(false); }
          else if (!dOS.num) await iniciar();
          os = dOS.num ? (D.os || []).filter(function (x) { return x.num === dOS.num; })[0] : null;
          if (!os) os = (D.os || []).filter(function (x) { return x.cliente === cli.nome; }).sort(function (a, b) { return b._row - a._row; })[0];
          if (!os) throw new Error('OS criada, mas ainda não apareceu. Atualize e abra o orçamento pela OS (não crie outra).');
          limparRasc(); chave = ORC_RASC + os.num; guardar();
        }
        // v0.9.3: "Salvar" = NA HORA (fila em 2º plano, sem recarregar). "Salvar e abrir WhatsApp"/"gerar link" esperam o CRM gravar
        // (o link precisa mostrar o orçamento novo), mas também não recarregam mais o App inteiro.
        opsMexeu(); var localOrc = aplicar('os', os._row, Object.assign({ status: 'Aguardando aprovação', aprovacao: 'Pendente' }, v));
        var r = modo === 'so' ? await api.enviar('salvarOrcamento', [Object.assign({ num: os.num, _row: os._row, itens: itensEstr }, v)], localOrc)
          : await api.escrever('salvarOrcamento', [Object.assign({ num: os.num, _row: os._row, itens: itensEstr }, v)], localOrc);
        if (modo === 'so' && !r.enfileirado) r.msg = 'Orçamento salvo ✓';
        limparRasc();
        var cc = V.clienteDaOS(D, os) || cli || {}, pb = blocoPix(k.total, os.num);
        var base = { calc: k, cliente: cc, num: os.num, equipamento: os.equipamento || equip, diagnostico: v.diagnostico, validade: v.validade, dias: prazoPadrao ? dias : null, previsao: v.previsao, pix: pb ? pb.texto : '' };
        var wa = V.botaoWaCliente(cc, 'os', ORC.textoWhats(base));
        // v0.9.2: os DOIS botões (verde "Salvar e abrir WhatsApp" e "Salvar e gerar link") só abrem o WhatsApp com o link REAL de aprovação.
        var envio = { os: os, cliente: cc, titulo: 'Orçamento da ' + os.num, tipo: 'orcamento', pix: pb ? pb.codigo : '', fila: !!r.enfileirado,
          montar: function (link) { return ORC.textoWhats(Object.assign({}, base, { link: link })); },
          antes: function () { // orçamento ainda na fila: manda primeiro (senão o link mostraria o orçamento antigo)
            var recusado = function () { var x = api.filaErros().filter(function (op) { return op.id === r.id; })[0]; if (x) throw new Error('o CRM não aceitou o orçamento: ' + x.erro); };
            if (!api.fila().some(function (op) { return op.acao === 'salvarOrcamento'; })) return recusado();
            return api.sincronizar().then(function () { if (api.fila().some(function (op) { return op.acao === 'salvarOrcamento'; })) throw new Error('o orçamento ainda está na fila do aparelho (sem internet)'); recusado(); });
          } };
        m.close(''); renderSuave();
        if (modo === 'so') { if (popup) popup.close(); aviso(r.enfileirado ? 'Orçamento salvo na fila (sem internet). Envio quando a internet voltar.' : r.msg); return; }
        if (modo === 'wa' && !wa) { if (popup) popup.close(); aviso('Orçamento salvo. WhatsApp não liberado para este cliente (Não contatar ou número inválido).'); return; }
        if (r.enfileirado) { if (popup) popup.close(); avisoSemLink(envio, new Error('sem internet: o orçamento ficou na fila')); return; }
        envio.popup = modo === 'wa' ? popup : null;
        await abrirComLink(envio);
        if (modo === 'wa') aviso(r.msg);
      } catch (er) { if (popup) popup.close(); if (f.isConnected) $('fErro').textContent = 'Não salvou: ' + er.message; else aviso('Não deu: ' + er.message); }
      finally { busy = false; if (f.isConnected) f.querySelectorAll('button').forEach(function (b) { b.disabled = false; }); }
    };
  }

  // ---------- Ações ----------
  var ACOES = {
    'op-editar': function (row) {
      var o = achar('oportunidades', row);
      formulario(e(o.empresa), [
        { k: 'status', r: 'Status', t: 'select', o: D.statusOp }, { k: 'prioridade', r: 'Prioridade', t: 'select', o: V.PRI },
        { k: 'lembrete', r: 'Próximo contato', t: 'date' }, { k: 'proximoPasso', r: 'Próximo passo' },
        { k: 'canal', r: 'Melhor canal', t: 'select', o: D.canais }, { k: 'telefone', r: 'Telefone' }, { k: 'whatsapp', r: 'WhatsApp comercial (publicado pela empresa)' },
        { k: 'valorEst', r: 'Valor estimado (R$)', t: 'number' }, { k: 'motivoPerda', r: 'Motivo da perda (obrigatório ao descartar)', t: 'select', o: V.motivosPerda(D), ajuda: 'Obrigatório se o status for Descartada.' }, { k: 'obs', r: 'Observações', t: 'textarea' }
      ].concat(temCol('oportunidades', 'origem') ? [{ k: 'origem', r: 'Origem', t: 'select', o: D.origens }] : [])
       .concat(temCol('oportunidades', 'indicadoPor') ? [{ k: 'indicadoPor', r: 'Indicado por' }] : []), o).then(function (v) {
        if (!v) return;
        if (V.motivoPerdaObrigatorio(v.status) && !v.motivoPerda) return aviso('Escolha o motivo da perda para descartar.');
        var mud = Object.assign({ _row: o._row, _empresaOriginal: o.empresa, empresa: o.empresa }, v);
        escrever('salvarOportunidade', [mud], aplicar('oportunidades', o._row, mud));
      });
    },
    'op-lead': function (row) { var o = achar('oportunidades', row); perguntar('Copiar "' + o.empresa + '" para Clientes como Lead (consentimento “Não” até a empresa autorizar)?', { titulo: 'Virar lead', sim: 'Copiar para Clientes' }).then(function (ok) { if (ok) escrever('virarLead', [o.empresa, o._row], aplicar('oportunidades', row, { status: 'Virou lead' })); }); },
    'os-abrir': function (row) {
      var o = achar('os', row), pecas = V.pecasOS(D, o.num), m = $('modal');
      var lin = function (r, v) { return v === '' || v == null ? '' : '<div><span class="muted">' + r + ':</span> ' + v + '</div>'; };
      var bPar = V.badgeParada3d(o, D.hoje);
      m.innerHTML = '<form method="dialog" class="detalhe"><h2 style="margin:0">' + e(o.num) + ' · ' + e(o.cliente) + '</h2><div>' + tagStatusOS(o.status) + (bPar ? tag('🐢 ' + bPar.texto, 'parada') : '') + '</div>' + blocoGarantiaOS(o) + proximaOS(o) +
        lin('Equipamento', e(o.equipamento)) + lin('Defeito', e(o.defeito)) + lin('Serviço', e(o.servico)) + lin('Entrada', V.dataBR(o.entrada)) + lin('Previsão', V.dataBR(o.previsao)) +
        lin('Acessórios', e(o.acessorios)) + '<div><span class="muted">Senha do aparelho:</span> <span id="senhaOS">' + e(V.textoSenha(o, ajustes.mostrarSenha)) + '</span></div>' +
        lin('Diagnóstico', e(o.diagnostico)) + lin('Orçamento', o.orcamento ? V.brl(o.orcamento) + (o.aprovacao ? ' (' + e(o.aprovacao) + ')' : '') + (o.validade ? ' · vale até ' + V.dataBR(o.validade) : '') : '') +
        lin('Valor cobrado', o.valor ? V.brl(o.valor) : '') + lin('Recebido', V.brl(V.recebidoOS(D, o.num))) + lin('Saldo', V.brl(V.saldoOS(D, o))) + linhaPecasComprar(o) +
        '<div><span class="muted">Peças (' + pecas.length + '):</span> ' + (pecas.map(function (p) { return e(p.qtd + '× ' + p.peca) + ' – custo ' + V.brl(p.custoUnit) + ', cobrado ' + V.brl(p.precoUnit); }).join('; ') || '—') + (pecas.length ? ' · custo total ' + V.brl(V.custoPecasOS(D, o.num)) : '') + '</div>' +
        '<details id="maisAcoesOS"><summary>Mais ações</summary>' + botoesDifOS(o) + '<div class="acoes">' + botao('💬 Mensagens', 'os-msgs', row) + botao('Msg serviço', 'os-msg-tipo', row) + botao('Termo de entrada', 'os-termo', row) + (api.pode('salvarVisita') ? botao('🚗 Marcar visita', 'os-visita', row) : '') + botao('Mudar status', 'os-status', row, '') + botao('⚡ Orçamento', 'os-orc', row) + (o.aprovacao === 'Pendente' ? botao('Aprovar / recusar', 'os-decidir', row) : '') + botao('Receber', 'os-receber', row) + botao('+ Peça', 'os-peca', row) + botao('🧾 Cotações', 'os-cot', row) + botao('🏷 Etiqueta QR', 'os-qr', row) + botao('Editar', 'os-editar', row) + (api.pode('excluirRegistro') ? botao('🗑 Excluir', 'os-excluir', row, 'perigo') : '') + (api.pode('lerOSMulti') ? botao('💻 Vários equipamentos', 'osm-abrir', row, '') : '') + '</div>' +
        '<div class="acoes">' + mapsBtn(V.enderecoOS(D, o)) + agendaBtn(o) + emailBtn(V.clienteDaOS(D, o), 'em-os', row) + '</div></details>' +
        '<div class="acoes"><button class="btn sec" value="fechar">Fechar</button></div></form>';
      var principal = m.querySelector('#proximaOS [data-a]'); if (principal) m.querySelectorAll('#maisAcoesOS [data-a="' + principal.dataset.a + '"]').forEach(function (b) { b.remove(); });
      m.onclose = null; m.showModal(); ligarAcoes(m, true);
    },
    'os-status': function (row) {
      var o = achar('os', row);
      formulario('Status da ' + e(o.num), [{ k: 'status', r: 'Novo status', t: 'select', o: D.statusOS, req: true }, { k: 'manterSenha', r: 'Na entrega, manter a senha do aparelho (o padrão é apagar – LGPD)', t: 'checkbox' }], { status: o.status })
        .then(function (v) { if (!v) return; var opc = v.status === 'Entregue' ? { entrega: D.hoje, apagarSenha: !v.manterSenha } : {}; if (v.status === 'Entregue' && !v.manterSenha) delete opc.apagarSenha; if (v.manterSenha) opc.apagarSenha = false; escrever('mudarStatusOS', [o.num, o._row, v.status, opc], aplicar('os', row, { status: v.status, statusEm: D.hoje })); });
    },
    'os-editar': function (row, pre) { abrirOSRapida(row, pre); },
    'os-nova': function () { abrirOSRapida(''); },
    'os-orc': function (row) { orcamentoRapido(row); },
    'orc-novo': function () { orcamentoRapido('', {}); },
    'os-pronto': function (row) {
      var o = achar('os', row);
      perguntar('Marcar ' + o.num + ' como Pronto? Depois você poderá abrir o WhatsApp; nenhuma mensagem é enviada automaticamente.', { titulo: 'OS pronta', sim: 'Marcar pronto' }).then(function (ok) {
        if (!ok) return;
        // v0.9.3: Pronto na hora; a mensagem (textoStatusOS) espera a fila chegar ao CRM antes de pedir o texto.
        escrever('mudarStatusOS', [o.num, o._row, 'Pronto', {}], aplicar('os', row, { status: 'Pronto', statusEm: D.hoje })).then(function (r) {
          if (r && !r.enfileirado && api.pode('textoStatusOS')) ACOES['os-msg'](row);
        });
      });
    },
    'os-decidir': function (row) {
      // v0.9.0: o CRM (decidirOrcamento) EXIGE o motivo quando o cliente recusa (caro, prazo, desistiu, foi para outro, outro).
      // Antes o App não mandava o motivo e toda recusa voltava com erro do servidor.
      var o = achar('os', row);
      formulario('Decisão do orçamento · ' + e(o.num), [{ k: 'decisao', r: 'Decisão', t: 'select', o: ['Aprovado', 'Recusado'], req: true }, { k: 'como', r: 'Como respondeu', t: 'select', o: ['WhatsApp', 'Presencial', 'Ligação'] },
        { k: 'proximoStatus', r: 'Próximo status (se aprovado)', t: 'select', o: ['Em reparo', 'Aguardando peça'] },
        { k: 'motivo', r: 'Motivo da recusa (obrigatório se recusou)', t: 'select', o: V.MOTIVOS_RECUSA }, { k: 'motivoTexto', r: 'Detalhe da recusa (opcional)' },
        { k: 'cobrarDiagnostico', r: 'Recusou: cobrar o diagnóstico (preço do catálogo do CRM)', t: 'checkbox' }], {})
        .then(function (v) {
          if (!v) return;
          var x = V.argsDecisao(o, v);
          if (x.erro) return aviso(x.erro);
          escrever('decidirOrcamento', [x.args], aplicar('os', row, x.local));
        });
    },
    'os-receber': function (row) {
      var o = achar('os', row);
      formulario('Receber · ' + e(o.num), [{ k: 'receita', r: 'Valor recebido (R$)', t: 'number', req: true }, { k: 'forma', r: 'Forma de pagamento', t: 'select', o: D.formasPag, req: true },
        { k: 'parcelas', r: 'Parcelas (crédito parcelado)', t: 'number' }, { k: 'data', r: 'Data', t: 'date' }], { receita: V.saldoOS(D, o) > 0 ? String(V.saldoOS(D, o)).replace('.', ',') : '', data: D.hoje })
        .then(function (v) {
          if (!v) return;
          // v0.9.3 (Compras): o recebimento só entra na tela DEPOIS que o CRM confirma; enquanto isso o botão mostra "Recebimento enviando…".
          enviarConfirmado('os-receber|' + row, 'Recebimento', 'lancarRecebimento', [Object.assign({ os: o.num }, v)], function (c) { (c.financeiro = c.financeiro || []).push({ _row: 0, data: v.data, tipo: 'Entrada', categoria: 'Serviço', os: o.num, descricao: 'Recebimento OS ' + o.num, forma: v.forma, receita: V.dinheiro(v.receita) }); })
            .then(function () { atualizarFundo(); }, function () {});
        });
    },
    'os-peca': function (row) {
      var o = achar('os', row);
      formulario('Peça na ' + e(o.num), [{ k: 'peca', r: 'Peça', req: true }, { k: 'qtd', r: 'Quantidade', t: 'number' }, { k: 'custoUnit', r: 'Custo unitário (R$)', t: 'number' }, { k: 'precoUnit', r: 'Preço cobrado (R$)', t: 'number' },
        { k: 'fornecedor', r: 'Fornecedor' }, { k: 'origem', r: 'Origem', t: 'select', o: ['Comprada para esta OS', 'Estoque', 'Cliente forneceu'] }, { k: 'link', r: 'Link do fornecedor', t: 'url' }], { qtd: '1' }, o.aprovacao === 'Pendente' ? '<div class="alerta">Atenção: o orçamento desta OS ainda não foi aprovado.</div>' : '')
        .then(function (v) { if (!v) return; (v.origem === 'Comprada para esta OS' && o.aprovacao === 'Pendente' ? perguntar('O orçamento ainda não foi aprovado. Registrar a compra mesmo assim?', { titulo: 'Orçamento pendente', sim: 'Registrar a compra' }) : Promise.resolve(true)).then(function (ok) { if (ok) escrever('salvarPeca', [Object.assign({ os: o.num, _rowOS: o._row }, v)]); }); });
    },
    'cli-editar': function (row) {
      var c = row ? achar('clientes', row) : {};
      formulario(row ? e(c.nome) : 'Novo cliente', [{ k: 'nome', r: 'Nome', req: true }, { k: 'whatsapp', r: 'WhatsApp' }, { k: 'bairro', r: 'Bairro' }, { k: 'origem', r: 'Origem do contato', t: 'select', o: D.origens },
        { k: 'indicadoPor', r: 'Indicado por' }, { k: 'email', r: 'E-mail (opcional)', t: 'email', ajuda: 'Para enviar mensagens do atendimento por e-mail.' },
        { k: 'consent', r: 'Aceita receber mensagens e e-mails sobre o atendimento (LGPD)', t: 'select', o: ['Sim', 'Não'], ajuda: 'Sim = WhatsApp/e-mail de atendimento e marketing conforme as regras. Não = só OS com aviso no WhatsApp; e-mail bloqueado.' },
        { k: 'aniversario', r: 'Aniversário (dd/mm)', ajuda: 'Ex.: 25/12. Usado no chip “aniversariantes”.' }, { k: 'naoContatar', r: 'Não contatar', t: 'select', o: ['Não', 'Sim'], ajuda: '“Sim” bloqueia WhatsApp, ligação, e-mail e marketing para este cliente.' }].concat(temCol('clientes', 'endereco') ? [{ k: 'endereco', r: 'Endereço (para o Maps)' }] : [], [ { k: 'proximo', r: 'Próximo contato', t: 'date' }, { k: 'acao', r: 'Próxima ação' },
        { k: 'valorEst', r: 'Valor estimado (R$)', t: 'number' }, { k: 'obs', r: 'Observações', t: 'textarea' }]), c)
        .then(function (v) { if (!v) return; var an = window.ProFixDif.normalizarAniversario(v.aniversario); if (an === null) return aviso('Aniversário inválido: use dd/mm (ex.: 25/12).'); v.aniversario = an; if (!v.naoContatar) v.naoContatar = 'Não'; var d = Object.assign({}, v); if (v.consent === 'Sim' && c.consent !== 'Sim') d.dataConsent = D.hoje; if (row) { d._row = c._row; d._nomeOriginal = c.nome; return escrever('salvarCliente', [d], aplicar('clientes', row, v), { salvo: 'Cliente salvo ✓' }); }
          // v0.9.3: cliente novo aparece na hora (provisório) e ganha a linha do CRM quando ele responder.
          var tmp = RAP ? RAP.idProvisorio() : 'app' + Date.now().toString(36), prov = Object.assign({ etapa: 'Lead', primeiro: D.hoje }, v, { _row: rowProvisoria(), _tmp: tmp, _pendente: true });
          if (api.usaIdApp) d.idApp = tmp;
          escrever('salvarCliente', [d], function (cache) { (cache.clientes = cache.clientes || []).push(prov); }, { tmp: tmp, idOp: tmp, salvo: 'Cliente salvo ✓' }); });
    },
    'cli-novo': function () { ACOES['cli-editar'](''); },
    'cli-inter': function (row) {
      var c = achar('clientes', row);
      formulario('Conversa com ' + e(c.nome), [{ k: 'canal', r: 'Canal', t: 'select', o: D.canais, req: true }, { k: 'resumo', r: 'Resumo da conversa', t: 'textarea', req: true }, { k: 'proximoPasso', r: 'Próximo passo' }, { k: 'dataProx', r: 'Data do próximo passo', t: 'date' }], { canal: 'WhatsApp' })
        .then(function (v) { if (!v) return; escrever('registrarInteracao', [Object.assign({ cliente: c.nome, _rowCliente: c._row }, v)], function (cache) { (cache.interacoes = cache.interacoes || []).push(Object.assign({ _row: 0, data: D.hoje, cliente: c.nome }, v)); aplicar('clientes', row, { ultimo: D.hoje, proximo: v.dataProx || c.proximo, acao: v.proximoPasso || c.acao })(cache); }); });
    },
    'cli-etapa': function (row) {
      var c = achar('clientes', row);
      formulario('Etapa de ' + e(c.nome), [{ k: 'etapa', r: 'Etapa do funil', t: 'select', o: D.etapas, req: true }, { k: 'motivo', r: 'Motivo da perda (se Perdido)', t: 'select', o: V.motivosPerda(D) }], { etapa: c.etapa })
        .then(function (v) { if (!v) return; if (v.etapa === 'Perdido' && !v.motivo) return aviso('Escolha o motivo da perda.'); escrever('moverEtapa', [c.nome, c._row, v.etapa, v.etapa === 'Perdido' ? v.motivo : ''], aplicar('clientes', row, { etapa: v.etapa, motivoPerda: v.etapa === 'Perdido' ? v.motivo : c.motivoPerda })); });
    },
    'rv-editar': function (row) {
      var r = row ? achar('revenda', row) : {};
      formulario(row ? e(r.id) : 'Novo item de revenda', [{ k: 'equipamento', r: 'Equipamento', req: true }, { k: 'config', r: 'Configuração' }, { k: 'status', r: 'Status', t: 'select', o: D.statusRevenda }, { k: 'compra', r: 'Data da compra', t: 'date' },
        { k: 'precoCompra', r: 'Preço de compra (R$)', t: 'number' }, { k: 'frete', r: 'Frete (R$)', t: 'number' }, { k: 'pecas', r: 'Peças (R$)', t: 'number' }, { k: 'insumos', r: 'Insumos (R$)', t: 'number' },
        { k: 'anunciado', r: 'Preço anunciado (R$)', t: 'number' }, { k: 'anuncio', r: 'Link do anúncio', t: 'url' }, { k: 'obs', r: 'Observações', t: 'textarea' }], r)
        .then(function (v) { if (!v) return; var d = Object.assign({}, v); if (row) { d._row = r._row; d.id = r.id; } escrever('salvarRevenda', [d], row ? aplicar('revenda', row, v) : null); });
    },
    'rv-novo': function () { ACOES['rv-editar'](''); },
    'rv-vender': function (row) {
      var r = achar('revenda', row);
      formulario('Venda de ' + e(r.id), [{ k: 'precoVenda', r: 'Preço de venda (R$)', t: 'number', req: true }, { k: 'forma', r: 'Forma de pagamento', t: 'select', o: D.formasPag }, { k: 'comprador', r: 'Comprador' }, { k: 'data', r: 'Data', t: 'date' },
        { k: 'lancar', r: 'Lançar a entrada no Financeiro', t: 'checkbox' }], { precoVenda: r.anunciado, data: D.hoje, lancar: true })
        .then(function (v) { if (!v) return; escrever('venderRevenda', [Object.assign({ id: r.id, _row: r._row }, v)], aplicar('revenda', row, { status: 'Vendido', precoVenda: v.precoVenda })); });
    },
    'fin-novo': function () {
      formulario('Novo lançamento', [{ k: 'tipo', r: 'Tipo', t: 'select', o: D.tiposFin, req: true }, { k: 'categoria', r: 'Categoria', t: 'select', o: D.categoriasFin, req: true }, { k: 'data', r: 'Data', t: 'date', req: true },
        { k: 'descricao', r: 'Descrição' }, { k: 'valor', r: 'Valor (R$)', t: 'number', req: true }, { k: 'forma', r: 'Forma de pagamento', t: 'select', o: D.formasPagFin }, { k: 'os', r: 'OS vinculada (opcional)', t: 'select', o: (D.os || []).map(function (o) { return o.num; }) }], { data: D.hoje })
        .then(function (v) { if (!v) return; var d = { tipo: v.tipo, categoria: v.categoria, data: v.data, descricao: v.descricao, forma: v.forma, os: v.os }; d[v.tipo === 'Entrada' ? 'receita' : 'custo'] = v.valor; escrever('salvarLancamento', [d]); });
    },
    'cat-editar': function (row) {
      var s = row ? achar('catalogo', row) : {};
      formulario(row ? e(s.servico) : 'Novo serviço', [{ k: 'servico', r: 'Serviço', req: true }, { k: 'preco', r: 'Preço (R$)', t: 'number' }, { k: 'tipo', r: 'Tipo de preço', t: 'select', o: ['Fixo', 'A partir de', 'Sob orçamento', 'Mensal'] },
        { k: 'descricao', r: 'Descrição para o cliente', t: 'textarea' }, { k: 'tempo', r: 'Tempo estimado' }, { k: 'status', r: 'Status', t: 'select', o: ['Ativo', 'Proposto', 'Inativo'] }, { k: 'ativo', r: 'Ativo', t: 'select', o: ['Sim', 'Não'] }], s)
        .then(function (v) { if (!v) return; var d = Object.assign({}, v); if (row) { d._row = s._row; d._servicoOriginal = s.servico; } escrever('salvarServicoCatalogo', [d], row ? aplicar('catalogo', row, v) : null); });
    },
    'cat-novo': function () { ACOES['cat-editar'](''); },
    'mod-editar': function (row) {
      var m = row ? achar('modelos', row) : {};
      formulario(row ? e(m.modelo) : 'Novo modelo', [{ k: 'modelo', r: 'Nome do modelo', req: true }, { k: 'texto', r: 'Texto', t: 'textarea', req: true, ajuda: 'Campos: {primeiro_nome}, {empresa}, {contato}, {equipamento}, {os}…' }, { k: 'quando', r: 'Quando usar' }], m)
        .then(function (v) { if (!v) return; var d = Object.assign({}, v); if (row) { d._row = m._row; d._modeloOriginal = m.modelo; } escrever('salvarModelo', [d], row ? aplicar('modelos', row, v) : null); });
    },
    'mod-novo': function () { ACOES['mod-editar'](''); },
    'ag-os': function (row) { var o = achar('os', row); agendar({ titulo: (o.status === 'Pronto' ? 'Retirada ' : 'Atendimento ') + o.num + ' – ' + o.cliente, data: o.previsao || D.hoje, local: V.enderecoOS(D, o), descricao: o.equipamento + (o.defeito ? ' – ' + o.defeito : ''), refTipo: 'os', refId: o.num, linha: o._row }); },
    'ag-ev': function (id) { var a = (D.agenda || []).find(function (x) { return x.eventoId === id; }); agendar({ titulo: a.titulo, data: a.data, hora: a.inicio, local: a.local, descricao: a.descricao || '', refTipo: 'agenda', refId: id }); },
    'ag-rem': function (id) { perguntar('Tirar este evento da Agenda do Google?', { titulo: 'Agenda', sim: 'Tirar da agenda', perigo: true }).then(function (ok) { if (ok) escrever('removerEventoAgenda', [{ eventoId: id }], function (c) { c.agenda = (c.agenda || []).filter(function (x) { return x.eventoId !== id; }); }); }); },
    'ag-rem-os': function (row) { var o = achar('os', row), id = eventoDaOS(o); perguntar('Tirar ' + o.num + ' da Agenda do Google?', { titulo: 'Agenda', sim: 'Tirar da agenda', perigo: true }).then(function (ok) { if (ok) escrever('removerEventoAgenda', [{ eventoId: id }], function (c) { (c.os || []).forEach(function (x) { if (x.num === o.num) x.eventoId = ''; }); c.agenda = (c.agenda || []).filter(function (x) { return x.eventoId !== id; }); }); }); },
    'em-os': function (row) { var o = achar('os', row); emailTela(V.clienteDaOS(D, o), o); },
    'em-cli': function (row) { var c = achar('clientes', row), ult = (D.os || []).filter(function (o) { return o.cliente === c.nome; }).slice(-1)[0]; emailTela(c, ult || null); },
    'tar-feita': function (row) { var t = achar('tarefas', row); escrever('mudarStatusTarefa', [t.tarefa, t._row, 'Feita'], aplicar('tarefas', row, { status: 'Feita' })); }
  };


  // ---------- v0.6.0: OS com vários equipamentos (igual ao painel do CRM: crm-v3 API v32) ----------
  // Rascunho em memória; os totais aparecem enquanto digita (os_multi.js = mesma conta do servidor). Quem grava é o servidor.
  var O = window.ProFixOSM, OSM = null, CAT = null, CATK = 'profix.catalogoOS';
  var TIPOS_EQ = ['Notebook', 'Desktop', 'All-in-one', 'Impressora', 'Monitor', 'Outro'];
  function eqVazio(n) { return { equipId: 'EQ' + n, identificacao: '', tipo: '', modelo: '', serie: '', defeito: '', servico: '', obs: '', itens: [] }; }
  function itemDe(i) { return { tipo: i.tipo, descricao: i.descricao || '', qtd: i.qtd == null ? '' : String(i.qtd), valorUnit: i.valorUnit == null ? '' : String(i.valorUnit), modo: i.modo || '', origem: i.origem || '' }; }
  function rascunhoDe(m) {
    return { cliente: m.cliente || '', previsao: m.previsao || '', acessorios: m.acessorios || '', obsInt: m.obsInt || '',
      equipamentos: (m.equipamentos || []).map(function (q) { return Object.assign(eqVazio(1), q, { totais: undefined, itens: (q.itens || []).map(itemDe) }); }),
      itensOS: (m.itensOS || []).map(itemDe) };
  }
  function carregarCatalogo() {
    if (!CAT) { try { CAT = JSON.parse(localStorage.getItem(CATK)) || null; } catch (x) { CAT = null; } }
    // Evita o ciclo ler -> render -> ler da aba Preços; atualiza no máximo a cada 5 min.
    if (!api.pode('catalogoOS') || carregarCatalogo.indo || Date.now() - (carregarCatalogo.quando || 0) < 300000) return;
    carregarCatalogo.indo = true; carregarCatalogo.quando = Date.now();
    api.ler('catalogoOS', []).then(function (r) { carregarCatalogo.indo = false; CAT = (r && r.itens) || []; try { localStorage.setItem(CATK, JSON.stringify(CAT)); } catch (x) { /* cota */ }
      var res = document.querySelectorAll('[data-osm-q]'); res.forEach(function (el) { mostrarBusca(el); }); if (rota().tela === 'mais' && rota().sub === 'precos') render(); },
      function () { carregarCatalogo.indo = false; });
  }
  function abrirOSM(chave) {
    var row = chave, o = row ? achar('os', row) : null;
    OSM = { chave: chave, row: o ? o._row : '', num: o ? o.num : '', aprovacao: o ? o.aprovacao || '' : '', sujo: false, carregando: !!o,
      d: { cliente: o ? o.cliente : '', previsao: o ? o.previsao || '' : '', acessorios: o ? o.acessorios || '' : '', obsInt: o ? o.obsInt || '' : '', equipamentos: [eqVazio(1)], itensOS: [] } };
    if (o) { OSM.d.equipamentos[0].identificacao = o.equipamento || ''; OSM.d.equipamentos[0].defeito = o.defeito || ''; OSM.d.equipamentos[0].servico = o.servico || ''; }
    if (!o && PRE_OSM) { OSM.d.cliente = PRE_OSM.cliente; if (PRE_OSM.equipamentos.length) OSM.d.equipamentos = PRE_OSM.equipamentos; PRE_OSM = null; } // v0.7.0: vindo da ficha do cliente
    carregarCatalogo();
    if (!o) return;
    var alvo = OSM;
    (api.pode('lerOSMulti') ? api.ler('lerOSMulti', [o.num]) : Promise.resolve(null)).then(function (m) {
      if (OSM !== alvo) return; OSM.carregando = false;
      if (m) { OSM.d = rascunhoDe(m); if (!OSM.d.equipamentos.length) OSM.d.equipamentos = [eqVazio(1)]; }
      render();
    }, function (er) { if (OSM !== alvo) return; OSM.carregando = false; aviso('Não deu para ler os equipamentos desta OS: ' + er.message); render(); });
  }
  function aprovada() { return /^aprovado$/i.test(OSM.aprovacao || ''); }
  function linhaItem(pref, it, j) {
    var aj = it.tipo === 'adicional' || it.tipo === 'desconto', neg = it.origem === 'negociacao', f = function (k) { return 'data-f="' + pref + '.' + j + '.' + k + '"'; };
    if (neg) return '<div class="osm-it neg" data-linha="' + pref + '.' + j + '"><span class="tag">🏷 Condição especial</span> <span>' + e(it.descricao) + '</span><b class="osm-lt">' + O.brl(-Number(it.valorUnit || 0)) + '</b></div>';
    return '<div class="osm-it" data-linha="' + pref + '.' + j + '">' +
      '<select ' + f('tipo') + ' aria-label="Tipo do item">' + O.TIPOS.map(function (t) { return '<option' + (t === it.tipo ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
      '<input ' + f('descricao') + ' aria-label="Descrição" placeholder="Descrição" value="' + e(it.descricao) + '">' +
      (aj ? '<select ' + f('modo') + ' aria-label="R$ ou %"><option' + (it.modo !== '%' ? ' selected' : '') + '>R$</option><option' + (it.modo === '%' ? ' selected' : '') + '>%</option></select>'
        : '<input ' + f('qtd') + ' inputmode="decimal" aria-label="Quantidade" placeholder="Qtd" value="' + e(it.qtd || '1') + '">') +
      '<input ' + f('valorUnit') + ' inputmode="decimal" aria-label="' + (aj ? 'Valor' : 'Valor unitário (R$)') + '" placeholder="' + (aj ? 'Valor' : 'R$ unit.') + '" value="' + e(it.valorUnit) + '">' +
      '<b class="osm-lt" data-lt="' + pref + '.' + j + '"></b>' +
      '<button type="button" class="btn sec peq" data-osm="rem-item" data-p="' + pref + '.' + j + '" aria-label="Remover item">✕</button></div>';
  }
  function atalhosLista() { var p = window.ProFixDif.padroes(D).indicacaoPct, l = O.ATALHOS.slice(); if (p) l.push({ rot: 'Indicação −' + String(p).replace('.', ',') + '%', tipo: 'desconto', modo: '%', valorUnit: p, descricao: 'Desconto de indicação' }); return l; } // v0.7.1: % de indicação vem do servidor
  function atalhos(alvo) { return '<div class="chips">' + atalhosLista().map(function (a, k) { return '<button type="button" class="chip" data-osm="atalho" data-p="' + alvo + '.' + k + '">' + e(a.rot) + '</button>'; }).join('') + '</div>'; }
  function telaOSM(sub) {
    if (!OSM || OSM.chave !== sub) abrirOSM(sub);
    var d = OSM.d, nomes = (D.clientes || []).map(function (c) { return c.nome; }), ap = aprovada(), cond = O.condicaoDe(d);
    var h = '<div class="row"><a href="#servicos" class="btn sec peq">← Serviços</a>' + (OSM.num ? tag(OSM.num, 'azul') + (OSM.aprovacao ? tag('Orçamento ' + OSM.aprovacao, ap ? 'ok' : 'media') : '') : '') + '</div>' +
      '<h1>' + (OSM.num ? 'OS ' + e(OSM.num) + ' · equipamentos' : 'Nova OS com vários equipamentos') + '</h1>';
    if (OSM.carregando) return h + '<div class="vazio">Carregando os equipamentos desta OS…</div>';
    h += '<div id="osm" class="osm">' + (ap ? '<p class="alerta">Orçamento aprovado. Ainda dá para salvar mudanças, mas a condição especial não pode mais ser mudada.</p>' : '') +
      '<div class="card"><label for="osmCli">Cliente</label><select id="osmCli" data-f="d.cliente" required><option value="">Escolha o cliente</option>' +
      (d.cliente && nomes.indexOf(d.cliente) < 0 ? '<option selected>' + e(d.cliente) + '</option>' : '') +
      nomes.map(function (n) { return '<option' + (n === d.cliente ? ' selected' : '') + '>' + e(n) + '</option>'; }).join('') + '</select>' +
      '<div class="lin2"><div><label for="osmPrev">Previsão de entrega</label><input id="osmPrev" type="date" data-f="d.previsao" value="' + e(d.previsao) + '"></div>' +
      '<div><label for="osmAce">Acessórios deixados</label><input id="osmAce" data-f="d.acessorios" value="' + e(d.acessorios) + '"></div></div>' +
      '<label for="osmObs">Observações internas</label><textarea id="osmObs" data-f="d.obsInt" rows="2">' + e(d.obsInt) + '</textarea></div>';
    d.equipamentos.forEach(function (q, i) {
      var f = function (k) { return 'data-f="eq.' + i + '.' + k + '"'; };
      h += '<section class="card osm-eq" data-eq="' + i + '"><div class="row"><h2 style="margin:0">💻 Máquina ' + (i + 1) + '</h2>' +
        (d.equipamentos.length > 1 ? '<button type="button" class="btn sec peq" data-osm="rem-eq" data-p="' + i + '">Remover máquina</button>' : '') + '</div>' +
        '<div class="lin2"><div><label>Identificação</label><input ' + f('identificacao') + ' placeholder="ex.: Notebook da recepção" value="' + e(q.identificacao) + '"></div>' +
        '<div><label>Tipo</label><input ' + f('tipo') + ' list="osmTipos" value="' + e(q.tipo) + '"></div>' +
        '<div><label>Marca / modelo</label><input ' + f('modelo') + ' value="' + e(q.modelo) + '"></div>' +
        '<div><label>Nº de série</label><input ' + f('serie') + ' value="' + e(q.serie) + '"></div></div>' +
        '<label>Defeito relatado</label><input ' + f('defeito') + ' value="' + e(q.defeito) + '">' +
        '<label>Serviço</label><input ' + f('servico') + ' value="' + e(q.servico) + '">' +
        '<h3>Itens</h3><div class="osm-its">' + (q.itens.map(function (it, j) { return linhaItem('it.' + i, it, j); }).join('') || '<p class="muted">Nenhum item ainda. Busque no catálogo abaixo.</p>') + '</div>' +
        '<label for="osmQ' + i + '">⚡ Registro rápido (catálogo)</label><input id="osmQ' + i + '" type="search" data-osm-q="' + i + '" placeholder="Digite: formatação, SSD, hora técnica…" autocomplete="off">' +
        '<div class="osm-res" id="osmRes' + i + '"></div>' +
        '<div class="acoes"><button type="button" class="btn sec peq" data-osm="add-item" data-p="' + i + '.peça">+ Peça</button><button type="button" class="btn sec peq" data-osm="add-item" data-p="' + i + '.serviço">+ Serviço</button>' +
        '<button type="button" class="btn sec peq" data-osm="add-item" data-p="' + i + '.mão de obra">+ Mão de obra</button><button type="button" class="btn sec peq" data-osm="add-item" data-p="' + i + '.adicional">+ Adicional</button>' +
        '<button type="button" class="btn sec peq" data-osm="add-item" data-p="' + i + '.desconto">+ Desconto</button></div>' + atalhos('eq' + i) +
        '<div class="osm-tot" id="osmTot' + i + '"></div></section>';
    });
    h += '<button type="button" class="btn sec" data-osm="add-eq">+ Adicionar máquina</button>' +
      '<section class="card"><h2 style="margin-top:0">Descontos e adicionais da OS inteira</h2><div class="osm-its">' +
      (d.itensOS.map(function (it, j) { return linhaItem('os', it, j); }).join('') || '<p class="muted">Nenhum.</p>') + '</div>' +
      '<div class="acoes"><button type="button" class="btn sec peq" data-osm="add-item" data-p="os.adicional">+ Adicional</button><button type="button" class="btn sec peq" data-osm="add-item" data-p="os.desconto">+ Desconto</button>' +
      (cond && !ap ? '<button type="button" class="btn sec peq" data-osm="rem-cond">Remover condição especial</button>' : '') + '</div>' + atalhos('os') + '</section>' +
      '<datalist id="osmTipos">' + TIPOS_EQ.map(function (t) { return '<option value="' + t + '">'; }).join('') + '</datalist>' +
      '<div class="osm-bar"><div id="osmGeral"></div><div class="acoes">' +
      '<button type="button" class="btn" data-osm="salvar"' + (api.pode('salvarOSMulti') ? '' : ' disabled title="Ainda não liberado no servidor"') + '>💾 Salvar OS</button>' +
      '<button type="button" class="btn sec" data-osm="ver">👁 Ver orçamento</button>' +
      (!ap && api.pode('aplicarCondicaoEspecialOS') ? '<button type="button" class="btn sec" data-osm="cond">🏷 Condição especial</button>' : '') + '</div>' +
      '<p class="muted" id="osmSujo"' + (OSM.sujo ? '' : ' hidden') + '>Alterações ainda não salvas.</p></div></div>';
    return h;
  }
  function pegar(p) { var a = p.split('.'); if (a[0] === 'd') return { o: OSM.d, k: a[1] }; if (a[0] === 'eq') return { o: OSM.d.equipamentos[+a[1]], k: a[2] }; if (a[0] === 'it') return { o: OSM.d.equipamentos[+a[1]].itens[+a[2]], k: a[3] }; return { o: OSM.d.itensOS[+a[1]], k: a[2] }; }
  function atualizarTotais() {
    var t = O.totaisTolerante(OSM.d), el;
    t.equipamentos.forEach(function (q, i) {
      if ((el = $('osmTot' + i))) el.innerHTML = '<span>Subtotal ' + O.brl(q.totais.subtotal) + (q.totais.adicionais ? ' · adicionais ' + O.brl(q.totais.adicionais) : '') + (q.totais.descontos ? ' · descontos ' + O.brl(-q.totais.descontos) : '') + '</span><b>Total da máquina: ' + O.brl(q.totais.total) + '</b>';
    });
    // total de cada linha (mesma conta do bloco)
    var linha = function (pref, its, base) {
      var ok = its.map(function (it, j) { try { return { j: j, v: O.validarItem(it) }; } catch (x) { return null; } }).filter(Boolean);
      var c = O.calcularBloco(ok.map(function (x) { return x.v; }), base), ordem = ok.filter(function (x) { return !O.ehAjuste(x.v); }).concat(ok.filter(function (x) { return x.v.tipo === 'adicional'; }), ok.filter(function (x) { return x.v.tipo === 'desconto'; }));
      document.querySelectorAll('[data-lt^="' + pref + '."]').forEach(function (b) { b.textContent = '—'; });
      ordem.forEach(function (x, k) { var b = document.querySelector('[data-lt="' + pref + '.' + x.j + '"]'); if (b) b.textContent = O.brl(c.itens[k].total); });
    };
    OSM.d.equipamentos.forEach(function (q, i) { linha('it.' + i, q.itens, 0); });
    linha('os', OSM.d.itensOS, t.totais.equipamentos);
    if ((el = $('osmGeral'))) el.innerHTML = '<span class="muted">' + OSM.d.equipamentos.length + ' máquina(s) · ' + O.brl(t.totais.equipamentos) + (t.totais.adicionais ? ' · adic. ' + O.brl(t.totais.adicionais) : '') + (t.totais.descontos ? ' · desc. ' + O.brl(-t.totais.descontos) : '') + '</span><b class="osm-total">Total geral: <span id="osmTotal">' + O.brl(t.totais.total) + '</span></b>';
    if ((el = $('osmSujo'))) el.hidden = !OSM.sujo;
  }
  function mostrarBusca(inp) {
    var i = inp.dataset.osmQ, box = $('osmRes' + i); if (!box) return;
    var q = inp.value.trim(); if (!q) { box.innerHTML = ''; return; }
    var r = O.buscarCatalogo(CAT || [], q, 8);
    box.innerHTML = r.map(function (c) { var k = (CAT || []).indexOf(c); return '<button type="button" class="osm-cat" data-osm="cat" data-p="' + i + '.' + k + '"><span>' + e(c.descricao) + ' <span class="muted">' + e(c.categoria || '') + '</span></span><b>' + precoTxt(c) + '</b></button>'; }).join('') +
      '<button type="button" class="osm-cat" data-osm="livre" data-p="' + i + '"><span>+ Lançar “' + e(q) + '” sem catálogo</span></button>' + (CAT ? '' : '<p class="muted">Catálogo ainda não carregado (precisa de internet na 1ª vez).</p>');
  }
  function mudou() { OSM.sujo = true; atualizarTotais(); }
  function redesenhar() { var y = window.scrollY; render(); window.scrollTo(0, y); }
  function ligarOSM(c) {
    var raiz = c.querySelector('#osm'); if (!raiz) return;
    atualizarTotais();
    raiz.addEventListener('input', function (ev) { var t = ev.target;
      if (t.dataset.osmQ !== undefined) return mostrarBusca(t);
      if (!t.dataset.f) return; var p = pegar(t.dataset.f); p.o[p.k] = t.value;
      if (/\.(tipo|modo)$/.test(t.dataset.f) && /^(it|os)\./.test(t.dataset.f)) { if (p.k === 'tipo') { p.o.modo = O.ehAjuste({ tipo: t.value }) ? (p.o.modo || 'R$') : ''; } OSM.sujo = true; return redesenhar(); }
      mudou(); });
    raiz.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-osm]'); if (!b) return; ev.preventDefault();
      var a = b.dataset.osm, p = (b.dataset.p || '').split('.'), d = OSM.d;
      if (a === 'add-eq') { if (d.equipamentos.length >= 20) return aviso('No máximo 20 máquinas por OS.'); d.equipamentos.push(eqVazio(d.equipamentos.length + 1)); OSM.sujo = true; redesenhar(); var n = document.querySelectorAll('.osm-eq'); n[n.length - 1].querySelector('input').focus(); return; }
      if (a === 'rem-eq') { perguntar('Remover a máquina ' + (+p[0] + 1) + ' e os itens dela?', { titulo: 'Remover máquina', sim: 'Remover', perigo: true }).then(function (ok) { if (ok) { d.equipamentos.splice(+p[0], 1); OSM.sujo = true; redesenhar(); } }); return; }
      if (a === 'add-item') { var tp = p.slice(1).join('.'), lst = p[0] === 'os' ? d.itensOS : d.equipamentos[+p[0]].itens; lst.push({ tipo: tp, descricao: '', qtd: '1', valorUnit: '', modo: O.ehAjuste({ tipo: tp }) ? 'R$' : '', origem: '' }); OSM.sujo = true; redesenhar(); return; }
      if (a === 'rem-item') { var l2 = p[0] === 'os' ? d.itensOS : d.equipamentos[+p[1]].itens; l2.splice(+p[p.length - 1], 1); OSM.sujo = true; redesenhar(); return; }
      if (a === 'atalho') { var at = atalhosLista()[+p[1]], dest = p[0] === 'os' ? d.itensOS : d.equipamentos[+p[0].slice(2)].itens; dest.push({ tipo: at.tipo, descricao: at.descricao, qtd: '1', valorUnit: String(at.valorUnit), modo: at.modo, origem: 'atalho' }); OSM.sujo = true; redesenhar(); return; }
      if (a === 'cat' || a === 'livre') {
        var i = +p[0], q = $('osmQ' + i).value.trim(), ci = a === 'cat' ? CAT[+p[1]] : null;
        d.equipamentos[i].itens.push(ci ? { tipo: O.tipoDaCategoria(ci.categoria), descricao: ci.descricao, qtd: '1', valorUnit: ci.valor === '' || ci.valor == null ? '' : String(ci.valor), modo: '', origem: ci.origem || 'Catálogo OS' }
          : { tipo: 'serviço', descricao: q, qtd: '1', valorUnit: '', modo: '', origem: '' });
        OSM.sujo = true; redesenhar(); var nq = $('osmQ' + i); if (nq) nq.focus(); return;
      }
      if (a === 'salvar') return salvarOSM();
      if (a === 'ver') return verOrcamento();
      if (a === 'cond') return condicaoEspecial();
      if (a === 'rem-cond') return removerCondicao();
    });
  }
  /** Rascunho -> formato do salvarOSMulti (linhas totalmente vazias são ignoradas). */
  function dadosOSM() {
    var vazio = function (i) { return !String(i.descricao || '').trim() && !String(i.valorUnit || '').trim(); };
    var d = OSM.d;
    return { num: OSM.num, _row: OSM.row, cliente: d.cliente, _rowCliente: ((D.clientes || []).filter(function (c) { return c.nome === d.cliente; })[0] || {})._row,
      previsao: d.previsao, acessorios: d.acessorios, obsInt: d.obsInt,
      equipamentos: d.equipamentos.map(function (q) { return Object.assign({}, q, { itens: q.itens.filter(function (i) { return !vazio(i); }) }); }),
      itensOS: d.itensOS.filter(function (i) { return !vazio(i); }) };
  }
  function validarOSM() { var x = dadosOSM(); if (!x.cliente) throw new Error('Escolha o cliente.'); O.montar(x); return x; }
  function salvarOSM() {
    var x; try { x = validarOSM(); } catch (er) { return aviso(er.message); }
    if (!x.num && api.usaIdApp) x.idApp = OSM.idApp || (OSM.idApp = RAP ? RAP.idProvisorio() : 'app' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)); // API @131: repetir não duplica a OS
    return api.escrever('salvarOSMulti', [x]).then(function (r) {
      aviso(r.msg);
      if (r.enfileirado) { OSM.sujo = false; return; }
      var num = (r.dados && r.dados.num) || OSM.num;
      // v0.9.3: com a linha na resposta, não precisa baixar tudo; sem ela, leitura imediata (sem tela de carregamento).
      var dr = r.dados || {}, ja = (D.os || []).filter(function (y) { return String(y.num) === String(num); })[0];
      if (dr._row && num) { if (!ja) { (D.os = D.os || []).push({ _row: Number(dr._row), num: num, cliente: x.cliente, equipamento: dr.equipamento || (x.equipamentos || []).length + ' equipamentos:', status: 'Recebido', statusEm: D.hoje, entrada: D.hoje }); api.tocou(false); } atualizarFundo(); }
      return (dr._row && num ? Promise.resolve() : atualizarFundo(true)).then(function () {
        var o = (D.os || []).filter(function (y) { return String(y.num) === String(num); })[0];
        OSM.num = num; OSM.sujo = false; if (o) { OSM.row = o._row; OSM.aprovacao = o.aprovacao || ''; OSM.chave = String(o._row); if (location.hash !== '#osm/' + o._row) history.replaceState(null, '', '#osm/' + o._row); }
        render();
      });
    }, function (er) { aviso('Não salvou: ' + er.message); });
  }
  function recarregarOSM() {
    if (!OSM.num) return Promise.resolve();
    return Promise.all([atualizarFundo(true), api.ler('lerOSMulti', [OSM.num])]).then(function (rs) { return rs[1]; }).then(function (m) {
      var o = (D.os || []).filter(function (y) { return String(y.num) === String(OSM.num); })[0];
      if (o) OSM.aprovacao = o.aprovacao || ''; if (m) OSM.d = rascunhoDe(m); OSM.sujo = false; render();
    }, function (er) { aviso(er.message); });
  }
  function clienteOSM() { return (D.clientes || []).filter(function (c) { return c.nome === OSM.d.cliente; })[0] || { nome: OSM.d.cliente }; }
  /** orcamentoOS do servidor ({num} se salvo, senão {dados}); sem internet ou sem a ação, prévia local com a mesma conta. */
  function pedirOrcamento() {
    var x; try { x = validarOSM(); } catch (er) { return Promise.reject(er); }
    var arg = OSM.num && !OSM.sujo ? { num: OSM.num } : { dados: x };
    var local = function () { var c = clienteOSM(); return O.orcamentoLocal(x, { nome: c.nome, whatsapp: c.whatsapp }); };
    if (!api.pode('orcamentoOS') || navigator.onLine === false) return Promise.resolve(local());
    return api.ler('orcamentoOS', [arg]).catch(function (er) { if (er.doServidor) throw er; return local(); });
  }
  function tabItens(its) {
    return its.length ? '<table class="orc-t">' + its.map(function (i) { var aj = O.ehAjuste(i); return '<tr class="' + (i.tipo === 'desconto' ? 'desc' : aj ? 'adic' : '') + '"><td>' + (aj ? e(O.rotulo(i)) + ': ' : '') + e(i.descricao) + (!aj && i.qtd !== 1 ? ' <span class="muted">x' + e(String(i.qtd).replace('.', ',')) + '</span>' : '') + '</td><td class="n">' + O.brl(i.total) + '</td></tr>'; }).join('') + '</table>' : '<p class="muted">Sem itens.</p>';
  }
  function verOrcamento() {
    pedirOrcamento().then(function (o) {
      var t = $('tela-orc'), ap = /^aprovado$/i.test(o.aprovacao || OSM.aprovacao || ''), podeAprovar = OSM.num && !OSM.sujo && !ap && api.pode('aprovarOrcamentoOS');
      var c = clienteOSM(), semConsent = c.consent && c.consent !== 'Sim';
      t.innerHTML = '<div class="orc"><div class="orc-topo"><div class="marca-orc">Pro<span>Fix</span> Computadores</div><button type="button" class="btn sec peq" id="orcFechar">✕ Fechar</button></div>' +
        '<h1>Orçamento ' + e(o.num || '(OS ainda não salva)') + '</h1><p>Cliente: <b>' + e((o.cliente && o.cliente.nome) || OSM.d.cliente) + '</b></p>' +
        (o.local ? '<p class="alerta">Prévia feita no aparelho (sem o servidor). Os valores usam a mesma conta do CRM.</p>' : '') +
        (o.equipamentos || []).map(function (q, n) { var tm = [q.tipo, q.modelo].filter(String).join(' ');
          return '<section class="orc-eq"><h2>' + (n + 1) + '. ' + e(q.identificacao) + (tm ? ' <span class="muted">(' + e(tm) + ')</span>' : '') + '</h2>' + (q.serie ? '<div class="muted">Nº de série ' + e(q.serie) + '</div>' : '') +
            (q.defeito ? '<div>Defeito: ' + e(q.defeito) + '</div>' : '') + tabItens(q.itens) + '<div class="orc-sub">Total da máquina <b>' + O.brl(q.totais.total) + '</b></div></section>'; }).join('') +
        ((o.itensOS || []).length ? '<section class="orc-eq"><h2>Ajustes da OS</h2>' + tabItens(o.itensOS) + '</section>' : '') +
        (o.economia > 0 ? '<p class="orc-econ">Você economiza ' + O.brl(o.economia) + '</p>' : '') +
        '<div class="orc-total">Total geral <b id="orcTotal">' + O.brl(o.totais.total) + '</b></div>' +
        '<p>📅 Previsão de entrega: ' + (o.previsao ? O.dataBR(o.previsao) : 'a combinar') + '</p>' +
        (o.termos && o.termos.validade ? '<p class="muted">Validade: ' + e(o.termos.validade) + '</p>' : '') + (o.termos && o.termos.garantia ? '<p class="muted">Garantia: ' + e(o.termos.garantia) + '</p>' : '') +
        (ap ? '<p class="tag ok" id="orcAprovado">✅ Orçamento aprovado' + (o.comoAprov ? ' – ' + e(o.comoAprov) : '') + '</p>' : '') +
        '<div class="orc-acoes">' +
        (podeAprovar ? '<button type="button" class="btn" id="orcAprovar">✅ Aprovar orçamento</button>' : (!ap && (!OSM.num || OSM.sujo) ? '<p class="muted">Salve a OS para poder aprovar.</p>' : '')) +
        '<button type="button" class="btn wa" id="orcWa">💬 Enviar pelo WhatsApp (com link de aprovação)</button>' +
        '<button type="button" class="btn sec" id="orcCopiar">📋 Copiar texto</button>' +
        (o.html ? '<button type="button" class="btn sec" id="orcPdf">🖨 Imprimir / PDF</button>' : '<button type="button" class="btn sec" id="orcPdf">🖨 Imprimir</button>') + '</div>' +
        '<p class="muted">O WhatsApp só abre com o texto pronto: quem envia é você.' + (semConsent ? ' Atenção: este cliente está sem consentimento LGPD para mensagens.' : '') + '</p>' +
        '<details><summary>Ver texto do WhatsApp</summary><pre class="pre" id="orcTexto">' + e(o.whatsappTexto) + '</pre></details></div>';
      if (!t.open) t.showModal();
      $('orcFechar').onclick = function () { t.close(); };
      // v0.9.0: mandar o orçamento da OS com vários equipamentos -> Aguardando aprovação (o link do cliente mostra Aprovar/Recusar). Vencido: oferece renovar antes.
      // v0.9.2: o texto do servidor (whatsappTexto) não leva o link: o App busca o link real (linkClienteOS), põe o Pix e o fechamento do Atendimento.
      // Sem link: não abre o WhatsApp (aviso + Tentar de novo / Enviar mesmo assim sem link). OS não salva: não manda.
      $('orcWa').onclick = function () {
        var os = OSM.num && !OSM.sujo ? (D.os || []).filter(function (x) { return x.num === OSM.num; })[0] : null;
        if (!os) return aviso('Salve a OS para mandar o orçamento com o link de aprovação.');
        var cc = V.clienteDaOS(D, os) || c, pb = blocoPix(o.totais && o.totais.total, os.num);
        prepararEnvioOrc(os).then(function () {
          abrirComLink({ os: os, cliente: cc, titulo: 'Orçamento da ' + os.num, tipo: 'orcamento', pix: pb ? pb.codigo : '',
            montar: function (link) { return String(o.whatsappTexto || '').replace(/\s+$/, '') + (pb ? '\n\n' + pb.texto : '') + '\n\n' + ORC.fechamento(link); } });
        });
      };
      $('orcCopiar').onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(o.whatsappTexto) : Promise.reject()).then(function () { aviso('Texto copiado.'); }, function () { aviso('Não deu para copiar: selecione o texto em “Ver texto do WhatsApp”.'); }); };
      $('orcPdf').onclick = function () {
        if (!o.html) return window.print();
        var w = window.open(URL.createObjectURL(new Blob([o.html], { type: 'text/html' })), '_blank'); if (!w) aviso('Libere as janelas pop-up para imprimir.');
      };
      if ($('orcAprovar')) $('orcAprovar').onclick = function () {
        perguntar('Registrar que o cliente APROVOU o orçamento de ' + O.brl(o.totais.total) + ' agora?', { titulo: 'Aprovar orçamento', sim: 'Sim, aprovou' }).then(function (ok) { if (!ok) return;
        api.escrever('aprovarOrcamentoOS', [{ num: OSM.num, _row: OSM.row }], aplicar('os', OSM.row, { aprovacao: 'Aprovado' })).then(function (r) {
          aviso(r.msg); OSM.aprovacao = 'Aprovado'; atualizarFundo(); return verOrcamento();
        }, function (er) { aviso('Não aprovou: ' + er.message); }); });
      };
    }, function (er) { aviso(er.message); });
  }
  function condicaoEspecial() {
    var x; try { x = validarOSM(); } catch (er) { return aviso(er.message); }
    var m = $('modal'), salva = OSM.num && !OSM.sujo, base = O.montar(O.semNegociacao(x)).totais.total, atual = O.condicaoDe(x);
    m.innerHTML = '<form method="dialog" id="fCond"><h2 style="margin:0">🏷 Condição especial</h2><p class="muted">Total sem condição: <b>' + O.brl(base) + '</b>. Vira um desconto da OS (gravado em R$), entra no orçamento e no WhatsApp.</p>' +
      '<div class="chips" role="group" aria-label="Desconto">' + [5, 10, 15].map(function (p) { return '<button type="button" class="chip" data-pct="' + p + '" aria-pressed="false">' + p + '%</button>'; }).join('') + '<button type="button" class="chip" data-pct="livre" aria-pressed="false">Outro valor</button></div>' +
      '<div class="lin" id="condLivre" hidden><input id="condValor" inputmode="decimal" aria-label="Valor da condição" placeholder="Valor"><select id="condModo" aria-label="R$ ou %"><option>%</option><option>R$</option></select></div>' +
      '<label for="condMotivo">Motivo</label><input id="condMotivo" placeholder="Condição especial para fechamento hoje">' +
      '<label class="chk"><input type="checkbox" id="condHoje" checked> Selo “válido só hoje”</label>' +
      '<div id="condPrev" class="card" aria-live="polite"><span class="muted">Escolha 5, 10, 15% ou um valor.</span></div>' +
      (salva ? '' : '<p class="alerta">Salve a OS antes de aplicar a condição especial.</p>') +
      '<div class="acoes"><button type="button" class="btn" id="condAplicar" disabled>Aplicar</button>' + (atual ? '<button type="button" class="btn sec" id="condRemover">Remover condição</button>' : '') + '<button class="btn sec" value="">Cancelar</button></div></form>';
    m.onclose = null; m.showModal();
    var esc = { modo: '%', valor: '' }, seq = 0;
    var prev = function () {
      var el = $('condPrev'), av; try { av = O.avaliarCondicao(base, esc.modo, esc.valor); } catch (er) { el.innerHTML = '<span class="muted">' + e(er.message) + '</span>'; $('condAplicar').disabled = true; return; }
      var mostrar = function (a) { el.innerHTML = 'Desconto <b>' + O.brl(a.desconto) + '</b> (' + String(a.pct).replace('.', ',') + '%) · novo total <b id="condNovo">' + O.brl(a.novoTotal) + '</b>' + (a.aviso ? '<p class="alerta" id="condAviso">⚠️ ' + e(a.aviso) + '</p>' : ''); };
      mostrar(av); $('condAplicar').disabled = !salva;
      if (api.pode('simularCondicaoOS') && navigator.onLine !== false) { var n = ++seq; api.ler('simularCondicaoOS', [Object.assign(salva ? { num: OSM.num } : { dados: x }, { modo: esc.modo, valor: esc.valor })]).then(function (a) { if (n === seq && a) mostrar(a); }, function () { /* fica a prévia local */ }); }
    };
    m.querySelectorAll('[data-pct]').forEach(function (b) { b.onclick = function () {
      m.querySelectorAll('[data-pct]').forEach(function (y) { y.setAttribute('aria-pressed', String(y === b)); });
      var livre = b.dataset.pct === 'livre'; $('condLivre').hidden = !livre;
      if (livre) { esc.modo = $('condModo').value; esc.valor = $('condValor').value; $('condValor').focus(); } else { esc.modo = '%'; esc.valor = b.dataset.pct; }
      prev(); }; });
    $('condValor').oninput = $('condModo').onchange = function () { esc.modo = $('condModo').value; esc.valor = $('condValor').value; prev(); };
    $('condAplicar').onclick = function () {
      var args = { num: OSM.num, _row: OSM.row, modo: esc.modo, valor: esc.valor, motivo: $('condMotivo').value.trim(), validoHoje: $('condHoje').checked };
      api.escrever('aplicarCondicaoEspecialOS', [args]).then(function (r) { m.close(''); aviso(r.msg); return recarregarOSM(); }, function (er) { aviso('Não aplicou: ' + er.message); });
    };
    if ($('condRemover')) $('condRemover').onclick = function () { m.close(''); removerCondicao(); };
  }
  function removerCondicao() {
    if (!OSM.num || OSM.sujo) return aviso('Salve a OS antes de remover a condição especial.');
    perguntar('Remover a condição especial desta OS?', { titulo: 'Condição especial', sim: 'Remover', perigo: true }).then(function (ok) { if (!ok) return;
    api.escrever('removerCondicaoEspecialOS', [{ num: OSM.num, _row: OSM.row }]).then(function (r) { aviso(r.msg); return recarregarOSM(); }, function (er) { aviso('Não removeu: ' + er.message); }); });
  }
  TELAS.osm = telaOSM;
  ACOES['osm-nova'] = function () { OSM = null; location.hash = '#osm'; };
  ACOES['osm-abrir'] = function (row) { OSM = null; location.hash = '#osm/' + row; };
  ACOES['cos-editar'] = function (k) {
    var c = k !== '' && CAT ? CAT[+k] : {};
    formulario(k !== '' ? e(c.descricao) : 'Novo preço no catálogo', [{ k: 'categoria', r: 'Categoria', t: 'select', o: ['Serviço', 'Mão de obra', 'Peça'], req: true }, { k: 'descricao', r: 'Descrição', req: true },
      { k: 'valor', r: 'Valor base (R$)', t: 'number' }, { k: 'tipoPreco', r: 'Tipo de preço', t: 'select', o: ['Fixo', 'A partir de', 'Por hora', 'Sob orçamento'] }, { k: 'ativo', r: 'Ativo', t: 'select', o: ['Sim', 'Não'] }, { k: 'fonte', r: 'Fonte / obs' }],
      Object.assign({ ativo: 'Sim' }, c)).then(function (v) { if (!v) return; var d = Object.assign({}, v); if (c.id) d.id = c.id;
        api.escrever('salvarCatalogoOS', [d]).then(function (r) { aviso(r.msg); try { localStorage.removeItem(CATK); } catch (x) { /* ok */ } CAT = null; carregarCatalogo.quando = 0; carregarCatalogo(); }, function (er) { aviso('Não salvou: ' + er.message); }); });
  };
  PRECISA['osm-nova'] = 'salvarOSMulti'; PRECISA['cos-editar'] = 'salvarCatalogoOS';
  function telaPrecos() {
    carregarCatalogo();
    var l = (CAT || []).map(function (c, k) { return { c: c, k: k }; }).filter(function (x) { return x.c.origem === 'Catálogo OS' || !x.c.origem; });
    return '<div class="row"><p class="muted">Preços usados no registro rápido da OS (aba “Catálogo OS”).</p>' + botao('+ Novo preço', 'cos-editar', '', '') + '</div>' +
      (CAT ? lista(l, function (x) { return card(e(x.c.descricao), e(x.c.categoria || '') + ' · ' + precoTxt(x.c) + (x.c.fonte ? '<br>' + e(x.c.fonte) : ''), '', botao('Editar', 'cos-editar', String(x.k))); }, 'Catálogo OS vazio.') : '<div class="vazio">Carregando o catálogo…</div>');
  }

  // ---------- v0.7.0: Clientes 360 (ficha, LGPD, linha do tempo, máquinas), checklist, laudo, garantia, link da OS, contratos/visitas, painel do mês ----------
  var Dif = window.ProFixDif, FICHA = { nome: '', dados: null, estado: '' }, PRE_OSM = null, CT = null, RM = { mes: '', dados: null };
  F.cli.chip = F.cli.chip || '';
  // v0.9.3: a ficha (fichaCliente) é relida de novo quando o CRM confirmar a escrita (a gravação vai em 2º plano).
  function escreverFicha(acao, args, local) { FICHA.nome = ''; return escrever(acao, args, local, { aoConfirmar: function () { FICHA.nome = ''; renderSuave(); } }); }
  function telLink(c) { var n = V.numeroWa(c && c.whatsapp); return n && !Dif.naoContatar(c) ? 'tel:+' + n : ''; }
  function attrReg(c, tipo, texto, os) { return api.pode('registrarMensagemAberta') && c ? ' data-reg-nome="' + e(c.nome) + '" data-reg-tipo="' + e(tipo || '') + '" data-reg-texto="' + e(texto || '') + '" data-reg-os="' + e(os || '') + '"' : ''; }
  /** Contrato: registrarMensagemAberta quando o wa.me é aberto (só registra; não envia nada). */
  function registrarAberta(a) {
    var d = a.dataset; if (!d.regNome || !api.pode('registrarMensagemAberta')) return;
    var cli = (D.clientes || []).filter(function (k) { return k.nome === d.regNome; })[0]; if (cli) cli.ultimo = D.hoje;
    FICHA.nome = '';
    api.escrever('registrarMensagemAberta', [{ nome: d.regNome, os: d.regOs || '', tipo: d.regTipo || 'mensagem', texto: d.regTexto || '' }],
      function (cache) { (cache.clientes || []).forEach(function (k) { if (k.nome === d.regNome) k.ultimo = cache.hoje || D.hoje; }); })
      .then(function (r) { aviso(r.enfileirado ? 'Mensagem aberta: registro guardado para enviar quando voltar a internet.' : 'Mensagem aberta registrada no histórico do cliente.'); }, function () { /* registro é opcional */ });
  }
  /** Modal com o texto pronto e o botão wa.me (o envio é sempre manual, no WhatsApp). */
  function abrirMsg(p) {
    var m = $('modal');
    var emailOk = !!(p.emailOk && p.cliente && api.pode('enviarEmailCliente') && V.podeEmailCliente(p.cliente) && !Dif.naoContatar(p.cliente));
    m.innerHTML = '<form method="dialog" class="detalhe" id="fMsgPronta"><h2 style="margin:0">' + e(p.titulo) + '</h2>' + (p.aviso ? '<p class="alerta" id="msgAviso">' + e(p.aviso) + '</p>' : '') +
      (p.texto ? '<div class="pre msg-texto" id="msgTexto">' + e(p.texto) + '</div>' : '') +
      (p.link ? '<div><span class="muted">Link de acompanhamento:</span><br><a id="msgLink" href="' + e(p.link) + '" target="_blank" rel="noopener">' + e(p.link) + '</a></div><div class="grandes"><button type="button" class="btn sec" id="bCopiar">📋 Copiar link</button><a class="btn sec" target="_blank" rel="noopener" href="' + e(p.link) + '">🔗 Abrir</a></div>' : '') +
      '<div class="grandes">' + (p.waUrl ? '<a class="btn wa" id="msgWa" target="_blank" rel="noopener" href="' + e(p.waUrl) + '"' + attrReg(p.cliente, p.tipo, p.texto, p.os) + '>📲 Abrir no WhatsApp</a>' : '<span class="muted" id="msgSemWa">' + e(p.semWa || 'WhatsApp não pode ser aberto para este cliente.') + '</span>') +
      (p.texto ? '<button type="button" class="btn sec" id="bCopiarTxt">📋 Copiar</button>' : '') +
      (p.pix ? '<button type="button" class="btn sec" id="bCopiarPix">📋 Copiar Pix</button>' : '') +
      (emailOk ? '<button type="button" class="btn sec" id="bEmailMsg">✉️ Enviar por e-mail</button>' : '') +
      '<button class="btn sec" value="fechar">Fechar</button></div><p class="muted">O app só abre o WhatsApp/e-mail com o texto pronto: quem envia é você. Nunca ofereça brinde ou desconto em troca de avaliação.</p></form>';
    m.onclose = null; m.showModal();
    if ($('msgWa')) $('msgWa').addEventListener('click', function () { registrarAberta(this); setTimeout(function () { m.close(''); }, 0); });
    if ($('bCopiar')) $('bCopiar').onclick = function () { var t = p.link; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { aviso('Link copiado.'); }, function () { P.pedirTexto('Não deu para copiar sozinho. Toque e segure no link abaixo para copiar.', { titulo: 'Copiar link', valor: t, somenteLeitura: true, sim: 'Fechar', nao: false }); }); };
    if ($('bCopiarPix')) $('bCopiarPix').onclick = function () { copiarTexto(p.pix, 'Pix copia e cola copiado.'); };
    if ($('bCopiarTxt')) $('bCopiarTxt').onclick = function () {
      var txt = p.texto || '';
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { aviso('Texto copiado.'); }, function () { aviso('Não deu para copiar: selecione o texto.'); });
    };
    if ($('bEmailMsg')) $('bEmailMsg').onclick = function () {
      if (typeof p.onEmail === 'function') return p.onEmail(p.texto || '');
      emailMsgLivre(p.cliente, p.osObj || null, p.assuntoEmail || ('ProFix — ' + (p.titulo || 'Mensagem')), p.texto || '');
    };
  }
  /** E-mail API @109: { clienteId?, os?, assunto, corpo, refId? } + idOperacao (api.js). Confirmação + cota. */
  function emailMsgLivre(c, o, assunto, corpo) {
    if (!c) return aviso('Cliente não encontrado.');
    if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
    if (!api.pode('enviarEmailCliente')) return aviso('Enviar e-mail ainda não foi liberado no servidor.');
    if (!V.podeEmailCliente(c)) return aviso('Para enviar e-mail: cadastre o e-mail e marque o consentimento de atendimento.');
    var cota = D.cotaEmail == null ? 'não informada' : String(D.cotaEmail);
    var p = formulario('✉️ Enviar por e-mail', [{ k: 'assunto', r: 'Assunto', req: true }, { k: 'corpo', r: 'Texto (pode editar)', t: 'textarea', req: true }],
      { assunto: assunto || 'ProFix Computadores', corpo: corpo || '' },
      '<div class="muted">Para: <b>' + e(c.email) + '</b> · cota restante hoje: <b id="emCotaMsg">' + e(cota) + '</b><br>Confirme antes de enviar. O servidor acrescenta o rodapé de atendimento (opt-out). Sem brinde/desconto por avaliação.</div>');
    if ($('c_corpo')) $('c_corpo').rows = 12;
    if ($('fSalvar')) $('fSalvar').textContent = 'Enviar e-mail';
    p.then(function (v) {
      if (!v) return;
      perguntar('Enviar e-mail para ' + c.email + ' agora?', { titulo: 'Confirmar e-mail', sim: 'Enviar', nao: 'Cancelar' }).then(function (ok) {
        if (!ok) return;
        var args = { assunto: v.assunto, corpo: v.corpo, refId: o && o.num ? o.num : '', rodape: 'atendimento' };
        if (o && o.num) args.os = o.num;
        if (c.id) args.clienteId = c.id;
        api.escrever('enviarEmailCliente', [args]).then(function (r) {
          var dados = (r && r.dados) || r || {};
          if (dados.restanteCota != null && D) D.cotaEmail = dados.restanteCota;
          aviso((dados.aviso ? dados.aviso + ' ' : 'E-mail enviado. ') + (dados.restanteCota != null ? 'Cota restante hoje: ' + dados.restanteCota + '.' : ''));
          atualizarFundo(); // v0.9.3: conversa registrada pelo CRM chega em 2º plano
        }, function (er) {
          aviso(amigavelEmailErro(er && er.message));
        });
      });
    });
  }
  function amigavelEmailErro(msg) {
    msg = String(msg || 'Não foi possível enviar.');
    if (/Não contatar/i.test(msg)) return 'Este cliente pediu para não receber mensagens. E-mail não enviado.';
    if (/consentimento/i.test(msg)) return 'Sem consentimento LGPD “Sim”: e-mail não enviado.';
    if (/e-mail válido|sem e-mail/i.test(msg)) return 'Cadastre um e-mail válido na ficha do cliente.';
    if (/Cota diária|esgotada/i.test(msg)) return 'Cota diária de e-mails esgotada. Tente amanhã.';
    if (/outro cliente/i.test(msg)) return 'Esta OS é de outro cliente: e-mail não enviado.';
    if (/OS não encontrada/i.test(msg)) return 'OS não encontrada. Atualize e tente de novo.';
    if (/Informe o cliente|clienteId|OS/i.test(msg)) return 'Escolha o cliente ou a OS para enviar o e-mail.';
    return 'Não deu para enviar o e-mail: ' + msg;
  }
  function lerOuAviso(acao, args) { if (!api.pode(acao)) { aviso('Esta função ainda não foi liberada no servidor (crm-v3).'); return Promise.reject(new Error('bloq')); } return api.ler(acao, args).catch(function (er) { aviso('Não deu: ' + er.message + (offline ? ' (sem internet)' : '')); throw er; }); }
  function escreverResp(acao, args) { if (!api.pode(acao)) { aviso('Esta função ainda não foi liberada no servidor (crm-v3).'); return Promise.reject(new Error('bloq')); } return api.escrever(acao, args).then(function (r) { return r.dados || r; }).catch(function (er) { aviso('Não deu: ' + er.message); throw er; }); }

  // ---- Lista de clientes: busca única + chips + cartão com última OS, total gasto e tempo desde o último atendimento ----
  function cartaoCliente(c, s) {
    var inter = (D.interacoes || []).filter(function (i) { return i.cliente === c.nome; }).slice(-1)[0], selo = Dif.seloLgpd(c);
    var ult = s.ultimaOSNum ? '<span class="ult-os">Última OS: <b>' + e(s.ultimaOSNum) + '</b> ' + tag(s.ultimaOSStatus, Dif.corStatus(s.ultimaOSStatus)) + '</span>' : '<span class="muted">Sem OS</span>';
    return card('<a class="nome-cli" href="#cliente/' + c._row + '">' + e(c.nome) + '</a>',
      ult + '<div class="nums-cli"><span>💰 ' + V.brl(s.totalGasto || 0) + '</span><span data-tempo>🕒 ' + e(Dif.tempoDesde(s.diasSemRetorno)) + '</span>' + (s.garantiaAte ? '<span>🛡 garantia ' + Dif.diasRestantes(s.garantiaAte, D.hoje) + 'd</span>' : '') + '</div>' +
      e(c.bairro || '') + ' · ' + e(c.origem || 'origem?') + (c.indicadoPor ? ' · indicado por ' + e(c.indicadoPor) : '') + (c.proximo ? '<br>⏰ ' + V.dataBR(c.proximo) + ' ' + e(c.acao || '') : '') + (inter ? '<br>Última conversa: ' + V.dataBR(inter.data) + ' – ' + e(inter.resumo) : ''),
      tag(c.etapa) + (selo.chave === 'sim' ? '' : tag(selo.chave === 'bloq' ? 'não contatar' : 'sem consentimento', selo.cls)) + (Dif.aniversariante(c, D.hoje) ? tag('🎂 ' + c.aniversario, 'roxo') : ''),
      botao('📇 Ficha', 'cli-ficha', c._row, '') + waCli(c, '', '', c.acao) + emailBtn(c, 'em-cli', c._row) + mapsBtn(c.endereco) + botao('Editar', 'cli-editar', c._row) + botao('Registrar conversa', 'cli-inter', c._row) + botao('Mover etapa', 'cli-etapa', c._row), ' data-cli="' + c._row + '"');
  }
  function telaClientesLista(cab) {
    var R = Dif.resumoClientes(D), cont = Dif.contarChips(D, R), l = Dif.filtrarClientes(D, F.cli, R);
    var chips = '<div class="chips" id="fCliChips" role="group" aria-label="Filtrar clientes">' + Dif.CHIPS.map(function (k) { return '<button type="button" class="chip" data-chip-cli="' + k[0] + '" aria-pressed="' + ((F.cli.chip || '') === k[0]) + '">' + e(k[1]) + ' (' + cont[k[0]] + ')</button>'; }).join('') + '</div>';
    return cab + '<div class="filtros">' + busca('fCliQ', F.cli.q, 'Buscar nome, telefone, OS, equipamento, série…') + '</div>' + chips + '<p class="muted" id="contagem">' + l.length + ' clientes</p>' +
      lista(l, function (c) { return cartaoCliente(c, R[c.nome] || {}); }, 'Nenhum cliente com esse filtro.');
  }

  // ---- Ficha do cliente (#cliente/<linha>) ----
  function carregarFicha(c) {
    FICHA = { nome: c.nome, dados: null, estado: 'carregando' };
    if (!api.pode('fichaCliente')) { FICHA.estado = 'local'; return; }
    var alvo = FICHA;
    api.ler('fichaCliente', [{ nome: c.nome }]).then(function (f) { if (FICHA !== alvo) return; FICHA.dados = f; FICHA.estado = 'ok'; if (rota().tela === 'cliente') render(); },
      function () { if (FICHA !== alvo) return; FICHA.estado = 'local'; if (rota().tela === 'cliente') render(); });
  }
  function tile(rot, v, id) { return '<div class="tile"' + (id ? ' id="' + id + '"' : '') + '><span class="muted">' + rot + '</span><b>' + v + '</b></div>'; }
  function telaFicha(row) {
    var c = achar('clientes', row);
    if (!c) return '<div class="row"><a href="#clientes" class="btn sec peq">← Clientes</a></div><div class="vazio">Cliente não encontrado (a lista pode ter mudado).</div>';
    if (FICHA.nome !== c.nome) carregarFicha(c);
    var f = FICHA.dados || Dif.fichaLocal(D, c.nome), nu = f.numeros || {}, selo = Dif.seloLgpd(c), R = Dif.resumoClientes(D)[c.nome] || {};
    var gar = (f.garantias || []).filter(function (g) { return g.ativa !== false && Dif.diasRestantes(g.ate, D.hoje) >= 0; });
    var tipoWa = nu.nOS || nu.osAberta ? 'os' : 'marketing', tel = telLink(c), mk = Dif.regraContato(c, 'marketing');
    var h = '<div class="row"><a href="#clientes" class="btn sec peq">← Clientes</a>' + (FICHA.estado === 'carregando' ? '<span class="muted">atualizando…</span>' : FICHA.estado === 'local' ? '<span class="muted">prévia do aparelho</span>' : '') + '</div>' +
      '<div class="ficha-topo"><div class="avatar" aria-hidden="true">' + e(c.nome.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('')) + '</div><div><h1 id="fichaNome">' + e(c.nome) + '</h1>' +
      '<div class="muted">' + [c.id, c.tipoCli, nu.situacao, f.origem || c.origem].filter(Boolean).map(e).join(' · ') + '</div>' +
      '<div><span class="tag ' + selo.cls + '" id="seloLgpd">' + e(selo.texto) + '</span>' + (gar.length ? tag('🛡 Garantia até ' + Dif.dataBR(gar[0].ate) + ' · faltam ' + Dif.diasRestantes(gar[0].ate, D.hoje) + ' dias', 'ok') : '') + (Dif.aniversariante(c, D.hoje) ? tag('🎂 Aniversário ' + c.aniversario, 'roxo') : '') + '</div></div></div>' +
      '<div class="grandes" id="acoesFicha">' + waCli(c, '', tipoWa).replace('btn wa peq', 'btn wa') + (tel ? '<a class="btn sec" id="bLigar" href="' + e(tel) + '">📞 Ligar</a>' : '<span class="muted">Sem telefone para ligar.</span>') +
      botao('🧾 Nova OS', 'cli-os', c._row, 'primaria').replace(' peq', '') + botao('💬 Mensagens', 'cli-msgs', c._row, 'sec').replace(' peq', '') + (api.pode('salvarVisita') ? botao('🚗 Marcar visita', 'cli-visita', c._row, 'sec').replace(' peq', '') : '') + (api.pode('salvarOSMulti') ? botao('💻 Usar equipamentos marcados', 'cli-osm', c._row, 'sec').replace(' peq', '') : '') + '</div>' +
      '<div class="acoes">' + botao('💬 Mensagens', 'cli-msgs', c._row, '') + (api.pode('salvarVisita') ? botao('🚗 Marcar visita', 'cli-visita', c._row, '') : '') + botao('📅 Agendar retorno', 'cli-retorno', c._row) + botao('Registrar conversa', 'cli-inter', c._row) + botao('Editar', 'cli-editar', c._row) +
      (selo.chave === 'sim' ? botao('🛡 Revogar consentimento', 'cli-lgpd', c._row) : selo.chave === 'nao' ? botao('🛡 Registrar consentimento', 'cli-lgpd', c._row, '') : '') + (api.pode('excluirRegistro') ? botao('🗑 Excluir', 'cli-excluir', c._row, 'perigo') : '') + '</div>' +
      (c.proximo ? '<p id="proxRetorno">⏰ Retorno: <b>' + V.dataBR(c.proximo) + '</b> ' + e(c.acao || '') + '</p>' : '') +
      '<div class="tiles">' + tile('Total gasto', V.brl(nu.totalGasto || 0), 'tTotal') + tile('Nº de OS', nu.nOS || 0) + tile('Ticket médio', V.brl(nu.ticketMedio || 0)) + tile('Lucro', V.brl(nu.lucro || 0)) +
      tile('Último atendimento', e(Dif.tempoDesde(R.diasSemRetorno)), 'tDesde') + tile('Garantia até', nu.garantiaAte ? Dif.dataBR(nu.garantiaAte) : '—') + tile('Preventiva em', nu.preventivaEm ? Dif.dataBR(nu.preventivaEm) : '—') + tile('Indicou', (f.indicou || []).length) + '</div>' +
      '<h2>💬 Mensagens de relacionamento</h2>' + (mk.pode ? '<div class="acoes" id="mktFicha">' + [['reativacao', '👋 Reativação'], ['aniversario', '🎂 Aniversário'], ['preventiva', '🧽 Preventiva'], ['indicacao', '🤝 Indicação']].map(function (t) { return botao(t[1], 'cli-mkt', c._row + '|' + t[0]); }).join('') + '</div>'
        : '<p class="muted" id="mktOculto">' + e(mk.aviso) + '</p>') +
      '<h2>💻 Equipamentos salvos (' + (f.maquinas || []).length + ')</h2>' + ((f.maquinas || []).length ? '<div class="lista-maq">' + f.maquinas.map(function (m) { return '<label class="chk maq"><input type="checkbox" data-maq="' + e(m.id) + '"> <b>' + e(m.id) + '</b> ' + e([m.tipo, m.modelo].filter(Boolean).join(' · ')) + (m.serie ? ' <span class="muted">série ' + e(m.serie) + '</span>' : '') + '</label>'; }).join('') + '</div><p class="muted">Marque e toque em “Usar equipamentos marcados” para levar as máquinas para a OS.</p>' : '<p class="muted">Nenhum equipamento salvo.</p>') +
      '<div class="acoes">' + (api.pode('salvarMaquina') ? botao('+ Salvar equipamento', 'cli-maq', c._row) : '') + '</div>' +
      '<h2>🧾 OS (' + (f.os || []).length + ')</h2>' + lista(f.os || [], function (o) { return card(e(o.num) + ' · ' + e(o.equipamento || ''), V.dataBR(o.entrada) + (o.valor ? ' · ' + V.brl(o.valor) : o.orcamento ? ' · orçamento ' + V.brl(o.orcamento) : ''), tag(Dif.statusCanon(o.status), Dif.corStatus(o.status)), o._row ? botao('Abrir', 'os-abrir', o._row, '') : ''); }, 'Nenhuma OS.') +
      (f.contrato ? '<p>📄 Contrato ' + e(f.contrato.id) + ' · ' + e(f.contrato.plano || '') + ' · ' + V.brl(f.contrato.valor) + '/mês</p>' : '') +
      '<h2>🕒 Linha do tempo</h2>' + linhaTempoHtml(Dif.linhaDoTempo(f, D.hoje));
    return h;
  }
  function linhaTempoHtml(ev) {
    if (!ev.length) return '<div class="vazio">Nada registrado ainda.</div>';
    return '<ol class="tl" id="linhaTempo">' + ev.slice(0, 80).map(function (x) { return '<li class="tl-' + x.tipo + '"><span class="muted">' + e(Dif.dataBR(x.quando) + (x.quando.length > 10 ? ' ' + x.quando.slice(11, 16) : '')) + (x.os ? ' · ' + e(x.os) : '') + '</span><br><b>' + e(x.titulo) + '</b>' + (x.detalhe ? ' – ' + e(x.detalhe) : '') + '</li>'; }).join('') + '</ol>';
  }
  TELAS.cliente = telaFicha;
  ACOES['cli-ficha'] = function (row) { location.hash = '#cliente/' + row; };
  ACOES['cli-os'] = function (row) { var c = achar('clientes', row); ACOES['os-editar']('', { cliente: c.nome, _rowCliente: c._row }); };
  ACOES['cli-osm'] = function (row) {
    var c = achar('clientes', row), f = FICHA.nome === c.nome && FICHA.dados ? FICHA.dados : { maquinas: [] }, marc = {};
    document.querySelectorAll('[data-maq]:checked').forEach(function (i) { marc[i.dataset.maq] = 1; });
    var eqs = (f.maquinas || []).filter(function (m) { return marc[m.id]; }).map(function (m, i) { return Dif.maquinaParaOS(m, i + 1); });
    PRE_OSM = { cliente: c.nome, equipamentos: eqs }; OSM = null; location.hash = '#osm';
  };
  ACOES['cli-retorno'] = function (row) {
    var c = achar('clientes', row);
    formulario('📅 Agendar retorno – ' + e(c.nome), [{ k: 'data', r: 'Quando', t: 'date', req: true }, { k: 'acao', r: 'O que fazer' }], { data: Dif.somaDias(D.hoje, 7), acao: c.acao || 'Retorno' },
      '<div class="chips" id="atalhosRetorno">' + [[1, 'Amanhã'], [7, '7 dias'], [30, '30 dias'], [90, '90 dias']].map(function (x) { return '<button type="button" class="chip" data-dias="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>')
      .then(function (v) { if (!v) return; var x = { nome: c.nome, data: v.data, acao: v.acao || 'Retorno' };
        if (api.pode('agendarRetorno')) escreverFicha('agendarRetorno', [x], aplicar('clientes', row, { proximo: x.data, acao: x.acao }));
        else escreverFicha('salvarCliente', [{ _row: c._row, _nomeOriginal: c.nome, nome: c.nome, proximo: x.data, acao: x.acao }], aplicar('clientes', row, { proximo: x.data, acao: x.acao })); });
    document.querySelectorAll('#atalhosRetorno [data-dias]').forEach(function (b) { b.onclick = function () { $('c_data').value = Dif.somaDias(D.hoje, +b.dataset.dias); }; });
  };
  // v0.7.1: registrarConsentimento {cliente, aceita} (API @43): grava Sim/Não + data e registra na linha do tempo.
  // Sem internet: vai para a fila e o aparelho já mostra o novo selo. Servidor antigo (sem a ação): salvarCliente + registrarInteracao.
  ACOES['cli-lgpd'] = function (row) {
    var c = achar('clientes', row), dar = c.consent !== 'Sim';
    perguntar(dar ? 'Registrar que ' + c.nome + ' AUTORIZOU receber mensagens da ProFix (LGPD)?' : 'Revogar o consentimento de ' + c.nome + '? Mensagens de marketing deixam de aparecer; as da OS continuam com aviso.', { titulo: 'Consentimento LGPD', sim: dar ? 'Sim, autorizou' : 'Revogar', perigo: !dar }).then(function (ok) { if (!ok) return;
    var mud = { consent: dar ? 'Sim' : 'Não', dataConsent: D.hoje }, rot = dar ? 'Consentimento registrado ✓' : 'Consentimento revogado ✓';
    FICHA.nome = '';
    // v0.9.3: na hora, pela fila (sem recarregar o App inteiro).
    if (api.pode('registrarConsentimento')) return escrever('registrarConsentimento', [{ cliente: c.nome, aceita: dar }], aplicar('clientes', row, mud), { salvo: rot });
    var d = { _row: c._row, _nomeOriginal: c.nome, nome: c.nome, consent: mud.consent }; if (dar) d.dataConsent = D.hoje;
    escrever('salvarCliente', [d], aplicar('clientes', row, mud), { salvo: rot }).then(function () {
      return api.enviar('registrarInteracao', [{ cliente: c.nome, _rowCliente: c._row, canal: 'Presencial', resumo: dar ? 'Consentimento LGPD registrado (cliente autorizou contato)' : 'Consentimento LGPD revogado a pedido do cliente' }], null, { recarregar: true });
    });
    });
  };
  ACOES['cli-maq'] = function (row) {
    var c = achar('clientes', row);
    formulario('+ Equipamento de ' + e(c.nome), [{ k: 'tipo', r: 'Tipo', t: 'select', o: TIPOS_EQ, req: true }, { k: 'modelo', r: 'Marca / modelo' }, { k: 'serie', r: 'Nº de série' }, { k: 'obs', r: 'Observações', t: 'textarea' }], { tipo: 'Notebook' })
      .then(function (v) { if (!v) return; escreverFicha('salvarMaquina', [Object.assign({ cliente: c.nome }, v)]); });
  };
  ACOES['cli-mkt'] = function (k) {
    var p = String(k).split('|'), c = achar('clientes', p[0]), rot = { reativacao: 'Reativação', aniversario: 'Aniversário', preventiva: 'Preventiva', indicacao: 'Indicação' }[p[1]];
    if (!Dif.regraContato(c, 'marketing').pode) return aviso(Dif.regraContato(c, 'marketing').aviso);
    lerOuAviso('textoMarketing', [{ nome: c.nome, tipo: p[1] }]).then(function (r) {
      abrirMsg({ titulo: '💬 ' + rot + ' – ' + c.nome, texto: r.texto, aviso: r.aviso, waUrl: r.podeAbrir ? r.waUrl : '', semWa: r.aviso, cliente: c, tipo: p[1] });
    }, function () {});
  };

  // ---- OS: checklist, laudo, garantia, link de acompanhamento e mensagem de status ----
  function blocoGarantiaOS(o) {
    var g = Dif.garantiasDaOS(o, D.hoje, Dif.padroes(D).garantiaDias)[0]; if (!g) return '';
    return '<div id="garantiaOS">' + (g.restam >= 0 ? tag('🛡 Garantia ' + g.dias + ' dias · até ' + Dif.dataBR(g.ate) + ' · faltam ' + g.restam + (g.restam === 1 ? ' dia' : ' dias'), 'ok') : tag('Garantia vencida em ' + Dif.dataBR(g.ate), 'vencido')) +
      '<p class="muted" id="garantiaRecibo">' + e(textoGarantiaRecibo()) + '</p></div>';
  }
  /** Texto de garantia do recibo: garantia legal (CDC, 90 dias) + Garantia ProFix (dias vindos do servidor, hoje 30). */
  function textoGarantiaRecibo() { var gd = Dif.padroes(D).garantiaDias; return 'Garantia legal de 90 dias (CDC).' + (gd ? ' Garantia ProFix de ' + gd + ' dias a partir da entrega.' : ''); }
  /** Preço da tabela: só mão de obra; sem valor = "sob orçamento". */
  function precoTxt(c) { return c.valor === '' || c.valor == null || /sob or/i.test(c.tipoPreco || '') ? 'sob orçamento' : O.brl(c.valor) + (/pe[çc]a n[ãa]o inclusa/i.test(c.descricao || '') ? ' (mão de obra)' : ''); }
  /** Valor da visita técnica à empresa, do catálogo (tabela do servidor). Nada fixo no código. */
  function txtVisita() { var v = (CAT || []).filter(function (c) { return /visita t[ée]cnica/i.test(c.descricao || '') && c.valor !== '' && c.valor != null; })[0]; return 'Visita técnica à parte' + (v ? ': ' + O.brl(v.valor) : ' (valor no Catálogo OS)') + '.'; }
  function botoesDifOS(o) {
    return '<div class="grandes" id="acoesDifOS">' + (api.pode('salvarChecklistOS') ? botao('✅ Checklist', 'os-chk', o._row, '').replace(' peq', '') : '') +
      (api.pode('textoStatusOS') ? botao('📲 Avisar status', 'os-msg', o._row, 'sec').replace(' peq', '') : '') +
      (api.pode('linkClienteOS') ? botao('🔗 Link de acompanhamento', 'os-link', o._row, 'sec').replace(' peq', '') : '') +
      (api.pode('laudoTecnicoOS') ? botao('📄 Laudo técnico', 'os-laudo', o._row, 'sec').replace(' peq', '') : '') + botaoAvaliar(o) + '</div>';
  }
  ACOES['os-chk'] = function (row) {
    var o = achar('os', row), m = $('modal'), mom0 = ['Pronto', 'Entregue'].indexOf(Dif.statusCanon(o.status)) >= 0 ? 'Saída' : 'Entrada';
    var grupo = function (nome, rot, ops, v) { return '<fieldset class="opcoes"><legend>' + e(rot) + '</legend>' + ops.map(function (x) { return '<label><input type="radio" name="' + nome + '" value="' + e(x) + '"' + (x === v ? ' checked' : '') + '><span>' + e(x) + '</span></label>'; }).join('') + '</fieldset>'; };
    m.innerHTML = '<form method="dialog" id="fChk" class="detalhe"><h2 style="margin:0">✅ Checklist · ' + e(o.num) + '</h2><p class="muted" id="chkExtras">' + e(o.cliente) + ' · ' + e(o.equipamento || '') + '</p>' +
      grupo('momento', 'Momento', ['Entrada', 'Saída'], mom0) + Dif.CHK_ITENS.map(function (k, i) { return grupo('it' + i, k, Dif.CHK_RESULT, 'OK'); }).join('') +
      grupo('senhaInformada', 'Cliente informou a senha?', ['Sim', 'Não'], '') + grupo('bitlocker', 'BitLocker ativo?', ['Sim', 'Não'], '') +
      '<div><label for="chkObs">Observações</label><textarea id="chkObs" rows="2"></textarea></div><p class="muted">A senha em si nunca é gravada no checklist (só “informada: Sim/Não”).</p><p class="erro" id="fErro"></p>' +
      '<div class="grandes"><button class="btn" value="ok" id="chkSalvar">Salvar checklist</button><button class="btn sec" value="cancelar" formnovalidate>Cancelar</button></div></form>';
    var val = function (n) { var r = m.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ''; };
    $('chkSalvar').onclick = function (ev) {
      var x = { num: o.num, _row: o._row, momento: val('momento'), itens: {}, senhaInformada: val('senhaInformada'), bitlocker: val('bitlocker'), obs: $('chkObs').value.trim() };
      Dif.CHK_ITENS.forEach(function (k, i) { x.itens[k] = val('it' + i); });
      try { Dif.validarChecklist(x); } catch (er) { ev.preventDefault(); $('fErro').textContent = er.message; return; }
      m.onclose = function () { m.onclose = null; FICHA.nome = ''; escrever('salvarChecklistOS', [x]); };
    };
    m.onclose = null; m.returnValue = ''; m.showModal();
    if (api.pode('extrasOS')) api.ler('extrasOS', [{ num: o.num, _row: o._row }]).then(function (r) {
      var el = $('chkExtras'); if (!el || !r) return; var feitos = (r.checklists || []).map(function (c) { return c.momento; });
      el.textContent = o.cliente + ' · já feito: ' + (feitos.join(', ') || 'nenhum') + ((r.pendenciasEntrega || []).length ? ' · falta para entregar: ' + r.pendenciasEntrega.join(', ') : '');
    }, function () {});
  };
  ACOES['os-laudo'] = function (row) {
    var o = achar('os', row);
    lerOuAviso('laudoTecnicoOS', [{ num: o.num, _row: o._row }]).then(function (r) {
      var m = $('modal');
      m.innerHTML = '<form method="dialog" class="detalhe laudo"><h2 style="margin:0">📄 Laudo técnico · ' + e(o.num) + '</h2><iframe id="laudoFrame" title="Laudo técnico" sandbox="allow-same-origin allow-modals"></iframe>' +
        '<div class="grandes"><button type="button" class="btn" id="bImprLaudo">🖨️ Imprimir / PDF</button><button class="btn sec" value="fechar">Fechar</button></div></form>';
      $('laudoFrame').srcdoc = r.html || ''; m.onclose = null; m.showModal();
      $('bImprLaudo').onclick = function () { try { $('laudoFrame').contentWindow.print(); } catch (x) { aviso('Não deu para imprimir neste aparelho.'); } };
    }, function () {});
  };
  /** v0.9.0: antes de mandar orçamento ou link: validade vencida -> oferece renovar (padrão do servidor); Recebido/Em diagnóstico com
   *  orçamento salvo -> Aguardando aprovação (senão o link do cliente não mostra Aprovar/Recusar). Nada é enviado aqui. Nunca rejeita. */
  function prepararEnvioOrc(o) {
    if (!o || !o.num) return Promise.resolve(o);
    var dias = Dif.padroes(D).validadeDias || 7, p = Promise.resolve();
    if (V.orcamentoVencido(o, D.hoje)) {
      var nova = V.somaDias(D.hoje, dias);
      p = perguntar('Este orçamento venceu em ' + V.dataBR(o.validade) + ', atualize a validade. Renovar por ' + dias + ' dias (até ' + V.dataBR(nova) + ')?', { titulo: 'Orçamento vencido', sim: 'Renovar validade', nao: 'Seguir sem renovar' }).then(function (ok) {
        if (!ok) return;
        if (!api.pode('salvarValidadeOS')) return aviso('Renovar a validade ainda não está liberado no servidor: ajuste em ⚡ Orçamento.');
        return api.escrever('salvarValidadeOS', [{ num: o.num, _row: o._row, escolha: '' }], aplicar('os', o._row, { validade: nova })).then(function (r) {
          o.validade = (r.dados && r.dados.validade) || nova; aviso(r.enfileirado ? 'Validade renovada no aparelho (envio quando voltar a internet).' : (r.msg || 'Validade renovada.'));
        }, function (er) { aviso('Validade não renovada: ' + er.message); });
      });
    }
    return p.then(function () {
      if (!V.deveMarcarAguardando(o) || !api.pode('mudarStatusOS')) return;
      return api.escrever('mudarStatusOS', [o.num, o._row, 'Aguardando aprovação', {}], aplicar('os', o._row, { status: 'Aguardando aprovação', statusEm: D.hoje })).then(function () {
        o.status = 'Aguardando aprovação'; aviso(o.num + ' → Aguardando aprovação (o link do cliente mostra Aprovar/Recusar).');
      }, function (er) { aviso('Status não mudou: ' + er.message); });
    }).then(function () { return o; }, function () { return o; });
  }
  ACOES['os-link'] = function (row) {
    var o = achar('os', row), c = V.clienteDaOS(D, o);
    prepararEnvioOrc(o).then(function () { return escreverResp('linkClienteOS', [{ num: o.num, _row: o._row }]); }).then(function (r) {
      if (!Dif.linkAcompanhamentoOk(r.url)) aviso('Atenção: o link veio num formato inesperado.');
      abrirMsg({ titulo: '🔗 Acompanhamento da ' + o.num, link: r.url, texto: '', waUrl: '', semWa: 'Para mandar o link pelo WhatsApp, use “📲 Avisar status” (o texto já leva o link).', cliente: c, os: o.num });
    }, function () {});
  };
  ACOES['os-msg'] = function (row) {
    var o = achar('os', row), c = V.clienteDaOS(D, o);
    escreverResp('textoStatusOS', [{ num: o.num, _row: o._row }]).then(function (r) {
      // v0.9.2: o texto de status leva o link de acompanhamento/aprovação. Sem link real no texto: NÃO abre o WhatsApp.
      var linkOk = /^https:\/\/\S+$/.test(String(r.link || '')) && String(r.texto || '').indexOf(r.link) >= 0;
      // Pronto: entra o bloco Pix com o saldo (ou o valor, se nada foi pago).
      var pronto = Dif.statusCanon(r.status || o.status) === 'Pronto', vp = pronto ? V.valorPixMsg('os-pronto', { os: o, saldo: V.saldoOS(D, o), recebido: V.recebidoOS(D, o.num) }) : 0;
      var pb = pronto && vp > 0 ? blocoPix(vp, o.num) : null, texto = String(r.texto || '') + (pb ? '\n\n' + pb.texto : '');
      var tit = '📲 Status da ' + o.num + ' · ' + (r.status || o.status);
      if (!linkOk && !Dif.naoContatar(c)) {
        avisoSemLink({ os: o, cliente: c, titulo: tit, tipo: 'status', pix: pb ? pb.codigo : '', montar: function () { return texto; } }, new Error(r.link ? 'o texto veio sem o link' : 'o servidor não devolveu o link'));
        var bt = $('bTentarLink'); if (bt) bt.onclick = function () { $('modal').close(''); ACOES['os-msg'](row); };
        return;
      }
      // Regra do app vale por cima da resposta: "Não contatar" bloqueia; sem consentimento = serviço com aviso.
      var b = V.botaoWaCliente(c, 'os', texto), pode = !!(r.podeAbrir && r.waUrl && b);
      abrirMsg({ titulo: tit, texto: texto, pix: pb ? pb.codigo : '', aviso: r.aviso || (b && b.aviso ? Dif.regraContato(c, 'os').aviso : ''), waUrl: pode ? b.href : '', link: r.link,
        semWa: Dif.naoContatar(c) ? 'Cliente marcado como “Não contatar”.' : (r.aviso || 'WhatsApp inválido.'), cliente: c, os: o.num, tipo: 'status' });
    }, function () {});
  };

  // v0.8.0: templates por tipo de serviço + copiar texto/link (sempre wa.me manual; trava Não contatar).
  function abrirMsgServico(o) {
    var c = V.clienteDaOS(D, o) || { nome: o.cliente }, bloqNC = Dif.naoContatar(c);
    var m = $('modal');
    var ops = V.TIPOS_SERVICO_MSG.map(function (t) {
      return '<label class="chk"><input type="radio" name="tipoMsg" value="' + t.id + '"' + (t.id === 'formatacao' ? ' checked' : '') + '> ' + e(t.rotulo) + '</label>';
    }).join('');
    var texto0 = V.textoMsgServico('formatacao', o, c);
    m.innerHTML = '<form method="dialog" class="detalhe" id="fMsgServ"><h2 style="margin:0">Mensagem por tipo de serviço · ' + e(o.num) + '</h2>' +
      (bloqNC ? '<p class="alerta" id="msgNcBloq">' + e(V.AVISO_NAO_CONTATAR) + '</p>' : '') +
      '<div class="opcoes" id="tiposMsg">' + ops + '</div>' +
      '<label for="msgServTxt">Texto</label><textarea id="msgServTxt" rows="8">' + e(texto0) + '</textarea>' +
      '<div class="acoes">' +
      '<button type="button" class="btn sec" id="bCopiarTxt" ' + (bloqNC ? 'disabled' : '') + '>Copiar texto</button>' +
      '<button type="button" class="btn sec" id="bCopiarLink" ' + (bloqNC ? 'disabled' : '') + '>Copiar link</button>' +
      (bloqNC ? '' : '<a class="btn wa" id="bAbrirWa" target="_blank" rel="noopener" href="#">📲 Abrir WhatsApp</a>') +
      '<button type="submit" class="btn sec" value="cancel">Fechar</button></div>' +
      '<p class="muted">Só abre o WhatsApp com o texto pronto; quem envia é você. Não envia sozinho.</p></form>';
    m.showModal();
    var atualizar = function () {
      var id = (m.querySelector('input[name=tipoMsg]:checked') || {}).value || 'formatacao';
      var t = V.textoMsgServico(id, o, c); $('msgServTxt').value = t;
      if (!bloqNC) {
        var b = V.botaoWaCliente(c, 'os', t);
        $('bAbrirWa').href = b ? b.href : '#';
        $('bAbrirWa').toggleAttribute('hidden', !b);
      }
    };
    m.querySelectorAll('input[name=tipoMsg]').forEach(function (r) { r.onchange = atualizar; });
    $('msgServTxt').oninput = function () {
      if (bloqNC) return;
      var b = V.botaoWaCliente(c, 'os', $('msgServTxt').value);
      $('bAbrirWa').href = b ? b.href : '#';
    };
    atualizar();
    $('bCopiarTxt').onclick = function () {
      if (bloqNC) return aviso(V.AVISO_NAO_CONTATAR);
      var t = $('msgServTxt').value;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { aviso('Texto copiado.'); }, function () { aviso('Não deu para copiar: selecione o texto.'); });
    };
    $('bCopiarLink').onclick = function () {
      if (bloqNC) return aviso(V.AVISO_NAO_CONTATAR);
      var b = V.botaoWaCliente(c, 'os', $('msgServTxt').value);
      if (!b) return aviso('WhatsApp inválido ou bloqueado.');
      (navigator.clipboard ? navigator.clipboard.writeText(b.href) : Promise.reject()).then(function () { aviso('Link copiado.'); }, function () { aviso('Não deu para copiar o link.'); });
    };
  }
  ACOES['os-msg-tipo'] = function (row) { abrirMsgServico(achar('os', row)); };
  ACOES['os-termo'] = function (row) {
    var o = achar('os', row), c = V.clienteDaOS(D, o) || { nome: o.cliente }, t = V.textoTermoEntrada(o, c), m = $('modal');
    m.innerHTML = '<form method="dialog" class="detalhe"><h2 style="margin:0">Termo de entrada · ' + e(o.num) + '</h2>' +
      '<pre class="pre" id="termoTxt">' + e(t) + '</pre><div class="acoes">' +
      '<button type="button" class="btn sec" id="bCopiarTermo">Copiar texto</button>' +
      '<button type="submit" class="btn sec" value="cancel">Fechar</button></div>' +
      '<p class="muted">Resumo para a tela/PDF. Senha do aparelho: peça na hora e apague na entrega — sem histórico no cliente.</p></form>';
    m.showModal();
    $('bCopiarTermo').onclick = function () {
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { aviso('Termo copiado.'); }, function () { aviso('Não deu para copiar.'); });
    };
  };
  function abrirReativacao(c, aparelho, tipo) {
    if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
    var txt = V.textoReativacao(tipo || 'contato', c, aparelho);
    var b = V.botaoWaCliente(c, 'marketing', txt);
    abrirMsg({ titulo: 'Reativação (uma vez só) · ' + e(c.nome), texto: txt, aviso: 'Só uma vez. Se não responder, não mande de novo.', waUrl: b ? b.href : '', semWa: b ? '' : (c.consent !== 'Sim' ? 'Sem consentimento LGPD para marketing.' : 'WhatsApp inválido.'), cliente: c, tipo: 'marketing' });
  }
  ACOES['cli-reativar'] = function (row) {
    var c = achar('clientes', row);
    var tipo = (c.etapa === 'Orçamento enviado') ? 'orcamento' : 'contato';
    abrirReativacao(c, '', tipo);
  };
  ACOES['op-reativar'] = function (row) {
    var o = achar('oportunidades', row);
    if (V.bloqueadaOp(o)) return aviso(V.AVISO_NAO_CONTATAR);
    var txt = V.textoReativacao('contato', { nome: o.responsavel || o.empresa }, o.equipamento || 'equipamento');
    var l = V.linkWaOp(D.modelos, o);
    // Reativação usa texto próprio; se puder WA, monta wa.me direto.
    var n = V.numeroWa(o.whatsapp);
    var wa = (!V.bloqueadaOp(o) && n) ? V.urlWhats(n, txt) : '';
    var m = $('modal');
    m.innerHTML = '<form method="dialog" class="detalhe"><h2 style="margin:0">Reativação 1× · ' + e(o.empresa) + '</h2>' +
      '<p class="muted">Só uma vez. Se não responder, não mande de novo.</p>' +
      '<textarea id="reativarTxt" rows="6">' + e(txt) + '</textarea><div class="acoes">' +
      '<button type="button" class="btn sec" id="bCopiarReat">Copiar texto</button>' +
      (wa ? '<a class="btn wa" target="_blank" rel="noopener" href="' + e(wa) + '" id="bWaReat">📲 Abrir WhatsApp</a>' : '<span class="muted">WhatsApp bloqueado ou inválido.</span>') +
      '<button type="submit" class="btn sec" value="cancel">Fechar</button></div></form>';
    m.showModal();
    $('bCopiarReat').onclick = function () {
      var t = $('reativarTxt').value;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { aviso('Texto copiado.'); }, function () { aviso('Não deu para copiar.'); });
    };
    if ($('bWaReat')) $('reativarTxt').oninput = function () {
      var n2 = V.numeroWa(o.whatsapp); if (!n2) return;
      $('bWaReat').href = V.urlWhats(n2, $('reativarTxt').value);
    };
  };

  PRECISA['os-chk'] = 'salvarChecklistOS'; PRECISA['cli-maq'] = 'salvarMaquina';

  // Planos B2B — Financeiro 09/11/2026. Extra R$35; Pix/anual vêm do CRM (v0.8.4).
  var PLANOS = V.PLANOS_B2B;
  function planoOficial(nome) { return V.planoOficial(nome); }
  function frequenciaContrato(k) {
    if (k && k.visitas != null && k.visitas !== '') return Number(k.visitas) + ' visita(s)/mês';
    var p = planoOficial(k.plano); if (p) return p.visitas + ' visita(s)/mês';
    if (/a cada 2 meses|bimestral/i.test(k.obs || '')) return 'Visita a cada 2 meses (legado)';
    return 'Frequência a combinar';
  }
  function cardsPlanos() {
    var cont = V.contadoresPlanos((CT && CT.contratos) || []);
    return '<section id="planosOficiais" aria-label="Planos oficiais"><h2>Planos para empresas</h2><div class="planos-grade">' + PLANOS.map(function (p) {
      var c = cont[p.nome] || { ativos: 0, pcs: 0 };
      return '<article class="plano-oficial" data-plano="' + e(p.nome) + '"><h3>' + e(p.nome) + '</h3>' + (p.selo ? '<span class="plano-selo">Plano completo</span>' : '') +
        '<p>' + e(p.para) + ' ' + e(p.pcsTxt) + ' computadores.</p><div class="plano-preco">' + e(V.precoTxtPlano(p)) + '<small>/mês</small></div><strong class="plano-destaque">' + e(p.frequencia) + '</strong>' +
        '<ul><li>Visita preventiva no local, fora do horário comercial</li><li>Checagem de desempenho em cada visita</li><li><strong>Limpeza interna completa de cada máquina a cada ' + p.limpeza + ' meses</strong></li>' +
        '<li>' + e(p.suporte) + ' (sem promessa de prazo em horas)</li>' +
        '<li>Suporte por WhatsApp nos horários de atendimento</li><li>10% de desconto em serviços avulsos</li></ul>' +
        '<p class="plano-uso" data-plano-uso="' + e(p.nome) + '">' + c.ativos + ' empresa' + (c.ativos === 1 ? '' : 's') + ' ativa' + (c.ativos === 1 ? '' : 's') + '</p>' + botao('📄 Gerar proposta', 'pl-proposta', p.nome, '') + '</article>';
    }).join('') + '</div><p class="muted">Máquina extra: <b>' + e(V.brl(cfgPrecos().extra)) + '/PC/mês</b>. Desconto Pix: <b>' + e(String(cfgPrecos().pix)) + '%</b> (CRM; combos não somam). Contrato anual: <b>' + e(String(cfgPrecos().anual)) + '%</b>. Peças sempre à parte.</p>' +
      '<p class="muted">Pagamento mensal, por Pix e antecipado. Direito de arrependimento de 7 dias (CDC). Atendimento com hora marcada: seg a sex, das 19h às 22h; sáb e dom, das 9h às 17h. Sem promessa de prazo de resposta ou emergência.</p></section>';
  }
  // ---- Contratos e visitas técnicas (Mais > Visitas) ----
  function carregarCT() {
    if (carregarCT.indo) return; if (!api.pode('listaContratos')) { CT = (D.dif && D.dif.contratos) || { contratos: [], visitas: [] }; return; }
    carregarCT.indo = true;
    api.ler('listaContratos', CTX.comp ? [{ competencia: CTX.comp }] : []).then(function (r) { carregarCT.indo = false; CT = r || { contratos: [], visitas: [] }; if (['mais','hoje','cliente','servicos','agenda'].indexOf(rota().tela) >= 0) render(); },
      function () { carregarCT.indo = false; CT = (D.dif && D.dif.contratos) || { contratos: [], visitas: [], erro: true }; if (['mais','hoje','cliente','servicos','agenda'].indexOf(rota().tela) >= 0) render(); });
  }
  function telaVisitas() {
    if (!CT) { carregarCT(); return '<div class="vazio">Carregando contratos e visitas…</div>'; }
    carregarCatalogo(); var vs = CT.visitas || [], abertas = vs.filter(function (v) { return v.status !== 'Concluída'; });
    return '<div class="row">' + (api.pode('salvarVisita') ? botao('+ Visita', 'vis-nova', '', '') : '') + (api.pode('salvarContrato') ? botao('+ Contrato', 'ct-novo', '') : '') + '</div>' + (CT.erro ? '<p class="muted">Sem internet: mostrando a última cópia.</p>' : '') +
      '<h2>🚗 Visitas (' + abertas.length + ' abertas)</h2><p class="muted" id="visitaPreco">' + e(txtVisita()) + '</p>' + lista(vs, function (v) {
        var c = (D.clientes || []).filter(function (k) { return k.nome === v.cliente; })[0], end = c && c.endereco;
        var hora = V.horaVisita(v);
        return card(e(v.id) + ' · ' + e(v.cliente), V.dataBR(v.data) + (hora ? ' · ' + e(hora) : '') + (v.contrato ? ' · ' + e(v.contrato) : '') + (v.os ? ' · ' + e(v.os) : '') + (v.inicio ? '<br>Início real ' + e(String(v.inicio).slice(11, 16) || v.inicio) : '') + (v.status === 'Concluída' ? ' · ' + String(v.horas).replace('.', ',') + ' h · ' + e(v.km) + ' km' : ''),
          tag(v.prioridade, V.norm(v.prioridade) === 'urgente' ? 'vencido' : V.norm(v.prioridade)) + tag(v.status, v.status === 'Concluída' ? 'ok' : v.status === 'Em andamento' ? 'azul' : 'cinza'),
          (v.status === 'Agendada' && api.pode('iniciarVisita') ? botao('▶️ Iniciar visita', 'vis-ini', v.id, '') : '') + (v.status === 'Em andamento' && api.pode('encerrarVisita') ? botao('⏹ Encerrar visita', 'vis-fim', v.id, '') : '') +
          botoesMsgVisita(v) + (end ? mapsBtn(end) : '') + (c && telLink(c) ? '<a class="btn sec peq" href="' + e(telLink(c)) + '">📞 Ligar</a>' : '') + (c ? botao('📇 Ficha', 'cli-ficha', c._row) : ''), ' data-visita="' + e(v.id) + '"');
      }, 'Nenhuma visita.') +
      cardsPlanos() + listaQuemAssinou();
  }
  // ---- v0.8.8: Quem assinou (contratos com data inicial) e tela Agendamento (#agenda) ----
  // ---- v0.8.9: + cobrança do mês (pago / a vencer / vencido / fora), Receber e Informar dia — mesmo critério do painel do CRM ----
  F.ct = 'ativos'; F.ctSit = '';
  var CTX = { comp: '', retorno: '' }; // competência escolhida ('' = mês atual do CRM) e último retorno do Receber/Informar dia
  var TAG_SIT = { pago: 'ok', 'a vencer': 'azul', vencido: 'vencido', fora: 'cinza' };
  var ROT_SIT = { pago: '✅ Pago', 'a vencer': '⏳ A vencer', vencido: '⚠️ Vencido', fora: 'Fora da cobrança' };
  /** Atualiza só a lista de contratos (sem recarga completa do App). Mantém a cópia atual na tela até a resposta. */
  function recarregarCT() {
    if (!api.pode('listaContratos')) return Promise.resolve();
    return api.ler('listaContratos', CTX.comp ? [{ competencia: CTX.comp }] : []).then(function (r) { CT = r || CT; RM.mes = ''; if (['mais', 'hoje', 'cliente', 'servicos', 'agenda'].indexOf(rota().tela) >= 0) render(); }, function () {});
  }
  function resumoCobrancaHtml(todos) {
    var r = V.resumoCobranca(CT, CTX.comp || D.hoje.slice(0, 7)), cs = V.contagemSituacoes(todos);
    var chip = function (k, rot) { return '<button type="button" class="chip" data-chip-sit="' + e(k) + '" aria-pressed="' + (F.ctSit === k) + '">' + rot + '</button>'; };
    return '<div class="card" id="cobrancaResumo"><div class="t">💰 Mensalidades · ' + e(V.competenciaBR(r.competencia) || 'mês atual') +
      (r.vencidos ? ' ' + tag(r.vencidos + ' vencida' + (r.vencidos === 1 ? '' : 's'), 'vencido') : '') + '</div><div class="m">' +
      '<span data-cob="pagos">✅ Pagos: <b>' + r.pagos + '</b></span> · <span data-cob="aVencer">⏳ A vencer: <b>' + r.aVencer + '</b></span> · <span data-cob="vencidos">⚠️ Vencidos: <b>' + r.vencidos + '</b></span> · <span data-cob="fora">Fora: <b>' + r.fora + '</b></span>' +
      '<br><span data-cob="recebido">Recebido: <b>' + V.brl(r.recebido) + '</b></span> · <span data-cob="emAberto">Em aberto: <b>' + V.brl(r.emAberto) + '</b></span>' +
      '<br><label class="muted" for="fCompCT">Competência</label> <input type="month" id="fCompCT" value="' + e(CTX.comp || r.competencia || D.hoje.slice(0, 7)) + '" aria-label="Competência das mensalidades">' +
      '<br><span class="muted">Mesmo critério do painel do CRM. Nada é cobrado automaticamente: o mês só fica pago quando você toca em Receber.</span></div></div>' +
      '<div class="chips" id="fSituacao" role="group" aria-label="Filtrar pela situação do mês">' + chip('', 'Todas as situações') + chip('vencido', '⚠️ Vencidos (' + cs.vencido + ')') + chip('a vencer', '⏳ A vencer (' + cs['a vencer'] + ')') + chip('pago', '✅ Pagos (' + cs.pago + ')') + chip('fora', 'Fora (' + cs.fora + ')') + '</div>';
  }
  function linhaCobrancaCard(k) {
    var s = V.situacaoContrato(k), dia = V.temDiaContrato(k) ? Number(k.dia) : 0;
    return '<br><span class="ct-venc" data-ct-venc="' + e(k.id) + '">📅 Vencimento: <b>' + (dia ? 'todo dia ' + dia + (k.vencimento ? ' · ' + e(V.dataBR(k.vencimento)) : '') : 'não informado') + '</b></span>' +
      (k.forma ? ' <span class="muted">· ' + e(k.forma) + '</span>' : '') +
      '<br><span class="ct-sit" data-ct-sit="' + e(k.id) + '" data-sit="' + e(s) + '">' + tag(ROT_SIT[s], TAG_SIT[s]) + ' ' + e(V.linhaSituacaoContrato(k)) + '</span>';
  }
  function listaQuemAssinou() {
    var todos = (CT && CT.contratos) || [], cont = V.contagemContratos(todos), vs = (CT && CT.visitas) || [];
    var chip = function (k, rot) { return '<button type="button" class="chip" data-chip-ct="' + k + '" aria-pressed="' + (F.ct === k) + '">' + rot + '</button>'; };
    var l = V.filtrarSituacaoContratos(V.listarContratos(todos, F.ctSit ? 'todos' : F.ct), F.ctSit);
    if (!F.ctSit) l = l.slice().sort(function (a, b) { var va = V.situacaoContrato(a) === 'vencido' ? 0 : 1, vb = V.situacaoContrato(b) === 'vencido' ? 0 : 1; return va - vb; }); // vencidos em evidência (ordem estável)
    return '<section id="quemAssinou"><h2>✍️ Quem assinou com a ProFix <span class="tag ok">' + cont.ativos + ' ativo' + (cont.ativos === 1 ? '' : 's') + '</span></h2>' +
      resumoCobrancaHtml(todos) + (CTX.retorno ? '<p class="alerta" id="ctRetorno" role="status">' + e(CTX.retorno) + '</p>' : '') +
      '<div class="chips" id="fContratos" role="group" aria-label="Filtrar contratos">' + chip('ativos', 'Ativos (' + cont.ativos + ')') + chip('outros', 'Encerrados/pausados (' + cont.outros + ')') + chip('todos', 'Todos (' + cont.todos + ')') + '</div>' +
      (F.ctSit ? '<p class="muted">Filtrando pela situação do mês: ' + e(ROT_SIT[F.ctSit] || F.ctSit) + ' (todos os status).</p>' : '') +
      lista(l, function (k) {
        var ini = V.inicioContrato(k), prox = V.proximaVisitaContrato(vs, k, D.hoje), s = V.situacaoContrato(k);
        return card(e(k.cliente) + ' <span class="muted">· ' + e(k.id) + '</span>',
          '<b>' + e(k.plano || 'Plano') + '</b> · ' + V.brl(k.valor) + '/mês · ' + e(frequenciaContrato(k)) +
          '<br><span class="ct-inicio" data-ct-inicio="' + e(k.id) + '">📆 Início: <b>' + (ini ? e(V.dataBR(ini)) : 'não informado') + '</b></span>' +
          linhaCobrancaCard(k) +
          '<br>' + (prox ? '🚗 Próxima visita: ' + e(V.dataBR(prox.data)) + (V.horaVisita(prox) ? ' às ' + e(V.horaVisita(prox)) : '') + (prox.atrasada ? ' ' + tag('atrasada', 'vencido') : '') : '<span class="muted">Sem visita marcada.</span>') +
          (/fictício/i.test(k.obs || '') ? '<br><span class="muted">Exemplo fictício</span>' : ''),
          tag(k.status || 'Ativo', V.ativoContrato(k) ? 'ok' : 'cinza') + (s === 'vencido' ? tag('vencido', 'vencido') : ''),
          (V.podeReceberContrato(k) && api.pode('receberMensalidade') ? botao('💰 Receber', 'ct-receber', k.id, '') : '') +
          ((s === 'vencido' || s === 'a vencer') && Number(k.valor) > 0 ? botao('💬 Cobrar (Pix)', 'ct-cobrar', k.id, '') : '') +
          (V.precisaDiaContrato(k) && api.pode('salvarContrato') ? botao('📅 Informar dia do vencimento', 'ct-dia', k.id, '') : '') +
          (V.ativoContrato(k) && api.pode('salvarVisita') ? botao('🚗 Agendar visita', 'ct-visita', k.id, '') : ''), ' data-contrato="' + e(k.id) + '" data-situacao="' + e(s) + '"');
      }, F.ctSit ? 'Nenhum contrato nessa situação.' : F.ct === 'ativos' ? 'Nenhum contrato ativo.' : 'Nenhum contrato com esse filtro.') + '</section>';
  }
  function telaAgenda() {
    if (!CT) { carregarCT(); return '<h1>📅 Agendamento</h1><div class="vazio">Carregando visitas e contratos…</div>'; }
    var prox = V.proximasVisitas(CT.visitas || [], D.hoje), cts = CT.contratos || [];
    var planoDe = function (v) { var k = v.contrato ? cts.filter(function (x) { return x.id === v.contrato; })[0] : V.contratoAtivoCliente(cts, v.cliente); return k ? tag(k.plano || 'Plano', 'ok') : ''; };
    var HV = (CFG && CFG.HORARIOS_VISITA) || { util: { inicio: '19:00', fim: '22:00' }, fimDeSemana: { inicio: '09:00', fim: '17:00' } }, h = 'seg a sex, ' + HV.util.inicio + ' às ' + HV.util.fim + ' · sáb e dom, ' + HV.fimDeSemana.inicio + ' às ' + HV.fimDeSemana.fim;
    return '<h1>📅 Agendamento</h1>' +
      '<div class="grandes">' + (api.pode('salvarVisita') ? botao('🚗 Agendar visita', 'vis-nova', '', 'primaria').replace(' peq', '') : '') + (api.pode('salvarContrato') ? botao('+ Contrato', 'ct-novo', '', 'sec').replace(' peq', '') : '') + '</div>' +
      '<p class="muted">Horários de visita: ' + e(h) + '. Você marca aqui; a confirmação ao cliente é pelo WhatsApp, tocada por você.</p>' + (CT.erro ? '<p class="muted">Sem internet: mostrando a última cópia.</p>' : '') +
      '<section id="proximasVisitas"><h2>🗓 Próximas visitas (' + prox.length + ')</h2>' + lista(prox, function (v) {
        var c = (D.clientes || []).filter(function (k) { return k.nome === v.cliente; })[0], hora = V.horaVisita(v);
        return card(e(V.dataBR(v.data)) + (hora ? ' · ' + e(hora) : '') + ' · ' + e(v.cliente), e(v.id) + (v.contrato ? ' · ' + e(v.contrato) : '') + (v.os ? ' · ' + e(v.os) : ''),
          (v.atrasada ? tag('atrasada', 'vencido') : v.data === D.hoje ? tag('hoje', 'alta') : '') + planoDe(v) + tag(v.status, v.status === 'Em andamento' ? 'azul' : 'cinza'),
          (v.status === 'Agendada' && api.pode('iniciarVisita') ? botao('▶️ Iniciar', 'vis-ini', v.id, '') : '') + (v.status === 'Em andamento' && api.pode('encerrarVisita') ? botao('⏹ Encerrar', 'vis-fim', v.id, '') : '') +
          botoesMsgVisita(v) + (c ? botao('📇 Ficha', 'cli-ficha', c._row) : ''), ' data-agenda-visita="' + e(v.id) + '"');
      }, 'Nenhuma visita marcada. Toque em “Agendar visita”.') + '</section>' +
      listaQuemAssinou() +
      '<p class="muted"><a href="#mais/visitas">Histórico completo de visitas e planos ›</a></p>';
  }
  TELAS.agenda = telaAgenda; TELAS.leads = telaLeads;
  PRECISA['ct-visita'] = 'salvarVisita';
  PRECISA['ct-receber'] = 'receberMensalidade'; PRECISA['ct-dia'] = 'salvarContrato';
  function acharCT(id) { return ((CT && CT.contratos) || []).filter(function (x) { return x.id === id; })[0] || null; }
  function formasCT() { return D.formasPagFin || D.formasPag || []; }
  /** 💰 Receber: só em 'a vencer'/'vencido' com dia (mesmo critério do painel). Manual: o Pedro toca; lança Entrada (Serviço) no Financeiro. */
  ACOES['ct-receber'] = function (id) {
    var k = acharCT(id); if (!k) return aviso('Contrato não encontrado. Atualize e tente de novo.');
    if (!V.podeReceberContrato(k)) return aviso(V.temDiaContrato(k) ? 'Este mês não está a vencer nem vencido.' : 'Informe o dia do vencimento antes de receber.');
    var idOp = Dif.idOperacao('men'), comp = k.competencia || CTX.comp || D.hoje.slice(0, 7);
    formulario('💰 Receber · ' + e(k.id), [{ k: 'competencia', r: 'Competência (mês da mensalidade)', t: 'month', req: true },
      { k: 'data', r: 'Data do recebimento', t: 'date', req: true }, { k: 'valor', r: 'Valor (R$)', t: 'number', req: true },
      { k: 'forma', r: 'Forma de pagamento', t: 'select', o: formasCT() }, { k: 'parcelas', r: 'Parcelas (crédito parcelado)', t: 'number' }],
      { competencia: comp, data: D.hoje, valor: Number(k.valor) > 0 ? Number(k.valor).toFixed(2).replace('.', ',') : '', forma: k.forma || 'Pix' },
      '<p class="muted">' + e(k.cliente) + ' · ' + e(k.plano || '') + ' · ' + e(V.linhaSituacaoContrato(k)) + '</p><p class="muted">Lança uma Entrada (Serviço) no Financeiro como “Mensalidade ' + e(k.id) + ' – competência MM/AAAA”. Não deixa lançar a mesma competência duas vezes. Nada é cobrado do cliente.</p>')
      .then(function (v) {
        if (!v) return;
        var pr = V.payloadReceber(k, v); if (pr.erro) return aviso(pr.erro);
        // v0.9.3 (Compras): só aparece como recebida depois da confirmação; enquanto isso "Mensalidade enviando…".
        var kEnv = 'ct-receber|' + id; ENVIANDO[kEnv] = 'Mensalidade enviando…'; aviso('Mensalidade enviando… só conta quando o CRM confirmar.'); renderSuave();
        return api.escrever('receberMensalidade', [pr.payload], null, idOp).then(function (r) {
          delete ENVIANDO[kEnv]; CTX.retorno = V.textoRetornoReceber(Object.assign({ msg: r.msg }, r.dados || {})); aviso(CTX.retorno);
          return recarregarCT();
        }, function (er) { delete ENVIANDO[kEnv]; CTX.retorno = 'Não lançou: ' + er.message; aviso(CTX.retorno); render(); });
      });
  };
  /** 📅 Informar dia: contrato Ativo sem dia (antigo) fica fora da cobrança. salvarContrato com o id e o dia (o App não inventa o dia). */
  ACOES['ct-dia'] = function (id) {
    var k = acharCT(id); if (!k) return aviso('Contrato não encontrado. Atualize e tente de novo.');
    formulario('📅 Dia do vencimento · ' + e(k.id), [{ k: 'dia', r: 'Dia do vencimento (1 a 31)', t: 'number', req: true, ajuda: 'Dias 29, 30 e 31 viram o último dia nos meses mais curtos.' },
      { k: 'forma', r: 'Forma de pagamento (opcional)', t: 'select', o: formasCT() }], { dia: '', forma: k.forma || '' },
      '<p class="muted">' + e(k.cliente) + ' · ' + e(k.plano || '') + '. Sem o dia, este contrato fica fora da cobrança e o Receber não aparece.</p>')
      .then(function (v) {
        if (!v) return; var dia = V.diaVencimento(v.dia);
        if (!dia) return aviso('Dia do vencimento deve ser de 1 a 31.');
        var p = { id: k.id, dia: dia }; if (v.forma) p.forma = v.forma;
        return api.escrever('salvarContrato', [p]).then(function (r) {
          CTX.retorno = (r.msg || 'Contrato atualizado.') + (r.dados && r.dados.avisos && r.dados.avisos.length ? ' Atenção: ' + r.dados.avisos.join(' ') : ''); aviso(CTX.retorno);
          return recarregarCT();
        }, function (er) { CTX.retorno = 'Não salvou: ' + er.message; aviso(CTX.retorno); render(); });
      });
  };
  ACOES['ct-visita'] = function (id) { var k = ((CT && CT.contratos) || []).filter(function (x) { return x.id === id; })[0]; if (!k) return aviso('Contrato não encontrado.'); abrirMarcarVisita({ cliente: k.cliente, contrato: k.id }); };
  function depoisCT(acao, args) { return api.escrever(acao, args).then(function (r) { aviso(r.msg); CT = null; renderSuave(); atualizarFundo(); }, function (er) { aviso('Não salvou: ' + er.message); }); }
  // v0.8.2+/0.8.3: marcar visita + msgs §9 (Remarcar cliente/Pedro).
  function precoVisitaCfg() { return (CFG && CFG.PRECO_VISITA_EMPRESA != null) ? CFG.PRECO_VISITA_EMPRESA : 179.9; }
  function garantirCT() { if (!CT) carregarCT(); return CT || { contratos: [], visitas: [] }; }
  function abrirMsgVisita(tipo, visita) {
    var c = (D.clientes || []).filter(function (k) { return k.nome === visita.cliente; })[0] || { nome: visita.cliente };
    if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
    var ct = V.contratoAtivoCliente((CT && CT.contratos) || [], visita.cliente);
    var txt = tipo === 'lembrete' ? V.textoLembreteVisita(c, visita)
      : tipo === 'caminho' ? V.textoACaminhoVisita(c, visita)
      : tipo === 'remarcar-cliente' ? V.textoRemarcarClientePediu(c, visita)
      : tipo === 'remarcar-pedro' ? V.textoRemarcarPedroPrecisa(c, visita)
      : tipo === 'feita' ? V.textoVisitaFeita(c, visita, ct)
      : V.textoConfirmarVisita(c, visita, ct, precoVisitaCfg());
    var rot = {
      confirmar: 'Confirmar visita', lembrete: 'Lembrete do dia', caminho: 'A caminho',
      'remarcar-cliente': 'Remarcar: cliente pediu', 'remarcar-pedro': 'Remarcar: eu preciso mudar',
      feita: 'Visita feita'
    }[tipo] || 'Visita';
    var b = V.botaoWaCliente(c, 'os', txt);
    abrirMsg({ titulo: '🚗 ' + rot + ' · ' + e(visita.cliente), texto: txt, aviso: Dif.naoContatar(c) ? V.AVISO_NAO_CONTATAR : '', waUrl: b ? b.href : '', semWa: Dif.naoContatar(c) ? V.AVISO_NAO_CONTATAR : (b ? '' : 'WhatsApp inválido.'), cliente: c, tipo: 'os' });
  }
  function botoesMsgVisita(v) {
    return botao('Confirmar', 'vis-msg', v.id + '|confirmar') + botao('Lembrete', 'vis-msg', v.id + '|lembrete') + botao('A caminho', 'vis-msg', v.id + '|caminho') +
      botao('Remarcar: cliente pediu', 'vis-msg', v.id + '|remarcar-cliente') + botao('Remarcar: eu preciso mudar', 'vis-msg', v.id + '|remarcar-pedro') +
      (v.status === 'Concluída' ? botao('Visita feita', 'vis-msg', v.id + '|feita') : '');
  }
  function acharVisita(id) {
    var lst = ((CT && CT.visitas) || []).concat((D.dif && D.dif.contratos && D.dif.contratos.visitas) || []);
    return lst.filter(function (v) { return v.id === id; })[0] || null;
  }
  function abrirMarcarVisita(pre) {
    pre = pre || {};
    if (!api.pode('salvarVisita')) return aviso('Marcar visita ainda não foi liberado no servidor.');
    garantirCT();
    var nomes = (D.clientes || []).map(function (c) { return c.nome; });
    var cts = ((CT && CT.contratos) || []).filter(function (k) { return k.status === 'Ativo'; });
    var cliFixo = !!pre.cliente, osFixo = !!pre.os;
    var data0 = pre.data || D.hoje;
    if (data0 < D.hoje) data0 = D.hoje;
    var slots = V.slotsVisita(data0, CFG);
    var hora0 = pre.hora && slots.indexOf(pre.hora) >= 0 ? pre.hora : (slots[0] || '');
    var ctPadrao = pre.contrato || (pre.cliente ? ((V.contratoAtivoCliente(cts, pre.cliente) || {}).id || '') : '');
    var m = $('modal');
    var optHora = function (lista, sel) {
      return lista.map(function (h) {
        return '<option value="' + e(h) + '"' + (h === sel ? ' selected' : '') + '>' + e(h) + (V.slotEhHoraCheia(h) ? ' ★' : '') + '</option>';
      }).join('');
    };
    m.innerHTML = '<form method="dialog" class="detalhe" id="fVisita"><h2 style="margin:0">🚗 Marcar visita técnica</h2>' +
      '<p class="muted">Horários de atendimento (passo ' + e(String((CFG && CFG.PASSO_VISITA_MIN) || 30)) + ' min). Horas cheias (★) primeiro. Data não pode ser no passado.</p>' +
      '<label for="vCliente">Cliente *</label>' + (cliFixo
        ? '<input id="vCliente" value="' + e(pre.cliente) + '" readonly>'
        : '<select id="vCliente" required><option value=""></option>' + nomes.map(function (n) { return '<option' + (n === pre.cliente ? ' selected' : '') + '>' + e(n) + '</option>'; }).join('') + '</select>') +
      '<div class="lin2"><div><label for="vData">Data *</label><input id="vData" type="date" required min="' + e(D.hoje) + '" value="' + e(data0) + '"></div>' +
      '<div><label for="vHora">Horário *</label><select id="vHora" required>' + optHora(slots, hora0) + '</select></div></div>' +
      '<p class="alerta" id="vConflito" hidden></p>' +
      '<label for="vPri">Prioridade</label><select id="vPri">' + ['Urgente','Alta','Normal','Baixa'].map(function (p) { return '<option' + (p === (pre.prioridade || 'Normal') ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select>' +
      '<label for="vContrato">Contrato (opcional)</label><select id="vContrato"><option value=""></option>' + cts.map(function (k) { return '<option value="' + e(k.id) + '"' + (k.id === ctPadrao ? ' selected' : '') + '>' + e(k.id + ' · ' + k.cliente + ' · ' + (k.plano || '')) + '</option>'; }).join('') + '</select>' +
      '<label for="vOS">OS (opcional)</label>' + (osFixo
        ? '<input id="vOS" value="' + e(pre.os) + '" readonly>'
        : '<input id="vOS" value="' + e(pre.os || '') + '" placeholder="OS-00xx">') +
      '<label for="vObs">Observações</label><textarea id="vObs" rows="2">' + e(pre.obs || '') + '</textarea>' +
      '<div class="acoes"><button type="submit" class="btn" id="vSalvar" value="ok">Salvar visita</button><button type="submit" class="btn sec" value="cancel" formnovalidate>Cancelar</button></div></form>';
    m.showModal();
    var atualizarSlots = function () {
      var d = $('vData').value, lista = V.slotsVisita(d, CFG), atual = $('vHora').value;
      $('vHora').innerHTML = lista.length ? optHora(lista, lista.indexOf(atual) >= 0 ? atual : lista[0]) : '<option value="">Sem horário neste dia</option>';
      checarConflito();
    };
    var checarConflito = function () {
      var d = $('vData').value, h = $('vHora').value, el = $('vConflito');
      if (!d || !h) { el.hidden = true; return; }
      var conf = V.conflitoVisita((CT && CT.visitas) || [], d, h);
      if (!conf.length) { el.hidden = true; el.textContent = ''; return; }
      el.hidden = false;
      el.textContent = 'Já existe visita neste horário: ' + conf.map(function (v) { return v.id + ' · ' + v.cliente; }).join('; ') + '. Você pode salvar mesmo assim.';
    };
    $('vData').onchange = atualizarSlots; $('vHora').onchange = checarConflito;
    if (!cliFixo) $('vCliente').onchange = function () {
      var nome = $('vCliente').value, ct = V.contratoAtivoCliente(cts, nome);
      if (ct) $('vContrato').value = ct.id;
    };
    checarConflito();
    $('fVisita').addEventListener('submit', function (ev) {
      if (ev.submitter && ev.submitter.value === 'cancel') return;
      ev.preventDefault();
      var cliente = $('vCliente').value.trim(), data = $('vData').value, hora = $('vHora').value;
      if (!cliente || !data || !hora) return aviso('Preencha cliente, data e horário.');
      if (data < D.hoje) return aviso('A data não pode ser no passado.');
      if (V.slotsVisita(data, CFG).indexOf(hora) < 0) return aviso('Horário fora do atendimento.');
      var payload = {
        cliente: cliente, data: data, hora: hora, prioridade: $('vPri').value || 'Normal',
        contrato: $('vContrato').value || '', os: $('vOS').value.trim(),
        obs: V.obsComHora(hora, $('vObs').value), idOperacao: Dif.idOperacao('vis')
      };
      var conf = V.conflitoVisita((CT && CT.visitas) || [], data, hora);
      var seguir = function () {
        m.close('');
        depoisCT('salvarVisita', [payload]).then(function () {
          var vFake = { id: '', cliente: cliente, data: data, hora: hora, os: payload.os, obs: payload.obs };
          perguntar('Visita salva. Abrir a mensagem “Confirmar visita” no WhatsApp?', { titulo: 'Confirmar visita', sim: 'Abrir mensagem', nao: 'Agora não' }).then(function (ok) {
            if (ok) abrirMsgVisita('confirmar', vFake);
          });
        });
      };
      if (conf.length) {
        perguntar('Já existe visita em ' + V.dataBR(data) + ' às ' + hora + ' (' + conf.map(function (v) { return v.cliente; }).join(', ') + '). Salvar mesmo assim?', { titulo: 'Horário ocupado', sim: 'Salvar mesmo assim', perigo: true }).then(function (ok) { if (ok) seguir(); });
      } else seguir();
    });
  }

  // ---- v0.8.3: painel Mensagens (ficha/OS) — contextual + Ver todas ----
  function ctxMensagens(c, o) {
    garantirCT();
    var visitas = ((CT && CT.visitas) || []).filter(function (v) { return v.cliente === c.nome && v.status !== 'Cancelada'; });
    var visita = null;
    if (o) visita = visitas.filter(function (v) { return v.os === o.num && v.status !== 'Concluída'; })[0] || null;
    if (!visita) visita = visitas.filter(function (v) { return v.status === 'Agendada' || v.status === 'Em andamento'; }).sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); })[0] || null;
    var url = (Dif.padroes(D).googleReviewUrl) || 'https://g.page/r/CZQuYc9gn5lJECE/review';
    var ct = V.contratoAtivoCliente(((CT && CT.contratos) || []), c.nome);
    return {
      cliente: c, os: o || null, visita: visita, D: D, googleReviewUrl: url, linkOS: '', // v0.9.0: link real vem do linkClienteOS em abrirPreviewMsg
      pix: function (valor, num) { var b = blocoPix(valor, num); return b ? b.texto : ''; }, saldo: o ? V.saldoOS(D, o) : 0, recebido: o ? V.recebidoOS(D, o.num) : 0, // v0.9.2: bloco Pix (pixConfig)
      contrato: ct, precoVisita: precoVisitaCfg(), hoje: D.hoje, agendado: !!(visita || (o && o.agendadoPara))
    };
  }
  // v0.9.0: link de acompanhamento/aprovação da OS (mesma ação do botão 🔗). Guardado por OS enquanto o App está aberto.
  var LINKS_OS = {}, LINK_TIMEOUT_MS = 15000;
  /** v0.9.2 (crm-v3 API @127): resposta { ok, dados: { ok, num, url, criado, msg } } -> url em r.dados.url (aceita r.url por compatibilidade). */
  function urlDoLink(r) { var d = (r && r.dados) || {}; return String(d.url || (d.dados && d.dados.url) || (r && r.url) || ''); }
  function obterLinkOS(o) {
    if (LINKS_OS[o.num]) return Promise.resolve(LINKS_OS[o.num]);
    if (!api.pode('linkClienteOS')) return Promise.reject(new Error('link da OS ainda não liberado no servidor'));
    if (!navigator.onLine || offline) return Promise.reject(new Error('sem internet'));
    // Mesmo idOperacao nas repetições: o servidor devolve a MESMA url (seguro repetir). Timeout / "Servidor ocupado": até 2 tentativas extras.
    var idOp = 'link-' + o.num + '-' + Date.now().toString(36), tentativa = 0;
    aviso('Gerando link…');
    function uma() {
      tentativa++;
      var limite = new Promise(function (_, falha) { setTimeout(function () { falha(Object.assign(new Error('o servidor demorou para responder'), { repetir: true })); }, LINK_TIMEOUT_MS); });
      return Promise.race([api.escrever('linkClienteOS', [{ num: o.num, _row: o._row }], null, idOp), limite]).then(function (r) {
        if (r && r.enfileirado) throw new Error('sem internet: nada foi enviado');
        var url = urlDoLink(r);
        if (!/^https:\/\/\S+$/.test(url)) throw new Error('o servidor não devolveu um link válido');
        LINKS_OS[o.num] = url; return url;
      }).catch(function (er) {
        var repetir = er && (er.repetir || /ocupad|timeout|tempo|busy|failed to fetch|networkerror|load failed/i.test(er.message || ''));
        if (repetir && tentativa < 3 && navigator.onLine !== false) { aviso('Gerando link… (tentando de novo)'); return new Promise(function (ok) { setTimeout(ok, 700 * tentativa); }).then(uma); }
        throw er;
      });
    }
    return uma();
  }
  /**
   * v0.9.2: mensagem que PRECISA do link de aprovação/acompanhamento. Busca o link real (linkClienteOS) e só então abre o WhatsApp.
   * Sem link (sem internet, servidor vazio ou erro): NÃO abre o WhatsApp; avisa com "Tentar de novo" e, separado e bem claro,
   * "Enviar mesmo assim sem link" (texto sem "[link…]"). p = { os, cliente, titulo, tipo, montar(link) -> texto, popup?, pix?, antes?() }
   */
  function abrirComLink(p) {
    var c = p.cliente || {};
    var pre = p.antes ? Promise.resolve().then(p.antes) : Promise.resolve();
    if (p.popup && !p.popup.closed) { try { p.popup.document.body.textContent = 'Gerando link de aprovação… O WhatsApp abre em seguida.'; } catch (x) { /* ok */ } }
    return pre.then(function () { return obterLinkOS(p.os); }).then(function (url) {
      var texto = p.montar(url), b = V.botaoWaCliente(c, 'os', texto);
      if (p.popup && !p.popup.closed && b) { p.popup.location.href = b.href; registrarAberta({ dataset: { regNome: c.nome, regOs: p.os.num, regTipo: p.tipo || 'orcamento', regTexto: texto } }); return { link: url, aberto: true }; }
      if (p.popup) p.popup.close();
      abrirMsg({ titulo: p.titulo, texto: texto, link: url, waUrl: b ? b.href : '', pix: p.pix, aviso: b && b.aviso ? 'Sem consentimento LGPD: só mensagem sobre a OS.' : '',
        semWa: Dif.naoContatar(c) ? 'Cliente marcado como “Não contatar”.' : 'WhatsApp inválido: copie o texto.', cliente: c, os: p.os.num, osObj: p.os, tipo: p.tipo || 'orcamento', emailOk: p.emailOk, assuntoEmail: p.assuntoEmail });
      return { link: url };
    }, function (er) {
      if (p.popup) p.popup.close();
      avisoSemLink(p, er); return { link: '' };
    });
  }
  function avisoSemLink(p, er) {
    var m = $('modal'), c = p.cliente || {}, texto = V.semMarcadorLink(p.montar('')), b = V.botaoWaCliente(c, 'os', texto);
    if (m.open) m.close('');
    m.innerHTML = '<form method="dialog" class="detalhe" id="fSemLink"><h2 style="margin:0">' + e(p.titulo || 'Mensagem') + '</h2>' +
      '<p class="alerta" id="semLinkAviso" role="alert">Não consegui gerar o link de aprovação. Tente de novo com internet.</p>' +
      '<p class="muted" id="semLinkMotivo">Motivo: ' + e((er && er.message) || 'sem resposta do servidor') + '. O WhatsApp não foi aberto.' + (p.fila ? ' O orçamento ficou salvo na fila do aparelho e vai para o CRM quando a internet voltar.' : '') + '</p>' +
      '<div class="grandes"><button type="button" class="btn" id="bTentarLink">🔄 Tentar de novo</button>' +
      (b ? '<button type="button" class="btn sec" id="bSemLink">Enviar mesmo assim sem link</button>' : '') +
      '<button class="btn sec" value="fechar">Fechar</button></div>' +
      (b ? '<p class="muted">“Enviar mesmo assim sem link” abre o texto sem o link de aprovação: o cliente vai responder por aqui.</p>' : '') + '</form>';
    m.onclose = null; m.returnValue = ''; m.showModal();
    $('bTentarLink').onclick = function () { m.close(''); abrirComLink(Object.assign({}, p, { popup: null })); };
    if ($('bSemLink')) $('bSemLink').onclick = function () {
      m.close('');
      abrirMsg({ titulo: p.titulo + ' (sem link)', texto: texto, waUrl: b.href, pix: p.pix, aviso: 'Atenção: mensagem SEM o link de aprovação.' + (b.aviso ? ' Sem consentimento LGPD: só mensagem sobre a OS.' : ''), cliente: c, os: p.os.num, osObj: p.os, tipo: p.tipo || 'orcamento' });
    };
  }
  function abrirPreviewMsg(id, ctx, dataIso, hora) {
    var c = ctx.cliente;
    if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
    if (['os-orc', 'os-peca-orc'].indexOf(id) >= 0 && ctx.os && !ctx.preparado) {
      ctx.preparado = true;
      return prepararEnvioOrc(ctx.os).then(function () { abrirPreviewMsg(id, ctx, dataIso, hora); });
    }
    if (V.precisaLinkOS(id, ctx)) {
      // v0.9.2: sem o link real, o WhatsApp NÃO abre com "[link…]": aviso + Tentar de novo / Enviar mesmo assim sem link.
      return obterLinkOS(ctx.os).then(function (url) { ctx.linkOS = url; ctx.avisoLink = ''; montarPreviewMsg(id, ctx, dataIso, hora); }, function (er) {
        if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
        var cat = (V.catalogoMensagensProntas(ctx).todas || []).filter(function (x) { return x.id === id; })[0];
        avisoSemLink({ os: ctx.os, cliente: c, titulo: '💬 ' + ((cat && cat.rotulo) || 'Mensagem') + ' · ' + ctx.os.num, tipo: 'os', pix: pixDaMsg(id, ctx),
          montar: function (link) { var cx = Object.assign({}, ctx, { linkOS: link }); return V.montarMensagemPronta(id, cx, dataIso, hora); } }, er);
        // "Tentar de novo" volta para este mesmo painel com o link.
        var bt = $('bTentarLink'); if (bt) bt.onclick = function () { $('modal').close(''); abrirPreviewMsg(id, ctx, dataIso, hora); };
      });
    }
    montarPreviewMsg(id, ctx, dataIso, hora);
  }
  /** Código Pix da mensagem (para o botão 📋 Copiar Pix), mesmo valor do texto. */
  function pixDaMsg(id, ctx) {
    var o = ctx && ctx.os; if (!V.MSG_COM_PIX[id] || !o) return '';
    var b = blocoPix(V.valorPixMsg(id, ctx), o.num);
    return b ? b.codigo : '';
  }
  function montarPreviewMsg(id, ctx, dataIso, hora) {
    var c = ctx.cliente;
    var txt = V.montarMensagemPronta(id, ctx, dataIso, hora);
    if (!txt) return aviso('Mensagem não disponível.');
    var cat = (V.catalogoMensagensProntas(ctx).todas || []).filter(function (x) { return x.id === id; })[0];
    var tipo = (cat && cat.marketing) ? 'marketing' : 'os';
    if (tipo === 'marketing' && c.consent !== 'Sim') return aviso('Sem consentimento LGPD: mensagem de relacionamento não pode.');
    if (id === 'pos-google' && c.consent !== 'Sim') return aviso('Sem consentimento LGPD: não envie pedido de avaliação.');
    var b = V.botaoWaCliente(c, tipo, txt);
    var rot = (cat && cat.rotulo) || 'Mensagem';
    var em = (V.emailMensagemPronta && V.emailMensagemPronta(id, ctx, dataIso, hora)) || null;
    abrirMsg({
      titulo: '💬 ' + rot + (ctx.os ? ' · ' + ctx.os.num : ''), pix: pixDaMsg(id, ctx), link: ctx.linkOS || '',
      texto: txt, waUrl: b ? b.href : '', aviso: [ctx.avisoLink && V.temMarcadorLink(txt) ? ctx.avisoLink : '', b && b.aviso ? 'Sem consentimento LGPD: só mensagem sobre a OS.' : ''].filter(Boolean).join(' '),
      semWa: Dif.naoContatar(c) ? V.AVISO_NAO_CONTATAR : (b ? '' : (tipo === 'marketing' && c.consent !== 'Sim' ? 'Sem consentimento LGPD.' : 'WhatsApp inválido.')),
      cliente: c, os: ctx.os ? ctx.os.num : '', osObj: ctx.os, tipo: tipo, emailOk: true,
      assuntoEmail: (em && em.assunto) || (V.ASSUNTOS_MSG_EMAIL && V.ASSUNTOS_MSG_EMAIL[id]) || ('ProFix — ' + rot),
      onEmail: function () { emailMsgLivre(c, ctx.os, em ? em.assunto : ((V.ASSUNTOS_MSG_EMAIL && V.ASSUNTOS_MSG_EMAIL[id]) || rot), em ? em.corpo : txt); }
    });
  }
  function pedirHorarioMsg(id, ctx) {
    var m = $('modal');
    var ag = V.parseAgendadoPara(ctx.os && ctx.os.agendadoPara);
    var data0 = (ag && ag.data >= D.hoje) ? ag.data : D.hoje;
    var slots = V.slotsVisita(data0, CFG);
    var hora0 = (ag && slots.indexOf(ag.hora) >= 0) ? ag.hora : (slots[0] || '');
    var optHora = function (lista, sel) {
      return lista.map(function (h) {
        return '<option value="' + e(h) + '"' + (h === sel ? ' selected' : '') + '>' + e(h) + (V.slotEhHoraCheia(h) ? ' ★' : '') + '</option>';
      }).join('');
    };
    m.innerHTML = '<form method="dialog" class="detalhe" id="fMsgHora"><h2 style="margin:0">📅 Horário da mensagem</h2>' +
      '<p class="muted">Mesmo seletor das visitas (passo ' + e(String((CFG && CFG.PASSO_VISITA_MIN) || 30)) + ' min). Horas cheias ★ primeiro.</p>' +
      '<div class="lin2"><div><label for="mhData">Data *</label><input id="mhData" type="date" required min="' + e(D.hoje) + '" value="' + e(data0) + '"></div>' +
      '<div><label for="mhHora">Horário *</label><select id="mhHora" required>' + optHora(slots, hora0) + '</select></div></div>' +
      '<div class="acoes"><button type="submit" class="btn" value="ok">Continuar</button><button type="submit" class="btn sec" value="cancel" formnovalidate>Cancelar</button></div></form>';
    m.showModal();
    $('mhData').onchange = function () {
      var lista = V.slotsVisita($('mhData').value, CFG), atual = $('mhHora').value;
      $('mhHora').innerHTML = lista.length ? optHora(lista, lista.indexOf(atual) >= 0 ? atual : lista[0]) : '<option value="">Sem horário</option>';
    };
    $('fMsgHora').addEventListener('submit', function (ev) {
      if (ev.submitter && ev.submitter.value === 'cancel') return;
      ev.preventDefault();
      var data = $('mhData').value, hora = $('mhHora').value;
      if (!data || !hora) return aviso('Escolha data e horário.');
      m.close('');
      // Grava "Agendado para" na OS quando houver (coluna no fim da aba / campo do getDados)
      if (ctx.os && ctx.os._row && api.pode('salvarOS') && (id === 'ag-traz' || id === 'ag-entrega' || id === 'ag-lembrete')) {
        var quando = data + ' ' + hora;
        api.escrever('salvarOS', [{ _row: ctx.os._row, num: ctx.os.num, cliente: ctx.os.cliente, equipamento: ctx.os.equipamento, defeito: ctx.os.defeito, servico: ctx.os.servico, valor: ctx.os.valor, previsao: ctx.os.previsao, acessorios: ctx.os.acessorios, agendadoPara: quando }], function (cache) {
          (cache.os || []).forEach(function (x) { if (x._row === ctx.os._row) x.agendadoPara = quando; });
        }).then(function () { ctx.os.agendadoPara = quando; }, function () {});
      }
      abrirPreviewMsg(id, ctx, data, hora);
    });
  }
  function renderListaMsgs(itens) {
    var grupos = {}, ordem = ['Agendamento', 'OS', 'Pós-venda'];
    itens.forEach(function (it) { (grupos[it.grupo] = grupos[it.grupo] || []).push(it); });
    return ordem.map(function (g) {
      if (!grupos[g] || !grupos[g].length) return '';
      return '<h3 class="msg-grupo">' + e(g) + '</h3><div class="acoes msg-lista">' + grupos[g].map(function (it) {
        return '<button type="button" class="btn sec" data-msg-id="' + e(it.id) + '">' + e(it.rotulo) + '</button>';
      }).join('') + '</div>';
    }).join('');
  }
  function abrirMensagensProntas(c, o) {
    if (!c) return aviso('Cliente não encontrado.');
    if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
    var ctx = ctxMensagens(c, o);
    var cat = V.catalogoMensagensProntas(ctx);
    var m = $('modal');
    m.innerHTML = '<form method="dialog" class="detalhe sheet-msgs" id="fMsgs"><h2 style="margin:0">💬 Mensagens' + (o ? ' · ' + e(o.num) : '') + '</h2>' +
      '<p class="muted">Primeiro o que serve agora. Toque para ver a prévia; quem envia é você (WhatsApp, copiar ou e-mail).</p>' +
      '<div id="msgsMomento">' + (cat.momento.length ? renderListaMsgs(cat.momento) : '<p class="muted">Nada contextual no momento — abra Ver todas.</p>') + '</div>' +
      '<details id="msgsTodas"><summary>Ver todas</summary>' + (cat.resto.length ? renderListaMsgs(cat.resto) : '<p class="muted">Nada mais além do que já aparece acima.</p>') + '</details>' +
      '<div class="acoes"><button type="submit" class="btn sec" value="cancel">Fechar</button></div></form>';
    m.showModal();
    m.querySelectorAll('[data-msg-id]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-msg-id');
        var meta = cat.todas.filter(function (x) { return x.id === id; })[0] || cat.resto.filter(function (x) { return x.id === id; })[0] || cat.momento.filter(function (x) { return x.id === id; })[0];
        m.close('');
        setTimeout(function () {
          if (meta && meta.precisaHorario) pedirHorarioMsg(id, ctx);
          else abrirPreviewMsg(id, ctx);
        }, 0);
      };
    });
  }
  ACOES['cli-msgs'] = function (row) {
    var c = achar('clientes', row); if (!c) return;
    var ult = (D.os || []).filter(function (x) { return x.cliente === c.nome; }).slice(-1)[0] || null;
    abrirMensagensProntas(c, ult);
  };
  ACOES['os-msgs'] = function (row) {
    var o = achar('os', row); if (!o) return;
    abrirMensagensProntas(V.clienteDaOS(D, o) || { nome: o.cliente }, o);
  };

  ACOES['vis-nova'] = function () { abrirMarcarVisita({}); };
  ACOES['cli-visita'] = function (row) {
    var c = achar('clientes', row); if (!c) return;
    var ct = V.contratoAtivoCliente(((CT && CT.contratos) || (garantirCT().contratos) || []), c.nome);
    abrirMarcarVisita({ cliente: c.nome, contrato: ct ? ct.id : '' });
  };
  ACOES['os-visita'] = function (row) {
    var o = achar('os', row); if (!o) return;
    var ct = V.contratoAtivoCliente(((CT && CT.contratos) || (garantirCT().contratos) || []), o.cliente);
    abrirMarcarVisita({ cliente: o.cliente, os: o.num, contrato: ct ? ct.id : '' });
  };
  ACOES['vis-msg'] = function (k) {
    var p = String(k).split('|'), v = acharVisita(p[0]);
    if (!v) { garantirCT(); v = acharVisita(p[0]); }
    if (!v) return aviso('Visita não encontrada. Atualize e tente de novo.');
    abrirMsgVisita(p[1] || 'confirmar', v);
  };

  ACOES['ct-novo'] = function () {
    formulario('+ Contrato mensal', [{ k: 'cliente', r: 'Cliente', t: 'select', o: (D.clientes || []).map(function (c) { return c.nome; }), req: true },
      { k: 'plano', r: 'Plano', t: 'select', o: PLANOS.map(function (p) { return p.nome; }), req: true },
      { k: 'pcs', r: 'Nº de computadores', t: 'number', ajuda: 'Empresa+ começa em 11.' },
      { k: 'extras', r: 'Máquinas extras (R$ 35,00/PC/mês)', t: 'number', ajuda: 'Não soma no total até o Pedro definir o valor da máquina extra.' },
      { k: 'valor', r: 'Valor mensal (R$)', t: 'number', req: true },
      { k: 'frequencia', r: 'Frequência da visita' }, { k: 'inicio', r: 'Início', t: 'date' },
      { k: 'status', r: 'Status', t: 'select', o: V.STATUS_CONTRATO, req: true, ajuda: 'Use “Proposta” enquanto o cliente não fechar (pode ficar sem dia).' },
      { k: 'dia', r: 'Dia do vencimento (1 a 31)', t: 'number', req: true, ajuda: 'Obrigatório para contrato Ativo. Dias 29–31 viram o último dia nos meses mais curtos.' },
      { k: 'forma', r: 'Forma de pagamento', t: 'select', o: formasCT() }, { k: 'obs', r: 'Observações', t: 'textarea' }],
      { plano: 'Essencial', pcs: '5', extras: '0', valor: '359,50', frequencia: '1x por mês', inicio: D.hoje, status: 'Ativo', dia: '', forma: '' },
      '<p class="muted">Preços do Financeiro (09/11). Extra ' + e(V.brl(V.EXTRA_MAQUINA)) + '/PC · Pix ' + e(String(cfgPrecos().pix)) + '% · anual ' + e(String(cfgPrecos().anual)) + '% (Pix/anual vêm do CRM).</p>')
      .then(function (v) {
        if (!v) return; var p = planoOficial(v.plano), n = Number(v.extras || 0), pcs = Number(v.pcs || 0);
        var vc = V.validarContratoNovo(v, formasCT()); if (!vc.ok) return aviso(vc.erro);
        if (!p || !Number.isInteger(n) || n < 0) return aviso('Informe uma quantidade inteira de máquinas extras, maior ou igual a zero.');
        if (p.valorPorPc && (!Number.isInteger(pcs) || pcs < (p.pcsMin || 11))) return aviso('Empresa+ começa em 11 computadores.');
        var valor = V.valorPlano(p.nome, pcs || p.pcs, n, cfgPrecos());
        if (valor == null) return aviso('Valor do plano ainda não definido.');
        var obs = 'Visita preventiva: ' + p.frequencia + '. Limpeza a cada ' + p.limpeza + ' meses. PCs: ' + (pcs || p.pcs || p.pcsTxt) + '. Máquinas extras: ' + n + ' × ' + V.brl(V.EXTRA_MAQUINA) + '/mês. Pix ' + cfgPrecos().pix + '% (não soma em combo). Anual ' + cfgPrecos().anual + '%.' +
          ' ' + p.suporte + ', sem promessa de prazo em horas.' + (v.obs ? '\n' + v.obs : '');
        var pl = { cliente: v.cliente, plano: p.nome, valor: valor, visitas: p.visitas, inicio: v.inicio, status: vc.status, dia: vc.dia, obs: obs };
        if (vc.forma) pl.forma = vc.forma;
        depoisCT('salvarContrato', [pl]);
      });
    $('c_frequencia').readOnly = true;
    // v0.8.9: dia obrigatório só no Ativo; Proposta/Pausado/Encerrado podem ficar sem dia.
    $('c_dia').setAttribute('inputmode', 'numeric'); $('c_dia').setAttribute('pattern', '([1-9]|[12][0-9]|3[01])');
    var regraDia = function () { var at = ($('c_status').value || 'Ativo') === 'Ativo'; $('c_dia').required = at; var lb = document.querySelector('label[for="c_dia"]'); if (lb) lb.textContent = 'Dia do vencimento (1 a 31)' + (at ? ' *' : ' (opcional)'); };
    $('c_status').onchange = regraDia; regraDia();
    var preencher = function () {
      var p = planoOficial($('c_plano').value), n = Number($('c_extras').value || 0), pcs = Number($('c_pcs').value || 0);
      var validoExt = Number.isInteger(n) && n >= 0;
      $('c_extras').setCustomValidity(validoExt ? '' : 'Informe uma quantidade inteira maior ou igual a zero.');
      if (p && p.valorPorPc) {
        if (!pcs) { $('c_pcs').value = String(p.pcsMin || 11); pcs = p.pcsMin || 11; }
        $('c_pcs').required = true;
      } else {
        $('c_pcs').required = false; if (p && p.pcs) $('c_pcs').value = String(p.pcs);
        pcs = Number($('c_pcs').value || (p && p.pcs) || 0);
      }
      var valor = p ? V.valorPlano(p.nome, pcs, Number($('c_extras').value || 0), cfgPrecos()) : null;
      $('c_valor').value = valor != null ? valor.toFixed(2).replace('.', ',') : '';
      $('c_valor').readOnly = true;
      $('c_frequencia').value = p ? p.frequencia : '';
    };
    $('c_plano').onchange = preencher; $('c_extras').oninput = preencher; $('c_pcs').oninput = preencher; preencher();
  };
  ACOES['vis-ini'] = function (id) { depoisCT('iniciarVisita', [{ id: id }]); };
  ACOES['vis-fim'] = function (id) {
    formulario('⏹ Encerrar ' + e(id), [{ k: 'km', r: 'Km rodados (ida e volta)', t: 'number', req: true }], { km: '' }, '<p class="muted">As horas são calculadas pelo início e fim (arredondadas a 15 min).</p>')
      .then(function (v) { if (!v) return; depoisCT('encerrarVisita', [{ id: id, km: v.km, fim: Dif.agoraTxt() }]); });
  };

  // ---- Painel do mês (resumoMes) ----
  function telaMes() {
    var mes = RM.mesSel || D.hoje.slice(0, 7);
    if (RM.mes !== mes) { RM.mes = mes; RM.dados = null; if (api.pode('resumoMes')) api.ler('resumoMes', [{ mes: mes }]).then(function (r) { if (RM.mes !== mes) return; RM.dados = r; if (rota().tela === 'mais') render(); }, function () { if (RM.mes === mes) { RM.dados = Dif.resumoMesLocal(D, mes); if (rota().tela === 'mais') render(); } }); else RM.dados = Dif.resumoMesLocal(D, mes); }
    var r = RM.dados; if (!r) return '<div class="filtros"><input type="month" id="fMes" value="' + e(mes) + '" aria-label="Mês"></div><div class="vazio">Carregando o painel do mês…</div>';
    var o = r.orcamentos || {}, obj = function (x) { return Object.keys(x || {}).map(function (k) { return e(k) + ': <b>' + e(x[k]) + '</b>'; }).join(' · ') || '—'; };
    return '<div class="filtros"><input type="month" id="fMes" value="' + e(mes) + '" aria-label="Mês"></div>' + (r.local ? '<p class="muted">Prévia do aparelho (sem resposta do servidor).</p>' : '') +
      '<div class="tiles" id="painelMes">' + tile('Faturamento', V.brl(r.faturamento || 0)) + tile('Lucro', V.brl(r.lucro || 0)) + tile('Custo de peças', V.brl(r.custoPecas || 0)) + tile('Ticket médio', V.brl(r.ticketMedio || 0)) +
      tile('OS abertas', r.osAbertas || 0) + tile('OS entregues', r.osEntregues || 0) + tile('Orçamentos aprovados', (o.aprovados || 0) + ' de ' + (o.total || 0) + ' (' + (o.taxaAprovacao || 0) + '%)') + tile('Clientes novos', r.clientesNovos || 0) +
      tile('Receita de contratos (previsto)', V.brl(r.receitaContratos || 0), 'tileCtPrevisto') + tile('Receita de contratos (recebido)', r.receitaContratosRecebida == null ? '—' : V.brl(r.receitaContratosRecebida), 'tileCtRecebido') + tile('Avaliação', r.avaliacao && r.avaliacao.quantidade ? String(r.avaliacao.media).replace('.', ',') + ' ★ (' + r.avaliacao.quantidade + ')' : '—') + '</div>' +
      '<div class="card"><div class="m">OS em andamento: ' + obj(r.osPorStatus) + '<br>Como conheceu: ' + obj(r.comoConheceu) + '<br>Motivos de recusa: ' + obj(r.motivosRecusa) + '</div></div>';
  }

  // ---------- v0.7.1: Lixeira (excluirRegistro / listarLixeira / restaurarRegistro / apagarDefinitivo), leads, avaliação no Google ----------
  var LX = null;
  function rotTipo(t) { return { lead: 'Lead', cliente: 'Cliente', os: 'OS', oportunidade: 'Oportunidade', maquina: 'Máquina', contrato: 'Contrato mensal', contratoRecorrente: 'Contrato recorrente' }[t] || t; }
  function semNet() { if (offline || (typeof navigator !== 'undefined' && navigator.onLine === false)) { aviso('Sem internet: a Lixeira só funciona com conexão. Nada foi alterado.'); return true; } return false; }
  /** Excluir: 1º confirma; manda SEM cascata. Cliente com OS/máquinas/contratos volta com o impacto: mostra e só exclui tudo se o Pedro confirmar. */
  function excluir(ref, desc) {
    if (!api.pode('excluirRegistro')) return aviso('Esta função ainda não foi liberada no servidor (crm-v3).');
    if (semNet()) return;
    perguntar('Mandar ' + desc + ' para a Lixeira?\nDá para restaurar depois em Mais › Lixeira.', { titulo: '🗑 Excluir', sim: 'Mandar para a Lixeira', perigo: true }).then(function (sim) { if (!sim) return aviso('Cancelado: nada foi excluído.');
    var ok = function (r) { aviso(r.msg || 'Foi para a Lixeira.'); LX = null; FICHA.nome = ''; if (ref.tipo === 'cliente' && rota().tela === 'cliente') location.hash = '#clientes'; return atualizarFundo(true); };
    escreverResp('excluirRegistro', [ref]).then(function (r) {
      if (!r || !r.precisaConfirmar) return ok(r || {});
      mostrarImpacto(r, function () { escreverResp('excluirRegistro', [Object.assign({}, ref, { cascata: true })]).then(function (r2) { if (r2 && r2.precisaConfirmar) return aviso('O servidor não confirmou a exclusão. Nada foi alterado.'); ok(r2 || {}); }, function () {}); });
    }, function () {});
    });
  }
  function mostrarImpacto(r, sim) {
    var imp = r.impacto || {}, m = $('modal'), grupo = function (rot, l) { return (l || []).length ? '<div><b>' + rot + ' (' + l.length + ')</b><ul>' + l.map(function (x) { return '<li>' + e(x.descricao || x.id) + '</li>'; }).join('') + '</ul></div>' : ''; };
    m.innerHTML = '<form method="dialog" class="detalhe" id="fImpacto"><h2 style="margin:0">🗑 Excluir ' + e(r.nome || 'cliente') + '?</h2><p class="alerta" id="impactoMsg">' + e(r.msg || 'Este cliente tem registros ligados.') + '</p>' +
      grupo('OS', imp.os) + grupo('Máquinas', imp.maquinas) + grupo('Contratos mensais', imp.contratos) + grupo('Contratos recorrentes', imp.contratosRecorrentes) +
      '<p class="muted">Tudo vai junto para a Lixeira (um grupo só) e pode ser restaurado em Mais › Lixeira.</p><div class="grandes"><button class="btn perigo" value="ok" id="bExcluirTudo">Excluir o cliente e os ' + (imp.total || 0) + ' registro(s) ligados</button><button class="btn sec" value="cancelar">Cancelar</button></div></form>';
    m.onclose = function () { m.onclose = null; if (m.returnValue === 'ok') sim(); else aviso('Cancelado: nada foi excluído.'); };
    m.returnValue = ''; m.showModal();
  }
  ACOES['cli-excluir'] = function (row) { var c = achar('clientes', row); excluir({ tipo: 'cliente', id: c.id || '', _row: c._row, nome: c.nome }, 'o cliente “' + c.nome + '”'); };
  ACOES['os-excluir'] = function (row) { var o = achar('os', row); excluir({ tipo: 'os', id: o.num, _row: o._row }, 'a ' + o.num + ' (' + o.cliente + ')'); };
  ACOES['lead-excluir'] = function (row) { var l = (D.leadsLink || []).filter(function (x) { return x._row === Number(row); })[0]; excluir({ tipo: 'lead', _row: Number(row) }, 'o lead “' + (l ? l.nome : row) + '”'); };
  PRECISA['cli-excluir'] = PRECISA['os-excluir'] = PRECISA['lead-excluir'] = 'excluirRegistro';

  function carregarLX() {
    if (carregarLX.indo) return; carregarLX.indo = true;
    api.ler('listarLixeira', [{}]).then(function (r) { carregarLX.indo = false; LX = { itens: (r && r.itens) || [] }; if (rota().tela === 'mais') render(); },
      function (er) { carregarLX.indo = false; LX = { itens: [], erro: (offline ? 'Sem internet: a Lixeira só funciona com conexão.' : 'Não deu para abrir a Lixeira: ' + er.message) }; if (rota().tela === 'mais') render(); });
  }
  function telaLixeira() {
    if (!api.pode('listarLixeira')) return '<div class="vazio">A Lixeira ainda não foi liberada no servidor (crm-v3).</div>';
    if (!LX) { carregarLX(); return '<div class="vazio">Abrindo a Lixeira…</div>'; }
    var grupos = {}; LX.itens.forEach(function (x) { if (x.grupo) grupos[x.grupo] = (grupos[x.grupo] || 0) + 1; });
    return '<div class="row"><p class="muted">Excluídos ficam aqui até você restaurar ou apagar de vez. Só funciona com internet.</p><button class="btn sec peq" id="bLxAtualizar">🔄 Atualizar</button></div>' + (LX.erro ? '<p class="alerta" id="lxErro">' + e(LX.erro) + '</p>' : '') +
      '<p class="muted" id="contagemLx">' + LX.itens.length + ' na Lixeira</p>' + lista(LX.itens, function (x) {
        var g = x.grupo && grupos[x.grupo] > 1 ? ' · grupo ' + e(x.grupo) + ' (' + grupos[x.grupo] + ' itens, voltam juntos)' : '';
        return card(e(x.id) + ' · ' + e(rotTipo(x.tipo)), e(x.descricao || x.chave || '') + '<br><span class="muted">Excluído em ' + e(x.excluidoEm || '') + (x.por ? ' por ' + e(x.por) : '') + g + '</span>', '',
          (api.pode('restaurarRegistro') ? botao('↩️ Restaurar', 'lx-rest', x.id, '') : '') + (api.pode('apagarDefinitivo') ? botao('Apagar definitivamente', 'lx-apagar', x.id, 'perigo') : ''), ' data-lx="' + e(x.id) + '"');
      }, 'A Lixeira está vazia.');
  }
  ACOES['lx-rest'] = function (id) {
    if (semNet()) return;
    escreverResp('restaurarRegistro', [{ id: id }]).then(function (r) { aviso(r.msg || 'Restaurado.'); LX = null; render(); return atualizarFundo(true); }, function () {});
  };
  ACOES['lx-apagar'] = function (id) {
    if (semNet()) return;
    var x = ((LX && LX.itens) || []).filter(function (k) { return k.id === id; })[0] || { id: id };
    P.pedirTexto('Não dá para desfazer. Os dados de “' + (x.descricao || id) + '” somem (fica só o ID)' + (x.grupo ? ' – vale para o grupo ' + x.grupo + ' inteiro' : '') + '.', { titulo: 'Apagar ' + id + ' definitivamente?', rotulo: 'Digite APAGAR para confirmar', exigir: 'APAGAR', sim: 'Apagar definitivamente', perigo: true })
      .then(function (t) { if (t === null || t.trim() !== 'APAGAR') return aviso('Nada foi apagado.');
        escreverResp('apagarDefinitivo', [{ id: id, confirmar: 'APAGAR' }]).then(function (r) { aviso(r.msg || 'Apagado.'); LX = null; render(); }, function () {}); });
  };
  PRECISA['lx-rest'] = 'restaurarRegistro'; PRECISA['lx-apagar'] = 'apagarDefinitivo';

  // Leads: definirStatusLead (Convertido = converterLeadLink no servidor). Sem internet: fila + tela já atualizada.
  ACOES['lead-st'] = function (k) {
    var p = String(k).split('|'), row = Number(p[0]), st = p[1], l = (D.leadsLink || []).filter(function (x) { return x._row === row; })[0];
    (st === 'Convertido' ? perguntar('Converter “' + (l ? l.nome : row) + '” em cliente? O lead fica marcado como convertido (não é apagado).', { titulo: 'Converter lead', sim: '✅ Converter em cliente' }) : Promise.resolve(true)).then(function (ok) { if (!ok) return;
    escrever('definirStatusLead', [{ _row: row, status: st }], function (cache) { (cache.leadsLink || []).forEach(function (x) { if (x._row === row) { x.status = st; x.situacao = st; x.statusEm = Dif.agoraTxt(); } }); }); });
  };
  PRECISA['lead-st'] = 'definirStatusLead';
  function registrarLeadAberto(row, canal) {
    if (!api.pode('registrarMensagemAberta')) return;
    var marca = function (lst) { (lst || []).forEach(function (x) { if (x._row === row && situacaoLead(x) === 'Novo') { x.status = 'Contatado'; x.situacao = 'Contatado'; } }); };
    marca(D.leadsLink);
    api.escrever('registrarMensagemAberta', [{ lead: row, canal: canal || 'WhatsApp' }], function (cache) { marca(cache.leadsLink); })
      .then(function (r) { aviso(r.enfileirado ? 'Lead marcado como Contatado (envio quando voltar a internet).' : 'Lead marcado como Contatado.'); }, function () { /* registro é opcional */ });
  }

  // Pedir avaliação no Google: só com googleReviewUrl do servidor, só OS Entregue; regra LGPD das mensagens da OS.
  function botaoAvaliar(o) {
    var url = Dif.padroes(D).googleReviewUrl; if (!url || Dif.statusCanon(o.status) !== 'Entregue') return '';
    var c = V.clienteDaOS(D, o); if (Dif.naoContatar(c)) return '<span class="muted" id="avaliarBloq">⛔ Pedir avaliação: cliente marcado como “Não contatar”.</span>';
    return botao('⭐ Pedir avaliação no Google', 'os-avaliar', o._row, 'sec').replace(' peq', '');
  }
  // ---- v0.9.2: cobrança com Pix (OS com saldo e mensalidade do plano). Só abre o WhatsApp no toque; nada é cobrado sozinho. ----
  ACOES['os-cobrar'] = function (row) {
    var o = achar('os', row), c = V.clienteDaOS(D, o) || { nome: o.cliente }, sd = V.saldoOS(D, o);
    if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
    if (!(sd > 0)) return aviso('Esta OS não tem saldo a receber.');
    var pb = blocoPix(sd, o.num), nome = V.primeiroNome(c, o);
    var texto = 'Oi' + (nome ? ', ' + nome : '') + '! Passando para lembrar do valor em aberto da OS ' + o.num + (o.equipamento ? ' (' + o.equipamento + ')' : '') + ': *' + V.brl(sd) + '*.' +
      (pb ? '\n\n' + pb.texto : '') + '\n\nSe já pagou, me avisa por aqui que eu confiro. Obrigado!';
    var b = V.botaoWaCliente(c, 'os', texto);
    abrirMsg({ titulo: '💬 Cobrar · ' + o.num, texto: texto, pix: pb ? pb.codigo : '', waUrl: b ? b.href : '', aviso: b && b.aviso ? 'Sem consentimento LGPD: só mensagem sobre a OS.' : '', semWa: b ? '' : 'WhatsApp inválido: copie o texto.', cliente: c, os: o.num, osObj: o, tipo: 'cobranca' });
  };
  ACOES['ct-cobrar'] = function (id) {
    var k = ((CT && CT.contratos) || []).filter(function (x) { return x.id === id; })[0]; if (!k) return aviso('Contrato não encontrado.');
    var c = (D.clientes || []).filter(function (x) { return x.nome === k.cliente; })[0] || { nome: k.cliente };
    if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
    var comp = V.competenciaBR(k.competencia || D.hoje.slice(0, 7)), pb = blocoPix(Number(k.valor), k.id + String(k.competencia || D.hoje.slice(0, 7)).replace(/\D/g, '')), nome = V.primeiroNome(c);
    var texto = 'Oi' + (nome ? ', ' + nome : '') + '! Lembrete da mensalidade do plano ' + (k.plano || 'ProFix') + (comp ? ' (' + comp + ')' : '') + ': *' + V.brl(k.valor) + '*' +
      (k.vencimento ? ', com vencimento em ' + V.dataBR(k.vencimento) : '') + '.' + (pb ? '\n\n' + pb.texto : '') + '\n\nSe já pagou, me avisa por aqui que eu confiro. Obrigado!';
    var b = V.botaoWaCliente(c, 'os', texto);
    abrirMsg({ titulo: '💬 Mensalidade · ' + k.cliente, texto: texto, pix: pb ? pb.codigo : '', waUrl: b ? b.href : '', aviso: b && b.aviso ? 'Sem consentimento LGPD: só mensagem sobre o atendimento.' : '', semWa: b ? '' : 'WhatsApp inválido: copie o texto.', cliente: c, tipo: 'cobranca' });
  };
  /**
   * v0.9.2: peças encomendadas = cotações do Módulo 9 ligadas à OS (mesmo nome da peça do orçamento). O status da COTAÇÃO manda:
   * Cotado/Escolhido = ainda não comprou (compre só depois do Pix confirmado) · Comprado/Recebido = já comprou (custo já foi para o caixa uma vez).
   */
  function pecasAComprarOS(o) {
    var nomes = ORC.pecasEncomendadas(o && o.itensOrc); if (!nomes.length) return [];
    var cots = []; try { cots = m9Dados().cotacoes || []; } catch (x) { cots = []; }
    var rec = V.recebidoOS(D, o.num), aprovado = /^aprovado$/i.test(o.aprovacao || '');
    var chave = function (t) { return V.norm(t).replace(/\s+/g, ' ').trim(); };
    return nomes.map(function (n) {
      var lig = cots.filter(function (c) { return c.os === o.num && c.status !== 'Descartado' && chave(String(c.peca || c.componente || '') + (c.marca || c.marcaModelo ? ' ' + (c.marca || c.marcaModelo) : '')) === chave(n); })
        .sort(function (a, b) { var ord = { Recebido: 0, Comprado: 1, Escolhido: 2, Cotado: 3 }; return (ord[a.status] || 9) - (ord[b.status] || 9); })[0] || null;
      var comprada = !!lig && (lig.status === 'Comprado' || lig.status === 'Recebido');
      return { nome: n, cot: lig, comprada: comprada, podeComprar: !comprada && aprovado && rec > 0, aprovado: aprovado, recebido: rec };
    });
  }
  function linhaPecasComprar(o) {
    var l = pecasAComprarOS(o); if (!l.length) return '';
    return '<div id="osAComprar"><span class="muted">🛒 Peça encomendada:</span> ' + l.map(function (x) {
      var id = x.cot ? ' (' + e(x.cot.id) + ' · ' + e(x.cot.status) + ')' : ' (sem cotação ligada)';
      return '<b>' + e(x.nome) + '</b>' + id + ' – ' + (x.comprada ? '✅ já comprada' : x.podeComprar ? '<b>Pix confirmado: pode comprar</b> (🧾 Cotações › Comprado)' : 'compre só depois do Pix confirmado');
    }).join('; ') + '</div>';
  }
  /** Hoje: OS aprovadas e pagas com peça encomendada ainda não comprada. */
  function secaoPecasComprar() {
    var l = (D.os || []).filter(function (o) { return /^aprovado$/i.test(o.aprovacao || '') && String(o.itensOrc || '').indexOf(ORC.SUF_ENC) >= 0; })
      .map(function (o) { return { o: o, p: pecasAComprarOS(o).filter(function (x) { return x.podeComprar; }) }; }).filter(function (x) { return x.p.length; });
    if (!l.length) return '';
    return '<section id="pecasComprar"><h2>🛒 Peças para comprar (Pix confirmado)</h2>' + lista(l, function (x) {
      return card(e(x.o.num) + ' · ' + e(x.o.cliente), x.p.map(function (y) { return e(y.nome) + (y.cot ? ' · ' + e(y.cot.id) : ''); }).join('<br>'), tag('comprar', 'media'), botao('🧾 Cotações', 'os-cot', x.o._row) + botao('Abrir OS', 'os-abrir', x.o._row));
    }, '') + '</section>';
  }
  ACOES['os-avaliar'] = function (row) {
    var o = achar('os', row), c = V.clienteDaOS(D, o), url = Dif.padroes(D).googleReviewUrl || 'https://g.page/r/CZQuYc9gn5lJECE/review';
    if (Dif.statusCanon(o.status) !== 'Entregue') return aviso('Pedir avaliação só depois da OS entregue.');
    if (Dif.naoContatar(c)) return aviso(V.AVISO_NAO_CONTATAR);
    if (!c || c.consent !== 'Sim') return aviso('Sem consentimento LGPD: não envie pedido de avaliação.');
    var texto = V.textoAvaliacaoGoogle(c, o, url);
    var b = c ? V.botaoWaCliente(c, 'os', texto) : null;
    abrirMsg({ titulo: '⭐ Avaliação no Google · ' + o.num, texto: texto, waUrl: b ? b.href : '', semWa: b ? '' : 'WhatsApp inválido ou ausente.', cliente: c, os: o.num, osObj: o, tipo: 'avaliacao', emailOk: true, assuntoEmail: V.ASSUNTOS_MSG_EMAIL['pos-google'] });
  };

  // ---------- v0.8.5/0.8.6/0.8.7: teto MEI, painel financeiro, previsão, etiqueta QR, proposta, Suprimentos (Módulo 9) e Calculadora de PCs ----------
  var X = window.ProFix085, FINM = { mes: '' }, CMP = [];
  var M9K = 'profix.m9', PCK = 'profix.pcs';
  function lerJSON(k, pad) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? pad : v; } catch (x) { return pad; } }
  function lerM9() { return X.normLoja(lerJSON(M9K, null)); }
  function gravarM9(s) { localStorage.setItem(M9K, JSON.stringify(s)); }
  function lerPCs() { var l = lerJSON(PCK, []); return Array.isArray(l) ? l : []; }
  function gravarPCs(l) { localStorage.setItem(PCK, JSON.stringify(l)); }
  function copiar(t, ok) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { aviso(ok || 'Texto copiado.'); }, function () { aviso('Não deu para copiar: selecione o texto.'); }); }
  function cfgCalc() { return { pix: cfgPrecos().pix, taxas: (D.fin && D.fin.taxas) || [] }; }
  function pctTxt(n) { return String(n).replace('.', ',') + '%'; }

  // ---- 1) Teto MEI (Mais › Financeiro) ----
  function blocoMEI() {
    var t = X.tetoMEI(D, D.hoje), w = Math.min(100, t.pct);
    return '<section id="tetoMEI" class="card mei mei-' + t.nivel + '"><h2 style="margin-top:0">Teto do MEI ' + e(t.ano) + '</h2>' +
      '<div class="barra" role="progressbar" aria-label="Faturamento do ano em relação ao teto do MEI" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(w) + '"><span style="width:' + w + '%"></span><i style="left:' + t.alertaPct + '%" title="Alerta em ' + t.alertaPct + '%"></i></div>' +
      '<p id="meiValores"><b>' + V.brl(t.faturado) + '</b> de ' + V.brl(t.teto) + ' (' + pctTxt(t.pct) + ') · ' + (t.restante >= 0 ? 'faltam ' + V.brl(t.restante) : 'passou ' + V.brl(-t.restante)) + '</p>' +
      '<p class="muted" id="meiMedia">Média mensal: <b>' + V.brl(t.mediaMensal) + '</b> (o teto equivale a ' + V.brl(t.mensalRef) + '/mês).' + (t.restantePorMes != null && t.restante > 0 ? ' Para ficar dentro: até ' + V.brl(t.restantePorMes) + '/mês no resto do ano.' : '') +
      ' No ritmo atual o ano fecharia perto de ' + V.brl(t.projecaoAno) + ' (projeção, não é faturamento).</p>' +
      (t.nivel !== 'ok' ? '<p class="alerta" id="meiAviso">⚠️ ' + e(X.textoNivelMEI(t)) + '</p>' : '<p class="muted" id="meiAviso">' + e(X.textoNivelMEI(t)) + '</p>') +
      (t.revendaSemLancamento.length ? '<p class="alerta" id="meiRevenda">Revenda vendida sem lançamento no Financeiro: ' + e(t.revendaSemLancamento.join(', ')) + ' (' + V.brl(t.revendaSemLancamentoValor) + '). Lance para o teto ficar certo.</p>' : '') +
      (t.tetoPlanilha ? '<p class="muted" id="meiPlanilha">A planilha (Configurações) diz ' + V.brl(t.tetoPlanilha) + '. O App usa o teto oficial em vigor, ' + V.brl(t.teto) + '.</p>' : '') +
      '<p class="muted">Conta todas as Entradas do Financeiro do ano, inclusive revenda de usados. Teto oficial: R$ 81.000/ano. O novo teto (PLP 186/2026) ainda não é lei.</p></section>';
  }
  // ---- 2) Previsão pelas OS + 4) Painel financeiro ----
  function blocoPrevisao() {
    var p = X.previsaoOS(D);
    return '<section id="previsaoOS" class="card"><h2 style="margin-top:0">Previsão pelas OS abertas</h2><p class="muted">É previsão: só vira caixa quando o cliente paga.</p>' +
      '<div class="tiles">' + tile('A receber de OS com valor', V.brl(p.aReceber), 'prevReceber') + tile('Orçamentos aguardando resposta', V.brl(p.orcamentosPendentes), 'prevPendentes') + '</div>' +
      (p.confirmadas.length ? '<div class="m">' + p.confirmadas.map(function (o) { return e(o.num) + ' · ' + e(o.status) + ' · falta ' + V.brl(o.falta); }).join('<br>') + '</div>' : '<div class="m">Nenhuma OS aberta com valor a receber.</div>') + '</section>';
  }
  function linhaDRE(rot, v, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + rot + '</td><td>' + V.brl(v) + '</td></tr>'; }
  function tabelaDRE(d, id, tit) {
    return '<table class="dre" id="' + id + '"><caption>' + tit + '</caption>' + linhaDRE('Receita (entradas)', d.receita) + linhaDRE('(−) Custos diretos: peças e deslocamento', d.custos) +
      linhaDRE('= Margem bruta', d.margemBruta, 'sub') + linhaDRE('(−) Despesas: ferramentas, DAS, marketing, outros', d.despesas) + (d.outras ? linhaDRE('(−) Outras saídas', d.outras) : '') +
      linhaDRE('= Resultado', d.resultado, 'tot') + '</table>';
  }
  function blocoPainelFin() {
    var ym = FINM.mes || D.hoje.slice(0, 7), ini = ym + '-01', fim = ym + '-31', ano = ym.slice(0, 4);
    var dm = X.dre(D, ini, fim), da = X.dre(D, ano + '-01-01', ym === D.hoje.slice(0, 7) ? D.hoje : fim), ro = X.rosca(dm.saidasPorCat), ms = X.saldosMeses(D, ym, 6);
    var maior = ms.reduce(function (a, m) { return Math.max(a, Math.abs(m.saldo)); }, 0) || 1, prev = X.previsaoOS(D), t = X.tetoMEI(D, D.hoje);
    return '<section id="painelFin" class="card"><h2 style="margin-top:0">Painel financeiro</h2><div class="filtros"><input type="month" id="fFinMes" value="' + e(ym) + '" aria-label="Mês do painel"></div>' +
      '<div class="fin-grade"><div><h3>Custos do mês</h3>' + (ro ? '<div class="rosca" id="roscaCustos" style="background:' + ro.css + '" role="img" aria-label="Custos do mês por categoria"><span>' + V.brl(ro.total) + '</span></div><ul class="legenda">' +
        ro.partes.map(function (p) { return '<li><i style="background:' + p.cor + '"></i>' + e(p.cat) + ': ' + V.brl(p.valor) + ' (' + pctTxt(p.pct) + ')</li>'; }).join('') + '</ul>' : '<p class="muted" id="roscaCustos">Sem saídas lançadas neste mês.</p>') + '</div>' +
      '<div><h3>Saldo por mês</h3><div class="barras" id="saldoMeses">' + ms.map(function (m) { return '<div class="bm"><span class="muted">' + e(m.mes.slice(5, 7) + '/' + m.mes.slice(2, 4)) + '</span><div class="bt"><b class="' + (m.saldo < 0 ? 'neg' : '') + '" style="width:' + Math.round(Math.abs(m.saldo) / maior * 100) + '%"></b></div><span>' + V.brl(m.saldo) + '</span></div>'; }).join('') + '</div></div></div>' +
      '<h3>DRE MEI simples</h3><div class="fin-grade">' + tabelaDRE(dm, 'dreMes', 'Mês ' + ym.slice(5, 7) + '/' + ano) + tabelaDRE(da, 'dreAno', 'Ano até agora (' + ano + ')') + '</div>' +
      '<p class="muted" id="dreTeto">Faturamento do ano × teto do MEI: ' + V.brl(t.faturado) + ' de ' + V.brl(t.teto) + ' (' + pctTxt(t.pct) + '). Pró-labore não entra aqui: lance como saída se quiser ver.</p>' +
      '<p class="muted" id="caixaProj">Caixa projetado do mês: saldo ' + V.brl(V.resumoMes(D, ym).saldo) + ' + a receber de OS ' + V.brl(prev.aReceber) + ' = <b>' + V.brl(V.resumoMes(D, ym).saldo + prev.aReceber) + '</b> (previsão). Contas a pagar futuras não estão no App.</p>' +
      '<p class="muted">Cartões PF/PJ: o Financeiro do App ainda não separa PF e PJ (relatórios ficam com Analista/Financeiro).</p></section>';
  }

  // ---- 3) Etiqueta QR ----
  ACOES['os-qr'] = function (row) {
    var o = achar('os', row);
    formulario('🏷 Etiqueta QR · ' + e(o.num), [{ k: 'modo', r: 'O que o QR guarda', t: 'select', o: ['Só o número da OS', 'Link do WhatsApp da ProFix com o nº da OS'], req: true }], { modo: 'Só o número da OS' },
      '<p class="muted">O QR não leva nome, telefone nem endereço do cliente (LGPD). Gerado no aparelho, sem serviço externo.</p>').then(function (v) {
      if (!v) return; var modo = /WhatsApp/.test(v.modo) ? 'wa' : 'id', html = X.etiquetaHtml(o, modo, CFG.WHATSAPP_LOJA), svg = X.qrSvg(X.conteudoEtiqueta(o, modo, CFG.WHATSAPP_LOJA), 400);
      var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), m = $('modal');
      m.innerHTML = '<form method="dialog" class="detalhe laudo"><h2 style="margin:0">🏷 Etiqueta · ' + e(o.num) + '</h2><p class="muted" id="etqConteudo">QR: ' + e(X.conteudoEtiqueta(o, modo, CFG.WHATSAPP_LOJA)) + '</p>' +
        '<div class="grandes"><button type="button" class="btn" id="bImprEtq">🖨️ Imprimir</button><a class="btn sec" id="bBaixarEtq" download="etiqueta-' + e(o.num) + '.svg" href="' + url + '">⬇️ Baixar QR (imagem)</a><button class="btn sec" value="fechar">Fechar</button></div><iframe id="etqFrame" class="etq" title="Etiqueta QR" sandbox="allow-same-origin allow-modals"></iframe></form>';
      $('etqFrame').srcdoc = html; m.onclose = function () { URL.revokeObjectURL(url); m.onclose = null; }; m.returnValue = ''; m.showModal();
      $('bImprEtq').onclick = function () { try { $('etqFrame').contentWindow.print(); } catch (x) { aviso('Não deu para imprimir neste aparelho.'); } };
    });
  };

  // ---- 5) Proposta comercial ----
  ACOES['pl-proposta'] = function (nome) {
    var p = V.planoOficial(nome); if (!p) return;
    formulario('📄 Proposta · Plano ' + e(p.nome), [{ k: 'cliente', r: 'Empresa / cliente', req: true }, { k: 'contato', r: 'Contato (opcional)' },
      { k: 'maquinas', r: 'Computadores', t: 'number', ajuda: p.valorPorPc ? 'Mínimo ' + p.pcsMin + '. ' + e(V.brl(p.valorPorPc)) + ' por PC.' : 'Até ' + p.pcs + ' no plano; cada um a mais: ' + e(V.brl(cfgPrecos().extra)) + '/mês.' },
      { k: 'anual', r: 'Contrato anual (' + e(String(cfgPrecos().anual)) + '% de desconto, do CRM)', t: 'checkbox' }, { k: 'validadeDias', r: 'Validade (dias)', t: 'number' }, { k: 'obs', r: 'Observações', t: 'textarea' }],
      { maquinas: String(p.pcs || p.pcsMin), validadeDias: '7' }).then(function (v) {
      if (!v) return; var r;
      try { r = X.proposta(Object.assign({ plano: p.nome }, v), { pix: cfgPrecos().pix, anual: cfgPrecos().anual, extra: cfgPrecos().extra }, D.hoje); } catch (er) { return aviso(er.message); }
      var m = $('modal');
      m.innerHTML = '<form method="dialog" class="detalhe laudo" id="fProposta"><h2 style="margin:0">📄 Proposta · ' + e(r.plano) + '</h2><p class="muted" id="propResumo">' + e(V.brl(r.valor)) + '/mês' + (r.anual ? ' · anual ' + e(V.brl(r.mensalAnual)) + '/mês (12 meses ' + e(V.brl(r.total12)) + ')' : '') + ' · válida até ' + e(V.dataBR(r.validade)) + '</p>' +
        '<div class="grandes"><button type="button" class="btn" id="bImprProp">🖨️ Imprimir / PDF</button><button type="button" class="btn sec" id="bCopProp">📋 Copiar texto</button><button class="btn sec" value="fechar">Fechar</button></div>' +
        '<p class="muted">Para PDF: Imprimir › Salvar como PDF. Nada é enviado: você manda para o cliente.</p><iframe id="propFrame" title="Proposta comercial" sandbox="allow-same-origin allow-modals"></iframe></form>';
      $('propFrame').srcdoc = r.html; m.onclose = null; m.returnValue = ''; m.showModal();
      $('bImprProp').onclick = function () { try { $('propFrame').contentWindow.print(); } catch (x) { aviso('Não deu para imprimir neste aparelho.'); } };
      $('bCopProp').onclick = function () { copiar(r.texto); };
    });
  };

  // ---- 7) Suprimentos: cotações e insumos de bancada ----
  // v0.8.6/0.8.7: com o servidor aceitando as rotas do Módulo 9 (API @113/@115), tudo fica NO CRM (planilha): celular e PC veem o mesmo.
  // Sem internet: última cópia do CRM (com aviso) e nada é gravado. Servidor sem as rotas: igual à 0.8.5 (só no aparelho, profix.m9).
  var M9C = 'profix.m9crm', M9ENV = 'profix.m9envio', M9BK = 'profix.m9.copia';
  var M9 = { pendente: true, carregando: null, cache: lerJSON(M9C, null), offline: false, erro: '' };
  var M9_CRM = ['listarCotacoes', 'listarInsumos', 'salvarCotacao', 'mudarStatusCotacao', 'salvarInsumo'];
  function m9UsaCRM() { return M9_CRM.every(function (a) { return api.pode(a); }); }
  function m9Rota() { var r = rota(); return r.tela === 'mais' && (r.sub === 'suprimentos' || r.sub === 'calculadora'); }
  function gravarM9C() { try { localStorage.setItem(M9C, JSON.stringify(M9.cache)); } catch (x) {} }
  function semRede() { return typeof navigator !== 'undefined' && navigator.onLine === false; }
  /** Lê fornecedores, cotações e insumos do CRM e guarda a cópia (para abrir sem internet). */
  function carregarM9(forcar) {
    if (!m9UsaCRM()) { M9.pendente = false; return Promise.resolve(); }
    if (M9.carregando && !forcar) return M9.carregando;
    if (semRede()) { M9.pendente = false; M9.offline = true; return Promise.resolve(); }
    var forn = api.pode('listarFornecedores') ? api.ler('listarFornecedores', []).catch(function () { return M9.cache ? M9.cache.fornecedores : null; }) : Promise.resolve(null);
    var p = M9.carregando = Promise.all([forn, api.ler('listarCotacoes', [{}]), api.ler('listarInsumos', [])]).then(function (r) {
      M9.cache = { quando: new Date().toISOString(), fornecedores: Array.isArray(r[0]) ? r[0] : null, cotacoes: Array.isArray(r[1]) ? r[1] : [], insumos: Array.isArray(r[2]) ? r[2] : [] };
      gravarM9C(); M9.offline = false; M9.erro = '';
    }, function (er) { M9.offline = true; M9.erro = er && er.doServidor ? er.message : 'Sem conexão com o CRM.'; })
      .then(function () { if (M9.carregando === p) M9.carregando = null; M9.pendente = false; if (m9Rota() && D) render(); });
    return p;
  }
  /** O que a tela mostra. modo: 'crm' (dados do CRM, talvez da cópia offline) | 'espera' (CRM ligado, ainda sem cópia) | 'local' (0.8.5). */
  function m9Dados() {
    var usa = m9UsaCRM();
    if (usa && M9.cache) {
      var fl = X.normFornecedores(M9.cache.fornecedores); if (fl && !fl.length) fl = null;
      return { modo: 'crm', fornecedores: fl, cotacoes: (M9.cache.cotacoes || []).map(function (c) { return X.cotDoCRM(c, D.hoje); }),
        insumos: (M9.cache.insumos || []).map(function (i) { return X.insumoDoCRM(i, fl); }), offline: M9.offline || semRede(), quando: M9.cache.quando };
    }
    var s = lerM9(); return { modo: usa ? 'espera' : 'local', fornecedores: fornecedoresCRM(), cotacoes: s.cotacoes, insumos: s.insumos, offline: M9.offline || semRede() };
  }
  function m9PodeGravar(s) {
    if (s.modo === 'local') return true;
    if (s.modo === 'espera') { aviso(M9.carregando ? 'Buscando os dados no CRM… tente de novo em instantes.' : 'Ainda sem resposta do CRM. Conecte à internet e abra de novo. Nada foi salvo.'); if (!M9.carregando) carregarM9(); return false; }
    if (semRede()) { aviso('Sem internet: nada foi salvo. Cotações e insumos ficam no CRM; conecte e tente de novo.'); return false; }
    return true;
  }
  /** Escrita no CRM (sempre online, com idOperacao do api.js). Erro do servidor: a mensagem dele aparece igual. */
  function m9Gravar(acao, obj) {
    return api.escrever(acao, [obj]).then(function (r) { return (r && r.dados) || {}; }, function (er) {
      if (!er.doServidor && er.codigo !== 'TOKEN_INVALIDO' && er.codigo !== 'SEM_TOKEN' && !/Sem internet|liberada/.test(er.message || '')) { var n = new Error('Sem conexão com o CRM: nada foi salvo. Tente de novo com internet.'); n.rede = true; throw n; }
      throw er;
    });
  }
  function m9Upsert(lista, obj) {
    if (!M9.cache || !obj || !obj.id) return; var l = M9.cache[lista] = M9.cache[lista] || [], i = l.findIndex(function (x) { return x.id === obj.id; });
    if (i < 0) l.push(obj); else l[i] = obj; gravarM9C();
  }
  /** Lista de fornecedores (id + nome) que veio do CRM; em 'local', só se um dia o getDados mandar. */
  function fornecedoresCRM() { return X.normFornecedores(Array.isArray(D.fornecedores) && D.fornecedores.length ? D.fornecedores.map(function (f) { return { id: f.id || f.ID, nome: f.nome || f.Nome, ativo: f.ativo != null ? f.ativo : f['Ativo?'] }; }) : null); }
  function nomeForn(id, fl, alt) { var f = fl && fl.filter(function (x) { return x.id === id; })[0]; return f ? X.rotuloForn(f) : id ? id + (alt ? ' · ' + alt : '') : (alt || '—'); }
  function osAbertasNums() { return (D.os || []).filter(function (o) { return ['Entregue', 'Cancelado'].indexOf(o.status) < 0; }).map(function (o) { return o.num; }); }
  function brlOu(v) { return isFinite(v) && v !== null && v !== '' ? V.brl(v) : '—'; }
  function cardCot(c, naOS, s) {
    var ok = X.cotacaoValida(c, D.hoje), crm = s.modo === 'crm', fonte = /^https?:\/\//i.test(c.fonte) ? '<a href="' + e(c.fonte) + '" target="_blank" rel="noopener noreferrer">fonte</a>' : 'fonte: ' + e(c.fonte || '—');
    var acoes = (naOS && ok && c.status === 'Cotado' ? botao('✅ Escolher', 'cot-esc', c.id, '') : '') + (crm && c.status === 'Comprado' ? '' : botao('Mudar status', 'cot-st', c.id)) +
      (crm && (c.status === 'Cotado' || c.status === 'Escolhido') ? botao('Editar', 'cot-editar', c.id) : '');
    return card(e(c.id) + ' · ' + e(c.peca) + (c.marca ? ' ' + e(c.marca) : ''), (naOS ? '' : e(c.os) + ' · ') + e(nomeForn(c.fornecedor, s.fornecedores, c.fornecedorNome)) + (c.condicao ? ' · ' + e(c.condicao) : '') + ' · ' + c.qtd + '× ' + brlOu(c.unit) + ' + frete ' + V.brl(c.frete) +
      '<br><b>Custo posto em Sorocaba: ' + brlOu(c.custoPosto) + '/un.</b>' + (c.prazo !== '' ? ' · prazo ' + e(c.prazo) + ' dia(s)' : '') + (c.forma ? ' · ' + e(c.forma) : '') + '<br>Vale até ' + (c.validade ? V.dataBR(c.validade) : '—') + ' · ' + fonte + (c.garantia ? ' · garantia: ' + e(c.garantia) : '') + (crm && c.obs ? '<br><span class="muted">' + e(c.obs) + '</span>' : ''),
      tag(c.status, c.status === 'Escolhido' ? 'ok' : c.status === 'Descartado' ? 'cinza' : c.status === 'Comprado' || c.status === 'Recebido' ? 'azul' : '') + (ok ? '' : tag('Vencida', 'cinza')),
      acoes, ' data-cot="' + e(c.id) + '"' + (ok ? '' : ' style="opacity:.55"'));
  }
  function quandoTxt(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  function m9Topo(s) {
    if (s.modo === 'crm') return s.offline
      ? '<p class="alerta" id="m9Sync">Sem conexão com o CRM: mostrando a última cópia (' + e(quandoTxt(s.quando)) + '). Pode estar desatualizada e nada é salvo até voltar a internet.</p>'
      : '<p class="muted" id="m9Sync">Salvo no CRM (planilha): o celular e o PC veem as mesmas cotações e insumos. Atualizado ' + e(quandoTxt(s.quando)) + '.</p>';
    if (s.modo === 'espera') return M9.carregando ? '<p class="muted" id="m9Sync">Buscando cotações e insumos no CRM…</p>'
      : '<p class="alerta" id="m9Sync">Sem conexão com o CRM e ainda sem cópia neste aparelho. Abaixo, só o que estava guardado aqui (não enviado). Conecte para ver o CRM.</p>';
    return '<p class="alerta" id="m9Local">Guardado só neste aparelho. O servidor ainda não aceita Cotações/Insumos do App. Use “Exportar” para não perder.</p>';
  }
  function m9BlocoEnvio(s) {
    if (s.modo !== 'crm') return '';
    var bruto = lerJSON(M9K, null); if (!bruto || !X.temDadosLocais(bruto)) return '';
    var env = lerJSON(M9ENV, null) || {}, copia = botao('📦 Cópia do aparelho (JSON)', 'm9-exp-local', '');
    if (env.concluido) return '<div class="card" id="m9Enviado"><div class="m">Os dados antigos deste aparelho foram enviados ao CRM em ' + e(quandoTxt(env.concluido)) + (env.resumo ? ' (' + e(env.resumo) + ')' : '') + '.' +
      ((env.avisos || []).length ? '<br>Atenção: ' + env.avisos.map(e).join('; ') + '.' : '') + ' A cópia continua guardada aqui.</div><div class="acoes">' + copia + '</div></div>';
    var pl = X.planoEnvioCRM(bruto, M9.cache, s.fornecedores, D.hoje, env), pul = pl.pulados.length ? '<br>Não vão: ' + pl.pulados.map(function (p) { return e(p.id + ' (' + p.motivo + ')'); }).join('; ') + '.' : '';
    if (!pl.cotacoes.length && !pl.insumos.length) return '<div class="card" id="m9Envio"><b>Dados antigos deste aparelho</b><div class="m">Este aparelho ainda tem cotações/insumos da versão anterior. O CRM já tem dados, então vale o CRM (nada é misturado). Guarde a cópia, se quiser conferir.' + pul + '</div><div class="acoes">' + copia + '</div></div>';
    return '<div class="card" id="m9Envio"><b>Dados antigos deste aparelho</b><div class="m">' + pl.cotacoes.length + ' cotação(ões) e ' + pl.insumos.length + ' insumo(s) estavam só neste aparelho. Toque em “Enviar ao CRM” (uma vez) para levar à planilha.' + pul + '</div><div class="acoes">' + botao('📤 Enviar ao CRM', 'm9-enviar', '', '') + copia + '</div></div>';
  }
  function telaSuprimentos() {
    if (M9.pendente && m9UsaCRM()) carregarM9();
    var s = m9Dados(), fl = s.fornecedores, crm = s.modo === 'crm';
    var cots = s.cotacoes.slice().sort(function (a, b) { return String(b.data) < String(a.data) ? -1 : String(b.data) > String(a.data) ? 1 : (b.id < a.id ? -1 : 1); });
    return m9Topo(s) + m9BlocoEnvio(s) +
      '<div class="row">' + botao('+ Nova cotação', 'cot-nova', '', '') + botao('+ Item de bancada', 'in-novo', '') + botao('📤 Exportar (JSON)', 'm9-exp', '') + '</div>' +
      (fl ? '' : '<p class="muted" id="m9Forn">Fornecedor: digite o código da lista do CRM (FN-0001 a FN-0197). ' + (crm ? 'A lista com nomes não chegou do CRM agora.' : 'A lista com nomes ainda não chega ao App.') + '</p>') +
      '<h2>🧰 Insumos de bancada</h2>' + lista(s.insumos, function (i) {
        var u = X.ultimoCustoInsumo(s.cotacoes, i.item);
        return card(e(i.item), 'Qtd atual: <b>' + (i.qtd === '' ? '—' : e(i.qtd)) + '</b> · Mínimo: ' + (i.minimo === '' ? '—' : e(i.minimo)) + '<br>Último custo: ' + (u ? V.brl(u.custo) + ' (' + e(u.id) + ', ' + V.dataBR(u.data) + ')' : '—') +
          ' · Fornecedor habitual: ' + (i.fornecedor || i.fornecedorNome ? e(nomeForn(i.fornecedor, fl, i.fornecedorNome)) : '—') + (crm ? '' : ' · Última compra: ' + (i.ultimaCompra ? V.dataBR(i.ultimaCompra) : '—')),
          X.repor(i) ? tag('Repor', 'alta') : '', botao('Editar', 'in-editar', i.id) + botao('Cotar', 'cot-nova', 'Insumo|' + i.item), ' data-insumo="' + e(i.id) + '"');
      }, crm ? 'Nenhum insumo no CRM ainda. Toque em “+ Item de bancada” (com a quantidade atual) para começar.' : 'Nenhum item.') +
      (!crm && (D.estoque || []).length ? '<h3>Estoque da planilha (só leitura)</h3>' + lista(D.estoque, function (i) { var mi = Number(i.minimo); return card(e(i.item), 'Qtd ' + e(i.qtd) + (i.minimo !== '' && i.minimo != null ? ' · mín. ' + e(i.minimo) : '') + (i.custo ? ' · custo ' + V.brl(i.custo) : ''), mi > 0 && Number(i.qtd) <= mi ? tag('Repor', 'alta') : '', ''); }, '') : '') +
      '<h2>🧾 Cotações (' + cots.length + ')</h2><p class="muted">Cada cotação precisa de fonte e validade (padrão 3 dias para loja online). Vencida fica cinza e não entra na Calculadora.</p>' +
      lista(cots, function (c) { return cardCot(c, false, s); }, 'Nenhuma cotação ainda. O histórico começa vazio: nenhum preço de fornecedor foi confirmado.');
  }
  function campoFornecedor(fl, atual, insumo) {
    return fl ? { k: 'fornecedor', r: insumo ? 'Fornecedor habitual (lista do CRM)' : 'Fornecedor (lista do CRM)', t: 'select', o: X.opcoesFornecedor(fl, atual).map(function (f) { return f.rotulo; }), req: !insumo, ajuda: 'Só fornecedores ativos. Fornecedor novo: cadastre no painel do CRM.' }
      : { k: 'fornecedor', r: insumo ? 'Fornecedor habitual (código FN-xxxx)' : 'Fornecedor (código do CRM)', req: !insumo, ajuda: insumo ? '' : 'Ex.: FN-0001. Não cadastre fornecedor solto.' };
  }
  function rotuloAtual(fl, id) { var f = fl && fl.filter(function (x) { return x.id === X.idDoRotulo(id); })[0]; return f ? X.rotuloForn(f) : (fl ? '' : id || ''); }
  function reabrirCotOS(os) { if (!os || os === 'Insumo' || $('modal').open) return; var o = (D.os || []).filter(function (x) { return x.num === os; })[0]; if (o) ACOES['os-cot'](o._row); }
  function formCotacao(pre, erroMsg) {
    pre = pre || {}; var s = m9Dados(); if (!m9PodeGravar(s)) return;
    var crm = s.modo === 'crm', fl = s.fornecedores, edit = crm && !!pre.id, osOpc = ['Insumo'].concat(osAbertasNums());
    if (pre.os && osOpc.indexOf(pre.os) < 0) osOpc.push(pre.os);
    var val = Object.assign({ qtd: '1', frete: '0', validade: V.somaDias(D.hoje, X.VALIDADE_ONLINE_DIAS) }, pre); if (!val.condicao) val.condicao = 'Novo';
    val.fornecedor = rotuloAtual(fl, val.fornecedor);
    formulario(edit ? '🧾 Editar ' + e(pre.id) : '🧾 Nova cotação', [{ k: 'os', r: 'OS vinculada', t: 'select', o: osOpc, req: true, ajuda: 'Peça só se compra depois do orçamento aprovado e pago (ou sinal).' },
      campoFornecedor(fl, pre.fornecedor, false), { k: 'peca', r: 'Peça / item', req: true }, { k: 'marca', r: 'Marca / modelo' },
      { k: 'condicao', r: 'Condição', t: 'select', o: X.CONDICOES, req: true }, { k: 'autorizadoUsado', r: 'Cliente autorizou peça usada/recondicionada', t: 'checkbox' },
      { k: 'qtd', r: 'Qtd', t: 'number', req: true }, { k: 'unit', r: 'Preço unitário (R$)', t: 'number', req: true }, { k: 'frete', r: 'Frete (R$)', t: 'number', ajuda: '0 se for retirada.' },
      { k: 'prazo', r: 'Prazo de entrega (dias)', t: 'number' }, { k: 'forma', r: 'Forma de pagamento', t: 'select', o: X.FORMAS_FORN }, { k: 'validade', r: 'Validade', t: 'date', req: true, ajuda: 'Padrão: 3 dias (loja online) ou a validade do fornecedor.' },
      { k: 'fonte', r: 'Fonte (link, “e-mail de dd/mm” ou print)', req: true }, { k: 'garantia', r: 'Garantia do fornecedor' }], val,
      crm ? '<p class="muted" id="cotNoCrm">Vai direto para o CRM. O custo posto em Sorocaba é recalculado pelo servidor.</p>' : '').then(function (v) {
      if (!v) return; v.fornecedor = X.idDoRotulo(v.fornecedor); var tent = Object.assign({}, pre, v), c;
      try { c = X.validarCotacao(Object.assign({ data: edit ? (pre.data || D.hoje) : D.hoje }, v), { hoje: D.hoje, osNums: osOpc.slice(1), fornecedores: fl }); } catch (er) { aviso(er.message); return formCotacao(tent, er.message); }
      if (!crm) {
        var sl = lerM9(); c.id = X.proxId(sl.cotacoes, 'CT-'); sl.cotacoes.push(c); gravarM9(sl); aviso('Cotação ' + c.id + ' salva: ' + V.brl(c.custoPosto) + '/un. posto em Sorocaba.'); render(); reabrirCotOS(c.os); return;
      }
      if (edit) { c.id = pre.id; c.origem = 'crm'; c.obs = pre.obs || ''; }
      m9Gravar('salvarCotacao', X.cotParaCRM(c)).then(function (d) {
        if (d.cotacao) { m9Upsert('cotacoes', d.cotacao); var n = X.cotDoCRM(d.cotacao, D.hoje); aviso('Cotação ' + n.id + ' salva no CRM: ' + brlOu(n.custoPosto) + '/un. posto em Sorocaba.'); }
        else aviso(d.msg || 'Salvo.');
        render(); reabrirCotOS(c.os); carregarM9(true);
      }, function (er) { aviso('Não salvou: ' + er.message); formCotacao(tent, er.message); });
    });
    if (erroMsg && $('fErro')) $('fErro').textContent = erroMsg;
  }
  ACOES['cot-nova'] = function (k) { k = String(k || ''); var pre = {}; if (/^Insumo\|/.test(k)) { pre.os = 'Insumo'; pre.peca = k.slice(7); } else if (k) pre.os = k; formCotacao(pre); };
  ACOES['cot-editar'] = function (id) {
    var s = m9Dados(), c = s.cotacoes.filter(function (x) { return x.id === id; })[0]; if (!c || s.modo !== 'crm') return;
    if (['Cotado', 'Escolhido'].indexOf(c.status) < 0) return aviso('Cotação ' + c.id + ' está como ' + c.status + ': não dá para editar.');
    formCotacao({ id: c.id, data: c.data, os: c.os, fornecedor: c.fornecedor, peca: c.peca, marca: c.marca, condicao: c.condicao, autorizadoUsado: /CDC art\. 21/.test(c.obs), qtd: String(c.qtd), unit: isFinite(c.unit) ? String(c.unit) : '',
      frete: String(c.frete), prazo: c.prazo, forma: c.forma, validade: c.validade, fonte: c.fonte, garantia: c.garantia, obs: c.obs });
  };
  ACOES['os-cot'] = function (row) {
    var o = achar('os', row), s = m9Dados(), cmp = X.compararOS(s.cotacoes, o.num, D.hoje), rec = V.recebidoOS(D, o.num), m = $('modal');
    m.innerHTML = '<form method="dialog" class="detalhe" id="fCotOS"><h2 style="margin:0">🧾 Cotações · ' + e(o.num) + '</h2>' + (s.modo === 'crm' && s.offline ? '<p class="alerta">Cópia do CRM sem internet: pode estar desatualizada.</p>' : '') +
      (rec > 0 ? '<p class="muted" id="cotPago">Recebido do cliente: ' + V.brl(rec) + '.</p>' : '<p class="alerta" id="cotPago">OS sem pagamento registrado. Compre a peça só depois do orçamento aprovado e pago (ou sinal).</p>') +
      '<p class="muted">Válidas, da mais barata para a mais cara (custo posto em Sorocaba).</p><div id="cotValidas">' + lista(cmp.validas, function (c) { return cardCot(c, true, s); }, 'Nenhuma cotação válida para esta OS.') + '</div>' +
      (cmp.vencidas.length ? '<details id="cotVencidas"><summary>Vencidas / descartadas (' + cmp.vencidas.length + ')</summary>' + lista(cmp.vencidas, function (c) { return cardCot(c, true, s); }, '') + '</details>' : '') +
      '<div class="grandes">' + botao('+ Cotação para esta OS', 'cot-nova', o.num, '').replace(' peq', '') + '<button class="btn sec" value="fechar">Fechar</button></div></form>';
    m.onclose = null; m.returnValue = ''; m.showModal(); ligarAcoes(m, true);
  };
  ACOES['cot-esc'] = function (id) {
    var s = m9Dados(); if (!m9PodeGravar(s)) return;
    var copia = JSON.parse(JSON.stringify(s.cotacoes)), c; try { c = X.escolher(copia, id, D.hoje); } catch (er) { return aviso(er.message); }
    if (s.modo === 'local') { var sl = lerM9(); X.escolher(sl.cotacoes, id, D.hoje); gravarM9(sl); aviso(c.id + ' escolhida.'); render(); return reabrirCotOS(c.os); }
    m9Gravar('mudarStatusCotacao', { id: id, status: 'Escolhido' }).then(function (d) {
      if (d.cotacao) m9Upsert('cotacoes', d.cotacao); aviso(d.msg || c.id + ' escolhida.');
      return carregarM9(true).then(function () { render(); reabrirCotOS(c.os); });
    }, function (er) { aviso('Não mudou: ' + er.message); });
  };
  ACOES['cot-st'] = function (id) {
    var s = m9Dados(), crm = s.modo === 'crm', c = s.cotacoes.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    if (crm && c.status === 'Comprado') return aviso('Cotação ' + c.id + ' já está como Comprado: o status não muda mais (evita lançar o caixa duas vezes).');
    if (!m9PodeGravar(s)) return;
    formulario('Status da ' + e(c.id), [{ k: 'status', r: 'Novo status', t: 'select', o: crm ? X.STATUS_COT_CRM : X.STATUS_COT, req: true }], { status: c.status }).then(function (v) {
      if (!v || v.status === c.status) return;
      var copia = JSON.parse(JSON.stringify(s.cotacoes)); try { X.mudarStatus(copia, id, v.status, D.hoje); } catch (er) { return aviso(er.message); } // mesmas regras antes de chamar o servidor
      var seguir = v.status === 'Comprado' && X.avisoOSNaoPaga(c, V.recebidoOS(D, c.os))
        ? perguntar('A ' + c.os + ' não tem pagamento do cliente registrado. A regra é pagar o fornecedor só depois de receber. Marcar como comprado mesmo assim?', { titulo: '⚠️ OS sem pagamento', sim: 'Marcar comprado', perigo: true })
        : Promise.resolve(true);
      seguir.then(function (ok) {
        if (!ok) return aviso('Nada mudou.');
        if (!crm) return statusLocal(id, v.status);
        var total = isFinite(c.total) ? c.total : X.totalCompra(c), cats = X.categoriasSaida(D.categoriasFin), cat = cats.indexOf('Compra de peça') >= 0 ? 'Compra de peça' : cats[0];
        var pedir = v.status !== 'Comprado' ? Promise.resolve({ lancar: false }) : !api.pode('salvarLancamento') ? Promise.resolve({ lancar: false, semCaixa: true })
          : formulario('Lançar a compra no caixa?', [{ k: 'lancar', r: 'Lançar saída de ' + V.brl(total) + ' no Financeiro (junto com o Comprado)', t: 'checkbox' }, { k: 'categoria', r: 'Categoria', t: 'select', o: cats, req: true }], { lancar: true, categoria: cat },
            '<p class="muted">O CRM grava o Comprado e a Saída juntos. Depois de Comprado, o status não muda mais.</p>');
        pedir.then(function (l) {
          if (!l) return aviso('Nada mudou.');
          var args = { id: id, status: v.status }; if (l.lancar) args.lancarCaixa = { categoria: l.categoria };
          // v0.9.3 (Compras): "Comprado" só aparece DEPOIS da confirmação do CRM; enquanto isso o botão mostra "enviando…" (evita comprar duas vezes).
          var kEnv = 'cot-st|' + id; ENVIANDO[kEnv] = v.status + ' enviando…'; aviso(c.id + ': ' + v.status + ' enviando… só conta quando o CRM confirmar.'); renderSuave();
          m9Gravar('mudarStatusCotacao', args).then(function (d) {
            delete ENVIANDO[kEnv];
            if (d.cotacao) m9Upsert('cotacoes', d.cotacao);
            aviso((d.msg || c.id + ': ' + v.status + '.') + (v.status === 'Comprado' && !l.lancar ? ' Compra marcada sem lançamento no Financeiro.' : ''));
            carregarM9(true).then(function () { if (d.financeiro) atualizarFundo(true); else render(); });
          }, function (er) { delete ENVIANDO[kEnv]; aviso('Não mudou: ' + er.message); render(); });
        });
      });
    });
  };
  /** 0.8.5 (sem CRM): status e caixa no aparelho, saída pelo salvarLancamento. */
  function statusLocal(id, st) {
    var s = lerM9(), c = s.cotacoes.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    try { X.mudarStatus(s.cotacoes, id, st, D.hoje); } catch (er) { return aviso(er.message); }
    if (st === 'Recebido') X.receberInsumo(s, c, D.hoje);
    gravarM9(s); aviso(c.id + ': ' + st + '.'); render();
    if (st !== 'Comprado') return;
    var cats = D.categoriasFin || [], cat = cats.indexOf('Compra de peça') >= 0 ? 'Compra de peça' : (cats[0] || '');
    if (!api.pode('salvarLancamento')) return aviso('Lance a saída de ' + V.brl(X.totalCompra(c)) + ' no Financeiro pela planilha.');
    formulario('Lançar a compra no caixa?', [{ k: 'lancar', r: 'Lançar saída de ' + V.brl(X.totalCompra(c)) + ' no Financeiro', t: 'checkbox' }, { k: 'categoria', r: 'Categoria', t: 'select', o: cats, req: true }], { lancar: true, categoria: cat }).then(function (l) {
      if (!l || !l.lancar) return aviso('Compra marcada sem lançamento no Financeiro.');
      var n = X.lancamentoCompra(c, D.hoje, l.categoria);
      escrever('salvarLancamento', [n], function (cache) { (cache.financeiro = cache.financeiro || []).push(Object.assign({ _row: 0 }, n)); }).then(function () { var s2 = lerM9(), c2 = s2.cotacoes.filter(function (x) { return x.id === id; })[0]; if (c2) { c2.lancadoCaixa = D.hoje; gravarM9(s2); } });
    });
  }
  ACOES['in-editar'] = function (id) {
    var s = m9Dados(), crm = s.modo === 'crm'; if (!m9PodeGravar(s)) return;
    var i = s.insumos.filter(function (x) { return x.id === id; })[0] || {}, fl = s.fornecedores, val = Object.assign({}, i, { fornecedor: rotuloAtual(fl, i.fornecedor) });
    var campoF = campoFornecedor(fl, i.fornecedor, true); if (crm && !fl && i.fornecedorNome && !i.fornecedor) campoF.ajuda = 'No CRM hoje: ' + e(i.fornecedorNome) + '. Deixe vazio para manter.';
    formulario(id ? 'Insumo · ' + e(i.item) : '+ Item de bancada', [{ k: 'item', r: 'Item', req: true }, { k: 'qtd', r: 'Qtd atual', t: 'number', req: crm, ajuda: crm ? 'O CRM precisa da quantidade (0 se acabou).' : '' },
      { k: 'minimo', r: 'Mínimo (você define)', t: 'number', ajuda: 'Sem mínimo, não alerta “Repor”.' }, campoF], val).then(function (v) {
      if (!v) return;
      if (crm) {
        var args; try { args = X.insumoParaCRM(v, i, fl); } catch (er) { return aviso(er.message); }
        return m9Gravar('salvarInsumo', args).then(function (d) { if (d.insumo) m9Upsert('insumos', d.insumo); aviso(d.msg || 'Insumo salvo.'); render(); carregarM9(true); }, function (er) { aviso('Não salvou: ' + er.message); });
      }
      var sl = lerM9(), fn = X.idDoRotulo(v.fornecedor);
      if (fn && !X.RE_FORN.test(fn)) { aviso('Fornecedor: use o código da lista do CRM (FN-xxxx).'); return; }
      var q = v.qtd === '' ? '' : X.num(v.qtd), mi = v.minimo === '' ? '' : X.num(v.minimo);
      if ((q !== '' && !(q >= 0)) || (mi !== '' && !(mi >= 0))) return aviso('Quantidade e mínimo devem ser números (0 ou mais).');
      var alvo = id ? sl.insumos.filter(function (x) { return x.id === id; })[0] : null;
      if (!alvo) { alvo = { id: X.proxId(sl.insumos, 'IN-'), ultimaCompra: '' }; sl.insumos.push(alvo); }
      Object.assign(alvo, { item: v.item, qtd: q, minimo: mi, fornecedor: fn }); gravarM9(sl); aviso('Insumo salvo.'); render();
    });
  };
  ACOES['in-novo'] = function () { ACOES['in-editar'](''); };
  ACOES['m9-exp'] = function () { var s = m9Dados(); copiar(JSON.stringify(s.modo === 'crm' ? { origem: 'CRM', quando: s.quando, fornecedores: s.fornecedores, cotacoes: s.cotacoes, insumos: s.insumos } : lerM9(), null, 1), 'Cotações e insumos copiados (JSON).'); };
  ACOES['m9-exp-local'] = function () { copiar(JSON.stringify({ origem: 'aparelho (0.8.5)', dados: lerJSON(M9K, null), copiaAntesDoEnvio: lerJSON(M9BK, null) }, null, 1), 'Cópia do aparelho copiada (JSON).'); };
  /** Envio único das cotações/insumos que estavam só no aparelho (0.8.5). Retoma de onde parou; não apaga a cópia local. */
  ACOES['m9-enviar'] = function () {
    var s = m9Dados(); if (s.modo !== 'crm' || !m9PodeGravar(s)) return;
    var bruto = lerJSON(M9K, null), env = lerJSON(M9ENV, null) || {}, pl = X.planoEnvioCRM(bruto, M9.cache, s.fornecedores, D.hoje, env);
    if (!pl.cotacoes.length && !pl.insumos.length) return aviso('Nada para enviar.');
    perguntar('Enviar ' + pl.cotacoes.length + ' cotação(ões) e ' + pl.insumos.length + ' insumo(s) deste aparelho para o CRM? É feito uma vez só. Compras já feitas entram como Comprado SEM lançar de novo no caixa. A cópia do aparelho continua guardada.', { titulo: '📤 Enviar ao CRM', sim: 'Enviar' }).then(async function (ok) {
      if (!ok) return;
      if (!lerJSON(M9BK, null)) try { localStorage.setItem(M9BK, JSON.stringify({ em: new Date().toISOString(), dados: bruto })); } catch (x) {}
      env.mapa = env.mapa || {}; env.insumos = env.insumos || {}; env.avisos = env.avisos || [];
      var feitos = 0, parouRede = false, salvarEnv = function () { try { localStorage.setItem(M9ENV, JSON.stringify(env)); } catch (x) {} };
      aviso('Enviando ao CRM…');
      for (var a = 0; a < pl.cotacoes.length && !parouRede; a++) {
        var it = pl.cotacoes[a];
        try {
          var d = await m9Gravar('salvarCotacao', it.args); if (!d.cotacao) { env.avisos.push(it.local + ': o CRM não devolveu a cotação'); continue; }
          env.mapa[it.local] = d.cotacao.id; m9Upsert('cotacoes', d.cotacao); feitos++; salvarEnv();
          if (it.nota) env.avisos.push(it.local + ' → ' + d.cotacao.id + ': ' + it.nota);
          if (it.depois) { try { var d2 = await m9Gravar('mudarStatusCotacao', { id: d.cotacao.id, status: it.depois }); if (d2.cotacao) m9Upsert('cotacoes', d2.cotacao); } catch (er2) { env.avisos.push(it.local + ' → ' + d.cotacao.id + ': ficou Cotado (' + er2.message + ')'); if (er2.rede) parouRede = true; } }
        } catch (er) { if (er.rede) parouRede = true; else env.avisos.push(it.local + ': ' + er.message); }
        salvarEnv();
      }
      for (var b = 0; b < pl.insumos.length && !parouRede; b++) {
        var ii = pl.insumos[b];
        try { var d3 = await m9Gravar('salvarInsumo', ii.args); if (d3.insumo) { env.insumos[ii.local] = d3.insumo.id; m9Upsert('insumos', d3.insumo); feitos++; } if (ii.nota) env.avisos.push(ii.args.item + ': ' + ii.nota); }
        catch (er3) { if (er3.rede) parouRede = true; else env.avisos.push(ii.args.item + ': ' + er3.message); }
        salvarEnv();
      }
      if (parouRede) { salvarEnv(); aviso('Parou sem conexão depois de ' + feitos + ' envio(s). Toque de novo em “Enviar ao CRM” para continuar (o que já foi não repete).'); render(); return; }
      var pcs = lerPCs(), nPC = X.remapPCs(pcs, env.mapa); if (nPC) gravarPCs(pcs);
      env.concluido = new Date().toISOString(); env.resumo = Object.keys(env.mapa).length + ' cotação(ões) e ' + Object.keys(env.insumos).length + ' insumo(s) no CRM' + (nPC ? '; ' + nPC + ' peça(s) dos PCs salvos religadas' : '');
      env.avisos = env.avisos.concat(pl.pulados.map(function (p) { return p.id + ' não foi (' + p.motivo + ')'; })); salvarEnv();
      aviso('Enviado ao CRM: ' + env.resumo + '.'); carregarM9(true); render();
    });
  };

  // ---- 8) Calculadora de PCs ----
  function montagens() { return (D.catalogo || []).filter(function (s) { return Number(s.preco) > 0 && s.ativo !== 'Não'; }); }
  function calcDe(pc) { return X.calcPC(pc, m9Dados().cotacoes, D.hoje, cfgCalc()); }
  function resumoCalc(k) {
    return (k.completo ? 'Custo das peças: <b>' + V.brl(k.custoPecas) + '</b>' : '<span class="alerta">Faltam cotações válidas: ' + e(k.faltam.join(', ') || 'nenhuma peça escolhida') + '</span>') +
      (k.montagem ? ' · montagem ' + V.brl(k.montagem) : '') + (k.sugerido != null ? ' · sugerido ' + V.brl(k.sugerido) : '') +
      '<br>Preço: <b>' + (k.preco ? V.brl(k.preco) : '—') + '</b>' + (k.manual ? ' (digitado)' : '') + (k.precoPix ? ' · Pix ' + pctTxt(k.pixPct) + ': ' + V.brl(k.precoPix) : '') +
      (k.lucro != null ? ' · lucro ' + V.brl(k.lucro) + ' (' + pctTxt(k.margemReal) + ')' : '') + (k.prejuizo ? ' ' + tag('PREJUÍZO', 'alta') : '');
  }
  function telaCalculadora() {
    if (M9.pendente && m9UsaCRM()) carregarM9();
    var pcs = lerPCs(), s = m9Dados(), val = s.cotacoes.filter(function (c) { return X.cotacaoValida(c, D.hoje) && c.custoPosto > 0; }).length;
    CMP = CMP.filter(function (id) { return pcs.some(function (p) { return p.id === id; }); });
    var cmp = X.compararPCs(pcs.filter(function (p) { return CMP.indexOf(p.id) >= 0; }), s.cotacoes, D.hoje, cfgCalc());
    return '<p class="muted" id="calcRegra">Custo de peça vem <b>só</b> do custo posto em Sorocaba de cotação válida (Mais › Suprimentos). Sem cotação válida, a peça fica sem custo. Você digita só o preço de venda e a margem.</p>' +
      '<p class="muted" id="calcCot">' + val + ' cotação(ões) válida(s) hoje' + (s.modo === 'crm' ? ' (do CRM' + (s.offline ? ', cópia sem internet: pode estar desatualizada' : '') + ')' : s.modo === 'local' ? ' (só deste aparelho)' : '') + '.</p>' +
      '<p class="muted" id="calcPCsLocal">PCs salvos ficam só neste aparelho: o CRM ainda não grava PCs da calculadora.</p><div class="row">' + botao('+ Novo PC', 'pc-novo', '', '') + '</div>' +
      lista(pcs, function (p) { var k = calcDe(p), on = CMP.indexOf(p.id) >= 0;
        return card(e(p.nome), (p.itens || []).length + ' peça(s)<br>' + resumoCalc(k), '', botao('Abrir', 'pc-abrir', p.id, '') + botao(on ? '✓ Comparando' : 'Comparar', 'pc-cmp', p.id) + botao('📋 Anúncio', 'pc-anuncio', p.id), ' data-pc="' + e(p.id) + '"'); }, 'Nenhum PC na calculadora.') +
      (cmp.length >= 2 ? '<h2>Comparar (' + cmp.length + ' de até ' + X.MAX_COMPARAR + ')</h2><div class="tabela-rolar"><table class="dre" id="pcComparar"><tr><th></th>' + cmp.map(function (x) { return '<th>' + e(x.pc.nome) + '</th>'; }).join('') + '</tr>' +
        [['Custo das peças', function (k) { return k.completo ? V.brl(k.custoPecas) : 'falta cotação'; }], ['Preço', function (k) { return k.preco ? V.brl(k.preco) : '—'; }], ['Pix', function (k) { return k.precoPix ? V.brl(k.precoPix) : '—'; }],
          ['Lucro', function (k) { return k.lucro != null ? V.brl(k.lucro) : '—'; }], ['Margem', function (k) { return k.margemReal != null ? pctTxt(k.margemReal) : '—'; }]]
          .map(function (l) { return '<tr><td>' + l[0] + '</td>' + cmp.map(function (x) { return '<td>' + l[1](x.calc) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>' : (CMP.length ? '<p class="muted">Escolha pelo menos 2 PCs para comparar.</p>' : ''));
  }
  ACOES['pc-cmp'] = function (id) { var i = CMP.indexOf(id); if (i >= 0) CMP.splice(i, 1); else { if (CMP.length >= X.MAX_COMPARAR) return aviso('Compare até ' + X.MAX_COMPARAR + ' PCs.'); CMP.push(id); } render(); };
  ACOES['pc-novo'] = function () { var l = lerPCs(), p = { id: X.proxId(l, 'PCL-'), nome: 'PC ' + (l.length + 1), itens: [], margem: '', preco: '', montagem: '' }; l.push(p); gravarPCs(l); render(); ACOES['pc-abrir'](p.id); };
  ACOES['pc-anuncio'] = function (id) { var p = lerPCs().filter(function (x) { return x.id === id; })[0]; if (!p) return; var k = calcDe(p); if (!k.preco) return aviso('Defina o preço (ou complete as cotações) antes do anúncio.'); copiar(X.anuncioPC(p, k, CFG.WHATSAPP_LOJA), 'Texto do anúncio copiado.'); };
  ACOES['pc-abrir'] = function (id) {
    var l = lerPCs(), p = l.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var cots = m9Dados().cotacoes.filter(function (c) { return X.cotacaoValida(c, D.hoje) && c.custoPosto > 0; }), mts = montagens(), m = $('modal');
    var itemDe = function (t) { return (p.itens || []).filter(function (i) { return i.tipo === t; })[0] || {}; };
    m.innerHTML = '<form method="dialog" class="detalhe" id="fPC"><h2 style="margin:0">🖥️ Calculadora</h2><div><label for="pcNome">Nome do PC</label><input id="pcNome" value="' + e(p.nome) + '"></div>' +
      (cots.length ? '' : '<p class="alerta" id="pcSemCot">Nenhuma cotação válida. Cadastre em Mais › Suprimentos (com fonte) para a peça ter custo.</p>') +
      X.COMPONENTES.map(function (t, i) { var it = itemDe(t);
        return '<div class="lin"><div><label for="pcC' + i + '">' + e(t) + '</label><select id="pcC' + i + '" data-tipo="' + e(t) + '"><option value="">— sem peça —</option>' + cots.map(function (c) { return '<option value="' + e(c.id) + '"' + (c.id === it.cotacao ? ' selected' : '') + '>' + e(c.id + ' · ' + c.peca + ' · ' + V.brl(c.custoPosto)) + '</option>'; }).join('') +
          (it.cotacao && !cots.some(function (c) { return c.id === it.cotacao; }) ? '<option value="' + e(it.cotacao) + '" selected>' + e(it.cotacao) + ' (vencida: sem custo)</option>' : '') + '</select></div>' +
          '<div><label for="pcQ' + i + '">Qtd</label><input id="pcQ' + i + '" inputmode="numeric" value="' + e(it.qtd || 1) + '"></div></div>'; }).join('') +
      '<div><label for="pcMont">Montagem (serviço do Catálogo)</label><select id="pcMont"><option value="">— sem montagem —</option>' + mts.map(function (s) { return '<option value="' + e(s.preco) + '"' + (String(s.preco) === String(p.montagem) ? ' selected' : '') + '>' + e(s.servico + ' · ' + V.brl(s.preco)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="lin"><div><label for="pcMargem">Margem sobre as peças (%)</label><input id="pcMargem" inputmode="decimal" value="' + e(p.margem) + '"></div><div><label for="pcPreco">Preço de venda (R$, opcional)</label><input id="pcPreco" inputmode="decimal" value="' + e(p.preco) + '"></div></div>' +
      '<div class="card" id="pcCalc" aria-live="polite"></div><div class="card" id="pcCartao"></div>' +
      '<div class="grandes"><button type="button" class="btn" id="pcSalvar">Salvar</button><button type="button" class="btn sec" id="pcAnuncio">📋 Copiar anúncio</button><button type="button" class="btn perigo" id="pcExcluir">Excluir</button><button class="btn sec" value="fechar">Fechar</button></div></form>';
    var ler = function () { return { id: p.id, nome: $('pcNome').value.trim() || p.nome, margem: $('pcMargem').value.trim(), preco: $('pcPreco').value.trim(), montagem: $('pcMont').value,
      itens: X.COMPONENTES.map(function (t, i) { return { tipo: t, cotacao: $('pcC' + i).value, qtd: $('pcQ' + i).value.trim() || '1' }; }).filter(function (x) { return x.cotacao; }) }; };
    var atual = function () {
      var q = ler(), k = calcDe(q); $('pcCalc').innerHTML = resumoCalc(k);
      $('pcCartao').innerHTML = '<b>Pix × cartão</b><br>' + (k.preco ? (k.precoPix ? 'Pix (' + pctTxt(k.pixPct) + ' do CRM): ' + V.brl(k.precoPix) + (k.lucroPix != null ? ' · lucro ' + V.brl(k.lucroPix) : '') + '<br>' : '') +
        (k.cartoes.length ? k.cartoes.map(function (c) { return e(c.forma) + ': ' + (c.taxa == null ? 'taxa não cadastrada na planilha' : 'taxa ' + pctTxt(c.taxa) + ' · você recebe ' + V.brl(c.liquido) + (c.lucro != null ? ' (lucro ' + V.brl(c.lucro) + ')' : '') + ' · para receber o preço cheio, cobre ' + V.brl(c.precoParaReceber)); }).join('<br>') : 'Taxas da maquininha não cadastradas na planilha (Configurações).') : 'Defina o preço para simular.');
      return q;
    };
    m.onclose = null; m.returnValue = ''; m.showModal(); atual();
    m.querySelectorAll('#fPC input, #fPC select').forEach(function (el) { el.addEventListener('input', atual); el.addEventListener('change', atual); });
    $('pcSalvar').onclick = function () { var q = atual(), l2 = lerPCs(), i = l2.findIndex(function (x) { return x.id === id; }); if (i < 0) l2.push(q); else l2[i] = q; gravarPCs(l2); aviso('PC salvo neste aparelho.'); m.close(''); render(); };
    $('pcAnuncio').onclick = function () { var q = atual(), k = calcDe(q); if (!k.preco) return aviso('Defina o preço (ou complete as cotações) antes do anúncio.'); copiar(X.anuncioPC(q, k, CFG.WHATSAPP_LOJA), 'Texto do anúncio copiado.'); };
    $('pcExcluir').onclick = function () { m.close(''); perguntar('Excluir “' + p.nome + '” da calculadora?', { titulo: 'Excluir PC', sim: 'Excluir', perigo: true }).then(function (ok) { if (!ok) return; gravarPCs(lerPCs().filter(function (x) { return x.id !== id; })); render(); }); };
  };
  function ligar085(c) {
    if ($('fFinMes')) $('fFinMes').onchange = function () { FINM.mes = this.value || ''; render(); };
  }

  // ---------- v0.8.8: 1º contato em segundo plano (UI otimista, sem iniciar() no toque) ----------
  var CONTATO_FUNDO = { pendente: 0, sync: false };
  function atualizarCardOp(o) {
    var st = document.querySelector('[data-op-st="' + o._row + '"]'); if (st) st.innerHTML = tag(o.status);
    var u = document.querySelector('[data-op-ult="' + o._row + '"]'), h = document.querySelector('[data-op-hist="' + o._row + '"]');
    var cn = document.querySelector('[data-op-canais="' + o._row + '"]');
    if (u) { var tmp = document.createElement('div'); tmp.innerHTML = blocoContatoOp(o); u.replaceWith(tmp.firstChild); if (cn) cn.replaceWith(tmp.firstChild); else tmp.removeChild(tmp.firstChild); if (h) h.replaceWith(tmp.firstChild); }
    var ig = document.querySelector('a[data-ig-op="' + o._row + '"]'); if (ig) ig.textContent = rotuloIg(V.canaisUsadosOp(o).indexOf('Instagram') >= 0);
  }
  /** v0.9.3: Direct do Instagram aberto = contato registrado no CRM como canal "Instagram" (registrarContatoOp aceita o canal), em 2º plano pela fila. */
  function registrarIgFundo(o) {
    var hoje = D.hoje; opsMexeu();
    V.aplicarContatoIgOp(o, hoje); api.tocou(true);
    setTimeout(function () { atualizarCardOp(o); }, 0);
    if (!api.pode('registrarContatoOp')) return aviso('Contato marcado só neste aparelho: o servidor ainda não aceita registrar contato.');
    api.enviar('registrarContatoOp', [o.empresa, o._row, 'Instagram'], null, {}).then(function () { faixa(); }, function (er) { aviso('O contato não foi registrado no CRM: ' + er.message); });
  }
  function registrarContatoOpFundo(o, canal) {
    var row = o._row, hoje = D.hoje;
    V.aplicarContatoOp(o, hoje, canal); // cópia em memória: a tela já mostra Contatada / último contato / histórico
    setTimeout(function () { atualizarCardOp(o); }, 0); // depois do toque: não mexe no <a> que está abrindo o WhatsApp
    CONTATO_FUNDO.pendente++;
    opsMexeu(); V.marcarCanalOp(o, canal, hoje);
    api.escrever('registrarContatoOp', [o.empresa, row, canal], function (cache) { var x = (cache.oportunidades || []).filter(function (y) { return y._row === row; })[0]; if (x && x !== o) { V.aplicarContatoOp(x, hoje, canal); V.marcarCanalOp(x, canal, hoje); } }) // v0.9.3: a cópia É a tela (não aplica duas vezes)
      .then(function (r) { CONTATO_FUNDO.pendente--; CONTATO_FUNDO.sync = !r.enfileirado; faixa(); aviso(r.enfileirado ? r.msg : 'Contato registrado no CRM.'); },
        function (er) { CONTATO_FUNDO.pendente--; faixa(); aviso('O contato não foi registrado no CRM: ' + er.message); });
  }
  /** Ao voltar do WhatsApp: atualiza com o CRM sem tela de carregamento e sem perder a rolagem. */
  // v0.9.2: ao voltar do WhatsApp NÃO recarrega nem redesenha a lista (o card da empresa já foi atualizado na hora).
  // Só um envio leve da fila em segundo plano (contato que ficou no aparelho por falta de internet/erro de rede vai agora).
  function sincronizarQuieto() {
    if (!api.fila().length) return Promise.resolve();
    return api.sincronizar().then(function (s) { faixa(); if (s.erros && s.erros.length) aviso('Algumas alterações foram recusadas: ' + s.erros.join('; ')); }, function () { faixa(); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || CONTATO_FUNDO.pendente) return;
    CONTATO_FUNDO.sync = false; setTimeout(sincronizarQuieto, 400);
  });
  // v0.9.2: celular – links whatsapp:// abrem o app direto; se em ~1,5 s a página continuar na frente (app não abriu), vai pelo api.whatsapp.com.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href^="whatsapp://"]'); if (!a || ev.defaultPrevented) return;
    ev.preventDefault(); abrirWhatsCelular(a.getAttribute('href'));
  });
  // v0.9.3: 📸 Instagram – copia o texto curto do Direct (no próprio toque) e abre o perfil (celular: app do Instagram, reserva no navegador).
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[data-ig-op]'); if (!a || ev.defaultPrevented) return;
    var o = achar('oportunidades', a.dataset.igOp), h = a.dataset.igHandle; if (!o || !h) return;
    var texto = V.textoDirectOp(o);
    (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(texto) : Promise.reject()).then(function () { aviso('Mensagem copiada, é só colar no Direct'); },
      function () { setTimeout(function () { P.pedirTexto('Não deu para copiar sozinho. Toque e segure no texto abaixo para copiar e cole no Direct.', { titulo: '📸 Direct do Instagram', valor: texto, somenteLeitura: true, sim: 'Fechar', nao: false }); }, 0); });
    if (V.ehCelular()) { ev.preventDefault(); abrirAppCelular(V.linkInstagramApp(h), V.linkInstagram(h)); }
    registrarIgFundo(o);
  });
  function abrirWhatsCelular(href) { abrirAppCelular(href, V.urlWhatsWeb(href)); }
  function abrirAppCelular(href, web) {
    var saiu = false, marca = function () { saiu = true; };
    document.addEventListener('visibilitychange', function f() { if (document.visibilityState === 'hidden') { marca(); document.removeEventListener('visibilitychange', f); } });
    window.addEventListener('pagehide', marca, { once: true }); window.addEventListener('blur', marca, { once: true });
    try { window.location.href = href; } catch (x) { saiu = false; }
    setTimeout(function () { if (saiu || document.visibilityState === 'hidden') return; var w = window.open(web, '_blank'); if (!w) window.location.href = web; }, 1500);
  }

  function ligarAcoes(raiz, dentroModal) {
    raiz.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = function (ev) {
        ev.preventDefault(); var a = b.dataset.a;
        if (bloq(a)) return aviso('Esta função ainda não foi liberada no servidor (crm-v3). Use a planilha por enquanto.');
        if (/^-\d+$/.test(String(b.dataset.k || '')) && !/-(nova|novo)$/.test(a)) return aviso('Aguarde: ainda enviando ao CRM. O número chega em instantes (link, QR e mensagens precisam dele).');
        if (dentroModal) $('modal').close('');
        setTimeout(function () { ACOES[a](b.dataset.k); }, 0);
      };
    });
  }
  function ligar(c) {
    var filtro = function (id, obj, k) { var el = $(id); if (!el) return; if (el.tagName === 'SELECT') el.onchange = function () { obj[k] = el.value; render(); };
      else el.oninput = function () {
        obj[k] = el.value; clearTimeout(buscaTimer); var origem = rota(), texto = el.value;
        buscaTimer = setTimeout(function () {
          if (!el.isConnected || rota().tela !== origem.tela || rota().sub !== origem.sub || el.value !== texto) return;
          var foco = document.activeElement === el, pos = el.selectionStart; render(); var n = $(id);
          if (foco && n) { n.focus({ preventScroll: true }); n.setSelectionRange(pos, pos); }
        }, 180);
      }; };
    filtro('fSt', F.op, 'status'); filtro('fPri', F.op, 'prioridade'); filtro('fSeg', F.op, 'segmento'); filtro('fQ', F.op, 'q');
    c.querySelectorAll('[data-cidade]').forEach(function (b) { b.onclick = function () {
      F.op.cidade = b.dataset.cidade; try { localStorage.setItem(CID, F.op.cidade); } catch (x) { /* sem armazenamento */ }
      render(); var n = document.querySelector('[data-cidade="' + (window.CSS && CSS.escape ? CSS.escape(F.op.cidade) : F.op.cidade) + '"]'); if (n) n.focus(); }; });
    filtro('fOsSt', F.os, 'status'); filtro('fOsQ', F.os, 'q'); filtro('fCliQ', F.cli, 'q');
    c.querySelectorAll('[data-chip-cli]').forEach(function (b) { b.onclick = function () { F.cli.chip = b.dataset.chipCli; render(); var n = document.querySelector('[data-chip-cli="' + F.cli.chip + '"]'); if (n) n.focus(); }; });
    c.querySelectorAll('a[data-reg-nome]').forEach(function (a) { a.addEventListener('click', function () { registrarAberta(a); }); });
    c.querySelectorAll('[data-chip-lead]').forEach(function (b) { b.onclick = function () { F.lead.sit = b.dataset.chipLead; render(); var n = document.querySelector('[data-chip-lead="' + F.lead.sit + '"]'); if (n) n.focus(); }; });
    c.querySelectorAll('a[data-wa-lead]').forEach(function (a) { a.addEventListener('click', function () { registrarLeadAberto(Number(a.dataset.waLead), 'WhatsApp'); }); });
    if ($('bLxAtualizar')) $('bLxAtualizar').onclick = function () { LX = null; render(); };
    if ($('fMes')) $('fMes').onchange = function () { RM.mesSel = this.value || ''; render(); };
    ligarAcoes(c);
    ligar085(c);
    ligarOSM(c);
    c.querySelectorAll('[data-wa-mod]').forEach(function (sel) { sel.onchange = function () {
      var o = achar('oportunidades', sel.dataset.waMod), a = c.querySelector('[data-wa-op="' + sel.dataset.waMod + '"]'), l = o && V.linkWaOp(D.modelos, o, sel.value);
      if (a && l) a.href = l; }; }); // só troca o texto; consentimento continua valendo (link some se bloqueada)
    c.querySelectorAll('[data-retorno-op]').forEach(function (b) { b.onclick = function () {
      F.op.retorno = b.dataset.retornoOp;
      render();
      var ativo = c.querySelector('[data-retorno-op][aria-pressed="true"]');
      if (ativo) ativo.focus({ preventScroll: true });
    }; });
    if ($('osMais')) $('osMais').onclick = function () {
      F.os.qtd += OS_PASSO;
      var y = window.scrollY;
      render();
      window.scrollTo(0, y);
      if ($('osMais')) $('osMais').focus({ preventScroll: true });
    };
    if ($('opMais')) $('opMais').onclick = function () { F.op.qtd = (F.op.qtd || OP_PASSO) + OP_PASSO; var y = window.scrollY; render(); window.scrollTo(0, y); };
    if ($('fIg')) $('fIg').onclick = function () { F.op.ig = !F.op.ig; try { localStorage.setItem(IGF, F.op.ig ? '1' : ''); } catch (x) { /* sem armazenamento */ } render(); if ($('fIg')) $('fIg').focus(); };
    if ($('fWa')) $('fWa').onclick = function () { F.op.wa = !F.op.wa; try { localStorage.setItem(WAF, F.op.wa ? '1' : ''); } catch (x) { /* sem armazenamento */ } render(); if ($('fWa')) $('fWa').focus(); };
    // v0.5.6: 1º contato (WhatsApp, ligação, e-mail) -> Contatada automaticamente via registrarContatoOp. Só se ainda Nova.
    // v0.8.8: o link abre NA HORA (sem preventDefault, sem esperar o CRM, sem recarregar a tela). O registro vai em segundo plano.
    c.querySelectorAll('[data-contato-op]').forEach(function (a) { a.addEventListener('click', function () {
      var o = achar('oportunidades', a.dataset.contatoOp), canal = a.dataset.canal || 'WhatsApp';
      if (!V.primeiroContatoOp(o) || !api.pode('registrarContatoOp')) return;
      registrarContatoOpFundo(o, canal);
    }); });
    c.querySelectorAll('[data-chip-ct]').forEach(function (b) { b.onclick = function () { F.ct = b.dataset.chipCt; F.ctSit = ''; render(); var n = document.querySelector('[data-chip-ct="' + F.ct + '"]'); if (n) n.focus(); }; });
    c.querySelectorAll('[data-chip-sit]').forEach(function (b) { b.onclick = function () { F.ctSit = b.dataset.chipSit; render(); var n = document.querySelector('[data-chip-sit="' + F.ctSit + '"]'); if (n) n.focus(); }; });
    if ($('fCompCT')) $('fCompCT').onchange = function () { var v = this.value || ''; CTX.comp = /^\d{4}-\d{2}$/.test(v) && v !== D.hoje.slice(0, 7) ? v : ''; CTX.retorno = ''; recarregarCT(); };
    c.querySelectorAll('[data-contato]').forEach(function (b) { b.onclick = function () { F.op.contato = b.dataset.contato; render(); var n = document.querySelector('[data-contato="' + F.op.contato + '"]'); if (n) n.focus(); }; });
    if ($('ajPixSalvar')) $('ajPixSalvar').onclick = function () {
      var c = { chave: $('ajPixChave').value.trim(), nome: $('ajPixNome').value.trim(), cidade: $('ajPixCidade').value.trim() };
      try { PIX.montar(Object.assign({ valor: 1, txid: 'TESTE' }, PIX.normalizarConfig(c))); } catch (er) { $('ajPixErro').textContent = er.message; return; }
      ajustes.pixChave = c.chave; ajustes.pixNome = c.nome; ajustes.pixCidade = c.cidade; salvarAjustes(); aviso('Pix salvo neste aparelho.'); render();
    };
    if ($('ajPixPadrao')) $('ajPixPadrao').onclick = function () { delete ajustes.pixChave; delete ajustes.pixNome; delete ajustes.pixCidade; salvarAjustes(); aviso('Pix de volta ao padrão da ProFix.'); render(); };
    if ($('ajSenha')) $('ajSenha').onchange = function () { ajustes.mostrarSenha = $('ajSenha').checked; salvarAjustes(); aviso(ajustes.mostrarSenha ? 'Senha do aparelho visível nas OS.' : 'Senha do aparelho oculta.'); };
    if ($('bSync')) $('bSync').onclick = function () { iniciar().then(function () { aviso('Dados atualizados.'); }); };
    if ($('bSair')) $('bSair').onclick = function () { perguntar('Sair deste aparelho? Vai precisar digitar a senha (ou a chave) de novo.', { titulo: 'Sair', sim: 'Sair', perigo: true }).then(function (ok) { if (ok) { api.esquecerToken(); telaChave(); } }); };
    if ($('bInstalar')) { $('bInstalar').hidden = !instalar; $('bInstalar').onclick = function () { instalar.prompt(); instalar = null; }; }
    if ($('dicaIos') && /iphone|ipad/i.test(navigator.userAgent)) $('dicaIos').textContent = 'No iPhone: toque em Compartilhar ⬆️ e depois em “Adicionar à Tela de Início”.';
  }

  // ---------- Instalação, offline e service worker ----------
  var instalar = null;
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); instalar = ev; if ($('bInstalar')) $('bInstalar').hidden = false; });
  window.addEventListener('hashchange', render);
  // v0.9.3: leitura que chegou com formulário aberto / campo em edição é desenhada quando o Pedro termina.
  if ($('modal')) $('modal').addEventListener('close', talvezRedesenhar);
  if ($('conteudo')) $('conteudo').addEventListener('focusout', function () { setTimeout(function () { var f = document.activeElement; if (!f || !$('conteudo').contains(f)) talvezRedesenhar(); }, 0); });
  window.addEventListener('online', function () { offline = false; faixa(); api.processarFila().then(function (s) { if (s.enviados) aviso(s.enviados + ' alteração(ões) enviada(s).'); if (s.erros.length) aviso('Algumas alterações foram recusadas: ' + s.erros.join('; ')); atualizarFundo(true); }, function (er) { if (er.codigo !== 'TOKEN_INVALIDO') aviso(er.message); }); });
  window.addEventListener('offline', function () { offline = true; faixa(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').then(function () {
    // Primeiro uso do demo pode ter baixado o script antes do SW assumir a página.
    if (demo) navigator.serviceWorker.ready.then(function (r) { if (r.active) r.active.postMessage('guardar-demonstracao'); });
  }).catch(function () {});
  window.ProFixApp = { api: api, iniciar: iniciar, ajustes: ajustes, estat: ESTAT, fundo: function () { return atualizarFundo(true); }, dados: function () { return D; } };
  iniciar({ abertura: true });
})();
