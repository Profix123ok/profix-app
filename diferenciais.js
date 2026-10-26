/* ProFix – v0.7.1: prazos vêm do servidor (getDados.config) e o resumo dos clientes vem de listarClientesResumo (API @43).
 * v0.7.0: diferenciais do CRM no app (crm-v3 API @41, CONTRATO_DIFERENCIAIS.md).
 * Funções puras (sem tela): regra de contato, números do cliente, filtros, garantia, linha do tempo.
 * As contas seguem o crm-v3 (DiferenciaisC.gs situacaoCliente_ / Diferenciais.gs regraContato_) para a prévia sem internet;
 * quando o servidor responde (fichaCliente, getDados.dif.clientes), vale a resposta do servidor. Nada aqui envia mensagem. */
(function (raiz, fabrica) { var m = fabrica(); if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFixDif = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // v0.7.1: sem prazos fixos no código. Garantia, validade e desconto de indicação vêm de getDados().config (Propriedades do script do crm-v3).
  function numOuNulo(v) { if (v === '' || v == null) return null; var x = Number(String(v).replace(',', '.')); return isFinite(x) && x > 0 ? x : null; }
  function padroes(D) {
    var c = (D && D.config) || {}, d = (D && D.dif) || {};
    return { garantiaDias: numOuNulo(c.garantiaDiasProfix != null ? c.garantiaDiasProfix : c.garantiaServDias), validadeDias: numOuNulo(c.validadePadraoDias != null ? c.validadePadraoDias : c.validadeOrcDias),
      indicacaoPct: numOuNulo(c.descontoIndicacaoPct != null ? c.descontoIndicacaoPct : d.descontoIndicacaoPct), googleReviewUrl: /^https:\/\//i.test(String(c.googleReviewUrl || '')) ? String(c.googleReviewUrl) : '' };
  }
  var LEGADO = { 'Orçamento': 'Aguardando aprovação', 'Em andamento': 'Em reparo' };
  function statusCanon(s) { s = String(s || '').trim(); return LEGADO[s] || s || 'Recebido'; }
  function iso(v) { var s = String(v || ''); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; }
  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function utc(a) { return Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)); }
  function diasEntre(a, b) { return Math.round((utc(b) - utc(a)) / 864e5); }
  function somaDias(a, d) { return new Date(utc(a) + d * 864e5).toISOString().slice(0, 10); }
  function somaMeses(a, m) { return new Date(Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1 + m, +a.slice(8, 10))).toISOString().slice(0, 10); }
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

  /** "Não contatar" = Sim bloqueia tudo; serviço da OS sem consentimento = liberado com aviso; marketing só com "Sim". */
  function naoContatar(c) { return /^s/i.test(String((c && c.naoContatar) || '').trim()); }
  function regraContato(c, tipo) {
    c = c || {};
    if (naoContatar(c)) return { pode: false, bloqueado: true, aviso: 'Cliente marcado como “Não contatar”: nenhuma mensagem pode ser aberta.' };
    var ok = String(c.consent || '') === 'Sim';
    if (tipo === 'marketing') return ok ? { pode: true, aviso: '' } : { pode: false, aviso: 'Mensagem de marketing: só para quem deu consentimento “Sim”.' };
    return { pode: true, aviso: ok ? '' : 'Atenção: cliente sem consentimento “Sim”. Mensagem de serviço da OS liberada; envie só o necessário sobre o atendimento.' };
  }
  /** Selo LGPD do cliente: {cls, texto}. */
  function seloLgpd(c) {
    if (naoContatar(c)) return { chave: 'bloq', cls: 'vencido', texto: '⛔ Não contatar' };
    if (c && c.consent === 'Sim') return { chave: 'sim', cls: 'ok', texto: '🛡 LGPD: consentimento Sim' + (iso(c.dataConsent) ? ' desde ' + dataBR(c.dataConsent) : '') };
    return { chave: 'nao', cls: 'alta', texto: '⚠️ Sem consentimento LGPD' };
  }
  function dataBR(v) { var s = iso(v); return s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : ''; }

  // ---------- Números do cliente (igual a situacaoCliente_ do crm-v3) ----------
  function osDoCliente(nome, oss) { return (oss || []).filter(function (o) { return o.cliente === nome; }).sort(function (a, b) { return iso(a.entrada) < iso(b.entrada) ? -1 : iso(a.entrada) > iso(b.entrada) ? 1 : String(a.num) < String(b.num) ? -1 : 1; }); }
  function garantiasDaOS(o, hoje, dias) {
    dias = numOuNulo(dias); if (!dias || statusCanon(o.status) !== 'Entregue' || !iso(o.entrega)) return [];
    var ate = somaDias(iso(o.entrega), dias);
    return [{ os: o.num, servico: String(o.itensOrc || o.servico || 'Serviço').split('\n')[0], dias: dias, inicio: iso(o.entrega), ate: ate, ativa: !hoje || ate >= hoje, restam: hoje ? diasEntre(hoje, ate) : null }];
  }
  function garantiasAtivas(nome, oss, hoje, dias) {
    var at = []; (oss || []).forEach(function (o) { if (o.cliente === nome) garantiasDaOS(o, hoje, dias).forEach(function (g) { if (g.ativa) at.push(g); }); });
    return at.sort(function (a, b) { return a.ate < b.ate ? 1 : -1; });
  }
  function ehFood(c) { return /restaurante|lanchonete|pizzaria|padaria/.test(norm([c.nome, c.obs, c.bairro, c.tipoCli].join(' '))); }
  function situacaoCliente(c, oss, hoje, diasGar) {
    var lista = osDoCliente(c.nome, oss), validas = lista.filter(function (o) { return statusCanon(o.status) !== 'Cancelado'; });
    var ult = lista.length ? lista[lista.length - 1] : null, ultData = ult ? (iso(ult.entrega) || iso(ult.entrada)) : '';
    var fechada = function (o) { var s = statusCanon(o.status); return s === 'Entregue' || s === 'Cancelado' || o.aprovacao === 'Recusado' || o.aprovacao === 'Sem resposta'; };
    var recusada = ult && (ult.aprovacao === 'Recusado' || ult.aprovacao === 'Sem resposta'), aberta = lista.some(function (o) { return !fechada(o); });
    var sit = recusada && !aberta ? 'Perdido' : ultData && !aberta && diasEntre(ultData, hoje) >= 183 ? 'Inativo' : validas.length >= 2 ? 'Recorrente' : validas.length === 1 ? 'Novo' : (c.motivoPerda || c.etapa === 'Perdido' ? 'Perdido' : 'Sem OS');
    var ent = lista.filter(function (o) { return statusCanon(o.status) === 'Entregue'; }), total = ent.reduce(function (s, o) { return s + n(o.valor); }, 0), custo = ent.reduce(function (s, o) { return s + n(o.custo); }, 0);
    var gar = garantiasAtivas(c.nome, oss, hoje, diasGar), entData = ent.filter(function (o) { return iso(o.entrega); });
    // "último atendimento" = última OS ou última conversa registrada (o que for mais recente)
    return { situacao: sit, nOS: validas.length, osAberta: aberta, totalGasto: Math.round(total * 100) / 100, lucro: Math.round((total - custo) * 100) / 100,
      ticketMedio: ent.length ? Math.round(total / ent.length * 100) / 100 : 0, ultimaOS: ultData, diasDesde: ultData ? diasEntre(ultData, hoje) : null,
      ultimoServico: ult ? String(ult.servico || ult.itensOrc || ult.defeito || '').split('\n')[0] : '', garantiaAte: gar.length ? gar[0].ate : '',
      preventivaEm: entData.length ? somaMeses(iso(entData[entData.length - 1].entrega), ehFood(c) ? 3 : 6) : '',
      ultimaOSNum: ult ? ult.num : '', ultimaOSStatus: ult ? statusCanon(ult.status) : '', ultimaOSRow: ult ? ult._row : '' };
  }
  /** Resumo de todos os clientes: usa getDados().dif.clientes do servidor (se veio) e completa com a conta local. */
  function resumoClientes(D) {
    var srv = (D && D.dif && D.dif.clientes) || {}, hoje = D.hoje, dg = padroes(D).garantiaDias, out = {}, lst = {};
    (Array.isArray(D.clientesResumo) ? D.clientesResumo : []).forEach(function (r) { if (r && r.nome) lst[r.nome] = r; });
    (D.clientes || []).forEach(function (c) {
      var loc = situacaoCliente(c, D.os, hoje, dg), s = Object.assign({}, loc, srv[c.nome] || {});
      s.ultimaOSNum = loc.ultimaOSNum; s.ultimaOSStatus = loc.ultimaOSStatus; s.ultimaOSRow = loc.ultimaOSRow;
      var r = lst[c.nome]; // v0.7.1: listarClientesResumo (mesmos cálculos do painel) vale por cima da conta local
      if (r) {
        s.fonte = 'servidor'; s.totalGasto = n(r.totalGasto); if (r.situacao) s.situacao = r.situacao;
        if (r.ultimaOS) { s.ultimaOSNum = r.ultimaOS.num || ''; s.ultimaOSStatus = statusCanon(r.ultimaOS.status); var ro = (D.os || []).filter(function (o) { return o.num === r.ultimaOS.num; })[0]; s.ultimaOSRow = ro ? ro._row : ''; }
        else { s.ultimaOSNum = ''; s.ultimaOSStatus = ''; s.ultimaOSRow = ''; }
        if (iso(r.ultimoAtendimento)) s.ultimaOS = iso(r.ultimoAtendimento);
        s.garantiaAte = iso(r.garantiaAte) || ''; if (r.preventiva) s.preventivaEm = iso(r.preventiva) || s.preventivaEm;
      }
      var ultCont = [iso(c.ultimo)].concat((D.interacoes || []).filter(function (i) { return i.cliente === c.nome; }).map(function (i) { return iso(i.data); })).filter(Boolean).sort().pop() || '';
      s.ultimoContato = ultCont; var ref = [s.ultimaOS, ultCont].filter(Boolean).sort().pop() || '';
      s.diasSemRetorno = ref ? diasEntre(ref, hoje) : null;
      out[c.nome] = s;
    });
    return out;
  }
  /** Aniversário "dd/mm" no mês de hoje. */
  function aniversariante(c, hoje) { var a = String((c && c.aniversario) || '').trim(); return /^\d{2}\/\d{2}/.test(a) && a.slice(3, 5) === hoje.slice(5, 7); }
  function aniversarioHoje(c, hoje) { var a = String((c && c.aniversario) || '').trim(); return /^\d{2}\/\d{2}/.test(a) && a.slice(0, 5) === hoje.slice(8, 10) + '/' + hoje.slice(5, 7); }
  var CHIPS = [['', 'Todos'], ['aberta', 'Com OS aberta'], ['sem90', 'Sem retorno há 90+ dias'], ['aniver', '🎂 Aniversariantes'], ['semConsent', 'Sem consentimento']];
  function passaChip(chip, c, s, hoje) {
    if (chip === 'aberta') return !!s.osAberta;
    if (chip === 'sem90') return s.diasSemRetorno != null && s.diasSemRetorno >= 90 && !s.osAberta;
    if (chip === 'aniver') return aniversariante(c, hoje);
    if (chip === 'semConsent') return c.consent !== 'Sim';
    return true;
  }
  /** Busca única (nome, telefone, bairro, ID, CPF/CNPJ, nº da OS, equipamento, série) + chip. */
  function filtrarClientes(D, f, R) {
    R = R || resumoClientes(D); f = f || {}; var q = norm(f.q).trim(), qd = String(f.q || '').replace(/\D/g, '');
    var porCli = {}; (D.os || []).forEach(function (o) { porCli[o.cliente] = (porCli[o.cliente] || '') + ' ' + [o.num, o.equipamento, o.serie].join(' '); });
    return (D.clientes || []).filter(function (c) {
      var s = R[c.nome] || {};
      if (!passaChip(f.chip || '', c, s, D.hoje)) return false;
      if (!q) return true;
      var txt = norm([c.nome, c.id, c.bairro, c.origem, c.indicadoPor, c.doc, porCli[c.nome], s.busca].join(' '));
      if (txt.indexOf(q) >= 0) return true;
      return qd.length >= 4 && (String(c.whatsapp || '').replace(/\D/g, '').indexOf(qd) >= 0 || String(c.doc || '').replace(/\D/g, '').indexOf(qd) >= 0);
    }).sort(function (a, b) { var sa = R[a.nome] || {}, sb = R[b.nome] || {}; return (sb.osAberta ? 1 : 0) - (sa.osAberta ? 1 : 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });
  }
  function contarChips(D, R) { var o = {}; CHIPS.forEach(function (k) { o[k[0]] = filtrarClientes(D, { chip: k[0] }, R).length; }); return o; }
  /** "há 3 dias", "hoje", "há 2 meses". */
  function tempoDesde(dias) {
    if (dias == null) return 'sem atendimento';
    if (dias <= 0) return 'hoje'; if (dias === 1) return 'ontem'; if (dias < 60) return 'há ' + dias + ' dias';
    var m = Math.floor(dias / 30); if (m < 24) return 'há ' + m + ' meses'; return 'há ' + Math.floor(dias / 365) + ' anos';
  }
  /** Classe de cor do status da OS (mesmas cores do painel). */
  function corStatus(s) {
    s = statusCanon(s);
    return { 'Recebido': 'cinza', 'Em diagnóstico': 'azul', 'Aguardando aprovação': 'alta', 'Aguardando peça': 'lar', 'Em reparo': 'roxo', 'Pronto': 'media', 'Entregue': 'ok', 'Cancelado': 'vencido' }[s] || 'cinza';
  }
  /** Ficha local (sem internet ou sem a ação fichaCliente): mesmo formato do crm-v3. */
  function fichaLocal(D, nome) {
    var c = (D.clientes || []).filter(function (x) { return x.nome === nome; })[0]; if (!c) throw new Error('Cliente não encontrado.');
    var dg = padroes(D).garantiaDias, oss = D.os || [];
    return { ok: true, local: true, nome: c.nome, id: c.id, numeros: situacaoCliente(c, oss, D.hoje, dg), origem: c.origem || '', indicadoPor: c.indicadoPor || '', codIndicacao: c.codIndic || '',
      contato: { consent: c.consent === 'Sim', naoContatar: naoContatar(c), proximo: c.proximo || '' },
      os: osDoCliente(c.nome, oss).reverse().map(function (o) { return { num: o.num, _row: o._row, entrada: o.entrada, status: o.status, equipamento: o.equipamento, valor: o.valor, orcamento: o.orcamento, aprovacao: o.aprovacao, validade: o.validade, entrega: o.entrega }; }),
      maquinas: [], garantias: garantiasAtivas(c.nome, oss, D.hoje, dg),
      interacoes: (D.interacoes || []).filter(function (i) { return i.cliente === c.nome; }).map(function (i) { return { data: i.data, canal: i.canal, resumo: i.resumo }; }).reverse(),
      timeline: [], contrato: null };
  }
  /** Linha do tempo unificada: eventos do servidor + OS (entrada/entrega) + conversas + garantia, sem repetir, mais novo primeiro. */
  function linhaDoTempo(ficha, hoje) {
    var ev = [], visto = {};
    var add = function (quando, tipo, titulo, detalhe, os) { var k = String(quando).slice(0, 10) + '|' + norm(titulo) + '|' + (os || ''); if (visto[k]) return; visto[k] = true; ev.push({ quando: String(quando || ''), tipo: tipo, titulo: titulo, detalhe: detalhe || '', os: os || '' }); };
    (ficha.timeline || []).forEach(function (t) { add(t.quando, 'evento', t.evento, t.detalhe, t.os); });
    (ficha.os || []).forEach(function (o) {
      if (iso(o.entrada)) add(iso(o.entrada), 'os', 'OS aberta', [o.equipamento, statusCanon(o.status)].filter(String).join(' · '), o.num);
      if (iso(o.entrega)) add(iso(o.entrega), 'entrega', 'Equipamento entregue', o.valor ? 'R$ ' + n(o.valor).toFixed(2).replace('.', ',') : '', o.num);
    });
    (ficha.interacoes || []).forEach(function (i) { add(i.data, 'conversa', 'Conversa (' + (i.canal || 'contato') + ')', i.resumo); });
    (ficha.garantias || []).forEach(function (g) { var r = hoje ? diasEntre(hoje, g.ate) : null; add(g.inicio, 'garantia', 'Garantia de ' + g.dias + ' dias', 'até ' + dataBR(g.ate) + (r != null ? (r >= 0 ? ' · faltam ' + r + (r === 1 ? ' dia' : ' dias') : ' · vencida') : ''), g.os); });
    return ev.sort(function (a, b) { return a.quando < b.quando ? 1 : a.quando > b.quando ? -1 : 0; });
  }
  function diasRestantes(ate, hoje) { return iso(ate) && hoje ? diasEntre(hoje, iso(ate)) : null; }
  /** Identificador único para a fila offline não gravar duas vezes (contrato: idOperacao). */
  function idOperacao(pre) { return (pre || 'op') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  /** Equipamento salvo (máquina) -> máquina da OS com vários equipamentos. */
  function maquinaParaOS(m, n) { return { equipId: 'EQ' + n, maquinaId: m.id || '', identificacao: [m.tipo, m.modelo].filter(String).join(' ') || m.id || 'Equipamento', tipo: m.tipo || '', modelo: m.modelo || '', serie: m.serie || '', defeito: '', servico: '', obs: m.id ? 'Máquina ' + m.id : '', itens: [] }; }
  var CHK_ITENS = ['Liga', 'Tela', 'Teclado / touchpad', 'Carcaça', 'Carregador junto'], CHK_RESULT = ['OK', 'Com defeito', 'Não testável'];
  /** Valida o checklist como o crm-v3 (salvarChecklistOS). */
  function validarChecklist(x) {
    if (x.momento !== 'Entrada' && x.momento !== 'Saída') throw new Error('Escolha Entrada ou Saída.');
    CHK_ITENS.forEach(function (k) { if (CHK_RESULT.indexOf((x.itens || {})[k]) < 0) throw new Error('Marque o item "' + k + '" (OK, Com defeito ou Não testável).'); });
    ['senhaInformada', 'bitlocker'].forEach(function (k) { if (x[k] !== 'Sim' && x[k] !== 'Não') throw new Error('Responda Sim ou Não em: ' + (k === 'bitlocker' ? 'BitLocker ativo' : 'senha informada') + '.'); });
    return true;
  }
  /** Horas da visita arredondadas a 0,25 (igual ao crm-v3). Formato "AAAA-MM-DD HH:mm". */
  function horasEntre(a, b) { var p = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : NaN; }; var d = (p(b) - p(a)) / 36e5; return isFinite(d) && d > 0 ? Math.round(d * 4) / 4 : 0; }
  function agoraTxt(d) { d = d || new Date(); var z = function (x) { return ('0' + x).slice(-2); }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); }
  /** Painel do mês local (prévia sem internet; o servidor usa resumoMes). */
  function resumoMesLocal(D, mes) {
    var oss = D.os || [], de = function (v) { return String(v || '').slice(0, 7); };
    var entr = oss.filter(function (o) { return de(o.entrada) === mes; }), deliv = oss.filter(function (o) { return statusCanon(o.status) === 'Entregue' && de(o.entrega) === mes; });
    var fat = deliv.reduce(function (s, o) { return s + n(o.valor); }, 0), custo = deliv.reduce(function (s, o) { return s + n(o.custo); }, 0);
    var orc = oss.filter(function (o) { return (de(o.entrada) === mes || de(o.dataAprov) === mes) && o.orcamento !== '' && o.orcamento != null; });
    var apr = orc.filter(function (o) { return o.aprovacao === 'Aprovado'; }).length;
    var origens = {}; (D.clientes || []).forEach(function (c) { if (de(c.primeiro) === mes) { var k = c.origem || 'Não informado'; origens[k] = (origens[k] || 0) + 1; } });
    var porStatus = {}; oss.forEach(function (o) { var s = statusCanon(o.status); if (s !== 'Entregue' && s !== 'Cancelado') porStatus[s] = (porStatus[s] || 0) + 1; });
    return { ok: true, local: true, mes: mes, osAbertas: entr.length, osEntregues: deliv.length, faturamento: Math.round(fat * 100) / 100, custoPecas: Math.round(custo * 100) / 100, lucro: Math.round((fat - custo) * 100) / 100,
      ticketMedio: deliv.length ? Math.round(fat / deliv.length * 100) / 100 : 0, orcamentos: { total: orc.length, aprovados: apr, recusados: orc.filter(function (o) { return o.aprovacao === 'Recusado'; }).length, semResposta: orc.filter(function (o) { return o.aprovacao === 'Sem resposta'; }).length, taxaAprovacao: orc.length ? Math.round(apr / orc.length * 100) : 0 },
      motivosRecusa: {}, comoConheceu: origens, clientesNovos: Object.keys(origens).reduce(function (s, k) { return s + origens[k]; }, 0), avaliacao: { quantidade: 0, media: null }, osPorStatus: porStatus, receitaContratos: 0 };
  }
  /** Link público de acompanhamento: …/exec?os=<43 caracteres base64url>. */
  function linkAcompanhamentoOk(url) { return /^https:\/\/[^\s?#]+\?os=[A-Za-z0-9_-]{43}$/.test(String(url || '')); }
  /** Aniversário do formulário: '' fica vazio; 'd/m', 'dd/mm' ou 'dd-mm' vira 'dd/mm'; inválido = null. */
  function normalizarAniversario(v) {
    var t = String(v == null ? '' : v).trim(); if (!t) return '';
    var m = t.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})$/); if (!m) return null;
    var d = +m[1], me = +m[2], max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][me - 1];
    if (!max || d < 1 || d > max) return null;
    return ('0' + d).slice(-2) + '/' + ('0' + me).slice(-2);
  }
  return { padroes: padroes, normalizarAniversario: normalizarAniversario, CHIPS: CHIPS, CHK_ITENS: CHK_ITENS, CHK_RESULT: CHK_RESULT, statusCanon: statusCanon, naoContatar: naoContatar, regraContato: regraContato, seloLgpd: seloLgpd,
    situacaoCliente: situacaoCliente, resumoClientes: resumoClientes, filtrarClientes: filtrarClientes, contarChips: contarChips, aniversariante: aniversariante, aniversarioHoje: aniversarioHoje,
    tempoDesde: tempoDesde, corStatus: corStatus, garantiasDaOS: garantiasDaOS, garantiasAtivas: garantiasAtivas, fichaLocal: fichaLocal, linhaDoTempo: linhaDoTempo, diasRestantes: diasRestantes,
    idOperacao: idOperacao, maquinaParaOS: maquinaParaOS, validarChecklist: validarChecklist, horasEntre: horasEntre, agoraTxt: agoraTxt, resumoMesLocal: resumoMesLocal, linkAcompanhamentoOk: linkAcompanhamentoOk,
    diasEntre: diasEntre, somaDias: somaDias, dataBR: dataBR };
});
