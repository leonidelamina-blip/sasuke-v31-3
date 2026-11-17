const db = require('./db');
const U = require('./utils');

async function banUser(c, userJid) {
  const { sock, jid, g } = c;
  await sock.groupParticipantsUpdate(jid, [userJid], 'remove').catch(() => {});
  const n = U.num(userJid);
  if (!g.banned.includes(n)) g.banned.push(n);
  db.save();
}

// Aplica a punicao conforme o modo da protecao: normal | aviso (padrao) | ban
async function punish(c, type, why, opts = {}) {
  const { sock, jid, sender, g, m } = c;
  const u = U.num(sender);
  const mode = opts.mode || g.mode[type] || 'aviso';
  (g.logs[type] = g.logs[type] || []).push({ u, at: Date.now(), why });
  if (g.logs[type].length > 200) g.logs[type].shift();
  if (m && !opts.keep) await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
  if (mode === 'normal') { db.save(); return 'apagado'; }
  if (mode === 'ban') {
    await sock.sendMessage(jid, { text: `🔨 @${u} removido: ${why}`, mentions: [sender] });
    await banUser(c, sender); return 'banido';
  }
  g.strikes[type] = g.strikes[type] || {};
  const n = (g.strikes[type][u] = (g.strikes[type][u] || 0) + 1);
  const max = g.cfg[type + 'tent'] || g.maxavisos;
  if (n >= max && g.on.automover === false) {
    await sock.sendMessage(jid, { text: `⚠️ @${u} aviso ${n}/${max}: ${why}\n(limite atingido; automover desligado, ninguém é removido)`, mentions: [sender] });
    db.save(); return 'aviso';
  }
  if (n >= max) {
    g.strikes[type][u] = 0;
    await sock.sendMessage(jid, { text: `🔨 @${u} removido (${max}/${max} avisos): ${why}`, mentions: [sender] });
    await banUser(c, sender); return 'banido';
  }
  await sock.sendMessage(jid, { text: `⚠️ @${u} aviso ${n}/${max}: ${why}`, mentions: [sender] });
  db.save();
  return 'aviso';
}

module.exports = { punish, banUser };
