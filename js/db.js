/* Mini-cliente de Supabase (REST) para el panel y el juego.
   Sin librerías externas: fetch contra PostgREST + GoTrue. */
(function () {
  var C = window.PP_CONFIG;
  var KEY = "pp-sesion";

  function sesion() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function guardarSesion(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function salir() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function headers(extra) {
    var s = sesion();
    var h = {
      "apikey": C.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + (s && s.access_token ? s.access_token : C.SUPABASE_ANON_KEY),
      "Content-Type": "application/json"
    };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  function entrar(email, pass) {
    return fetch(C.SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "apikey": C.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: pass })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error_description || j.msg || "No se pudo entrar");
        guardarSesion({ access_token: j.access_token, refresh_token: j.refresh_token, email: email });
        return j;
      });
    });
  }

  function refrescar() {
    var s = sesion();
    if (!s || !s.refresh_token) return Promise.reject(new Error("sin sesión"));
    return fetch(C.SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "apikey": C.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.access_token) { salir(); throw new Error("sesión vencida"); }
      guardarSesion({ access_token: j.access_token, refresh_token: j.refresh_token, email: s.email });
      return j.access_token;
    });
  }

  /* consulta: "tabla?select=*&order=nombre" */
  function pedir(consulta, opts, reintento) {
    opts = opts || {};
    return fetch(C.SUPABASE_URL + "/rest/v1/" + consulta, {
      method: opts.method || "GET",
      headers: headers(opts.headers),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (r.status === 401 && !reintento && sesion()) {
        return refrescar().then(function () { return pedir(consulta, opts, true); });
      }
      if (r.status === 204) return null;
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) throw new Error((j && (j.message || j.hint)) || ("Error " + r.status));
        return j;
      });
    });
  }

  var sel = function (t, q) { return pedir(t + (q ? "?" + q : "")); };
  var ins = function (t, filas) {
    return pedir(t, { method: "POST", headers: { "Prefer": "return=representation" }, body: filas });
  };
  var upd = function (t, q, datos) {
    return pedir(t + "?" + q, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: datos });
  };
  var del = function (t, q) { return pedir(t + "?" + q, { method: "DELETE" }); };

  /* Datos completos de un juego para jugar, por slug de la URL. */
  function juegoPorSlug(slug) {
    var q = "select=id,slug,titulo,dispositivo,chat,bloque_avatares,modos,tiempos,abre_en,cierra_en,permitir_repaso,activo," +
      "curso:pp_cursos(nombre,colegio,materia:pp_materias(nombre))," +
      "palabras:pp_palabras(letra,modo,palabra,variantes,pista,definicion)" +
      "&slug=eq." + encodeURIComponent(slug);
    return sel("pp_juegos", q).then(function (rs) { return rs && rs[0] ? rs[0] : null; });
  }

  function estadoJuego(j) {
    var ahora = new Date();
    if (!j) return "noexiste";
    if (!j.activo) return "cerrado";
    if (j.abre_en && ahora < new Date(j.abre_en)) return "noabrio";
    if (j.cierra_en && ahora > new Date(j.cierra_en)) return "cerrado";
    return "abierto";
  }

  function registrarPartida(fila) { return ins("pp_partidas", fila); }

  window.PPDB = {
    entrar: entrar, salir: salir, sesion: sesion,
    sel: sel, ins: ins, upd: upd, del: del,
    juegoPorSlug: juegoPorSlug, estadoJuego: estadoJuego,
    registrarPartida: registrarPartida
  };
})();
