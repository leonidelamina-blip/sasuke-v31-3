# 🩸 SASUKE V31.2 — SHADOW GOD (CORE 77)

Bot multi-sessão de WhatsApp para grupos de venda de megas. Dono: **Leo** (852223969) · Bot: **Sasuke** (872698781).
228 comandos: os 120 oficiais + pareamento + extras. Verifique com `npm run auditoria`.

## 1. Instalar (Wispbyte / Pterodactyl / Termux / PC)
1. Envie o zip e **extraia de modo que `index.js` fique na RAIZ** (não dentro de uma subpasta!).
   Se aparecer `Cannot find module '/home/container/index.js'`, os arquivos ficaram numa subpasta: mova-os para a raiz.
2. Arquivo principal (`JS_FILE`): `index.js`. O painel corre `npm install` sozinho. Node ≥ 18 (o aviso `EBADENGINE` com Node 19 é inofensivo; se o painel permitir, escolha Node 20 ou 22).
3. Inicie. Na 1.ª vez o console mostra só o **PAIRING CODE** (sem QR; `conexao.modo` = `pairing` por defeito):
   WhatsApp do bot (872698781) > Aparelhos conectados > Conectar com número de telefone > escreva o código (use a linha `COPIAR (sem hífen)`).
   O código vale ~2 min; se expirar o bot gera outro sozinho (até 3). A linha *"sessão main: terminada no telemóvel; a limpar credenciais"* é normal se havia sessão antiga.
4. Teste: `.menu` · `.ping` · `.dono`.

### Teste rápido no telemóvel (Termux) — descobre se o problema é a hospedagem
Hospedagens grátis partilham IPs de servidor que o WhatsApp às vezes recusa no pareamento. No Termux o bot sai pela rede do seu telemóvel:
`termux-setup-storage` · `mkdir -p ~/sasuke && cd ~/sasuke` · `unzip -o ~/storage/downloads/sasuke-v31_2-completo.zip` · `bash termux.sh`
Se aparecer `dispositivo ASSOCIADO` no Termux e falhar no painel, a causa é o IP da hospedagem. O Termux só funciona enquanto o telemóvel estiver ligado e com o Termux aberto.

### Problemas comuns no Wispbyte / Pterodactyl
| Erro no console | Causa | Solução |
|---|---|---|
| `Cannot find module '/home/container/index.js'` | zip extraído dentro de uma subpasta | mova tudo para a raiz |
| `npm ERR! ENOTEMPTY ... rename ... node_modules/axios` e depois `Cannot find module '@whiskeysockets/baileys'` | instalação interrompida deixou o `node_modules` a meio | **apague a pasta `node_modules`** e reinicie (o bot também se repara sozinho) |
| banner "Pacote @whiskeysockets/baileys ausente" | o painel só detetou que o npm falhou | **não** adicione o pacote em *Startup > Pacotes* (instala o Baileys 7, incompatível, e duplica a instalação). Deixe *Pacotes* vazio |
| muitos avisos `EBADENGINE` | imagem Node 19 (já sem suporte) | *Startup > Imagem Docker*: escolha **Node 20 ou 22** |
| WhatsApp diz **"Não foi possível associar o dispositivo"** com o código certo | o código só funciona no WhatsApp **do número para o qual foi gerado** (linha `Gerado para o número` no console) | confira em WhatsApp > Definições qual é o número do telefone onde está a digitar. Tem de ser o mesmo. Se for outro, use esse telefone **ou** troque o número: `config.json > bot.numeroIntl` (ou variável `SASUKE_NUMERO=258XXXXXXXXX`) e reinicie |
| continua a falhar | limite de 4 aparelhos conectados, WhatsApp desatualizado, ou código antigo (cada reinício gera um novo) | remova um aparelho em *Aparelhos conectados*, atualize o WhatsApp, e use sempre o **último** código do console (não reinicie entre gerar e digitar) |
O `.npmrc` já desliga auditoria e barras de progresso (menos lixo no console e menos memória).

## 2. config.json (fonte única)
`bot` (nome, marca d'água, número), `dono`, `canal`, `menu.legendaMax`, `conexao.modo` (`pairing`|`qr`|`ambos`, ou variável `SASUKE_MODO`),
`humano` (ativo/escala: 1 normal, 2 mais lento, 0 sem espera), `regiao` (fuso, DDI, moeda).
O número do bot e o do dono **não podem ser iguais**.

## 3. Pastas
`assets/sasuke.jpg` foto do bot (abre o .menu) · `assets/dono.jpg` foto do dono · `assets/anime/*.jpg` fotos dos personagens (falta **hinata.jpg**) ·
`auth/` sessão principal · `sessoes/` bots dos clientes · `database/` dados + `.bak` + `backups/` (a cada 6 h, guarda 10).

## 4. Regras do projeto
- Todo comando reage com emoji, responde "tipo humano" (lida, a escrever…, espera) e termina com a marca `sᴀsᴜᴋᴇ`.
- Nada vem configurado: preços, pagamentos, textos são **por grupo**. Sem configuração: *"Este grupo ainda não configurou esta informação. Um administrador pode utilizar o comando correspondente."*
- O link do canal **só** aparece em `.canal`, no aviso de aluguel/teste expirado e no anúncio periódico (secção 5b).
- Foto em falta → erro explícito, nunca finge que enviou.
- **Só o dono** usa `.conectar .qrcode .alugar .tirardias .sessoes .desconectar` (e só na sessão principal). Para os outros o bot ignora, sem resposta.

## 5. Aluguel e pareamento (só o dono)
`.conectar 258841234567 30 BOT-JONAS` código · `.qrcode 30 Nome` QR em imagem · `.sessoes` · `.alugar <num> <dias>` · `.tirardias` · `.anular <num>` (privado) · `.desconectar <num>` · `.bangp` (no grupo).
Avisos ao dono do bot e a si aos 3 dias, 1 dia e ao expirar. Expirado = bot **congelado** (nem o dono do bot usa); livres: `.alugueis .dono .criador .canal`. Nada é apagado; `.alugar` reativa na hora.

## 5b. Teste grátis (24 h) e anúncios
- **Teste grátis:** quem nunca alugou envia `.teste` no **privado** do bot principal (872698781). Recebe um código de pareamento e ganha **24 h** com o próprio número (as horas contam a partir da ligação).
  1 teste por número e por pessoa · máx. 10 testes ao mesmo tempo · não ligou em 30 min → limpo e o direito é devolvido · avisos às 3 h, 1 h e ao terminar (o dono recebe o *lead* para oferecer o aluguel).
  Dono: `.teste on/off` · `.testes` · `.resetteste <num>` · `.alugar <num> <dias>` converte o teste em aluguel (tira os anúncios).
  Durante o teste o `.broadcast` fica bloqueado. Sessões expiradas há mais de 3 dias são apagadas.
- **Anúncios:** a cada **7 comandos executados** num chat o bot envia uma *Publicidade · Canal Oficial* (3 textos que se alternam, com o link do canal e, no teste, o tempo restante).
  Por defeito só em bots de **teste**; clientes pagantes e o bot principal não veem. Em `config.json > anuncio`: `cadaComandos`, `paraAlugados`, `naSessaoPrincipal`, `ativo`.
  `.canal`, `.dono`, `.criador`, `.alugueis` e `.teste` não contam.

## 6. Vendas
`.setmegas 1GB=45, 5GB=190` (ou texto livre) · `.settabela` · `.mpesa 84xxxxxxx-Nome` / `.addmpesa` · `.emola` / `.addemola` · `.setpagamento .setcontas .setcarteira .setcompra .setloja`.
Cliente: `.compra 5gb` → paga → cola o SMS → o bot valida (conta, valor, ID repetido) → admin envia e usa `.enviar @cliente`.
`.compra` **não** regista nada sem pagamento verificado (corrigido: antes qualquer um inflava o ranking).
Entrega automática: ligue a API do fornecedor em `src/lib/deliver.js` e use `.pagamento on`.

## 7. Interpretações (confirme)
`automover` = remover automaticamente quem atinge `maxavisos` · `nanobemvindo/nanosaida` = boas-vindas curta / saída · `soadmin` = bot ignora comandos de membros ·
`anticoncorrencia` = apaga anúncios de venda de megas de outros · `nano*` = comandos criados pelo próprio grupo · `style-menu 1|2` = menu em caixas ou compacto.

## 8. Testes
`npm test` (172 verificações com WhatsApp simulado) · `npm run auditoria`.
**Aviso:** o Baileys não é oficial — há risco de banimento; use números dedicados. Anime (`.waifu`, `.anime`) precisa de internet.
