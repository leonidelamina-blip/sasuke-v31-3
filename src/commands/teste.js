// TESTE GRATIS: quem nunca alugou pede .teste no privado do bot principal e ganha 24 h com o proprio numero.
const cfg = require('../config');
const db = require('../lib/db');
const U = require('../lib/utils');
const sessions = require('../lib/sessions');
const ads = require('../lib/anuncios');
const { C } = require('../lib/cmd');

const T = cfg.teste || {};
const fmtCode = (c) => (c.match(/.{1,4}/g) || [c]).join('-');
const ativo = () => T.ativo !== false && db.data.settings.teste !== false;
const emTeste = () => Object.values(db.data.sessions).filter(s => s.trial && (!s.until || s.until > Date.now()));

exports.commands = [
  C(['teste', 'gratis', 'trial', 'free'], 'all', 'Pede 1 dia (24h) de teste GRATIS do bot no teu numero. Uso (no privado do bot principal): .teste [numero]. Dono: .teste on/off', async (c) => {
    const arg = U.norm(c.args[0] || '');
    if (c.master && (arg === 'on' || arg === 'off')) {
      db.data.settings.teste = arg === 'on'; db.save();
      return c.reply(`🎁 Teste grátis ${arg === 'on' ? '✅ ligado' : '❌ desligado'}.`);
    }
    if (c.sid !== 'main') return c.reply(`🎁 O teste grátis é pedido ao bot principal: wa.me/${cfg.botNumber}\nEnvie lá: .teste`);
    if (c.isGroup) return c.reply(`🎁 *TESTE GRÁTIS*\nPeça em privado para não expor o seu número:\nwa.me/${cfg.botNumber}  →  envie  .teste`);
    if (!ativo()) return c.reply('🎁 O teste grátis está indisponível de momento. Para alugar fale com o dono: ' + cfg.contato);

    const eu = U.num(c.sender);
    const phone = U.normNum(c.args[0] || eu);
    if (phone.length < 10 || phone.length > 15) return c.reply('Uso: .teste  (usa o teu número)  ou  .teste 84xxxxxxx');
    if (phone === cfg.botNumber) return c.reply('Esse é o número do bot principal. Envie o número onde quer o seu bot.');

    const ex = sessions.find(phone);
    if (ex) return c.reply(ex.trial && ex.until > Date.now()
      ? `🎁 Já tens um teste ativo: *${ex.name}*, restam ${ads.restante(ex)}.\nPara continuar depois: ${cfg.contato}`
      : `ℹ️ O número +${phone} já tem um bot. Para renovar ou alugar fale com o dono: ${cfg.contato}`);

    const usado = db.data.trials[phone] || db.data.trials['by:' + eu];
    if (usado && !c.master) return c.reply(`🎁 O teste grátis já foi usado${usado.by === eu ? ' por si' : ' neste número'}.\nPara alugar o bot fale com o dono: ${cfg.contato}`);
    if (emTeste().length >= (T.maxSimultaneos || 10)) return c.reply('⏳ Muitos testes ativos neste momento. Tente novamente daqui a algumas horas.');

    const horas = T.horas || 24, sid = 't' + phone;
    const nome = `${cfg.botName} Teste`;
    db.ensureSession(sid, { name: nome, ownerPhone: phone, trial: true, until: Date.now() + (T.minutosParaParear || 30) * 60000, status: 'pareando' });
    if (!c.master) { db.data.trials[phone] = { at: Date.now(), by: eu, sid }; db.data.trials['by:' + eu] = { at: Date.now(), by: eu, sid }; }
    db.save();
    await c.reply(`🎁 *TESTE GRÁTIS · ${horas}h*\n\n📞 Número: +${phone}\n⏳ O tempo só começa a contar depois de ligar.\n\nA gerar o código de pareamento…`);
    await sessions.start(sid, {
      pairNumber: phone,
      onPair: (code) => c.sock.sendMessage(c.jid, { text: `🔑 *CÓDIGO DE PAREAMENTO*\n\n*${fmtCode(code)}*\n\nNo WhatsApp de +${phone}:\n1️⃣ Aparelhos conectados\n2️⃣ Conectar um aparelho\n3️⃣ *Conectar com número de telefone*\n4️⃣ Digite o código acima\n\n⏱️ Tem ${T.minutosParaParear || 30} min para ligar.` }),
      onOpen: async (s) => {
        const S = db.session(sid); if (!S) return;
        if (!S.trialStart) { S.trialStart = Date.now(); S.until = Date.now() + horas * 3600e3; db.save(); }
        await c.raw.sendMessage(c.jid, { text: `✅ *${nome}* ligado! Tens ${horas}h de teste grátis.\nAbre o chat contigo mesmo e envia  .menu` }).catch(() => {});
        await s.sendMessage(U.jidOf(phone), { text: `🎁 *TESTE GRÁTIS ATIVO*\n\n⏳ Duração: ${horas}h\n📋 Digite .menu para ver os comandos\n💎 Para continuar depois do teste: ${cfg.contato}` }).catch(() => {});
        await c.raw.sendMessage(U.jidOf(cfg.owner.numero), { text: `🎁 Novo teste: +${phone} (${horas}h). Contacte-o depois: wa.me/${phone}` }).catch(() => {});
      },
      onError: (e) => c.raw.sendMessage(c.jid, { text: `❌ Não consegui gerar o código: ${e.message}\nConfira o número (com 258) e tente de novo.` }).catch(() => {})
    });
  }, { group: false }),

  C('testes', 'master', 'Lista os testes gratis (ativos e usados).', async (c) => {
    const ativos = emTeste().map(s => `• +${s.ownerPhone} · ${s.status} · restam ${ads.restante(s)}`);
    const usados = Object.keys(db.data.trials).filter(k => !k.startsWith('by:')).length;
    await c.reply(`🎁 *TESTES GRÁTIS* ${ativo() ? '✅' : '❌ desligado'}\n\nAtivos (${ativos.length}/${T.maxSimultaneos || 10}):\n${ativos.join('\n') || '—'}\n\nNúmeros que já testaram: ${usados}`);
  }),
  C('resetteste', 'master', 'Permite que um numero peca outro teste gratis. Uso: .resetteste 258841234567', async (c) => {
    const n = U.normNum(c.args[0]);
    const t = db.data.trials[n];
    if (!t) return c.reply('Esse número não tem teste registado.');
    delete db.data.trials[n]; delete db.data.trials['by:' + t.by]; db.save();
    await c.reply(`♻️ +${n} pode pedir outro teste.`);
  })
];
