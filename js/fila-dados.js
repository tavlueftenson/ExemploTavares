/* Fila de pedidos do protótipo: armazenamento no navegador (localStorage).
   Na versão real, estes dados ficariam num banco (Cloudflare D1) acessível só à equipe. */
(function () {
  "use strict";

  var CHAVE = "apreciatta-fila-v1";
  var PRECO_KG_BOLO = 98;

  var SITUACOES = [
    { id: "novo", nome: "Novo", acao: "Confirmar pedido" },
    { id: "confirmado", nome: "Confirmado", acao: "Iniciar produção" },
    { id: "producao", nome: "Em produção", acao: "Marcar como pronto" },
    { id: "pronto", nome: "Pronto", acao: "Registrar retirada" },
    { id: "retirado", nome: "Retirado", acao: null },
    { id: "cancelado", nome: "Cancelado", acao: null }
  ];
  var ORDEM = SITUACOES.map(function (s) { return s.id; });

  function situacao(id) { return SITUACOES.filter(function (s) { return s.id === id; })[0]; }
  function proxima(id) {
    var i = ORDEM.indexOf(id);
    return i >= 0 && i < 4 ? ORDEM[i + 1] : null;
  }

  // ---------- datas (fuso de Farroupilha) ----------
  function isoMaisDias(iso, n) {
    var p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }
  function diaSemana(iso) {
    var p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  }
  function proximoDiaUtil(iso) { return diaSemana(iso) === 0 ? isoMaisDias(iso, 1) : iso; }
  function hhmm(min) { return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }

  // instante "agora" como ISO com fuso de Brasília, deslocado em minutos
  function agoraISO(deslocMin) {
    return new Date(Date.now() + (deslocMin || 0) * 60000).toISOString();
  }

  // ---------- armazenamento ----------
  function ler() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (s && Array.isArray(s.pedidos)) return s;
    } catch (e) { /* indisponível */ }
    return null;
  }
  function gravar(s) {
    try { localStorage.setItem(CHAVE, JSON.stringify(s)); return true; } catch (e) { return false; }
  }

  // ---------- pedidos de exemplo, relativos ao momento da visita ----------
  function bolo(kg, massa, recheio, cobertura, mensagem, obs) {
    return { kg: kg, massa: massa, recheio: recheio, cobertura: cobertura, mensagem: mensagem || "", obs: obs || "", preco: kg * PRECO_KG_BOLO };
  }
  function item(nome, qtd, preco, unidade) { return { nome: nome, qtd: qtd, preco: preco, unidade: unidade || "" }; }

  function exemplos() {
    var agora = Horario.agora();
    var hoje = proximoDiaUtil(agora.iso);
    var ehHoje = hoje === agora.iso;
    var base = ehHoje ? Math.round(agora.minutos / 30) * 30 : 9 * 60;
    function h(desloc) { return hhmm(Math.min(1110, Math.max(450, base + desloc))); }
    var amanha = proximoDiaUtil(isoMaisDias(hoje, 1));
    var depois = proximoDiaUtil(isoMaisDias(amanha, 1));

    var lista = [
      { nome: "Ana Paula Bertoldi", tel: "(54) 99999-0101", data: hoje, hora: h(-120), sit: "retirado", criado: -26 * 60,
        itens: [item("Pão francês", 2, 9), item("Cuca de uva", 1, 28)], bolos: [], obs: "", avisado: true },
      { nome: "Carlos Zanotto", tel: "(54) 99999-0102", data: hoje, hora: h(-30), sit: "pronto", criado: -20 * 60,
        itens: [item("Mini salgados para festa", 1, 95, "cento"), item("Docinhos finos para festa", 1, 180, "cento")], bolos: [], obs: "Salgados assados, sem frituras.", avisado: false },
      { nome: "Patrícia Menegotto", tel: "(54) 99999-0103", data: hoje, hora: h(30), sit: "cancelado", criado: -18 * 60,
        itens: [item("Torta holandesa", 1, 105)], bolos: [], obs: "Cliente desistiu por telefone." },
      { nome: "Juliana Sartori", tel: "(54) 99999-0104", data: hoje, hora: h(60), sit: "producao", criado: -48 * 60,
        itens: [item("Brigadeiro", 30, 4.5)], bolos: [bolo(2, "Chocolate", "Brigadeiro", "Ganache de chocolate", "Feliz aniversário, Lucas!", "Decoração em tons de azul")], obs: "" },
      { nome: "Roberto Pasqual", tel: "(54) 99999-0105", data: hoje, hora: h(150), sit: "confirmado", criado: -5 * 60,
        itens: [item("Sanduíche natural de frango", 6, 14), item("Pão sovado com salame e queijo", 4, 13)], bolos: [], obs: "Para reunião; embalar separado." },
      { nome: "Fernanda Lazzari", tel: "(54) 99999-0106", data: hoje, hora: h(210), sit: "novo", criado: -40,
        itens: [item("Torta de limão inteira", 1, 85), item("Quindim", 6, 7.5)], bolos: [], obs: "" },
      { nome: "Marcos Dal Pai", tel: "(54) 99999-0107", data: hoje, hora: h(270), sit: "novo", criado: -12,
        itens: [item("Croissant de presunto e queijo", 4, 12), item("Pão caseiro", 1, 14), item("Sonho", 4, 7)], bolos: [], obs: "" },
      { nome: "Luciana Corso", tel: "(54) 99999-0108", data: amanha, hora: "09:00", sit: "confirmado", criado: -30 * 60,
        itens: [item("Docinhos finos para festa", 2, 180, "cento")], bolos: [bolo(3, "Baunilha", "Ninho com morango", "Chantilly", "Parabéns, Helena", "")], obs: "Festa de 15 anos." },
      { nome: "Eduardo Grazziotin", tel: "(54) 99999-0109", data: amanha, hora: "15:00", sit: "novo", criado: -3 * 60,
        itens: [item("Cheesecake de frutas vermelhas", 1, 110), item("Grostoli", 2, 15)], bolos: [], obs: "" },
      { nome: "Camila Fochesatto", tel: "(54) 99999-0110", data: depois, hora: "10:30", sit: "novo", criado: -90,
        itens: [], bolos: [bolo(1.5, "Nozes", "Doce de leite com nozes", "Nozes caramelizadas", "", "Sem escrita, só decoração simples")], obs: "" }
    ];

    var seq = 1040;
    var ordemSit = ORDEM;
    return {
      seq: seq + lista.length,
      pedidos: lista.map(function (p, i) {
        var criado = agoraISO(p.criado);
        var historico = [{ situacao: "novo", em: criado }];
        var alvo = p.sit === "cancelado" ? 0 : ordemSit.indexOf(p.sit);
        for (var k = 1; k <= alvo; k++) historico.push({ situacao: ordemSit[k], em: agoraISO(p.criado + (k * Math.abs(p.criado) / (alvo + 1))) });
        if (p.sit === "cancelado") historico.push({ situacao: "cancelado", em: agoraISO(p.criado / 2) });
        var total = p.itens.reduce(function (s, x) { return s + x.qtd * x.preco; }, 0) + p.bolos.reduce(function (s, b) { return s + b.preco; }, 0);
        return {
          numero: seq + i + 1, criadoEm: criado, origem: "exemplo",
          nome: p.nome, telefone: p.tel, retirada: { data: p.data, hora: p.hora },
          itens: p.itens, bolos: p.bolos, obs: p.obs, total: total,
          situacao: p.sit, historico: historico,
          avisadoEm: p.avisado ? agoraISO(p.criado / 3) : null
        };
      })
    };
  }

  function obter() {
    var s = ler();
    if (!s) { s = exemplos(); gravar(s); }
    return s;
  }

  var FilaDados = {
    situacoes: SITUACOES,
    situacao: situacao,
    proxima: proxima,
    precoKgBolo: PRECO_KG_BOLO,
    isoMaisDias: isoMaisDias,
    diaSemana: diaSemana,

    listar: function () { return obter().pedidos.slice(); },

    buscar: function (numero) {
      return obter().pedidos.filter(function (p) { return p.numero === numero; })[0] || null;
    },

    // pedido vindo do site: { nome, telefone, retirada:{data,hora}, itens:[{nome,qtd,preco,unidade}], bolos:[...], obs }
    adicionar: function (dados) {
      var s = obter();
      s.seq += 1;
      var total = dados.itens.reduce(function (t, x) { return t + x.qtd * x.preco; }, 0) +
                  dados.bolos.reduce(function (t, b) { return t + b.preco; }, 0);
      var p = {
        numero: s.seq, criadoEm: agoraISO(0), origem: "site",
        nome: dados.nome, telefone: dados.telefone || "", retirada: dados.retirada,
        itens: dados.itens, bolos: dados.bolos, obs: dados.obs || "", total: total,
        situacao: "novo", historico: [{ situacao: "novo", em: agoraISO(0) }], avisadoEm: null
      };
      s.pedidos.push(p);
      gravar(s);
      return p;
    },

    mudarSituacao: function (numero, nova) {
      var s = obter();
      var p = s.pedidos.filter(function (x) { return x.numero === numero; })[0];
      if (!p || p.situacao === nova) return p;
      p.situacao = nova;
      p.historico.push({ situacao: nova, em: agoraISO(0) });
      gravar(s);
      return p;
    },

    marcarAvisado: function (numero) {
      var s = obter();
      var p = s.pedidos.filter(function (x) { return x.numero === numero; })[0];
      if (p) { p.avisadoEm = agoraISO(0); gravar(s); }
      return p;
    },

    restaurarExemplos: function () { var s = exemplos(); gravar(s); return s; },

    chave: CHAVE
  };

  window.FilaDados = FilaDados;
})();
