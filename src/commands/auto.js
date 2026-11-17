const cfg = require('../config');
const db = require('../lib/db');
const U = require('../lib/utils');
const { C, T } = require('../lib/cmd');

exports.priority = 40;
const body = (c) => c.text.replace(/^\S+\s*/, '').trim();
const fill = (t, o) => t.replace(/\{nome\}/g, o.nome).replace(/\{grupo\}/g, o.grupo).replace(/\{membros\}/g, o.membros).replace(/\{numero\}/g, o.numero);

// ---------- ganchos: autoreply e saudacao ----------
const cool = new Map();
exports.onMessage = async (c) => {
  const { sock, jid, sender, text, g, m } = c;
  if (text.startsWith(cfg.prefix)) return false;
  const nt = U.norm(text);

  if (g.on.autoreply) {
    for (const [trig, resp] of Object.entries(g.replies)) {
      if (new RegExp(`(^|\\W)${U.esc(U.norm(trig))}(\\W|$)`).test(nt)) {
        const k = jid + trig;
        if (Date.now() - (cool.get(k) || 0) < 15000) return false;
        cool.set(k, Date.now());
        await sock.sendMessage(jid, { text: resp }, { quoted: m });
        return false;
      }
    }
  }
  if (g.on.saudacao && /^(bom dia|boa tarde|boa noite|ola|oi|salam|hello)\b/.test(nt)) {
    const u = U.num(sender);
    if (Date.now() - (g.greeted[u] || 0) < 6 * 3600 * 1000) return false;
    g.greeted[u] = Date.now(); db.save();
    const h = U.hour(Date.now());
    const sd = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const t = g.texts.saudacao ? fill(g.texts.saudacao, { nome: '@' + u, grupo: '', membros: '', numero: u })
      : `${sd} @${u}! 👋 Para ver os pacotes digite ${cfg.prefix}tabela`;
    await sock.sendMessage(jid, { text: t, mentions: [sender] }, { quoted: m });
  }
  return false;
};

// ---------- boas-vindas / saida ----------
exports.onParticipants = async ({ sock, jid, g, action, list }) => {
  if (!['add', 'remove'].includes(action)) return;
  let nomeGrupo = '', membros = 0;
  try { const mt = await U.meta(sock, jid); nomeGrupo = mt.subject; membros = mt.participants.length; } catch {}
  for (const p of list) {
    const o = { nome: '@' + U.num(p), grupo: nomeGrupo, membros: String(membros), numero: U.num(p) };
    if (action === 'add' && g.on.boasvindas) {
      let t;
      if (g.on.boaspersonalizado && g.texts.boas) t = fill(g.texts.boas, o);
      else if (g.texts.nano) t = fill(g.texts.nano, o);
      else t = `👋 Bem-vindo(a) ${g.cfg.boasnome === false ? '' : o.nome} ao *${nomeGrupo}*!\nDigite ${cfg.prefix}tabela para ver os pacotes.` +
        (g.cfg.boasmembro ? `\n👥 Membros: ${membros}` : '');
      await sock.sendMessage(jid, { text: t, mentions: [p] }).catch(() => {});
    }
    if (action === 'remove' && g.on.saidas && g.texts.saida) {
      await sock.sendMessage(jid, { text: fill(g.texts.saida, o), mentions: [p] }).catch(() => {});
    }
  }
};

// ---------- comandos ----------
const setText = (names, key, label, usage) => C(names, 'admin', `${label}. Uso: ${usage}. Variaveis: {nome} {grupo} {membros}`, async (c) => {
  const t = body(c);
  if (!t) return c.reply(`Uso: ${usage}\nVariáveis: {nome} {grupo} {membros}`);
  c.g.texts[key] = t; db.save();
  await c.reply(`✅ ${label} salvo.`);
});
const flag = (names, key, val, msg) => C(names, 'admin', msg, async (c) => { c.g.cfg[key] = val; db.save(); await c.reply('✅ ' + msg); });

exports.commands = [
  T(['autoreply', 'autoresposta'], 'autoreply', 'Autoreply (respostas automáticas)'),
  T('saidas', 'saidas', 'Mensagem de saída de membros'),
  T('saudacao', 'saudacao', 'Saudação automática'),
  T('boasvindas', 'boasvindas', 'Boas-vindas'),
  T('boaspersonalizado', 'boaspersonalizado', 'Boas-vindas personalizada'),

  setText('boaspersonalizar', 'boas', 'Mensagem de boas-vindas', '.boaspersonalizar Olá {nome}, bem-vindo ao {grupo}!'),
  flag('boasnomeative', 'boasnome', true, 'Boas-vindas mostrará o nome (@) do novo membro'),
  flag('boasnomedesative', 'boasnome', false, 'Boas-vindas não mostrará o nome do novo membro'),
  flag('boasmembroactive', 'boasmembro', true, 'Boas-vindas mostrará o total de membros'),
  flag('boasmembrodesactive', 'boasmembro', false, 'Boas-vindas não mostrará o total de membros'),
  setText('nanobemvindo', 'nano', 'Boas-vindas compacta (1 linha, usada se não houver personalizada)', '.nanobemvindo Olá {nome}! Veja .tabela'),
  C('nanosaida', 'admin', 'Define e liga a mensagem de saída de membro. Uso: .nanosaida {nome} saiu do grupo. Variaveis: {nome} {grupo} {membros}', async (c) => {
    const t = body(c);
    if (!t) return c.reply('Uso: .nanosaida {nome} saiu do grupo.\nVariáveis: {nome} {grupo} {membros}');
    c.g.texts.saida = t; c.g.on.saidas = true; db.save();
    await c.reply('✅ Mensagem de saída salva e ligada.');
  }),
  setText('saudacaopersonalizar', 'saudacao', 'Saudação personalizada', '.saudacaopersonalizar Olá {nome}! Digite .tabela'),
  C('saudacaolimpar', 'admin', 'Volta a saudacao padrao.', async (c) => { delete c.g.texts.saudacao; db.save(); await c.reply('🧹 Saudação padrão restaurada.'); }),

  // --- autoreply ---
  C('reply', 'admin', 'Liga/desliga o autoreply ou cria um gatilho. Uso: .reply on | .reply off | .reply oi = Ola! Veja .tabela', async (c) => {
    const a = U.norm(c.args[0] || '');
    if (a === 'on' || a === 'off') { c.g.on.autoreply = a === 'on'; db.save(); return c.reply(`💬 Autoreply ${a === 'on' ? '✅ ligado' : '❌ desligado'}.`); }
    const [trig, ...rest] = body(c).split(/\s*[=|]\s*/);
    const resp = rest.join(' = ').trim();
    if (!trig || !resp) return c.reply('Uso: .reply gatilho = resposta\nEx.: .reply preço = Veja a .tabela');
    c.g.replies[trig.trim()] = resp; db.save();
    await c.reply(`✅ Gatilho salvo: "${trig.trim()}"${c.g.on.autoreply ? '' : '\n⚠️ Autoreply está desligado. Use .reply on'}`);
  }),
  C('replyremove', 'admin', 'Remove um gatilho. Uso: .replyremove gatilho', async (c) => {
    const t = body(c), k = Object.keys(c.g.replies).find(x => U.norm(x) === U.norm(t));
    if (!k) return c.reply('Gatilho não encontrado. Veja: .replyver');
    delete c.g.replies[k]; db.save(); await c.reply(`🗑️ Gatilho "${k}" removido.`);
  }),
  C('replylimpar', 'admin', 'Apaga todos os gatilhos.', async (c) => { c.g.replies = {}; db.save(); await c.reply('🧹 Todos os gatilhos apagados.'); }),
  C('replyver', 'admin', 'Lista os gatilhos do autoreply.', async (c) => {
    const e = Object.entries(c.g.replies);
    await c.reply(e.length ? `💬 *GATILHOS* (${c.g.on.autoreply ? 'ligado' : 'desligado'})\n\n` + e.map(([k, v]) => `• ${k} → ${v}`).join('\n') : 'Nenhum gatilho. Use: .reply gatilho = resposta');
  }),

  // --- tabela em texto ---
  C(['salvartabela', 'settabela'], 'admin', 'Salva a tabela de precos (responda a mensagem da tabela ou cole depois do comando) e le os pacotes automaticamente.', async (c) => {
    const q = U.getQuoted(c.m);
    const t = (q && q.text) || body(c);
    if (!t) return c.reply('Responda à mensagem da tabela com .salvartabela\n(ou: .salvartabela e cole o texto)');
    c.g.tableText = t;
    const table = {};
    for (const ln of t.split('\n')) {
      const mm = ln.match(/(\d+(?:[.,]\d+)?\s*(?:GB|MB))\D{0,20}?(\d+(?:[.,]\d+)?)\s*(?:MT|MZN|Mt)?/i);
      if (mm) { const label = mm[1].replace(/\s+/g, '').toUpperCase(); table[require('../lib/sales').key(label)] = { label, price: parseFloat(mm[2].replace(',', '.')), mb: U.parseMB(label) }; }
    }
    if (Object.keys(table).length) c.g.table = table;
    db.save();
    await c.reply(`✅ Tabela salva. ${Object.keys(table).length ? Object.keys(table).length + ' pacotes reconhecidos para o .compra' : 'Nenhum pacote reconhecido para o .compra (use .setmegas).'}`);
  }),
  C('vertabela', 'admin', 'Mostra a tabela salva e os pacotes reconhecidos.', async (c) => {
    const p = Object.values(c.g.table).map(x => `${x.label}=${x.price}`).join(', ');
    await c.reply((c.g.tableText ? c.g.tableText + '\n\n' : 'Sem tabela em texto.\n\n') + `🔎 Pacotes ativos: ${p || 'nenhum'}`);
  }),
  C('limpartabela', 'admin', 'Apaga a tabela (texto e pacotes).', async (c) => { c.g.tableText = ''; c.g.table = {}; db.save(); await c.reply('🧹 Tabela apagada.'); }),

  // --- formas de pagamento (varias contas por tipo) ---
  ...[['mpesa', 'M-Pesa', '84'], ['emola', 'e-Mola', '87']].flatMap(([k, nome, ex]) => {
    const set = (add) => async (c) => {
      const [n, ...r] = body(c).split('-');
      const d = U.normNum(n);
      if (d.length < 10) return c.reply(`Uso: .${add ? 'add' : ''}${k} ${ex}xxxxxxx-Nome do titular`);
      const item = { num: d.slice(-9), nome: r.join('-').trim() };
      const arr = add ? [...[].concat(c.g.pay[k] || []).filter(x => x.num !== item.num), item].slice(-5) : [item];
      c.g.pay[k] = arr; db.save();
      await c.reply(`✅ ${nome} ${add ? 'adicionado' : 'salvo'}: ${item.num}${item.nome ? ' — ' + item.nome : ''}\n(${arr.length} conta(s) ${nome} no grupo)`);
    };
    return [
      C(k, 'all', `Sem argumentos mostra o pagamento; admin define a conta ${nome}. Uso: .${k} ${ex}xxxxxxx-Nome`, async (c) => {
        if (!body(c)) { const i = require('../lib/sales').payInfo(c.g); return c.reply(i ? '💳 *PAGAMENTO*\n\n' + i : U.NAO_CONFIGURADO); }
        if (!(await c.isAdmin())) return c.reply('🚫 Só admins podem alterar o pagamento.');
        return set(false)(c);
      }),
      C('add' + k, 'admin', `Adiciona OUTRA conta ${nome} (até 5). Uso: .add${k} ${ex}xxxxxxx-Nome`, set(true))
    ];
  }),
  C('formasdeplist', 'all', 'Lista as formas de pagamento cadastradas.', async (c) => {
    const i = require('../lib/sales').payInfo(c.g);
    await c.reply(i ? '💳 *FORMAS DE PAGAMENTO*\n\n' + i : U.NAO_CONFIGURADO);
  }),
  C('rmformas', 'admin', 'Remove as contas de um tipo. Uso: .rmformas mpesa|emola', async (c) => {
    const k = U.norm(c.args[0] || '');
    if (!c.g.pay[k]) return c.reply('Uso: .rmformas mpesa   ou   .rmformas emola');
    delete c.g.pay[k]; db.save(); await c.reply(`🗑️ Contas ${k} removidas.`);
  }),
  T('comprovativo', 'comprovativo', 'Leitura automática de comprovativo'),
  T('antiduplicado', 'antiduplicado', 'Anti-duplicado (comprovativo repetido)')
];
