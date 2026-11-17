const cfg = require('../config');
const U = require('./utils');

function menu(S) {
  const p = cfg.prefix;
  const val = S.until ? `${U.left(S.until)} dia(s)` : 'Ilimitada';
  const name = S.name || cfg.botName;
  return `╭━━━〔 🤖 ${name} 〕━━━╮
┃   🛡️ 𝑴𝑬𝑵𝑼 𝑮𝑬𝑺𝑻𝑶𝑹
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭─〔 👤 𝑼𝑺𝑼Á𝑹𝑰𝑶 〕
│ 🤖 Bot: ${name}
│ ⏳ Validade: ${val}
│ ⚙️ Prefixo: "${p}"
│ 🌀 Versão: ${cfg.versao} · ${cfg.core}
╰────────────────────

╭─〔 📚 𝑰𝑵𝑭𝑶𝑹𝑴𝑨ÇÕ𝑬𝑺 〕
│ • ${p}cmdinfo nome
│ • ${p}cmdlist
│ • ${p}dono
╰────────────────────

╭─〔 💰 𝑽𝑬𝑵𝑫𝑨𝑺 〕
│ • ${p}tabela
│ • ${p}pagamento
│ • ${p}compra 5gb
│ • ${p}anular
│ • ${p}resumo
│ • ${p}top
│ • ${p}estatística
│ • ${p}resumohoje
│ • ${p}clientes
│ • ${p}histórico
│ • ${p}extrato
│ • ${p}desempenho
│ • ${p}picos
│ • ${p}topdia
│ • ${p}topsemana
│ • ${p}topmes
│ • ${p}topmelhor
╰────────────────────

╭─〔 🛒 𝑪𝑶𝑴𝑷𝑹𝑨𝑺 〕
│ • ${p}compras on/off
│ • ${p}ativar compra MB
│ • ${p}status compra
│ • ${p}limparhistórico
│ • ${p}limpar 84xx
│ • ${p}limparhistóricomb
│ • ${p}limparhistóricosaldo
│ • ${p}limparmb 84xx
│ • ${p}limparsaldo 84xx
╰────────────────────

╭─〔 ⚙️ 𝑨𝑫𝑴𝑰𝑵𝑰𝑺𝑻𝑹𝑨ÇÃ𝑶 〕
│ • ${p}bot
│ • ${p}ban @
│ • ${p}abrir / ${p}fechar
│ • ${p}grupo a / ${p}grupo f
│ • ${p}open / ${p}close
│ • ${p}todos
│ • ${p}sobre
│ • ${p}linkgp
│ • ${p}status
│ • ${p}uptime
│ • ${p}bot on/off
│ • ${p}inativos
│ • ${p}ativos
│ • ${p}limparchat
╰────────────────────

╭─〔 🤖 𝑭𝑼𝑵ÇÕ𝑬𝑺 𝑨𝑼𝑻𝑶 〕
│ • ${p}pagamento on/off
│ • ${p}autoreply on/off
│ • ${p}saudação on/off
│ • ${p}boasvindas on/off
│ • ${p}boaspersonalizado on/off
│ • ${p}antiestrangeiro on/off
│ • ${p}anticoncorrencia on/off
│ • ${p}antiburlador on/off
│ • ${p}soadmin on/off
╰────────────────────

╭─〔 👋 𝑩𝑶𝑨𝑺-𝑽𝑰𝑵𝑫𝑨𝑺 〕
│ • ${p}boaspersonalizar
│ • ${p}boasnomeative
│ • ${p}boasnomedesative
│ • ${p}boasmembroactive
│ • ${p}boasmembrodesactive
╰────────────────────

╭─〔 💬 𝑨𝑼𝑻𝑶𝑹𝑬𝑷𝑳𝒀 〕
│ • ${p}reply on/off
│ • ${p}reply gatilho
│ • ${p}replyremove gatilho
│ • ${p}replylimpar
│ • ${p}replyver
│ • ${p}salvartabela
│ • ${p}vertabela
│ • ${p}limpartabela
╰────────────────────

╭─〔 🧩 𝑷𝑬𝑹𝑺𝑶𝑵𝑨𝑳𝑰𝒁𝑨ÇÃ𝑶 〕
│ • ${p}saudaçãopersonalizar
│ • ${p}saudaçãolimpar
╰────────────────────

╭─〔 💳 𝑪𝑶𝑴𝑷𝑹𝑶𝑽𝑨𝑻𝑰𝑽𝑶 〕
│ • ${p}comprovativo on/off
│ • ${p}antiduplicado on/off
│ • ${p}mpesa 84xx-nome
│ • ${p}emola 87xx-nome
│ • ${p}formasdeplist
│ • ${p}rmformas mpesa/emola
╰────────────────────

╭─〔 🛡️ 𝑷𝑹𝑶𝑻𝑬ÇÃ𝑶 〕
│ • ${p}prefixo 258
│ • ${p}antiestban
│ • ${p}antiestrelatorio
│ • ${p}antiestreset
│ • ${p}antipalavra on/off
│ • ${p}antipalavraban
│ • ${p}antipalavrarelatorio
│ • ${p}palavra x
│ • ${p}palavraslist
│ • ${p}palavraslimpar
│ • ${p}antilink on/off
│ • ${p}antilinktentativas 3
│ • ${p}antilinkban
│ • ${p}antilinkaviso
│ • ${p}antilinknormal
│ • ${p}antitabela on/off
│ • ${p}antitabnormal
│ • ${p}antitabban
│ • ${p}antiaudio on/off
╰────────────────────

╭─〔 🎯 𝑴𝑬𝑻𝑨𝑺 〕
│ • ${p}definirmetadia 1GB
│ • ${p}definirmetasemana 10GB
│ • ${p}definirmetamensal 50GB
│ • ${p}vermetadia
│ • ${p}vermetasemana
│ • ${p}vermetamensal
│ • ${p}vermetas
│ • ${p}apagarmetadia
│ • ${p}apagarmetasemana
│ • ${p}apagarmetamensal
╰────────────────────

╭─〔 👥 𝑺𝑬𝑴 𝑪𝑶𝑴𝑷𝑹𝑨 〕
│ • ${p}listasemcompra
│ • ${p}semcomprarm 1,2
│ • ${p}semcompraban
│ • ${p}semcompra on/off
│ • ${p}semcompratime
│ • ${p}semcomprareset
╰────────────────────

╭─〔 📆 𝑨𝑮𝑬𝑵𝑫𝑨𝑹 〕
│ • ${p}anunciar
│ • ${p}anunciar listar
│ • ${p}status anunciar
│ • ${p}anunciar remover nome
│ • ${p}anunciar limpar
╰────────────────────

╭─〔 👑 𝑨𝑫𝑴𝑺 〕
│ • ${p}add admfixo
│ • ${p}remover admfixo
│ • ${p}listadmfixo
│ • ${p}limparadmfixo
│ • ${p}promover
│ • ${p}despromover
╰────────────────────

╭─〔 🧰 𝑶𝑼𝑻𝑹𝑶𝑺 〕
│ • ${p}kick @
│ • ${p}add 258...
│ • ${p}mute @
│ • ${p}unmute @
│ • ${p}banlist
│ • ${p}unban @
│ • ${p}admins
│ • ${p}membros
│ • ${p}online
│ • ${p}rank
│ • ${p}nome
│ • ${p}desc
│ • ${p}novolink
│ • ${p}infogp
│ • ${p}abrirhorario HH:MM
│ • ${p}fecharhorario HH:MM
│ • ${p}maxavisos N
│ • ${p}delete
│ • ${p}config
│ • ${p}editarconfig
│ • ${p}removerconfig
│ • ${p}enviar
│ • ${p}rejeitar
│ • ${p}relatorio
│ • ${p}carteira
│ • ${p}deposit
│ • ${p}nanobemvindo
│ • ${p}nanosaida
│ • ${p}perfil
│ • ${p}foto
│ • ${p}id
│ • ${p}ping
│ • ${p}horas
│ • ${p}alugueis
╰────────────────────

╭─〔 📝 𝑻𝑬𝑿𝑻𝑶𝑺 𝑫𝑶 𝑮𝑹𝑼𝑷𝑶 〕
│ • ${p}settabela
│ • ${p}setpagamento
│ • ${p}setmegas
│ • ${p}setcontas
│ • ${p}setcarteira
│ • ${p}setcompra
│ • ${p}setloja
│ • ${p}megas
│ • ${p}contas
│ • ${p}saldo
│ • ${p}verloja
│ • ${p}addmpesa
│ • ${p}addemola
│ • ${p}compra meus
│ • ${p}compra ranking
╰────────────────────

╭─〔 💬 𝑴𝑬𝑵𝑺𝑨𝑮𝑬𝑵𝑺 〕
│ • ${p}hidetag
│ • ${p}dectetor
│ • ${p}revelar
│ • ${p}saidas
│ • ${p}limpar
│ • ${p}link
│ • ${p}autoresposta on/off
╰────────────────────

╭─〔 🧩 𝑺𝑰𝑺𝑻𝑬𝑴𝑨 𝑵𝑨𝑵𝑶 〕
│ • ${p}nano
│ • ${p}nanoadd
│ • ${p}nanolist
│ • ${p}nanodel
│ • ${p}limparnano
╰────────────────────

╭─〔 🔑 𝑷𝑬𝑹𝑴𝑰𝑺𝑺Õ𝑬𝑺 〕
│ • ${p}liberar
│ • ${p}liberartodos
│ • ${p}bloqueartodos
│ • ${p}modolivre
│ • ${p}permissoes
╰────────────────────

╭─〔 🛡️ 𝑷𝑹𝑶𝑻𝑬ÇÃ𝑶 𝑬𝑿𝑻𝑹𝑨 〕
│ • ${p}antilinkhard on/off
│ • ${p}anticanal on/off
│ • ${p}antifoto on/off
│ • ${p}antivideo on/off
│ • ${p}antisticker on/off
│ • ${p}antidoc on/off
│ • ${p}antiviewonce on/off
│ • ${p}antifake on/off
│ • ${p}antiflood on/off
│ • ${p}antipalavrao on/off
│ • ${p}antidelete on/off
│ • ${p}automover on/off
╰────────────────────

╭─〔 🎌 𝑨𝑵𝑰𝑴𝑬 〕
│ • ${p}sasuke
│ • ${p}naruto
│ • ${p}itachi
│ • ${p}madara
│ • ${p}kakashi
│ • ${p}sakura
│ • ${p}hinata
│ • ${p}obito
│ • ${p}waifu
│ • ${p}anime nome
│ • ${p}wallpaper
│ • ${p}quote
│ • ${p}amv nome
│ • ${p}otaku
╰────────────────────

╭─〔 🎮 𝑫𝑰𝑽𝑬𝑹𝑺Ã𝑶 〕
│ • ${p}dado
│ • ${p}moeda
│ • ${p}8ball
│ • ${p}beijar @
│ • ${p}abraçar @
│ • ${p}socar @
│ • ${p}jutsu
│ • ${p}sharingan
│ • ${p}ship @
│ • ${p}casal
│ • ${p}daily
│ • ${p}style-menu
│ • ${p}canal
╰────────────────────

╭─〔 🎁 𝑻𝑬𝑺𝑻𝑬 𝑮𝑹Á𝑻𝑰𝑺 〕
│ • ${p}teste
╰────────────────────

╭─〔 🔐 𝑨𝑪𝑬𝑺𝑺𝑶 〕
│ 👑 Só donos: ${p}menudono
│ 🛡️ Só admins: ${p}menugestor
│ ℹ️ Ajuda: ${p}cmdinfo nome
╰────────────────────

╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🤖 ${name}
┃ 📞 ${cfg.contato}
┃ ⚡ Rápido • Inteligente • Automático
╰━━━━━━━━━━━━━━━━━━━━━━╯`;
}
// separa o cabecalho (vai como legenda da foto) do resto do menu
menu.parts = (S) => { const t = menu(S); const i = t.indexOf('\n\n╭─〔 📚'); return [t.slice(0, i), t.slice(i + 2)]; };
module.exports = menu;
