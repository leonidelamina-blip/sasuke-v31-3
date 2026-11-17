// Fotos: usa assets/bot.jpg e assets/dono.jpg se existirem; senao pega a foto de perfil do WhatsApp
const fs = require('fs');
const path = require('path');
const U = require('./utils');
const cfg = require('../config');
const cache = new Map();

async function get(sock, jid, files) {
  for (const f of files) {
    const p = path.join(__dirname, '..', '..', 'assets', f);
    if (fs.existsSync(p)) return { image: fs.readFileSync(p) };
  }
  const c = cache.get(jid);
  if (c && Date.now() - c.t < 6 * 3600 * 1000) return c.v;
  let v = null;
  try { const url = await sock.profilePictureUrl(jid, 'image'); if (url) v = { image: { url } }; } catch {}
  cache.set(jid, { t: Date.now(), v });
  return v;
}

module.exports = {
  bot: (sock, main = true) => get(sock, U.jidOf(U.num(sock.user?.id || '')), main ? ['sasuke.jpg', 'sasuke.jpeg', 'sasuke.png'] : []),
  // a foto de assets/dono.jpg so vale para o dono da plataforma; os outros usam a foto de perfil do WhatsApp
  owner: (sock, phone) => get(sock, U.jidOf(phone), phone === cfg.owner.numero ? ['dono.jpg', 'dono.jpeg', 'dono.png'] : [])
};
