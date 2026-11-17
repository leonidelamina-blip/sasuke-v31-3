const db = require('./db');
const U = require('./utils');

// C(nomes, escopo, descricao, funcao, opcoes)  escopo: all | admin | owner | master
const C = (names, scope, desc, run, extra = {}) => ({
  names: [].concat(names), scope, desc, run,
  group: scope === 'owner' || scope === 'master' ? false : true, ...extra
});

// T(...) = comando liga/desliga:  .nome on/off
const T = (names, key, label, scope = 'admin') => C(names, scope, `Liga/desliga ${label}. Uso: .${[].concat(names)[0]} on/off`, async (c) => {
  const a = U.norm(c.args[0] || '');
  const nome = [].concat(names)[0];
  if (a !== 'on' && a !== 'off')
    return c.reply(`${label}: ${c.g.on[key] ? '✅ ligado' : '❌ desligado'}\nUse .${nome} on/off`);
  c.g.on[key] = a === 'on'; db.save();
  return c.reply(`${label} ${a === 'on' ? '✅ ligado' : '❌ desligado'}.`);
});

// M(...) = define o modo de uma protecao: normal (so apaga) | aviso (avisa e bane apos N) | ban
const M = (names, type, mode, label) => C(names, 'admin', `${label}. Modo: ${mode}`, async (c) => {
  c.g.mode[type] = mode; db.save();
  return c.reply(`✅ ${label}`);
});

const botAdminMsg = '❌ Nao consegui: o bot precisa ser administrador do grupo.';
module.exports = { C, T, M, botAdminMsg };
