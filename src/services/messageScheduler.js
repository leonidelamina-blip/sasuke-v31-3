// HUMAN RESPONSE SYSTEM — ponto único de envio. Tudo (ctx.reply, ctx.sendImage, ctx.edit, ...)
// passa por aqui. Não esconde a automação: só ordena, espaça e protege o envio.
//  - fila por chat (ordem preservada, prioridade por classe)
//  - intervalo global entre envios (controlo de frequência)
//  - indicador de escrita ("a escrever...") proporcional ao tamanho
//  - anti-duplicação (mesma resposta à mesma mensagem em poucos segundos)
//  - tentativas limitadas com espera crescente; erros permanentes não repetem
//  - cancelamento de mensagens inválidas e de filas inteiras
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// prio: menor = sai primeiro dentro do mesmo chat
const CLASSES = {
  edicao:         { prio: 0 },
  administrativo: { prio: 1, base: 300, porChar: 2, max: 1500 },
  simples:        { prio: 2, base: 400, porChar: 3, max: 1500 },
  foto:           { prio: 3, base: 700, porChar: 0, max: 1200 },
  video:          { prio: 4, base: 1000, porChar: 0, max: 1800 },
  longa:          { prio: 5, base: 600, porChar: 4, max: 3000 }
};

const cfg = {
  digitacao: true,        // enviar "composing" antes de mandar
  escala: 1,              // multiplicador dos atrasos de escrita (0 = sem espera)
  jitter: 0.15,
  intervaloGlobal: 250,   // ms mínimos entre dois envios (todos os chats)
  tentativas: 3,
  retryBase: 1000,
  filaMax: 100,           // por chat
  dedupeMs: 2500
};

const queues = new Map();
const recent = new Map();
const stats = { enviadas: 0, falhas: 0, tentativas: 0, duplicadas: 0, invalidas: 0, descartadas: 0, canceladas: 0 };
let gate = Promise.resolve();
let lastSend = 0;

function configure(o = {}) { Object.assign(cfg, o); }

function classificar(content) {
  if (content.edit || content.react || content.delete) return 'edicao';
  if (content.image || content.sticker) return 'foto';
  if (content.video) return 'video';
  const t = content.text || content.caption || '';
  return t.length > 700 ? 'longa' : 'simples';
}

function validar(jid, content) {
  if (typeof jid !== 'string' || !/@(s\.whatsapp\.net|g\.us|lid|broadcast|newsletter)$/.test(jid)) return 'JID inválido';
  if (!content || typeof content !== 'object') return 'conteúdo inválido';
  const media = content.image || content.video || content.sticker || content.audio || content.document || content.react || content.delete || content.contacts || content.poll || content.location;
  if (!media && !(typeof content.text === 'string' && content.text.trim())) return 'mensagem vazia';
  return null;
}

function chaveDe(jid, content, classe, quoted) {
  const base = JSON.stringify({
    t: content.text || null, c: content.caption || null,
    i: content.image ? (content.image.length || 1) : null,
    e: content.edit?.id || null, r: content.react?.text || null
  });
  const h = crypto.createHash('md5').update(base).digest('hex');
  return `${jid}|${classe}|${quoted?.key?.id || ''}|${h}`;
}

function adquirir() {
  const p = gate.then(async () => {
    const espera = cfg.intervaloGlobal - (Date.now() - lastSend);
    if (espera > 0) await sleep(espera);
    lastSend = Date.now();
  });
  gate = p.catch(() => {});
  return p;
}

function atraso(t) {
  const c = CLASSES[t.classe];
  const len = (t.content.text || t.content.caption || '').length;
  const base = Math.min(c.base + len * c.porChar, c.max);
  const j = 1 + (Math.random() * 2 - 1) * cfg.jitter;
  return Math.max(0, Math.round(base * j * cfg.escala));
}

function permanente(e) {
  const code = e?.output?.statusCode || e?.statusCode || e?.status;
  if ([400, 401, 403, 404].includes(code)) return true;
  return /forbidden|not-authorized|item-not-found|bad-request|invalid|cancelada/i.test(String(e?.message || ''));
}

async function executar(t) {
  for (let tentativa = 1; tentativa <= cfg.tentativas; tentativa++) {
    if (t.cancelada) return t.reject(new Error('Mensagem cancelada'));
    await adquirir();
    const digita = cfg.digitacao && t.classe !== 'edicao' && !t.opts.semAtraso &&
      typeof t.sock.sendPresenceUpdate === 'function';
    try {
      if (digita) {
        try { await t.sock.sendPresenceUpdate('composing', t.jid); } catch (_) {}
        await sleep(atraso(t));
      }
      const res = await t.sock.sendMessage(t.jid, t.content, t.options);
      if (digita) { try { await t.sock.sendPresenceUpdate('paused', t.jid); } catch (_) {} }
      stats.enviadas++;
      return t.resolve(res);
    } catch (e) {
      if (permanente(e) || tentativa >= cfg.tentativas) {
        stats.falhas++;
        if (t.chave) recent.delete(t.chave);
        return t.reject(e);
      }
      stats.tentativas++;
      await sleep(cfg.retryBase * tentativa);
    }
  }
}

async function drain(jid) {
  const q = queues.get(jid);
  if (!q || q.running) return;
  q.running = true;
  try {
    while (q.items.length) {
      const t = q.items.shift();
      if (t.cancelada) continue;
      await executar(t);
    }
  } finally {
    q.running = false;
    if (!q.items.length) queues.delete(jid);
  }
}

// send(sock, jid, content, { quoted, classe, semAtraso, dedupe }) -> Promise<resultado do Baileys>
function send(sock, jid, content, opts = {}) {
  const invalido = validar(jid, content);
  if (invalido) {
    stats.invalidas++;
    return Promise.reject(new Error(`Mensagem cancelada: ${invalido}`));
  }
  const classe = CLASSES[opts.classe] ? opts.classe : classificar(content);
  const agora = Date.now();
  for (const [k, v] of recent) if (agora - v.t > cfg.dedupeMs) recent.delete(k);

  const chave = opts.dedupe === false ? null : chaveDe(jid, content, classe, opts.quoted);
  if (chave && recent.has(chave)) {
    stats.duplicadas++;
    return recent.get(chave).promise;
  }

  let q = queues.get(jid);
  if (!q) { q = { items: [], running: false }; queues.set(jid, q); }
  if (q.items.length >= cfg.filaMax) {
    stats.descartadas++;
    return Promise.reject(new Error('Fila cheia para este chat'));
  }

  const task = {
    sock, jid, content, opts, classe, chave, prio: CLASSES[classe].prio, cancelada: false,
    options: opts.quoted ? { quoted: opts.quoted } : undefined
  };
  const promise = new Promise((resolve, reject) => { task.resolve = resolve; task.reject = reject; });
  task.promise = promise;
  if (chave) recent.set(chave, { t: agora, promise });

  let i = q.items.length;
  while (i > 0 && q.items[i - 1].prio > task.prio) i--;
  q.items.splice(i, 0, task);
  drain(jid);
  return promise;
}

// Cancela tudo o que ainda está à espera num chat. Devolve quantas mensagens cancelou.
function cancelar(jid) {
  const q = queues.get(jid);
  if (!q) return 0;
  let n = 0;
  for (const t of q.items.splice(0)) {
    t.cancelada = true;
    if (t.chave) recent.delete(t.chave);
    t.reject(new Error('Mensagem cancelada'));
    stats.canceladas++; n++;
  }
  return n;
}

function estado() {
  const filas = {};
  for (const [j, q] of queues) filas[j] = q.items.length;
  return { ...stats, filas };
}

// Espera (até timeoutMs) que as filas esvaziem — usado no encerramento seguro.
async function esvaziar(timeoutMs = 3000) {
  const fim = Date.now() + timeoutMs;
  while (queues.size > 0 && Date.now() < fim) await sleep(50);
  return queues.size === 0;
}

function _reset() {
  queues.clear(); recent.clear();
  for (const k of Object.keys(stats)) stats[k] = 0;
}

module.exports = { send, cancelar, configure, estado, esvaziar, CLASSES, _reset };
