/* ProFix – telas, navegação e formulários. Dados e gravações passam SEMPRE pelo adaptador (api.js). */
(function () {
  'use strict';
  var V = ProFixVista, CFG = window.PROFIX_CONFIG || {};
  var demo = /[?&]demo=1/.test(location.search) || !CFG.API_URL;
  var api = demo ? ProFixAPI.criarAdaptadorMock({ hoje: CFG.HOJE_FIXO, enviarSenha: true, semAcoes: ((location.search.match(/[?&]semAcoes=([\w,]+)/) || [])[1] || '').split(',').filter(Boolean) })
    : ProFixAPI.criarAdaptadorGas(CFG.API_URL, { liberadas: CFG.ACOES_SERVIDOR });
  var D = null, offline = false;
  var F = { op: { status: '', prioridade: '', segmento: '', q: '' }, os: { status: '', q: '' }, cli: { q: '' } };
  var $ = function (id) { return document.getElementById(id); }, e = V.esc;
  var AJ = 'profix.ajustes', ajustes = (function () { try { return JSON.parse(localStorage.getItem(AJ)) || {}; } catch (x) { return {}; } })();
  var WAF = 'profix.waOp'; try { F.op.wa = localStorage.getItem(WAF) === '1'; } catch (x) { F.op.wa = false; }
  var CID = 'profix.cidadeOp'; try { F.op.cidade = localStorage.getItem(CID) || ''; } catch (x) { F.op.cidade = ''; }
  function salvarAjustes() { localStorage.setItem(AJ, JSON.stringify(ajustes)); }

  function aviso(t) { var a = $('aviso'); a.textContent = t; a.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.classList.remove('on'); }, 3500); }
  function faixa() {
    var f = $('faixa'), n = api.fila().length, p = [];
    if (api.tipo === 'mock') p.push('Modo demonstração – dados fictícios');
    if (offline) p.push('Sem internet – mostrando os últimos dados salvos');
    if (n) p.push(n + ' alteração(ões) aguardando envio');
    f.textContent = p.join(' · '); f.hidden = !p.length;
  }

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
  function iniciar() {
    if (!api.temToken()) return Promise.resolve(telaChave());
    $('tela-chave').hidden = true; $('app').hidden = false;
    carregando = true;
    if (!D) { var c0 = api.cacheLocal(); if (c0) D = c0; } // mostra a última cópia enquanto atualiza
    render();
    return api.carregar().then(function (r) { carregando = false; if (r.dados) D = r.dados; offline = r.offline; faixa(); render(); },
      function (er) { carregando = false; render(); if (er.codigo === 'TOKEN_INVALIDO' || er.codigo === 'SEM_TOKEN') { api.esquecerToken(); telaChave(MSG_EXPIROU); } else aviso(er.message); });
  }
  function rota() { var h = (location.hash || '#hoje').slice(1).split('/'); return { tela: h[0] || 'hoje', sub: h[1] || '' }; }
  var carregando = false;
  function render() {
    var r = rota();
    var telaMenu = r.tela === 'osm' ? 'servicos' : r.tela;
    document.querySelectorAll('.menu a').forEach(function (a) { var on = a.dataset.tela === telaMenu; a.classList.toggle('ativo', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var c = $('conteudo');
    if (!D) { c.innerHTML = carregando ? '<div class="vazio">Carregando dados da planilha… (pode levar uns 20 segundos)</div>' : '<div class="vazio">Ainda não há dados salvos neste aparelho. Conecte à internet e abra o app.</div>'; return; }
    c.innerHTML = (TELAS[r.tela] || TELAS.hoje)(r.sub);
    ligar(c);
  }

  // ---------- Peças de tela ----------
  function card(t, m, tags, acoes, extra) { return '<div class="card"' + (extra || '') + '><div class="t">' + t + (tags || '') + '</div>' + (m ? '<div class="m">' + m + '</div>' : '') + (acoes ? '<div class="acoes">' + acoes + '</div>' : '') + '</div>'; }
  function tag(t, cls) { return t ? '<span class="tag ' + (cls || 'cinza') + '">' + e(t) + '</span>' : ''; }
  function tagPri(p) { return p ? tag(p, V.norm(p)) : ''; }
  function lista(itens, fn, vazio) { return itens.length ? '<div class="lista2">' + itens.map(fn).join('') + '</div>' : '<div class="vazio">' + vazio + '</div>'; }
  function botao(rot, acao, dados, cls) { return '<button class="btn ' + (cls || 'sec') + ' peq" data-a="' + acao + '" data-k="' + e(dados) + '"' + (bloq(acao) ? ' title="Ainda não liberado no servidor"' : '') + '>' + rot + '</button>'; }
  var PRECISA = { 'op-editar': 'salvarOportunidade', 'op-lead': 'virarLead', 'os-status': 'mudarStatusOS', 'os-editar': 'salvarOS', 'os-orc': 'salvarOrcamento', 'os-decidir': 'decidirOrcamento',
    'os-receber': 'lancarRecebimento', 'os-peca': 'salvarPeca', 'cli-editar': 'salvarCliente', 'cli-novo': 'salvarCliente', 'cli-inter': 'registrarInteracao', 'cli-etapa': 'moverEtapa',
    'rv-editar': 'salvarRevenda', 'rv-novo': 'salvarRevenda', 'rv-vender': 'venderRevenda', 'fin-novo': 'salvarLancamento', 'cat-editar': 'salvarServicoCatalogo', 'cat-novo': 'salvarServicoCatalogo',
    'mod-editar': 'salvarModelo', 'mod-novo': 'salvarModelo', 'tar-feita': 'mudarStatusTarefa', 'os-nova': 'salvarOS' };
  function bloq(a) { return PRECISA[a] && !api.pode(PRECISA[a]); }
  function waOp(o) {
    var l = V.linkWaOp(D.modelos, o); if (!l) return '';
    var atual = V.nomeModeloOp(D.modelos, o), nomes = (D.modelos || []).map(function (m) { return m.modelo; }).filter(Boolean);
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
    if (!b) return '<span class="muted" data-wa-tipo="' + tipo + '">' + (c && c.consent !== 'Sim' ? (tipo === 'marketing' ? 'Sem consentimento LGPD: mensagem de marketing não pode. Ligue.' : 'Sem consentimento para WhatsApp: ligue.') : 'WhatsApp inválido: ligue.') + '</span>';
    return '<a class="btn wa peq" target="_blank" rel="noopener" data-wa-tipo="' + tipo + '" href="' + e(b.href) + '">📲 WhatsApp</a>' +
      (b.aviso ? '<span class="muted aviso-lgpd">⚠️ Sem consentimento LGPD: só mensagem sobre a OS.</span>' : '');
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
  function achar(lista, row) { return (D[lista] || []).filter(function (x) { return x._row === Number(row); })[0]; }
  var LIMITE = 100;
  var tagStatusOS = function (s) { return tag(s, s === 'Pronto' ? 'media' : s === 'Aguardando aprovação' || s === 'Aguardando peça' ? 'alta' : 'cinza'); };

  // v0.5.4: leads que chegaram pela página pública de cadastro (leadsLink). WhatsApp só manual, um a um (link wa.me).
  function leadsNovos() { return (D && D.leadsLink || []).filter(function (l) { return !/convert|descart|conclu|atendid/i.test(String(l.status || '')); }); }
  function waLead(l) { var n = l.consentimento === true || /^(sim|true)$/i.test(String(l.consentimento)) ? V.numeroWa(l.telefone) : null;
    var t = 'Olá ' + String(l.nome || '').split(' ')[0] + ', aqui é da ProFix Computadores. Recebemos seu cadastro' + (l.servico ? ' sobre: ' + l.servico : '') + '. Como podemos ajudar?';
    return n ? '<a class="btn wa peq" data-wa-lead target="_blank" rel="noopener" href="' + e('https://wa.me/' + n + '?text=' + encodeURIComponent(t)) + '">📲 WhatsApp</a>' : '<span class="muted">Telefone inválido ou sem consentimento.</span>'; }
  function secaoLeadsLink() { var l = leadsNovos(); if (!l.length) return '';
    return '<h2 id="leads-link">🔗 Cadastros pelo link <span class="tag alta">' + l.length + '</span></h2>' + lista(l, function (x) {
      return card(e(x.nome), [e(x.telefone), x.cidade ? e(x.cidade) : '', x.servico ? e(x.servico) : '', x.dataHora ? '⏰ ' + e(x.dataHora) : ''].filter(Boolean).join(' · '), tag(x.status || 'Novo', 'cinza'), waLead(x)); }, ''); }
  // ---------- Telas ----------
  var TELAS = {
    hoje: function () {
      var H = V.hoje(D);
      var itemContato = function (x) {
        if (x.tipo === 'op') { var o = x.ref; return card(e(o.empresa), 'Empresa · ' + e(x.acao) + ' · ⏰ ' + V.dataBR(x.data), tagPri(o.prioridade), waOp(o) + botao('Editar', 'op-editar', o._row)); }
        var c = x.ref; return card(e(c.nome), e(x.acao) + ' · ⏰ ' + V.dataBR(x.data), x.data < D.hoje ? tag('atrasado', 'vencido') : '', waCli(c, '', '', x.acao) + botao('Registrar conversa', 'cli-inter', c._row));
      };
      return '<h1>Hoje · ' + V.dataBR(D.hoje) + '</h1>' +
        '<div class="resumo"><div><b>' + H.chamar.length + '</b>para chamar</div><div><b>' + H.semResposta.length + '</b>sem resposta</div><div><b>' + H.cobrar.length + '</b>OS para cobrar</div><div><b>' + (H.agenda || []).length + '</b>na agenda (7 dias)</div></div>' +
        secaoLeadsLink() +
        '<h2>📞 Quem chamar hoje</h2>' + lista(H.chamar, itemContato, 'Ninguém para chamar hoje 🎉') +
        '<h2>⏳ Sem resposta há 3 dias ou mais</h2>' + lista(H.semResposta, itemContato, 'Nenhum contato parado.') +
        '<h2>💰 OS para cobrar</h2>' + lista(H.cobrar, function (x) { return card(e(x.num) + ' · ' + e(x.cliente), 'Saldo ' + V.brl(x.saldo), tagStatusOS(x.status), botao('Receber', 'os-receber', x.ref._row, '') + botao('Abrir OS', 'os-abrir', x.ref._row)); }, 'Nenhuma OS para cobrar.') +
        (H.paradas && H.paradas.length ? '<h2>🐢 OS paradas</h2>' + lista(H.paradas, function (x) { return card(e(x.num) + ' · ' + e(x.cliente), e(x.status), '', botao('Abrir OS', 'os-abrir', x.ref ? x.ref._row : x.row)); }, '') : '') +
        '<h2>✅ Tarefas</h2>' + lista(H.tarefas || [], function (t) { return card(e(t.tarefa), e(t.cliente || '') + ' · ' + V.dataBR(t.data), t.data < D.hoje ? tag('atrasada', 'vencido') : '', botao('Marcar feita', 'tar-feita', t._row)); }, 'Sem tarefas para hoje.') +
        '<h2>📅 Agenda</h2>' + lista(H.agenda || [], function (a) { return card(e(a.titulo), V.dataBR(a.data) + ' · ' + e(a.inicio || '') + (a.local ? ' · ' + e(a.local) : ''), a.eventoId ? '<span class="tag ok">Na agenda ✓</span>' : '', mapsBtn(a.local && a.local.length > 12 ? a.local : '') + (a.eventoId && api.pode('criarEventoAgenda') ? botao('Remarcar', 'ag-ev', a.eventoId) : '') + (a.eventoId && api.pode('removerEventoAgenda') ? botao('Tirar da agenda', 'ag-rem', a.eventoId) : '')); }, 'Agenda livre nos próximos 7 dias.');
    },
    servicos: function () {
      var q = V.norm(F.os.q), l = (D.os || []).filter(function (o) { return (!F.os.status || o.status === F.os.status) && (!q || V.norm([o.num, o.cliente, o.equipamento, o.defeito].join(' ')).indexOf(q) >= 0); })
        .sort(function (a, b) { return String(b.num) < String(a.num) ? -1 : 1; });
      return '<div class="row"><h1>Serviços (OS)</h1>' + botao('+ Nova OS', 'os-nova', '', '') + (api.pode('salvarOSMulti') ? botao('+ OS com vários equipamentos', 'osm-nova', '', 'sec') : '') + '</div>' +
        '<div class="filtros">' + sel('fOsSt', D.statusOS, F.os.status, 'Todos os status') + busca('fOsQ', F.os.q, 'Buscar OS, cliente, equipamento…') + '</div>' +
        '<p class="muted" id="contagem">' + l.length + ' OS</p>' +
        lista(l, function (o) { var s = V.saldoOS(D, o); return card(e(o.num) + ' · ' + e(o.cliente), e(o.equipamento) + ' · ' + (o.valor ? V.brl(o.valor) : o.orcamento ? 'Orçamento ' + V.brl(o.orcamento) : 'sem valor') + (s > 0 && ['Pronto', 'Entregue'].indexOf(o.status) >= 0 ? ' · saldo ' + V.brl(s) : ''), tagStatusOS(o.status), botao('Abrir', 'os-abrir', o._row, '')); }, 'Nenhuma OS com esse filtro.');
    },
    clientes: function (sub) {
      var cab = '<div class="row"><h1>Clientes</h1>' + botao('+ Novo cliente', 'cli-novo', '', '') + '</div>' + abas('clientes', [['lista', 'Lista'], ['funil', 'Funil']], sub);
      if (sub === 'funil') {
        var g = V.funil(D);
        return cab + '<div class="funil">' + Object.keys(g).map(function (et) {
          return '<section class="col"><h2>' + e(et) + ' <span class="muted">(' + g[et].length + ')</span></h2>' + (g[et].map(function (c) {
            return card(e(c.nome), e(c.origem || '') + (c.valorEst ? ' · ' + V.brl(c.valorEst) : '') + (c.motivoPerda ? ' · motivo: ' + e(c.motivoPerda) : ''), '', botao('Mover etapa', 'cli-etapa', c._row));
          }).join('') || '<div class="muted">—</div>') + '</section>';
        }).join('') + '</div>';
      }
      var q = V.norm(F.cli.q), l = (D.clientes || []).filter(function (c) { return !q || V.norm([c.nome, c.bairro, c.whatsapp, c.origem, c.indicadoPor].join(' ')).indexOf(q) >= 0; });
      return cab + '<div class="filtros">' + busca('fCliQ', F.cli.q, 'Buscar nome, bairro, telefone…') + '</div><p class="muted" id="contagem">' + l.length + ' clientes</p>' +
        lista(l, function (c) {
          var inter = (D.interacoes || []).filter(function (i) { return i.cliente === c.nome; }).slice(-1)[0];
          return card(e(c.nome), e(c.bairro || '') + ' · ' + e(c.origem || 'origem?') + (c.indicadoPor ? ' · indicado por ' + e(c.indicadoPor) : '') + (c.proximo ? '<br>⏰ ' + V.dataBR(c.proximo) + ' ' + e(c.acao || '') : '') + (inter ? '<br>Última conversa: ' + V.dataBR(inter.data) + ' – ' + e(inter.resumo) : ''),
            tag(c.etapa) + (c.consent === 'Sim' ? '' : tag('sem consentimento')), waCli(c, '', '', c.acao) + emailBtn(c, 'em-cli', c._row) + mapsBtn(c.endereco) + botao('Editar', 'cli-editar', c._row) + botao('Registrar conversa', 'cli-inter', c._row) + botao('Mover etapa', 'cli-etapa', c._row));
        }, 'Nenhum cliente.');
    },
    vendas: function (sub) {
      var cab = '<h1>Vendas</h1>' + abas('vendas', [['oportunidades', 'Oportunidades'], ['revenda', 'Revenda']], sub);
      if (sub === 'revenda') return cab + '<div class="row">' + botao('+ Novo item', 'rv-novo', '', '') + '</div>' + lista(D.revenda || [], function (r) {
        var lu = V.lucroRevenda(r);
        return card(e(r.id) + ' · ' + e(r.equipamento), e(r.config || '') + '<br>Custo ' + V.brl(V.custoRevenda(r)) + ' · ' + (r.status === 'Vendido' ? 'vendido por ' + V.brl(r.precoVenda) : 'anunciado ' + V.brl(r.anunciado)) + (lu != null ? ' · lucro ' + V.brl(lu) : ''),
          tag(r.status), botao('Editar', 'rv-editar', r._row) + (r.status !== 'Vendido' ? botao('Registrar venda', 'rv-vender', r._row, '') : ''));
      }, 'Nada na revenda.');
      // Filtro por cidade (chips com contagem). Some se nenhuma oportunidade tem cidade.
      var cids = V.cidadesOps(D.oportunidades), temCid = cids.some(function (c) { return c.chave !== V.SEM_CIDADE; });
      var fOp = Object.assign({}, F.op);
      if (!temCid || !cids.some(function (c) { return c.chave === fOp.cidade; })) fOp.cidade = '';
      var chip = function (k, rot) { return '<button type="button" class="chip" data-cidade="' + e(k) + '" aria-pressed="' + (fOp.cidade === k) + '">' + e(rot) + '</button>'; };
      var barraCid = temCid ? '<div class="chips" id="fCidade" role="group" aria-label="Filtrar por cidade">' + chip('', 'Todas (' + (D.oportunidades || []).length + ')') +
        cids.map(function (c) { return chip(c.chave, c.nome + ' (' + c.n + ')'); }).join('') + '</div>' : '';
      var nWa = (D.oportunidades || []).filter(V.temWaOp).length;
      var barraWa = '<div class="chips" role="group" aria-label="Filtrar por WhatsApp"><button type="button" class="chip" id="fWa" aria-pressed="' + !!F.op.wa + '">📲 WhatsApp (' + nWa + ')</button></div>';
      var ops = V.filtrarOps(D.oportunidades, fOp);
      return cab + barraCid + barraWa + '<div class="filtros">' + sel('fSt', D.statusOp, F.op.status, 'Todos os status') + sel('fPri', V.PRI, F.op.prioridade, 'Todas as prioridades') + sel('fSeg', D.segmentos, F.op.segmento, 'Todos os segmentos') + busca('fQ', F.op.q, 'Buscar empresa, bairro…') + '</div>' +
        '<p class="muted" id="contagem">' + ops.length + ' de ' + (D.oportunidades || []).length + ' empresas</p>' +
        (ops.length > LIMITE ? '<p class="muted">Mostrando as ' + LIMITE + ' primeiras. Use os filtros ou a busca para achar as outras.</p>' : '') +
        lista(ops.slice(0, LIMITE), function (o) {
          return card(e(o.empresa), e(o.segmento) + ' · ' + e(o.bairro) + (o.lembrete ? ' · ⏰ ' + V.dataBR(o.lembrete) : '') + (o.proximoPasso ? '<br>' + e(o.proximoPasso) : '') + (o.valorEst ? '<br>Valor estimado ' + V.brl(o.valorEst) : '') + (o.ultimoContato ? '<br>Último contato ' + V.dataBR(o.ultimoContato) : ''),
            tagPri(o.prioridade) + tag(o.status), waOp(o) + contatoOp(o) + botao('Editar', 'op-editar', o._row) + (o.status !== 'Virou lead' && !V.bloqueadaOp(o) ? botao('➜ Virar lead', 'op-lead', o._row) : ''));
        }, 'Nenhuma empresa com esse filtro.');
    },
    mais: function (sub) {
      var cab = '<h1>Mais</h1>' + abas('mais', [['financeiro', 'Financeiro'], ['catalogo', 'Catálogo'], ['precos', 'Preços OS'], ['modelos', 'Modelos'], ['ajustes', 'Ajustes']], sub);
      if (sub === 'precos') return cab + telaPrecos();
      if (sub === 'catalogo') return cab + '<div class="row">' + botao('+ Novo serviço', 'cat-novo', '', '') + '</div>' + lista(D.catalogo || [], function (s) { return card(e(s.servico), e(s.tipo || '') + ' · ' + V.brl(s.preco) + (s.sugerido ? '<br>Sugerido: ' + e(s.sugerido) : '') + (s.descricao ? '<br>' + e(s.descricao) : ''), tag(s.status || (s.ativo === 'Sim' ? 'Ativo' : 'Inativo')), botao('Editar', 'cat-editar', s._row)); }, 'Catálogo vazio.');
      if (sub === 'modelos') return cab + '<div class="row">' + botao('+ Novo modelo', 'mod-novo', '', '') + '</div>' + lista(D.modelos || [], function (m) { return card(e(m.modelo), e(m.quando || '') + '<br><span class="pre">' + e(String(m.texto || '').slice(0, 160)) + (String(m.texto || '').length > 160 ? '…' : '') + '</span>', '', botao('Editar', 'mod-editar', m._row)); }, 'Nenhum modelo.') +
        '<p class="muted">Backup: continua pela planilha (menu ProFix CRM > Fazer backup agora / backup semanal).</p>';
      if (sub === 'ajustes') return cab + '<div class="card"><label class="chk"><input type="checkbox" id="ajSenha"' + (ajustes.mostrarSenha ? ' checked' : '') + '> Mostrar senha do aparelho</label><div class="m">Desligado: a senha das OS fica oculta. Mesmo ligado, ela só aparece se o servidor enviar (no crm-v3 isso também vem desligado).</div></div>' +
        '<div class="acoes"><button class="btn" id="bInstalar" hidden>📲 Instalar o app</button><button class="btn sec" id="bSync">🔄 Atualizar agora</button><button class="btn sec" id="bSair">Sair deste aparelho</button></div>' +
        '<p class="muted" id="dicaIos"></p><p class="muted">Versão ' + e(CFG.VERSAO_APP || '') + ' · ' + (api.tipo === 'mock' ? 'modo demonstração' : 'conectado à planilha') + (api.ultimaAtualizacao() ? ' · dados de ' + new Date(api.ultimaAtualizacao()).toLocaleString('pt-BR') : '') + '</p>';
      var ym = D.hoje.slice(0, 7), R = V.resumoMes(D, ym), l = (D.financeiro || []).slice().sort(function (a, b) { return String(b.data) < String(a.data) ? -1 : 1; });
      return cab + '<div class="resumo"><div><b>' + V.brl(R.entradas) + '</b>entradas no mês</div><div><b>' + V.brl(R.saidas) + '</b>saídas no mês</div><div><b>' + V.brl(R.saldo) + '</b>saldo do mês</div><div><b>' + l.length + '</b>lançamentos</div></div>' +
        '<div class="row">' + botao('+ Novo lançamento', 'fin-novo', '', '') + '</div>' +
        lista(l, function (f) { return card(e(f.descricao || f.categoria), V.dataBR(f.data) + ' · ' + e(f.categoria) + (f.os ? ' · ' + e(f.os) : '') + ' · ' + e(f.forma || ''), tag(f.tipo, f.tipo === 'Entrada' ? '' : 'alta') + ' <b>' + V.brl(f.tipo === 'Entrada' ? f.receita : f.custo) + '</b>'); }, 'Sem lançamentos.');
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
    return new Promise(function (ok) {
      m.onclose = function () {
        if (m.returnValue !== 'ok') return ok(null);
        var r = {}; campos.forEach(function (c) { var el = $('c_' + c.k); r[c.k] = c.t === 'checkbox' ? el.checked : el.value.trim(); }); ok(r);
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
    var t = o ? V.montarEmail(tipo, o, c, CFG) : { assunto: 'ProFix Computadores', corpo: 'Oi, ' + c.nome.split(' ')[0] + '!\n\n\nPedro — ProFix Computadores' };
    var cota = D.cotaEmail == null ? 'não informada' : String(D.cotaEmail);
    var p = formulario('✉️ Enviar e-mail', (o ? [{ k: 'modelo', r: 'Modelo', t: 'select', o: [V.EMAILS.orcamento.rotulo, V.EMAILS.pronto.rotulo] }] : []).concat([{ k: 'assunto', r: 'Assunto', req: true }, { k: 'corpo', r: 'Texto (pode editar)', t: 'textarea', req: true }]),
      { modelo: V.EMAILS[tipo].rotulo, assunto: t.assunto, corpo: t.corpo },
      '<div class="muted">Para: <b id="emPara">' + e(c.email) + '</b> · cota restante hoje: <b id="emCota">' + e(cota) + '</b><br>O rodapé LGPD (\u201c' + e(V.RODAPE_LGPD_SERVIDOR) + '\u201d) é colocado automaticamente.</div><p class="alerta" id="emPend"' + (V.temPendencia(t.corpo) ? '' : ' hidden') + '>Texto com [CONFIRMAR …]: troque pelo valor certo antes de enviar (validade/garantia ainda não confirmadas no config.js).</p>');
    $('c_corpo').rows = 12; $('fSalvar').textContent = 'Enviar e-mail';
    if ($('c_modelo')) $('c_modelo').onchange = function () { var k = this.value === V.EMAILS.pronto.rotulo ? 'pronto' : 'orcamento', n = V.montarEmail(k, o, c, CFG); $('c_assunto').value = n.assunto; $('c_corpo').value = n.corpo; $('c_corpo').oninput(); };
    $('c_corpo').oninput = function () { $('emPend').hidden = !V.temPendencia(this.value); };
    $('fSalvar').addEventListener('click', function (ev) { if (V.temPendencia($('c_corpo').value)) { ev.preventDefault(); $('fErro').textContent = 'Troque o [CONFIRMAR …] antes de enviar.'; } });
    p.then(function (v) {
      if (!v) return;
      escrever('enviarEmailCliente', [{ clienteId: c.id, assunto: v.assunto, corpo: v.corpo, refId: o ? o.num : '' }], function (cache, r) { if (r && r.restanteCota != null) cache.cotaEmail = r.restanteCota; });
    });
  }
  function escrever(acao, args, local) {
    return api.escrever(acao, args, local).then(function (r) { aviso(r.msg); return iniciar(); }, function (er) { aviso('Não salvou: ' + er.message); });
  }
  function aplicar(lista, row, mud) { return function (cache) { var x = (cache[lista] || []).filter(function (y) { return y._row === Number(row); })[0]; if (x) Object.keys(mud).forEach(function (k) { if (k[0] !== '_') x[k] = mud[k]; }); }; }

  // ---------- Ações ----------
  var ACOES = {
    'op-editar': function (row) {
      var o = achar('oportunidades', row);
      formulario(e(o.empresa), [
        { k: 'status', r: 'Status', t: 'select', o: D.statusOp }, { k: 'prioridade', r: 'Prioridade', t: 'select', o: V.PRI },
        { k: 'lembrete', r: 'Próximo contato', t: 'date' }, { k: 'proximoPasso', r: 'Próximo passo' },
        { k: 'canal', r: 'Melhor canal', t: 'select', o: D.canais }, { k: 'telefone', r: 'Telefone' }, { k: 'whatsapp', r: 'WhatsApp comercial (publicado pela empresa)' },
        { k: 'valorEst', r: 'Valor estimado (R$)', t: 'number' }, { k: 'motivoPerda', r: 'Motivo da perda', t: 'select', o: D.motivosPerda, ajuda: 'Use quando descartar.' }, { k: 'obs', r: 'Observações', t: 'textarea' }
      ].concat(temCol('oportunidades', 'origem') ? [{ k: 'origem', r: 'Origem', t: 'select', o: D.origens }] : [])
       .concat(temCol('oportunidades', 'indicadoPor') ? [{ k: 'indicadoPor', r: 'Indicado por' }] : []), o).then(function (v) { if (!v) return; var mud = Object.assign({ _row: o._row, _empresaOriginal: o.empresa, empresa: o.empresa }, v); escrever('salvarOportunidade', [mud], aplicar('oportunidades', o._row, mud)); });
    },
    'op-lead': function (row) { var o = achar('oportunidades', row); if (confirm('Copiar "' + o.empresa + '" para Clientes como Lead (consentimento “Não” até a empresa autorizar)?')) escrever('virarLead', [o.empresa, o._row], aplicar('oportunidades', row, { status: 'Virou lead' })); },
    'os-abrir': function (row) {
      var o = achar('os', row), pecas = V.pecasOS(D, o.num), m = $('modal');
      var lin = function (r, v) { return v === '' || v == null ? '' : '<div><span class="muted">' + r + ':</span> ' + v + '</div>'; };
      m.innerHTML = '<form method="dialog" class="detalhe"><h2 style="margin:0">' + e(o.num) + ' · ' + e(o.cliente) + '</h2><div>' + tagStatusOS(o.status) + '</div>' +
        lin('Equipamento', e(o.equipamento)) + lin('Defeito', e(o.defeito)) + lin('Serviço', e(o.servico)) + lin('Entrada', V.dataBR(o.entrada)) + lin('Previsão', V.dataBR(o.previsao)) +
        lin('Acessórios', e(o.acessorios)) + '<div><span class="muted">Senha do aparelho:</span> <span id="senhaOS">' + e(V.textoSenha(o, ajustes.mostrarSenha)) + '</span></div>' +
        lin('Diagnóstico', e(o.diagnostico)) + lin('Orçamento', o.orcamento ? V.brl(o.orcamento) + (o.aprovacao ? ' (' + e(o.aprovacao) + ')' : '') + (o.validade ? ' · vale até ' + V.dataBR(o.validade) : '') : '') +
        lin('Valor cobrado', o.valor ? V.brl(o.valor) : '') + lin('Recebido', V.brl(V.recebidoOS(D, o.num))) + lin('Saldo', V.brl(V.saldoOS(D, o))) +
        '<div><span class="muted">Peças (' + pecas.length + '):</span> ' + (pecas.map(function (p) { return e(p.qtd + '× ' + p.peca) + ' – custo ' + V.brl(p.custoUnit) + ', cobrado ' + V.brl(p.precoUnit); }).join('; ') || '—') + (pecas.length ? ' · custo total ' + V.brl(V.custoPecasOS(D, o.num)) : '') + '</div>' +
        '<div class="acoes">' + botao('Mudar status', 'os-status', row, '') + botao('Orçamento', 'os-orc', row) + (o.aprovacao === 'Pendente' ? botao('Aprovar / recusar', 'os-decidir', row) : '') + botao('Receber', 'os-receber', row) + botao('+ Peça', 'os-peca', row) + botao('Editar', 'os-editar', row) + (api.pode('lerOSMulti') ? botao('💻 Vários equipamentos', 'osm-abrir', row, '') : '') + '</div>' +
        '<div class="acoes">' + mapsBtn(V.enderecoOS(D, o)) + agendaBtn(o) + emailBtn(V.clienteDaOS(D, o), 'em-os', row) + '</div>' +
        '<div class="acoes"><button class="btn sec" value="fechar">Fechar</button></div></form>';
      m.onclose = null; m.showModal(); ligarAcoes(m, true);
    },
    'os-status': function (row) {
      var o = achar('os', row);
      formulario('Status da ' + e(o.num), [{ k: 'status', r: 'Novo status', t: 'select', o: D.statusOS, req: true }, { k: 'manterSenha', r: 'Na entrega, manter a senha do aparelho (o padrão é apagar – LGPD)', t: 'checkbox' }], { status: o.status })
        .then(function (v) { if (!v) return; var opc = v.status === 'Entregue' ? { entrega: D.hoje, apagarSenha: !v.manterSenha } : {}; if (v.status === 'Entregue' && !v.manterSenha) delete opc.apagarSenha; if (v.manterSenha) opc.apagarSenha = false; escrever('mudarStatusOS', [o.num, o._row, v.status, opc], aplicar('os', row, { status: v.status, statusEm: D.hoje })); });
    },
    'os-editar': function (row) {
      var o = row ? achar('os', row) : { cliente: '' }, nomes = (D.clientes || []).map(function (c) { return c.nome; });
      formulario(row ? 'Editar ' + e(o.num) : 'Nova OS', [{ k: 'cliente', r: 'Cliente', t: 'select', o: nomes, req: true }, { k: 'equipamento', r: 'Equipamento', req: true }, { k: 'defeito', r: 'Defeito relatado' },
        { k: 'servico', r: 'Serviço', t: 'select', o: (D.catalogo || []).map(function (s) { return s.servico; }) }, { k: 'valor', r: 'Valor cobrado (R$)', t: 'number' }, { k: 'previsao', r: 'Previsão de entrega', t: 'date' },
        { k: 'acessorios', r: 'Acessórios deixados' }, { k: 'obsInt', r: 'Observações internas', t: 'textarea' }], o)
        .then(function (v) { if (!v) return; var cli = (D.clientes || []).filter(function (c) { return c.nome === v.cliente; })[0]; var d = Object.assign({}, v, { _rowCliente: cli && cli._row }); if (row) { d._row = o._row; d.num = o.num; } escrever('salvarOS', [d], row ? aplicar('os', row, v) : null); });
    },
    'os-nova': function () { ACOES['os-editar'](''); },
    'os-orc': function (row) {
      var o = achar('os', row);
      formulario('Orçamento da ' + e(o.num), [{ k: 'diagnostico', r: 'Diagnóstico / laudo', t: 'textarea' }, { k: 'itensOrc', r: 'Itens do orçamento', t: 'textarea' }, { k: 'orcamento', r: 'Valor do orçamento (R$)', t: 'number', req: true },
        { k: 'validade', r: 'Válido até', t: 'date', ajuda: 'Em branco = 10 dias.' }, { k: 'previsao', r: 'Previsão de entrega', t: 'date' }], o)
        .then(function (v) { if (!v) return; escrever('salvarOrcamento', [Object.assign({ num: o.num, _row: o._row }, v)], aplicar('os', row, Object.assign({ status: 'Aguardando aprovação', aprovacao: 'Pendente' }, v))); });
    },
    'os-decidir': function (row) {
      var o = achar('os', row);
      formulario('Decisão do orçamento · ' + e(o.num), [{ k: 'decisao', r: 'Decisão', t: 'select', o: ['Aprovado', 'Recusado'], req: true }, { k: 'como', r: 'Como aprovou', t: 'select', o: ['WhatsApp', 'Presencial', 'Ligação'] },
        { k: 'proximoStatus', r: 'Próximo status (se aprovado)', t: 'select', o: ['Em reparo', 'Aguardando peça'] }], {})
        .then(function (v) { if (!v) return; escrever('decidirOrcamento', [Object.assign({ num: o.num, _row: o._row }, v)], aplicar('os', row, { aprovacao: v.decisao })); });
    },
    'os-receber': function (row) {
      var o = achar('os', row);
      formulario('Receber · ' + e(o.num), [{ k: 'receita', r: 'Valor recebido (R$)', t: 'number', req: true }, { k: 'forma', r: 'Forma de pagamento', t: 'select', o: D.formasPag, req: true },
        { k: 'parcelas', r: 'Parcelas (crédito parcelado)', t: 'number' }, { k: 'data', r: 'Data', t: 'date' }], { receita: V.saldoOS(D, o) > 0 ? String(V.saldoOS(D, o)).replace('.', ',') : '', data: D.hoje })
        .then(function (v) { if (!v) return; escrever('lancarRecebimento', [Object.assign({ os: o.num }, v)], function (c) { c.financeiro.push({ _row: 0, data: v.data, tipo: 'Entrada', categoria: 'Serviço', os: o.num, descricao: 'Recebimento OS ' + o.num + ' (a enviar)', forma: v.forma, receita: Number(String(v.receita).replace(',', '.')) }); }); });
    },
    'os-peca': function (row) {
      var o = achar('os', row);
      formulario('Peça na ' + e(o.num), [{ k: 'peca', r: 'Peça', req: true }, { k: 'qtd', r: 'Quantidade', t: 'number' }, { k: 'custoUnit', r: 'Custo unitário (R$)', t: 'number' }, { k: 'precoUnit', r: 'Preço cobrado (R$)', t: 'number' },
        { k: 'fornecedor', r: 'Fornecedor' }, { k: 'origem', r: 'Origem', t: 'select', o: ['Comprada para esta OS', 'Estoque', 'Cliente forneceu'] }, { k: 'link', r: 'Link do fornecedor', t: 'url' }], { qtd: '1' }, o.aprovacao === 'Pendente' ? '<div class="alerta">Atenção: o orçamento desta OS ainda não foi aprovado.</div>' : '')
        .then(function (v) { if (!v) return; if (v.origem === 'Comprada para esta OS' && o.aprovacao === 'Pendente' && !confirm('O orçamento ainda não foi aprovado. Registrar a compra mesmo assim?')) return; escrever('salvarPeca', [Object.assign({ os: o.num, _rowOS: o._row }, v)]); });
    },
    'cli-editar': function (row) {
      var c = row ? achar('clientes', row) : {};
      formulario(row ? e(c.nome) : 'Novo cliente', [{ k: 'nome', r: 'Nome', req: true }, { k: 'whatsapp', r: 'WhatsApp' }, { k: 'bairro', r: 'Bairro' }, { k: 'origem', r: 'Origem do contato', t: 'select', o: D.origens },
        { k: 'indicadoPor', r: 'Indicado por' }, { k: 'consent', r: 'Consentimento de contato (LGPD)', t: 'select', o: ['Sim', 'Não'] }].concat(temCol('clientes', 'email') ? [{ k: 'email', r: 'E-mail', t: 'email' }] : [], temCol('clientes', 'endereco') ? [{ k: 'endereco', r: 'Endereço (para o Maps)' }] : [], [ { k: 'proximo', r: 'Próximo contato', t: 'date' }, { k: 'acao', r: 'Próxima ação' },
        { k: 'valorEst', r: 'Valor estimado (R$)', t: 'number' }, { k: 'obs', r: 'Observações', t: 'textarea' }]), c)
        .then(function (v) { if (!v) return; var d = Object.assign({}, v); if (v.consent === 'Sim' && c.consent !== 'Sim') d.dataConsent = D.hoje; if (row) { d._row = c._row; d._nomeOriginal = c.nome; } escrever('salvarCliente', [d], row ? aplicar('clientes', row, v) : null); });
    },
    'cli-novo': function () { ACOES['cli-editar'](''); },
    'cli-inter': function (row) {
      var c = achar('clientes', row);
      formulario('Conversa com ' + e(c.nome), [{ k: 'canal', r: 'Canal', t: 'select', o: D.canais, req: true }, { k: 'resumo', r: 'Resumo da conversa', t: 'textarea', req: true }, { k: 'proximoPasso', r: 'Próximo passo' }, { k: 'dataProx', r: 'Data do próximo passo', t: 'date' }], { canal: 'WhatsApp' })
        .then(function (v) { if (!v) return; escrever('registrarInteracao', [Object.assign({ cliente: c.nome, _rowCliente: c._row }, v)], function (cache) { (cache.interacoes = cache.interacoes || []).push(Object.assign({ _row: 0, data: D.hoje, cliente: c.nome }, v)); aplicar('clientes', row, { ultimo: D.hoje, proximo: v.dataProx || c.proximo, acao: v.proximoPasso || c.acao })(cache); }); });
    },
    'cli-etapa': function (row) {
      var c = achar('clientes', row);
      formulario('Etapa de ' + e(c.nome), [{ k: 'etapa', r: 'Etapa do funil', t: 'select', o: D.etapas, req: true }, { k: 'motivo', r: 'Motivo da perda (se Perdido)', t: 'select', o: D.motivosPerda }], { etapa: c.etapa })
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
    'ag-rem': function (id) { if (confirm('Tirar este evento da Agenda do Google?')) escrever('removerEventoAgenda', [{ eventoId: id }], function (c) { c.agenda = (c.agenda || []).filter(function (x) { return x.eventoId !== id; }); }); },
    'ag-rem-os': function (row) { var o = achar('os', row), id = eventoDaOS(o); if (confirm('Tirar ' + o.num + ' da Agenda do Google?')) escrever('removerEventoAgenda', [{ eventoId: id }], function (c) { (c.os || []).forEach(function (x) { if (x.num === o.num) x.eventoId = ''; }); c.agenda = (c.agenda || []).filter(function (x) { return x.eventoId !== id; }); }); },
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
    if (!api.pode('catalogoOS') || carregarCatalogo.indo) return;
    carregarCatalogo.indo = true;
    api.ler('catalogoOS', []).then(function (r) { carregarCatalogo.indo = false; CAT = (r && r.itens) || []; try { localStorage.setItem(CATK, JSON.stringify(CAT)); } catch (x) { /* cota */ }
      var res = document.querySelectorAll('[data-osm-q]'); res.forEach(function (el) { mostrarBusca(el); }); if (rota().tela === 'mais' && rota().sub === 'precos') render(); },
      function () { carregarCatalogo.indo = false; });
  }
  function abrirOSM(chave) {
    var row = chave, o = row ? achar('os', row) : null;
    OSM = { chave: chave, row: o ? o._row : '', num: o ? o.num : '', aprovacao: o ? o.aprovacao || '' : '', sujo: false, carregando: !!o,
      d: { cliente: o ? o.cliente : '', previsao: o ? o.previsao || '' : '', acessorios: o ? o.acessorios || '' : '', obsInt: o ? o.obsInt || '' : '', equipamentos: [eqVazio(1)], itensOS: [] } };
    if (o) { OSM.d.equipamentos[0].identificacao = o.equipamento || ''; OSM.d.equipamentos[0].defeito = o.defeito || ''; OSM.d.equipamentos[0].servico = o.servico || ''; }
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
  function atalhos(alvo) { return '<div class="chips">' + O.ATALHOS.map(function (a, k) { return '<button type="button" class="chip" data-osm="atalho" data-p="' + alvo + '.' + k + '">' + e(a.rot) + '</button>'; }).join('') + '</div>'; }
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
    box.innerHTML = r.map(function (c) { var k = (CAT || []).indexOf(c); return '<button type="button" class="osm-cat" data-osm="cat" data-p="' + i + '.' + k + '"><span>' + e(c.descricao) + ' <span class="muted">' + e(c.categoria || '') + '</span></span><b>' + (c.valor === '' || c.valor == null ? 'sem preço' : O.brl(c.valor)) + '</b></button>'; }).join('') +
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
      if (a === 'rem-eq') { if (confirm('Remover a máquina ' + (+p[0] + 1) + ' e os itens dela?')) { d.equipamentos.splice(+p[0], 1); OSM.sujo = true; redesenhar(); } return; }
      if (a === 'add-item') { var tp = p.slice(1).join('.'), lst = p[0] === 'os' ? d.itensOS : d.equipamentos[+p[0]].itens; lst.push({ tipo: tp, descricao: '', qtd: '1', valorUnit: '', modo: O.ehAjuste({ tipo: tp }) ? 'R$' : '', origem: '' }); OSM.sujo = true; redesenhar(); return; }
      if (a === 'rem-item') { var l2 = p[0] === 'os' ? d.itensOS : d.equipamentos[+p[1]].itens; l2.splice(+p[p.length - 1], 1); OSM.sujo = true; redesenhar(); return; }
      if (a === 'atalho') { var at = O.ATALHOS[+p[1]], dest = p[0] === 'os' ? d.itensOS : d.equipamentos[+p[0].slice(2)].itens; dest.push({ tipo: at.tipo, descricao: at.descricao, qtd: '1', valorUnit: String(at.valorUnit), modo: at.modo, origem: 'atalho' }); OSM.sujo = true; redesenhar(); return; }
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
    return api.escrever('salvarOSMulti', [x]).then(function (r) {
      aviso(r.msg);
      if (r.enfileirado) { OSM.sujo = false; return; }
      var num = (r.dados && r.dados.num) || OSM.num;
      return iniciar().then(function () {
        var o = (D.os || []).filter(function (y) { return String(y.num) === String(num); })[0];
        OSM.num = num; OSM.sujo = false; if (o) { OSM.row = o._row; OSM.aprovacao = o.aprovacao || ''; OSM.chave = String(o._row); if (location.hash !== '#osm/' + o._row) history.replaceState(null, '', '#osm/' + o._row); }
        render();
      });
    }, function (er) { aviso('Não salvou: ' + er.message); });
  }
  function recarregarOSM() {
    if (!OSM.num) return Promise.resolve();
    return iniciar().then(function () { return api.ler('lerOSMulti', [OSM.num]); }).then(function (m) {
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
        '<a class="btn wa" id="orcWa" target="_blank" rel="noopener" href="' + e(o.whatsappUrl || O.linkWhatsApp(c.whatsapp, o.whatsappTexto)) + '">💬 Enviar pelo WhatsApp</a>' +
        '<button type="button" class="btn sec" id="orcCopiar">📋 Copiar texto</button>' +
        (o.html ? '<button type="button" class="btn sec" id="orcPdf">🖨 Imprimir / PDF</button>' : '<button type="button" class="btn sec" id="orcPdf">🖨 Imprimir</button>') + '</div>' +
        '<p class="muted">O WhatsApp só abre com o texto pronto: quem envia é você.' + (semConsent ? ' Atenção: este cliente está sem consentimento LGPD para mensagens.' : '') + '</p>' +
        '<details><summary>Ver texto do WhatsApp</summary><pre class="pre" id="orcTexto">' + e(o.whatsappTexto) + '</pre></details></div>';
      if (!t.open) t.showModal();
      $('orcFechar').onclick = function () { t.close(); };
      $('orcCopiar').onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(o.whatsappTexto) : Promise.reject()).then(function () { aviso('Texto copiado.'); }, function () { aviso('Não deu para copiar: selecione o texto em “Ver texto do WhatsApp”.'); }); };
      $('orcPdf').onclick = function () {
        if (!o.html) return window.print();
        var w = window.open(URL.createObjectURL(new Blob([o.html], { type: 'text/html' })), '_blank'); if (!w) aviso('Libere as janelas pop-up para imprimir.');
      };
      if ($('orcAprovar')) $('orcAprovar').onclick = function () {
        if (!confirm('Registrar que o cliente APROVOU o orçamento de ' + O.brl(o.totais.total) + ' agora?')) return;
        api.escrever('aprovarOrcamentoOS', [{ num: OSM.num, _row: OSM.row }], aplicar('os', OSM.row, { aprovacao: 'Aprovado' })).then(function (r) {
          aviso(r.msg); OSM.aprovacao = 'Aprovado'; return iniciar().then(verOrcamento);
        }, function (er) { aviso('Não aprovou: ' + er.message); });
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
    if (!confirm('Remover a condição especial desta OS?')) return;
    api.escrever('removerCondicaoEspecialOS', [{ num: OSM.num, _row: OSM.row }]).then(function (r) { aviso(r.msg); return recarregarOSM(); }, function (er) { aviso('Não removeu: ' + er.message); });
  }
  TELAS.osm = telaOSM;
  ACOES['osm-nova'] = function () { OSM = null; location.hash = '#osm'; };
  ACOES['osm-abrir'] = function (row) { OSM = null; location.hash = '#osm/' + row; };
  ACOES['cos-editar'] = function (k) {
    var c = k !== '' && CAT ? CAT[+k] : {};
    formulario(k !== '' ? e(c.descricao) : 'Novo preço no catálogo', [{ k: 'categoria', r: 'Categoria', t: 'select', o: ['Serviço', 'Mão de obra', 'Peça'], req: true }, { k: 'descricao', r: 'Descrição', req: true },
      { k: 'valor', r: 'Valor base (R$)', t: 'number' }, { k: 'tipoPreco', r: 'Tipo de preço', t: 'select', o: ['Fixo', 'A partir de', 'Por hora', 'Sob orçamento'] }, { k: 'ativo', r: 'Ativo', t: 'select', o: ['Sim', 'Não'] }, { k: 'fonte', r: 'Fonte / obs' }],
      Object.assign({ ativo: 'Sim' }, c)).then(function (v) { if (!v) return; var d = Object.assign({}, v); if (c.id) d.id = c.id;
        api.escrever('salvarCatalogoOS', [d]).then(function (r) { aviso(r.msg); try { localStorage.removeItem(CATK); } catch (x) { /* ok */ } CAT = null; carregarCatalogo(); }, function (er) { aviso('Não salvou: ' + er.message); }); });
  };
  PRECISA['osm-nova'] = 'salvarOSMulti'; PRECISA['cos-editar'] = 'salvarCatalogoOS';
  function telaPrecos() {
    carregarCatalogo();
    var l = (CAT || []).map(function (c, k) { return { c: c, k: k }; }).filter(function (x) { return x.c.origem === 'Catálogo OS' || !x.c.origem; });
    return '<div class="row"><p class="muted">Preços usados no registro rápido da OS (aba “Catálogo OS”).</p>' + botao('+ Novo preço', 'cos-editar', '', '') + '</div>' +
      (CAT ? lista(l, function (x) { return card(e(x.c.descricao), e(x.c.categoria || '') + ' · ' + (x.c.valor === '' || x.c.valor == null ? 'sem preço' : O.brl(x.c.valor)) + (x.c.fonte ? '<br>' + e(x.c.fonte) : ''), '', botao('Editar', 'cos-editar', String(x.k))); }, 'Catálogo OS vazio.') : '<div class="vazio">Carregando o catálogo…</div>');
  }

  function ligarAcoes(raiz, dentroModal) {
    raiz.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = function (ev) {
        ev.preventDefault(); var a = b.dataset.a;
        if (bloq(a)) return aviso('Esta função ainda não foi liberada no servidor (crm-v3). Use a planilha por enquanto.');
        if (dentroModal) $('modal').close('');
        setTimeout(function () { ACOES[a](b.dataset.k); }, 0);
      };
    });
  }
  function ligar(c) {
    var filtro = function (id, obj, k) { var el = $(id); if (!el) return; if (el.tagName === 'SELECT') el.onchange = function () { obj[k] = el.value; render(); };
      else el.oninput = function () { obj[k] = el.value; var pos = el.selectionStart; render(); var n = $(id); n.focus(); n.setSelectionRange(pos, pos); }; };
    filtro('fSt', F.op, 'status'); filtro('fPri', F.op, 'prioridade'); filtro('fSeg', F.op, 'segmento'); filtro('fQ', F.op, 'q');
    c.querySelectorAll('[data-cidade]').forEach(function (b) { b.onclick = function () {
      F.op.cidade = b.dataset.cidade; try { localStorage.setItem(CID, F.op.cidade); } catch (x) { /* sem armazenamento */ }
      render(); var n = document.querySelector('[data-cidade="' + (window.CSS && CSS.escape ? CSS.escape(F.op.cidade) : F.op.cidade) + '"]'); if (n) n.focus(); }; });
    filtro('fOsSt', F.os, 'status'); filtro('fOsQ', F.os, 'q'); filtro('fCliQ', F.cli, 'q');
    ligarAcoes(c);
    ligarOSM(c);
    c.querySelectorAll('[data-wa-mod]').forEach(function (sel) { sel.onchange = function () {
      var o = achar('oportunidades', sel.dataset.waMod), a = c.querySelector('[data-wa-op="' + sel.dataset.waMod + '"]'), l = o && V.linkWaOp(D.modelos, o, sel.value);
      if (a && l) a.href = l; }; }); // só troca o texto; consentimento continua valendo (link some se bloqueada)
    if ($('fWa')) $('fWa').onclick = function () { F.op.wa = !F.op.wa; try { localStorage.setItem(WAF, F.op.wa ? '1' : ''); } catch (x) { /* sem armazenamento */ } render(); if ($('fWa')) $('fWa').focus(); };
    // v0.5.6: 1º contato (WhatsApp, ligação, e-mail) -> Contatada automaticamente via registrarContatoOp (UI otimista + fila offline). Só se ainda Nova.
    c.querySelectorAll('[data-contato-op]').forEach(function (a) { a.addEventListener('click', function () {
      var o = achar('oportunidades', a.dataset.contatoOp), canal = a.dataset.canal || 'WhatsApp';
      if (!V.primeiroContatoOp(o) || !api.pode('registrarContatoOp')) return;
      escrever('registrarContatoOp', [o.empresa, o._row, canal], function (cache) { var x = cache.oportunidades.filter(function (y) { return y._row === o._row; })[0]; if (x) V.aplicarContatoOp(x, D.hoje, canal); });
    }); });
    if ($('ajSenha')) $('ajSenha').onchange = function () { ajustes.mostrarSenha = $('ajSenha').checked; salvarAjustes(); aviso(ajustes.mostrarSenha ? 'Senha do aparelho visível nas OS.' : 'Senha do aparelho oculta.'); };
    if ($('bSync')) $('bSync').onclick = function () { iniciar().then(function () { aviso('Dados atualizados.'); }); };
    if ($('bSair')) $('bSair').onclick = function () { if (confirm('Sair deste aparelho? Vai precisar digitar a senha (ou a chave) de novo.')) { api.esquecerToken(); telaChave(); } };
    if ($('bInstalar')) { $('bInstalar').hidden = !instalar; $('bInstalar').onclick = function () { instalar.prompt(); instalar = null; }; }
    if ($('dicaIos') && /iphone|ipad/i.test(navigator.userAgent)) $('dicaIos').textContent = 'No iPhone: toque em Compartilhar ⬆️ e depois em “Adicionar à Tela de Início”.';
  }

  // ---------- Instalação, offline e service worker ----------
  var instalar = null;
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); instalar = ev; if ($('bInstalar')) $('bInstalar').hidden = false; });
  window.addEventListener('hashchange', render);
  window.addEventListener('online', function () { api.sincronizar().then(function (s) { if (s.enviados) aviso(s.enviados + ' alteração(ões) enviada(s).'); if (s.erros.length) aviso('Algumas alterações foram recusadas: ' + s.erros.join('; ')); iniciar(); }, function (er) { if (er.codigo !== 'TOKEN_INVALIDO') aviso(er.message); }); });
  window.addEventListener('offline', function () { offline = true; faixa(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  window.ProFixApp = { api: api, iniciar: iniciar, ajustes: ajustes };
  iniciar();
})();
