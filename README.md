# ExemploTavares: site demonstrativo da Apreciatta

Site de exemplo para a Apreciatta, padaria e confeitaria em Farroupilha (RS). **Não é o site oficial**; cardápio e preços são ilustrativos.

Publicado em: https://tavlueftenson.github.io/ExemploTavares/

## Páginas

- **Início** (`index.html`): história, destaques da vitrine, galeria de fotos, horários, contatos e mapa.
- **Faça um pedido** (`pedido.html`): cardápio com carrinho, bolo sob encomenda (massa, recheio, cobertura e tamanho), retirada na loja e envio do pedido pronto pelo WhatsApp. Fora do horário de atendimento do WhatsApp, o site avisa quando o pedido será respondido.

- **Área da equipe** (`fila.html`, protótipo): fila de pedidos com filtros por dia e situação, alteração de situação (novo, confirmado, em produção, pronto, retirado, cancelado), prévia da mensagem de WhatsApp de pedido pronto, impressão da comanda (80 mm), da lista de produção do dia e da fila em A4. Na versão real seria restrita aos funcionários, com login; no protótipo, a entrada é simulada e os dados ficam só no navegador (`localStorage`). Pedidos feitos na aba "Faça um pedido" com o botão "Enviar para a fila (demonstração)" aparecem no painel.

## Como editar

- Cardápio, preços, tamanhos de bolo e preço por quilo: início de `js/pedido.js`.
- Horários da loja e do WhatsApp: início de `js/comum.js`.
- Cores e fontes: início de `css/estilo.css`; estilos do painel em `css/fila.css`.
- Pedidos de exemplo da fila e situações: `js/fila-dados.js`.

Site estático, sem dependências externas além do mapa do Google. Fontes Great Vibes e Jost hospedadas no próprio repositório (licença SIL Open Font License, em `fontes/`).
