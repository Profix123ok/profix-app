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
  var LEITURA = ['getDados', 'listarAgenda'];
  var ESCRITA = ['salvarCliente', 'moverEtapa', 'registrarInteracao', 'salvarOS', 'mudarStatusOS', 'salvarOrcamento', 'decidirOrcamento',
    'lancarRecebimento', 'salvarPeca', 'salvarLancamento', 'mudarStatusTarefa', 'salvarOportunidade', 'registrarContatoOp', 'virarLead',
    'salvarRevenda', 'venderRevenda', 'salvarServicoCatalogo', 'salvarModelo', 'registrarFollowup',
    'criarEventoAgenda', 'removerEventoAgenda', 'enviarEmailCliente']; // crm-v3 v13 (enviarEmailCliente exige idOperacao: sempre mandamos)
  var SO_ONLINE = ['criarEventoAgenda', 'removerEventoAgenda', 'enviarEmailCliente']; // nunca vão para a fila offline (e-mail não sai "depois" sem o Pedro ver)
  var ACOES = {};
  LEITURA.forEach(function (a) { ACOES[a] = { escrita: false }; });
  ESCRITA.forEach(function (a) { ACOES[a] = { escrita: true }; });


  var CH = { token: 'profix.token', cache: 'profix.cacheDados', fila: 'profix.filaEscritas', quando: 'profix.cacheQuando', sessao: 'profix.sessao', desligadas: 'profix.acoesDesconhecidas' };
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

    function chamar(acao, args, idOp) {
      if (!ACOES[acao]) return Promise.reject(new Error('Ação não permitida: ' + acao));
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
    var api = montar(chamar, arm, online, 'gas', function (senha) { return postar('', 'loginSenha', { senha: senha }); });
    if (opc.liberadas) api.liberadas = opc.liberadas;
    /** Checagem de saúde (GET ?saude=1, sem chave e sem dados). */
    api.saude = function () { return f(url + (url.indexOf('?') < 0 ? '?' : '&') + 'saude=1', { method: 'GET', redirect: 'follow' }).then(function (r) { return r.json(); }); };
    return api;
  }

  /** Comum aos dois adaptadores: cache da última leitura + fila de escritas offline. */
  function montar(chamar, arm, online, tipo, login) {
    var api = { tipo: tipo, liberadas: null, aoExpirar: null };
    /** Sessão/chave recusada: limpa o acesso (a fila offline e a cópia local ficam) e avisa o app. */
    function acessoRecusado() { arm.removeItem(CH.sessao); arm.removeItem(CH.token); if (typeof api.aoExpirar === 'function') { try { api.aoExpirar(); } catch (x) {} } }
    var desl = function () { return lerJSON(arm, CH.desligadas, []); };
    var chamarBase = chamar;
    chamar = function (acao, args, id) {
      return chamarBase(acao, args, id).catch(function (e) {
        if (e.codigo === 'TOKEN_INVALIDO') acessoRecusado();
        if (e.doServidor && ehDesconhecida(e) && desl().indexOf(acao) < 0) { var l = desl(); l.push(acao); arm.setItem(CH.desligadas, JSON.stringify(l)); }
        throw e;
      });
    };
    /** true se o servidor já aceita a ação (mock: todas) e ela não foi recusada como "desconhecida". */
    api.pode = function (acao) { return !!ACOES[acao] && (!api.liberadas || api.liberadas.indexOf(acao) >= 0) && desl().indexOf(acao) < 0; };
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
    api.ultimaAtualizacao = function () { return arm.getItem(CH.quando) || ''; };
    // Falha ao gravar no aparelho (cota cheia) não pode descartar os dados que acabaram de chegar.
    function guardar(d) { try { arm.setItem(CH.cache, JSON.stringify(d)); arm.setItem(CH.quando, new Date().toISOString()); } catch (e) { try { arm.removeItem(CH.cache); } catch (e2) {} } }
    api.cacheLocal = function () { return lerJSON(arm, CH.cache, null); };

    /** Lê dados: online -> servidor (e guarda cópia); offline/erro de rede -> última cópia. */
    api.carregar = function () {
      var cache = lerJSON(arm, CH.cache, null);
      if (!online()) return Promise.resolve({ dados: cache, offline: true });
      if (api._recemValidado && cache) { var d0 = cache; api._recemValidado = false; return Promise.resolve({ dados: d0, offline: false }); } // acabou de baixar ao validar a chave
      return api.sincronizar().then(function () { return chamar('getDados', []); }).then(function (d) {
        if (d && !d.agenda && tipo === 'gas' && api.pode('listarAgenda')) return chamar('listarAgenda', [7]).then(function (a) { d.agenda = a; return d; }, function () { return d; });
        return d;
      }).then(function (d) { guardar(d); return { dados: d, offline: false }; },
        function (e) { if (e.doServidor || e.codigo === 'SEM_TOKEN') throw e; return { dados: cache, offline: true }; });
    };
    api.ler = function (acao, args) { return chamar(acao, args); };

    /** Escrita: tenta enviar; sem internet, vai para a fila e é aplicada na cópia local (otimista). */
    api.escrever = function (acao, args, aplicarLocal) {
      if (!ACOES[acao] || !ACOES[acao].escrita) return Promise.reject(new Error('Ação de escrita inválida: ' + acao));
      if (!api.pode(acao)) return Promise.reject(new Error('Esta função ainda não foi liberada no servidor (crm-v3).'));
      var op = { id: novoId(), acao: acao, args: args, em: new Date().toISOString() };
      if (SO_ONLINE.indexOf(acao) >= 0) {
        if (!online()) return Promise.reject(new Error('Sem internet: nada foi enviado. Tente de novo com conexão.'));
        return chamar(acao, args, op.id).then(function (r) { if (aplicarLocal) { var c = lerJSON(arm, CH.cache, null); if (c) { aplicarLocal(c, r); arm.setItem(CH.cache, JSON.stringify(c)); } } return { enfileirado: false, msg: (r && r.msg) || (r && r.acao === 'atualizado' ? 'Evento atualizado na Agenda.' : r && r.acao === 'criado' ? 'Evento criado na Agenda.' : 'Feito.'), dados: r }; });
      }
      var cache = lerJSON(arm, CH.cache, null);
      if (cache && aplicarLocal) { aplicarLocal(cache); arm.setItem(CH.cache, JSON.stringify(cache)); }
      var enfileirar = function () { var fl = api.fila(); fl.push(op); arm.setItem(CH.fila, JSON.stringify(fl)); return { enfileirado: true, msg: 'Sem internet: salvo no aparelho, envio quando voltar.' }; };
      if (!online()) return Promise.resolve(enfileirar());
      return chamar(acao, args, op.id).then(function (r) { return { enfileirado: false, msg: (r && r.msg) || 'Salvo.' }; },
        function (e) { if (e.codigo === 'TOKEN_INVALIDO' || e.codigo === 'SEM_TOKEN') { enfileirar(); throw e; } if (e.doServidor) throw e; return enfileirar(); });
    };

    /** Envia a fila na ordem. Para no primeiro erro de rede; erro do servidor descarta a operação e reporta. */
    api.sincronizar = function () {
      var fl = api.fila(), enviados = 0, erros = [];
      if (!fl.length || !online()) return Promise.resolve({ enviados: 0, pendentes: fl.length, erros: erros });
      var passo = function () {
        if (!fl.length) return Promise.resolve();
        var op = fl[0];
        return chamar(op.acao, op.args, op.id).then(function () { fl.shift(); enviados++; arm.setItem(CH.fila, JSON.stringify(fl)); return passo(); },
          function (e) { if (e.codigo === 'TOKEN_INVALIDO') throw e; if (e.doServidor) { erros.push(op.acao + ': ' + e.message); fl.shift(); arm.setItem(CH.fila, JSON.stringify(fl)); return passo(); } });
      };
      return passo().then(function () { return { enviados: enviados, pendentes: fl.length, erros: erros }; },
        function (e) { if (e.codigo === 'TOKEN_INVALIDO') throw e; return { enviados: enviados, pendentes: fl.length, erros: erros }; });
    };
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
    var servidor = (typeof ProFixMock !== 'undefined' ? ProFixMock : require('./mock-dados.js')).criarServidor(D, { enviarSenha: !!opc.enviarSenha });
    function chamar(acao, args, idOp) {
      return new Promise(function (ok, falha) {
        setTimeout(function () {
          if (!online()) return falha(new Error('Sem rede'));
          var token = tokenAtual(arm);
          if (!token) return falha(Object.assign(new Error('Aparelho sem chave de acesso.'), { codigo: 'SEM_TOKEN' }));
          if (token !== tokenServidor && !(sessoes[token] && sessoes[token] > agora())) return falha(Object.assign(new Error('Chave de acesso inválida.'), { codigo: 'TOKEN_INVALIDO', doServidor: true }));
          if (!ACOES[acao] || !servidor[acao] || (opc.semAcoes || []).indexOf(acao) >= 0) return falha(Object.assign(new Error('Ação desconhecida: ' + acao), { doServidor: true, codigo: 'ACAO_DESCONHECIDA' }));
          if (idOp && log.some(function (l) { return l.id === idOp; })) return ok({ ok: true, msg: 'Já recebido.' }); // idempotência
          try { var r = servidor[acao].apply(null, args || []); log.push({ id: idOp, acao: acao, args: args }); ok(r); }
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
    var api = montar(chamar, arm, online, 'mock', login);
    api._servidor = function () { return { dados: D, log: log, sessoes: sessoes, expirarSessoes: function () { Object.keys(sessoes).forEach(function (k) { sessoes[k] = 0; }); arm.setItem('profix.mock.sessoes', JSON.stringify(sessoes)); } }; };
    return api;
  }

  return { SO_ONLINE: SO_ONLINE, ehDesconhecida: ehDesconhecida, ACOES: ACOES, CHAVES: CH, criarAdaptadorGas: criarAdaptadorGas, criarAdaptadorMock: criarAdaptadorMock };
});
