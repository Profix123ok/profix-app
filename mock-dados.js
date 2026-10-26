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
        { _row: 2, id: 'C0001', nome: 'Ana Exemplo Silva', whatsapp: '(15) 90000-0001', consent: 'Sim', dataConsent: d(-40), aniversario: hoje.slice(8, 10) + '/' + hoje.slice(5, 7), codIndic: 'ANA-EX10', origem: 'Instagram', etapa: 'Entregue', primeiro: d(-40), ultimo: d(-5), proximo: d(-1), acao: 'Perguntar se o notebook está ok', bairro: 'Centro', email: 'ana.exemplo@example.com', endereco: 'Rua Exemplo, 100 - Centro, Sorocaba - SP', indicadoPor: '', motivoPerda: '', valorEst: '' },
        { _row: 3, id: 'C0002', nome: 'Bruno Exemplo Lima', whatsapp: '(15) 90000-0002', consent: 'Não', origem: 'Google', etapa: 'Em serviço', primeiro: d(-6), ultimo: d(-2), proximo: hoje, acao: 'Ligar sobre a peça', bairro: 'Campolim', email: 'bruno.exemplo@example.com', endereco: 'Av. Fictícia, 200 - Campolim, Sorocaba - SP', indicadoPor: '', motivoPerda: '', valorEst: '' },
        { _row: 4, id: 'C0003', nome: 'Carla Exemplo Souza', whatsapp: '(15) 90000-0003', consent: 'Sim', origem: 'Indicação', etapa: 'Orçamento enviado', primeiro: d(-8), ultimo: d(-4), proximo: d(3), acao: 'Cobrar resposta do orçamento', bairro: 'Éden', indicadoPor: 'Ana Exemplo Silva', motivoPerda: '', valorEst: 380 },
        { _row: 5, id: 'C0004', nome: 'Diego Exemplo Rocha', whatsapp: '(15) 90000-0004', consent: 'Sim', origem: 'Panfleto', etapa: 'Lead', primeiro: d(-1), ultimo: d(-1), proximo: '', acao: '', bairro: 'Vila Hortência', indicadoPor: '', motivoPerda: '', valorEst: 150 },
        { _row: 6, id: 'C0005', nome: 'Elisa Exemplo Prado', whatsapp: '(15) 90000-0005', consent: 'Sim', naoContatar: 'Sim', origem: 'Google', etapa: 'Pós-venda', primeiro: d(-130), ultimo: d(-120), proximo: '', acao: '', bairro: 'Jardim Exemplo', indicadoPor: '', motivoPerda: '', valorEst: '' }
      ],
      interacoes: [
        { _row: 2, data: d(-4), cliente: 'Carla Exemplo Souza', canal: 'WhatsApp', resumo: 'Enviei o orçamento da fonte', proximoPasso: 'Cobrar resposta', dataProx: d(3), por: 'Pedro' }
      ],
      os: [
        { _row: 2, num: 'OS-0012', entrada: d(-5), cliente: 'Bruno Exemplo Lima', equipamento: 'Notebook Dell (fictício)', defeito: 'Lento e esquentando', servico: 'Formatação Windows', status: 'Em reparo', valor: 99.9, custo: 0, previsao: d(1), statusEm: d(-2), senha: '1234', acessorios: 'Carregador', diagnostico: '', orcamento: '', aprovacao: '' },
        { _row: 3, num: 'OS-0013', entrada: d(-4), cliente: 'Carla Exemplo Souza', equipamento: 'Desktop gamer (fictício)', defeito: 'Não dá vídeo', status: 'Aguardando aprovação', valor: '', orcamento: 380, diagnostico: 'Fonte com defeito', itensOrc: 'Mão de obra + fonte 600W', validade: d(6), aprovacao: 'Pendente', statusEm: d(-3) },
        { _row: 4, num: 'OS-0015', entrada: d(-9), cliente: 'Ana Exemplo Silva', equipamento: 'PC montado', servico: 'Montagem de PC', status: 'Pronto', valor: 150, statusEm: d(-8) },
        { _row: 5, num: 'OS-0010', entrada: d(-12), cliente: 'Ana Exemplo Silva', equipamento: 'Notebook Acer', servico: 'Formatação Windows', status: 'Entregue', valor: 120, entrega: d(-4), forma: 'Pix' },
        { _row: 6, num: 'OS-0009', entrada: d(-125), cliente: 'Elisa Exemplo Prado', equipamento: 'Notebook Lenovo (fictício)', servico: 'Limpeza interna', status: 'Entregue', valor: 90, entrega: d(-120), forma: 'Dinheiro' }
      ],
      pecas: [{ _row: 2, data: d(-3), os: 'OS-0012', peca: 'SSD 480 GB (exemplo)', qtd: 1, custoUnit: 180, precoUnit: 250, fornecedor: 'Loja exemplo', origem: 'Comprada para esta OS', link: '' }],
      financeiro: [
        { _row: 2, data: d(-4), tipo: 'Entrada', categoria: 'Serviço', os: 'OS-0010', descricao: 'Recebimento OS OS-0010', forma: 'Pix', receita: 120, custo: 0 },
        { _row: 4, data: d(-120), tipo: 'Entrada', categoria: 'Serviço', os: 'OS-0009', descricao: 'Recebimento OS OS-0009', forma: 'Dinheiro', receita: 90, custo: 0 },
        { _row: 3, data: ym + '-02', tipo: 'Saída', categoria: 'Compra de peça', os: '', descricao: 'Pasta térmica (exemplo)', forma: 'Pix', receita: '', custo: 35 }
      ],
      tarefas: [
        { _row: 2, data: d(-1), cliente: 'Carla Exemplo Souza', tarefa: 'Orçamento sem resposta (OS-0013)', tipo: 'Orçamento sem resposta', status: 'Pendente', os: 'OS-0013' },
        { _row: 3, data: hoje, cliente: 'Ana Exemplo Silva', tarefa: 'Lembrete de retirada (OS-0015)', tipo: 'Lembrete de retirada', status: 'Pendente', os: 'OS-0015' },
        { _row: 4, data: d(5), cliente: '', tarefa: 'Pagar DAS-MEI', tipo: 'Outro', status: 'Pendente', os: '' }
      ],
      maquinas: [{ id: 'MAQ-0001', cliente: 'Ana Exemplo Silva', tipo: 'Notebook', modelo: 'Acer Aspire (fictício)', serie: 'SN-EXEMPLO-001' }, { id: 'MAQ-0002', cliente: 'Ana Exemplo Silva', tipo: 'Desktop', modelo: 'PC montado (fictício)', serie: '' }],
      timelineCli: [{ quando: d(-4) + ' 17:00', cliente: 'Ana Exemplo Silva', os: 'OS-0010', evento: 'Avaliação pedida', detalhe: 'Link de avaliação aberto no WhatsApp' }],
      contratos: [{ id: 'CT-0001', cliente: 'Carla Exemplo Souza', plano: 'Plano empresarial (fictício)', valor: 250, visitas: 2, status: 'Ativo', inicio: d(-30), obs: '' }],
      visitas: [{ id: 'VT-0001', contrato: 'CT-0001', cliente: 'Carla Exemplo Souza', data: hoje, prioridade: 'Alta', status: 'Agendada', inicio: '', fim: '', km: '', horas: '', os: '', obs: 'Rede do escritório (fictício)' }],
      cotaEmail: 95, // e-mails que ainda podem sair hoje (fictício)
      leadsLink: [
        { _row: 2, dataHora: hoje + ' 09:12', nome: 'Exemplo Lead Link Ana', telefone: '(15) 90000-1101', cidade: 'Sorocaba', servico: 'Notebook não liga', consentimento: true, dataConsentimento: hoje + ' 09:12', origem: 'pagina-cadastro', status: 'Novo', obs: '' },
        { _row: 3, dataHora: hoje + ' 10:40', nome: 'Exemplo Lead Link Bruno', telefone: '1590000-1102', cidade: '', servico: '', consentimento: true, dataConsentimento: hoje + ' 10:40', origem: 'pagina-cadastro', status: 'Novo', obs: '' }
      ],
      agenda: [
        { eventoId: 'evt-demo-a', titulo: 'Atendimento – Bruno Exemplo (fictício)', data: hoje, inicio: '19:30', fim: '20:30', local: 'Campolim' },
        { eventoId: 'evt-demo-b', titulo: 'Formatação – cliente exemplo', data: d(1), inicio: '10:00', fim: '11:00', local: 'Oficina' }
      ],
      oportunidades: [
        { _row: 2, cidade: 'Sorocaba', empresa: 'Contabilidade Exemplo Alfa', segmento: 'Contabilidade', bairro: 'Centro', telefone: '(15) 3000-0001', whatsapp: '(15) 90000-1001', fonte: 'Google Maps (exemplo)', coleta: d(-10), status: 'Nova', modeloSugerido: 'prospecção - 1º  contato — CONTABILIDADE', prioridade: 'Alta', canal: 'WhatsApp', proximoPasso: 'Apresentar plano mensal', lembrete: d(-1), consentOp: '', ultimoContato: '', historico: '', motivoPerda: '', valorEst: 199, obs: '' },
        { _row: 3, cidade: ' sorocaba ', empresa: 'Clínica Exemplo Beta', segmento: 'Clínica', bairro: 'Campolim', telefone: '(15) 3000-0002', whatsapp: '', fonte: 'Site (exemplo)', coleta: d(-9), status: 'Contatada', prioridade: 'Média', canal: 'Ligação', proximoPasso: 'Retornar ligação', lembrete: hoje, consentOp: '', ultimoContato: d(-3), historico: '', motivoPerda: '', valorEst: '', obs: '' },
        { _row: 4, cidade: 'Itu', empresa: 'Advocacia Exemplo Gama', segmento: 'Advocacia', bairro: 'Éden', telefone: '', whatsapp: '(15) 90000-1003', fonte: 'Instagram (exemplo)', coleta: d(-8), status: 'Contatada', modeloSugerido: 'Prospecção – Lembrete – Advocacia', prioridade: 'Baixa', canal: 'WhatsApp', proximoPasso: 'Lembrete único', lembrete: d(2), consentOp: '', ultimoContato: d(-4), historico: '', motivoPerda: '', valorEst: '', obs: '' },
        { _row: 5, cidade: 'Votorantim', empresa: 'Loja Exemplo Delta', segmento: 'Loja', bairro: 'Centro', telefone: '(15) 3000-0004', whatsapp: '(15) 90000-1004', fonte: 'Google Maps (exemplo)', coleta: d(-7), status: 'Não contatar', modeloSugerido: 'Prospecção – 1º contato – Contabilidade', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: 'Não contatar', ultimoContato: '', historico: '', motivoPerda: '', valorEst: '', obs: '' },
        { _row: 6, empresa: 'Escola Exemplo Épsilon', segmento: 'Escola', bairro: 'Vila Hortência', telefone: '(15) 3000-0005', whatsapp: '(15) 90000-1005', fonte: 'Site (exemplo)', coleta: d(-3), status: 'Nova', modeloSugerido: 'Prospecção – 1º contato – Escola', prioridade: 'Média', canal: 'WhatsApp', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: '', valorEst: '', obs: '' },
        { _row: 7, cidade: 'SOROCABA', empresa: 'Padaria Exemplo Zeta', segmento: 'Padaria', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' },
        { _row: 8, cidade: 'Itú', empresa: 'Oficina Exemplo Eta', segmento: 'Oficina', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' },
        { _row: 9, cidade: 'Salto', empresa: 'Mercado Exemplo Teta', segmento: 'Mercado', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' },
        { _row: 10, cidade: 'Boituva', empresa: 'Gráfica Exemplo Iota', segmento: 'Gráfica', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' },
        { _row: 11, cidade: 'Piedade', empresa: 'Ótica Exemplo Kappa', segmento: 'Ótica', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' },
        { _row: 12, cidade: 'Mairinque', empresa: 'Pet Shop Exemplo Lambda', segmento: 'Pet shop', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' },
        { _row: 13, cidade: 'Araçoiaba  da Serra', empresa: 'Farmácia Exemplo Mi', segmento: 'Farmácia', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' },
        { _row: 14, cidade: 'araçoiaba da serra', empresa: 'Imobiliária Exemplo Ni', segmento: 'Imobiliária', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' },
        { _row: 15, cidade: 'Itu', empresa: 'Academia Exemplo Xi', segmento: 'Academia', bairro: 'Centro', telefone: '', whatsapp: '', fonte: 'Exemplo', coleta: d(-20), status: 'Descartada', prioridade: '', canal: '', proximoPasso: '', lembrete: '', consentOp: '', ultimoContato: '', historico: '', motivoPerda: 'Exemplo', valorEst: '', obs: '' }
      ],
      modelos: [
        { _row: 2, modelo: 'Empresa – Primeiro contato', texto: 'Oi, {contato}! Aqui é o Pedro, da ProFix Computadores, de Sorocaba. Cuido de computadores de empresas como a {empresa}. Posso te mandar como funciona? (exemplo)', quando: 'Oportunidade Nova' },
        { _row: 3, modelo: 'Empresa – Lembrete único (3 dias)', texto: 'Oi, {contato}! Só pra saber se viu minha mensagem sobre a {empresa}. Se não for o momento, tudo bem! (exemplo)', quando: 'Contatada, 3 dias depois' },
        { _row: 4, modelo: 'Empresa – Respondeu com interesse', texto: 'Que bom, {contato}! Me conta o que está acontecendo com os computadores da {empresa}. (exemplo)', quando: 'Virou lead' },
        { _row: 5, modelo: 'Empresa – Agora não', texto: 'Tranquilo, {contato}, obrigado pelo retorno! (exemplo)', quando: 'Descartada' },
        { _row: 7, modelo: 'Prospecção – 1º contato – Contabilidade', texto: 'Olá, {contato}! Sou o Pedro, da ProFix. Atendo escritórios de contabilidade como a {empresa} com suporte de TI. Posso explicar? (exemplo)', quando: 'Nova, segmento Contabilidade' },
        { _row: 8, modelo: 'Prospecção – Lembrete – Advocacia', texto: 'Oi, {contato}! Retomando o contato com a {empresa}: o suporte de TI para escritórios de advocacia segue disponível. (exemplo)', quando: 'Contatada, segmento Advocacia' },
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
      leadsLink: function () { return JSON.parse(JSON.stringify(D.leadsLink || [])); },
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
        return { enviado: true, restanteCota: D.cotaEmail, msg: 'E-mail enviado.' };
      },
      salvarCliente: function (c) {
        if (!String(c.nome || '').trim()) throw new Error('Informe o nome do cliente.');
        if (c.consent && ['Sim', 'Não'].indexOf(c.consent) < 0) throw new Error('Consentimento deve ser Sim ou Não.');
        var campos = ['nome', 'whatsapp', 'bairro', 'origem', 'primeiro', 'consent', 'dataConsent', 'obs', 'etapa', 'ultimo', 'proximo', 'acao', 'preventiva', 'indicadoPor', 'motivoPerda', 'valorEst', 'aniversario', 'naoContatar', 'tipoCli', 'doc'];
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
    // ---- v0.6.0: OS com vários equipamentos (mesmas ações e respostas do crm-v3 v3.1; conta em os_multi.js) ----
    var OSM = typeof ProFixOSM !== 'undefined' ? ProFixOSM : require('./os_multi.js');
    D.osMulti = D.osMulti || {}; // num -> { revisao, dados }
    D.catalogoOS = D.catalogoOS || OSM.CATALOGO_DEMO.map(function (c) { return Object.assign({ tipoPreco: '', ativo: 'Sim', fonte: 'Sugestão (mediana +12,5%)' }, c); });
    var copia = function (o) { return JSON.parse(JSON.stringify(o)); };
    var cliDe = function (nome) { var c = (D.clientes || []).filter(function (k) { return k.nome === nome; })[0] || {}; return { nome: c.nome || nome, whatsapp: c.whatsapp || '', bairro: c.bairro || '' }; };
    var osDe = function (num) { return (D.os || []).filter(function (o) { return String(o.num) === String(num); })[0] || null; };
    var aprovada = function (num) { var o = osDe(num); return !!o && /^aprovado$/i.test(String(o.aprovacao || '')); };
    var montarDe = function (x) { if (x && x.dados) return OSM.montar(x.dados); var m = S.lerOSMulti(x && x.num); if (!m) throw new Error('Esta OS ainda não tem equipamentos cadastrados.'); return m; };
    var limparItem = function (i) { return { tipo: i.tipo, descricao: i.descricao, qtd: i.qtd, valorUnit: i.valorUnit, modo: i.modo, origem: i.origem }; };
    var paraSalvar = function (m) { return { num: m.num, _row: m._row, cliente: m.cliente, previsao: m.previsao, acessorios: m.acessorios, obsInt: m.obsInt,
      equipamentos: m.equipamentos.map(function (e) { return Object.assign({}, e, { totais: undefined, itens: e.itens.map(limparItem) }); }), itensOS: m.itensOS.map(limparItem) }; };
    S.lerOSMulti = function (num) {
      num = String(num || '').trim(); if (!num) throw new Error('Informe o número da OS.');
      var r = D.osMulti[num]; if (!r) return null;
      var o = osDe(num) || {}, x = OSM.montar(Object.assign({}, copia(r.dados), { cliente: o.cliente || r.dados.cliente, previsao: o.previsao || r.dados.previsao || '' }));
      x.revisao = r.revisao; x._row = o._row || ''; x.status = o.status || ''; return x;
    };
    S.salvarOSMulti = function (x) {
      var m = OSM.montar(x); if (!m.cliente) throw new Error('Escolha o cliente.');
      if (m.previsao && !/^\d{4}-\d{2}-\d{2}$/.test(m.previsao)) throw new Error('Previsão de entrega inválida.');
      var resumo = m.equipamentos.map(function (e) { return e.identificacao + (e.modelo ? ' – ' + e.modelo : ''); }).join('; ');
      var p = { cliente: m.cliente, equipamento: (m.equipamentos.length > 1 ? m.equipamentos.length + ' equipamentos: ' : '') + resumo,
        defeito: m.equipamentos.map(function (e) { return e.defeito ? (m.equipamentos.length > 1 ? e.identificacao + ': ' : '') + e.defeito : ''; }).filter(String).join(' | '),
        servico: m.equipamentos[0].servico || '', valor: m.totais.total };
      if (m.previsao) p.previsao = m.previsao; if (m.acessorios) p.acessorios = m.acessorios; if (m.obsInt) p.obsInt = m.obsInt;
      if (m.num) { p.num = m.num; p._row = x._row; }
      var r = S.salvarOS(p), num = m.num || (D.os[D.os.length - 1] || {}).num;
      var rev = ((D.osMulti[num] || {}).revisao || 0) + 1;
      D.osMulti[num] = { revisao: rev, dados: Object.assign(paraSalvar(m), { num: num }) };
      return { ok: true, num: num, revisao: rev, totais: m.totais, msg: r.msg + ' ' + m.equipamentos.length + ' equipamento(s), total ' + OSM.brl(m.totais.total) + '.' };
    };
    S.catalogoOS = function () {
      var out = [], visto = {}, add = function (o) { var k = String(o.descricao || '').toLowerCase(); if (!o.descricao || visto[k]) return; visto[k] = true; out.push(o); };
      D.catalogoOS.forEach(function (c) { if (c.ativo !== 'Não') add({ id: c.id, categoria: c.categoria, descricao: c.descricao, valor: c.valor, tipoPreco: c.tipoPreco || '', fonte: c.fonte || '', origem: 'Catálogo OS' }); });
      (D.catalogo || []).forEach(function (s) { if (s.ativo === 'Sim' && !/proposto/i.test(s.status || '')) add({ id: '', categoria: 'Serviço', descricao: s.servico, valor: s.preco, tipoPreco: s.tipo || '', fonte: 'Catálogo de serviços', origem: 'Catálogo de serviços' }); });
      (D.pecas || []).slice().reverse().forEach(function (p) { add({ id: '', categoria: 'Peça', descricao: p.peca, valor: p.precoUnit, tipoPreco: '', fonte: 'Usada antes', origem: 'Histórico' }); });
      return { itens: out };
    };
    S.salvarCatalogoOS = function (c) {
      if (!c || ['Serviço', 'Mão de obra', 'Peça'].indexOf(c.categoria) < 0) throw new Error('Categoria inválida: use Serviço, Mão de obra ou Peça.');
      var desc = String(c.descricao || '').trim(); if (!desc) throw new Error('Informe a descrição.');
      var valor = c.valor === '' || c.valor == null ? '' : OSM.centavos(num(c.valor));
      if (valor !== '' && (isNaN(valor) || valor < 0)) throw new Error('Valor base inválido.');
      var at = D.catalogoOS.filter(function (l) { return c.id ? l.id === c.id : (l.categoria === c.categoria && l.descricao.toLowerCase() === desc.toLowerCase()); })[0];
      var dados = { categoria: c.categoria, descricao: desc, valor: valor, tipoPreco: c.tipoPreco || '', ativo: c.ativo === false || c.ativo === 'Não' ? 'Não' : 'Sim', fonte: c.fonte || '' };
      if (at) { Object.assign(at, dados); return { ok: true, id: at.id, msg: 'Catálogo atualizado: ' + desc + '.' }; }
      var id = proxId('catalogoOS', 'id', 'CAT'); D.catalogoOS.push(Object.assign({ id: id }, dados)); return { ok: true, id: id, msg: 'Incluído no catálogo: ' + desc + '.' };
    };
    S.gerarOrcamentoOS = function (x) { var m = montarDe(x), o = OSM.orcamentoLocal(m, cliDe(m.cliente)); return { ok: true, num: m.num, totais: m.totais, html: '', whatsapp: o.whatsappTexto, whatsappCliente: o.cliente.whatsapp }; };
    S.orcamentoOS = function (x) {
      var m = montarDe(x), o = OSM.orcamentoLocal(m, cliDe(m.cliente)), os = osDe(m.num) || {};
      delete o.local; return Object.assign(o, { _row: os._row || '', status: os.status || '', aprovacao: os.aprovacao || '', dataAprov: os.dataAprov || '', comoAprov: os.comoAprov || '', html: '' });
    };
    S.aprovarOrcamentoOS = function (x) {
      if (!x || !String(x.num || '').trim()) throw new Error('Salve a OS antes de aprovar o orçamento.');
      var quando = h().split('-').reverse().join('/') + ' 10:00';
      var r = S.decidirOrcamento({ num: x.num, _row: x._row, decisao: 'Aprovado', como: 'Presencial (Ver orçamento) em ' + quando + (x.obs ? ' – ' + x.obs : '') });
      r.aprovadoEm = quando; return r;
    };
    S.simularCondicaoOS = function (x) { x = x || {}; var m = montarDe(x); return OSM.avaliarCondicao(OSM.montar(OSM.semNegociacao(paraSalvar(m))).totais.total, String(x.modo || '%'), x.valor); };
    S.aplicarCondicaoEspecialOS = function (x) {
      x = x || {}; if (!String(x.num || '').trim()) throw new Error('Salve a OS antes de aplicar a condição especial.');
      if (aprovada(x.num)) throw new Error('O orçamento já foi aprovado: a condição especial não pode mais ser mudada.');
      var m = S.lerOSMulti(x.num); if (!m) throw new Error('Esta OS ainda não tem equipamentos cadastrados.');
      var d = OSM.semNegociacao(paraSalvar(m)), av = OSM.avaliarCondicao(OSM.montar(d).totais.total, String(x.modo || '%'), x.valor);
      d.itensOS.push(OSM.itemCondicao(av, x.motivo, x.validoHoje)); d._row = x._row || m._row;
      var r = S.salvarOSMulti(d); r.condicao = av;
      r.msg = 'Condição especial aplicada: ' + OSM.brl(av.desconto) + ' de desconto. Novo total ' + OSM.brl(r.totais.total) + '.' + (av.aviso ? ' ' + av.aviso : ''); return r;
    };
    S.removerCondicaoEspecialOS = function (x) {
      x = x || {}; if (!String(x.num || '').trim()) throw new Error('Informe a OS.');
      if (aprovada(x.num)) throw new Error('O orçamento já foi aprovado: a condição especial não pode mais ser removida.');
      var m = S.lerOSMulti(x.num); if (!m) throw new Error('Esta OS ainda não tem equipamentos cadastrados.');
      if (!OSM.condicaoDe(m)) return { ok: true, num: x.num, totais: m.totais, msg: 'Não havia condição especial.' };
      var d = OSM.semNegociacao(paraSalvar(m)); d._row = x._row || m._row;
      var r = S.salvarOSMulti(d); r.msg = 'Condição especial removida. Total ' + OSM.brl(r.totais.total) + '.'; return r;
    };
    // ---- v0.7.0: diferenciais (mesmas ações e respostas do crm-v3 API @41, CONTRATO_DIFERENCIAIS.md; dados fictícios) ----
    var Dif = typeof ProFixDif !== 'undefined' ? ProFixDif : require('./diferenciais.js');
    ['maquinas', 'timelineCli', 'checklists', 'contratos', 'visitas'].forEach(function (k) { D[k] = D[k] || []; });
    D.tokensOS = D.tokensOS || {};
    var cliNome = function (nome) { var c = (D.clientes || []).filter(function (k) { return k.nome === nome; })[0]; if (!c) throw new Error('Cliente não encontrado.'); return c; };
    var osNum = function (num) { var o = osDe(num); if (!o) throw new Error('OS não encontrada.'); return o; };
    var agora = function () { return D.agoraFixo || (h() + ' ' + new Date().toTimeString().slice(0, 5)); };
    var evento = function (nome, os, ev, det) { D.timelineCli.push({ quando: agora(), cliente: nome, os: os || '', evento: ev, detalhe: det || '' }); };
    var telWa = function (c) { var n = String(c.whatsapp || '').replace(/\D/g, ''); if (n.length === 10 || n.length === 11) n = '55' + n; return n.length === 13 ? n : ''; };
    var waUrl = function (tel, t) { return 'https://wa.me/' + tel + '?text=' + encodeURIComponent(t); };
    var tokenOS = function (o) { if (!D.tokensOS[o.num]) { var a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_', t = ''; for (var i = 0; i < 43; i++) t += a.charAt((i * 7 + o.num.length * 13 + Number(String(o.num).replace(/\D/g, ''))) % a.length); D.tokensOS[o.num] = t; } return D.tokensOS[o.num]; };
    var urlOS = function (o) { return 'https://script.google.com/macros/s/EXEMPLO-FICTICIO/exec?os=' + tokenOS(o); };
    var garDias = function () { return (D.config && D.config.garantiaDiasProfix) || Dif.GARANTIA_PADRAO; };
    S.fichaCliente = function (x) {
      var c = cliNome(x && x.nome), f = Dif.fichaLocal(D, c.nome); delete f.local;
      f.maquinas = D.maquinas.filter(function (m) { return m.cliente === c.nome; }).map(function (m) { return { id: m.id, tipo: m.tipo, modelo: m.modelo, serie: m.serie }; });
      f.timeline = D.timelineCli.filter(function (t) { return t.cliente === c.nome; }).map(function (t) { return { quando: t.quando, os: t.os, evento: t.evento, detalhe: t.detalhe }; }).reverse();
      f.indicou = (D.clientes || []).filter(function (k) { return k.indicadoPor === c.nome; }).map(function (k) { return k.nome; });
      f.contrato = D.contratos.filter(function (k) { return k.cliente === c.nome && k.status === 'Ativo'; })[0] || null;
      f.avaliacoes = []; return f;
    };
    S.registrarMensagemAberta = function (x) {
      x = x || {}; var c = cliNome(x.nome), resumo = 'WhatsApp aberto (' + String(x.tipo || 'mensagem').slice(0, 40) + '): ' + String(x.texto || '').replace(/\s+/g, ' ').slice(0, 180);
      anexar('interacoes', { data: h(), cliente: c.nome, canal: 'WhatsApp', resumo: resumo, proximoPasso: '', dataProx: '', por: 'Pedro' }); c.ultimo = h();
      evento(c.nome, x.os, 'Mensagem aberta no WhatsApp', resumo); return { ok: true, msg: 'Registrado no histórico de contato.' };
    };
    S.agendarRetorno = function (x) {
      x = x || {}; var c = cliNome(x.nome); if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.data || ''))) throw new Error('Escolha a data do retorno.');
      c.proximo = x.data; c.acao = String(x.acao || 'Retorno').slice(0, 120); evento(c.nome, '', 'Retorno agendado', Dif.dataBR(x.data) + ' – ' + c.acao);
      return { ok: true, msg: 'Retorno agendado para ' + Dif.dataBR(x.data) + '.' };
    };
    S.salvarMaquina = function (x) {
      x = x || {}; var c = cliNome(String(x.cliente || '').trim()), serie = String(x.serie || '').trim();
      var ja = serie && D.maquinas.filter(function (m) { return String(m.serie).replace(/\W/g, '').toUpperCase() === serie.replace(/\W/g, '').toUpperCase(); })[0];
      if (ja) return { ok: true, id: ja.id, existente: true, msg: 'Essa série já está cadastrada (' + ja.id + ', ' + ja.cliente + ').' };
      var id = proxId('maquinas', 'id', 'MAQ-'); D.maquinas.push({ id: id, cliente: c.nome, tipo: x.tipo || '', modelo: x.modelo || '', serie: serie, obs: x.obs || '' });
      if (x.num) osNum(x.num).maquinaId = id; evento(c.nome, x.num, 'Máquina cadastrada', id + ' ' + [x.tipo, x.modelo, serie].filter(String).join(' · '));
      return { ok: true, id: id, msg: 'Máquina ' + id + ' cadastrada.' };
    };
    S.vincularMaquinaOS = function (x) { osNum(x.num).maquinaId = String(x.id || ''); return { ok: true, msg: 'Máquina vinculada à OS.' }; };
    S.salvarChecklistOS = function (x) {
      x = x || {}; var o = osNum(x.num); Dif.validarChecklist(x);
      D.checklists.push({ quando: agora(), os: o.num, momento: x.momento, itens: Object.assign({}, x.itens), senha: x.senhaInformada, bitlocker: x.bitlocker, obs: String(x.obs || '').slice(0, 500) });
      evento(o.cliente, o.num, 'Checklist de ' + x.momento.toLowerCase(), 'BitLocker: ' + x.bitlocker);
      return { ok: true, msg: 'Checklist de ' + x.momento.toLowerCase() + ' salvo na OS ' + o.num + '.' };
    };
    S.extrasOS = function (x) {
      var o = osNum(x && x.num), ck = D.checklists.filter(function (c) { return c.os === o.num; }), tem = function (m) { return ck.some(function (c) { return c.momento === m; }); };
      var pend = []; if (!tem('Entrada')) pend.push('Checklist de entrada'); if (!tem('Saída')) pend.push('Checklist de saída');
      return { ok: true, maquinaId: o.maquinaId || '', maquinas: D.maquinas.filter(function (m) { return m.cliente === o.cliente; }).map(function (m) { return { id: m.id, desc: [m.tipo, m.modelo, m.serie].filter(String).join(' · ') }; }),
        checklists: ck.map(function (c) { return { momento: c.momento, quando: c.quando, bitlocker: c.bitlocker, senha: c.senha }; }), pendenciasEntrega: pend, testes: [], testesPadrao: [], fotos: [], termo: null, textoTermo: '',
        garantias: Dif.garantiasDaOS(o, h(), garDias()), reincidencia: [] };
    };
    S.laudoTecnicoOS = function (x) {
      var o = osNum(x && x.num), esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (k) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[k]; }); };
      var ck = D.checklists.filter(function (c) { return c.os === o.num; }), g = Dif.garantiasDaOS(o, h(), garDias());
      return { ok: true, html: '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Laudo técnico ' + esc(o.num) + '</title><button onclick="print()">🖨️ Imprimir / salvar PDF</button><h1>Laudo técnico – ' + esc(o.num) + '</h1>' +
        '<p><b>ProFix Computadores</b> (demonstração, dados fictícios)</p><h2>Atendimento</h2><p>' + esc(o.cliente) + ' · ' + esc(o.equipamento) + '</p><h2>Defeito relatado</h2><p>' + esc(o.defeito || '—') + '</p><h2>Diagnóstico</h2><p>' + esc(o.diagnostico || '—') + '</p>' +
        '<h2>Checklist</h2><p>' + (ck.length ? ck.map(function (c) { return esc(c.momento) + ': ' + Object.keys(c.itens).map(function (k) { return esc(k + ' ' + c.itens[k]); }).join(', '); }).join('<br>') : 'Sem checklist registrado.') + '</p>' +
        '<h2>Garantia</h2><p>' + (g.length ? g[0].dias + ' dias, até ' + Dif.dataBR(g[0].ate) : 'Garantia de 30 dias a partir da entrega.') + '</p></html>' };
    };
    S.linkClienteOS = function (x) { var o = osNum(x && x.num); return { ok: true, num: o.num, url: urlOS(o), msg: 'Link do cliente pronto.' }; };
    S.textoStatusOS = function (x) {
      var o = osNum(x && x.num), c = (D.clientes || []).filter(function (k) { return k.nome === o.cliente; })[0] || {}, link = urlOS(o), st = Dif.statusCanon(o.status), pn = String(o.cliente).split(' ')[0];
      var texto = 'Olá, ' + pn + '! Aqui é da ProFix Computadores. Sua ' + o.num + ' está: ' + st + '.' + (o.previsao && st !== 'Entregue' ? ' Previsão: ' + Dif.dataBR(o.previsao) + '.' : '') + ' Acompanhe por aqui: ' + link;
      var r = Dif.regraContato(c, 'servico'), tel = telWa(c), pode = r.pode && !!tel;
      return { ok: true, num: o.num, status: st, texto: texto, link: link, podeAbrir: pode, waUrl: pode ? waUrl(tel, texto) : '', aviso: r.aviso || (!tel ? 'Cliente sem WhatsApp válido.' : '') };
    };
    S.textoMarketing = function (x) {
      x = x || {}; var c = cliNome(x.nome), r = Dif.regraContato(c, 'marketing'); if (!r.pode) return { ok: true, podeAbrir: false, aviso: r.aviso, texto: '' };
      var pn = c.nome.split(' ')[0], t = { reativacao: 'Olá, ' + pn + '! Aqui é da ProFix Computadores. Faz um tempo que não cuidamos do seu equipamento. Quer agendar uma revisão/limpeza? É só responder por aqui. 🙂',
        aniversario: 'Feliz aniversário, ' + pn + '! 🎉 A equipe da ProFix Computadores deseja um ótimo dia!', preventiva: 'Olá, ' + pn + '! Já está na hora da limpeza preventiva do seu equipamento (evita superaquecimento e travamentos). Quer agendar?',
        indicacao: 'Olá, ' + pn + '! Seu código de indicação da ProFix é ' + (c.codIndic || '(gere no painel)') + '. Quem você indicar ganha 10% de desconto no serviço. 🙌' }[x.tipo];
      if (!t) throw new Error('Tipo de mensagem inválido.'); var tel = telWa(c);
      return { ok: true, texto: t, podeAbrir: !!tel, waUrl: tel ? waUrl(tel, t) : '', aviso: tel ? '' : 'Cliente sem WhatsApp válido.' };
    };
    S.resumoMes = function (x) { var r = Dif.resumoMesLocal(D, (x && x.mes) || h().slice(0, 7)); delete r.local; r.receitaContratos = D.contratos.filter(function (k) { return k.status === 'Ativo'; }).reduce(function (s, k) { return s + Number(k.valor || 0); }, 0); return r; };
    S.listaContratos = function () {
      var P = ['Urgente', 'Alta', 'Normal', 'Baixa'], ord = function (p) { return P.indexOf(p); };
      return { ok: true, contratos: copia(D.contratos), visitas: copia(D.visitas).sort(function (a, b) { return (a.status === 'Concluída') - (b.status === 'Concluída') || ord(a.prioridade) - ord(b.prioridade) || (a.data < b.data ? -1 : 1); }), prioridades: P };
    };
    S.salvarContrato = function (x) {
      x = x || {}; var c = cliNome(x.cliente), v = Number(String(x.valor || '').replace(',', '.')); if (!(v > 0)) throw new Error('Informe o valor mensal.');
      var id = 'CT-' + ('000' + (D.contratos.length + 1)).slice(-4);
      D.contratos.push({ id: id, cliente: c.nome, plano: String(x.plano || 'Plano empresarial'), valor: Math.round(v * 100) / 100, visitas: Math.max(0, Math.round(Number(x.visitas) || 0)), status: 'Ativo', inicio: x.inicio || h(), obs: x.obs || '' });
      evento(c.nome, '', 'Contrato mensal', id + ' – R$ ' + v.toFixed(2)); return { ok: true, id: id, msg: 'Contrato ' + id + ' criado.' };
    };
    S.salvarVisita = function (x) {
      x = x || {}; if (!x.cliente) throw new Error('Escolha o cliente.'); if (!/^\d{4}-\d{2}-\d{2}/.test(String(x.data || ''))) throw new Error('Informe a data da visita.');
      if (x.idOperacao && D.visitas.some(function (v) { return v.idOperacao === x.idOperacao; })) return { ok: true, repetida: true, msg: 'Visita já registrada.' };
      var pr = ['Urgente', 'Alta', 'Normal', 'Baixa'].indexOf(x.prioridade) >= 0 ? x.prioridade : 'Normal', id = 'VT-' + ('000' + (D.visitas.length + 1)).slice(-4);
      D.visitas.push({ id: id, contrato: x.contrato || '', cliente: x.cliente, data: x.data, prioridade: pr, status: 'Agendada', inicio: '', fim: '', km: '', horas: '', os: x.os || '', obs: x.obs || '', idOperacao: x.idOperacao || '' });
      return { ok: true, id: id, msg: 'Visita ' + id + ' agendada (' + pr + ').' };
    };
    var visita = function (id) { var v = D.visitas.filter(function (k) { return k.id === id; })[0]; if (!v) throw new Error('Visita não encontrada.'); return v; };
    S.iniciarVisita = function (x) { var v = visita(x && x.id); if (v.inicio) return { ok: true, msg: 'Visita já iniciada em ' + v.inicio + '.' }; v.inicio = agora(); v.status = 'Em andamento'; evento(v.cliente, v.os, 'Visita técnica iniciada', v.id); return { ok: true, msg: 'Visita iniciada.' }; };
    S.encerrarVisita = function (x) {
      var v = visita(x && x.id); if (!v.inicio) throw new Error('Inicie a visita primeiro.');
      var fim = x.fim || agora(), km = Math.max(0, Number(String(x.km || 0).replace(',', '.')) || 0), horas = Dif.horasEntre(v.inicio, fim);
      v.fim = fim; v.km = km; v.horas = horas; v.status = 'Concluída'; evento(v.cliente, v.os, 'Visita técnica concluída', horas + ' h, ' + km + ' km');
      return { ok: true, horas: horas, km: km, msg: 'Visita encerrada: ' + String(horas).replace('.', ',') + ' h de mão de obra e ' + km + ' km de deslocamento (use no orçamento da OS).' };
    };
    return S;
  }
  return { dadosFicticios: dadosFicticios, criarServidor: criarServidor, somaDias: somaDias };
});
