/* ProFix – Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central) – v0.9.2.
 * Tudo no aparelho, sem dependência nova e sem custo: monta o texto do Pix com chave, recebedor, cidade, valor e identificador (txid),
 * e calcula o CRC16-CCITT-FALSE (campo 63). Nada aqui envia ou grava nada.
 * Campos: 00 formato "01" · 26 conta (00 br.gov.bcb.pix, 01 chave) · 52 "0000" · 53 "986" (real) · 54 valor (2 casas) · 58 "BR" · 59 nome · 60 cidade · 62/05 txid · 63 CRC.
 */
(function (raiz, fabrica) {
  var m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m; else raiz.ProFixPix = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /** Padrão da ProFix (MEI). Usado só se o servidor não informar a chave (ver daConfigServidor). */
  var PADRAO = { chave: '64.628.598/0001-40', nome: 'ProFix Computadores', cidade: 'SOROCABA' };

  function semAcento(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function campo(id, valor) { var v = String(valor); return id + (v.length < 10 ? '0' : '') + v.length + v; }
  /** CRC16-CCITT-FALSE (polinômio 0x1021, início 0xFFFF), 4 dígitos hexadecimais em maiúsculas. */
  function crc16(txt) {
    var crc = 0xFFFF, s = String(txt);
    for (var i = 0; i < s.length; i++) {
      crc ^= (s.charCodeAt(i) & 0xFF) << 8;
      for (var b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return ('000' + crc.toString(16).toUpperCase()).slice(-4);
  }
  /** Tipo da chave: cnpj | cpf | email | telefone | aleatoria. */
  function tipoChave(chave) {
    var s = String(chave == null ? '' : chave).trim(), d = s.replace(/\D/g, '');
    if (!s) return '';
    if (/^[\d.\-\/\s]+$/.test(s) && d.length === 14) return 'cnpj';
    if (/^[\d.\-\s]+$/.test(s) && d.length === 11) return 'cpf';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'email';
    if (/^\+?[\d\s()\-]+$/.test(s) && d.length >= 12 && d.length <= 13) return 'telefone';
    return 'aleatoria';
  }
  /** Valor da chave como vai no código (CNPJ/CPF só dígitos; e-mail minúsculo; telefone +55…). */
  function chaveEMV(chave) {
    var t = tipoChave(chave), s = String(chave == null ? '' : chave).trim();
    if (t === 'cnpj' || t === 'cpf') return s.replace(/\D/g, '');
    if (t === 'email') return s.toLowerCase();
    if (t === 'telefone') return '+' + s.replace(/\D/g, '');
    return s;
  }
  /** Chave para mostrar ao cliente (CNPJ com pontuação). */
  function formatarChave(chave) {
    var t = tipoChave(chave), d = String(chave || '').replace(/\D/g, '');
    if (t === 'cnpj') return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (t === 'cpf') return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return String(chave || '').trim();
  }
  function rotuloTipo(chave) { return { cnpj: 'CNPJ', cpf: 'CPF', email: 'e-mail', telefone: 'telefone', aleatoria: 'chave aleatória' }[tipoChave(chave)] || ''; }
  /** Identificador (txid): número da OS só com letras e números (máx. 25); sem número = "***". */
  function txid(num) { var s = semAcento(num).replace(/[^A-Za-z0-9]/g, '').slice(0, 25); return s || '***'; }
  function nomeEMV(n) { return semAcento(n).replace(/[^A-Za-z0-9 .,&\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 25); }
  function cidadeEMV(c) { return semAcento(c).replace(/[^A-Za-z0-9 .\-]/g, '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 15); }
  function valorEMV(v) { var n = Math.round((Number(v) || 0) * 100) / 100; return n > 0 ? n.toFixed(2) : ''; }

  /** Configuração pronta (com padrões). Devolve { chave, nome, cidade, fonte }. */
  function normalizarConfig(c, fonte) {
    c = c || {};
    var chave = String(c.chave == null || c.chave === '' ? PADRAO.chave : c.chave).trim();
    var nome = String(c.nome == null || c.nome === '' ? PADRAO.nome : c.nome).trim();
    var cidade = String(c.cidade == null || c.cidade === '' ? PADRAO.cidade : c.cidade).trim();
    var rt = { cnpj: 'CNPJ', cpf: 'CPF', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' }[tipoChave(chave)] || '';
    var chaveTexto = String(c.chaveTexto || '').trim() || ((rt ? rt + ' ' : '') + formatarChave(chave));
    var pct = c.pct != null && c.pct !== '' && isFinite(Number(c.pct)) ? Number(c.pct) : null;
    return { chave: chave, nome: nome, cidade: cidade, chaveTexto: chaveTexto, pct: pct, fonte: fonte || 'aparelho' };
  }
  /**
   * Chave Pix vinda da configuração do SERVIDOR (painel do CRM, editável pelo Pedro) – crm-v3 API @127:
   *   getDados.config.pix (e planosPublicos.pix, que o api.js copia para config.pix se faltar) =
   *   { chave: '64628598000140', tipo: 'CNPJ', chaveTexto: 'CNPJ 64.628.598/0001-40', recebedor: 'PROFIX COMPUTADORES', cidade: 'SOROCABA', pct: 5 }
   * Sem config.pix (servidor antigo/sem internet sem cópia): null -> o App usa Mais › Ajustes (só reserva) ou o padrão.
   */
  function daConfigServidor(cfg) {
    var p = cfg && cfg.pix; if (!p || typeof p !== 'object' || !String(p.chave || '').trim()) return null;
    return normalizarConfig({ chave: String(p.chave), nome: p.recebedor || p.nome, cidade: p.cidade, chaveTexto: p.chaveTexto, pct: p.pct }, 'servidor');
  }
  /** Servidor primeiro; local (Ajustes do aparelho) só como reserva; por fim o padrão da ProFix. */
  function escolherConfig(cfgServidor, local) { return daConfigServidor(cfgServidor) || normalizarConfig(local, local && (local.chave || local.nome || local.cidade) ? 'aparelho' : 'padrão'); }

  /** Monta o "copia e cola". p = { chave, nome, cidade, valor, txid }. */
  function montar(p) {
    p = p || {};
    var chave = chaveEMV(p.chave); if (!chave) throw new Error('Informe a chave Pix.');
    if (chave.length > 77) throw new Error('Chave Pix longa demais.');
    var nome = nomeEMV(p.nome), cidade = cidadeEMV(p.cidade); if (!nome) throw new Error('Informe o nome do recebedor.'); if (!cidade) throw new Error('Informe a cidade.');
    var v = valorEMV(p.valor), tx = p.txid ? txid(p.txid) : '***';
    var s = campo('00', '01') + campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', chave)) + campo('52', '0000') + campo('53', '986') +
      (v ? campo('54', v) : '') + campo('58', 'BR') + campo('59', nome) + campo('60', cidade) + campo('62', campo('05', tx)) + '6304';
    return s + crc16(s);
  }
  /** Confere um código: CRC certo e campos básicos. */
  function valido(codigo) { var s = String(codigo || ''); return /^000201/.test(s) && /6304[0-9A-F]{4}$/.test(s) && crc16(s.slice(0, -4)) === s.slice(-4) && s.indexOf('br.gov.bcb.pix') > 0; }
  function brl(n) { var p = (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).split('.'); return 'R$ ' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1]; }
  /**
   * Bloco "Pagamento via Pix" para a mensagem do cliente. Nunca leva custo. cfg = escolherConfig(...); valor 0/vazio = sem valor no código.
   * Devolve { texto, codigo }.
   */
  function bloco(cfg, valor, num) {
    cfg = cfg || normalizarConfig({});
    var codigo = montar({ chave: cfg.chave, nome: cfg.nome, cidade: cfg.cidade, valor: valor, txid: num });
    var t = '*Pagamento via Pix*\nChave Pix: ' + (cfg.chaveTexto || formatarChave(cfg.chave)) + '\nRecebedor: ' + cfg.nome +
      (Number(valor) > 0 ? '\nValor: ' + brl(valor) : '') + '\nPix copia e cola (copie o código abaixo e cole no app do banco, em Pix › Copia e cola):\n' + codigo;
    return { texto: t, codigo: codigo };
  }
  return { PADRAO: PADRAO, crc16: crc16, tipoChave: tipoChave, chaveEMV: chaveEMV, formatarChave: formatarChave, rotuloTipo: rotuloTipo, txid: txid,
    normalizarConfig: normalizarConfig, daConfigServidor: daConfigServidor, escolherConfig: escolherConfig, montar: montar, valido: valido, bloco: bloco };
});
