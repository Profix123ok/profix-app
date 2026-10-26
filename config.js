// Configuração do app ProFix.
// API_URL = URL do "App da Web" do crm-v3 (termina em /exec). A CHAVE nunca fica aqui: o Pedro digita no 1º acesso.
// Modo demonstração (dados fictícios): abra o app com ?demo=1 (ou deixe API_URL vazia).
window.PROFIX_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzcEhxoCV88_Kp-EjIYaSOhbpH1yrqDWs4iOB-Sn9L88aikPKzn2ZoNaB0M-yCepSQ/exec',
  // Ações que o doPost do crm-v3 já aceita. As outras aparecem no app com o aviso "ainda não liberado no servidor".
  // crm-v3 v13: as 24 ações do doPost (ROTAS_APP).
  ACOES_SERVIDOR: ['getDados', 'listarAgenda', 'leadsLink', 'salvarCliente', 'moverEtapa', 'registrarInteracao', 'salvarOportunidade', 'registrarContatoOp',
    'virarLead', 'registrarFollowup', 'mudarStatusTarefa', 'salvarOS', 'mudarStatusOS', 'salvarOrcamento', 'decidirOrcamento', 'lancarRecebimento',
    'salvarPeca', 'salvarLancamento', 'salvarRevenda', 'venderRevenda', 'salvarServicoCatalogo', 'salvarModelo', 'criarEventoAgenda',
    'removerEventoAgenda', 'enviarEmailCliente'],
  // PENDENTE de confirmação do Pedro: deixe null até ele confirmar (o e-mail sai com um aviso [CONFIRMAR …] e não envia).
  VALIDADE_ORCAMENTO_DIAS: null, // rascunho sugere 10
  GARANTIA_DIAS: null,           // rascunho sugere 90
  WHATSAPP_LOJA: '(15) 98112-8309',
  VERSAO_APP: '0.5.4'
};
