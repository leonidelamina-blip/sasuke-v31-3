// FONTE DA VERDADE: lista numerada de 1 a 120. Alias do menu NÃO são comandos novos.
const GRUPOS = [
  { id: 'A', titulo: 'MEMBROS', nomes: ['ban', 'kick', 'add', 'promover', 'rebaixar', 'mute', 'unmute', 'banlist', 'unban', 'admins', 'membros', 'online'] },
  { id: 'B', titulo: 'ADMINISTRAÇÃO DE GRUPOS', nomes: ['abrir', 'fechar', 'abrirhorario', 'fecharhorario', 'nome', 'desc', 'link', 'novolink', 'infogp'] },
  { id: 'C', titulo: 'MENSAGENS', nomes: ['boasvindas', 'nanobemvindo', 'saidas', 'nanosaida', 'autoresposta', 'hidetag', 'marcar', 'delete', 'limpar', 'dectetor', 'revelar'] },
  { id: 'D', titulo: 'SISTEMA NANO', nomes: ['nano', 'nanoadd', 'nanolist', 'nanodel', 'limparnano'] },
  { id: 'E', titulo: 'PROTECÇÕES', nomes: ['antilink', 'antilinkhard', 'anticanal', 'antifoto', 'antivideo', 'antiaudio', 'antisticker', 'antidoc', 'antiviewonce', 'antifake', 'antiflood', 'antipalavrao', 'antidelete', 'automover', 'maxavisos'] },
  { id: 'F', titulo: 'PAGAMENTOS E COMPRAS', nomes: ['compra', 'tabela', 'contas', 'carteira', 'pagamento', 'megas', 'loja', 'saldo', 'addmpesa', 'addemola', 'antiburlador'] },
  { id: 'G', titulo: 'PERMISSÕES SASUKE', nomes: ['liberartodos', 'liberar', 'clientes', 'modolivre', 'bloqueartodos', 'permissoes'] },
  { id: 'H', titulo: 'PROPRIETÁRIO', nomes: ['alugar', 'tirardias', 'anular', 'alugueis', 'conectar', 'qrcode', 'sessoes', 'bangp'] },
  { id: 'I', titulo: 'ANIME', nomes: ['sasuke', 'naruto', 'itachi', 'waifu', 'anime', 'wallpaper', 'quote', 'amv', 'otaku', 'madara', 'kakashi', 'sakura', 'hinata', 'obito'] },
  { id: 'J', titulo: 'GERAL', nomes: ['menu', 'dono', 'sobre', 'ping', 'perfil', 'canal', 'dado', 'moeda', '8ball', 'ranking', 'beijar', 'abraçar', 'socar', 'style-menu', 'jutsu', 'sharingan', 'ship', 'casal', 'daily'] },
  { id: 'K', titulo: 'ALUGUER POR GRUPO', nomes: ['settabela', 'setpagamento', 'setmegas', 'setcontas', 'setcarteira', 'setcompra', 'setloja', 'vertabela', 'limpartabela', 'verloja'] }
];
// L. Conexão & pareamento (novidade V31.2): conectar/sessoes/qrcode já contam em H.
const PAREAMENTO = ['qr', 'pairing', 'pair', 'code', 'conectar', 'desconectar', 'status', 'sessoes', 'qrcode'];

function lista() {
  let n = 0;
  const out = [];
  for (const g of GRUPOS) for (const nome of g.nomes) out.push({ n: ++n, grupo: g.id, titulo: g.titulo, nome });
  return out;
}

module.exports = { GRUPOS, PAREAMENTO, lista };
