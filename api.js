/* ProFix – camada fina de API (adaptador).
 * O app NÃO tem regra de negócio de CRM: tudo vem do Code.gs do crm-v3.
 * Dois adaptadores com a MESMA interface:
 *   - criarAdaptadorGas(url): chama o crm-v3 via doPost JSON (fetch text/plain = sem preflight CORS)
 *   - criarAdaptadorMock(): dados FICTÍCIOS, para demonstração e testes
 * Nomes das ações = nomes das funções que já existem no crm-v3/Code.gs.
 */
(function (raiz, fabrica) {
  var m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFixAPI = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Ações permitidas -> função do crm-v3/Code.gs. "escrita" = entra na fila offline.
  // Lista FECHADA de ações = funções que já existem no crm-v3/Code.gs (mesma lista que o doPost deve aceitar).
  var LEITURA = ['getDados', 'listarAgenda', 'leadsLink', 'resumoOrigens', 'planosPublicos',
    'lerOSMulti', 'catalogoOS', 'gerarOrcamentoOS', 'orcamentoOS', 'simularCondicaoOS',
    'fichaCliente', 'resumoMes', 'listaContratos', 'laudoTecnicoOS', 'extrasOS', 'textoMarketing',
    'listarClientesResumo', 'listarLixeira',
    'listarFornecedores', 'listarCotacoes', 'listarInsumos']; // v0.8.6/0.8.7: Módulo 9 no CRM (API @113/@115). v0.7.1: API @43. v0.7.0: diferenciais (crm-v3 API @41). v0.6.0: OS com vários equipamentos (crm-v3 API v32)
  var ESCRITA = ['salvarCliente', 'moverEtapa', 'registrarInteracao', 'salvarOS', 'mudarStatusOS', 'salvarOrcamento', 'decidirOrcamento',
    'lancarRecebimento', 'salvarValidadeOS', 'salvarPeca', 'salvarLancamento', 'mudarStatusTarefa', 'salvarOportunidade', 'registrarContatoOp', 'virarLead',
    'salvarRevenda', 'venderRevenda', 'salvarServicoCatalogo', 'salvarModelo', 'registrarFollowup',
    'criarEventoAgenda', 'removerEventoAgenda', 'enviarEmailCliente',
    'salvarOSMulti', 'salvarCatalogoOS', 'aprovarOrcamentoOS', 'aplicarCondicaoEspecialOS', 'removerCondicaoEspecialOS',
    'registrarMensagemAberta', 'agendarRetorno', 'salvarMaquina', 'vincularMaquinaOS', 'salvarChecklistOS', 'linkClienteOS', 'textoStatusOS',
    'salvarContrato', 'salvarVisita', 'iniciarVisita', 'encerrarVisita',
    'registrarConsentimento', 'definirStatusLead', 'excluirRegistro', 'restaurarRegistro', 'apagarDefinitivo',
    'salvarCotacao', 'mudarStatusCotacao', 'salvarInsumo',
    'receberMensalidade']; // v0.8.9: cobrança dos planos (API @117). v0.8.6/0.8.7: Módulo 9 (API @113/@115). v0.7.1 (API @43). v0.7.0 diferenciais; crm-v3 v13 + v32 (OS multi) (enviarEmailCliente exige idOperacao: sempre mandamos)
  var SO_ONLINE = ['receberMensalidade', // v0.8.9: lança Entrada no Financeiro; precisa da resposta (avisos/erros) e nunca vai para a fila
    'salvarCotacao', 'mudarStatusCotacao', 'salvarInsumo', // v0.8.6/0.8.7: precisam da resposta (id, custo posto do servidor, avisos, Saída no caixa na mesma trava): nunca vão para a fila
    'excluirRegistro', 'restaurarRegistro', 'apagarDefinitivo', // v0.7.1: Lixeira só com internet (precisa da resposta: impacto/confirmação)
    'linkClienteOS', 'textoStatusOS', 'iniciarVisita', // v0.7.0: precisam da resposta na hora (link/texto); início da visita usa a hora do servidor
    'criarEventoAgenda', 'removerEventoAgenda', 'enviarEmailCliente', 'aprovarOrcamentoOS', 'aplicarCondicaoEspecialOS', 'removerCondicaoEspecialOS']; // nunca vão para a fila offline (e-mail não sai "depois" sem o Pedro ver; aprovação e condição especial são feitas na frente do cliente, com o servidor)
  var ACOES = {};
  // v0.9.3: leituras de velocidade do CRM ADM (ainda NÃO publicadas). Só existem para o adaptador quando config.js listar em
  // LEITURAS_VELOCIDADE (ex.: ['aberturaApp', 'oportunidadesLeve', 'idApp']). Vazio = nenhuma chamada nova vai ao servidor.
  var LEITURA_VELOCIDADE = ['aberturaApp', 'oportunidadesLeve'];
  LEITURA.forEach(function (a) { ACOES[a] = { escrita: false }; });
  ESCRITA.forEach(function (a) { ACOES[a] = { escrita: true }; });


  var CH = { token: 'profix.token', cache: 'profix.cacheDados', fila: 'profix.filaEscritas', quando: 'profix.cacheQuando', sessao: 'profix.sessao', desligadas: 'profix.acoesDesconhecidas',
    erros: 'profix.filaRecusadas', meta: 'profix.metaLeitura' }; // v0.9.3: recusadas pelo servidor (ficam visíveis) e carimbos do aberturaApp/oportunidadesLeve
  // v0.9.3 (pedido do Compras): pagamento só aparece como feito DEPOIS da confirmação do servidor. Nunca otimista, nunca na fila.
  var CONFIRMAR = ['lancarRecebimento', 'receberMensalidade', 'mudarStatusCotacao'];
  /** Cópia guardada no aparelho SEM segredos (senha do aparelho do cliente, tokens). A tela em memória continua com o que o servidor mandou. */
  function semSegredos(d) {
    var limpar = function (o) { if (!o || typeof o !== 'object' || Array.isArray(o)) return o; var tem = false; for (var k in o) if (/^(senha|token|chave)$/i.test(k)) { tem = true; break; } if (!tem) return o; var c = {}; Object.keys(o).forEach(function (k) { if (!/^(senha|token|chave)$/i.test(k)) c[k] = o[k]; }); return c; };
    var r = {}; Object.keys(d || {}).forEach(function (k) { r[k] = Array.isArray(d[k]) && (k === 'os' || k === 'equipamentos' || k === 'osMulti') ? d[k].map(limpar) : d[k]; });
    return r;
  }
  /** O servidor respondeu que não conhece a ação? (feature flag automática) */
  function ehDesconhecida(e) { return !!e && (e.codigo === 'ACAO_DESCONHECIDA' || /a[çc][ãa]o (desconhecida|inv[áa]lida|n[ãa]o permitida)|unknown action/i.test(e.message || '')); }

  function lerJSON(arm, ch, padrao) { try { var v = arm.getItem(ch); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }
  /** Token de sessão (loginSenha) ainda válido? {token, expira} — a senha NUNCA é guardada. */
  function sessaoValida(arm) { var s = lerJSON(arm, CH.sessao, null); if (!s || !s.token) return null; var t = Date.parse(s.expira); return (isNaN(t) || t > Date.now()) ? s : null; }
  /** Token usado nas chamadas: sessão válida primeiro, senão a chave (APP_TOKEN). */
  function tokenAtual(arm) { var s = sessaoValida(arm); return s ? s.token : arm.getItem(CH.token); }
  var MSG_LOGIN = { SENHA_INVALIDA: 'Senha incorreta. Confira e tente de novo.', BLOQUEADO: 'Muitas tentativas erradas. Tente de novo em 15 minutos.',
    SEM_SENHA: 'A senha ainda não foi definida no servidor. Use a chave de acesso.' };
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /** Adaptador real: um único endpoint POST. Corpo: {token, acao, args, idOperacao}. Resposta: {ok, dados} ou {ok:false, erro}. */
  function criarAdaptadorGas(url, opc) {
    opc = opc || {};
    var f = opc.fetch || (typeof fetch !== 'undefined' ? fetch.bind(self) : null);
    var arm = opc.armazenamento || localStorage;
    var online = opc.online || function () { return typeof navigator === 'undefined' || navigator.onLine !== false; };

    var vel = opc.velocidade || [];
    function chamar(acao, args, idOp) {
      if (!ACOES[acao] && !(LEITURA_VELOCIDADE.indexOf(acao) >= 0 && vel.indexOf(acao) >= 0)) return Promise.reject(new Error('Ação não permitida: ' + acao));
      var token = tokenAtual(arm);
      if (!token) return Promise.reject(Object.assign(new Error('Aparelho sem chave de acesso.'), { codigo: 'SEM_TOKEN' }));
      return postar(token, acao, args || [], idOp);
    }
    function postar(token, acao, args, idOp) {
      return f(url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: token, acao: acao, args: args, idOperacao: idOp || novoId() }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || j.ok !== true) {
            var e = new Error((j && j.erro) || 'Resposta inválida do servidor.');
            e.codigo = j && j.codigo; e.doServidor = true; throw e;
          }
          return j.dados;
        });
    }
    var api = montar(chamar, arm, online, 'gas', function (senha) { return postar('', 'loginSenha', { senha: senha }); },
      { persistencia: opc.persistencia, velocidade: opc.velocidade || [] });
    if (opc.liberadas) api.liberadas = opc.liberadas;
    /** Checagem de saúde (GET ?saude=1, sem chave e sem dados). */
    api.saude = function () { return f(url + (url.indexOf('?') < 0 ? '?' : '&') + 'saude=1', { method: 'GET', redirect: 'follow' }).then(function (r) { return r.json(); }); };
    return api;
  }

  /** Comum aos dois adaptadores: cache da última leitura + fila de escritas offline.
   * v0.9.3 (velocidade): a cópia fica EM MEMÓRIA (a mesma referência que o App usa como D) e é gravada no aparelho por
   * opc.persistencia (IndexedDB, ver rapido.js) sem travar a tela. Sem persistencia (Node/testes antigos): localStorage, como antes.
   * Escritas do dia a dia vão pela FILA em segundo plano (api.enviar): a tela já mostra "Salvo" e o envio repete sozinho
   * em queda de rede / tempo esgotado / "Servidor ocupado" com o MESMO idOperacao (sem duplicar). Recusa do servidor = item
   * guardado em "recusadas" (api.filaErros) com a mensagem, para tentar de novo ou descartar; nunca some calado. */
  function montar(chamar, arm, online, tipo, login, opc) {
    opc = opc || {};
    var vel = opc.velocidade || [];
    var api = { tipo: tipo, liberadas: null, aoExpirar: null, aoConfirmado: null, aoRecusado: null, velocidade: vel,
      usaAbertura: vel.indexOf('aberturaApp') >= 0, usaOpsLeve: vel.indexOf('oportunidadesLeve') >= 0, usaIdApp: vel.indexOf('idApp') >= 0 };
    var persist = opc.persistencia || null, mem = null, ouvintes = [], retornos = {};
    var PRAZO_FILA = opc.prazoFila || 60000, PRAZO_CONF = opc.prazoConfirmar || 45000, ESPERAS = opc.esperas || [2000, 5000, 10000, 20000, 30000, 60000];
    /** Sessão/chave recusada: limpa o acesso (a fila offline e a cópia local ficam) e avisa o app. */
    function acessoRecusado() { arm.removeItem(CH.sessao); arm.removeItem(CH.token); if (typeof api.aoExpirar === 'function') { try { api.aoExpirar(); } catch (x) {} } }
    var desl = function () { return lerJSON(arm, CH.desligadas, []); };
    var chamarBase = chamar;
    var ESTAT = api.estat = { chamadas: 0, porAcao: {}, getDados: 0 }; // v0.9.3: medição (round-trips por ação)
    chamar = function (acao, args, id) {
      ESTAT.chamadas++; ESTAT.porAcao[acao] = (ESTAT.porAcao[acao] || 0) + 1; if (acao === 'getDados' || acao === 'aberturaApp') ESTAT.getDados++;
      return chamarBase(acao, args, id).catch(function (e) {
        if (e.codigo === 'TOKEN_INVALIDO') acessoRecusado();
        if (e.doServidor && ehDesconhecida(e) && desl().indexOf(acao) < 0) { var l = desl(); l.push(acao); arm.setItem(CH.desligadas, JSON.stringify(l)); }
        throw e;
      });
    };
    /** true se o servidor já aceita a ação (mock: todas) e ela não foi recusada como "desconhecida". */
    api.pode = function (acao) {
      if (LEITURA_VELOCIDADE.indexOf(acao) >= 0) return vel.indexOf(acao) >= 0 && desl().indexOf(acao) < 0; // só com config.LEITURAS_VELOCIDADE
      return !!ACOES[acao] && (!api.liberadas || api.liberadas.indexOf(acao) >= 0) && desl().indexOf(acao) < 0;
    };
    api.desligadas = desl;
    api.temToken = function () { return !!tokenAtual(arm); };
    api.sessao = function () { return sessaoValida(arm); };
    /** Login por senha: guarda só {token, expira} da sessão (30 dias). Erros com mensagem clara em PT-BR. */
    api.loginSenha = function (senha) {
      senha = String(senha || '');
      if (!senha) return Promise.reject(Object.assign(new Error('Digite a senha.'), { codigo: 'SENHA_VAZIA' }));
      if (!online()) return Promise.reject(Object.assign(new Error('Sem internet. Para entrar é preciso estar conectado.'), { codigo: 'SEM_REDE' }));
      return login(senha).then(function (d) {
        if (!d || !d.token) throw Object.assign(new Error('Resposta inválida do servidor.'), { doServidor: true });
        arm.setItem(CH.sessao, JSON.stringify({ token: String(d.token), expira: d.expira || '' }));
        return true;
      }, function (e) {
        if (e.doServidor) { if (MSG_LOGIN[e.codigo]) e.message = MSG_LOGIN[e.codigo]; if (ehDesconhecida(e)) e.message = 'O servidor ainda não aceita login por senha. Use a chave de acesso.'; throw e; }
        throw Object.assign(new Error('Sem conexão com o servidor. Tente de novo com internet.'), { codigo: 'SEM_REDE' });
      });
    };
    api.salvarToken = function (t) { t = String(t || '').trim(); if (t.length < 16) throw new Error('A chave precisa ter pelo menos 16 caracteres.'); arm.setItem(CH.token, t); };
    api.esquecerToken = function () { arm.removeItem(CH.token); arm.removeItem(CH.sessao); };
    /** Testa a chave com uma leitura. Retorna true/false. */
    api.validarToken = function () { return chamar('getDados', []).then(function (d) { guardar(d); api._recemValidado = true; return true; }, function (e) { if (e.codigo === 'TOKEN_INVALIDO') return false; throw e; }); };
    api.fila = function () { return lerJSON(arm, CH.fila, []); };
    api.filaErros = function () { return lerJSON(arm, CH.erros, []); };
    api.ultimaAtualizacao = function () { return arm.getItem(CH.quando) || ''; };
    function gravarFila(fl) { arm.setItem(CH.fila, JSON.stringify(fl)); }
    function gravarErros(l) { arm.setItem(CH.erros, JSON.stringify(l)); }
    function avisar(ev) { ouvintes.slice().forEach(function (f) { try { f(ev); } catch (x) {} }); }
    /** Ouvinte de mudanças da fila: {tipo:'fila'|'confirmado'|'recusado'|'vazia'|'rede', op, dados, erro}. */
    api.aoMudar = function (f) { ouvintes.push(f); };

    // ---------- cópia local (memória + aparelho) ----------
    var persistTimer = null, opsSujo = true;
    function persistirJa() {
      persistTimer = null; if (!persist || !mem) return Promise.resolve();
      var d = mem, ops = d.oportunidades;
      var nucleo = {}; Object.keys(d).forEach(function (k) { if (k !== 'oportunidades') nucleo[k] = d[k]; });
      var p = persist.salvar('nucleo', semSegredos(nucleo));
      if (opsSujo && Array.isArray(ops) && !d._opsPendentes) { opsSujo = false; p = p.then(function () { return persist.salvar('oportunidades', ops); }); }
      return p.catch(function () {});
    }
    function agendarPersistir() { if (!persist) return; clearTimeout(persistTimer); persistTimer = setTimeout(persistirJa, 250); }
    // Falha ao gravar no aparelho (cota cheia) não pode descartar os dados que acabaram de chegar.
    function guardar(d) {
      mem = d; opsSujo = true; try { arm.setItem(CH.quando, new Date().toISOString()); } catch (e) {}
      if (persist) { agendarPersistir(); try { arm.removeItem(CH.cache); } catch (e) {} return; } // libera a cota do localStorage (0.9.2 estourava com 18 mil oportunidades)
      try { arm.setItem(CH.cache, JSON.stringify(d)); } catch (e) { try { arm.removeItem(CH.cache); } catch (e2) {} }
    }
    function lerCache() { if (!mem) mem = lerJSON(arm, CH.cache, null); return mem; }
    /** A cópia mudou no lugar (escrita otimista): grava de novo no aparelho. tocouOps=true se mexeu em oportunidades. */
    api.tocou = function (tocouOps) {
      if (!mem) return; if (tocouOps !== false) opsSujo = true;
      if (persist) agendarPersistir(); else { try { arm.setItem(CH.cache, JSON.stringify(mem)); } catch (e) { try { arm.removeItem(CH.cache); } catch (e2) {} } }
    };
    api.cacheLocal = function () { return lerCache(); };
    api.persistirAgora = function () { clearTimeout(persistTimer); return persistirJa(); };
    /** Abre a última cópia guardada no aparelho (IndexedDB; migra a do localStorage da 0.9.2). semOps: oportunidades vêm depois (lerOpsCopia). */
    api.abrirCopia = function (o) {
      o = o || {};
      if (mem) return Promise.resolve(mem);
      if (!persist) return Promise.resolve(lerCache());
      return persist.ler('nucleo').then(function (n) {
        if (mem) return mem;
        if (!n) { var velho = lerJSON(arm, CH.cache, null); if (velho) { guardar(velho); } return mem; }
        if (o.semOps) { n.oportunidades = []; n._opsPendentes = true; mem = n; return mem; }
        return persist.ler('oportunidades').then(function (ops) { if (mem) return mem; n.oportunidades = ops || []; mem = n; opsSujo = false; return mem; });
      }, function () { return lerCache(); });
    };
    /** Oportunidades da cópia do aparelho (fora do caminho crítico da abertura). */
    api.lerOpsCopia = function () {
      if (!persist) return Promise.resolve(mem ? mem.oportunidades || [] : []);
      return persist.ler('oportunidades').then(function (ops) {
        if (mem && mem._opsPendentes) { mem.oportunidades = ops || []; delete mem._opsPendentes; opsSujo = false; }
        return mem ? mem.oportunidades : (ops || []);
      }, function () { if (mem) delete mem._opsPendentes; return mem ? mem.oportunidades : []; });
    };
    function meta() { return lerJSON(arm, CH.meta, {}); }
    function gravarMeta(m) { try { arm.setItem(CH.meta, JSON.stringify(m)); } catch (e) {} }

    // ---------- leitura completa (com adaptador para aberturaApp/oportunidadesLeve quando o CRM publicar) ----------
    function mesclarPlanos(d, p) {
      d.config = d.config || {};
      if (p && p.pixPct != null && isFinite(Number(p.pixPct))) d.config.pixPct = Number(p.pixPct);
      if (p && p.anualPct != null && isFinite(Number(p.anualPct))) d.config.anualPct = Number(p.anualPct);
      // v0.9.2 (API @127): chave Pix do painel do CRM. getDados.config.pix vale primeiro; planosPublicos.pix completa se faltar.
      if (p && p.pix && typeof p.pix === 'object' && !(d.config.pix && d.config.pix.chave)) d.config.pix = p.pix;
      else if (p && p.pix && p.pix.nomeBanco && d.config.pix && !d.config.pix.nomeBanco) d.config.pix.nomeBanco = p.pix.nomeBanco; // API @131: nome que aparece no banco
      d.planosPublicos = p;
    }
    /** Caminho atual (servidor de hoje): getDados + leituras independentes em paralelo depois dele (não somam latências entre si). */
    function lerViaGetDados() {
      return chamar('getDados', []).then(function (d) {
        var tarefas = [];
        if (d && !d.agenda && tipo === 'gas' && api.pode('listarAgenda')) tarefas.push(chamar('listarAgenda', [7]).then(function (a) { d.agenda = a; }, function () {}));
        if (d && !Array.isArray(d.leadsLink) && api.pode('leadsLink')) tarefas.push(chamar('leadsLink', []).then(function (l) { d.leadsLink = Array.isArray(l) ? l : []; }, function () {}));
        if (d && !Array.isArray(d.clientesResumo) && api.pode('listarClientesResumo')) tarefas.push(chamar('listarClientesResumo', []).then(function (r) { if (r && Array.isArray(r.clientes)) d.clientesResumo = r.clientes; }, function () {}));
        // v0.8.4: Pix/anual do CRM (planosPublicos + getDados.config.pixPct). Falha silenciosa → fallback local.
        if (d && api.pode('planosPublicos')) tarefas.push(chamar('planosPublicos', []).then(function (p) { mesclarPlanos(d, p); }, function () {}));
        return Promise.all(tarefas).then(function () { return { dados: d }; });
      });
    }
    /** Mapeia uma linha do oportunidadesLeve ({id,nome,ramo,bairro,telefone,whatsapp,instagram,status,ultimaAlteracao,_row}) para os campos do App. */
    function opDeLeve(l) {
      var o = { _row: Number(l._row || l.id) };
      var mapa = { nome: 'empresa', ramo: 'segmento', bairro: 'bairro', telefone: 'telefone', whatsapp: 'whatsapp', instagram: 'instagram', status: 'status', ultimaAlteracao: 'ultimaAlteracao' };
      Object.keys(l).forEach(function (k) { if (k === 'id' || k === '_row') return; o[mapa[k] || k] = l[k]; });
      return o;
    }
    api._opDeLeve = opDeLeve;
    /** oportunidadesLeve (crm-v3 API @131): 1ª vez lista completa em páginas de 2000 (offset até total); depois só {desde}.
     * Mescla por _row NOS MESMOS objetos da cópia (a tela não perde referência) e aplica removidos. Linha nova que só veio pela
     * lista leve fica _parcial (faltam consentimento, histórico, notas…): a tela não mostra botões de contato nela até a leitura completa. */
    function lerOpsLeve(base) {
      var m = meta(), porRow = {}, delta = !!(m.carimboOps && base.length);
      base.forEach(function (o) { porRow[o._row] = o; });
      var pagina = function (off, acc) {
        return chamar('oportunidadesLeve', [delta ? { desde: m.carimboOps } : { offset: off, limit: 2000 }]).then(function (r) {
          if (!r || r.ok === false || !Array.isArray(r.linhas)) throw Object.assign(new Error((r && r.erro) || 'oportunidadesLeve sem linhas'), { codigo: 'OPS_LEVE' });
          if (delta && r.completo) { delta = false; return pagina(0, []); } // servidor pediu lista completa (exclusão em lote, coluna nova…)
          acc = acc.concat(r.linhas);
          if (!delta && r.total != null && off + r.linhas.length < r.total && r.linhas.length) return pagina(off + r.linhas.length, acc).then(function (x) { x.r = x.r || r; return x; });
          return { linhas: acc, r: r };
        });
      };
      return pagina(0, []).then(function (x) {
        var vistos = {};
        x.linhas.forEach(function (l) { var n = opDeLeve(l); vistos[n._row] = 1; if (porRow[n._row]) Object.assign(porRow[n._row], n); else { n._parcial = true; porRow[n._row] = n; } });
        (x.r.removidos || []).forEach(function (rm) { delete porRow[Array.isArray(rm) ? rm[1] : rm]; });
        var lista = Object.keys(porRow).filter(function (k) { return delta || vistos[k]; }).map(function (k) { return porRow[k]; });
        lista.sort(function (a, b) { return a._row - b._row; });
        return { lista: lista, carimbo: x.r.carimbo || '', delta: delta, mudou: x.linhas.length + (x.r.removidos || []).length };
      });
    }
    var opsCorrida = null;
    /** Atualiza as oportunidades da cópia em 2º plano (nunca trava a tela). Evento {tipo:'ops', estado:'inicio'|'fim'|'erro'}. */
    api.atualizarOps = function () {
      if (!api.pode('oportunidadesLeve') || !mem || !online()) return Promise.resolve(null);
      if (opsCorrida) return opsCorrida;
      if (api.fila().some(function (op) { return OPS_ACOES.indexOf(op.acao) >= 0; })) { precisaRecarregar = true; return Promise.resolve(null); } // depois que a fila esvaziar
      var antes = (mem._opsPendentes ? api.lerOpsCopia() : Promise.resolve()), g;
      avisar({ tipo: 'ops', estado: 'inicio' });
      opsCorrida = antes.then(function () { g = escritas; return lerOpsLeve(Array.isArray(mem.oportunidades) ? mem.oportunidades : []); }).then(function (x) {
        opsCorrida = null;
        if (escritas !== g) { precisaRecarregar = true; avisar({ tipo: 'ops', estado: 'fim', mudou: 0 }); return null; } // o Pedro mexeu enquanto baixava: não sobrescreve
        mem.oportunidades = x.lista; delete mem.oportunidadesTotal; api.tocou(true);
        var m = meta(); m.carimboOps = x.carimbo; gravarMeta(m);
        avisar({ tipo: 'ops', estado: 'fim', mudou: x.mudou }); return x;
      }, function (e) {
        opsCorrida = null;
        if (ehDesconhecida(e) || e.codigo === 'OPS_LEVE') { var m = meta(); delete m.carimboOps; gravarMeta(m); }
        // Sem nenhuma oportunidade guardada e lista leve indisponível: busca a lista completa pelo caminho antigo (getDados), em 2º plano.
        var vazio = !mem || !(mem.oportunidades || []).length;
        var reserva = vazio && e.codigo !== 'TOKEN_INVALIDO' ? chamar('getDados', []).then(function (d) { if (d && Array.isArray(d.oportunidades) && mem) { mem.oportunidades = d.oportunidades; api.tocou(true); } }, function () {}) : Promise.resolve();
        return reserva.then(function () { avisar({ tipo: 'ops', estado: 'erro', erro: e }); return null; });
      });
      return opsCorrida;
    };
    /** Só o carimbo da lista leve (1 linha), em paralelo com a abertura completa: as próximas atualizações vêm só com o que mudou. */
    function carimboOpsEmParalelo() {
      return chamar('oportunidadesLeve', [{ offset: 0, limit: 1 }]).then(function (r) { if (r && r.carimbo) { var m = meta(); m.carimboOps = r.carimbo; gravarMeta(m); } }, function () {});
    }
    var PARTES_ANTIGAS = { agenda: function (d) { return tipo === 'gas' && api.pode('listarAgenda') ? chamar('listarAgenda', [7]).then(function (a) { d.agenda = a; }) : null; },
      leadsLink: function (d) { return api.pode('leadsLink') ? chamar('leadsLink', []).then(function (l) { d.leadsLink = Array.isArray(l) ? l : []; }) : null; },
      clientesResumo: function (d) { return api.pode('listarClientesResumo') ? chamar('listarClientesResumo', []).then(function (r) { if (r && Array.isArray(r.clientes)) d.clientesResumo = r.clientes; }) : null; },
      planosPublicos: function (d) { return api.pode('planosPublicos') ? chamar('planosPublicos', []).then(function (p) { mesclarPlanos(d, p); }) : null; } };
    /** Abertura numa chamada (crm-v3 API @131). o.completo = leitura completa pedida (entrada, botão Atualizar): sem desde e com oportunidades.
     * Normal: {desde: carimbo guardado, semOportunidades: true}; semMudanca = nada baixa. Parte com erro (erros) = a chamada antiga só dela. */
    function lerViaAbertura(cache, o) {
      o = o || {};
      var m = meta(), leve = api.pode('oportunidadesLeve');
      var temOps = !!(cache && Array.isArray(cache.oportunidades) && cache.oportunidades.length);
      var semOps = leve && temOps && !o.completo;
      var q = { desde: (!o.completo && cache && m.carimbo) || '' }; if (semOps) q.semOportunidades = true;
      var paralelo = leve && !semOps && (o.completo || !m.carimboOps) ? carimboOpsEmParalelo() : null;
      return chamar('aberturaApp', [q]).then(function (r) {
        if (!r || r.ok === false) throw Object.assign(new Error((r && r.erro) || 'aberturaApp sem resposta'), { codigo: 'ABERTURA' });
        if (r.semMudanca && cache) return { dados: cache, semMudanca: true, opsLeve: semOps, extras: cache._extras || null };
        var d = r.getDados; if (!d || typeof d !== 'object') throw Object.assign(new Error('aberturaApp sem getDados'), { codigo: 'ABERTURA' });
        var erros = r.erros ? (Array.isArray(r.erros) ? r.erros.reduce(function (a, n) { a[typeof n === 'string' ? n : (n && n.parte) || ''] = 1; return a; }, {}) : r.erros) : {};
        if (r.agenda != null && !d.agenda) d.agenda = r.agenda;
        if (Array.isArray(r.leadsLink) && !Array.isArray(d.leadsLink)) d.leadsLink = r.leadsLink;
        if (r.clientesResumo && Array.isArray(r.clientesResumo.clientes) && !Array.isArray(d.clientesResumo)) d.clientesResumo = r.clientesResumo.clientes;
        if (r.planosPublicos) mesclarPlanos(d, r.planosPublicos);
        var faltam = Object.keys(PARTES_ANTIGAS).filter(function (k) { return erros[k] || r[k] == null; });
        if (semOps) { d.oportunidades = cache.oportunidades; } // as guardadas; a lista leve atualiza depois (api.atualizarOps)
        var extras = { listaContratos: r.listaContratos || null, catalogoOS: r.catalogoOS || null, pacote2: r.fornecedores || r.cotacoes || r.insumos ? { fornecedores: r.fornecedores, cotacoes: r.cotacoes, insumos: r.insumos } : null };
        d._extras = { listaContratos: extras.listaContratos, catalogoOS: extras.catalogoOS }; // guardado com a cópia: reabrir com semMudanca não precisa pedir contratos/catálogo de novo
        return Promise.all(faltam.map(function (k) { var p = PARTES_ANTIGAS[k](d); return p ? p.catch(function () {}) : null; })).then(function () {
          m = meta(); m.carimbo = Object.keys(erros).length ? '' : (r.carimbo || ''); gravarMeta(m); // parte faltando: a próxima abertura vem completa
          return (paralelo || Promise.resolve()).then(function () { return { dados: d, extras: extras, opsLeve: semOps, partesAntigas: faltam }; });
        });
      });
    }
    /** Leitura do servidor: aberturaApp quando publicado (config.LEITURAS_VELOCIDADE); se não existir/der erro, o caminho antigo (getDados + leituras). */
    api.lerServidor = function (o) {
      var cache = lerCache();
      var pronto = cache && cache._opsPendentes && persist ? api.lerOpsCopia() : Promise.resolve();
      return pronto.then(function () {
        if (api.pode('aberturaApp')) return lerViaAbertura(cache, o).catch(function (e) { if (e.codigo === 'TOKEN_INVALIDO' || e.codigo === 'SEM_TOKEN') throw e; return lerViaGetDados(); });
        return lerViaGetDados();
      });
    };

    /** Lê dados: online -> servidor (e guarda cópia); offline/erro de rede -> última cópia.
     * v0.9.3: com alteração ainda na fila (sem rede), NÃO troca a cópia (senão a tela "desfaria" o que o Pedro acabou de salvar).
     * Se o Pedro salvou algo ENQUANTO a leitura estava a caminho, a resposta (antiga) também não sobrescreve: pede outra leitura depois.
     * o.completo: leitura completa (entrada/botão Atualizar). */
    api.carregar = function (o) {
      var cache = lerCache(), g = escritas;
      if (!online()) return Promise.resolve({ dados: cache, offline: true });
      if (api._recemValidado && cache) { var d0 = cache; api._recemValidado = false; return Promise.resolve({ dados: d0, offline: false }); } // acabou de baixar ao validar a chave
      return api.sincronizar().then(function () {
        if (api.fila().length && cache) return { dados: cache, pendente: true };
        g = escritas; return api.lerServidor(o);
      }).then(function (x) {
        if (x.pendente || x.semMudanca) return { dados: x.dados, offline: false, semMudanca: !!x.semMudanca, pendente: !!x.pendente, opsLeve: !!x.opsLeve, extras: x.extras || null };
        if (escritas !== g && cache) { precisaRecarregar = true; if (!api.fila().length) setTimeout(function () { avisar({ tipo: 'vazia', recarregar: true, enviados: 0 }); precisaRecarregar = false; }, 0); return { dados: cache, offline: false, pendente: true }; }
        guardar(x.dados); return { dados: x.dados, offline: false, extras: x.extras, opsLeve: !!x.opsLeve };
      }, function (e) { if (e.doServidor || e.codigo === 'SEM_TOKEN') throw e; return { dados: cache, offline: true }; });
    };
    api.ler = function (acao, args) { return chamar(acao, args); };

    var escritas = 0; // v0.9.3: conta gravações feitas no aparelho (leitura antiga que chega depois não sobrescreve)
    function aplicarNaCopia(aplicarLocal, r, tocouOps) { escritas++; var c = lerCache(); if (c && aplicarLocal) { try { aplicarLocal(c, r); } catch (x) {} api.tocou(tocouOps); } }
    function ehOcupado(e) { return !!e && /servidor ocupado/i.test(e.message || ''); }
    function ehRede(e) { return !!e && !e.doServidor && e.codigo !== 'TOKEN_INVALIDO' && e.codigo !== 'SEM_TOKEN'; }
    function comPrazo(p, ms) {
      return new Promise(function (ok, falha) {
        var t = setTimeout(function () { falha(Object.assign(new Error('O servidor demorou para responder.'), { codigo: 'TIMEOUT' })); }, ms);
        p.then(function (r) { clearTimeout(t); ok(r); }, function (e) { clearTimeout(t); falha(e); });
      });
    }
    var OPS_ACOES = ['registrarContatoOp', 'salvarOportunidade', 'virarLead'];
    /** Antes de uma ação que precisa do servidor na hora (link, texto, e-mail…), manda o que está na fila: o servidor vê o que a tela já mostra. */
    function esperarFila() { return api.fila().length && online() ? api.sincronizar().catch(function () {}) : Promise.resolve(); }

    /** Escrita: tenta enviar; sem internet, vai para a fila e é aplicada na cópia local (otimista). */
    /** idOp (opcional, v0.8.9): id da operação enviado como idOperacao (repetição no servidor → "Já recebido."). */
    api.escrever = function (acao, args, aplicarLocal, idOp) {
      if (!ACOES[acao] || !ACOES[acao].escrita) return Promise.reject(new Error('Ação de escrita inválida: ' + acao));
      if (!api.pode(acao)) return Promise.reject(new Error('Esta função ainda não foi liberada no servidor (crm-v3).'));
      var op = { id: idOp ? String(idOp) : novoId(), acao: acao, args: args, em: new Date().toISOString() };
      if (SO_ONLINE.indexOf(acao) >= 0) {
        if (!online()) return Promise.reject(new Error('Sem internet: nada foi enviado. Tente de novo com conexão.'));
        return esperarFila().then(function () { return chamar(acao, args, op.id); }).then(function (r) { aplicarNaCopia(aplicarLocal ? function (c) { aplicarLocal(c, r); } : null, r, OPS_ACOES.indexOf(acao) >= 0); return { enfileirado: false, msg: (r && r.msg) || (r && r.acao === 'atualizado' ? 'Evento atualizado na Agenda.' : r && r.acao === 'criado' ? 'Evento criado na Agenda.' : 'Feito.'), dados: r }; });
      }
      aplicarNaCopia(aplicarLocal, null, OPS_ACOES.indexOf(acao) >= 0);
      var enfileirar = function () { var fl = api.fila(); fl.push(op); gravarFila(fl); avisar({ tipo: 'fila' }); return { enfileirado: true, msg: 'Sem internet: salvo no aparelho, envio quando voltar.' }; };
      if (!online()) return Promise.resolve(enfileirar());
      return chamar(acao, args, op.id).then(function (r) { return { enfileirado: false, msg: (r && r.msg) || 'Salvo.', dados: r }; },
        function (e) { if (e.codigo === 'TOKEN_INVALIDO' || e.codigo === 'SEM_TOKEN') { enfileirar(); throw e; } if (e.doServidor) throw e; return enfileirar(); });
    };

    /** v0.9.3: escrita OTIMISTA. Aplica na cópia (a tela já mostra), entra na fila e volta NA HORA com {pendente:true, id, msg}.
     * opc: { idOp, tmp (registro provisório, ex.: "OS nova (enviando…)"), recarregar (pedir leitura em 2º plano depois), aoConfirmar(r), aoFalhar(e) }.
     * Pagamento, Comprado e o que precisa da resposta NÃO passam por aqui (ver escreverConfirmado / SO_ONLINE). */
    api.enviar = function (acao, args, aplicarLocal, o) {
      o = o || {};
      if (!ACOES[acao] || !ACOES[acao].escrita) return Promise.reject(new Error('Ação de escrita inválida: ' + acao));
      if (!api.pode(acao)) return Promise.reject(new Error('Esta função ainda não foi liberada no servidor (crm-v3).'));
      if (SO_ONLINE.indexOf(acao) >= 0 || CONFIRMAR.indexOf(acao) >= 0) return Promise.reject(new Error('Esta ação só vale depois que o servidor confirmar.'));
      var op = { id: o.idOp ? String(o.idOp) : novoId(), acao: acao, args: args, em: new Date().toISOString() };
      if (o.tmp) op.tmp = String(o.tmp);
      if (o.recarregar) op.recarregar = true;
      aplicarNaCopia(aplicarLocal, null, OPS_ACOES.indexOf(acao) >= 0);
      var fl = api.fila(); fl.push(op); gravarFila(fl);
      if (o.aoConfirmar || o.aoFalhar) retornos[op.id] = { ok: o.aoConfirmar, falha: o.aoFalhar };
      avisar({ tipo: 'fila', op: op });
      setTimeout(function () { drenar(true); }, 0);
      return Promise.resolve({ pendente: true, enfileirado: !online(), id: op.id, msg: online() ? 'Salvo.' : 'Sem internet: salvo no aparelho, envio quando voltar.' });
    };

    /** v0.9.3: escrita que só conta DEPOIS da confirmação do servidor (pagamento, Pix, mensalidade, Comprado). Nunca vai para a fila.
     * Repete sozinha (mesmo idOperacao) em queda de rede, tempo esgotado ou "Servidor ocupado"; aplica na cópia só com a resposta. */
    api.escreverConfirmado = function (acao, args, aplicarLocal, idOp) {
      if (!ACOES[acao] || !ACOES[acao].escrita) return Promise.reject(new Error('Ação de escrita inválida: ' + acao));
      if (!api.pode(acao)) return Promise.reject(new Error('Esta função ainda não foi liberada no servidor (crm-v3).'));
      if (!online()) return Promise.reject(new Error('Sem internet: nada foi lançado. Tente de novo com conexão.'));
      var id = idOp ? String(idOp) : novoId(), tent = 0;
      var vai = function () {
        return comPrazo(chamar(acao, args, id), PRAZO_CONF).then(null, function (e) {
          if ((ehRede(e) || ehOcupado(e)) && tent < 2 && online()) { tent++; return new Promise(function (ok) { setTimeout(ok, ESPERAS[tent - 1]); }).then(vai); }
          if (ehRede(e)) throw Object.assign(new Error(e.codigo === 'TIMEOUT' ? 'O servidor não confirmou a tempo. Confira no CRM antes de lançar de novo (repetir é seguro: não duplica).' : 'Sem conexão com o servidor: nada foi confirmado. Tente de novo (não duplica).'), { codigo: e.codigo || 'SEM_REDE' });
          throw e;
        });
      };
      return esperarFila().then(vai).then(function (r) {
        aplicarNaCopia(aplicarLocal ? function (c) { aplicarLocal(c, r); } : null, r, false);
        return { enfileirado: false, confirmado: true, msg: (r && r.msg) || 'Confirmado pelo servidor.', dados: r };
      });
    };

    // ---------- fila em segundo plano ----------
    var corrida = null, espera = 0, timerEspera = null, precisaRecarregar = false;
    function tirarDaFila(id) { gravarFila(api.fila().filter(function (x) { return x.id !== id; })); }
    function confirmar(op, r) {
      if (op.recarregar || (op.tmp && !(r && (r.num || r._row || r.row)))) precisaRecarregar = true;
      var cb = retornos[op.id]; delete retornos[op.id];
      if (typeof api.aoConfirmado === 'function') { try { api.aoConfirmado(op, r); } catch (x) {} }
      if (cb && cb.ok) { try { cb.ok(r); } catch (x) {} }
      avisar({ tipo: 'confirmado', op: op, dados: r });
    }
    function recusar(op, e) {
      var l = api.filaErros(); l.push(Object.assign({}, op, { erro: String(e && e.message || e), quando: new Date().toISOString() })); gravarErros(l);
      var cb = retornos[op.id]; delete retornos[op.id];
      if (typeof api.aoRecusado === 'function') { try { api.aoRecusado(op, e); } catch (x) {} }
      if (cb && cb.falha) { try { cb.falha(e); } catch (x) {} }
      avisar({ tipo: 'recusado', op: op, erro: e });
    }
    function agendarNovaTentativa() {
      clearTimeout(timerEspera); if (!api.fila().length) return;
      var ms = ESPERAS[Math.min(espera, ESPERAS.length - 1)]; espera++;
      timerEspera = setTimeout(function () { if (online()) drenar(true); }, ms);
    }
    /** Envia a fila na ordem (uma corrida por vez). Erro de rede/tempo/ocupado para (e, se persistente, tenta de novo depois);
     * recusa do servidor tira da fila, guarda em filaErros e segue com a próxima. */
    function drenar(persistente) {
      if (corrida) { if (persistente) corrida.persistente = true; return corrida.p; }
      var st = corrida = { enviados: 0, erros: [], persistente: !!persistente, parou: false };
      var passo = function () {
        var fl = api.fila(); if (!fl.length || !online()) { st.parou = !!fl.length; return Promise.resolve(); }
        var op = fl[0];
        return comPrazo(chamar(op.acao, op.args, op.id), PRAZO_FILA).then(function (r) {
          tirarDaFila(op.id); st.enviados++; espera = 0; confirmar(op, r); return passo();
        }, function (e) {
          if (e.codigo === 'TOKEN_INVALIDO' || e.codigo === 'SEM_TOKEN') throw e;
          if (e.doServidor && !ehOcupado(e)) { tirarDaFila(op.id); st.erros.push(op.acao + ': ' + e.message); recusar(op, e); return passo(); }
          st.parou = true; avisar({ tipo: 'rede', op: op, erro: e });
        });
      };
      st.p = passo().then(function () { return null; }, function (e) { return e; }).then(function (erroToken) {
        corrida = null;
        var pend = api.fila().length;
        if (pend && st.persistente && st.parou) agendarNovaTentativa();
        if (!pend) { espera = 0; var rec = precisaRecarregar; precisaRecarregar = false; avisar({ tipo: 'vazia', recarregar: rec, enviados: st.enviados }); }
        if (erroToken) throw erroToken;
        return { enviados: st.enviados, pendentes: pend, erros: st.erros };
      });
      return st.p;
    }
    api.processarFila = function () { return drenar(true); };
    /** Envia a fila na ordem. Para no primeiro erro de rede; erro do servidor tira a operação da fila, guarda em filaErros e reporta. */
    api.sincronizar = function () {
      if (!api.fila().length || !online()) return Promise.resolve({ enviados: 0, pendentes: api.fila().length, erros: [] });
      return drenar(false);
    };
    /** Recusadas: tentar de novo (volta para a fila) ou descartar (a próxima leitura traz o que está no CRM). */
    api.reenviarErro = function (id) {
      var l = api.filaErros(), op = l.filter(function (x) { return x.id === id; })[0]; if (!op) return Promise.resolve(false);
      gravarErros(l.filter(function (x) { return x.id !== id; }));
      var limpo = { id: op.id, acao: op.acao, args: op.args, em: op.em }; if (op.tmp) limpo.tmp = op.tmp; if (op.recarregar) limpo.recarregar = true;
      var fl = api.fila(); fl.push(limpo); gravarFila(fl); avisar({ tipo: 'fila', op: limpo }); return drenar(true).then(function () { return true; });
    };
    api.descartarErro = function (id) { gravarErros(api.filaErros().filter(function (x) { return x.id !== id; })); avisar({ tipo: 'fila' }); return true; };
    return api;
  }

  /** Adaptador MOCK: simula o servidor do crm-v3 com dados fictícios. Mesma interface e mesmos códigos de erro. */
  function criarAdaptadorMock(opc) {
    opc = opc || {};
    var arm = opc.armazenamento || localStorage;
    var online = opc.online || function () { return typeof navigator === 'undefined' || navigator.onLine !== false; };
    var base = opc.dados || (typeof ProFixMock !== 'undefined' ? ProFixMock.dadosFicticios(opc.hoje) : null);
    var tokenServidor = opc.tokenServidor || 'demo-profix-chave-ficticia';
    var D = JSON.parse(JSON.stringify(base));
    var log = [];
    var servidor = (typeof ProFixMock !== 'undefined' ? ProFixMock : require('./mock-dados.js')).criarServidor(D, { enviarSenha: !!opc.enviarSenha, falharPartes: opc.falharPartes });
    function chamar(acao, args, idOp) {
      return new Promise(function (ok, falha) {
        setTimeout(function () {
          if (!online()) return falha(new Error('Sem rede'));
          var token = tokenAtual(arm);
          if (!token) return falha(Object.assign(new Error('Aparelho sem chave de acesso.'), { codigo: 'SEM_TOKEN' }));
          if (token !== tokenServidor && !(sessoes[token] && sessoes[token] > agora())) return falha(Object.assign(new Error('Chave de acesso inválida.'), { codigo: 'TOKEN_INVALIDO', doServidor: true }));
          if ((!ACOES[acao] && !(LEITURA_VELOCIDADE.indexOf(acao) >= 0 && (opc.velocidade || []).indexOf(acao) >= 0)) || !servidor[acao] || (opc.semAcoes || []).indexOf(acao) >= 0) return falha(Object.assign(new Error('Ação desconhecida: ' + acao), { doServidor: true, codigo: 'ACAO_DESCONHECIDA' }));
          var fz = falhasForcadas[acao]; // v0.9.3 (só demo/testes): simula recusa do servidor ou "Servidor ocupado"
          if (fz && fz.vezes > 0) { fz.vezes--; return falha(Object.assign(new Error(fz.msg), fz.ocupado ? {} : { doServidor: true })); }
          var rep = idOp ? log.filter(function (l) { return l.id === idOp; })[0] : null;
          // idempotência: o link repetido devolve a MESMA url (crm-v3 @127); API @131: repetição devolve a 1ª resposta (num/_row) com repetida:true e 'Já recebido.'
          if (rep) return ok(acao === 'linkClienteOS' && rep.r ? rep.r : Object.assign({}, rep.r && typeof rep.r === 'object' ? rep.r : { ok: true }, { repetida: true, msg: 'Já recebido.' }));
          var a0 = (args || [])[0], idApp = CRIACOES_IDAPP.indexOf(acao) >= 0 && (opc.velocidade || []).indexOf('idApp') >= 0 && a0 && typeof a0.idApp === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(a0.idApp) ? acao + '|' + a0.idApp : '';
          if (idApp && criadosIdApp[idApp]) { var ja = Object.assign({}, criadosIdApp[idApp], { repetida: true }); ja.msg = (ja.msg || 'Já salvo.') + ' (já estava salvo)'; log.push({ id: idOp, acao: acao, args: args, r: ja }); return ok(ja); }
          try { var r = servidor[acao].apply(null, args || []); if (idApp && r && typeof r === 'object') { r.idApp = a0.idApp; criadosIdApp[idApp] = JSON.parse(JSON.stringify(r)); }
            log.push({ id: idOp, acao: acao, args: args, r: r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r }); ok(r); }
          catch (e) { falha(Object.assign(e, { doServidor: true })); }
        }, opc.atraso || 0);
      });
    }
    // loginSenha simulado: mesmos códigos do servidor (SENHA_INVALIDA, BLOQUEADO após 5 erros por 15 min, SEM_SENHA).
    var agora = opc.agora || function () { return Date.now(); };
    var senhaServidor = opc.senhaServidor === undefined ? 'demo-senha-123' : opc.senhaServidor, sessoes = lerJSON(arm, 'profix.mock.sessoes', {}), erros = 0, bloqueadoAte = 0;
    function login(senha) {
      return new Promise(function (ok, falha) {
        setTimeout(function () {
          if (!online()) return falha(new Error('Sem rede'));
          var E = function (c, m) { falha(Object.assign(new Error(m), { codigo: c, doServidor: true })); };
          if (!senhaServidor) return E('SEM_SENHA', 'Senha não definida.');
          if (bloqueadoAte > agora()) return E('BLOQUEADO', 'Bloqueado.');
          if (senha !== senhaServidor) { erros++; if (erros >= 5) { erros = 0; bloqueadoAte = agora() + 15 * 60000; return E('BLOQUEADO', 'Bloqueado.'); } return E('SENHA_INVALIDA', 'Senha inválida.'); }
          erros = 0; var t = 'sessao-' + novoId() + novoId(), exp = agora() + 30 * 864e5; sessoes[t] = exp; arm.setItem('profix.mock.sessoes', JSON.stringify(sessoes));
          ok({ token: t, expira: new Date(exp).toISOString() });
        }, opc.atraso || 0);
      });
    }
    var falhasForcadas = {}, criadosIdApp = {}, CRIACOES_IDAPP = ['salvarCliente', 'salvarOS', 'salvarOSMulti'];
    var api = montar(chamar, arm, online, 'mock', login, { persistencia: opc.persistencia, velocidade: opc.velocidade || [], esperas: opc.esperas, prazoFila: opc.prazoFila, prazoConfirmar: opc.prazoConfirmar });
    /** Só demo/testes (v0.9.3): muda o tempo de resposta simulado e força falhas (recusa ou "Servidor ocupado") nas próximas N chamadas. */
    api._atraso = function (ms) { opc.atraso = ms; };
    api._falhar = function (acao, msg, vezes, ocupado) { falhasForcadas[acao] = { msg: msg || 'Recusado (teste).', vezes: vezes == null ? 1 : vezes, ocupado: !!ocupado }; };
    api._servidor = function () { return { dados: D, log: log, sessoes: sessoes, expirarSessoes: function () { Object.keys(sessoes).forEach(function (k) { sessoes[k] = 0; }); arm.setItem('profix.mock.sessoes', JSON.stringify(sessoes)); } }; };
    return api;
  }

  return { SO_ONLINE: SO_ONLINE, CONFIRMAR: CONFIRMAR, semSegredos: semSegredos, ehDesconhecida: ehDesconhecida, ACOES: ACOES, CHAVES: CH, criarAdaptadorGas: criarAdaptadorGas, criarAdaptadorMock: criarAdaptadorMock };
});
