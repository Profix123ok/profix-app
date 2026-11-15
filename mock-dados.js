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
      motivosPerda: ['Preço', 'Resolveu com outra pessoa', 'Desistiu do conserto', 'Comprou um aparelho novo', 'Não respondeu', 'Fora da região', 'Serviço que a ProFix não faz', 'Outro'],
      segmentos: ['Contabilidade', 'Advocacia', 'Clínica', 'Loja', 'Imobiliária', 'Escola', 'Outro'],
      canais: ['WhatsApp', 'Ligação', 'Instagram', 'Presencial', 'E-mail', 'Outro'],
      origens: ['Google', 'Instagram', 'Indicação', 'Panfleto', 'Prospecção', 'Outro'],
      formasPag: ['Dinheiro', 'Pix', 'Débito', 'Crédito à vista', 'Crédito parcelado'],
      formasPagFin: ['Dinheiro', 'Pix', 'Débito', 'Crédito à vista', 'Crédito parcelado'],
      tiposFin: ['Entrada', 'Saída'],
      // v0.8.6/0.8.7: Módulo 9 do CRM (FICTÍCIO, API @113/@115). Só id/nome/ativo de fornecedor (sem contato). Cotações e Estoque começam vazios, como na planilha real.
      m9: { fornecedores: [{ id: 'FN-0001', nome: 'Distribuidora Exemplo Fictícia', ativo: true }, { id: 'FN-0002', nome: 'Loja Exemplo Fictícia', ativo: true }, { id: 'FN-0003', nome: 'Fornecedor Antigo Fictício', ativo: false }], cotacoes: [] },
      categoriasFin: ['Serviço', 'Venda de peça', 'Revenda de usado', 'Compra de peça', 'Deslocamento', 'Ferramentas', 'DAS-MEI', 'Marketing', 'Outros'],
      config: { linkAgenda: 'https://exemplo.invalid/agenda', whatsappProfix: '(15) 90000-0000', linkAvaliacao: '', // v0.7.1: padrões do servidor (Propriedades do script; valores fictícios = padrões do contrato)
        garantiaDiasProfix: 30, validadePadraoDias: 7, descontoIndicacaoPct: 10, googleReviewUrl: 'https://g.page/r/CZQuYc9gn5lJECE/review',
        // v0.8.4: mesmo contrato do crm-v3 (getDados.config.pixPct + planosPublicos.anualPct)
        pixPct: 5, anualPct: 10,
        // v0.9.2: espelha crm-v3 API @127 (getDados.config.pix / planosPublicos.pix). Dados da ProFix (públicos: CNPJ do MEI).
        pix: { chave: '64628598000140', tipo: 'CNPJ', chaveTexto: 'CNPJ 64.628.598/0001-40', recebedor: 'PROFIX COMPUTADORES', cidade: 'SOROCABA', pct: 5, nomeBanco: '' } },
      // v0.8.5: mesmo formato de getDados().fin do crm-v3 (configFinanceiro_). Taxas FICTÍCIAS de demonstração.
      fin: { teto: 81000, tetoDaPlanilha: false, alerta: 0.8, taxas: [{ forma: 'Dinheiro', taxa: '' }, { forma: 'Pix', taxa: 0 }, { forma: 'Débito', taxa: 0.99 }, { forma: 'Crédito à vista', taxa: 3.15 }, { forma: 'Crédito parcelado', taxa: '' }], taxasFaltando: ['Crédito parcelado'] },
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
        { _row: 2, num: 'OS-0012', entrada: d(-5), cliente: 'Bruno Exemplo Lima', equipamento: 'Notebook Dell (fictício)', defeito: 'Lento e esquentando', servico: 'Formatação sem backup', status: 'Em reparo', valor: 66.9, custo: 0, previsao: d(1), statusEm: d(-2), senha: '1234', acessorios: 'Carregador', diagnostico: '', orcamento: '', aprovacao: '', agendadoPara: '' },
        { _row: 3, num: 'OS-0013', entrada: d(-4), cliente: 'Carla Exemplo Souza', equipamento: 'Desktop gamer (fictício)', defeito: 'Não dá vídeo', status: 'Aguardando aprovação', valor: '', orcamento: 380, diagnostico: 'Fonte com defeito', itensOrc: 'Mão de obra + fonte 600W', validade: d(6), aprovacao: 'Pendente', statusEm: d(-3) },
        { _row: 4, num: 'OS-0015', entrada: d(-9), cliente: 'Ana Exemplo Silva', equipamento: 'PC montado', servico: 'Montagem de PC (peças do cliente)', status: 'Pronto', valor: 350.9, statusEm: d(-8) },
        { _row: 5, num: 'OS-0010', entrada: d(-12), cliente: 'Ana Exemplo Silva', equipamento: 'Notebook Acer', servico: 'Formatação sem backup', status: 'Entregue', valor: 66.9, entrega: d(-4), forma: 'Pix' },
        { _row: 6, num: 'OS-0009', entrada: d(-125), cliente: 'Elisa Exemplo Prado', equipamento: 'Notebook Lenovo (fictício)', servico: 'Limpeza interna + pasta térmica (notebook)', status: 'Entregue', valor: 152.9, entrega: d(-120), forma: 'Dinheiro' }
      ],
      pecas: [{ _row: 2, data: d(-3), os: 'OS-0012', peca: 'SSD 480 GB (exemplo)', qtd: 1, custoUnit: 180, precoUnit: 250, fornecedor: 'Loja exemplo', origem: 'Comprada para esta OS', link: '' }],
      financeiro: [
        { _row: 2, data: d(-4), tipo: 'Entrada', categoria: 'Serviço', os: 'OS-0010', descricao: 'Recebimento OS OS-0010', forma: 'Pix', receita: 66.9, custo: 0 },
        { _row: 4, data: d(-120), tipo: 'Entrada', categoria: 'Serviço', os: 'OS-0009', descricao: 'Recebimento OS OS-0009', forma: 'Dinheiro', receita: 152.9, custo: 0 },
        { _row: 3, data: ym + '-02', tipo: 'Saída', categoria: 'Compra de peça', os: '', descricao: 'Pasta térmica (exemplo)', forma: 'Pix', receita: '', custo: 35 }
      ],
      tarefas: [
        { _row: 2, data: d(-1), cliente: 'Carla Exemplo Souza', tarefa: 'Orçamento sem resposta (OS-0013)', tipo: 'Orçamento sem resposta', status: 'Pendente', os: 'OS-0013' },
        { _row: 3, data: hoje, cliente: 'Ana Exemplo Silva', tarefa: 'Lembrete de retirada (OS-0015)', tipo: 'Lembrete de retirada', status: 'Pendente', os: 'OS-0015' },
        { _row: 4, data: d(5), cliente: '', tarefa: 'Pagar DAS-MEI', tipo: 'Outro', status: 'Pendente', os: '' }
      ],
      maquinas: [{ id: 'MAQ-0001', cliente: 'Ana Exemplo Silva', tipo: 'Notebook', modelo: 'Acer Aspire (fictício)', serie: 'SN-EXEMPLO-001' }, { id: 'MAQ-0002', cliente: 'Ana Exemplo Silva', tipo: 'Desktop', modelo: 'PC montado (fictício)', serie: '' }],
      timelineCli: [{ quando: d(-4) + ' 17:00', cliente: 'Ana Exemplo Silva', os: 'OS-0010', evento: 'Avaliação pedida', detalhe: 'Link de avaliação aberto no WhatsApp' }],
      // v0.8.9: campos de cobrança (dia do vencimento e forma) — FICTÍCIOS. A situação do mês (pago/a vencer/vencido/fora) é calculada pelo servidor demo,
      // no mesmo critério do crm-v3: vencido = dia já passou no mês; a vencer = dia 31 (último dia do mês); sem dia = fora (contrato antigo); Proposta = fora.
      contratos: [{ id: 'CT-0001', cliente: 'Carla Exemplo Souza', plano: 'Essencial', valor: 143.8, visitas: 0, status: 'Ativo', inicio: d(-30), dia: Math.max(1, Number(hoje.slice(8, 10)) - 1), forma: 'Pix', obs: 'Exemplo fictício. Visita preventiva: a cada 2 meses. Até 3 computadores. Limpeza a cada 6 meses.' },
        { id: 'CT-0002', cliente: 'Escritório Exemplo Gama (fictício)', plano: 'Empresa', valor: 719, visitas: 2, status: 'Ativo', inicio: d(-60), dia: 31, forma: 'Pix', obs: 'Exemplo fictício.' },
        { id: 'CT-0003', cliente: 'Clínica Exemplo Delta (fictício)', plano: 'Essencial', valor: 359.5, visitas: 1, status: 'Ativo', inicio: d(-90), dia: '', forma: '', obs: 'Exemplo fictício: contrato antigo, sem dia do vencimento.' },
        { id: 'CT-0004', cliente: 'Loja Exemplo Ômega (fictício)', plano: 'Essencial', valor: 359.5, visitas: 1, status: 'Proposta', inicio: d(5), dia: '', forma: '', obs: 'Exemplo fictício: proposta enviada.' }],
      visitas: [{ id: 'VT-0001', contrato: 'CT-0001', cliente: 'Carla Exemplo Souza', data: hoje, prioridade: 'Alta', status: 'Agendada', inicio: '', fim: '', km: '', horas: '', os: '', hora: '19:00', obs: 'Horário: 19:00\nRede do escritório (fictício)' }],
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
        { _row: 2, modelo: 'Empresa – Primeiro contato', texto: "Olá! Tudo bem?\n\nMe chamo Pedro, sou responsável pela ProFix Computadores. Atendemos empresas de Sorocaba com suporte técnico e manutenção preventiva, para que os computadores da {empresa} funcionem bem e sem paradas por lentidão ou falhas.\n\nVocê pode conhecer nossos serviços e planos para empresas no nosso site:\nhttps://profixcomputadores.github.io/empresas.html\n\nSe fizer sentido para vocês, podemos marcar uma conversa rápida de 10 minutos, por ligação ou chamada, para eu entender como está a estrutura de TI da {empresa} e mostrar como podemos ajudar. Qual dia e horário fica melhor para você?\n\nSe preferir não receber mensagens, é só me avisar.", quando: 'Oportunidade Nova' },
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
        { _row: 2, servico: 'Diagnóstico/orçamento (bancada)', preco: 62.9, tipo: 'Fixo', descricao: 'Avaliação do equipamento (só mão de obra)', tempo: '1 dia', ativo: 'Sim', status: 'Ativo' },
        { _row: 3, servico: 'Formatação sem backup', preco: 66.9, tipo: 'Fixo', descricao: 'Formatação com drivers (só mão de obra)', tempo: '1 dia', ativo: 'Sim', status: 'Ativo' },
        { _row: 4, servico: 'Hora técnica', preco: '', tipo: 'Sob orçamento', descricao: 'Sem valor na tabela de 02/11/2026', ativo: 'Não', status: 'Proposto', sugerido: 'sob orçamento' }
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
      getDados: function () { var c = JSON.parse(JSON.stringify(D)); delete c.m9; delete c.m9cot; if (!opc.enviarSenha) c.os.forEach(function (o) { delete o.senha; }); return c; },
      // v0.8.4: espelha crm-v3 plPlanosPublicos_ (pixPct/anualPct + planos ativos)
      planosPublicos: function () {
        return {
          ok: true,
          pixPct: (D.config && D.config.pixPct != null) ? Number(D.config.pixPct) : 5,
          anualPct: (D.config && D.config.anualPct != null) ? Number(D.config.anualPct) : 10,
          pix: D.config && D.config.pix ? JSON.parse(JSON.stringify(D.config.pix)) : undefined, // v0.9.2: API @127
          planos: [
            { versao: '2026-11-09', chave: 'essencial', nome: 'Essencial', preco: 359.5, aPartir: true, porPc: 0, maqExtra: 35, maqTexto: 'até 5 computadores', maquinas: 5, visitas: '1 por mês', prioridade: 'Suporte remoto', paraQuem: 'Para pequenos negócios com até 5 computadores.', destaque: false, inclui: ['1 visita no local por mês', 'Suporte remoto', 'Checagem de desempenho em cada visita', 'Peças à parte'] },
            { versao: '2026-11-09', chave: 'profissional', nome: 'Empresa', preco: 719, aPartir: true, porPc: 0, maqExtra: 35, maqTexto: 'até 10 computadores', maquinas: 10, visitas: '2 por mês', prioridade: 'Suporte remoto prioritário', paraQuem: 'Para empresas com até 10 computadores.', destaque: true, inclui: ['2 visitas no local por mês', 'Suporte remoto prioritário', 'Checagem de desempenho em cada visita', 'Peças à parte'] },
            { versao: '2026-11-09', chave: 'empresa', nome: 'Empresa+', preco: 790.9, aPartir: true, porPc: 71.9, maqExtra: 0, maqTexto: '11 computadores ou mais', maquinas: 11, visitas: '3 por mês', prioridade: 'Prioridade na agenda', paraQuem: 'Para empresas com 11 computadores ou mais.', destaque: false, inclui: ['3 visitas no local por mês', 'Prioridade na agenda', 'Checagem de desempenho em cada visita', 'Peças à parte'] }
          ]
        };
      },
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
      salvarAgendamentoOS: function (x) {
        x = x || {};
        var o = (D.os || []).find(function (k) { return k.num === x.os || (x._row && k._row === Number(x._row)); });
        if (!o) throw new Error('OS não encontrada.');
        var data = String(x.data || '').trim(), hora = String(x.hora || '').trim(), quando = '';
        if (data) {
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new Error('Informe a hora (ex.: 19:30).');
          quando = data + ' ' + hora;
        }
        o.agendadoPara = quando;
        return { ok: true, agendado: quando, msg: quando ? ('Agendamento salvo: ' + quando + '.') : 'Agendamento removido.' };
      },
      enviarEmailCliente: function (x) {
        x = x || {};
        var clienteId = String(x.clienteId || '').trim(), osNum = String(x.os || '').trim();
        var assunto = String(x.assunto || '').trim(), corpo = String(x.corpo || '').trim();
        var refId = String(x.refId || osNum || '').trim();
        if (!clienteId && !osNum) throw new Error('Informe o cliente ou a OS.');
        if (!assunto || !corpo) throw new Error('Informe o assunto e a mensagem.');
        if (/\[CONFIRMAR/.test(corpo)) throw new Error('O texto ainda tem [CONFIRMAR …]. Troque antes de enviar.');
        var donoOS = null;
        if (osNum || refId) {
          var regOS = (D.os || []).find(function (o) { return o.num === (osNum || refId); });
          if (osNum && !regOS) throw new Error('OS não encontrada.');
          if (regOS) donoOS = regOS.cliente;
        }
        var c = clienteId ? (D.clientes || []).find(function (k) { return k.id === clienteId; })
          : (D.clientes || []).find(function (k) { return donoOS && k.nome === donoOS; });
        if (!c) throw new Error('Cliente não encontrado.');
        if (donoOS != null && c.nome !== donoOS) throw new Error('Esta OS é de outro cliente: e-mail não enviado.');
        if (/^s/i.test(String(c.naoContatar || '').trim())) throw new Error('Cliente marcado como "Não contatar": e-mail não enviado.');
        if (String(c.consent || '').trim() !== 'Sim') throw new Error('Cliente sem consentimento LGPD "Sim": e-mail não enviado.');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email || '')) throw new Error('Cliente sem e-mail válido: e-mail não enviado.');
        if (!(D.cotaEmail > 0)) throw new Error('Cota diária de e-mails esgotada. Tente amanhã.');
        D.cotaEmail--;
        D._ultimoEmail = { to: c.email, assunto: assunto, corpo: corpo, rodape: x.rodape || '', os: osNum, refId: refId };
        anexar('interacoes', { data: h(), cliente: c.nome, canal: 'E-mail', resumo: 'E-mail: ' + assunto + (refId ? ' – ' + refId : ''), proximoPasso: '', dataProx: '', por: 'Pedro' });
        return { enviado: true, restanteCota: D.cotaEmail };
      },
      salvarCliente: function (c) {
        if (!String(c.nome || '').trim()) throw new Error('Informe o nome do cliente.');
        if (c.consent && ['Sim', 'Não'].indexOf(c.consent) < 0) throw new Error('Consentimento deve ser Sim ou Não.');
        var campos = ['nome', 'whatsapp', 'bairro', 'origem', 'primeiro', 'consent', 'dataConsent', 'obs', 'etapa', 'ultimo', 'proximo', 'acao', 'preventiva', 'indicadoPor', 'motivoPerda', 'valorEst', 'aniversario', 'naoContatar', 'tipoCli', 'doc', 'email'];
        if (c._row) { copiar(achar('clientes', 'nome', c._nomeOriginal || c.nome, c._row), c, campos); return { ok: true, msg: 'Cliente atualizado.' }; }
        var n = { id: proxId('clientes', 'id', 'C'), primeiro: h(), etapa: 'Lead' }; copiar(n, c, campos); anexar('clientes', n); return { ok: true, row: n._row, id: n.id, msg: 'Cliente cadastrado (' + n.id + ').' }; /* v0.9.3: igual ao crm-v3 (row, id) */
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
        var campos = ['cliente', 'equipamento', 'defeito', 'servico', 'valor', 'previsao', 'acessorios', 'serie', 'obsInt', 'tipoAtend', 'senha', 'agendadoPara'];
        if (o._row) { var a = achar('os', 'num', o.num, o._row); copiar(a, o, campos); return { ok: true, msg: 'OS ' + a.num + ' salva.' }; }
        var n = { num: 'OS-' + proxId('os', 'num', '').slice(-4), entrada: h(), status: 'Recebido', statusEm: h() }; copiar(n, o, campos); anexar('os', n); return { ok: true, num: n.num, _row: n._row, msg: 'OS ' + n.num + ' criada.' };
      },
      mudarStatusOS: function (n, linha, status, op) {
        if (D.statusOS.indexOf(status) < 0) throw new Error('Status inválido.');
        var a = achar('os', 'num', n, linha); a.status = status; a.statusEm = h(); if (status === 'Entregue') { a.entrega = (op && op.entrega) || h(); if (!op || op.apagarSenha !== false) a.senha = ''; }
        return { ok: true, msg: 'OS ' + n + ' → ' + status + '.' };
      },
      salvarOrcamento: function (o) {
        var a = achar('os', 'num', o.num, o._row);
        // v0.9.2: espelha o crm-v3 API @123: itens[] opcionais -> o servidor monta itensOrc (mesmo formato do App) e confere o total ("não bate").
        if (Array.isArray(o.itens) && o.itens.length) {
          var OR = typeof ProFixOrc !== 'undefined' ? ProFixOrc : (typeof require === 'function' ? require('./orcamento_rapido.js') : null);
          var ie = OR.textoDeItens(o.itens), br = function (n) { return OR.brl(n); };
          var inf = o.orcamento === '' || o.orcamento == null ? null : Number(String(o.orcamento).indexOf(',') >= 0 ? String(o.orcamento).replace(/\./g, '').replace(',', '.') : o.orcamento);
          if (inf != null && (!isFinite(inf) || Math.abs(Math.round(inf * 100) / 100 - ie.total) > 0.01)) throw new Error('O total informado (' + br(isFinite(inf) ? inf : 0) + ') não bate com a soma dos itens (' + br(ie.total) + '). Confira os valores.');
          o = Object.assign({}, o, { itensOrc: ie.texto, orcamento: ie.total }); a.itensRecebidos = o.itens.length;
        }
        copiar(a, o, ['diagnostico', 'itensOrc', 'orcamento', 'validade', 'previsao']);
        if (!a.validade) a.validade = somaDias(h(), 10); if (o.marcarAguardando !== false) { a.status = 'Aguardando aprovação'; a.aprovacao = 'Pendente'; } return { ok: true, msg: 'Orçamento salvo.' };
      },
      decidirOrcamento: function (x) {
        if (['Aprovado', 'Recusado'].indexOf(x.decisao) < 0) throw new Error('Decisão inválida.');
        // igual ao crm-v3 (Code.gs decidirOrcamento + Diferenciais.gs motivoRecusa_): recusa exige motivo
        if (x.decisao === 'Recusado' && ['caro', 'prazo', 'desistiu', 'foi para outro', 'outro'].indexOf(String(x.motivo || '').toLowerCase().trim()) < 0) throw new Error('Escolha o motivo da recusa (caro, prazo, desistiu, foi para outro ou outro).');
        var a = achar('os', 'num', x.num, x._row); if (x.decisao === 'Recusado') a.motivoRecusa = x.motivo + (x.motivoTexto ? ' – ' + x.motivoTexto : ''); a.aprovacao = x.decisao; a.comoAprov = x.como || ''; a.dataAprov = h();
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
        else if (String(canal || 'WhatsApp') !== 'WhatsApp' && (antes === 'Sem resposta' || antes === 'Contatada')) { if (antes === 'Sem resposta') o.status = 'Contatada'; } // v0.9.3: igual ao crm-v3 (Instagram/ligação não gastam o lembrete)
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
    D.catalogoOS = D.catalogoOS || OSM.CATALOGO_DEMO.map(function (c) { return Object.assign({ tipoPreco: '', ativo: 'Sim', fonte: 'Tabela aprovada 02/11/2026 (mercado Sorocaba −10%; só mão de obra)' }, c); });
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
    var garDias = function () { return Dif.padroes(D).garantiaDias; };
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
        '<h2>Garantia</h2><p>' + 'Garantia legal de 90 dias (CDC).' + (g.length ? ' Garantia ProFix de ' + g[0].dias + ' dias a partir da entrega (até ' + Dif.dataBR(g[0].ate) + ').' : garDias() ? ' Garantia ProFix de ' + garDias() + ' dias a partir da entrega.' : '') + '</p></html>' };
    };
    S.salvarValidadeOS = function (x) { var o = osNum(x && x.num); var dias = Dif.padroes(D).validadeDias || 7; o.validade = somaDias(h(), dias); return { ok: true, validade: o.validade, msg: 'Validade do orçamento: até ' + o.validade + '.' }; };
    // v0.9.2: igual ao crm-v3 API @127 – sempre { ok, num, url, criado, msg } (nunca ok com url vazia).
    S.linkClienteOS = function (x) { var o = osNum(x && x.num), novo = !o._tokenDemo; o._tokenDemo = true; return { ok: true, num: o.num, url: urlOS(o), criado: novo, msg: 'Link do cliente pronto.' }; };
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
    // v0.8.9: cobrança dos planos — mesmo critério do crm-v3 API @117 (listaContratos/receberMensalidade/salvarContrato).
    var STATUS_CT = ['Ativo', 'Pausado', 'Encerrado', 'Proposta'];
    var compBR = function (ym) { return String(ym).slice(5, 7) + '/' + String(ym).slice(0, 4); };
    var diaCt = function (v) { if (v === '' || v == null) return ''; var n = Number(v); if (isNaN(n) || n < 1 || n > 31 || Math.floor(n) !== n) throw new Error('Dia do vencimento deve ser de 1 a 31.'); return n; };
    var vencCt = function (dia, ym) { var p = String(ym).split('-').map(Number), ult = new Date(Date.UTC(p[0], p[1], 0)).getUTCDate(), dd = Math.min(Number(dia) || 1, ult); return ym + '-' + (dd < 10 ? '0' : '') + dd; };
    var pagCt = function (id, ym) { var marca = 'Mensalidade ' + id + ' – competência ' + compBR(ym); return (D.financeiro || []).filter(function (f) { return f.tipo === 'Entrada' && String(f.descricao || '').indexOf(marca) === 0; })[0] || null; };
    var sitCt = function (k, ym) {
      var venc = k.dia ? vencCt(k.dia, ym) : '', pg = pagCt(k.id, ym);
      if (pg) return { s: 'pago', venc: venc, pag: pg };
      if (!k.dia || k.status !== 'Ativo' || (k.inicio && String(k.inicio).slice(0, 7) > ym)) return { s: 'fora', venc: venc };
      return { s: venc < h() ? 'vencido' : 'a vencer', venc: venc };
    };
    var vivoCt = function (k) { return !k._excluido; };
    S.resumoMes = function (x) {
      var mes = (x && x.mes) || h().slice(0, 7), r = Dif.resumoMesLocal(D, mes); delete r.local;
      r.receitaContratos = D.contratos.filter(function (k) { return vivoCt(k) && k.status === 'Ativo'; }).reduce(function (s, k) { return Math.round((s + Number(k.valor || 0)) * 100) / 100; }, 0);
      var mk = ' – competência ' + compBR(mes);
      r.receitaContratosRecebida = Math.round((D.financeiro || []).reduce(function (s, f) { var dsc = String(f.descricao || ''); return f.tipo === 'Entrada' && dsc.indexOf('Mensalidade ') === 0 && dsc.indexOf(mk) > 0 ? s + Number(f.receita || 0) : s; }, 0) * 100) / 100;
      return r;
    };
    S.listaContratos = function (x) {
      var P = ['Urgente', 'Alta', 'Normal', 'Baixa'], ord = function (p) { return P.indexOf(p); };
      var ym = /^\d{4}-\d{2}$/.test(String((x && x.competencia) || '')) ? x.competencia : h().slice(0, 7);
      var res = { competencia: ym, pagos: 0, aVencer: 0, vencidos: 0, fora: 0, recebido: 0, emAberto: 0 };
      var cts = D.contratos.filter(vivoCt).map(function (k) {
        var st = sitCt(k, ym);
        if (st.s === 'pago') { res.pagos++; res.recebido += Number(st.pag.receita) || 0; } else if (st.s === 'fora') res.fora++; else { res[st.s === 'vencido' ? 'vencidos' : 'aVencer']++; res.emAberto += Number(k.valor) || 0; }
        return Object.assign(copia(k), { dia: k.dia === '' || k.dia == null ? '' : Number(k.dia), competencia: ym, vencimento: st.venc, situacaoMensalidade: st.s, forma: k.forma || '', pagoEm: st.pag ? String(st.pag.data).slice(0, 10) : '', valorPago: st.pag ? Number(st.pag.receita) || 0 : 0 });
      });
      res.recebido = Math.round(res.recebido * 100) / 100; res.emAberto = Math.round(res.emAberto * 100) / 100;
      return { ok: true, contratos: cts, cobranca: res, visitas: copia(D.visitas).sort(function (a, b) { return (a.status === 'Concluída') - (b.status === 'Concluída') || ord(a.prioridade) - ord(b.prioridade) || (a.data < b.data ? -1 : 1); }), prioridades: P };
    };
    S.salvarContrato = function (x) {
      x = x || {}; var tem = function (k) { return Object.prototype.hasOwnProperty.call(x, k) && x[k] !== undefined; };
      var dia = tem('dia') ? diaCt(x.dia) : undefined, status = tem('status') && String(x.status || '').trim() ? String(x.status).trim() : undefined;
      if (status !== undefined && STATUS_CT.indexOf(status) < 0) throw new Error('Status inválido. Use: ' + STATUS_CT.join(', ') + '.');
      var forma = tem('forma') ? String(x.forma || '').trim() : undefined;
      if (forma && (D.formasPagFin || D.formasPag || []).indexOf(forma) < 0) throw new Error('Forma de pagamento inválida.');
      var id = String(x.id || '').trim();
      if (id) {
        var k = D.contratos.filter(function (c) { return c.id === id && vivoCt(c); })[0]; if (!k) throw new Error('Contrato ' + id + ' não encontrado.');
        var novoSt = status || k.status, novoDia = dia === undefined ? k.dia : dia;
        if (novoSt === 'Ativo' && !novoDia) throw new Error('Informe o dia do vencimento (1 a 31). Contrato ativo precisa do dia para a cobrança (use status "Proposta" enquanto não fechar).');
        k.status = novoSt; k.dia = novoDia; if (forma !== undefined) k.forma = forma;
        if (tem('plano') && String(x.plano || '').trim()) k.plano = String(x.plano).trim();
        if (tem('valor') && String(x.valor) !== '') { var vv = Number(String(x.valor).replace(',', '.')); if (!(vv > 0)) throw new Error('Informe o valor mensal.'); k.valor = Math.round(vv * 100) / 100; }
        return { ok: true, id: id, avisos: [], msg: 'Contrato ' + id + ' atualizado.' };
      }
      var c = cliNome(x.cliente), v = Number(String(x.valor || '').replace(',', '.')); if (!(v > 0)) throw new Error('Informe o valor mensal.');
      status = status || 'Ativo'; dia = dia === undefined ? '' : dia;
      if (status === 'Ativo' && !dia) throw new Error('Informe o dia do vencimento (1 a 31). Contrato ativo precisa do dia para a cobrança (use status "Proposta" enquanto não fechar).');
      id = 'CT-' + ('000' + (D.contratos.length + 1)).slice(-4);
      D.contratos.push({ id: id, cliente: c.nome, plano: String(x.plano || 'Plano empresarial'), valor: Math.round(v * 100) / 100, visitas: Math.max(0, Math.round(Number(x.visitas) || 0)), status: status, inicio: x.inicio || h(), dia: dia, forma: forma || '', obs: x.obs || '' });
      evento(c.nome, '', 'Contrato mensal', id + ' – R$ ' + v.toFixed(2)); return { ok: true, id: id, avisos: [], msg: 'Contrato ' + id + ' criado.' + (dia ? ' Vence todo dia ' + dia + '. Nada é cobrado automaticamente.' : '') };
    };
    S.receberMensalidade = function (m) {
      m = m || {}; var id = String(m.id || '').trim(); if (!id) throw new Error('Informe o id do contrato.');
      var ym = String(m.competencia || h().slice(0, 7)).trim(); if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Competência inválida (use AAAA-MM).');
      var data = String(m.data || '').trim() || h(); if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data inválida (use AAAA-MM-DD).');
      var k = D.contratos.filter(function (c) { return c.id === id; })[0];
      if (!k) throw new Error('Contrato ' + id + ' não encontrado.'); if (k._excluido) throw new Error('O contrato ' + id + ' está na Lixeira.');
      if (!k.dia) throw new Error('O contrato ' + id + ' não tem dia do vencimento: informe o dia (salvarContrato) antes de receber.');
      if (pagCt(id, ym)) throw new Error('A mensalidade de ' + compBR(ym) + ' do ' + id + ' já foi lançada.');
      var valor = m.valor !== undefined && m.valor !== null && String(m.valor) !== '' ? Number(String(m.valor).replace(',', '.')) : Number(k.valor);
      if (!(valor > 0)) throw new Error('Informe o valor recebido.');
      var forma = String(m.forma || k.forma || '').trim(); if (forma && (D.formasPagFin || D.formasPag || []).indexOf(forma) < 0) throw new Error('Forma de pagamento inválida.');
      var avisos = [];
      if (k.status !== 'Ativo') avisos.push('O contrato ' + id + ' está como ' + k.status + '.');
      if (k.inicio && String(k.inicio).slice(0, 7) > ym) avisos.push('A competência ' + compBR(ym) + ' é anterior ao início do contrato (' + String(k.inicio).slice(0, 10) + ').');
      if (Number(k.valor) > 0 && Math.abs(valor - Number(k.valor)) > 0.004) avisos.push('Valor recebido diferente do valor mensal do contrato (R$ ' + Number(k.valor).toFixed(2) + ').');
      var row = (D.financeiro || []).reduce(function (mx, f) { return Math.max(mx, Number(f._row) || 0); }, 1) + 1;
      D.financeiro.push({ _row: row, data: data, tipo: 'Entrada', categoria: 'Serviço', os: '', descricao: 'Mensalidade ' + id + ' – competência ' + compBR(ym) + ' – ' + k.cliente + ' – ' + k.plano, forma: forma, parcelas: String(m.parcelas || ''), receita: Math.round(valor * 100) / 100, custo: 0 });
      return { ok: true, msg: 'Mensalidade ' + compBR(ym) + ' do ' + id + ' lançada no Financeiro.', id: id, competencia: ym, situacaoMensalidade: 'pago', lancamento: { row: row, data: data, valor: Math.round(valor * 100) / 100 }, avisos: avisos };
    };
    S.salvarVisita = function (x) {
      x = x || {}; if (!x.cliente) throw new Error('Escolha o cliente.'); if (!/^\d{4}-\d{2}-\d{2}/.test(String(x.data || ''))) throw new Error('Informe a data da visita.');
      if (x.idOperacao && D.visitas.some(function (v) { return v.idOperacao === x.idOperacao; })) return { ok: true, repetida: true, msg: 'Visita já registrada.' };
      var pr = ['Urgente', 'Alta', 'Normal', 'Baixa'].indexOf(x.prioridade) >= 0 ? x.prioridade : 'Normal', id = 'VT-' + ('000' + (D.visitas.length + 1)).slice(-4);
      D.visitas.push({ id: id, contrato: x.contrato || '', cliente: x.cliente, data: x.data, prioridade: pr, status: 'Agendada', inicio: '', fim: '', km: '', horas: '', os: x.os || '', hora: x.hora || '', obs: x.obs || '', idOperacao: x.idOperacao || '' });
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
    // ---- v0.7.1: API @43 (Lixeira.gs): listarClientesResumo, registrarConsentimento, definirStatusLead, Lixeira ----
    D.lixeira = D.lixeira || [];
    var vivo = function (x) { return !x._excluido; };
    var semExcluidos = function (c) { ['clientes', 'os', 'maquinas', 'contratos'].forEach(function (k) { if (Array.isArray(c[k])) c[k] = c[k].filter(vivo); }); if (Array.isArray(c.leadsLink)) c.leadsLink = c.leadsLink.filter(function (l) { return !/^exclu/i.test(String(l.status || '')); }); return c; };
    var getDados0 = S.getDados; S.getDados = function () { return semExcluidos(getDados0()); };
    var leads0 = S.leadsLink; S.leadsLink = function () { return leads0().filter(function (l) { return !/^exclu/i.test(String(l.status || '')); }).map(function (l) { l.situacao = sitLead(l.status); return l; }); };
    var sitLead = function (st) { var s = String(st || '').trim(); return !s || /^novo/i.test(s) ? 'Novo' : /^convert/i.test(s) ? 'Convertido' : /^contatad/i.test(s) ? 'Contatado' : /^sem interesse/i.test(s) ? 'Sem interesse' : /^exclu/i.test(s) ? 'Excluído' : s; };
    S.listarClientesResumo = function () {
      var R = Dif.resumoClientes({ hoje: h(), clientes: D.clientes.filter(vivo), os: D.os.filter(vivo), config: D.config, interacoes: D.interacoes });
      return { ok: true, hoje: h(), clientes: D.clientes.filter(vivo).map(function (c) { var s = R[c.nome] || {}, u, l = D.os.filter(function (o) { return vivo(o) && o.cliente === c.nome; }).sort(function (a, b) { return a.entrada < b.entrada ? -1 : 1; }); u = l[l.length - 1];
        return { id: c.id || '', nome: c.nome, telefone: c.whatsapp || '', documento: c.doc || '', tipo: c.tipoCli || '', situacao: s.situacao || '', ultimaOS: u ? { num: u.num, status: u.status, data: u.entrada } : null,
          totalGasto: s.totalGasto || 0, ultimoAtendimento: s.ultimaOS || '', diasDesde: s.diasSemRetorno == null ? null : s.diasSemRetorno, aniversario: c.aniversario || '', consentimento: c.consent || '', dataConsentimento: c.dataConsent || '',
          naoContatar: Dif.naoContatar(c), garantiaAte: s.garantiaAte || '', preventiva: s.preventivaEm || '', origem: c.origem || '', indicadoPor: c.indicadoPor || '', indicacoes: 0, _row: c._row }; }) };
    };
    S.registrarConsentimento = function (x) {
      x = x || {}; var a = x.aceita, sim = a === true || /^(sim|s|true|1)$/i.test(String(a)), nao = a === false || /^(n[ãa]o|n|false|0)$/i.test(String(a));
      if (!sim && !nao) throw new Error('Informe aceita: true (Sim) ou false (Não).');
      var c = cliNome(String(x.cliente || x.nome || '')); c.consent = sim ? 'Sim' : 'Não'; c.dataConsent = h();
      evento(c.nome, '', 'Consentimento LGPD', (sim ? 'Aceitou (Sim)' : 'Não aceitou (Não)') + ' em ' + Dif.dataBR(h()) + ' · por app');
      return { ok: true, consentimento: c.consent, data: h(), msg: 'Consentimento registrado: ' + c.consent + '.' };
    };
    var regMsg0 = S.registrarMensagemAberta;
    S.registrarMensagemAberta = function (x) {
      x = x || {}; if (x.lead == null) return regMsg0(x);
      var l = (D.leadsLink || []).filter(function (k) { return k._row === Number(x.lead); })[0]; if (!l) throw new Error('Lead não encontrado.');
      var st = sitLead(l.status); if (st === 'Novo' || st === 'Contatado') { l.status = 'Contatado'; l.statusEm = agora(); }
      evento(l.nome, '', 'Lead do site contatado', (x.canal || 'WhatsApp') + ' aberto pelo Pedro');
      return { ok: true, _row: l._row, status: sitLead(l.status), msg: 'Lead marcado como ' + sitLead(l.status) + '.' };
    };
    var proxLx = function () { return 'LX-' + ('000' + (D.lixeira.length + 1)).slice(-4); };
    var guardarLx = function (tipo, chave, desc, alvo, grupo, modo) { var id = proxLx(); D.lixeira.push({ id: id, tipo: tipo, chave: chave, descricao: desc, excluidoEm: agora(), por: 'app', modo: modo || 'Marcado e oculto', situacao: 'Na lixeira', grupo: grupo || '', _alvo: alvo }); return id; };
    var acharLx = function (x) {
      var t = String(x.tipo || ''), row = Number(x._row) || 0, id = x.id == null ? '' : String(x.id), r;
      if (t === 'lead') { r = (D.leadsLink || []).filter(function (l) { return l._row === row && !/^exclu/i.test(String(l.status || '')); })[0]; if (!r) throw new Error('Lead não encontrado (pode já estar na Lixeira).'); return { tipo: t, reg: r, chave: r.telefone, desc: r.nome + ' · ' + r.telefone }; }
      var lst = { cliente: 'clientes', os: 'os', maquina: 'maquinas', contrato: 'contratos' }[t], campo = { cliente: 'id', os: 'num', maquina: 'id', contrato: 'id' }[t];
      if (!lst) throw new Error('Tipo inválido. Use: lead, cliente, os, oportunidade, maquina, contrato, contratoRecorrente.');
      r = D[lst].filter(function (o) { return vivo(o) && ((id && String(o[campo]) === id) || (!id && row && o._row === row) || (t === 'cliente' && x.nome && o.nome === x.nome)); })[0];
      if (!r) throw new Error('Registro não encontrado (pode já estar na Lixeira). Atualize a tela.');
      return { tipo: t, reg: r, chave: String(r[campo] || ''), desc: t === 'os' ? r.num + ' – ' + r.cliente + ' – ' + (r.equipamento || '') : t === 'cliente' ? r.nome : r[campo] + ' – ' + (r.cliente || '') };
    };
    S.excluirRegistro = function (x) {
      x = x || {}; var a = acharLx(x);
      if (a.tipo === 'lead') { a.reg._statusAntes = a.reg.status; a.reg.status = 'Excluído'; var idl = guardarLx('lead', a.chave, a.desc, a.reg); return { ok: true, ids: [idl], msg: 'Lead “' + a.desc + '” foi para a Lixeira (Mais › Lixeira para restaurar).' }; }
      if (a.tipo === 'cliente') {
        var nome = a.reg.nome, imp = { os: D.os.filter(function (o) { return vivo(o) && o.cliente === nome; }).map(function (o) { return { id: o.num, _row: o._row, descricao: o.num + ' – ' + (o.equipamento || '') + ' – ' + (o.status || '') }; }),
          maquinas: D.maquinas.filter(function (m) { return vivo(m) && m.cliente === nome; }).map(function (m) { return { id: m.id, descricao: m.id + ' – ' + m.modelo }; }),
          contratos: D.contratos.filter(function (k) { return vivo(k) && k.cliente === nome; }).map(function (k) { return { id: k.id, descricao: k.id + ' – ' + k.plano }; }), contratosRecorrentes: [] };
        imp.total = imp.os.length + imp.maquinas.length + imp.contratos.length;
        if (imp.total && !x.cascata) return { ok: false, precisaConfirmar: true, impacto: imp, nome: nome, msg: nome + ' tem ' + [imp.os.length + ' OS', imp.maquinas.length + ' máquina(s)', imp.contratos.length + ' contrato(s)'].join(', ') + '. Para excluir, confirme excluir também esses registros (vão juntos para a Lixeira) ou cancele.' };
        var grupo = proxLx(), ids = [];
        ids.push(guardarLx('cliente', a.chave, a.desc, a.reg, grupo)); a.reg._excluido = true;
        imp.os.forEach(function (k) { var o = D.os.filter(function (y) { return y.num === k.id; })[0]; ids.push(guardarLx('os', o.num, k.descricao, o, grupo)); o._excluido = true; });
        imp.maquinas.forEach(function (k) { var m = D.maquinas.filter(function (y) { return y.id === k.id; })[0]; ids.push(guardarLx('maquina', m.id, k.descricao, m, grupo)); m._excluido = true; });
        imp.contratos.forEach(function (k) { var m = D.contratos.filter(function (y) { return y.id === k.id; })[0]; ids.push(guardarLx('contrato', m.id, k.descricao, m, grupo)); m._excluido = true; });
        if (ids.length > 1) D.lixeira.forEach(function (it) { if (ids.indexOf(it.id) >= 0) it.grupo = ids[0]; }); else D.lixeira[D.lixeira.length - 1].grupo = '';
        return { ok: true, ids: ids, msg: nome + (ids.length > 1 ? ' e ' + (ids.length - 1) + ' registro(s) ligado(s)' : '') + ' foram para a Lixeira (Mais › Lixeira para restaurar).' };
      }
      var idx = guardarLx(a.tipo, a.chave, a.desc, a.reg); a.reg._excluido = true;
      return { ok: true, ids: [idx], msg: ({ os: 'OS', maquina: 'Máquina', contrato: 'Contrato mensal' }[a.tipo]) + ' “' + a.desc + '” foi para a Lixeira (Mais › Lixeira para restaurar).' };
    };
    S.listarLixeira = function (x) { var todas = !!(x && x.todas); return { ok: true, itens: D.lixeira.filter(function (r) { return todas || r.situacao === 'Na lixeira'; }).map(function (r) { var c = Object.assign({}, r); delete c._alvo; return c; }).reverse() }; };
    var grupoLx = function (id) { var it = D.lixeira.filter(function (r) { return r.id === id; })[0]; if (!it) throw new Error('Item da Lixeira não encontrado.'); if (it.situacao !== 'Na lixeira') throw new Error('Esse item não está mais na Lixeira (' + it.situacao + ').'); return it.grupo ? D.lixeira.filter(function (r) { return r.grupo === it.grupo && r.situacao === 'Na lixeira'; }) : [it]; };
    S.restaurarRegistro = function (x) {
      var l = grupoLx(x && x.id); l.forEach(function (it) { if (it.tipo === 'lead') { it._alvo.status = it._alvo._statusAntes || 'Novo'; delete it._alvo._statusAntes; } else delete it._alvo._excluido; it.situacao = 'Restaurado'; it.restauradoEm = agora(); });
      return { ok: true, ids: l.map(function (i) { return i.id; }), msg: l.length > 1 ? l.length + ' registros restaurados.' : 'Registro restaurado.' };
    };
    S.apagarDefinitivo = function (x) {
      x = x || {}; if (String(x.confirmar || '') !== 'APAGAR') throw new Error('Para apagar definitivamente, confirme com confirmar:"APAGAR" (não dá para desfazer).');
      var l = grupoLx(x.id); l.forEach(function (it) { var a = it._alvo; Object.keys(a).forEach(function (k) { if (['_row', 'id', 'num', '_excluido', 'status'].indexOf(k) < 0) a[k] = ''; }); a._apagado = true; it.descricao = '(apagado)'; it.situacao = 'Apagado'; });
      return { ok: true, ids: l.map(function (i) { return i.id; }), msg: 'Apagado definitivamente (' + l.map(function (i) { return i.id; }).join(', ') + ').' };
    };
    S.definirStatusLead = function (x) {
      x = x || {}; var st = String(x.status || '');
      if (st === 'Excluir' || st === 'Excluído') return S.excluirRegistro({ tipo: 'lead', _row: x._row });
      if (['Novo', 'Contatado', 'Sem interesse', 'Convertido'].indexOf(st) < 0) throw new Error('Status inválido. Use: Novo, Contatado, Sem interesse, Convertido ou Excluir.');
      var l = (D.leadsLink || []).filter(function (k) { return k._row === Number(x._row) && !/^exclu/i.test(String(k.status || '')); })[0]; if (!l) throw new Error('Lead não encontrado.');
      if (sitLead(l.status) === 'Convertido') throw new Error('Esse lead já foi convertido em cliente.');
      if (st === 'Convertido') {
        var ex = D.clientes.filter(function (c) { return vivo(c) && c.nome === l.nome; })[0];
        if (!ex) { var n = { id: proxId('clientes', 'id', 'C'), nome: l.nome, whatsapp: l.telefone, origem: 'Link de cadastro', consent: l.consentimento === true ? 'Sim' : '', dataConsent: l.consentimento === true ? h() : '', primeiro: h(), etapa: 'Lead' }; anexar('clientes', n); }
        l.status = 'Convertido'; l.statusEm = agora(); evento(l.nome, '', 'Lead do site convertido', 'Virou cliente pelo app');
        return { ok: true, status: 'Convertido', msg: 'Lead convertido em cliente.' };
      }
      l.status = st; l.statusEm = agora(); evento(l.nome, '', 'Lead do site: ' + st, 'Status mudado à mão');
      return { ok: true, status: st, msg: 'Lead marcado como ' + st + '.' };
    };
    // ---------- v0.8.6/0.8.7: espelho de crm-v3/ListaMestra.gs (rotas do App @113/@115). Mesmas mensagens de erro. Dados fictícios. ----------
    var M9 = D.m9 = D.m9 || { fornecedores: [], cotacoes: [] }; D.estoque = D.estoque || [];
    var COT_ST = ['Cotado', 'Escolhido', 'Comprado', 'Descartado'], CAT_SAIDA = ['Compra de peça', 'Deslocamento', 'Ferramentas', 'DAS-MEI', 'Marketing', 'Outros'];
    var n2 = function (v) { var x = Number(String(v == null ? '' : v).replace(/\./g, function (m, i, t) { return t.indexOf(',') >= 0 ? '' : m; }).replace(',', '.')); return isFinite(x) ? x : 0; };
    var r2 = function (v) { return Math.round(n2(v) * 100) / 100; };
    var normT = function (t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
    var fornAtivo = function (id) { id = String(id || '').trim(); var f = M9.fornecedores.filter(function (x) { return x.id === id; })[0];
      if (!f) throw new Error('Fornecedor "' + id + '" não está na lista de fornecedores.'); if (!f.ativo) throw new Error('Fornecedor ' + f.nome + ' (' + f.id + ') está desativado.'); return f; };
    var cotApp = function (c) { var total = r2(c.precoUnit * c.qtd + c.frete);
      return { id: c.id, data: c.data, os: c.os, componente: c.componente, fornecedor: c.fornecedor, fornecedorId: c.fornecedorId, marcaModelo: c.marcaModelo, condicao: c.condicao, qtd: c.qtd, precoUnit: c.precoUnit, frete: c.frete,
        custoFinal: r2(c.precoUnit + c.frete), custoPosto: r2((c.precoUnit * c.qtd + c.frete) / c.qtd), total: total, prazoDias: c.prazoDias, formaPagamento: c.formaPagamento, validade: c.validade, vencida: !!(c.validade && c.validade < h()),
        fonte: c.fonte, status: c.status, escolhida: c.status === 'Escolhido' || (c.status === 'Comprado' && c.escolhida), garantiaFornecedor: c.garantiaFornecedor, insumo: !!c.insumo, obs: c.obs }; };
    S.listarFornecedores = function () { return M9.fornecedores.map(function (f) { return { id: f.id, nome: f.nome, ativo: !!f.ativo }; }); };
    S.listarCotacoes = function (a) { var os = String((a && a.os) || '').trim(); return M9.cotacoes.filter(function (c) { return !os || c.os === os; }).map(cotApp); };
    S.salvarCotacao = function (c) {
      c = c || {}; var comp = String(c.componente || c.peca || '').trim(); if (!comp) throw new Error('Informe a peça/componente.');
      var fonte = String(c.fonte || '').trim(); if (!fonte) throw new Error('Informe a Fonte da cotação (link, WhatsApp do fornecedor, loja…).');
      var ins = c.insumo === true || /^(s|sim|true)$/i.test(String(c.insumo || '')), os = String(c.os || '').trim();
      if (!os && !ins) throw new Error('Informe a OS (sem OS só para Insumo).');
      if (os && !D.os.some(function (o) { return String(o.num) === os && !o._excluido; })) throw new Error('OS "' + os + '" não encontrada.');
      var f = fornAtivo(c.fornecedorId), qtd = c.qtd === '' || c.qtd == null ? 1 : n2(c.qtd); if (!(qtd > 0) || qtd > 10000) throw new Error('Quantidade inválida.');
      var unit = n2(c.precoUnit), frete = c.frete === '' || c.frete == null ? 0 : n2(c.frete); if (!(unit > 0)) throw new Error('Informe o preço unitário.'); if (frete < 0) throw new Error('Frete inválido.');
      if (c.validade && !/^\d{4}-\d{2}-\d{2}$/.test(String(c.validade))) throw new Error('Validade inválida (use aaaa-mm-dd).');
      var reg = { os: os, componente: comp, fornecedor: f.nome, fornecedorId: f.id, precoUnit: r2(unit), frete: r2(frete), qtd: qtd, prazoDias: String(c.prazoDias == null ? '' : c.prazoDias), marcaModelo: String(c.marcaModelo || ''), condicao: String(c.condicao || ''),
        formaPagamento: String(c.formaPagamento || ''), fonte: fonte, garantiaFornecedor: String(c.garantiaFornecedor || ''), insumo: ins, obs: String(c.obs || '') };
      var alvo;
      if (c.id) { alvo = M9.cotacoes.filter(function (x) { return x.id === String(c.id); })[0]; if (!alvo) throw new Error('Cotação ' + c.id + ' não encontrada.');
        if (['Cotado', 'Escolhido'].indexOf(alvo.status) < 0) throw new Error('Cotação ' + alvo.id + ' está como ' + alvo.status + ': não dá para editar.');
        Object.assign(alvo, reg); if (c.validade) alvo.validade = c.validade; }
      else { alvo = Object.assign({ id: proxId('m9cot', 'id', 'CT-'), data: h(), status: 'Cotado', validade: c.validade || somaDias(h(), 3) }, reg); M9.cotacoes.push(alvo); }
      return { ok: true, msg: 'Cotação salva: ' + f.nome + ' ' + r2(alvo.precoUnit + alvo.frete) + '.', cotacao: cotApp(alvo) };
    };
    D.m9cot = M9.cotacoes; // proxId lê D[lista]
    S.mudarStatusCotacao = function (a) {
      a = a || {}; var id = String(a.id || '').trim(), st = String(a.status || '').trim();
      if (!id) throw new Error('Informe o id da cotação.'); if (COT_ST.indexOf(st) < 0) throw new Error('Status inválido. Use: ' + COT_ST.join(', ') + '.');
      var lc = a.lancarCaixa && typeof a.lancarCaixa === 'object' ? a.lancarCaixa : null;
      if (lc && st !== 'Comprado') throw new Error('Lançar no caixa só junto com o status Comprado.');
      if (lc && !String(lc.categoria || '').trim()) throw new Error('Informe a categoria da Saída (lancarCaixa.categoria).');
      var c = M9.cotacoes.filter(function (x) { return x.id === id; })[0]; if (!c) throw new Error('Cotação ' + id + ' não encontrada.');
      var app = cotApp(c), avisos = [];
      if (c.status === 'Comprado') throw new Error('Cotação ' + id + ' já está como Comprado: o status não muda mais (o caixa já pode ter sido lançado).');
      if (st === c.status && st !== 'Escolhido') return { ok: true, msg: 'Cotação ' + id + ' já está como ' + st + '.', cotacao: app, avisos: [] };
      if (st === 'Comprado') {
        if (app.vencida) throw new Error('Cotação vencida em ' + app.validade + ': confirme o preço com o fornecedor e salve de novo antes de comprar.');
        if (c.os && !D.financeiro.some(function (l) { return l.os === c.os && l.tipo === 'Entrada' && n2(l.receita) > 0; })) avisos.push('A OS ' + c.os + ' ainda não tem pagamento registrado no Financeiro.');
      }
      var fin = null;
      if (lc) { var cat = String(lc.categoria).trim(); if (D.categoriasFin.indexOf(cat) < 0 || CAT_SAIDA.indexOf(cat) < 0) throw new Error('Categoria inválida para Saída: "' + cat + '".');
        S.salvarLancamento({ data: h(), tipo: 'Saída', categoria: cat, os: c.os, descricao: 'Cotação ' + c.id + ' – ' + c.componente + (c.qtd !== 1 ? ' x' + c.qtd : '') + ' – ' + c.fornecedor, custo: app.total });
        fin = { row: D.financeiro[D.financeiro.length - 1]._row, valor: app.total, msg: 'Saída lançada no Financeiro: ' + cat + ' – R$ ' + app.total.toFixed(2).replace('.', ',') + '.' }; }
      c.status = st; c.escolhida = st === 'Escolhido' || st === 'Comprado';
      if (st === 'Escolhido' || st === 'Comprado') M9.cotacoes.forEach(function (o) { if (o !== c && normT(o.os) === normT(c.os) && normT(o.componente) === normT(c.componente) && o.status === 'Escolhido') { o.status = 'Cotado'; o.escolhida = false; } });
      return { ok: true, msg: 'Cotação ' + id + ': ' + st + '.' + (fin ? ' ' + fin.msg : '') + (avisos.length ? ' Atenção: ' + avisos.join(' ') : ''), cotacao: cotApp(c), avisos: avisos, financeiro: fin ? { row: fin.row, valor: fin.valor } : null };
    };
    var insForn = function (v) {
      v = String(v || '').trim(); if (!v) return { id: '', nome: '' };
      if (/^FN-\d+$/.test(v)) { var f = M9.fornecedores.filter(function (x) { return x.id === v; })[0]; return { id: v, nome: f ? f.nome : v }; }
      var g = M9.fornecedores.filter(function (x) { return normT(x.nome) === normT(v); })[0]; return { id: g ? g.id : '', nome: v };
    };
    var insApp = function (i) { var q = n2(i.qtd), mi = n2(i.minimo), fo = insForn(i.fornecedor); return { id: i.idInsumo || 'linha-' + i._row, item: i.item, categoria: i.categoria || '', qtd: q, minimo: mi, repor: mi > 0 && q <= mi, fornecedor: fo.nome, fornecedorId: fo.id, link: /^https?:\/\//i.test(i.link || '') ? i.link : '' }; };
    S.listarInsumos = function () { return D.estoque.filter(function (i) { return String(i.item || '').trim(); }).map(insApp); };
    S.salvarInsumo = function (x) {
      x = x || {}; var item = String(x.item || '').trim().slice(0, 120); if (!item) throw new Error('Informe o item.');
      var q = n2(x.qtd), mi = x.minimo === '' || x.minimo == null ? 0 : n2(x.minimo);
      if (String(x.qtd == null ? '' : x.qtd).trim() === '' || !(q >= 0)) throw new Error('Quantidade inválida.'); if (!(mi >= 0)) throw new Error('Estoque mínimo inválido.');
      var temFn = Object.prototype.hasOwnProperty.call(x, 'fornecedorId') && x.fornecedorId !== undefined, temNome = Object.prototype.hasOwnProperty.call(x, 'fornecedor') && x.fornecedor !== undefined;
      var mexeFn = temFn || temNome, fn = String((temFn ? x.fornecedorId : x.fornecedor) == null ? '' : (temFn ? x.fornecedorId : x.fornecedor)).trim(), fnNome = '';
      if (fn) {
        if (/^FN-\d+$/i.test(fn)) fnNome = fornAtivo(fn.toUpperCase()).nome;
        else { var porNome = M9.fornecedores.filter(function (f) { return normT(f.nome) === normT(fn); })[0]; fnNome = fornAtivo(porNome ? porNome.id : fn).nome; }
      }
      var id = String(x.id || '').trim(), alvo;
      if (id) { var m = id.match(/^linha-(\d+)$/); alvo = D.estoque.filter(function (i) { return m ? i._row === Number(m[1]) : i.idInsumo === id; })[0]; if (!alvo) throw new Error('Insumo ' + id + ' não encontrado.'); }
      else { var dup = D.estoque.filter(function (i) { return normT(i.item) === normT(item); })[0]; if (dup) throw new Error('Já existe o insumo "' + dup.item + '" (id ' + (dup.idInsumo || 'linha-' + dup._row) + '). Use o id para atualizar.'); }
      var dados = { item: item, qtd: q, minimo: mi }; if (mexeFn) dados.fornecedor = fnNome;
      if (alvo) Object.assign(alvo, dados); else { alvo = anexar('estoque', Object.assign({ categoria: '', link: '' }, dados)); }
      if (!alvo.idInsumo) alvo.idInsumo = proxId('estoque', 'idInsumo', 'IN-');
      return { ok: true, msg: 'Insumo ' + item + ' salvo (' + alvo.idInsumo + ').', insumo: insApp(alvo) };
    };
    // ---- v0.9.3: API @131 de velocidade (crm-v3 DiferenciaisC.gs), com dados FICTÍCIOS ----
    var hashTxt = function (t) { var x = 0x811c9dc5; t = String(t); for (var i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = (x + ((x << 1) + (x << 4) + (x << 7) + (x << 8) + (x << 24))) >>> 0; } return x.toString(36); };
    var carimboAbertura = function () { return 'v1|' + hashTxt(JSON.stringify(D)) + '|' + h(); };
    /** aberturaApp({desde, pacote2, semOportunidades}): cada parte no formato da chamada antiga; desde == carimbo atual -> semMudanca. */
    S.aberturaApp = function (x) {
      x = x || {}; var car = carimboAbertura();
      if (x.desde && String(x.desde) === car) return { ok: true, carimbo: car, semMudanca: true, completo: false, removidos: [] };
      var r = { ok: true, carimbo: car, semMudanca: false, completo: true, removidos: [], cache: false, partes: {} }, erros = null;
      var falhar = (opc.falharPartes || []);
      var parte = function (nome, fn) { try { if (falhar.indexOf(nome) >= 0) throw new Error('Parte indisponível (teste fictício).'); r[nome] = fn(); } catch (e) { r[nome] = null; (erros = erros || {})[nome] = String(e.message || e); } r.partes[nome] = 0; };
      parte('getDados', function () { return S.getDados(); });
      if (x.semOportunidades && r.getDados) { r.getDados.oportunidadesTotal = (r.getDados.oportunidades || []).length; delete r.getDados.oportunidades; }
      parte('agenda', function () { return r.getDados && r.getDados.agenda !== undefined ? r.getDados.agenda : S.listarAgenda(7); });
      parte('leadsLink', function () { return S.leadsLink(); });
      parte('clientesResumo', function () { return S.listarClientesResumo(); });
      parte('planosPublicos', function () { return S.planosPublicos(); });
      parte('listaContratos', function () { return S.listaContratos({ competencia: h().slice(0, 7) }); });
      parte('catalogoOS', function () { return S.catalogoOS(); });
      if (x.pacote2) { parte('fornecedores', function () { return S.listarFornecedores(); }); parte('cotacoes', function () { return S.listarCotacoes({}); }); parte('insumos', function () { return S.listarInsumos(); }); }
      if (erros) r.erros = erros;
      return r;
    };
    var fotosOps = {}, seqOps = 0;
    var linhaLeve = function (o) { return { id: o._row, nome: o.empresa || '', ramo: o.segmento || '', bairro: o.bairro || '', telefone: o.telefone || '', whatsapp: o.whatsapp || '', instagram: o.instagram || '', status: o.status || '', ultimaAlteracao: o.ultimaAlteracao || o.ultimoContato || '', _row: o._row }; };
    /** oportunidadesLeve({desde, offset, limit}): limit padrão 500, máx 2000; desde = só o que mudou (linhas + removidos). */
    S.oportunidadesLeve = function (x) {
      x = x || {}; var off = Math.max(0, Math.floor(Number(x.offset) || 0)), lim = Math.min(2000, Math.max(1, Math.floor(Number(x.limit) || 500)));
      var ops = (D.oportunidades || []).filter(function (o) { return String(o.empresa || '').trim(); }), foto = {};
      ops.forEach(function (o) { foto[o._row] = JSON.stringify(linhaLeve(o)); });
      var car = 'op1|' + (++seqOps); fotosOps[car] = foto;
      var antes = x.desde && fotosOps[x.desde];
      if (antes) {
        var linhas = ops.filter(function (o) { return antes[o._row] !== foto[o._row]; }).map(linhaLeve);
        var rem = Object.keys(antes).filter(function (k) { return !(k in foto); }).map(function (k) { return ['Oportunidades', Number(k)]; });
        return { ok: true, carimbo: car, completo: false, total: null, offset: 0, limit: lim, linhas: linhas, removidos: rem };
      }
      return { ok: true, carimbo: car, completo: true, total: ops.length, offset: off, limit: lim, linhas: ops.slice(off, off + lim).map(linhaLeve), removidos: [] };
    };
    return S;
  }
  return { dadosFicticios: dadosFicticios, criarServidor: criarServidor, somaDias: somaDias };
});
