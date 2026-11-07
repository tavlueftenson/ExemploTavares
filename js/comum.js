/* Funções compartilhadas: horários no fuso de Farroupilha (America/Sao_Paulo) */
(function () {
  "use strict";

  var FUSO = "America/Sao_Paulo";

  // Loja: segunda a sábado, 7h às 18h45 (0 = domingo)
  var HORARIO_LOJA = { 1: [420, 1125], 2: [420, 1125], 3: [420, 1125], 4: [420, 1125], 5: [420, 1125], 6: [420, 1125] };
  // WhatsApp: segunda a sexta, 7h30 às 15h30; sábado até 13h
  var HORARIO_WHATS = { 1: [450, 930], 2: [450, 930], 3: [450, 930], 4: [450, 930], 5: [450, 930], 6: [450, 780] };

  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

  function agoraLocal() {
    var partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short"
    }).formatToParts(new Date());
    var p = {};
    partes.forEach(function (x) { p[x.type] = x.value; });
    var mapaDia = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      ano: +p.year, mes: +p.month, dia: +p.day,
      diaSemana: mapaDia[p.weekday],
      minutos: (+p.hour) * 60 + (+p.minute),
      iso: p.year + "-" + p.month + "-" + p.day
    };
  }

  function dentro(tabela, agora) {
    var faixa = tabela[agora.diaSemana];
    return !!faixa && agora.minutos >= faixa[0] && agora.minutos < faixa[1];
  }

  function hm(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + "h" + (m ? String(m).padStart(2, "0") : "");
  }

  function proximaAbertura(tabela, agora) {
    for (var i = 0; i < 8; i++) {
      var d = (agora.diaSemana + i) % 7;
      var faixa = tabela[d];
      if (!faixa) continue;
      if (i === 0 && agora.minutos >= faixa[0]) continue;
      var quando = i === 0 ? "hoje" : i === 1 ? "amanhã" : DIAS[d];
      return quando + " às " + hm(faixa[0]);
    }
    return "";
  }

  var Horario = {
    agora: agoraLocal,
    lojaAberta: function () { return dentro(HORARIO_LOJA, agoraLocal()); },
    whatsAtendendo: function () { return dentro(HORARIO_WHATS, agoraLocal()); },
    proximoWhats: function () { return proximaAbertura(HORARIO_WHATS, agoraLocal()); },
    loja: HORARIO_LOJA,
    dias: DIAS,
    hm: hm
  };
  window.Horario = Horario;

  function atualizarSituacao() {
    var a = agoraLocal();
    document.querySelectorAll("[data-situacao]").forEach(function (el) {
      if (dentro(HORARIO_LOJA, a)) {
        el.className = "situacao aberta";
        el.textContent = "Aberta agora, até as " + hm(HORARIO_LOJA[a.diaSemana][1]);
      } else {
        el.className = "situacao fechada";
        el.textContent = "Fechada agora. Abre " + proximaAbertura(HORARIO_LOJA, a);
      }
    });
    document.querySelectorAll("[data-dia]").forEach(function (tr) {
      var dias = tr.getAttribute("data-dia").split(",").map(Number);
      tr.classList.toggle("hoje", dias.indexOf(a.diaSemana) !== -1);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    atualizarSituacao();
    setInterval(atualizarSituacao, 60000);
    var ano = document.getElementById("ano");
    if (ano) ano.textContent = agoraLocal().ano;
  });
})();
