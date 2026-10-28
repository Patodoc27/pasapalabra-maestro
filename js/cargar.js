/* Cargador del pasapalabra: lee ?j=<slug>, trae la configuración y las
   palabras desde Supabase y recién ahí inyecta el motor del juego.
   Si el juego está cerrado o no existe, muestra una tarjeta y frena. */
(function () {
  var ORDEN = ["A","B","C","D","E","F","G","H","I","J","L","M","N","Ñ","O","P","Q","R","S","T","U","V","X","Y"];

  function fmtF(iso) {
    try {
      return new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso; }
  }

  function tarjeta(titulo, texto, extra) {
    document.title = "Pasapalabra";
    var d = document.createElement("div");
    d.id = "pp-tarjeta";
    d.innerHTML =
      '<div class="pp-caja"><div class="pp-letras">' + "PASAPALABRA".split("").map(function (l, i) {
        return '<b style="--i:' + i + '">' + l + '</b>';
      }).join("") + "</div>" +
      '<h1>' + titulo + "</h1><p>" + texto + "</p>" + (extra || "") + "</div>";
    var st = document.createElement("style");
    st.textContent =
      "html,body{height:100%}" +
      "#pp-tarjeta{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#0e1230;color:#fff;font-family:system-ui,sans-serif;padding:20px;box-sizing:border-box}" +
      "#pp-tarjeta .pp-caja{max-width:560px;text-align:center;background:#181d42;border:1.5px solid #3a4180;border-radius:26px;padding:44px 34px;box-shadow:0 30px 80px -30px rgba(0,0,0,.7)}" +
      "#pp-tarjeta .pp-letras{display:flex;justify-content:center;gap:6px;margin-bottom:22px}" +
      "#pp-tarjeta .pp-letras b{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:16px;" +
      "background:hsl(calc(170 + var(--i)*22) 80% 55%);color:#081018;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}" +
      "#pp-tarjeta h1{font-size:26px;margin:0 0 12px}" +
      "#pp-tarjeta p{color:#c4c9f0;font-size:16px;line-height:1.55;margin:0}" +
      "#pp-tarjeta .pp-aviso{margin-top:20px;font-size:13.5px;color:#8f95c9}";
    document.head.appendChild(st);
    (document.body || document.documentElement).appendChild(d);
    // tapa la pantalla de inicio del motor si ya se veía
    var ini = document.querySelector(".pantalla.activa");
    if (ini) ini.classList.remove("activa");
  }

  function datosDeCache(slug) {
    try { return JSON.parse(sessionStorage.getItem("ppm-cfg-" + slug) || "null"); } catch (e) { return null; }
  }
  function guardarCache(slug, j) {
    try { sessionStorage.setItem("ppm-cfg-" + slug, JSON.stringify(j)); } catch (e) {}
  }

  function armarPool(palabras) {
    var pool = {};
    palabras.forEach(function (w) {
      var l = String(w.letra || "").toUpperCase();
      if (!l) return;
      (pool[l] = pool[l] || []).push({ m: w.modo, p: w.palabra, v: w.variantes || [], k: w.pista || "", d: w.definicion });
    });
    return pool;
  }

  function arranquesDe(n) {
    var a = [];
    for (var i = 0; i < 10; i++) a.push(Math.floor(Math.random() * n));
    return a;
  }

  function aplicarConfig(j, repaso) {
    /* Toca el DOM del motor recién inyectado: títulos, chips permitidos,
       chat y el cartel de repaso cuando el plazo ya venció. */
    document.title = j.titulo;
    var eb = document.getElementById("pp-eyebrow");
    if (eb) {
      var partes = [];
      if (j.curso && j.curso.materia) partes.push(j.curso.materia.nombre);
      if (j.curso) partes.push(j.curso.nombre);
      if (j.curso && j.curso.colegio) partes.push(j.curso.colegio);
      eb.textContent = partes.join(" · ");
    }
    var bj = document.getElementById("pp-bajada");
    if (bj) {
      var n = window.__PP.LETRAS.length;
      bj.textContent = j.dispositivo === "movil"
        ? "Un rosco de " + n + " letras. Jugá sola, contra Boti o en línea contra un compañero."
        : "Un rosco de " + n + " letras. Competí en línea contra un compañero, de a dos en la misma compu o contra Boti.";
    }

    /* modos permitidos: filtra los chips de "¿Contra quién jugás?" */
    var mapa = window.PP_ENG === "pc" ? { "2": "linea", "0": "dedos", "1": "boti" } : { "3": "linea", "2": "sola", "1": "boti" };
    var modos = j.modos || {};
    var chips = document.querySelectorAll("#chips-rival .chip"), primero = null;
    chips.forEach(function (c) {
      var modo = mapa[c.dataset.bot];
      var ok = modo ? modos[modo] !== false : true;
      c.style.display = ok ? "" : "none";
      if (ok && !primero) primero = c;
    });
    if (primero && primero.getAttribute("aria-pressed") !== "true") primero.click();

    /* tiempos permitidos (segundos configurados en el panel) */
    var ops = (j.tiempos && j.tiempos.opciones) || null;
    if (ops && ops.length) {
      var filtrar = function () {
        var vis = null;
        document.querySelectorAll("#chips-tiempo .chip").forEach(function (c) {
          var ok = ops.indexOf(+c.dataset.seg) >= 0;
          c.style.display = ok ? "" : "none";
          if (ok && !vis) vis = c;
        });
        if (vis && vis.getAttribute("aria-pressed") !== "true") vis.click();
      };
      filtrar();
      new MutationObserver(filtrar).observe(document.getElementById("chips-tiempo"), { childList: true });
    }

    /* la sección ya viene del juego: el selector de curso no hace falta */
    var cs = document.getElementById("chips-sec");
    if (cs) {
      var pc = cs.closest ? (cs.closest(".campo") || cs.parentElement) : cs.parentElement;
      if (pc) pc.style.display = "none";
    }

    /* chat apagado por configuración */
    if (!j.chat) {
      var st = document.createElement("style");
      st.textContent = ".chat,#chat-btn{display:none!important}";
      document.head.appendChild(st);
    }

    /* el plazo venció: repaso libre, no se registran puntos */
    if (repaso) {
      var b = document.createElement("div");
      b.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;z-index:8000;background:#ffb020;color:#241a00;text-align:center;' +
        'font:600 14px/1.4 system-ui;padding:9px 14px">El plazo para competir terminó: podés repasar el rosco pero los puntos ya no se registran.</div>';
      document.body.appendChild(b);
    }
  }

  function iniciar() {
    var slug = new URLSearchParams(location.search).get("j");
    if (!slug) { tarjeta("Falta el enlace del juego", "Pedile a tu profe el enlace completo del pasapalabra."); return; }

    var traer = datosDeCache(slug)
      ? Promise.resolve(datosDeCache(slug))
      : PPDB.juegoPorSlug(slug).then(function (j) { if (j) guardarCache(slug, j); return j; });

    traer.then(function (j) {
      var est = PPDB.estadoJuego(j);
      if (est === "noexiste") { tarjeta("Este pasapalabra no existe", "Revisá el enlace con tu profe: puede que haya cambiado o que aún no lo hayan publicado."); return; }
      if (est === "noabrio") { tarjeta("Todavía no abre", "Este pasapalabra se puede jugar a partir del <b>" + fmtF(j.abre_en) + "</b>."); return; }
      if (est === "cerrado" && !j.permitir_repaso) { tarjeta("Pasapalabra cerrado", "El plazo para jugar terminó el <b>" + fmtF(j.cierra_en) + "</b>. Avisale a tu profe si llegaste tarde."); return; }
      if (!j.palabras || !j.palabras.length) { tarjeta("Rosco en preparación", "Tu profe está cargando las palabras de este pasapalabra. Volvé a intentar en un ratito."); return; }

      var pool = armarPool(j.palabras);
      var letras = ORDEN.filter(function (l) { return pool[l] && pool[l].length; });
      window.__PP = {
        id: j.id, slug: slug, titulo: j.titulo,
        seccion: (j.curso && j.curso.nombre) || "",
        chat: !!j.chat, repaso: est === "cerrado",
        POOL: pool, LETRAS: letras, ARRANQUES: arranquesDe(letras.length),
        AVATARES: []
      };
      for (var i = 0; i < PP_AVATARES.cantidad; i++) {
        window.__PP.AVATARES.push({ id: "b" + j.bloque_avatares + "-" + i, img: PP_AVATARES.url(j.bloque_avatares, i) });
      }
      window.__PP.AVATARES.push({ id: "boti", img: PP_AVATARES.boti });

      var el = document.querySelector('script[type="pp/juego"]');
      if (!el) { tarjeta("Algo falló", "El juego no se pudo preparar. Avisale a tu profe."); return; }
      var s = document.createElement("script");
      s.textContent = el.textContent;
      document.body.appendChild(s);
      aplicarConfig(j, est === "cerrado");
    }).catch(function () {
      tarjeta("No se pudo cargar", "Revisá tu conexión a internet y volvé a intentar.");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
