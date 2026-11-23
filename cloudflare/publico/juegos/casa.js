/* Pantalla de Inicio de la tele: reloj, tiempo, próximos planes de la agenda
   (saritaquedaconmary), las fotos que mandas desde el móvil y accesos.

   Ajustes (se guardan en la tele):
   - ciudad: para el tiempo. Se puede fijar desde el móvil o con SALON_CIUDAD en config.js.
   - agenda: dirección y código del espacio de la agenda. Por privacidad NUNCA van en el
     repositorio: los mete la app al fabricarse (SALON_AGENDA en config.js, que en la app
     es privado) o se envían desde el móvil. */
(function () {
  "use strict";
  const S = window.Salon;
  const $ = (id) => document.getElementById(id);
  const C = (S.casa = {});

  // ---------- Ajustes ----------
  function ajustes() {
    const a = S.leer("ajustes", {}) || {};
    const ag = window.SALON_AGENDA || {};
    return {
      ciudad: a.ciudad || window.SALON_CIUDAD || "",
      agendaServidor: a.agendaServidor || ag.servidor || "",
      agendaGrupo: a.agendaGrupo || ag.grupo || ""
    };
  }
  function guardarAjuste(clave, valor) {
    const a = S.leer("ajustes", {}) || {};
    a[clave] = valor;
    S.guardar("ajustes", a);
  }

  // ---------- Fotos (guardadas en la tele con IndexedDB) ----------
  let fotos = [], fotoActual = 0, base = null;
  function abrirBase() {
    return new Promise((ok) => {
      try {
        const r = indexedDB.open("pomniii", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("fotos", { keyPath: "id" });
        r.onsuccess = () => { base = r.result; ok(); };
        r.onerror = () => ok();
      } catch (e) { ok(); }
    });
  }
  function cargarFotos() {
    return new Promise((ok) => {
      if (!base) return ok();
      try {
        const q = base.transaction("fotos").objectStore("fotos").getAll();
        q.onsuccess = () => { fotos = (q.result || []).sort((a, b) => a.t - b.t); ok(); };
        q.onerror = () => ok();
      } catch (e) { ok(); }
    });
  }
  function guardarFoto(f) { try { if (base) base.transaction("fotos", "readwrite").objectStore("fotos").put(f); } catch (e) {} }
  function borrarFotos() { fotos = []; try { if (base) base.transaction("fotos", "readwrite").objectStore("fotos").clear(); } catch (e) {} pintarFoto(); }
  const MAX_FOTOS = 60;
  function nuevaFoto(datos, de) {
    if (typeof datos !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(datos) || datos.length > 1500000) return;
    const f = { id: Date.now() + "-" + Math.random().toString(36).slice(2, 7), datos, de: String(de || "").slice(0, 16), t: Date.now() };
    fotos.push(f); guardarFoto(f);
    while (fotos.length > MAX_FOTOS) { const v = fotos.shift(); try { base && base.transaction("fotos", "readwrite").objectStore("fotos").delete(v.id); } catch (e) {} }
    fotoActual = fotos.length - 1;
    pintarFoto(true);
    S.aviso("📷 " + (f.de ? f.de + " ha mandado una foto" : "Foto nueva"));
  }
  let capa = 0;
  function pintarFoto(nueva) {
    const capas = [$("fotoA"), $("fotoB")];
    if (!capas[0]) return;
    $("casaSinFotos").hidden = fotos.length > 0;
    if (!fotos.length) { capas.forEach((c) => c.classList.remove("visible")); return; }
    const f = fotos[fotoActual % fotos.length];
    const sig = 1 - capa;
    capas[sig].style.backgroundImage = "url('" + f.datos + "')";
    capas[sig].classList.add("visible");
    capas[capa].classList.remove("visible");
    capa = sig;
    $("casaFotoDe").textContent = f.de ? "📷 " + f.de : "";
    if (nueva) $("casaFotoDe").classList.add("nueva"); else $("casaFotoDe").classList.remove("nueva");
  }

  // ---------- Reloj y tiempo ----------
  const TIEMPO = { 0: ["☀️", "Despejado"], 1: ["🌤", "Poco nuboso"], 2: ["⛅", "Nubes y claros"], 3: ["☁️", "Nublado"], 45: ["🌫", "Niebla"], 48: ["🌫", "Niebla"], 51: ["🌦", "Llovizna"], 53: ["🌦", "Llovizna"], 55: ["🌦", "Llovizna"], 61: ["🌧", "Lluvia"], 63: ["🌧", "Lluvia"], 65: ["🌧", "Lluvia fuerte"], 71: ["🌨", "Nieve"], 73: ["🌨", "Nieve"], 75: ["🌨", "Nieve"], 80: ["🌦", "Chubascos"], 81: ["🌦", "Chubascos"], 82: ["⛈", "Chubascos fuertes"], 95: ["⛈", "Tormenta"], 96: ["⛈", "Tormenta"], 99: ["⛈", "Tormenta"] };
  function reloj() {
    const d = new Date();
    $("casaHora").textContent = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const f = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    $("casaFecha").textContent = f.charAt(0).toUpperCase() + f.slice(1);
    const h = d.getHours();
    $("casaSaludo").textContent = h < 6 ? "Buenas noches" : h < 13 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
  }
  let coord = null, ciudadCoord = "";
  async function tiempo() {
    const ciudad = ajustes().ciudad;
    const el = $("casaTiempo");
    if (!ciudad) { el.innerHTML = "<small>Elige tu ciudad desde el móvil (Ajustes de la tele) para ver el tiempo</small>"; return; }
    try {
      if (!coord || ciudadCoord !== ciudad) {
        const g = await (await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&name=" + encodeURIComponent(ciudad))).json();
        coord = g.results && g.results[0]; ciudadCoord = ciudad;
      }
      if (!coord) { el.textContent = "No encuentro «" + ciudad + "»"; return; }
      const t = await (await fetch("https://api.open-meteo.com/v1/forecast?timezone=auto&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&latitude=" + coord.latitude + "&longitude=" + coord.longitude)).json();
      const [ic, txt] = TIEMPO[t.current.weather_code] || ["🌡", ""];
      const dias = t.daily.time.slice(1).map((f, k) => {
        const n = new Date(f + "T12:00").toLocaleDateString("es-ES", { weekday: "short" });
        return "<span>" + n + " " + (TIEMPO[t.daily.weather_code[k + 1]] || ["", ""])[0] + " " + Math.round(t.daily.temperature_2m_max[k + 1]) + "°</span>";
      }).join("");
      el.innerHTML = "<div class='t1'><span class='ic'>" + ic + "</span><b>" + Math.round(t.current.temperature_2m) + "°</b><span>" + txt + "<br><small>" + coord.name + " · máx " + Math.round(t.daily.temperature_2m_max[0]) + "° mín " + Math.round(t.daily.temperature_2m_min[0]) + "°</small></span></div><div class='t2'>" + dias + "</div>";
    } catch (e) { el.innerHTML = "<small>Sin datos del tiempo ahora mismo</small>"; }
  }

  // ---------- Agenda (saritaquedaconmary) ----------
  const isoDia = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function proxima(p, hoy) {
    // siguiente día en que toca un plan que se repite
    if (!p.repite) return p.fecha;
    const dia = Number(p.fecha.slice(8)), d0 = new Date(hoy + "T12:00");
    for (let i = 0; i < 400; i++) {
      const d = new Date(d0); d.setDate(d0.getDate() + i);
      const s = isoDia(d);
      if (p.desde && s < p.desde) continue;
      if (d.getDate() !== dia) continue;
      if (p.repite === "anual" && s.slice(5, 7) !== p.fecha.slice(5, 7)) continue;
      return s;
    }
    return null;
  }
  function cuenta(f, hoy) {
    const n = Math.round((new Date(f + "T12:00") - new Date(hoy + "T12:00")) / 864e5);
    return n === 0 ? "¡Hoy!" : n === 1 ? "Mañana" : "En " + n + " días";
  }
  async function agenda() {
    const { agendaServidor: srv, agendaGrupo: grupo } = ajustes();
    const caja = $("casaAgenda");
    if (!srv || !grupo) { caja.innerHTML = "<p class='vacio'>Conecta vuestra agenda desde el móvil (Ajustes de la tele) y aquí saldrán los próximos planes.</p>"; return; }
    try {
      const r = await fetch(srv.replace(/\/+$/, "") + "/api/g/" + encodeURIComponent(grupo));
      if (!r.ok) throw new Error(r.status);
      const els = (await r.json()).elementos || [];
      const hoy = isoDia(new Date());
      const planes = els.filter((e) => e.tipo === "plan" && !e.borrado && e.fecha);
      const anuales = planes.filter((p) => p.repite === "anual");
      const lista = [];
      planes.forEach((p) => {
        if (p.repite) {
          let f = proxima(p, hoy);
          // el día del aniversario no se celebra además el mesiversario
          if (f && p.repite === "mensual" && anuales.some((q) => proxima(q, hoy) === f)) { const d = new Date(f + "T12:00"); d.setDate(d.getDate() + 1); f = proxima(p, isoDia(d)); }
          if (f) lista.push({ p, f });
        } else if (p.estado === "confirmado" && p.fecha >= hoy) lista.push({ p, f: p.fecha });
      });
      lista.sort((a, b) => (a.f + (a.p.hora || "")).localeCompare(b.f + (b.p.hora || "")));
      const ideas = planes.filter((p) => !p.repite && (p.estado || "borrador") === "borrador").length;
      caja.innerHTML = lista.slice(0, 4).map(({ p, f }) => {
        const c = cuenta(f, hoy);
        return "<div class='plan" + (c === "¡Hoy!" ? " hoy" : "") + "'><span class='em'></span><span class='tx'><b></b><small></small></span><span class='cu'></span></div>";
      }).join("") || "<p class='vacio'>No hay planes confirmados a la vista. ¡A proponer alguno!</p>";
      caja.querySelectorAll(".plan").forEach((el, k) => {
        const { p, f } = lista[k];
        el.querySelector(".em").textContent = p.emoji || "💞";
        el.querySelector("b").textContent = p.titulo || "Plan";
        const txt = new Date(f + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
        el.querySelector("small").textContent = txt.charAt(0).toUpperCase() + txt.slice(1) + (p.hora && !p.repite ? " · " + p.hora : "");
        el.querySelector(".cu").textContent = cuenta(f, hoy);
      });
      $("casaIdeas").textContent = ideas ? "💡 " + ideas + (ideas === 1 ? " idea pendiente de fecha" : " ideas pendientes de fecha") : "";
    } catch (e) { caja.innerHTML = "<p class='vacio'>No puedo leer la agenda ahora mismo.</p>"; }
  }

  // ---------- Spotify: la canción que suena, con carátula y controles ----------
  const SPOTIFY_ID = window.SALON_SPOTIFY_ID || ""; // Client ID público (inicio de sesión PKCE, sin secreto)
  let sp = S.leer("spotify", null), sonando = null, spPedido = 0;
  async function spLlave() {
    if (!sp || !sp.refresh || !SPOTIFY_ID) return null;
    if (sp.acceso && sp.caduca > Date.now()) return sp.acceso;
    const r = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: sp.refresh, client_id: SPOTIFY_ID }) });
    const t = await r.json();
    if (!t.access_token) { if (t.error === "invalid_grant") { sp = null; S.guardar("spotify", null); } return null; }
    sp.acceso = t.access_token; sp.caduca = Date.now() + (t.expires_in - 60) * 1000;
    if (t.refresh_token) sp.refresh = t.refresh_token; // Spotify cambia la llave a veces: hay que guardar la nueva
    S.guardar("spotify", sp);
    return sp.acceso;
  }
  async function spApi(metodo, ruta) {
    const llave = await spLlave(); if (!llave) return null;
    const r = await fetch("https://api.spotify.com/v1/me/player" + ruta, { method: metodo, headers: { Authorization: "Bearer " + llave } });
    if (r.status === 204 || r.status === 202) return {};
    if (!r.ok) return null;
    return r.json().catch(() => ({}));
  }
  async function spotify() {
    const caja = $("casaMusica");
    if (!caja) return;
    if (!sp || !SPOTIFY_ID) { caja.hidden = true; return; }
    caja.hidden = false;
    try {
      const d = await spApi("GET", "/currently-playing");
      if (!d || !d.item) { sonando = null; $("spTitulo").textContent = "No suena nada"; $("spArtista").textContent = "Pon música en Spotify (en el móvil o aquí) y saldrá aquí"; $("spCaratula").style.backgroundImage = ""; $("spBarra").style.width = "0"; $("spPlay").textContent = "▶"; return; }
      sonando = { pos: d.progress_ms, dur: d.item.duration_ms, play: d.is_playing, t: Date.now() };
      $("spTitulo").textContent = d.item.name;
      $("spArtista").textContent = (d.item.artists || []).map((a) => a.name).join(", ") + (d.item.album ? " · " + d.item.album.name : "");
      const img = d.item.album && d.item.album.images && d.item.album.images[0];
      $("spCaratula").style.backgroundImage = img ? "url('" + img.url + "')" : "";
      $("spPlay").textContent = d.is_playing ? "⏸" : "▶";
    } catch (e) {}
  }
  function barra() {
    if (!sonando) return;
    const pos = Math.min(sonando.dur, sonando.pos + (sonando.play ? Date.now() - sonando.t : 0));
    $("spBarra").style.width = (100 * pos) / sonando.dur + "%";
  }
  async function spControl(que) {
    if (que === "play") await spApi("PUT", sonando && sonando.play ? "/pause" : "/play");
    else await spApi("POST", que === "siguiente" ? "/next" : "/previous");
    setTimeout(spotify, 600);
  }

  // ---------- Mensajes del móvil ----------
  C.recibir = function (ev) {
    if (ev.tipo === "foto") return nuevaFoto(ev.datos, ev.de);
    if (ev.tipo === "ajuste") {
      if (ev.clave === "ciudad" && typeof ev.valor === "string") { guardarAjuste("ciudad", ev.valor.trim().slice(0, 60)); coord = null; tiempo(); S.aviso("Ciudad: " + ev.valor); }
      else if (ev.clave === "agenda" && ev.valor && typeof ev.valor.grupo === "string") {
        guardarAjuste("agendaServidor", String(ev.valor.servidor || "").trim()); guardarAjuste("agendaGrupo", ev.valor.grupo.trim());
        agenda(); S.aviso("Agenda conectada");
      } else if (ev.clave === "borrarFotos") { borrarFotos(); S.aviso("Fotos borradas de la tele"); }
      else if (ev.clave === "spotify" && ev.valor && typeof ev.valor.refresh === "string") { sp = { refresh: ev.valor.refresh, acceso: ev.valor.acceso, caduca: ev.valor.caduca }; S.guardar("spotify", sp); spotify(); S.aviso("🎵 Spotify conectado"); }
      else if (ev.clave === "spotifyFuera") { sp = null; S.guardar("spotify", null); spotify(); S.aviso("Spotify desconectado"); }
    }
  };
  C.ajustes = ajustes;

  C.arrancar = async function () {
    reloj(); setInterval(reloj, 5000);
    tiempo(); setInterval(tiempo, 30 * 60000);
    agenda(); setInterval(agenda, 5 * 60000);
    spotify(); setInterval(() => { if (S.pantallaActual() === "casa") spotify(); }, 5000); setInterval(barra, 500);
    [["spAnt", "anterior"], ["spPlay", "play"], ["spSig", "siguiente"]].forEach(([id, q]) => $(id) && $(id).addEventListener("click", () => spControl(q)));
    await abrirBase(); await cargarFotos(); pintarFoto();
    setInterval(() => { if (fotos.length > 1 && S.pantallaActual() === "casa") { fotoActual = (fotoActual + 1) % fotos.length; pintarFoto(); } }, 12000);
  };
  C.alMostrar = function () { reloj(); };
})();
