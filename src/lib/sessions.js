const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default || baileys.makeWASocket;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = baileys;
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const qrt = require('qrcode-terminal');
const db = require('./db');

const ROOT = path.join(__dirname, '..', '..');
const socks = new Map();      // sid -> socket
const stopped = new Set();    // sessoes paradas de proposito
const tries = new Map();
// sessao principal em ./auth ; clientes em ./sessoes/<id>
const dirOf = (sid) => sid === 'main' ? path.join(ROOT, 'auth') : path.join(ROOT, 'sessoes', sid);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}] 🩸`, ...a);

// apaga so o CONTEUDO (a pasta pode ser um volume do painel)
function cleanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) { if (f !== '.gitkeep') fs.rmSync(path.join(dir, f), { recursive: true, force: true }); }
}

// opts: { mode: 'pairing'|'qr'|'ambos', pairNumber, onPair(code), onQr(qr), onOpen(sock), onError(err) }
async function start(sid, opts = {}) {
  stopped.delete(sid);
  fs.mkdirSync(dirOf(sid), { recursive: true });
  let auth = await useMultiFileAuthState(dirOf(sid));
  // restos de um pareamento que nao foi concluido (creds com "me" mas nao registadas) fazem o WhatsApp responder 401 e invalidam o codigo
  if (!auth.state.creds.registered && auth.state.creds.me) {
    cleanDir(dirOf(sid)); auth = await useMultiFileAuthState(dirOf(sid));
    log(`sessao ${sid}: restos de um pareamento incompleto foram limpos`);
  }
  const { state, saveCreds } = auth;
  let version; try { ({ version } = await fetchLatestBaileysVersion()); } catch {}
  const logger = pino({ level: 'silent' });
  let sock;
  sock = makeWASocket({
    ...(version ? { version } : {}), logger,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: Browsers.ubuntu('Chrome'), printQRInTerminal: false, markOnlineOnConnect: false,
    syncFullHistory: false, generateHighQualityLinkPreview: false, getMessage: async () => undefined,
    cachedGroupMetadata: async (jid) => sock && sock._mc && sock._mc.get(jid) ? sock._mc.get(jid).v : undefined
  });
  socks.set(sid, sock);
  let lastPair = 0, pairCount = 0;   // novo codigo a cada ~2 min (max. 3) enquanto ninguem o usar
  let jaRegistado = !!state.creds.registered;
  sock.ev.on('creds.update', async () => {
    await saveCreds();
    if (!jaRegistado && state.creds.registered) { jaRegistado = true; log(`✅ sessao ${sid}: dispositivo ASSOCIADO como ${state.creds.me && state.creds.me.id}`); }
  });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    const S = db.session(sid);
    if (qr && !state.creds.registered) {
      const mode = opts.mode || (opts.pairNumber ? 'pairing' : 'qr');
      if (mode === 'qr' || mode === 'ambos') { if (opts.onQr) opts.onQr(qr); else { qrt.generate(qr, { small: true }); log('Escaneia o QR em WhatsApp > Aparelhos conectados.'); } }
      if ((mode === 'pairing' || mode === 'ambos') && opts.pairNumber && pairCount < 3 && Date.now() - lastPair > 110000) {
        lastPair = Date.now(); pairCount++;
        await sleep(Number(process.env.SASUKE_PAIR_DELAY ?? 1500));
        try { const code = await sock.requestPairingCode(opts.pairNumber); opts.onPair && opts.onPair(code, pairCount); }
        catch (e) { lastPair = 0; pairCount--; opts.onError && opts.onError(e); }
      }
    }
    if (connection === 'open') {
      tries.set(sid, 0);
      if (S) { S.status = 'online'; S.phone = (sock.user?.id || '').split(':')[0].split('@')[0]; db.save(); }
      log(`sessao ${sid} ONLINE como ${sock.user?.id}`);
      opts.onOpen && opts.onOpen(sock);
    }
    if (connection === 'connecting') log(`sessao ${sid}: a ligar ao WhatsApp...`);
    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      log(`sessao ${sid}: ligacao fechada · estado ${code ?? '?'} · ${(lastDisconnect?.error?.message || 'sem detalhe').slice(0, 80)}`);
      socks.delete(sid);
      if (stopped.has(sid)) return;
      if (code === DisconnectReason.loggedOut) {
        log(`sessao ${sid}: terminada no telemovel; a limpar credenciais.`);
        cleanDir(dirOf(sid));
        if (sid === 'main') setTimeout(() => start(sid, opts).catch(() => {}), 3000);
        else if (S) { S.status = 'desconectada'; db.save(); }
      } else if (code === DisconnectReason.connectionReplaced) {
        log(`sessao ${sid}: substituida por outra instancia. Nao reconecto (evita Bad MAC).`);
      } else {
        const n = (tries.get(sid) || 0) + 1; tries.set(sid, n);
        if (S && S.status === 'online') { S.status = 'reconectando'; db.save(); }
        const wait = Math.min(30000, n * 2000);
        log(`sessao ${sid}: ligacao fechada (${code ?? '?'}). Reconectar em ${wait / 1000}s...`);
        setTimeout(() => start(sid, opts).catch(() => {}), wait);
      }
    }
  });

  const handler = () => require('./handler');
  sock.ev.on('groups.update', (arr) => arr.forEach(g => g.id && sock._mc && sock._mc.delete(g.id)));
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const m of messages) { try { await handler().handle(sock, sid, m, type); } catch (e) { console.error('[erro]', e.message); } }
  });
  sock.ev.on('group-participants.update', (ev) => handler().onParticipants(sock, sid, ev).catch(() => {}));
  return sock;
}

async function stop(sid, { purge = false } = {}) {
  stopped.add(sid);
  const s = socks.get(sid);
  if (s) { try { s.end(undefined); } catch {} socks.delete(sid); }
  if (purge) { if (sid === 'main') cleanDir(dirOf(sid)); else fs.rmSync(dirOf(sid), { recursive: true, force: true }); }
}

function restoreAll() {
  for (const sid of Object.keys(db.data.sessions)) {
    if (sid === 'main') continue;
    const S = db.session(sid);
    if (S.status === 'desconectada') continue;
    if (fs.existsSync(path.join(dirOf(sid), 'creds.json'))) start(sid).catch(e => console.error(e.message));
  }
}

function find(q) {
  q = String(q || '').toLowerCase().replace(/\s+/g, '');
  if (!q) return null;
  return Object.values(db.data.sessions).find(S =>
    S.id.toLowerCase() === q || (S.phone && S.phone.endsWith(q)) || (S.ownerPhone && S.ownerPhone.endsWith(q)) ||
    (S.name || '').toLowerCase().replace(/\s+/g, '') === q);
}
module.exports = { socks, start, stop, restoreAll, find };
