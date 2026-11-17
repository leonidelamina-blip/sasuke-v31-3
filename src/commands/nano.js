// SISTEMA NANO: comandos personalizados criados por cada grupo (.nanoadd boa-noite | Boa noite a todos!)
const db = require('../lib/db');
const U = require('../lib/utils');
const { C } = require('../lib/cmd');

exports.commands = [
  C('nano', 'admin', 'Liga/desliga ou explica o sistema nano. Uso: .nano on | .nano off | .nano', async (c) => {
    const a = U.norm(c.args[0] || '');
    if (a === 'on' || a === 'off') { c.g.nano.on = a === 'on'; db.save(); return c.reply(`🧩 Sistema nano ${a === 'on' ? '✅ ligado' : '❌ desligado'}.`); }
    const n = Object.keys(c.g.nano.comandos).length;
    await c.reply(`🧩 *SISTEMA NANO* ${c.g.nano.on ? '✅' : '❌'}\n\nCria comandos só do teu grupo (${n} criado(s)).\n\n.nanoadd nome | resposta\n.nanolist  .nanodel nome  .limparnano\n\nEx.: .nanoadd regras | Proibido links e spam!\nDepois qualquer um usa  .regras`);
  }),
  C('nanoadd', 'admin', 'Cria um comando do grupo. Uso: .nanoadd nome | resposta', async (c) => {
    const [n, ...r] = c.text.replace(/^\S+\s*/, '').split('|');
    const nome = U.norm((n || '').trim().replace(/^\./, '')).replace(/\s+/g, '-');
    const resp = r.join('|').trim() || (U.getQuoted(c.m) || {}).text || '';
    if (!/^[a-z0-9_-]{2,20}$/.test(nome) || !resp) return c.reply('Uso: .nanoadd nome | resposta\nO nome tem 2–20 letras/números (sem espaços).');
    if (require('../lib/handler').commands.has(nome)) return c.reply(`❌ ".${nome}" já é um comando do bot. Escolha outro nome.`);
    if (resp.length > 3000) return c.reply('Resposta demasiado longa (máx. 3000).');
    if (Object.keys(c.g.nano.comandos).length >= 50 && !c.g.nano.comandos[nome]) return c.reply('Limite de 50 comandos nano por grupo.');
    c.g.nano.comandos[nome] = resp; db.save();
    await c.reply(`🧩 Comando criado: *.${nome}*${c.g.nano.on ? '' : '\n⚠️ O sistema nano está desligado. Use .nano on'}`);
  }),
  C('nanolist', 'all', 'Lista os comandos criados neste grupo.', async (c) => {
    const l = Object.keys(c.g.nano.comandos);
    await c.reply(l.length ? `🧩 *COMANDOS DO GRUPO* (${l.length})\n\n` + l.map(n => '• .' + n).join('\n') : 'Este grupo ainda não criou comandos. Admin: .nanoadd nome | resposta');
  }),
  C('nanodel', 'admin', 'Apaga um comando do grupo. Uso: .nanodel nome', async (c) => {
    const n = U.norm((c.args[0] || '').replace(/^\./, ''));
    if (!c.g.nano.comandos[n]) return c.reply('Comando não encontrado. Veja .nanolist');
    delete c.g.nano.comandos[n]; db.save(); await c.reply(`🗑️ .${n} apagado.`);
  }),
  C('limparnano', 'admin', 'Apaga TODOS os comandos criados no grupo.', async (c) => {
    const n = Object.keys(c.g.nano.comandos).length; c.g.nano.comandos = {}; db.save(); await c.reply(`🧹 ${n} comando(s) apagado(s).`);
  })
];
