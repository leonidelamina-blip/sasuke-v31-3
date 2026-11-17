// Envio "humano": tudo passa pelo messageScheduler (fila por chat, "a escrever...", anti-duplicacao, tentativas)
// e as respostas de comandos recebem a marca d'agua do bot no final.
const cfg = require('../config');
const scheduler = require('../services/messageScheduler');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

function wrap(sock, { watermark, classe } = {}) {
  const p = Object.create(sock);
  p.sendMessage = async (jid, content, opts = {}) => {
    if (!content || content.delete || content.react) return sock.sendMessage(jid, content, opts);
    const { noWm, ...c } = content;
    if (watermark && !noWm) {
      const add = (t) => (t && t.includes(watermark)) ? t : `${t || ''}\n\n━━━━━━━━━━\n⚡ ${watermark}`;
      if (typeof c.text === 'string') c.text = add(c.text);
      else if (c.image || c.video) c.caption = add(c.caption);
    }
    if (!cfg.human.on) return sock.sendMessage(jid, c, opts);
    return scheduler.send(sock, jid, c, { quoted: opts && opts.quoted, classe: c.edit ? undefined : classe });
  };
  return p;
}
module.exports = { wrap, sleep, rand };
