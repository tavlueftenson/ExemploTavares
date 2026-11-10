/* Painel da equipe: fila de pedidos (protótipo) */
(function () {
  "use strict";

  var CHAVE_ENTRADA = "apreciatta-equipe-demo";
  var CHAVE_SOM = "apreciatta-equipe-som";
  var EM_ABERTO = ["novo", "confirmado", "producao", "pronto"];
  var A_PRODUZIR = ["novo", "confirmado", "producao"];

  var filtro = { periodo: "hoje", situacao: "aberto", busca: "" };
  var conhecidos = {};
  var somLigado = true;
  var pedidoWhats = null, pedidoCancelar = null;

  function $(id) { return document.getElementById(id); }
  var moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function brl(v) { return moeda.format(v); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function kg(v) { return String(v).replace(".", ",") + " kg"; }
  function minutosDe(hhmm) { var p = hhmm.split(":"); return (+p[0]) * 60 + (+p[1]); }

  // ---------- datas ----------
  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  function hojeISO() { return Horario.agora().iso; }
  function ddmm(iso) { var p = iso.split("-"); return p[2] + "/" + p[1]; }
  function rotuloDia(iso) {
    var hoje = hojeISO();
    var nome = DIAS[FilaDados.diaSemana(iso)];
    if (iso === hoje) return { titulo: "Hoje", sub: nome + ", " + ddmm(iso) };
    if (iso === FilaDados.isoMaisDias(hoje, 1)) return { titulo: "Amanhã", sub: nome + ", " + ddmm(iso) };
    if (iso < hoje) return { titulo: nome.charAt(0).toUpperCase() + nome.slice(1) + ", " + ddmm(iso), sub: "dia anterior" };
    return { titulo: nome.charAt(0).toUpperCase() + nome.slice(1), sub: ddmm(iso) };
  }
  function diaFalado(iso) {
    var hoje = hojeISO();
    if (iso === hoje) return "hoje";
    if (iso === FilaDados.isoMaisDias(hoje, 1)) return "amanhã";
    return DIAS[FilaDados.diaSemana(iso)] + ", " + ddmm(iso);
  }
  function horaLocal(isoInstante) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(isoInstante));
  }
  function dataHoraLocal(isoInstante) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(isoInstante));
  }
  function haQuanto(isoInstante) {
    var min = Math.max(0, Math.round((Date.now() - new Date(isoInstante).getTime()) / 60000));
    if (min < 1) return "agora mesmo";
    if (min < 60) return "há " + min + " min";
    var h = Math.floor(min / 60);
    if (h < 24) return "há " + h + " h";
    var d = Math.floor(h / 24);
    return "há " + d + (d === 1 ? " dia" : " dias");
  }
  function atrasado(p) {
    if (A_PRODUZIR.indexOf(p.situacao) === -1) return false;
    var a = Horario.agora();
    return p.retirada.data < a.iso || (p.retirada.data === a.iso && minutosDe(p.retirada.hora) < a.minutos);
  }

  // ---------- filtros ----------
  function noPeriodo(p) {
    var hoje = hojeISO(), amanha = FilaDados.isoMaisDias(hoje, 1);
    switch (filtro.periodo) {
      case "hoje": return p.retirada.data === hoje || (p.retirada.data < hoje && EM_ABERTO.indexOf(p.situacao) !== -1);
      case "amanha": return p.retirada.data === amanha;
      case "proximos": return p.retirada.data > hoje;
      default: return true;
    }
  }
  function naSituacao(p) {
    if (filtro.situacao === "todas") return true;
    if (filtro.situacao === "aberto") return EM_ABERTO.indexOf(p.situacao) !== -1;
    return p.situacao === filtro.situacao;
  }
  function naBusca(p) {
    var b = filtro.busca.trim().toLowerCase();
    if (!b) return true;
    return p.nome.toLowerCase().indexOf(b) !== -1 || String(p.numero).indexOf(b.replace(/\D/g, "") || "#") !== -1;
  }
  function ordenar(a, b) {
    if (a.retirada.data !== b.retirada.data) return a.retirada.data < b.retirada.data ? -1 : 1;
    if (a.retirada.hora !== b.retirada.hora) return a.retirada.hora < b.retirada.hora ? -1 : 1;
    return a.numero - b.numero;
  }
  function filtrados() {
    return FilaDados.listar().filter(function (p) { return noPeriodo(p) && naSituacao(p) && naBusca(p); }).sort(ordenar);
  }

  function montarFiltroSituacao() {
    var opcoes = [{ id: "aberto", nome: "Em aberto" }].concat(FilaDados.situacoes.map(function (s) { return { id: s.id, nome: s.nome }; }), [{ id: "todas", nome: "Todas" }]);
    var cont = $("filtro-situacao");
    cont.innerHTML = "";
    opcoes.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.situacao = o.id;
      b.setAttribute("aria-pressed", o.id === filtro.situacao ? "true" : "false");
      b.innerHTML = esc(o.nome) + '<span class="conta"></span>';
      b.addEventListener("click", function () {
        filtro.situacao = o.id;
        cont.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        desenhar();
      });
      cont.appendChild(b);
    });
  }
  function atualizarContagens() {
    var doPeriodo = FilaDados.listar().filter(function (p) { return noPeriodo(p) && naBusca(p); });
    $("filtro-situacao").querySelectorAll("button").forEach(function (b) {
      var id = b.dataset.situacao;
      var n = doPeriodo.filter(function (p) {
        return id === "todas" ? true : id === "aberto" ? EM_ABERTO.indexOf(p.situacao) !== -1 : p.situacao === id;
      }).length;
      b.querySelector(".conta").textContent = "(" + n + ")";
    });
  }

  // ---------- desenho da fila ----------
  function htmlItens(p) {
    var linhas = p.itens.map(function (x) {
      return '<li><span class="qtd">' + x.qtd + "×</span>" + esc(x.nome) + (x.unidade ? " (" + esc(x.unidade) + ")" : "") + "</li>";
    });
    p.bolos.forEach(function (b) {
      var det = "Massa de " + b.massa.toLowerCase() + ", recheio de " + b.recheio.toLowerCase() + ", cobertura de " + b.cobertura.toLowerCase() + ".";
      if (b.mensagem) det += " Escrita: “" + b.mensagem + "”.";
      if (b.obs) det += " " + b.obs + ".";
      linhas.push('<li><span class="qtd">1×</span>Bolo sob encomenda, ' + kg(b.kg) + '<span class="bolo-det">' + esc(det) + "</span></li>");
    });
    return '<ul class="itens-pedido">' + linhas.join("") + "</ul>";
  }

  function cartao(p) {
    var sit = FilaDados.situacao(p.situacao);
    var prox = FilaDados.proxima(p.situacao);
    var opcoes = FilaDados.situacoes.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === p.situacao ? " selected" : "") + ">" + esc(s.nome) + "</option>";
    }).join("");
    var tel = p.telefone ? '<a href="tel:+55' + p.telefone.replace(/\D/g, "") + '">' + esc(p.telefone) + "</a>" : "";
    var meta = ["Recebido " + haQuanto(p.criadoEm) + " (" + dataHoraLocal(p.criadoEm) + ")"];
    if (p.origem === "site") meta.push("Feito no site nesta demonstração");
    if (p.avisadoEm) meta.push('<span class="avisado">Cliente avisado às ' + horaLocal(p.avisadoEm) + "</span>");
    var podeAvisar = p.situacao === "pronto" || p.situacao === "retirado";

    return '<article class="pedido" id="pedido-' + p.numero + '" data-numero="' + p.numero + '" data-situacao="' + p.situacao + '" aria-labelledby="t-' + p.numero + '">' +
      '<div class="quando"><div class="hora">' + esc(p.retirada.hora) + '</div><div class="numero">nº ' + p.numero + "</div>" +
        (atrasado(p) ? '<span class="alerta">Atrasado</span>' : "") + "</div>" +
      '<div class="corpo">' +
        '<div class="cliente"><strong id="t-' + p.numero + '">' + esc(p.nome) + "</strong>" + tel + "</div>" +
        htmlItens(p) +
        (p.obs ? '<p class="obs">' + esc(p.obs) + "</p>" : "") +
        '<div class="meta">' + meta.map(function (m) { return "<span>" + m + "</span>"; }).join("") + "</div>" +
      "</div>" +
      '<div class="lado">' +
        '<div class="linha-selo"><span class="selo">' + esc(sit.nome) + '</span><span class="total">' + brl(p.total) + "</span></div>" +
        (prox ? '<button type="button" class="botao" data-acao="avancar">' + esc(sit.acao) + "</button>" : "") +
        '<div class="secundarias">' +
          (podeAvisar ? '<button type="button" class="botao secundario" data-acao="avisar">' + (p.avisadoEm ? "Avisar de novo" : "Avisar cliente") + "</button>" : "") +
          '<button type="button" class="botao secundario" data-acao="comanda">Imprimir comanda</button>' +
        "</div>" +
        '<label for="sit-' + p.numero + '">Alterar situação</label>' +
        '<select id="sit-' + p.numero + '" data-acao="situacao">' + opcoes + "</select>" +
      "</div>" +
    "</article>";
  }

  function desenhar() {
    var lista = filtrados(), cont = $("lista-fila");
    atualizarContagens();
    var todos = FilaDados.listar();
    var hoje = hojeISO();
    var abertosHoje = todos.filter(function (p) { return p.retirada.data === hoje && EM_ABERTO.indexOf(p.situacao) !== -1; }).length;
    var novos = todos.filter(function (p) { return p.situacao === "novo"; }).length;
    var atrasados = todos.filter(atrasado).length;
    var partes = [abertosHoje + (abertosHoje === 1 ? " pedido em aberto" : " pedidos em aberto") + " para hoje"];
    partes.push(novos + (novos === 1 ? " novo aguardando confirmação" : " novos aguardando confirmação"));
    if (atrasados) partes.push(atrasados + (atrasados === 1 ? " atrasado" : " atrasados"));
    $("resumo-fila").textContent = partes.join("; ") + ".";

    if (!lista.length) {
      cont.innerHTML = '<p class="vazio-fila">Nenhum pedido com estes filtros. Experimente o período "Todos" ou a situação "Todas".</p>';
      return;
    }
    var html = "", diaAtual = null;
    lista.forEach(function (p) {
      if (p.retirada.data !== diaAtual) {
        if (diaAtual) html += "</section>";
        diaAtual = p.retirada.data;
        var r = rotuloDia(diaAtual);
        var n = lista.filter(function (x) { return x.retirada.data === diaAtual; }).length;
        html += '<section class="dia"><h2>' + esc(r.titulo) + " <small>" + esc(r.sub) + ", " + n + (n === 1 ? " pedido" : " pedidos") + "</small></h2>";
      }
      html += cartao(p);
    });
    cont.innerHTML = html + "</section>";
  }

  // ---------- ações ----------
  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("mostrar");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("mostrar"); }, 2600);
  }

  function destacar(numero) {
    var el = $("pedido-" + numero);
    if (!el) return;
    el.classList.remove("destaque");
    void el.offsetWidth;
    el.classList.add("destaque");
  }

  function mudar(numero, nova) {
    if (nova === "cancelado") { pedirCancelamento(numero); return; }
    var p = FilaDados.mudarSituacao(numero, nova);
    lembrarConhecidos();
    desenhar();
    destacar(numero);
    toast("Pedido nº " + numero + ": " + FilaDados.situacao(nova).nome.toLowerCase());
    if (p && nova === "pronto") abrirWhats(p);
  }

  function pedirCancelamento(numero) {
    var p = FilaDados.buscar(numero);
    pedidoCancelar = numero;
    $("cancelar-texto").textContent = "O pedido nº " + numero + ", de " + p.nome + ", sai da fila de produção. Você pode reabri-lo depois mudando a situação.";
    $("dlg-cancelar").showModal();
  }

  function mensagemPronto(p) {
    var nome = p.nome.split(" ")[0];
    return "Olá, " + nome + "! Seu pedido nº " + p.numero + " na Apreciatta está pronto e já pode ser retirado na Rua Jaime Rossler, 120, Planalto.\n\n" +
      "Retirada combinada: " + diaFalado(p.retirada.data) + ", às " + p.retirada.hora + ".\n" +
      "Total: " + brl(p.total) + ".\n\n" +
      "A loja abre de segunda a sábado, das 7h às 18h45. Obrigado pela preferência!";
  }

  function abrirWhats(p) {
    pedidoWhats = p.numero;
    $("whats-para").textContent = p.nome + (p.telefone ? ", " + p.telefone : " (sem telefone no pedido)");
    $("whats-texto").textContent = mensagemPronto(p);
    $("whats-copiado").textContent = "";
    $("dlg-whats").showModal();
  }

  // ---------- impressão ----------
  function imprimir(tipo, html) {
    var area = $("area-impressao");
    area.innerHTML = html;
    var pagina = "@page { size: A4; margin: 14mm; }";
    if (tipo === "comanda") {
      // mede a altura da comanda para gerar uma "tira" de 80 mm do tamanho certo
      var medida = document.createElement("div");
      medida.style.cssText = "position:absolute;left:-9999px;top:0;width:72mm;font-size:10pt;line-height:1.35;font-family:Jost,sans-serif";
      medida.innerHTML = html;
      document.body.appendChild(medida);
      var mm = Math.ceil(medida.getBoundingClientRect().height * 25.4 / 96 * 1.12) + 12;
      medida.remove();
      pagina = "@page { size: 80mm " + Math.max(80, mm) + "mm; margin: 4mm; }";
    }
    $("estilo-pagina").textContent = pagina;
    document.body.classList.add("imprimindo");
    var limpar = function () {
      document.body.classList.remove("imprimindo");
      area.innerHTML = "";
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    setTimeout(function () { window.print(); }, 50);
  }
  function agoraTexto() {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
  }

  function htmlComanda(p) {
    var linhas = p.itens.map(function (x) {
      return "<tr><td>" + x.qtd + "× " + esc(x.nome) + (x.unidade ? " (" + esc(x.unidade) + ")" : "") + '</td><td class="num">' + brl(x.qtd * x.preco) + "</td></tr>";
    });
    p.bolos.forEach(function (b) {
      linhas.push("<tr><td>1× Bolo sob encomenda, " + kg(b.kg) + '</td><td class="num">' + brl(b.preco) + "</td></tr>" +
        '<tr><td colspan="2" class="det">Massa: ' + esc(b.massa) + "<br>Recheio: " + esc(b.recheio) + "<br>Cobertura: " + esc(b.cobertura) +
        (b.mensagem ? "<br>Escrita: “" + esc(b.mensagem) + "”" : "") + (b.obs ? "<br>Obs.: " + esc(b.obs) : "") + "</td></tr>");
    });
    return '<div class="impr comanda">' +
      '<p class="marca-impr">Apreciatta</p><p class="centro">Padaria e confeitaria</p>' +
      '<p class="numero-impr">Pedido nº ' + p.numero + "</p>" +
      '<div class="linha"></div>' +
      "<dl><dt>Retirada</dt><dd>" + esc(diaFalado(p.retirada.data)) + ", " + esc(p.retirada.hora) + "</dd>" +
      "<dt>Cliente</dt><dd>" + esc(p.nome) + "</dd>" +
      (p.telefone ? "<dt>Telefone</dt><dd>" + esc(p.telefone) + "</dd>" : "") +
      "<dt>Recebido</dt><dd>" + dataHoraLocal(p.criadoEm) + "</dd>" +
      "<dt>Situação</dt><dd>" + esc(FilaDados.situacao(p.situacao).nome) + "</dd></dl>" +
      '<div class="linha"></div>' +
      "<table><tbody>" + linhas.join("") + "</tbody></table>" +
      (p.obs ? '<div class="linha"></div><p><strong>Obs.:</strong> ' + esc(p.obs) + "</p>" : "") +
      '<div class="linha"></div>' +
      '<div class="total-impr"><span>Total</span><span>' + brl(p.total) + "</span></div>" +
      '<p class="rodape-impr">Impresso em ' + agoraTexto() + "</p>" +
    "</div>";
  }

  function descricaoFiltro() {
    var per = { hoje: "retirada hoje (e atrasados)", amanha: "retirada amanhã", proximos: "retirada nos próximos dias", todos: "todas as datas" }[filtro.periodo];
    var sit = filtro.situacao === "aberto" ? "em aberto" : filtro.situacao === "todas" ? "todas as situações" : FilaDados.situacao(filtro.situacao).nome.toLowerCase();
    return per + "; " + sit + (filtro.busca.trim() ? "; busca: “" + filtro.busca.trim() + "”" : "");
  }

  function htmlFila() {
    var lista = filtrados();
    var linhas = lista.map(function (p) {
      var itens = p.itens.map(function (x) { return x.qtd + "× " + x.nome; })
        .concat(p.bolos.map(function (b) { return "Bolo " + kg(b.kg) + " (" + b.massa.toLowerCase() + "/" + b.recheio.toLowerCase() + ")"; }));
      return "<tr><td>" + p.numero + '</td><td class="sem-quebra">' + ddmm(p.retirada.data) + " " + esc(p.retirada.hora) + "</td><td>" + esc(p.nome) +
        '<br><span class="sem-quebra">' + esc(p.telefone) + "</span></td><td>" + esc(itens.join("; ")) + (p.obs ? "<br><em>Obs.: " + esc(p.obs) + "</em>" : "") +
        '</td><td class="num">' + brl(p.total) + "</td><td>" + esc(FilaDados.situacao(p.situacao).nome) + "</td></tr>";
    });
    return '<div class="impr">' +
      "<h1>Apreciatta: fila de pedidos</h1>" +
      '<p class="sub">Filtro: ' + esc(descricaoFiltro()) + ". " + lista.length + (lista.length === 1 ? " pedido" : " pedidos") + ". Impresso em " + agoraTexto() + ".</p>" +
      (lista.length
        ? '<table><thead><tr><th>Nº</th><th>Retirada</th><th>Cliente</th><th>Itens</th><th class="num">Total</th><th>Situação</th></tr></thead><tbody>' + linhas.join("") + "</tbody></table>"
        : "<p>Nenhum pedido com estes filtros.</p>") +
    "</div>";
  }

  function pedidosProducao(data) {
    return FilaDados.listar().filter(function (p) { return p.retirada.data === data && A_PRODUZIR.indexOf(p.situacao) !== -1; }).sort(ordenar);
  }

  function htmlProducao(data) {
    var pedidos = pedidosProducao(data);
    var soma = {};
    pedidos.forEach(function (p) {
      p.itens.forEach(function (x) {
        var chave = x.nome + (x.unidade ? " (" + x.unidade + ")" : "");
        soma[chave] = (soma[chave] || 0) + x.qtd;
      });
    });
    var nomes = Object.keys(soma).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    var bolos = [];
    pedidos.forEach(function (p) { p.bolos.forEach(function (b) { bolos.push({ p: p, b: b }); }); });
    var r = rotuloDia(data);

    return '<div class="impr">' +
      "<h1>Lista de produção: " + esc(r.titulo) + (r.titulo === "Hoje" || r.titulo === "Amanhã" ? ", " + esc(r.sub) : " " + esc(r.sub)) + "</h1>" +
      '<p class="sub">' + pedidos.length + (pedidos.length === 1 ? " pedido" : " pedidos") + " novos, confirmados ou em produção. Impresso em " + agoraTexto() + ".</p>" +
      "<h2>Produtos</h2>" +
      (nomes.length
        ? '<table><thead><tr><th>Produto</th><th class="num">Quantidade</th></tr></thead><tbody>' +
          nomes.map(function (n) { return '<tr><td><span class="caixa"></span>' + esc(n) + '</td><td class="num">' + soma[n] + "</td></tr>"; }).join("") +
          "</tbody></table>"
        : "<p>Nenhum produto do cardápio para este dia.</p>") +
      "<h2>Bolos sob encomenda</h2>" +
      (bolos.length
        ? "<table><thead><tr><th>Retirada</th><th>Pedido</th><th>Tamanho</th><th>Massa, recheio e cobertura</th><th>Escrita e observações</th></tr></thead><tbody>" +
          bolos.map(function (x) {
            return '<tr><td><span class="caixa"></span>' + esc(x.p.retirada.hora) + "</td><td>nº " + x.p.numero + "<br>" + esc(x.p.nome) + "</td><td>" + kg(x.b.kg) +
              "</td><td>" + esc(x.b.massa) + "<br>" + esc(x.b.recheio) + "<br>" + esc(x.b.cobertura) + "</td><td>" +
              (x.b.mensagem ? "“" + esc(x.b.mensagem) + "”" : "Sem escrita") + (x.b.obs ? "<br>" + esc(x.b.obs) : "") + "</td></tr>";
          }).join("") + "</tbody></table>"
        : "<p>Nenhum bolo sob encomenda para este dia.</p>") +
    "</div>";
  }

  // ---------- som de pedido novo ----------
  var audio;
  function bip() {
    if (!somLigado) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach(function (t, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = i ? 1046 : 784;
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.16);
        o.connect(g); g.connect(audio.destination);
        o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.18);
      });
    } catch (e) { /* sem áudio */ }
  }
  function lembrarConhecidos() {
    conhecidos = {};
    FilaDados.listar().forEach(function (p) { conhecidos[p.numero] = true; });
  }
  function verificarNovos() {
    var novos = FilaDados.listar().filter(function (p) { return !conhecidos[p.numero]; });
    if (!novos.length) { desenhar(); return; }
    lembrarConhecidos();
    desenhar();
    bip();
    novos.forEach(function (p) { destacar(p.numero); });
    toast(novos.length === 1 ? "Novo pedido nº " + novos[0].numero + ", de " + novos[0].nome : novos.length + " pedidos novos chegaram");
  }

  // ---------- ligações ----------
  function entrar() {
    try { sessionStorage.setItem(CHAVE_ENTRADA, "1"); } catch (e) { /* ignora */ }
    $("entrada").hidden = true;
    $("painel").hidden = false;
    iniciarPainel();
  }

  var iniciado = false;
  function iniciarPainel() {
    if (iniciado) return;
    iniciado = true;
    try { somLigado = localStorage.getItem(CHAVE_SOM) !== "0"; } catch (e) { /* ignora */ }
    atualizarBotaoSom();
    montarFiltroSituacao();
    lembrarConhecidos();

    var alvo = /^#pedido-(\d+)$/.exec(location.hash);
    if (alvo) {
      var p = FilaDados.buscar(+alvo[1]);
      if (p) {
        filtro.periodo = p.retirada.data === hojeISO() ? "hoje" : "todos";
        filtro.situacao = "aberto";
      }
    }
    sincronizarSegmento();
    desenhar();
    if (alvo && $("pedido-" + alvo[1])) {
      setTimeout(function () {
        $("pedido-" + alvo[1]).scrollIntoView({ block: "center" });
        destacar(+alvo[1]);
      }, 100);
    }

    $("filtro-periodo").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-periodo]");
      if (!b) return;
      filtro.periodo = b.dataset.periodo;
      sincronizarSegmento();
      desenhar();
    });
    $("busca").addEventListener("input", function () { filtro.busca = this.value; desenhar(); });

    $("lista-fila").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-acao]");
      if (!b) return;
      var numero = +b.closest(".pedido").dataset.numero;
      var p = FilaDados.buscar(numero);
      if (b.dataset.acao === "avancar") mudar(numero, FilaDados.proxima(p.situacao));
      else if (b.dataset.acao === "avisar") abrirWhats(p);
      else if (b.dataset.acao === "comanda") imprimir("comanda", htmlComanda(p));
    });
    $("lista-fila").addEventListener("change", function (e) {
      if (e.target.dataset.acao !== "situacao") return;
      var numero = +e.target.closest(".pedido").dataset.numero;
      mudar(numero, e.target.value);
    });

    $("imprimir-fila").addEventListener("click", function () { imprimir("fila", htmlFila()); });
    $("abrir-producao").addEventListener("click", function () {
      var d = $("producao-data");
      d.value = filtro.periodo === "amanha" ? FilaDados.isoMaisDias(hojeISO(), 1) : hojeISO();
      contarProducao();
      $("dlg-producao").showModal();
    });
    $("producao-data").addEventListener("change", contarProducao);
    $("som").addEventListener("click", function () {
      somLigado = !somLigado;
      try { localStorage.setItem(CHAVE_SOM, somLigado ? "1" : "0"); } catch (e) { /* ignora */ }
      atualizarBotaoSom();
      if (somLigado) bip();
    });
    $("restaurar").addEventListener("click", function () {
      FilaDados.restaurarExemplos();
      lembrarConhecidos();
      desenhar();
      toast("Pedidos de exemplo restaurados");
    });

    ligarDialogos();

    // pedidos feitos em outra aba do mesmo navegador
    window.addEventListener("storage", function (e) { if (e.key === FilaDados.chave) verificarNovos(); });
    // tempo relativo ("há 5 min") e atrasos
    setInterval(desenhar, 60000);
  }

  function contarProducao() {
    var data = $("producao-data").value;
    var n = data ? pedidosProducao(data).length : 0;
    $("producao-contagem").textContent = data ? n + (n === 1 ? " pedido entra" : " pedidos entram") + " nesta lista." : "Escolha um dia.";
  }

  function sincronizarSegmento() {
    $("filtro-periodo").querySelectorAll("button").forEach(function (x) {
      x.setAttribute("aria-pressed", x.dataset.periodo === filtro.periodo ? "true" : "false");
    });
  }
  function atualizarBotaoSom() {
    $("som").setAttribute("aria-pressed", somLigado ? "true" : "false");
    $("som").querySelector("span").textContent = somLigado ? "Som ligado" : "Som desligado";
  }

  function ligarDialogos() {
    var dw = $("dlg-whats");
    dw.addEventListener("click", function (e) {
      if (e.target === dw) { dw.close(); return; }
      var b = e.target.closest("[data-acao]");
      if (!b) return;
      if (b.dataset.acao === "fechar") dw.close();
      if (b.dataset.acao === "copiar") {
        var texto = $("whats-texto").textContent;
        var ok = function () { $("whats-copiado").textContent = "Mensagem copiada."; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, function () { $("whats-copiado").textContent = "Não foi possível copiar automaticamente; selecione o texto."; });
        else $("whats-copiado").textContent = "Selecione o texto para copiar.";
      }
      if (b.dataset.acao === "avisado") {
        FilaDados.marcarAvisado(pedidoWhats);
        dw.close();
        desenhar();
        destacar(pedidoWhats);
        toast("Pedido nº " + pedidoWhats + ": cliente avisado");
      }
    });

    var dc = $("dlg-cancelar");
    dc.addEventListener("close", function () { desenhar(); });
    dc.addEventListener("click", function (e) {
      if (e.target === dc) { dc.close(); return; }
      var b = e.target.closest("[data-acao]");
      if (!b) return;
      if (b.dataset.acao === "cancelar") {
        FilaDados.mudarSituacao(pedidoCancelar, "cancelado");
        toast("Pedido nº " + pedidoCancelar + " cancelado");
      }
      dc.close();
    });

    var dp = $("dlg-producao");
    dp.addEventListener("click", function (e) {
      if (e.target === dp) { dp.close(); return; }
      var b = e.target.closest("[data-acao]");
      if (!b) return;
      if (b.dataset.acao === "imprimir") {
        var data = $("producao-data").value;
        if (!data) return;
        dp.close();
        imprimir("producao", htmlProducao(data));
      } else dp.close();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var entrou = false;
    try { entrou = sessionStorage.getItem(CHAVE_ENTRADA) === "1"; } catch (e) { /* ignora */ }
    $("entrar").addEventListener("click", entrar);
    $("sair").addEventListener("click", function () {
      try { sessionStorage.removeItem(CHAVE_ENTRADA); } catch (e) { /* ignora */ }
      location.href = "./";
    });
    if (entrou) entrar();
  });
})();
