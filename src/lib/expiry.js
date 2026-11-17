// Avisos de validade (3 dias / 1 dia / expirou) e ciclo de vida dos TESTES gratis (3 h / 1 h / expirou / limpeza).
const cfg = require('../config');
const db = require('./db');
const U = require('./utils');
const sessions = require('./sessions');

async function send(sock, phone, text) {
  if (!sock || !sock.user || !phone) return;
  try { await sock.sendMessage(U.jidOf(phone), { text }); } catch {}
}
const forget = (S) => { const t = db.data.trials[S.ownerPhone]; if (t) { delete db.data.trials[S.ownerPhone]; delete db.data.trials['by:' + t.by]; } };

async function trial(S, socks, main, now) {
  const T = cfg.teste || {};
  if (!S.trialStart) {                          // nunca ligou: limpa depois da janela de pareamento e devolve o direito ao teste
    if (now - S.createdAt > ((T.minutosParaParear || 30) + 1) * 60000) {
      await sessions.stop(S.id, { purge: true }); forget(S); delete db.data.sessions[S.id]; db.save();
    }
    return;
  }
  const left = S.until - now;
  if (left < -(T.diasAteApagar || 3) * 864e5) {  // expirou ha dias: liberta recursos (o numero continua sem direito a novo teste)
    await sessions.stop(S.id, { purge: true }); delete db.data.sessions[S.id]; db.save(); return;
  }
  const tag = left <= 0 ? 'exp' : left <= 36e5 ? 'h1' : left <= 3 * 36e5 ? 'h3' : null;
  if (!tag || S.warn === tag) return;
  S.warn = tag; db.save();
  const own = socks.get(S.id), main_ = main;
  if (tag === 'exp') {
    await send(own, S.ownerPhone, `⏰ O seu *teste grátis* terminou.\n💎 Gostou? Alugue o bot e continue vendendo: ${cfg.contato}\n📢 Canal: ${cfg.canal}`);
    await send(main_, cfg.owner.numero, `⌛ O teste de +${S.ownerPhone} terminou. Boa altura para oferecer o aluguel: wa.me/${S.ownerPhone}\nAtivar: .alugar ${S.ownerPhone} 30`);
  } else {
    await send(own, S.ownerPhone, `⏳ O seu *teste grátis* termina em ${tag === 'h1' ? 'menos de 1 hora' : 'cerca de 3 horas'}.\n💎 Para continuar sem interrupções: ${cfg.contato}`);
  }
}

async function check(socks) {
  const now = Date.now(), main = socks.get('main');
  for (const S of Object.values(db.data.sessions)) {
    if (!S.until || S.id === 'main') continue;
    if (S.trial) { await trial(S, socks, main, now); continue; }
    const d = U.left(S.until);
    const tag = S.until < now ? 'exp' : d <= 1 ? 'd1' : d <= 3 ? 'd3' : null;
    if (!tag) { if (S.warn) { S.warn = null; db.save(); } continue; }
    if (S.warn === tag) continue;
    S.warn = tag; db.save();
    const own = socks.get(S.id);
    const quando = tag === 'exp' ? 'terminou' : tag === 'd1' ? 'termina em menos de 1 dia' : `termina em ${d} dia(s)`;
    await send(own, S.ownerPhone, `${tag === 'exp' ? '⛔' : '⏳'} O aluguel do bot *${S.name}* ${quando}.\nPara renovar: ${cfg.contato}${tag === 'exp' ? '\n📢 Canal: ' + cfg.canal : ''}`);
    await send(main, cfg.owner.numero, `${tag === 'exp' ? '⛔' : '⏳'} Aluguel de *${S.name}* (+${S.ownerPhone || S.phone || S.id}) ${quando}.\nRenove com: .alugar ${S.ownerPhone || S.id} 30`);
  }
}
module.exports = { check };
