const U = require('./utils');
const db = require('./db');

const key = (s) => U.norm(String(s || '')).replace(/\s+/g, '');

// acha o pacote na tabela, ou calcula pelo preco por MB (.ativar compra MB)
function priceFor(g, arg) {
  const t = g.table[key(arg)];
  if (t) return { label: t.label, price: t.price, mb: t.mb || U.parseMB(t.label) };
  if (g.on.mbmode) {
    const mb = U.parseMB(arg), rate = parseFloat(g.cfg.mbpreco);
    if (mb && rate) return { label: U.fmtMB(mb), price: +(mb * rate).toFixed(2), mb };
  }
  return null;
}

function registerSale(g, user, order, txid, via) {
  const sale = { id: ++g.saleSeq, user, label: order.label, mb: order.mb || U.parseMB(order.label),
    price: order.price, number: order.number, txid, at: Date.now(), via, status: 'pago' };
  g.sales.push(sale);
  const b = g.buyers[user] || (g.buyers[user] = { count: 0, total: 0, mb: 0 });
  b.count++; b.total += sale.price; b.mb += sale.mb;
  delete g.pending[user];
  db.save();
  return sale;
}
function voidSale(g, s) {
  if (s.void) return;
  s.void = true;
  const b = g.buyers[s.user];
  if (b) { b.count = Math.max(0, b.count - 1); b.total = Math.max(0, b.total - s.price); b.mb = Math.max(0, b.mb - s.mb); }
  db.save();
}

const live = (g) => g.sales.filter(s => !s.void);
const period = (g, p) => live(g).filter(s => U.inPeriod(s.at, p));
const sum = (a, f) => a.reduce((x, s) => x + f(s), 0);
function ranking(sales, n = 10) {
  const m = {};
  for (const s of sales) {
    const r = m[s.user] || (m[s.user] = { user: s.user, count: 0, total: 0, mb: 0 });
    r.count++; r.total += s.price; r.mb += s.mb;
  }
  return Object.values(m).sort((a, b) => b.mb - a.mb || b.total - a.total).slice(0, n);
}
const bar = (pct) => { const f = Math.min(10, Math.floor(pct / 10)); return '█'.repeat(f) + '░'.repeat(10 - f); };
function goal(g, p) {
  const target = g.goals[p];
  if (!target) return null;
  const done = sum(period(g, p), s => s.mb);
  return { target, done, pct: Math.round(done / target * 100) };
}
const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}°`;
const payList = (g) => Object.entries(g.pay).flatMap(([k, v]) => [].concat(v).map(x => ({ k, ...x })));
function payInfo(g) {
  const nome = { mpesa: 'M-Pesa', emola: 'e-Mola' };
  const forms = payList(g).map(p => `• ${nome[p.k] || p.k}: *${p.num}*${p.nome ? ' — ' + p.nome : ''}`).join('\n');
  return [forms, g.txt && g.txt.pagamento].filter(Boolean).join('\n\n');
}
async function notifyAdmins(c, text) {
  const mt = await U.meta(c.sock, c.jid);
  const ids = mt.participants.filter(p => p.admin).map(p => p.id);
  await c.sock.sendMessage(c.jid, { text: text + '\n\n' + ids.map(i => '@' + U.num(i)).join(' '), mentions: ids });
}

module.exports = { payList, key, priceFor, registerSale, voidSale, live, period, sum, ranking, bar, goal, medal, payInfo, notifyAdmins };
