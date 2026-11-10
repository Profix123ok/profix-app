// Configuração do app ProFix.
// API_URL = URL do "App da Web" do crm-v3 (termina em /exec). A CHAVE nunca fica aqui: o Pedro digita no 1º acesso.
// Modo demonstração (dados fictícios): abra o app com ?demo=1 (ou deixe API_URL vazia).
window.PROFIX_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzcEhxoCV88_Kp-EjIYaSOhbpH1yrqDWs4iOB-Sn9L88aikPKzn2ZoNaB0M-yCepSQ/exec',
  // Ações que o doPost do crm-v3 já aceita. As outras aparecem no app com o aviso "ainda não liberado no servidor".
  // crm-v3 v13: as 24 ações do doPost (ROTAS_APP). API v32: + 5 leituras e 5 escritas da OS com vários equipamentos.
  ACOES_SERVIDOR: ['getDados', 'listarAgenda', 'leadsLink', 'resumoOrigens', 'planosPublicos', 'salvarCliente', 'moverEtapa', 'registrarInteracao', 'salvarOportunidade', 'registrarContatoOp',
    'virarLead', 'registrarFollowup', 'mudarStatusTarefa', 'salvarOS', 'mudarStatusOS', 'salvarOrcamento', 'decidirOrcamento', 'lancarRecebimento',
    'salvarPeca', 'salvarLancamento', 'salvarRevenda', 'venderRevenda', 'salvarServicoCatalogo', 'salvarModelo', 'criarEventoAgenda',
    'removerEventoAgenda', 'enviarEmailCliente',
    // crm-v3 API v32 (mesmo ID de implantação): OS com vários equipamentos.
    'lerOSMulti', 'catalogoOS', 'gerarOrcamentoOS', 'orcamentoOS', 'simularCondicaoOS',
    'salvarOSMulti', 'salvarCatalogoOS', 'aprovarOrcamentoOS', 'aplicarCondicaoEspecialOS', 'removerCondicaoEspecialOS',
    // crm-v3 API @41: diferenciais (ficha do cliente, checklist, laudo, garantia, contratos, visitas, painel do mês, link da OS).
    'fichaCliente', 'resumoMes', 'listaContratos', 'laudoTecnicoOS', 'extrasOS', 'textoMarketing',
    'registrarMensagemAberta', 'agendarRetorno', 'salvarMaquina', 'vincularMaquinaOS', 'salvarChecklistOS', 'linkClienteOS', 'textoStatusOS',
    'salvarContrato', 'salvarVisita', 'iniciarVisita', 'encerrarVisita',
    'listarClientesResumo', 'listarLixeira', 'registrarConsentimento', 'definirStatusLead', 'excluirRegistro', 'restaurarRegistro', 'apagarDefinitivo', // v0.7.1: API @43
    // crm-v3 API @113/@115 (10/11/2026): Módulo 9 (fornecedores só id/nome/ativo, cotações e insumos; @115: fornecedorId no insumo e limpar com ''). lmSalvarFornecedor/lmSalvarPC NÃO existem no App.
    'listarFornecedores', 'listarCotacoes', 'listarInsumos', 'salvarCotacao', 'mudarStatusCotacao', 'salvarInsumo'],
  // v0.7.1: validade do orçamento, garantia e desconto de indicação NÃO ficam aqui: vêm do servidor (getDados().config: validadePadraoDias, garantiaDiasProfix, descontoIndicacaoPct).
  WHATSAPP_LOJA: '(15) 98112-8309',
  // Horários de visita técnica (último início = fim − passo). Ajuste aqui se o expediente mudar.
  PASSO_VISITA_MIN: 30, // intervalo do seletor; horas cheias (19:00, 20:00…) vêm primeiro na lista
  HORARIOS_VISITA: {
    util: { inicio: '19:00', fim: '22:00' },
    fimDeSemana: { inicio: '09:00', fim: '17:00' }
  },
  PRECO_VISITA_EMPRESA: 179.90, // tabela oficial 02/11/2026 (visita técnica a empresa)
  VERSAO_APP: '0.8.7'
};
