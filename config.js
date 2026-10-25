// Configuração do app ProFix.
// API_URL = URL do "App da Web" do crm-v3 (termina em /exec). A CHAVE nunca fica aqui: o Pedro digita no 1º acesso.
// Modo demonstração (dados fictícios): abra o app com ?demo=1 (ou deixe API_URL vazia).
window.PROFIX_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzcEhxoCV88_Kp-EjIYaSOhbpH1yrqDWs4iOB-Sn9L88aikPKzn2ZoNaB0M-yCepSQ/exec',
  // Ações que o doPost do crm-v3 já aceita. As outras aparecem no app com o aviso "ainda não liberado no servidor".
  ACOES_SERVIDOR: ['getDados', 'listarAgenda', 'salvarOportunidade', 'virarLead', 'registrarFollowup', 'mudarStatusTarefa',
    'salvarCliente', 'mudarStatusOS', 'registrarContatoOp',
    'criarEventoAgenda', 'removerEventoAgenda'], // Agenda: no ar desde a v11. enviarEmailCliente AINDA NÃO (botão de e-mail fica escondido).
  // Gmail (enviarEmailCliente) é PROPOSTA: quando o crm-v3 publicar, acrescente em ACOES_SERVIDOR.
  // PENDENTE de confirmação do Pedro: deixe null até ele confirmar (o e-mail sai com um aviso [CONFIRMAR …] e não envia).
  VALIDADE_ORCAMENTO_DIAS: null, // rascunho sugere 10
  GARANTIA_DIAS: null,           // rascunho sugere 90
  WHATSAPP_LOJA: '(15) 98112-8309',
  VERSAO_APP: '0.3.0'
};
