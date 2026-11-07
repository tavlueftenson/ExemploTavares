/* Página "Faça um pedido": cardápio, bolo sob encomenda, retirada e envio pelo WhatsApp */
(function () {
  "use strict";

  var WHATSAPP = "5554999107060";
  var CHAVE = "apreciatta-pedido-v1";
  var PRECO_KG_BOLO = 98;
  var ANTECEDENCIA_BOLO = 2; // dias

  // Cardápio ilustrativo (preços fictícios)
  var CARDAPIO = [
    { cat: "Pães e cucas", itens: [
      { id: "pao-frances", nome: "Pão francês", desc: "Pacote com 10 unidades", preco: 9.0 },
      { id: "pao-caseiro", nome: "Pão caseiro", desc: "Massa fofinha, cerca de 500 g", preco: 14.0 },
      { id: "pao-integral", nome: "Pão integral com grãos", desc: "Linhaça, gergelim e aveia", preco: 16.5 },
      { id: "cuca-uva", nome: "Cuca de uva", desc: "Com farofa crocante", preco: 28.0 },
      { id: "cuca-doce-leite", nome: "Cuca de doce de leite", desc: "Recheio cremoso", preco: 30.0 },
      { id: "grostoli", nome: "Grostoli", desc: "Pacote com cerca de 300 g", preco: 15.0 }
    ]},
    { cat: "Salgados", itens: [
      { id: "coxinha", nome: "Coxinha de frango", desc: "Frita na hora", preco: 7.5 },
      { id: "empada", nome: "Empada de frango", desc: "Massa podre amanteigada", preco: 8.0 },
      { id: "pastel-forno", nome: "Pastel de forno de carne", desc: "Assado", preco: 7.5 },
      { id: "esfiha", nome: "Esfiha aberta de carne", desc: "Temperada com limão e hortelã", preco: 7.0 },
      { id: "mini-salgados", nome: "Mini salgados para festa", desc: "Cento sortido, fritos ou assados", preco: 95.0, unidade: "cento" }
    ]},
    { cat: "Sanduíches", itens: [
      { id: "natural-frango", nome: "Sanduíche natural de frango", desc: "Pão de forma, frango, cenoura e alface", preco: 14.0 },
      { id: "natural-atum", nome: "Sanduíche natural de atum", desc: "Pão integral, atum e maionese leve", preco: 15.0 },
      { id: "croissant-pq", nome: "Croissant de presunto e queijo", desc: "Folhado na manteiga", preco: 12.0 },
      { id: "pao-sovado-salame", nome: "Pão sovado com salame e queijo", desc: "Um clássico da Serra", preco: 13.0 }
    ]},
    { cat: "Doces", itens: [
      { id: "brigadeiro", nome: "Brigadeiro", desc: "Unidade", preco: 4.5 },
      { id: "docinhos-cento", nome: "Docinhos finos para festa", desc: "Cento sortido", preco: 180.0, unidade: "cento" },
      { id: "sonho", nome: "Sonho", desc: "Creme de baunilha", preco: 7.0 },
      { id: "cupcake", nome: "Cupcake", desc: "Chocolate ou baunilha", preco: 9.5 },
      { id: "quindim", nome: "Quindim", desc: "Unidade", preco: 7.5 },
      { id: "mil-folhas", nome: "Mil-folhas", desc: "Massa folhada e creme", preco: 12.0 }
    ]},
    { cat: "Bolos e tortas", itens: [
      { id: "fatia-chocolate", nome: "Fatia de bolo de chocolate", desc: "Com brigadeiro", preco: 16.0 },
      { id: "fatia-nozes", nome: "Fatia de torta de nozes", desc: "Doce de leite e nozes", preco: 17.0 },
      { id: "torta-limao", nome: "Torta de limão inteira", desc: "Cerca de 1 kg, serve 10 pessoas", preco: 85.0 },
      { id: "cheesecake", nome: "Cheesecake de frutas vermelhas", desc: "Inteira, cerca de 1,2 kg", preco: 110.0 },
      { id: "torta-holandesa", nome: "Torta holandesa", desc: "Inteira, cerca de 1,2 kg", preco: 105.0 }
    ]}
  ];

  var TAMANHOS = [
    { kg: 1, fatias: "8 a 10 fatias" },
    { kg: 1.5, fatias: "12 a 15 fatias" },
    { kg: 2, fatias: "16 a 20 fatias" },
    { kg: 3, fatias: "25 a 30 fatias" }
  ];

  var PRODUTOS = {};
  CARDAPIO.forEach(function (g) { g.itens.forEach(function (i) { PRODUTOS[i.id] = i; }); });

  // ---------- estado ----------
  var estado = { itens: {}, bolos: [], retirada: { nome: "", telefone: "", data: "", hora: "", obs: "" } };

  function carregar() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (s && typeof s === "object") {
        estado.itens = s.itens || {};
        estado.bolos = Array.isArray(s.bolos) ? s.bolos : [];
        estado.retirada = Object.assign(estado.retirada, s.retirada || {});
        Object.keys(estado.itens).forEach(function (k) { if (!PRODUTOS[k]) delete estado.itens[k]; });
      }
    } catch (e) { /* armazenamento indisponível */ }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* ignora */ }
  }

  // ---------- utilitários ----------
  var moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function brl(v) { return moeda.format(v); }
  function kgTexto(kg) { return String(kg).replace(".", ",") + " kg"; }
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "texto") e.textContent = attrs[k];
      else if (k === "classe") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) e.appendChild(typeof f === "string" ? document.createTextNode(f) : f); });
    return e;
  }

  function isoMaisDias(iso, n) {
    var p = iso.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function diaSemanaDe(iso) {
    var p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  }
  function dataExtenso(iso) {
    var p = iso.split("-");
    return Horario.dias[diaSemanaDe(iso)] + ", " + p[2] + "/" + p[1] + "/" + p[0];
  }

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("mostrar");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("mostrar"); }, 2200);
  }

  // ---------- cardápio ----------
  function montarCardapio() {
    var filtros = $("filtros"), lista = $("lista-cardapio");
    var cats = ["Todos"].concat(CARDAPIO.map(function (g) { return g.cat; }));
    cats.forEach(function (c, i) {
      var b = el("button", { type: "button", "aria-pressed": i === 0 ? "true" : "false", texto: c });
      b.addEventListener("click", function () {
        filtros.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        lista.querySelectorAll(".cardapio-grupo").forEach(function (g) {
          g.hidden = !(c === "Todos" || g.dataset.cat === c);
        });
      });
      filtros.appendChild(b);
    });

    CARDAPIO.forEach(function (g) {
      var grupo = el("div", { classe: "cardapio-grupo", "data-cat": g.cat }, [el("h3", { texto: g.cat })]);
      g.itens.forEach(function (p) {
        var preco = el("div", { classe: "preco" }, [brl(p.preco)]);
        if (p.unidade) preco.appendChild(el("small", { texto: " o " + p.unidade }));
        var qtd = el("output", { "aria-live": "polite", id: "qtd-" + p.id, texto: "0" });
        var menos = el("button", { type: "button", classe: "menos", "aria-label": "Remover uma unidade de " + p.nome, texto: "−" });
        var mais = el("button", { type: "button", classe: "mais", "aria-label": "Adicionar uma unidade de " + p.nome, texto: "+" });
        var controle = el("div", { classe: "quantidade", "data-id": p.id }, [menos, qtd, mais]);
        menos.addEventListener("click", function () { alterar(p.id, -1); });
        mais.addEventListener("click", function () { alterar(p.id, +1); });
        grupo.appendChild(el("div", { classe: "item" }, [
          el("div", null, [el("div", { classe: "nome", texto: p.nome }), el("div", { classe: "desc", texto: p.desc }), preco]),
          controle
        ]));
      });
      lista.appendChild(grupo);
    });
  }

  function alterar(id, delta) {
    var n = Math.max(0, Math.min(99, (estado.itens[id] || 0) + delta));
    if (n === 0) delete estado.itens[id]; else estado.itens[id] = n;
    salvar();
    atualizar();
    if (delta > 0 && n === 1) toast(PRODUTOS[id].nome + " adicionado ao pedido");
  }

  // ---------- bolo ----------
  function montarBolo() {
    var cont = $("bolo-tamanhos");
    TAMANHOS.forEach(function (t, i) {
      var id = "tam-" + i;
      var input = el("input", { type: "radio", name: "tamanho", id: id, value: String(t.kg) });
      if (i === 1) input.checked = true;
      var label = el("label", { for: id }, [el("strong", { texto: kgTexto(t.kg) }), el("span", { texto: t.fatias })]);
      cont.appendChild(input); cont.appendChild(label);
      input.addEventListener("change", valorBolo);
    });
    valorBolo();
    $("form-bolo").addEventListener("submit", function (e) {
      e.preventDefault();
      var kg = Number(document.querySelector("input[name=tamanho]:checked").value);
      estado.bolos.push({
        massa: $("bolo-massa").value,
        recheio: $("bolo-recheio").value,
        cobertura: $("bolo-cobertura").value,
        kg: kg,
        mensagem: $("bolo-mensagem").value.trim(),
        obs: $("bolo-obs").value.trim()
      });
      $("bolo-mensagem").value = "";
      $("bolo-obs").value = "";
      salvar();
      atualizar();
      atualizarDatas();
      toast("Bolo de " + kgTexto(kg) + " adicionado ao pedido");
    });
  }
  function valorBolo() {
    var sel = document.querySelector("input[name=tamanho]:checked");
    $("bolo-valor").textContent = brl(Number(sel.value) * PRECO_KG_BOLO);
  }

  // ---------- retirada ----------
  function dataMinima() {
    var hoje = Horario.agora().iso;
    return estado.bolos.length ? isoMaisDias(hoje, ANTECEDENCIA_BOLO) : hoje;
  }

  function atualizarDatas() {
    var input = $("data");
    var min = dataMinima();
    input.min = min;
    input.max = isoMaisDias(Horario.agora().iso, 60);
    $("ajuda-data").textContent = estado.bolos.length
      ? "Com bolo sob encomenda, a retirada é a partir de " + dataExtenso(min).replace(/^[^,]+, /, "") + ". Não abrimos aos domingos."
      : "Não abrimos aos domingos.";
    if (input.value) validarData(false);
  }

  function validarData(mostrar) {
    var v = $("data").value, msg = "";
    if (!v) msg = "Escolha o dia da retirada.";
    else if (v < dataMinima()) msg = estado.bolos.length
      ? "Bolos sob encomenda precisam de " + ANTECEDENCIA_BOLO + " dias de antecedência."
      : "Escolha uma data a partir de hoje.";
    else if (diaSemanaDe(v) === 0) msg = "A loja não abre aos domingos. Escolha outro dia.";
    if (mostrar !== false || $("erro-data").textContent) {
      $("erro-data").textContent = msg;
      $("data").setAttribute("aria-invalid", msg ? "true" : "false");
    }
    return !msg;
  }

  function montarHorarios() {
    var sel = $("hora"), v = $("data").value, anterior = estado.retirada.hora;
    sel.innerHTML = "";
    if (!v || !validarData(false) || diaSemanaDe(v) === 0) {
      sel.appendChild(el("option", { value: "", texto: v ? "Escolha um dia válido" : "Escolha o dia primeiro" }));
      return;
    }
    var faixa = Horario.loja[diaSemanaDe(v)];
    var agora = Horario.agora();
    var inicio = faixa[0] + 30, fim = faixa[1] - 15;
    if (v === agora.iso) inicio = Math.max(inicio, Math.ceil((agora.minutos + 60) / 30) * 30);
    var opcoes = [];
    for (var m = inicio; m <= fim; m += 30) opcoes.push(m);
    if (!opcoes.length) {
      sel.appendChild(el("option", { value: "", texto: "Sem horários hoje; escolha outro dia" }));
      return;
    }
    sel.appendChild(el("option", { value: "", texto: "Escolha o horário" }));
    opcoes.forEach(function (m) {
      var txt = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
      var o = el("option", { value: txt, texto: txt });
      if (txt === anterior) o.selected = true;
      sel.appendChild(o);
    });
  }

  function ligarRetirada() {
    var r = estado.retirada;
    $("nome").value = r.nome; $("telefone").value = r.telefone; $("observacoes").value = r.obs;
    if (r.data && r.data >= dataMinima()) $("data").value = r.data;
    montarHorarios();

    $("nome").addEventListener("input", function () {
      r.nome = this.value; salvar();
      if (this.value.trim()) { $("erro-nome").textContent = ""; this.setAttribute("aria-invalid", "false"); }
    });
    $("telefone").addEventListener("input", function () { r.telefone = this.value; salvar(); });
    $("observacoes").addEventListener("input", function () { r.obs = this.value; salvar(); });
    $("data").addEventListener("change", function () {
      r.data = this.value; validarData(true); montarHorarios();
      r.hora = $("hora").value; salvar(); resumoRetirada();
    });
    $("hora").addEventListener("change", function () {
      r.hora = this.value; salvar(); resumoRetirada();
      if (this.value) { $("erro-hora").textContent = ""; this.setAttribute("aria-invalid", "false"); }
    });
  }

  function resumoRetirada() {
    var r = estado.retirada, box = $("resumo-retirada");
    box.textContent = r.data && r.hora && validarData(false)
      ? "Retirada: " + dataExtenso(r.data) + ", às " + r.hora + "."
      : "Retirada: escolha o dia e o horário.";
  }

  // ---------- resumo ----------
  function linhasPedido() {
    var linhas = [];
    Object.keys(estado.itens).forEach(function (id) {
      var p = PRODUTOS[id], q = estado.itens[id];
      linhas.push({ tipo: "item", id: id, titulo: q + "× " + p.nome + (p.unidade ? " (" + p.unidade + ")" : ""), valor: q * p.preco });
    });
    estado.bolos.forEach(function (b, i) {
      var det = "Massa de " + b.massa.toLowerCase() + ", recheio de " + b.recheio.toLowerCase() + ", cobertura de " + b.cobertura.toLowerCase() + ".";
      if (b.mensagem) det += " Escrita: “" + b.mensagem + "”.";
      if (b.obs) det += " Obs.: " + b.obs;
      linhas.push({ tipo: "bolo", indice: i, titulo: "Bolo sob encomenda, " + kgTexto(b.kg), det: det, valor: b.kg * PRECO_KG_BOLO });
    });
    return linhas;
  }

  function atualizar() {
    // quantidades no cardápio
    document.querySelectorAll(".quantidade").forEach(function (c) {
      var q = estado.itens[c.dataset.id] || 0;
      c.querySelector("output").textContent = q;
      if (q) c.removeAttribute("data-zero"); else c.setAttribute("data-zero", "");
    });

    var linhas = linhasPedido(), lista = $("resumo-lista"), total = 0, qtd = 0;
    lista.innerHTML = "";
    linhas.forEach(function (l) {
      total += l.valor;
      qtd += l.tipo === "item" ? estado.itens[l.id] : 1;
      var remover = el("button", { type: "button", classe: "remover", texto: "Remover" });
      remover.addEventListener("click", function () {
        if (l.tipo === "item") delete estado.itens[l.id]; else estado.bolos.splice(l.indice, 1);
        salvar(); atualizar(); atualizarDatas(); montarHorarios(); resumoRetirada();
      });
      lista.appendChild(el("li", null, [
        el("span", { texto: l.titulo }),
        el("span", { texto: brl(l.valor) }),
        l.det ? el("span", { classe: "det", texto: l.det }) : null,
        remover
      ]));
    });
    $("resumo-vazio").hidden = linhas.length > 0;
    $("resumo-total").textContent = brl(total);
    $("barra-total").textContent = brl(total);
    $("barra-qtd").textContent = qtd + (qtd === 1 ? " item" : " itens");
    var barra = $("barra-pedido");
    barra.classList.toggle("visivel", linhas.length > 0);
    document.body.classList.toggle("com-barra", linhas.length > 0);
    if (linhas.length) $("erro-geral").textContent = "";
  }

  // ---------- horário do WhatsApp ----------
  function textoForaHorario() {
    return "Nosso atendimento pelo WhatsApp é de segunda a sexta, das 7h30 às 15h30, e aos sábados até as 13h. " +
      "Você pode enviar o pedido agora; ele será respondido " + Horario.proximoWhats() + ".";
  }
  function atualizarAvisoHorario() {
    var fora = !Horario.whatsAtendendo();
    $("aviso-horario").hidden = !fora;
    if (fora) $("aviso-horario-texto").textContent = textoForaHorario();
  }

  // ---------- envio ----------
  function validarTudo() {
    var ok = true, primeiro = null;
    if (!linhasPedido().length) {
      $("erro-geral").textContent = "Adicione pelo menos um produto ou bolo ao pedido.";
      ok = false; primeiro = primeiro || $("cardapio");
    } else $("erro-geral").textContent = "";

    if (!$("nome").value.trim()) {
      $("erro-nome").textContent = "Informe seu nome para a retirada.";
      $("nome").setAttribute("aria-invalid", "true");
      ok = false; primeiro = primeiro || $("nome");
    }
    if (!validarData(true)) { ok = false; primeiro = primeiro || $("data"); }
    if (!$("hora").value) {
      $("erro-hora").textContent = "Escolha o horário da retirada.";
      $("hora").setAttribute("aria-invalid", "true");
      ok = false; primeiro = primeiro || $("hora");
    }
    if (!ok && primeiro) {
      if (!$("erro-geral").textContent) $("erro-geral").textContent = "Confira os campos destacados antes de enviar.";
      primeiro.scrollIntoView({ behavior: "smooth", block: "center" });
      if (primeiro.focus) setTimeout(function () { primeiro.focus({ preventScroll: true }); }, 350);
    }
    return ok;
  }

  function mensagem() {
    var r = estado.retirada, linhas = linhasPedido(), total = 0;
    var t = ["Olá, Apreciatta! Gostaria de fazer um pedido para retirada na loja.", ""];
    var itens = linhas.filter(function (l) { return l.tipo === "item"; });
    var bolos = linhas.filter(function (l) { return l.tipo === "bolo"; });
    if (itens.length) {
      t.push("*Produtos*");
      itens.forEach(function (l) { t.push("• " + l.titulo + " — " + brl(l.valor)); total += l.valor; });
      t.push("");
    }
    if (bolos.length) {
      t.push("*Bolo sob encomenda*");
      bolos.forEach(function (l) { t.push("• " + l.titulo + " — " + brl(l.valor)); t.push("  " + l.det); total += l.valor; });
      t.push("");
    }
    t.push("*Total estimado:* " + brl(total));
    t.push("");
    t.push("*Retirada:* " + dataExtenso(r.data) + ", às " + r.hora);
    t.push("*Nome:* " + r.nome.trim());
    if (r.telefone.trim()) t.push("*Telefone:* " + r.telefone.trim());
    if (r.obs.trim()) t.push("*Observações:* " + r.obs.trim());
    t.push("");
    t.push("Aguardo a confirmação. Obrigado!");
    return t.join("\n");
  }

  function abrirWhatsApp() {
    var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(mensagem());
    var a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  }

  function ligarEnvio() {
    var dlg = $("confirmar");
    $("enviar").addEventListener("click", function () {
      if (!validarTudo()) return;
      if (!Horario.whatsAtendendo() && dlg && typeof dlg.showModal === "function") {
        $("confirmar-texto").textContent = textoForaHorario();
        dlg.showModal();
        return;
      }
      abrirWhatsApp();
    });
    if (dlg) {
      dlg.addEventListener("click", function (e) {
        var acao = e.target.closest && e.target.closest("[data-acao]");
        if (e.target === dlg) { dlg.close(); return; }
        if (!acao) return;
        dlg.close();
        if (acao.dataset.acao === "enviar") abrirWhatsApp();
      });
    }
  }

  // ---------- início ----------
  document.addEventListener("DOMContentLoaded", function () {
    carregar();
    montarCardapio();
    montarBolo();
    atualizarDatas();
    ligarRetirada();
    atualizar();
    resumoRetirada();
    atualizarAvisoHorario();
    ligarEnvio();
    setInterval(function () { atualizarAvisoHorario(); }, 60000);
    // esconde a barra inferior quando o resumo já está na tela
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (ent) {
        $("barra-pedido").classList.toggle("oculta", ent[0].isIntersecting);
      }, { threshold: 0.15 }).observe($("resumo"));
    }
  });
})();
