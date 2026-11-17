const cfg = require('../config');

const norm = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const num = (jid = '') => String(jid).split('@')[0].split(':')[0];
const jidOf = (n) => String(n).replace(/\D/g, '') + '@s.whatsapp.net';
const isMaster = (jid) => cfg.owners.includes(num(jid));
const anyMaster = (ids) => [].concat(ids).some(isMaster);
const NAO_CONFIGURADO = 'Este grupo ainda não configurou esta informação. Um administrador pode utilizar o comando correspondente.';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function normNum(n) {
  let d = String(n || '').replace(/\D/g, '');
  if (d.length === 9) d = cfg.ddi + d;
  return d;
}

function senderOf(m) {
  const k = m.key;
  const c = [k.participantPn, k.participantAlt, k.senderPn, k.remoteJidAlt, k.participant, k.remoteJid];
  return c.find(x => x && x.endsWith('@s.whatsapp.net')) || k.participant || k.remoteJid || '';
}

// todos os IDs possiveis de quem enviou (telefone e @lid)
const senderIds = (m) => { const k = m.key; return [...new Set([k.participantPn, k.participantAlt, k.senderPn, k.remoteJidAlt, k.participant, k.remoteJid].filter(x => x && !x.endsWith('@g.us')))]; };

function unwrap(msg) {
  let x = msg || {};
  for (let i = 0; i < 3; i++)
    x = x.ephemeralMessage?.message || x.viewOnceMessage?.message || x.viewOnceMessageV2?.message ||
        x.documentWithCaptionMessage?.message || x;
  return x;
}
const getText = (m) => {
  const x = unwrap(m.message);
  return x.conversation || x.extendedTextMessage?.text || x.imageMessage?.caption || x.videoMessage?.caption || '';
};
const msgType = (m) => Object.keys(unwrap(m.message))[0];
const ctxInfo = (m) => {
  const t = Object.values(unwrap(m.message))[0];
  return (t && typeof t === 'object' && t.contextInfo) || {};
};
function getQuoted(m) {
  const c = ctxInfo(m);
  if (!c.quotedMessage) return null;
  const u = unwrap(c.quotedMessage);
  return { text: u.conversation || u.extendedTextMessage?.text || u.imageMessage?.caption || '',
           participant: c.participant, id: c.stanzaId };
}
function getTargets(m, args = []) {
  const c = ctxInfo(m);
  const out = [...(c.mentionedJid || [])];
  if (!out.length && c.participant) out.push(c.participant);
  if (!out.length) for (const a of args) { const d = normNum(a); if (d.length >= 10) out.push(jidOf(d)); }
  return out;
}

const fmt = (n) => Number(n || 0).toFixed(2);
const fmtMB = (mb) => mb >= 1024 ? (mb / 1024).toFixed(2).replace(/\.00$/, '') + ' GB' : Math.round(mb) + ' MB';
function parseMB(s = '') {
  const m = String(s).toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(gb|g|mb|m)\b/);
  return m ? Math.round(parseFloat(m[1]) * (m[2][0] === 'g' ? 1024 : 1)) : 0;
}

// ---- tempo (fuso configuravel) ----
const dayKey = (ts = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: cfg.tz }).format(ts);
const hm = (ts = Date.now()) => new Intl.DateTimeFormat('en-GB', { timeZone: cfg.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(ts).replace(/^24/, '00');
const hour = (ts) => parseInt(hm(ts).slice(0, 2), 10);
const weekday = (ts) => new Intl.DateTimeFormat('pt-PT', { timeZone: cfg.tz, weekday: 'long' }).format(ts);
const days = (n) => n * 864e5;
const left = (ms) => Math.max(0, Math.ceil((ms - Date.now()) / 864e5));
function inPeriod(ts, p) {
  const now = Date.now();
  if (p === 'dia') return dayKey(ts) === dayKey(now);
  if (p === 'semana') return now - ts <= days(7);
  if (p === 'mes') return dayKey(ts).slice(0, 7) === dayKey(now).slice(0, 7);
  return true;
}

// ---- grupo / admins ----
async function meta(sock, jid) {
  sock._mc = sock._mc || new Map();
  const c = sock._mc.get(jid);
  if (c && Date.now() - c.t < 60000) return c.v;
  const v = await sock.groupMetadata(jid);
  sock._mc.set(jid, { t: Date.now(), v });
  return v;
}
const invalidate = (sock, jid) => sock._mc && sock._mc.delete(jid);
const pNums = (p) => [p.id, p.phoneNumber, p.jid, p.lid].filter(Boolean).map(num);
async function isAdminJid(sock, jid, user, g) {
  const ids = [].concat(user).filter(Boolean);
  if (ids.some(isMaster)) return true;
  if (g && ids.some(i => g.admfixo.includes(num(i)))) return true;
  const mt = await meta(sock, jid);
  const ns = ids.map(num);
  return mt.participants.some(p => p.admin && pNums(p).some(n => ns.includes(n)));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SC = Array.from('ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ');
const smallCaps = (t = '') => Array.from(String(t).toLowerCase()).map(ch => (ch >= 'a' && ch <= 'z') ? SC[ch.charCodeAt(0) - 97] : ch).join('');
const fmtPhone = (n) => { const d = String(n).replace(/\D/g, ''); return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : '+' + d; };

module.exports = {
  norm, num, jidOf, isMaster, anyMaster, senderIds, ctxInfo, NAO_CONFIGURADO, esc, normNum, senderOf, unwrap, getText, msgType, getQuoted, getTargets,
  fmt, fmtMB, parseMB, dayKey, hm, hour, weekday, days, left, inPeriod,
  meta, invalidate, pNums, isAdminJid, sleep, smallCaps, fmtPhone
};
