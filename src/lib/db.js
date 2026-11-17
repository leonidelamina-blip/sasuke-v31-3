// Banco JSON em ./database/ com escrita atomica, copia .bak, recuperacao de arquivo corrompido e backups a cada 6 h.
const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const DIR = process.env.SASUKE_DB_DIR || path.join(__dirname, '..', '..', 'database');
const FILE = path.join(DIR, 'db.json');
const BACKUPS = path.join(DIR, 'backups');
fs.mkdirSync(BACKUPS, { recursive: true });

let data = { sessions: {} };
function load() {
  for (const f of [FILE, FILE + '.bak']) {
    try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); if (o && typeof o === 'object') { if (f !== FILE) console.warn('[db] restaurado a partir de .bak'); return o; } }
    catch (e) { if (e.code !== 'ENOENT' && f === FILE) { try { fs.renameSync(f, f + '.corrompido-' + Date.now()); } catch {} console.warn('[db] db.json corrompido; a tentar .bak'); } }
  }
  return { sessions: {} };
}
data = load();
data.sessions = data.sessions || {};
data.trials = data.trials || {};       // numero -> { at, by, sid }  (1 teste gratis por numero)
data.settings = data.settings || {};   // ex.: { teste: false } desliga o teste gratis
let timer = null;

function write() {
  fs.writeFileSync(FILE + '.tmp', JSON.stringify(data));
  if (fs.existsSync(FILE)) { try { fs.copyFileSync(FILE, FILE + '.bak'); } catch {} }
  fs.renameSync(FILE + '.tmp', FILE);
}
function save() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; try { write(); } catch (e) { console.error('[db] falha a gravar:', e.message); } }, 400);
}
function flushAll() { if (timer) { clearTimeout(timer); timer = null; } try { write(); } catch (e) { console.error('[db] flush:', e.message); } }

function backupNow(keep = 10) {
  try {
    flushAll();
    const dir = path.join(BACKUPS, new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(FILE, path.join(dir, 'db.json'));
    const all = fs.readdirSync(BACKUPS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
    for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(BACKUPS, old), { recursive: true, force: true });
    return dir;
  } catch (e) { console.error('[db] backup falhou:', e.message); return null; }
}
let bt = null;
function startBackups(everyMs = 6 * 3600 * 1000) { backupNow(); if (bt) clearInterval(bt); bt = setInterval(backupNow, everyMs); bt.unref(); }

const GROUP = () => ({
  on: { bot: true, comprovativo: true, antiduplicado: true, compras: true, automover: true },
  cfg: {}, mode: {}, strikes: {}, logs: {}, goals: {}, sched: {}, texts: {},
  ann: { items: {}, on: true },
  table: {}, tableText: '', pay: {}, txt: {}, txtMeta: {}, pending: {}, sales: [], saleSeq: 0, buyers: {},
  wallet: {}, walletLog: [], txids: [],
  banned: [], muted: [], admfixo: [], activity: {}, joined: {}, words: [], replies: {}, greeted: {}, daily: {},
  nano: { on: true, comandos: {} }, perm: { modolivre: false, liberados: {}, todos: [] },
  prefix: '258', maxavisos: 3, semDias: 7, semList: []
});
function fill(o, d) {
  for (const k of Object.keys(d)) {
    if (o[k] === undefined) o[k] = d[k];
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) fill(o[k], d[k]);
  }
  return o;
}
function ensureSession(sid, init = {}) {
  if (!data.sessions[sid]) {
    data.sessions[sid] = { id: sid, name: cfg.botName, ownerPhone: '', phone: '', until: 0, status: 'new',
      createdAt: Date.now(), groups: {}, bannedGroups: [], menuStyle: 'caixa', ...init };
    save();
  }
  return data.sessions[sid];
}
const session = (sid) => data.sessions[sid];
function group(sid, jid) {
  const S = ensureSession(sid);
  S.groups[jid] = fill(S.groups[jid] || {}, GROUP());
  return S.groups[jid];
}
module.exports = { data, save, flushAll, backupNow, startBackups, ensureSession, session, group, DIR };
