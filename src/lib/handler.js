const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const db = require('./db');
const U = require('./utils');

const commands = new Map(), list = [], hooks = [], partHooks = [], ticks = [];
const dir = path.join(__dirname, '..', 'commands');
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.js')) continue;
  const mod = require(path.join(dir, f));
  for (const c of mod.commands || []) {
    c.file = f; list.push(c);
    for (const n of c.names) commands.set(U.norm(n), c);
  }
  if (mod.onMessage) hooks.push({ fn: mod.onMessage, p: mod.priority || 50 });
  if (mod.onParticipants) partHooks.push(mod.onParticipants);
  if (mod.tick) ticks.push(mod.tick);
}
hooks.sort((a, b) => a.p - b.p);

const human = require('./human');
const anuncios = require('./anuncios');

// emoji da reacao: por comando, senao por area
const EMO = { menu: '📜', ping: '⚡', dono: '👑', criador: '👑', ban: '🔨', kick: '🔨', tabela: '📦', compra: '🛍️', pagamento: '💳',
  enviar: '🚀', rejeitar: '❌', anular: '🗑️', top: '🏆', ranking: '🏆', todos: '📢', conectar: '🔑', qrcode: '📷', sobre: '🩸',
  canal: '📢', sasuke: '🩸', itachi: '🩸', madara: '🩸', sharingan: '👁️', jutsu: '🌀', dado: '🎲', moeda: '🪙', '8ball': '🎱' };
const FILE_EMO = { 'admin.js': '🛡️', 'auto.js': '🤖', 'compras.js': '🛒', 'donos.js': '👑', 'gestao.js': '🎯', 'info.js': '📚',
  'protecao.js': '🔒', 'protecao2.js': '🔒', 'stats.js': '📊', 'vendas.js': '💰', 'textos.js': '📝', 'nano.js': '🧩',
  'permissoes.js': '🔑', 'mensagens.js': '💬', 'anime.js': '🎌', 'diversao.js': '🎮', 'teste.js': '🎁' };
const noticeAt = new Map();

// permissoes Sasuke: .liberar / .liberartodos / .modolivre deixam membros usarem comandos de admin
function permAllows(g, cmd, senderNum) {
  if (!g || cmd.liberavel === false) return false;
  const n = cmd.names[0];
  return !!(g.perm.modolivre || g.perm.todos.includes(n) || (g.perm.liberados[n] || []).includes(senderNum));
}

async function handle(sock, sid, m, type) {
  if (type && type !== 'notify') return;
  const jid = m.key.remoteJid || '';
  if (!m.message || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;
  const S = db.session(sid);
  if (!S) return;

  const text = U.getText(m).trim();
  const fromMe = !!m.key.fromMe;
  if (fromMe && !text.startsWith(cfg.prefix)) return;

  const isGroup = jid.endsWith('@g.us');
  const ids = fromMe ? [U.jidOf(U.num(sock.user?.id || ''))] : U.senderIds(m);
  const sender = fromMe ? ids[0] : (isGroup ? U.senderOf(m) : (U.senderOf(m) || jid));
  // PLATAFORMA (alugar, conectar, qrcode...): somente o dono (config.owners), so na sessao principal
  const master = sid === 'main' && U.anyMaster(ids);
  const owner = fromMe || U.anyMaster(ids) || (!!S.ownerPhone && ids.some(i => U.num(i) === S.ownerPhone));
  const expired = S.until > 0 && S.until < Date.now();
  const g = isGroup ? db.group(sid, jid) : null;

  sock._mc = sock._mc || new Map();
  const c = { sock: human.wrap(sock), raw: sock, sid, S, m, jid, sender, senderIds: ids, text, g, isGroup, owner, master, fromMe, args: [], targets: [] };
  c.reply = (t, extra = {}) => c.sock.sendMessage(jid, { text: t, ...extra }, { quoted: m });
  c.isAdmin = async () => owner || (isGroup && await U.isAdminJid(sock, jid, ids, g));
  const react = (e) => sock.sendMessage(jid, { react: { text: e, key: m.key } }).catch(() => {});
  const marca = () => (sid === 'main' ? cfg.marca : U.smallCaps(S.name));

  // grupo banido (.bangp): o bot sai assim que for adicionado de novo
  if (isGroup && !fromMe && (S.bannedGroups || []).includes(jid)) { await sock.groupLeave(jid).catch(() => {}); return; }

  // ALUGUEL EXPIRADO: o bot "congela" (nem o dono do bot usa); so o criador da plataforma passa.
  // Unicos comandos livres: .alugueis .dono .criador .canal
  if (expired && !U.anyMaster(ids)) {
    const first = text.startsWith(cfg.prefix) ? U.norm(text.slice(cfg.prefix.length).trim().split(/\s+/)[0]) : '';
    if (!['alugueis', 'dono', 'criador', 'canal'].includes(first)) {
      const k = sid + jid;
      if (first && Date.now() - (noticeAt.get(k) || 0) > 10 * 60 * 1000) {   // no maximo 1x a cada 10 min por chat
        noticeAt.set(k, Date.now());
        await c.reply(S.trial
          ? `⏰ O *teste grátis* de ${S.name} terminou.\n💎 Para continuar, alugue o bot: ${cfg.contato}\n📢 Canal: ${cfg.canal}`
          : `⛔ O aluguel do bot *${S.name}* terminou.\nPara renovar fale com o dono da plataforma: ${cfg.contato}\n📢 Canal: ${cfg.canal}`);
      }
      return;
    }
  }

  if (isGroup && !fromMe && !expired) {
    const u = U.num(sender);
    const a = g.activity[u] || (g.activity[u] = { count: 0, last: 0 });
    a.count++; a.last = Date.now();
    if (!g.joined[u]) g.joined[u] = Date.now();
    db.save();
    if (g.on.bot === false && !U.norm(text).startsWith(cfg.prefix + 'bot')) return;
    for (const h of hooks) {
      try { if (await h.fn(c)) return; } catch (e) { console.error('[hook]', e.message); }
    }
  }

  if (!text.startsWith(cfg.prefix)) return;
  const parts = text.slice(cfg.prefix.length).trim().split(/\s+/);
  const name = U.norm(parts.shift() || '');
  if (!name || !/^[\p{L}\p{N}_-]+$/u.test(name)) return;
  const cmd = commands.get(name);
  c.args = parts; c.name = name; c.targets = U.getTargets(m, parts);

  // comandos .nano criados pelo grupo (sistema nano)
  if (!cmd) {
    if (g && g.nano.on !== false && g.nano.comandos[name]) {
      c.sock = human.wrap(sock, { watermark: marca() });
      await react('🧩');
      await c.reply(g.nano.comandos[name]);
    }
    return;
  }

  // comandos da plataforma: ninguem alem do dono pode usar (nem recebe resposta)
  if (cmd.scope === 'master' && !master) return;

  // a partir daqui toda resposta de comando leva a marca d'agua
  c.sock = human.wrap(sock, { watermark: marca(), classe: cmd.scope === 'all' ? undefined : 'administrativo' });
  const deny = async (msg) => { await react('🚫'); await c.reply(msg); };

  if (cmd.scope === 'owner' && !owner) return deny('🚫 Apenas o dono do bot pode usar este comando.');
  if (cmd.group && !isGroup) return c.reply('ℹ️ Use este comando dentro de um grupo.');
  if (isGroup && g.on.soadmin && cmd.scope === 'all' && !(await c.isAdmin())) return;
  if (cmd.scope === 'admin' && !(await c.isAdmin()) && !permAllows(g, cmd, U.num(sender)))
    return deny('🚫 Precisa ser administrador do grupo para usar este comando.');

  // comportamento humano: le (visto azul), pensa um instante e reage
  if (cfg.human.on) {
    if (sock.readMessages) await sock.readMessages([m.key]).catch(() => {});
    await human.sleep(human.rand(300, 900) * (cfg.human.escala || 1) / 1.5);
  }
  await react(EMO[name] || FILE_EMO[cmd.file] || '✅');
  try {
    await cmd.run(c);
    // anuncio profissional do canal a cada N comandos executados (so em bots de teste, por defeito)
    const nAd = anuncios.conta(S, sid, jid, name);
    if (nAd) await human.wrap(sock).sendMessage(jid, { text: anuncios.texto(S, nAd) }).catch(() => {});
  } catch (e) {
    console.error('[cmd]', name, e);
    await react('❌');
    await c.reply('❌ Erro ao executar o comando. Veja se o bot é admin do grupo.').catch(() => {});
  }
}

async function onParticipants(sock, sid, ev) {
  const S = db.session(sid);
  if (!S || (S.until && S.until < Date.now())) return;
  U.invalidate(sock, ev.id);
  const g = db.group(sid, ev.id);
  const listIds = (ev.participants || []).map(p => typeof p === 'string' ? p : (p.phoneNumber || p.id));
  for (const h of partHooks) {
    try { await h({ sock, sid, S, jid: ev.id, g, action: ev.action, list: listIds }); }
    catch (e) { console.error('[part]', e.message); }
  }
}

async function tick(socks) {
  const now = Date.now();
  for (const [sid, sock] of socks) {
    const S = db.session(sid);
    if (!S || !sock.user || (S.until && S.until < now)) continue;
    for (const [jid, g] of Object.entries(S.groups)) {
      for (const t of ticks) {
        try { await t({ sock, sid, S, jid, g, now }); } catch (e) { /* ignora */ }
      }
    }
  }
}

module.exports = { handle, onParticipants, tick, list, commands };
