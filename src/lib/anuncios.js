// Anuncio periodico do canal: a cada N comandos executados num chat (por defeito so em bots de TESTE gratis).
const cfg = require('../config');
const U = require('./utils');

const counters = new Map();                                   // sid|jid -> comandos executados
const SEM_CONTAR = new Set(['canal', 'channel', 'dono', 'criador', 'alugueis', 'teste', 'gratis', 'trial', 'free']);

const A = cfg.anuncio || {};
function deve(S, sid) {
  if (!A.ativo || !cfg.canal) return false;
  if (sid === 'main') return !!A.naSessaoPrincipal;
  return !!S.trial || !!A.paraAlugados;
}
function conta(S, sid, jid, nome) {
  if (!deve(S, sid) || SEM_CONTAR.has(nome)) return 0;
  const k = sid + '|' + jid, n = (counters.get(k) || 0) + 1;
  counters.set(k, n);
  return n % (A.cadaComandos || 7) === 0 ? n : 0;
}
const restante = (S) => { const ms = Math.max(0, S.until - Date.now()), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); return h ? `${h}h ${m}min` : `${m}min`; };

function texto(S, n) {
  const v = (Math.floor(n / (A.cadaComandos || 7)) - 1) % 3;
  const topo = (t) => `╭━━━〔 📣 PUBLICIDADE · ${t} 〕━━━╮\n┃ 🩸 ${S.name}\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  const corpo = [
    topo('CANAL OFICIAL') + '🚀 Novidades, atualizações e suporte em primeira mão.\n\n✅ Novos comandos e melhorias\n✅ Avisos importantes e promoções\n✅ Dicas para vender mais\n\n👉 *Segue o canal:*\n' + cfg.canal,
    topo('DICA PRO') + '💡 Organize o seu grupo de vendas como um profissional:\n\n▪️ .setmegas para montar a tabela\n▪️ .mpesa e .emola para os pagamentos\n▪️ .antilink e .antiburlador para se proteger\n\n📢 Mais dicas e tutoriais no canal oficial:\n' + cfg.canal,
    topo('NÃO PERCA') + '🔔 Fique à frente dos outros vendedores.\n\n⚡ Atualizações em primeira mão\n🛠️ Suporte direto da equipa\n🎁 Novidades exclusivas da comunidade\n\n👉 *Entre no canal oficial:*\n' + cfg.canal
  ][v];
  const rodape = S.trial
    ? `\n\n━━━━━━━━━━\n🎁 *Teste grátis* · restam ${restante(S)}\n💎 Alugue o bot e remova os anúncios: ${cfg.contato}`
    : '';
  return corpo + rodape;
}
module.exports = { deve, conta, texto, restante };
