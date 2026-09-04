# PetShop Web — Envio em Lote WhatsApp (extensão)

Extensão de navegador (Chrome/Edge, Manifest V3) que automatiza o envio de
lembretes de estimativa em lote, usando a aba do **WhatsApp Web já logada**
no navegador. Não usa nenhuma API oficial do WhatsApp, não guarda senha nem
token — só controla a aba e clica em "Enviar" pra você, com um intervalo
aleatório entre uma mensagem e outra.

## Como instalar (modo desenvolvedor)

1. Abra `chrome://extensions` (ou `edge://extensions`).
2. Ative o **"Modo do desenvolvedor"** (canto superior direito).
3. Clique em **"Carregar sem compactação"** (Load unpacked) e selecione esta
   pasta (`whatsapp-extension/`).
4. A extensão vai aparecer na lista com um ID gerado automaticamente
   (algo como `abcdefghijklmnopqrstuvwxyzabcdef`) — copie esse ID.
5. No PetShop Web, abra **Estimativas → Enviar selecionadas**, cole o ID no
   campo "ID da extensão" e clique em "Testar conexão".

## Antes de usar em produção

Edite `manifest.json` e troque `SEU-DOMINIO-DE-PRODUCAO-AQUI` pelo domínio
real onde o petshop_web roda (ex.: `https://petshop.seudominio.com.br`),
depois recarregue a extensão em `chrome://extensions` (botão de recarregar
no card da extensão). Sem isso, a extensão só aceita conexão vinda de
`localhost` (ambiente de desenvolvimento).

## Requisitos de uso

- Precisa ter o **WhatsApp Web já escaneado/logado** pelo menos uma vez nesse
  navegador (a extensão abre/usa uma aba `web.whatsapp.com`, mas quem faz o
  login continua sendo você, manualmente).
- Deixe o navegador aberto durante o envio do lote — a aba do WhatsApp Web
  pode ficar em segundo plano, mas não pode ser fechada.
- Evite volumes muito altos por dia. O intervalo entre mensagens é
  configurável (padrão 10–20s aleatório) especificamente para reduzir o
  padrão de envio automatizado, mas o WhatsApp pode banir números que
  enviam em lote de forma repetida — use com moderação.

## Como funciona por baixo dos panos

- O petshop_web se conecta à extensão via `chrome.runtime.connect` (API
  `externally_connectable` do Manifest V3) — não existe content script
  rodando dentro do petshop_web, só a extensão conversando com a página por
  esse canal quando ela mesma inicia a conexão.
- Para cada item da fila, a extensão navega a aba do WhatsApp Web para
  `https://web.whatsapp.com/send/?phone=...&text=...`, espera o chat abrir e
  clica no botão de enviar. Se o WhatsApp acusar número inválido, marca o
  item como erro e segue para o próximo — um erro não trava o lote.
- O progresso (aguardando / enviando / enviado / erro / telefone inválido)
  é reportado em tempo real de volta para a tela de Estimativas.
