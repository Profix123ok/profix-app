/* Modo demonstração: dados 100% FICTÍCIOS no formato do getDados() do crm-v3 (mesmos campos do SCHEMA)
 * e um "servidor" falso com as MESMAS ações do crm-v3. Nenhum cliente real. */
(function (raiz, fabrica) { var m = fabrica(); if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFixMock = m; })(typeof self !== 'undefined' ? self : this, function () {
  function somaDias(iso, n) { var p = iso.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); }
  function dadosFicticios(hoje) {
    hoje = hoje || new Date().toISOString().slice(0, 10);
    var d = function (n) { return somaDias(hoje, n); }, ym = hoje.slice(0, 7);
    return {
      hoje: hoje, versao: 'mock-3.0',
      etapas: ['Lead', 'Orçamento enviado', 'Agendado', 'Em serviço', 'Entregue', 'Pós-venda', 'Perdido'],
      statusOS: ['Recebido', 'Em diagnóstico', 'Aguardando aprovação', 'Aguardando peça', 'Em reparo', 'Pronto', 'Entregue', 'Cancelado'],
      statusOp: ['Nova', 'Contatada', 'Virou lead', 'Descartada', 'Sem resposta', 'Não contatar'],
      statusRevenda: ['Em preparação', 'À venda', 'Reservado', 'Vendido', 'Devolvido', 'Descartado'],
      motivosPerda: ['Preço', 'Prazo', 'Desistiu', 'Concorrente', 'Outro'],
      segmentos: ['Contabilidade', 'Advocacia', 'Clínica', 'Loja', 'Imobiliária', 'Escola', 'Outro'],
      canais: ['WhatsApp', 'Ligação', 'Instagram', 'Presencial', 'E-mail', 'Outro'],
      origens: ['Google', 'Instagram', 'Indicação', 'Panfleto', 'Prospecção', 'Outro'],
      formasPag: ['Dinheiro', 'Pix', 'Débito', 'Crédito à vista', 'Crédito parcelado'],
      formasPagFin: ['Dinheiro', 'Pix', 'Débito', 'Crédito à vista', 'Crédito parcelado'],
      tiposFin: ['Entrada', 'Saída'],
      categoriasFin: ['Serviço', 'Venda de peça', 'Revenda de usado', 'Compra de peça', 'Deslocamento', 'Ferramentas', 'DAS-MEI', 'Marketing', 'Outros'],
      config: { linkAgenda: 'https://exemplo.invalid/agenda', whatsappProfix: '(15) 90000-0000', linkAvaliacao: '' },
      clientes: [
        { _row: 2, id: 'C0001', nome: 'Ana Exemplo Silva', whatsapp: '(15) 90000-0001', consent: 'Sim', origem: 'Instagram', etapa: 'Entregue', primeiro: d(-40), ultimo: d(-5), proximo: d(-1), acao: 'Perguntar se o notebook está ok', bairro: 'Centro', email: 'ana.exemplo@example.com', endereco: 'Rua Exemplo, 100 - Centro, Sorocaba - SP', indicadoPor: '', motivoPerda: '', valorEst: '' },
        { _row: 3, id: 'C0002', nome: 'Bruno Exemplo Lima', whatsapp: '(15) 90000-0002', consent: 'Não', origem: 'Google', etapa: 'Em serviço', primeiro: d(-6), ultimo: d(-2), proximo: hoje, acao: 'Ligar sobre a peça', bairro: 'Campolim', email: 'bruno.exemplo@example.com', endereco: 'Av. Fictícia, 200 - Campolim, Sorocaba - SP', indicadoPor: '', motivoPerda: '', valorEst: '' },
        { _row: 4, id: 'C0003', nome: 'Carla Exemplo Souza', whatsapp: '(15) 90000-0003', consent: 'Sim', origem: 'Indicação', etapa: 'Orçamento enviado', primeiro: d(-8), ultimo: d(-4), proximo: d(3), acao: 'Cobrar resposta do orçamento', bairro: 'Éden', indicadoPor: 'Ana Exemplo Silva', motivoPerda: '', valorEst: 380 },
        { _row: 5, id: 'C0004', nome: 'Diego Exemplo Rocha', whatsapp: '(15) 90000-0004', consent: 'Sim', origem: 'Panfleto', etapa: 'Lead', primeiro: d(-1), ultimo: d(-1), proximo: '', acao: '', bairro: 'Vila Hortência', indicadoPor: '', motivoPerda: '', valorEst: 150 }
      ],
      interacoes: [
        { _row: 2, data: d(-4), cliente: 'Carla Exemplo Souza', canal: 'WhatsApp', resumo: 'Enviei o orçamento da fonte', proximoPasso: 'Cobrar resposta', dataProx: d(3), por: 'Pedro' }
      ],
      os: [
        { _row: 2, num: 'OS-0012', entrada: d(-5), cliente: 'Bruno Exemplo Lima', equipamento: 'Notebook Dell (fictício)', defeito: 'Lento e esquentando', servico: 'Formatação Windows', status: 'Em reparo', valor: 99.9, custo: 0, previsao: d(1), statusEm: d(-2), senha: '1234', acessorios: 'Carregador', diagnostico: '', orcamento: '', aprovacao: '' },
        { _row: 3, num: 'OS-0013', entrada: d(-4), cliente: 'Carla Exemplo Souza', equipamento: 'Desktop gamer (fictício)', defeito: 'Não dá vídeo', status: 'Aguardando aprovação', valor: '', orcamento: 380, diagnostico: 'Fonte com defeito', itensOrc: 'Mão de obra + fonte 600W', validade: d(6), aprovacao: 'Pendente', statusEm: d(-3) },
        { _row: 4, num: 'OS-0015', entrada: d(-9), cliente: 'Ana Exemplo Silva', equipamento: 'PC montado', servico: 'Montagem de PC', status: 'Pronto', valor: 150, statusEm: d(-8) },
        { _row: 5, num: 'OS-0010', entrada: d(-12), cliente: 'Ana Exemplo Silva', equipamento: 'Notebook Acer', servico: 'Formatação Windows', status: 'Entregue', valor: 120, entrega: d(-4), forma: 'Pix' }
      ],
      pecas: [{ _row: 2, data: d(-3), os: 'OS-0012', peca: 'SSD 480 GB (exemplo)', qtd: 1, custoUnit: 180, precoUnit: 250, fornecedor: 'Loja exemplo', origem: 'Comprada para esta OS', link: '' }],
      financeiro: [
        { _row: 2, data: d(-4), tipo: 'Entrada', categoria: 'Serviço', os: 'OS-0010', descricao: 'Recebimento OS OS-0010', forma: 'Pix', receita: 120, custo: 0 },
        { _row: 3, data: ym + '-02', tipo: 'Saída', categoria: 'Compra de peça', os: '', descricao: 'Pasta térmica (exemplo)', forma: 'Pix', receita: '', custo: 35 }
      ],
      tarefas: [
        { _row: 2, data: d(-1), cliente: 'Carla Exemplo Souza', tarefa: 'Orçamento sem resposta (OS-0013)', tipo: 'Orçamento sem resposta', status: 'Pendente', os: 'OS-0013' },
        { _row: 3, data: hoje, cliente: 'Ana Exemplo Silva', tarefa: 'Lembrete de retirada (OS-0015)', tipo: 'Lembrete de retirada', status: 'Pendente', os: 'OS-0015' },
        { _row: 4, data: d(5), cliente: '', tarefa: 'Pagar DAS-MEI', tipo: 'Outro', status: 'Pendente', os: '' }
      ],
      cotaEmail: 95, // e-mails que ainda podem sair hoje (fictício)
      agenda: [
        { eventoId: 'evt-demo-a', titulo: 'Atendimento – Bruno Exemplo (fictício)', data: hoje, inicio: '19:30', fim: '20:30', local: 'Campolim' },
        { eventoId: 'evt-demo-b', titulo: 'Formatação – cliente exemplo', data: d(1), inicio: '10:00', fim: '11:00', local: 'Oficina' }
      ],
      oportunidades: [
        { _row: 2, empresa: 'Contabilidade Exemplo Alfa', segmento: 'Contabilidade', bairro: 'Centro', telefone: '(15) 3000-0001', whatsapp: '(15) 90000-1001', fonte: 'Google Maps (exemplo)', coleta: d(-10), status: 'Nova', prioridade: 'Alta', canal: 'WhatsApp', proximoPasso: 'Apresentar plano mensal', lembrete: d(-1), consentOp: '', ultimoContato: '', historico: '', motivoPerda: '', valorEst: 199, obs: '' },
        { _row: 3, empresa: 'Clínica Exemplo Beta', segmento: 'Clínica', bairro: 'Campolim', telefone: '(15) 3000-0002', whatsapp: '', fonte: 'Site (exemplo)', coleta: d(-9), status: 'Contatada', prioridade: 'Média', canal: 'Ligação', proximoPasso: 'Retornar ligação', lembrete: hoje, consentOp: '', ultimoContato: d(-3), historico: '', motivoPerda: '', valorEst: '', obs: '' },
        { _row: 4, empresa: 'Advocacia Exemplo Gama', segmento: 'Advocacia', bairro: 'Éden', telefone: '', whatsapp: '(15) 90000-1003', fonte: 'Instagram (exemplo)', coleta: d(-8), status: 'Contatada', prioridade: 'Baixa', canal: 'WhatsApp', proximoPasso: 'Lembrete único', lembrete: d(2), consentOp: '', ultimoContato: d(-4), historico: '', motivoPerda: '', valorEst: '', obs: '' },
        { _row: 5, empresa: 'Loja Exemplo Delta', segmento: 'Loja', bairro: 'Centro', telefone: '(15) 3000-0004', whatsapp: '(15) 90000-1004', fonte: 'Google Maps (exemplo)', coleta: d(-7), status: 'Não contatar', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: 'Não contatar', ultimoContato: '', historico: '', motivoPerda: '', valorEst: '', obs: '' },
        { _row: 6, empresa: 'Escola Exemplo Épsilon', segmento: 'Escola', bairro: 'Vila Hortência', telefone: '(15) 3000-0005', whatsapp: '(15) 90000-1005', fonte: 'Site (exemplo)', coleta: d(-3), status: 'Nova', prioridade: 'Média', canal: 'WhatsApp', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: '', valorEst: '', obs: '' }
      ],
      modelos: [
        { _row: 2, modelo: 'Empresa – Primeiro contato', texto: 'Oi, {contato}! Aqui é o Pedro, da ProFix Computadores, de Sorocaba. Cuido de computadores de empresas como a {empresa}. Posso te mandar como funciona? (exemplo)', quando: 'Oportunidade Nova' },
        { _row: 3, modelo: 'Empresa – Lembrete único (3 dias)', texto: 'Oi, {contato}! Só pra saber se viu minha mensagem sobre a {empresa}. Se não for o momento, tudo bem! (exemplo)', quando: 'Contatada, 3 dias depois' },
        { _row: 4, modelo: 'Empresa – Respondeu com interesse', texto: 'Que bom, {contato}! Me conta o que está acontecendo com os computadores da {empresa}. (exemplo)', quando: 'Virou lead' },
        { _row: 5, modelo: 'Empresa – Agora não', texto: 'Tranquilo, {contato}, obrigado pelo retorno! (exemplo)', quando: 'Descartada' },
        { _row: 6, modelo: 'Atendimento – Pronto pra retirar', texto: 'Oi, {primeiro_nome}! Seu equipamento está pronto. (exemplo)', quando: 'OS Pronto' }
      ],
      revenda: [
        { _row: 2, id: 'RV0001', compra: d(-30), equipamento: 'Desktop i5 (fictício)', config: '16 GB, SSD 480', status: 'Vendido', precoCompra: 700, frete: 30, pecas: 150, insumos: 20, precoVenda: 1200, venda: d(-10), comprador: 'Comprador Exemplo' },
        { _row: 3, id: 'RV0002', compra: d(-12), equipamento: 'Notebook ThinkPad (fictício)', config: 'i5, 8 GB, SSD 256', status: 'À venda', precoCompra: 900, frete: 0, pecas: 120, insumos: 10, anunciado: 1490 }
      ],
      catalogo: [
        { _row: 2, servico: 'Diagnóstico', preco: 50, tipo: 'Fixo', descricao: 'Avaliação do equipamento', tempo: '1 dia', ativo: 'Sim', status: 'Ativo' },
        { _row: 3, servico: 'Formatação Windows', preco: 99.9, tipo: 'A partir de', descricao: 'Formatação com drivers', tempo: '1 dia', ativo: 'Sim', status: 'Ativo' },
        { _row: 4, servico: 'Suporte remoto avulso', preco: '', tipo: 'Sob orçamento', descricao: '', ativo: 'Não', status: 'Proposto', sugerido: 'R$ 70 por hora (exemplo)' }
      ]
    };
  }

  /** Servidor FALSO com as ações do crm-v3 (validações mínimas, só para a demonstração e os testes). */
  function criarServidor(D, opc) {
    opc = opc || {};
    var achar = function (lista, campo, valor, row) {
      var x = (D[lista] || []).filter(function (o) { return o._row === Number(row) && String(o[campo]) === String(valor); })[0] ||
        (D[lista] || []).filter(function (o) { return String(o[campo]) === String(valor); })[0];
      if (!x) throw new Error('Registro "' + valor + '" não encontrado (a planilha pode ter mudado). Atualize o app.');
      return x;
    };
    var copiar = function (alvo, src, campos) { campos.forEach(function (k) { if (src[k] !== undefined) alvo[k] = src[k]; }); };
    var anexar = function (lista, obj) { var l = D[lista] = D[lista] || []; obj._row = l.reduce(function (m, o) { return Math.max(m, o._row); }, 1) + 1; l.push(obj); return obj; };
    var proxId = function (lista, campo, pre) { var n = 0; (D[lista] || []).forEach(function (o) { var m = String(o[campo] || '').match(/(\d+)$/); if (m) n = Math.max(n, +m[1]); }); return pre + ('0000' + (n + 1)).slice(-4); };
    var num = function (v) { return v === '' || v == null ? '' : Number(String(v).replace(',', '.')); };
    var h = function () { return D.hoje; };
    var S = {
      getDados: function () { var c = JSON.parse(JSON.stringify(D)); if (!opc.enviarSenha) c.os.forEach(function (o) { delete o.senha; }); return c; },
      listarAgenda: function () { return D.agenda || []; },
      // ---- PROPOSTAS (ainda não existem no crm-v3) ----
      // Agenda (crm-v3 v11): refTipo 'os' -> refId = nº da OS (eventoId fica na coluna "Evento da agenda (ID)"; chamar de novo ATUALIZA);
      // refTipo 'agenda' -> refId = eventoId existente. Convite ao cliente não funciona (Clientes não tem coluna de e-mail).
      criarEventoAgenda: function (ev) {
        if (!ev || !String(ev.titulo || '').trim()) throw new Error('Informe o título do evento.');
        if (!ev.inicio || !ev.fim || ev.fim <= ev.inicio) throw new Error('Início e fim inválidos.');
        var ag = D.agenda = D.agenda || [], o = null, id = '';
        if (ev.refTipo === 'os') { o = (D.os || []).find(function (x) { return x.num === ev.refId; }); if (!o) throw new Error('OS não encontrada.'); id = o.eventoId || ''; }
        else if (ev.refTipo === 'agenda') { id = ev.refId; if (!ag.some(function (x) { return x.eventoId === id; })) throw new Error('Evento não encontrado.'); }
        var dados = { titulo: ev.titulo, data: ev.inicio.slice(0, 10), inicio: ev.inicio.slice(11, 16), fim: ev.fim.slice(11, 16), local: ev.local || '', descricao: ev.descricao || '' };
        var ex = id && ag.find(function (x) { return x.eventoId === id; });
        if (ex) Object.assign(ex, dados); else { id = 'evt-demo-' + (ag.length + 1); ag.push(Object.assign({ eventoId: id }, dados)); }
        if (o) o.eventoId = id;
        return { eventoId: id, acao: ex ? 'atualizado' : 'criado', convidado: false, msg: ex ? 'Evento atualizado na Agenda.' : 'Evento criado na Agenda.' };
      },
      removerEventoAgenda: function (x) {
        var id = x && x.eventoId, ag = D.agenda || [], i = ag.findIndex(function (a) { return a.eventoId === id; });
        if (!id || i < 0) throw new Error('Evento não encontrado.');
        ag.splice(i, 1); (D.os || []).forEach(function (o) { if (o.eventoId === id) o.eventoId = ''; });
        return { msg: 'Evento removido da Agenda.' };
      },
      enviarEmailCliente: function (x) {
        var c = (D.clientes || []).find(function (k) { return k.id === x.clienteId; });
        if (!c) throw new Error('Cliente não encontrado.');
        if (c.consent !== 'Sim') throw new Error('Cliente sem consentimento LGPD: e-mail não enviado.');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email || '')) throw new Error('Cliente sem e-mail válido.');
        if (!String(x.assunto || '').trim() || !String(x.corpo || '').trim()) throw new Error('Assunto e texto são obrigatórios.');
        if (/\[CONFIRMAR/.test(x.corpo)) throw new Error('O texto ainda tem [CONFIRMAR …].');
        if (!(D.cotaEmail > 0)) throw new Error('Cota diária de e-mails esgotada.');
        D.cotaEmail--; anexar('interacoes', { data: h(), cliente: c.nome, canal: 'E-mail', resumo: 'E-mail: ' + x.assunto, proximoPasso: '', dataProx: '', por: 'Pedro' });
        return { ok: true, msg: 'E-mail enviado.', cotaRestante: D.cotaEmail };
      },
      salvarCliente: function (c) {
        if (!String(c.nome || '').trim()) throw new Error('Informe o nome do cliente.');
        if (c.consent && ['Sim', 'Não'].indexOf(c.consent) < 0) throw new Error('Consentimento deve ser Sim ou Não.');
        var campos = ['nome', 'whatsapp', 'bairro', 'origem', 'primeiro', 'consent', 'dataConsent', 'obs', 'etapa', 'ultimo', 'proximo', 'acao', 'preventiva', 'indicadoPor', 'motivoPerda', 'valorEst'];
        if (c._row) { copiar(achar('clientes', 'nome', c._nomeOriginal || c.nome, c._row), c, campos); return { ok: true, msg: 'Cliente atualizado.' }; }
        var n = { id: proxId('clientes', 'id', 'C'), primeiro: h(), etapa: 'Lead' }; copiar(n, c, campos); anexar('clientes', n); return { ok: true, msg: 'Cliente cadastrado (' + n.id + ').' };
      },
      moverEtapa: function (nome, linha, etapa, motivo) {
        if (D.etapas.indexOf(etapa) < 0) throw new Error('Etapa inválida.');
        var c = achar('clientes', 'nome', nome, linha); c.etapa = etapa; if (etapa === 'Perdido' && motivo) c.motivoPerda = motivo; return { ok: true, msg: nome + ' → ' + etapa };
      },
      registrarInteracao: function (i) {
        if (!i.cliente) throw new Error('Escolha o cliente.'); if (!i.resumo) throw new Error('Escreva um resumo da conversa.');
        var c = achar('clientes', 'nome', i.cliente, i._rowCliente), data = i.data || h();
        anexar('interacoes', { data: data, cliente: i.cliente, canal: i.canal || '', resumo: i.resumo, proximoPasso: i.proximoPasso || '', dataProx: i.dataProx || '', por: 'Pedro' });
        c.ultimo = data; if (i.dataProx) c.proximo = i.dataProx; if (i.proximoPasso) c.acao = i.proximoPasso; return { ok: true, msg: 'Interação registrada.' };
      },
      salvarOS: function (o) {
        if (!o.cliente) throw new Error('Escolha o cliente.');
        var campos = ['cliente', 'equipamento', 'defeito', 'servico', 'valor', 'previsao', 'acessorios', 'serie', 'obsInt', 'tipoAtend', 'senha'];
        if (o._row) { var a = achar('os', 'num', o.num, o._row); copiar(a, o, campos); return { ok: true, msg: 'OS ' + a.num + ' salva.' }; }
        var n = { num: 'OS-' + proxId('os', 'num', '').slice(-4), entrada: h(), status: 'Recebido', statusEm: h() }; copiar(n, o, campos); anexar('os', n); return { ok: true, msg: 'OS ' + n.num + ' criada.' };
      },
      mudarStatusOS: function (n, linha, status, op) {
        if (D.statusOS.indexOf(status) < 0) throw new Error('Status inválido.');
        var a = achar('os', 'num', n, linha); a.status = status; a.statusEm = h(); if (status === 'Entregue') { a.entrega = (op && op.entrega) || h(); if (!op || op.apagarSenha !== false) a.senha = ''; }
        return { ok: true, msg: 'OS ' + n + ' → ' + status + '.' };
      },
      salvarOrcamento: function (o) {
        var a = achar('os', 'num', o.num, o._row); copiar(a, o, ['diagnostico', 'itensOrc', 'orcamento', 'validade', 'previsao']);
        if (!a.validade) a.validade = somaDias(h(), 10); if (o.marcarAguardando !== false) { a.status = 'Aguardando aprovação'; a.aprovacao = 'Pendente'; } return { ok: true, msg: 'Orçamento salvo.' };
      },
      decidirOrcamento: function (x) {
        if (['Aprovado', 'Recusado'].indexOf(x.decisao) < 0) throw new Error('Decisão inválida.');
        var a = achar('os', 'num', x.num, x._row); a.aprovacao = x.decisao; a.comoAprov = x.como || ''; a.dataAprov = h();
        if (x.decisao === 'Aprovado') { a.status = x.proximoStatus || 'Em reparo'; if (a.valor === '' || a.valor == null) a.valor = a.orcamento; } else a.status = 'Pronto';
        return { ok: true, msg: 'Orçamento ' + x.decisao.toLowerCase() + '.' };
      },
      lancarRecebimento: function (r) {
        if (!r.os) throw new Error('OS não informada.'); var v = num(r.receita); if (!v) throw new Error('Informe o valor recebido.');
        if (r.forma === 'Crédito parcelado' && !r.parcelas) throw new Error('Informe o número de parcelas.');
        anexar('financeiro', { data: r.data || h(), tipo: 'Entrada', categoria: 'Serviço', os: r.os, descricao: r.descricao || ('Recebimento OS ' + r.os), forma: r.forma || '', parcelas: r.parcelas || '', receita: v, custo: num(r.custo) || 0 });
        return { ok: true, msg: 'Recebimento lançado.' };
      },
      salvarPeca: function (p) {
        if (!p.os) throw new Error('Escolha a OS.'); if (!String(p.peca || '').trim()) throw new Error('Informe a peça.');
        if (p.link && !/^https?:\/\//i.test(p.link)) throw new Error('O link do fornecedor deve começar com http:// ou https://');
        achar('os', 'num', p.os, p._rowOS);
        anexar('pecas', { data: p.data || h(), os: p.os, peca: p.peca, qtd: num(p.qtd) || 1, custoUnit: num(p.custoUnit), precoUnit: num(p.precoUnit), fornecedor: p.fornecedor || '', origem: p.origem || '', link: p.link || '' });
        return { ok: true, msg: 'Peça registrada na ' + p.os + '.' };
      },
      salvarLancamento: function (l) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(l.data || ''))) throw new Error('Informe a data (dd/mm/aaaa).');
        if (D.tiposFin.indexOf(l.tipo) < 0) throw new Error('Tipo inválido: escolha Entrada ou Saída.'); if (!l.categoria) throw new Error('Escolha a categoria.');
        var n = { data: l.data, tipo: l.tipo, categoria: l.categoria, os: l.os || '', descricao: l.descricao || '', forma: l.forma || '', receita: l.tipo === 'Entrada' ? num(l.receita) : '', custo: l.tipo === 'Saída' ? num(l.custo) : num(l.custo) || 0 };
        if (l._row) { copiar(achar('financeiro', 'data', l._dataOriginal || l.data, l._row), n, Object.keys(n)); return { ok: true, msg: 'Lançamento atualizado.' }; }
        anexar('financeiro', n); return { ok: true, msg: 'Lançamento salvo.' };
      },
      mudarStatusTarefa: function (t, linha, st) { achar('tarefas', 'tarefa', t, linha).status = st; return { ok: true, msg: 'Tarefa: ' + st }; },
      salvarOportunidade: function (op) {
        if (!op.empresa) throw new Error('Informe a empresa.');
        if (op.status && D.statusOp.indexOf(op.status) < 0) throw new Error('Status inválido.');
        if (op.motivoPerda && D.motivosPerda.indexOf(op.motivoPerda) < 0) throw new Error('Motivo da perda inválido.');
        var campos = ['empresa', 'segmento', 'bairro', 'telefone', 'site', 'fonte', 'coleta', 'status', 'obs', 'prioridade', 'canal', 'proximoPasso', 'lembrete', 'fixo', 'whatsapp', 'motivoPerda', 'valorEst'];
        if (op._row) { var alvo = achar('oportunidades', 'empresa', op._empresaOriginal || op.empresa, op._row); copiar(alvo, op, campos);
          copiar(alvo, op, ['origem', 'indicadoPor', 'ultimoContato'].filter(function (k) { return k in alvo; })); /* só se a "coluna" existir */ return { ok: true, msg: 'Oportunidade atualizada.' }; }
        var n = { coleta: h(), status: 'Nova' }; copiar(n, op, campos); anexar('oportunidades', n); return { ok: true, msg: 'Oportunidade cadastrada.' };
      },
      registrarContatoOp: function (empresa, linha, canal) {
        var o = achar('oportunidades', 'empresa', empresa, linha);
        if (o.status === 'Não contatar') throw new Error('Esta empresa está como "Não contatar". Nada foi registrado.');
        var antes = o.status || 'Nova';
        if (antes === 'Nova') { o.status = 'Contatada'; o.lembrete = somaDias(h(), 3); if (!o.proximoPasso) o.proximoPasso = 'Cobrar retorno (uma vez só)'; }
        else if (antes === 'Contatada') { o.status = 'Sem resposta'; o.lembrete = ''; o.proximoPasso = 'Lembrete único enviado: aguardar a empresa'; }
        o.ultimoContato = h(); o.historico = (o.historico ? o.historico + '\n' : '') + h() + ' – ' + (canal || 'WhatsApp') + (o.status !== antes ? ' (' + antes + ' → ' + o.status + ')' : '');
        return { ok: true, msg: empresa + ': contato registrado.' };
      },
      virarLead: function (empresa, linha) {
        var o = achar('oportunidades', 'empresa', empresa, linha); o.status = 'Virou lead';
        if (!D.clientes.some(function (c) { return c.nome === o.empresa; })) anexar('clientes', { id: proxId('clientes', 'id', 'C'), nome: o.empresa, whatsapp: o.telefone || '', origem: 'Prospecção', consent: 'Não', etapa: 'Lead', primeiro: h(), proximo: o.lembrete || '', acao: o.proximoPasso || '' });
        return { ok: true, msg: 'Virou lead em Clientes.' };
      },
      salvarRevenda: function (r) {
        if (!String(r.equipamento || '').trim()) throw new Error('Informe o equipamento.');
        var campos = ['compra', 'equipamento', 'config', 'serie', 'origem', 'precoCompra', 'frete', 'pecas', 'insumos', 'horas', 'status', 'anunciado', 'anuncio', 'obs'];
        ['precoCompra', 'frete', 'pecas', 'insumos', 'anunciado'].forEach(function (k) { if (r[k] !== undefined && r[k] !== '') { r[k] = num(r[k]); if (isNaN(r[k]) || r[k] < 0) throw new Error('Valor inválido em ' + k + '.'); } });
        if (r._row) { copiar(achar('revenda', 'id', r.id, r._row), r, campos); return { ok: true, msg: 'Revenda salva.' }; }
        var n = { id: proxId('revenda', 'id', 'RV'), compra: h(), status: 'Em preparação' }; copiar(n, r, campos); anexar('revenda', n); return { ok: true, msg: 'Item ' + n.id + ' cadastrado.' };
      },
      venderRevenda: function (v) {
        var r = achar('revenda', 'id', v.id, v._row), p = num(v.precoVenda); if (!(p > 0)) throw new Error('Informe o preço de venda.');
        r.status = 'Vendido'; r.venda = v.data || h(); r.precoVenda = p; r.forma = v.forma || ''; r.comprador = v.comprador || ''; r.garantia = somaDias(r.venda, 90);
        if (v.lancar) { anexar('financeiro', { data: r.venda, tipo: 'Entrada', categoria: 'Revenda de usado', descricao: 'Venda de usado ' + r.id, forma: r.forma, receita: p, custo: 0 }); r.vendaLancada = 'Sim'; }
        return { ok: true, msg: 'Venda do ' + r.id + ' registrada.' };
      },
      salvarServicoCatalogo: function (s) {
        if (!String(s.servico || '').trim()) throw new Error('Informe o nome do serviço.');
        var campos = ['servico', 'preco', 'tipo', 'descricao', 'tempo', 'ativo', 'obs', 'status', 'sugerido'];
        if (s._row) { copiar(achar('catalogo', 'servico', s._servicoOriginal || s.servico, s._row), s, campos); return { ok: true, msg: 'Serviço salvo.' }; }
        var n = { ativo: 'Sim', status: 'Ativo' }; copiar(n, s, campos); anexar('catalogo', n); return { ok: true, msg: 'Serviço criado.' };
      },
      salvarModelo: function (m) {
        if (!m.modelo || !m.texto) throw new Error('Modelo e texto são obrigatórios.');
        if (m._row) { copiar(achar('modelos', 'modelo', m._modeloOriginal || m.modelo, m._row), m, ['modelo', 'texto', 'quando']); return { ok: true, msg: 'Modelo salvo.' }; }
        anexar('modelos', { modelo: m.modelo, texto: m.texto, quando: m.quando || '' }); return { ok: true, msg: 'Modelo criado.' };
      },
      registrarFollowup: function (f) { if (!f.tipo) throw new Error('Tipo de follow-up não informado.'); anexar('tarefas', { data: h(), cliente: f.cliente || '', tarefa: f.tipo, tipo: f.tipo, status: 'Feita', os: f.os || '' }); return { ok: true, msg: 'Follow-up registrado.' }; }
    };
    return S;
  }
  return { dadosFicticios: dadosFicticios, criarServidor: criarServidor, somaDias: somaDias };
});
