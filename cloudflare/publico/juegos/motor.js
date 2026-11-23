/* Motor del Salón de juegos. Ver LEEME.md para el contrato de los juegos. */
(function () {
  "use strict";
  const S = (window.Salon = window.Salon || {});
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  S.ANCHO = 1920;
  S.ALTO = 1080;
  S.COLORES = ["#f2b84b", "#4cc3f0", "#ef5b5b", "#5fd38d", "#b38cff", "#ff8f5a", "#f06bb3", "#9ad14b"];
  S.vel = Math.max(1, Math.min(50, parseInt(params.get("vel"), 10) || 1));
  S._juegos = {};
  S.juego = (id, crear) => { S._juegos[id] = crear; };

  window.__errores = [];
  window.addEventListener("error", (e) => window.__errores.push(String(e.message)));
  window.addEventListener("unhandledrejection", (e) => window.__errores.push(String(e.reason)));

  // ============================================================
  // Guardado (en el navegador de la tele)
  // ============================================================
  const leer = (k, def) => {
    try { const v = localStorage.getItem("salon." + k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  };
  const guardar = (k, v) => { try { localStorage.setItem("salon." + k, JSON.stringify(v)); } catch (e) {} };
  S.leer = leer;
  S.guardar = guardar;
  function stats(id) {
    const todo = leer("stats", {});
    const s = todo[id] || { partidas: 0, victorias: 0, derrotas: 0, empates: 0, records: {} };
    return { s, guardar: () => { todo[id] = s; guardar("stats", todo); } };
  }

  // ============================================================
  // Red: la sala que une los móviles con la tele
  // ============================================================
  const Red = (S.red = { codigo: null, ws: null, conectado: false, mandos: new Map(), espera: 1000 });
  const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  function codigoSala() {
    let c = leer("sala");
    if (!c || !/^[A-Z]{4}$/.test(c)) {
      c = "";
      for (let i = 0; i < 4; i++) c += LETRAS[(Math.random() * LETRAS.length) | 0];
      guardar("sala", c);
    }
    return c;
  }
  Red.urlMando = () => location.origin + location.pathname.replace(/[^/]*$/, "") + "mando.html?sala=" + Red.codigo;
  Red.conectar = function () {
    Red.codigo = codigoSala();
    if (!/^https?:$/.test(location.protocol) || params.has("sinred")) return;
    let ws;
    try {
      ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/sala/" + Red.codigo + "/ws?rol=tv");
    } catch (e) { return reintentar(); }
    Red.ws = ws;
    ws.onopen = () => { Red.conectado = true; Red.espera = 1000; pintarConexion(); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } recibir(m); };
    ws.onclose = () => { Red.conectado = false; Red.ws = null; pintarConexion(); reintentar(); };
    ws.onerror = () => {};
  };
  function reintentar() { Red.espera = Math.min(Red.espera * 2, 30000); setTimeout(Red.conectar, Red.espera); }
  Red.enviar = function (para, d) {
    if (Red.ws && Red.conectado) try { Red.ws.send(JSON.stringify({ para, d })); } catch (e) {}
  };
  function recibir(m) {
    if (m.t === "lista") {
      Red.mandos.clear();
      (m.mandos || []).forEach((x) => Red.mandos.set(x.id, { id: x.id, nombre: x.nombre }));
      cambianMandos();
      Red.mandos.forEach((x) => avisarMovil(x.id));
    } else if (m.t === "entra") {
      const nuevo = !Red.mandos.has(m.id);
      Red.mandos.set(m.id, { id: m.id, nombre: m.nombre });
      if (nuevo) { aviso("📱 " + m.nombre + " se ha conectado"); S.sonido("punto"); }
      cambianMandos();
      avisarMovil(m.id);
    } else if (m.t === "sale") {
      const x = Red.mandos.get(m.id);
      Red.mandos.delete(m.id);
      if (x) aviso("📱 " + x.nombre + " se ha desconectado");
      cambianMandos();
    } else if (m.t === "in" && m.d) {
      S.entrada(Object.assign({}, m.d, { fuente: m.id }));
    }
  }
  function nombreMando(id) {
    if (id === "tv") return "Mando de la tele";
    if (id === "cpu") return "Máquina";
    const m = Red.mandos.get(id);
    return m ? "📱 " + m.nombre : "📱 (desconectado)";
  }
  function cambianMandos() {
    pintarConexion();
    if (pantalla === "config") pintarConfig();
  }

  // Qué tiene que enseñar cada móvil según lo que pasa en la tele.
  function avisarMovil(id) {
    let d = { pantalla: "menu", modo: "cruceta", texto: "Usa la cruceta para moverte por el menú de la tele" };
    if (pantalla === "juego" && partida) {
      const mios = partida.jugadores.map((j, i) => (j.control === id ? i : -1)).filter((i) => i >= 0);
      if (mios.length) {
        const j = partida.jugadores[mios[0]];
        const turno = partida.def.tiempoReal || mios.indexOf(partida.turno) >= 0;
        d = { pantalla: "juego", modo: partida.def.control, juego: partida.def.nombre, jugador: j.nombre, color: j.color, tuTurno: turno && !partida.terminada };
      } else {
        d = { pantalla: "mirando", modo: "cruceta", juego: partida.def.nombre, texto: "Estás mirando esta partida. Entra en la siguiente desde el menú." };
      }
    }
    Red.enviar(id, d);
  }
  function avisarMoviles() { Red.mandos.forEach((m) => avisarMovil(m.id)); }

  function pintarConexion() {
    const n = Red.mandos.size;
    const caja = $("conexion");
    if (!caja) return;
    caja.querySelector(".codigo").textContent = Red.codigo || "----";
    caja.querySelector(".estado").textContent = !Red.conectado
      ? "Conectando…"
      : n === 0 ? "Ningún móvil conectado" : n === 1 ? "1 móvil conectado" : n + " móviles conectados";
    caja.querySelector(".nombres").textContent = Array.from(Red.mandos.values()).map((m) => m.nombre).join(" · ");
    caja.classList.toggle("ok", Red.conectado);
    const qr = $("qr");
    if (qr && Red.codigo && qr.dataset.codigo !== Red.codigo && window.qrcode) {
      try {
        const q = qrcode(0, "M");
        q.addData(Red.urlMando());
        q.make();
        qr.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      } catch (e) {}
      qr.dataset.codigo = Red.codigo;
    }
    const url = $("urlMando");
    if (url) url.textContent = Red.urlMando().replace(/^https?:\/\//, "");
  }

  // ============================================================
  // Entrada: mando de la tele (teclado) y móviles
  // ============================================================
  const pulsadas = {}; // fuente -> Set de acciones mantenidas
  function teclaDe(e) {
    const k = e.key, c = e.keyCode;
    if (k === "ArrowUp" || c === 38) return "arriba";
    if (k === "ArrowDown" || c === 40) return "abajo";
    if (k === "ArrowLeft" || c === 37) return "izquierda";
    if (k === "ArrowRight" || c === 39) return "derecha";
    if (k === "Enter" || k === " " || c === 13 || c === 32 || k === "Select" || c === 23) return "ok";
    if (k === "Escape" || k === "Backspace" || k === "GoBack" || k === "BrowserBack" || c === 27 || c === 8 || c === 4) return "atras";
    if (k === "MediaPlayPause" || c === 179) return "atras";
    return null;
  }
  document.addEventListener("keydown", (e) => {
    const a = teclaDe(e);
    if (!a) return;
    e.preventDefault();
    S.entrada({ fuente: "tv", tipo: "tecla", accion: a, estado: e.repeat ? null : "abajo" });
  });
  document.addEventListener("keyup", (e) => {
    const a = teclaDe(e);
    if (a) S.entrada({ fuente: "tv", tipo: "tecla", accion: a, estado: "arriba" });
  });
  // El botón Atrás del mando en Silk va hacia atrás en el historial: lo
  // atrapamos para que nunca se salga de la página.
  let ultimoAtras = 0;
  try { history.pushState({ salon: 1 }, ""); } catch (e) {}
  window.addEventListener("popstate", () => {
    try { history.pushState({ salon: 1 }, ""); } catch (e) {}
    S.entrada({ fuente: "tv", tipo: "tecla", accion: "atras", estado: "abajo", deHistorial: true });
  });

  S.entrada = function (ev) {
    desbloquearSonido();
    if (ev.tipo === "tecla") {
      const p = (pulsadas[ev.fuente] = pulsadas[ev.fuente] || new Set());
      if (ev.estado === "arriba") { p.delete(ev.accion); return; }
      if (ev.estado === "abajo") p.add(ev.accion);
      if (ev.accion === "atras") {
        const ahora = Date.now();
        if (ahora - ultimoAtras < 350) return;
        ultimoAtras = ahora;
      }
    }
    if (dialogo) return navegarMenu(ev);
    if (pantalla === "juego" && partida) {
      if (ev.tipo === "tecla" && ev.accion === "atras") return pausar();
      return enrutarJuego(ev);
    }
    navegarMenu(ev);
  };

  function navegarMenu(ev) {
    let a = ev.accion;
    if (ev.tipo === "respuesta") a = "ok";
    if (ev.tipo === "apuntar") { if (!ev.disparar) return; a = "ok"; }
    if (ev.tipo === "letra") return;
    if (!a) return;
    const foco = document.activeElement;
    if (a === "ok") {
      if (foco && foco.hasAttribute("data-nav")) foco.click();
      else primerFoco();
      return;
    }
    if (a === "atras") {
      if (dialogo && dialogo.alCancelar) return dialogo.alCancelar();
      if (!dialogo && (pantalla === "config" || pantalla === "ranking")) return mostrar("inicio");
      return;
    }
    if ((a === "izquierda" || a === "derecha") && foco && foco.dataset.cambia) {
      foco.dispatchEvent(new CustomEvent("cambia", { detail: a === "derecha" ? 1 : -1 }));
      return;
    }
    moverFoco(a === "izquierda" ? -1 : a === "derecha" ? 1 : 0, a === "arriba" ? -1 : a === "abajo" ? 1 : 0);
  }
  function contenedorActivo() { return dialogo ? $("velo") : $(pantalla); }
  function navegables() {
    const c = contenedorActivo();
    return c ? Array.from(c.querySelectorAll("[data-nav]")).filter((e) => e.offsetParent !== null) : [];
  }
  function primerFoco() {
    const l = navegables();
    if (l.length) enfocar(l[0]);
  }
  function enfocar(el) {
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function moverFoco(dx, dy) {
    const lista = navegables();
    const actual = document.activeElement;
    if (lista.indexOf(actual) < 0) return primerFoco();
    const a = actual.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let mejor = null, mejorD = Infinity;
    for (const el of lista) {
      if (el === actual) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const vx = bx - ax, vy = by - ay;
      if (dx && (Math.sign(vx) !== dx || Math.abs(vx) < 4)) continue;
      if (dy && (Math.sign(vy) !== dy || Math.abs(vy) < 4)) continue;
      const d = dx ? Math.abs(vx) + Math.abs(vy) * 2.5 : Math.abs(vy) + Math.abs(vx) * 2.5;
      if (d < mejorD) { mejorD = d; mejor = el; }
    }
    if (mejor) { enfocar(mejor); S.sonido("clic"); }
  }

  function enrutarJuego(ev) {
    const P = partida;
    if (!P || P.terminada || P.pausada) return;
    const mios = [];
    P.jugadores.forEach((j, i) => { if (!j.cpu && j.control === ev.fuente) mios.push(i); });
    if (!mios.length) return;
    let jug;
    if (P.def.tiempoReal) jug = mios[0];
    else if (mios.indexOf(P.turno) >= 0) jug = P.turno;
    else return;
    const g = P.juego;
    try {
      if (ev.tipo === "tecla" && ev.accion && ev.estado !== "arriba") g.tecla && g.tecla(jug, ev.accion);
      else if (ev.tipo === "apuntar") {
        if (g.apuntar) g.apuntar(jug, { angulo: +ev.angulo || 0, fuerza: Math.max(0, Math.min(1, +ev.fuerza || 0)), disparar: !!ev.disparar });
      } else if (ev.tipo === "respuesta") g.respuesta && g.respuesta(jug, ev.n | 0);
      else if (ev.tipo === "letra" && typeof ev.ch === "string") g.letra && g.letra(jug, ev.ch.toUpperCase().slice(0, 1));
    } catch (e) { fallo(e); }
  }

  // ============================================================
  // Pantallas
  // ============================================================
  let pantalla = "inicio";
  let dialogo = null;
  function mostrar(id) {
    pantalla = id;
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.toggle("activa", p.id === id));
    if (id === "inicio") pintarInicio();
    if (id === "ranking") pintarClasificacion();
    if (id !== "juego") primerFoco();
    else if (document.activeElement) document.activeElement.blur();
    avisarMoviles();
  }

  // ---------- Inicio ----------
  function pintarInicio() {
    const cont = $("listaJuegos");
    if (!cont.dataset.hecho) {
      cont.dataset.hecho = 1;
      S.categorias.forEach(([cat, titulo]) => {
        const juegos = S.catalogo.filter((d) => d.cat === cat);
        if (!juegos.length) return;
        const sec = document.createElement("section");
        sec.className = "categoria";
        sec.innerHTML = "<h2>" + titulo + "</h2><div class='rejilla'></div>";
        const rej = sec.querySelector(".rejilla");
        juegos.forEach((d) => {
          const b = document.createElement("button");
          b.className = "tarjeta";
          b.setAttribute("data-nav", "");
          b.dataset.juego = d.id;
          b.innerHTML = "<span class='icono'></span><span class='nombre'></span><span class='info'></span>";
          b.querySelector(".icono").textContent = d.icono;
          b.querySelector(".nombre").textContent = d.nombre;
          b.addEventListener("click", () => abrirConfig(d));
          rej.appendChild(b);
        });
        cont.appendChild(sec);
      });
    }
    const todo = leer("stats", {});
    cont.querySelectorAll(".tarjeta").forEach((b) => {
      const d = S.catalogo.find((x) => x.id === b.dataset.juego);
      const s = todo[d.id];
      let info = d.min === d.max ? d.min + " jugadores" : d.min + "–" + d.max + " jugadores";
      if (d.min === 1 && d.max === 1) info = "1 jugador";
      if (s && s.records && s.records.principal != null) info = "Récord: " + s.records.principal;
      else if (s && (s.victorias || s.derrotas)) info = "Ganadas " + s.victorias + " · Perdidas " + s.derrotas;
      else if (s && s.partidas) info = s.partidas + (s.partidas === 1 ? " partida" : " partidas");
      b.querySelector(".info").textContent = info;
    });
  }

  // ---------- Configuración ----------
  let cfgDef = null, cfg = null;
  const NIVELES = [[1, "Fácil"], [2, "Medio"], [3, "Difícil"]];
  function opcionesControl(def) {
    const l = ["tv"];
    Red.mandos.forEach((m) => l.push(m.id));
    if (def.maquina) l.push("cpu");
    return l;
  }
  function abrirConfig(def) {
    cfgDef = def;
    const previa = leer("cfg." + def.id, null);
    cfg = { n: def.min === 1 && def.max > 1 ? Math.min(2, def.max) : def.min, dificultad: 2, opciones: {}, slots: [], serie: 1 };
    if (def.maquina && def.min === 1 && def.max > 1 && def.id !== "minigolf" && def.id !== "bolos") cfg.n = 2;
    if (previa) Object.assign(cfg, { n: previa.n || cfg.n, dificultad: previa.dificultad || 2, opciones: previa.opciones || {}, slots: previa.slots || [], serie: previa.serie || 1 });
    (def.opciones || []).forEach((o) => { if (cfg.opciones[o.id] == null) cfg.opciones[o.id] = o.def; });
    cfg.n = Math.max(def.min, Math.min(def.max, cfg.n));
    asignarPorDefecto();
    $("cfgIcono").textContent = def.icono;
    $("cfgNombre").textContent = def.nombre;
    $("cfgDesc").textContent = def.desc;
    mostrar("config");
    pintarConfig();
    primerFoco();
  }
  function asignarPorDefecto() {
    const ops = opcionesControl(cfgDef);
    const moviles = ops.filter((o) => o !== "tv" && o !== "cpu");
    const usados = new Set();
    for (let i = 0; i < cfgDef.max; i++) {
      let s = cfg.slots[i];
      if (s && ops.indexOf(s) >= 0 && (s === "tv" || s === "cpu" || !usados.has(s))) { usados.add(s); continue; }
      if (i === 0) s = "tv";
      else {
        const libre = moviles.find((m) => !usados.has(m));
        if (libre) s = libre;
        else if (cfgDef.maquina) s = "cpu";
        else s = "tv";
      }
      cfg.slots[i] = s;
      usados.add(s);
    }
  }
  function fila(texto, valor, alCambiar, extra) {
    const b = document.createElement("button");
    b.className = "opcion" + (extra ? " " + extra : "");
    b.setAttribute("data-nav", "");
    b.dataset.cambia = "1";
    b.innerHTML = "<span class='etq'></span><span class='valor'></span>";
    b.querySelector(".etq").textContent = texto;
    b.querySelector(".valor").textContent = valor;
    b.addEventListener("click", () => alCambiar(1));
    b.addEventListener("cambia", (e) => alCambiar(e.detail));
    return b;
  }
  function ciclar(lista, actual, paso) {
    const i = lista.findIndex((x) => x[0] === actual);
    return lista[(i + paso + lista.length) % lista.length][0];
  }
  function pintarConfig() {
    if (!cfgDef) return;
    const def = cfgDef;
    asignarPorDefecto();
    const cont = $("cfgOpciones");
    const enfocado = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.clave : null;
    cont.innerHTML = "";
    const add = (clave, el) => { el.dataset.clave = clave; cont.appendChild(el); };
    const repintar = () => { guardar("cfg." + def.id, cfg); pintarConfig(); };

    if (def.max > def.min) {
      const vals = [];
      for (let n = def.min; n <= def.max; n++) vals.push([n, n === 1 ? "1 jugador" : n + " jugadores"]);
      add("n", fila("Jugadores", vals.find((v) => v[0] === cfg.n)[1], (p) => { cfg.n = ciclar(vals, cfg.n, p); repintar(); }));
    }
    const ops = opcionesControl(def);
    const nombres = ops.map((o) => [o, nombreMando(o)]);
    const esSolo = def.max === 1;
    for (let i = 0; i < cfg.n; i++) {
      const titulo = esSolo ? "Juegas con" : "Jugador " + (i + 1);
      const el = fila(titulo, nombreMando(cfg.slots[i]), (p) => { cfg.slots[i] = ciclar(nombres, cfg.slots[i], p); repintar(); }, "slot");
      el.style.setProperty("--color", S.COLORES[i]);
      add("slot" + i, el);
    }
    const hayCpu = cfg.slots.slice(0, cfg.n).indexOf("cpu") >= 0;
    if (def.dificultad && (hayCpu || !def.maquina)) {
      add("dif", fila(def.maquina ? "Nivel de la máquina" : "Dificultad", NIVELES.find((v) => v[0] === cfg.dificultad)[1], (p) => { cfg.dificultad = ciclar(NIVELES, cfg.dificultad, p); repintar(); }));
    }
    (def.opciones || []).forEach((o) => {
      const v = o.valores.find((x) => x[0] === cfg.opciones[o.id]) || o.valores[0];
      add("o_" + o.id, fila(o.nombre, v[1], (p) => { cfg.opciones[o.id] = ciclar(o.valores, cfg.opciones[o.id], p); repintar(); }));
    });

    if (def.max > 1 && cfg.n > 1) {
      const SERIES = [[1, "Una partida"], [3, "Al mejor de 3"], [5, "Al mejor de 5"]];
      add("serie", fila("Partidas", SERIES.find((v) => v[0] === cfg.serie)[1], (p) => { cfg.serie = ciclar(SERIES, cfg.serie, p); repintar(); }));
    }

    // Aviso si hace falta un mando por jugador
    const humanos = cfg.slots.slice(0, cfg.n).filter((s) => s !== "cpu");
    const tvs = humanos.filter((s) => s === "tv").length;
    let nota = "";
    if (def.tiempoReal && tvs > 1) nota = "En este juego cada persona necesita su propio mando: conecta móviles con el QR.";
    else if (!def.tiempoReal && tvs > 1) nota = "Os iréis pasando el mando de la tele por turnos.";
    else if (Red.mandos.size === 0 && def.max > 1) nota = "Conecta móviles con el QR para que cada uno juegue con el suyo.";
    $("cfgNota").textContent = nota;

    const jugar = document.createElement("button");
    jugar.className = "principal";
    jugar.setAttribute("data-nav", "");
    jugar.textContent = "Jugar";
    jugar.addEventListener("click", () => {
      if (def.tiempoReal && tvs > 1) { aviso("Cada jugador necesita su propio mando"); S.sonido("error"); return; }
      guardar("cfg." + def.id, cfg);
      empezar(def, JSON.parse(JSON.stringify(cfg)));
    });
    add("jugar", jugar);
    const el = enfocado && cont.querySelector("[data-clave='" + enfocado + "']");
    if (el) el.focus({ preventScroll: true });
    else if (pantalla === "config" && !contenedorActivo().contains(document.activeElement)) primerFoco();
  }

  // ---------- Diálogos ----------
  function abrirDialogo(o) {
    dialogo = o;
    $("dIcono").textContent = o.icono || "";
    $("dTitulo").textContent = o.titulo || "";
    $("dTexto").textContent = o.texto || "";
    const fila = $("dBotones");
    fila.innerHTML = "";
    o.botones.forEach((b, i) => {
      const el = document.createElement("button");
      el.className = i === 0 ? "principal" : "secundario";
      el.setAttribute("data-nav", "");
      el.textContent = b[0];
      el.addEventListener("click", () => { cerrarDialogo(); b[1](); });
      fila.appendChild(el);
    });
    $("velo").classList.add("activo");
    setTimeout(primerFoco, 30);
  }
  function cerrarDialogo() { dialogo = null; $("velo").classList.remove("activo"); }

  let avisoT = null;
  function aviso(t) {
    const el = $("aviso");
    el.textContent = t;
    el.classList.add("visible");
    clearTimeout(avisoT);
    avisoT = setTimeout(() => el.classList.remove("visible"), 2600);
  }
  S.aviso = aviso;

  // ============================================================
  // Perfiles, logros y clasificación
  // Cada persona se identifica por el nombre de su móvil ("Tú" es el mando de la tele).
  // ============================================================
  const LOGROS = [
    ["primera", "🥇", "Primera victoria", "Gana una partida"],
    ["diez", "🎮", "Jugón", "Juega 10 partidas"],
    ["cincuenta", "🕹", "Veterano", "Juega 50 partidas"],
    ["racha3", "🔥", "En racha", "Gana 3 partidas seguidas"],
    ["racha5", "☄", "Imparable", "Gana 5 partidas seguidas"],
    ["maquina", "🤖", "Le ganas a la máquina", "Gana a la máquina en difícil"],
    ["explorador", "🧭", "Curiosidad", "Juega a 10 juegos distintos"],
    ["coleccion", "🗺", "Lo he probado todo", "Juega a 30 juegos distintos"],
    ["record", "📈", "Superándote", "Bate uno de tus récords"],
    ["fiesta", "🎉", "Fiestón", "Juega una partida con 4 personas o más"],
    ["serie", "🏆", "Campeonato", "Gana una serie"],
    ["todoterreno", "🌈", "Todoterreno", "Gana en 4 tipos de juego distintos"]
  ];
  S.LOGROS = LOGROS;
  function perfilDe(j) {
    if (!j || j.cpu) return null;
    if (j.control === "tv") return j.nombre === "Tú" ? "Tú" : null;
    return j.nombre;
  }
  const colaLogros = [];
  let mostrandoLogro = false;
  function siguienteLogro() {
    if (mostrandoLogro || !colaLogros.length) return;
    mostrandoLogro = true;
    const [nombre, id] = colaLogros.shift(), l = LOGROS.find((x) => x[0] === id);
    aviso(l[1] + " ¡Logro de " + nombre + "! " + l[2]);
    S.sonido("punto");
    setTimeout(() => { mostrandoLogro = false; siguienteLogro(); }, 2900);
  }
  function darLogro(nombre, id) {
    const todos = leer("jugadores", {});
    const p = todos[nombre] = todos[nombre] || nuevoPerfil();
    if (p.logros.includes(id)) return;
    p.logros.push(id);
    guardar("jugadores", todos);
    colaLogros.push([nombre, id]);
    siguienteLogro();
  }
  function nuevoPerfil() { return { partidas: 0, victorias: 0, racha: 0, mejorRacha: 0, juegos: {}, cats: {}, logros: [] }; }
  function actualizarPerfiles(P, ganador) {
    const todos = leer("jugadores", {});
    const personas = P.jugadores.filter((j) => !j.cpu).length;
    const compiten = P.jugadores.length > 1;
    const nuevos = [];
    P.jugadores.forEach((j, i) => {
      const n = perfilDe(j);
      if (!n) return;
      const p = todos[n] = todos[n] || nuevoPerfil();
      p.partidas++;
      const jg = p.juegos[P.def.id] = p.juegos[P.def.id] || { p: 0, v: 0 };
      jg.p++;
      const gana = compiten && ganador === i;
      if (gana) { p.victorias++; jg.v++; p.racha++; p.mejorRacha = Math.max(p.mejorRacha, p.racha); p.cats[P.def.cat] = 1; }
      else if (compiten && ganador != null) p.racha = 0;
      const dar = (id) => { if (!p.logros.includes(id)) { p.logros.push(id); nuevos.push([n, id]); } };
      if (gana) dar("primera");
      if (p.partidas >= 10) dar("diez");
      if (p.partidas >= 50) dar("cincuenta");
      if (p.racha >= 3) dar("racha3");
      if (p.racha >= 5) dar("racha5");
      if (gana && P.jugadores.some((x) => x.cpu) && P.conf.dificultad === 3) dar("maquina");
      if (Object.keys(p.juegos).length >= 10) dar("explorador");
      if (Object.keys(p.juegos).length >= 30) dar("coleccion");
      if (personas >= 4) dar("fiesta");
      if (Object.keys(p.cats).length >= 4) dar("todoterreno");
    });
    guardar("jugadores", todos);
    nuevos.forEach((x) => colaLogros.push(x));
    setTimeout(siguienteLogro, 1400 / S.vel);
  }
  function pintarClasificacion() {
    const todos = leer("jugadores", {});
    const lista = Object.keys(todos).map((n) => Object.assign({ nombre: n }, todos[n])).sort((a, b) => b.victorias - a.victorias || b.partidas - a.partidas);
    const t = $("tablaRanking");
    t.innerHTML = "";
    if (!lista.length) {
      t.innerHTML = "<p class='vacio'>Todavía no hay partidas. Juega una y aquí saldrá quién va ganando.</p>";
    } else {
      lista.forEach((p, k) => {
        const fila = document.createElement("div");
        fila.className = "filaRanking";
        const pct = p.partidas ? Math.round((100 * p.victorias) / p.partidas) : 0;
        const fav = Object.keys(p.juegos).sort((a, b) => p.juegos[b].p - p.juegos[a].p)[0];
        const favDef = S.catalogo.find((d) => d.id === fav);
        fila.innerHTML = "<span class='pos'></span><span class='nom'></span><span class='num'></span><span class='num'></span><span class='num'></span><span class='fav'></span><span class='insignias'></span>";
        const c = fila.children;
        c[0].textContent = k === 0 ? "🥇" : k === 1 ? "🥈" : k === 2 ? "🥉" : k + 1 + "º";
        c[1].textContent = p.nombre;
        c[2].textContent = p.victorias;
        c[3].textContent = p.partidas;
        c[4].textContent = pct + " %";
        c[5].textContent = favDef ? favDef.icono + " " + favDef.nombre : "";
        c[6].textContent = p.logros.map((id) => (LOGROS.find((l) => l[0] === id) || [])[1]).join(" ");
        t.appendChild(fila);
      });
    }
    const lg = $("listaLogros");
    lg.innerHTML = "";
    LOGROS.forEach((l) => {
      const quien = lista.filter((p) => p.logros.includes(l[0])).map((p) => p.nombre);
      const d = document.createElement("div");
      d.className = "logro" + (quien.length ? " conseguido" : "");
      d.innerHTML = "<span class='ic'></span><span><b></b><br><small></small></span>";
      d.querySelector(".ic").textContent = l[1];
      d.querySelector("b").textContent = l[2];
      d.querySelector("small").textContent = l[3] + (quien.length ? " · " + quien.join(", ") : "");
      lg.appendChild(d);
    });
  }

  // ============================================================
  // Partida
  // ============================================================
  let partida = null;
  const lienzo = () => $("lienzo");
  let g = null;
  function ajustarLienzo() {
    const c = lienzo();
    const w = window.innerWidth, h = window.innerHeight;
    const esc = Math.min(w / S.ANCHO, h / S.ALTO);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(S.ANCHO * esc * dpr);
    c.height = Math.round(S.ALTO * esc * dpr);
    c.style.width = Math.round(S.ANCHO * esc) + "px";
    c.style.height = Math.round(S.ALTO * esc) + "px";
    S.escala = esc * dpr;
    g = c.getContext("2d");
  }
  window.addEventListener("resize", ajustarLienzo);

  const cargados = {};
  function cargarJuego(id) {
    if (S._juegos[id]) return Promise.resolve();
    if (cargados[id]) return cargados[id];
    cargados[id] = new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = "j/" + id + ".js?v=" + (S.version || 1);
      s.onload = () => (S._juegos[id] ? ok() : mal(new Error("El juego " + id + " no se ha registrado")));
      s.onerror = () => { delete cargados[id]; mal(new Error("No se pudo cargar " + id)); };
      document.head.appendChild(s);
    });
    return cargados[id];
  }

  function nombresJugadores(slots) {
    const nTv = slots.filter((s) => s === "tv").length;
    const nCpu = slots.filter((s) => s === "cpu").length;
    let kCpu = 0;
    return slots.map((s, i) => {
      if (s === "cpu") { kCpu++; return nCpu > 1 ? "Máquina " + kCpu : "Máquina"; }
      if (s === "tv") return nTv > 1 || slots.length > 1 && nCpu === 0 ? "Jugador " + (i + 1) : "Tú";
      const m = Red.mandos.get(s);
      return m ? m.nombre : "Jugador " + (i + 1);
    });
  }

  function empezar(def, conf, serie) {
    aviso("Cargando " + def.nombre + "…");
    cargarJuego(def.id).then(() => {
      $("aviso").classList.remove("visible");
      const slots = conf.slots.slice(0, conf.n);
      const nombres = nombresJugadores(slots);
      const P = (partida = {
        def, conf, turno: 0, pausada: false, terminada: false, timers: [], t: 0,
        jugadores: slots.map((s, i) => ({ nombre: nombres[i], color: S.COLORES[i], cpu: s === "cpu", control: s, indice: i }))
      });
      P.serie = serie !== undefined ? serie : conf.serie > 1 && conf.n > 1 ? { total: conf.serie, victorias: slots.map(() => 0), jugadas: 0 } : null;
      P.J = crearAPI(P);
      mostrar("juego");
      ajustarLienzo();
      try { P.juego = S._juegos[def.id](P.J) || {}; } catch (e) { fallo(e); return; }
      avisarMoviles();
    }).catch((e) => { fallo(e); aviso("No se pudo abrir el juego. ¿Hay conexión?"); });
  }

  function crearAPI(P) {
    const J = {
      ancho: S.ANCHO, alto: S.ALTO,
      jugadores: P.jugadores,
      n: P.jugadores.length,
      dificultad: P.conf.dificultad || 2,
      opcion: (id) => P.conf.opciones[id],
      get turnoActual() { return P.turno; },
      turno(i) {
        if (P.turno === i && P._turnoAvisado) return;
        P.turno = i;
        P._turnoAvisado = true;
        const j = P.jugadores[i];
        if (j && j.control !== "tv" && j.control !== "cpu") Red.enviar(j.control, { vibrar: !P.def.tiempoReal });
        avisarMoviles();
      },
      pulsada(i, accion) {
        const j = P.jugadores[i];
        if (!j || j.cpu) return false;
        const p = pulsadas[j.control];
        return !!(p && p.has(accion));
      },
      despues(ms, fn) { const t = { quedan: ms / 1000, fn }; P.timers.push(t); return t; },
      cancelar(t) { const i = P.timers.indexOf(t); if (i >= 0) P.timers.splice(i, 1); },
      terminar(res) { terminar(P, res || {}); },
      record(valor, mayorEsMejor, clave) {
        clave = clave || "principal";
        const st = stats(P.def.id);
        const ant = st.s.records[clave];
        const nuevo = ant == null || (mayorEsMejor === false ? valor < ant : valor > ant);
        if (nuevo) { st.s.records[clave] = valor; st.guardar(); }
        if (nuevo && ant != null) { const j = P.jugadores.find((x) => perfilDe(x)); if (j) darLogro(perfilDe(j), "record"); }
        return { nuevo, mejor: nuevo ? valor : ant, anterior: ant };
      },
      sonido: (n) => S.sonido(n),
      aviso: (t) => aviso(t),
      azar: (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
      entero: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
      elegir: (l) => l[Math.floor(Math.random() * l.length)],
      enviar: (i, d) => { const j = P.jugadores[i]; if (j && j.control !== "tv" && j.control !== "cpu") Red.enviar(j.control, d); },
      get tiempo() { return P.t; },
      get terminada() { return P.terminada; }
    };
    return J;
  }

  function terminar(P, res) {
    if (P.terminada) return;
    P.terminada = true;
    window.__resultado = res;
    const st = stats(P.def.id);
    st.s.partidas++;
    const humanos = P.jugadores.filter((j) => !j.cpu);
    const hayCpu = P.jugadores.some((j) => j.cpu);
    const g = res.ganador;
    let icono = "🏁", titulo = res.titulo;
    if (g != null && P.jugadores[g]) {
      const gan = P.jugadores[g];
      if (hayCpu && humanos.length) {
        if (gan.cpu) { st.s.derrotas++; icono = "😤"; titulo = titulo || (humanos.length === 1 ? "Ha ganado la máquina" : "Gana " + gan.nombre); S.sonido("perder"); }
        else { st.s.victorias++; icono = "🏆"; titulo = titulo || (humanos.length === 1 && gan.nombre === "Tú" ? "¡Has ganado!" : "¡Gana " + gan.nombre + "!"); S.sonido("ganar"); confeti(); }
      } else {
        icono = "🏆"; titulo = titulo || "¡Gana " + gan.nombre + "!"; S.sonido("ganar"); confeti();
      }
    } else if (res.ganador === null) {
      if (hayCpu && humanos.length) st.s.empates++;
      icono = "🤝"; titulo = titulo || "Empate";
    } else {
      icono = res.icono || (res.bien ? "🏆" : "🏁");
      titulo = titulo || "Fin de la partida";
      if (res.bien) { S.sonido("ganar"); confeti(); }
    }
    if (res.icono) icono = res.icono;
    st.guardar();
    actualizarPerfiles(P, g != null && P.jugadores[g] ? g : null);
    let texto = res.texto || "", botones = [["Otra partida", () => empezar(P.def, P.conf)], ["Cambiar opciones", () => { partida = null; abrirConfig(P.def); }], ["Menú", salirAlMenu]];
    const SR = P.serie;
    if (SR) {
      SR.jugadas++;
      if (g != null && P.jugadores[g]) SR.victorias[g]++;
      const necesarias = Math.ceil(SR.total / 2), campeon = SR.victorias.findIndex((v) => v >= necesarias);
      const marcador = P.jugadores.map((j, i) => j.nombre + " " + SR.victorias[i]).join(" · ");
      if (campeon >= 0) {
        icono = "🏆"; titulo = "¡" + P.jugadores[campeon].nombre + " gana la serie!";
        texto = (res.texto ? res.texto + "\n" : "") + "Serie al mejor de " + SR.total + ": " + marcador;
        const n = perfilDe(P.jugadores[campeon]); if (n) darLogro(n, "serie");
        S.sonido("ganar"); confeti();
        botones = [["Nueva serie", () => empezar(P.def, P.conf)], ["Cambiar opciones", () => { partida = null; abrirConfig(P.def); }], ["Menú", salirAlMenu]];
      } else {
        texto = (res.texto ? res.texto + "\n" : "") + "Serie al mejor de " + SR.total + " · partida " + SR.jugadas + ": " + marcador;
        botones = [["Siguiente partida", () => empezar(P.def, P.conf, SR)], ["Dejar la serie", salirAlMenu]];
      }
    }
    avisarMoviles();
    setTimeout(() => {
      if (partida !== P) return;
      abrirDialogo({ icono, titulo, texto, botones });
    }, 1100 / S.vel);
  }

  function pausar() {
    const P = partida;
    if (!P || P.terminada) return;
    P.pausada = true;
    abrirDialogo({
      icono: "⏸", titulo: "Pausa", texto: P.def.nombre,
      alCancelar: () => { cerrarDialogo(); P.pausada = false; },
      botones: [["Seguir", () => { P.pausada = false; }], ["Empezar de nuevo", () => empezar(P.def, P.conf)], ["Salir al menú", salirAlMenu]]
    });
  }
  function salirAlMenu() { partida = null; mostrar("inicio"); }

  function fallo(e) {
    console.error(e);
    window.__errores.push(String(e && e.stack || e));
  }

  // Bucle principal
  let ultimo = performance.now();
  function bucle(ahora) {
    requestAnimationFrame(bucle);
    let dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    const P = partida;
    if (!P || pantalla !== "juego" || !P.juego) return;
    try {
      if (!P.pausada) {
        for (let k = 0; k < S.vel; k++) {
          P.t += dt;
          for (let i = 0; i < P.timers.length; i++) {
            const t = P.timers[i];
            t.quedan -= dt;
            if (t.quedan <= 0) { P.timers.splice(i, 1); i--; t.fn(); if (partida !== P) return; }
          }
          if (P.juego.actualizar) P.juego.actualizar(dt);
          if (partida !== P) return;
        }
      }
      g.setTransform(S.escala, 0, 0, S.escala, 0, 0);
      g.clearRect(0, 0, S.ANCHO, S.ALTO);
      if (P.juego.dibujar) P.juego.dibujar(g);
      dibujarPie(g, P);
    } catch (e) {
      fallo(e);
      P.pausada = true;
      abrirDialogo({ icono: "⚠️", titulo: "Algo ha fallado", texto: String(e.message || e), botones: [["Volver al menú", salirAlMenu]] });
    }
  }
  function dibujarPie(g, P) {
    S.dib.texto(g, "Atrás: pausa", 1890, 1060, { tam: 22, color: "rgba(255,255,255,.35)", alin: "right" });
  }

  // ============================================================
  // Sonido (sintetizado, sin ficheros)
  // ============================================================
  let ac = null, sonidoListo = false;
  function desbloquearSonido() {
    if (sonidoListo) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      sonidoListo = true;
    } catch (e) {}
  }
  const SONIDOS = {
    clic: [[880, 0.03, "sine", 0.05]],
    mover: [[520, 0.05, "triangle", 0.12]],
    comer: [[330, 0.06, "square", 0.08], [220, 0.09, "square", 0.08]],
    gol: [[523, 0.1, "triangle", 0.15], [659, 0.1, "triangle", 0.15], [784, 0.2, "triangle", 0.15]],
    punto: [[784, 0.06, "sine", 0.12], [1046, 0.1, "sine", 0.12]],
    ganar: [[523, 0.12, "triangle", 0.16], [659, 0.12, "triangle", 0.16], [784, 0.12, "triangle", 0.16], [1046, 0.35, "triangle", 0.16]],
    perder: [[392, 0.18, "sawtooth", 0.07], [330, 0.18, "sawtooth", 0.07], [262, 0.4, "sawtooth", 0.07]],
    error: [[160, 0.12, "square", 0.08]],
    golpe: [[180, 0.04, "triangle", 0.25]],
    caida: [[600, 0.05, "sine", 0.12], [300, 0.12, "sine", 0.12]],
    tic: [[1200, 0.02, "square", 0.04]],
    explosion: [[90, 0.25, "sawtooth", 0.15]]
  };
  S.tono = function (f, d, tipo) {
    if (!ac || S.silencio) return;
    try {
      const t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain();
      o.type = tipo || "triangle"; o.frequency.setValueAtTime(f, t);
      gn.gain.setValueAtTime(0.15, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + (d || 0.3));
      o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + (d || 0.3) + 0.02);
    } catch (e) {}
  };
  S.sonido = function (n) {
    if (!ac || S.silencio) return;
    const notas = SONIDOS[n];
    if (!notas) return;
    try {
      let t = ac.currentTime;
      notas.forEach(([f, d, tipo, vol]) => {
        const o = ac.createOscillator(), gn = ac.createGain();
        o.type = tipo;
        o.frequency.setValueAtTime(f, t);
        gn.gain.setValueAtTime(vol, t);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(gn).connect(ac.destination);
        o.start(t);
        o.stop(t + d + 0.02);
        t += d * 0.9;
      });
    } catch (e) {}
  };

  // ============================================================
  // Dibujo
  // ============================================================
  const FUENTE = "Barlow, system-ui, sans-serif";
  const FUENTE_TIT = "'Playfair Display', Georgia, serif";
  function hex(c) {
    const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
    c = c.replace("#", "");
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  function mezclar(c, f) {
    // f > 0 aclara hacia blanco, f < 0 oscurece hacia negro
    const [r, gg, b] = hex(c);
    const m = (v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
    return "rgb(" + m(r) + "," + m(gg) + "," + m(b) + ")";
  }
  function alfa(c, a) { const [r, gg, b] = hex(c); return "rgba(" + r + "," + gg + "," + b + "," + a + ")"; }
  const dib = (S.dib = {
    mezclar, alfa, FUENTE, FUENTE_TIT,
    fondo(g, c1, c2) {
      const gr = g.createRadialGradient(960, 300, 100, 960, 540, 1300);
      gr.addColorStop(0, c1 || "#2a1f33");
      gr.addColorStop(1, c2 || "#0d0a12");
      g.fillStyle = gr;
      g.fillRect(0, 0, S.ANCHO, S.ALTO);
    },
    texto(g, s, x, y, o) {
      o = o || {};
      g.save();
      g.font = (o.cursiva ? "italic " : "") + (o.peso || 600) + " " + (o.tam || 32) + "px " + (o.titulo ? FUENTE_TIT : FUENTE);
      g.textAlign = o.alin || "left";
      g.textBaseline = o.base || "middle";
      if (o.sombra !== false) { g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = o.sombra || 8; g.shadowOffsetY = 2; }
      g.fillStyle = o.color || "#f6efe2";
      g.fillText(String(s), x, y, o.max);
      g.restore();
    },
    medir(g, s, tam, peso) { g.save(); g.font = (peso || 600) + " " + (tam || 32) + "px " + FUENTE; const w = g.measureText(String(s)).width; g.restore(); return w; },
    ruta(g, x, y, w, h, r) {
      r = Math.min(r || 0, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    },
    caja(g, x, y, w, h, o) {
      o = o || {};
      g.save();
      if (o.sombra) { g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = o.sombra; g.shadowOffsetY = o.sombra / 3; }
      dib.ruta(g, x, y, w, h, o.r == null ? 16 : o.r);
      if (o.relleno) { g.fillStyle = o.relleno; g.fill(); }
      g.shadowColor = "transparent";
      if (o.borde) { g.lineWidth = o.grosor || 3; g.strokeStyle = o.borde; g.stroke(); }
      g.restore();
    },
    ficha(g, x, y, r, color, o) {
      o = o || {};
      g.save();
      if (o.sombra !== false) { g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = r * 0.5; g.shadowOffsetY = r * 0.18; }
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      gr.addColorStop(0, mezclar(color, 0.45));
      gr.addColorStop(0.55, color);
      gr.addColorStop(1, mezclar(color, -0.45));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = "transparent";
      if (o.anillo !== false) {
        g.strokeStyle = "rgba(255,255,255,.18)";
        g.lineWidth = Math.max(1, r * 0.08);
        g.beginPath();
        g.arc(x, y, r * 0.72, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
    },
    cursor(g, x, y, w, h, color, t) {
      const pulso = 0.6 + 0.4 * Math.sin((t || performance.now() / 1000) * 6);
      g.save();
      g.shadowColor = color || "#ffd98a";
      g.shadowBlur = 24 * pulso;
      g.strokeStyle = color || "#ffd98a";
      g.lineWidth = 6;
      dib.ruta(g, x + 3, y + 3, w - 6, h - 6, 10);
      g.stroke();
      g.restore();
    },
    // Columna de jugadores: [{nombre, color, valor, activo, detalle}]
    marcador(g, items, x, y, ancho) {
      ancho = ancho || 380;
      items.forEach((it, i) => {
        const yy = y + i * 104;
        dib.caja(g, x, yy, ancho, 90, { relleno: it.activo ? "rgba(255,217,138,.13)" : "rgba(255,255,255,.05)", borde: it.activo ? "#e8b85c" : "rgba(255,255,255,.1)", r: 16 });
        dib.ficha(g, x + 45, yy + 45, 22, it.color, { anillo: false });
        dib.texto(g, it.nombre, x + 84, yy + (it.detalle ? 32 : 45), { tam: 30, peso: 700, max: ancho - 190 });
        if (it.detalle) dib.texto(g, it.detalle, x + 84, yy + 64, { tam: 21, color: "#a79db3", peso: 400, max: ancho - 190 });
        if (it.valor != null) dib.texto(g, it.valor, x + ancho - 24, yy + 47, { tam: 44, peso: 700, alin: "right", titulo: true });
      });
    },
    ayuda(g, s) { dib.texto(g, s, 960, 1045, { tam: 24, color: "rgba(246,239,226,.55)", alin: "center", peso: 400 }); },
    titulo(g, s, x, y, o) { dib.texto(g, s, x, y, Object.assign({ tam: 56, titulo: true, peso: 700 }, o || {})); },
    estrella(g, x, y, r, color) {
      g.save(); g.fillStyle = color; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.restore();
    }
  });

  // ============================================================
  // Física de círculos (billar, carrom, hockey, minigolf, bolos)
  // ============================================================
  S.fisica = {
    mundo(o) {
      return Object.assign({ bolas: [], segs: [], agujeros: [], decel: 120, amort: 0.4, rebote: 0.85, reboteBolas: 0.95 }, o || {});
    },
    bola(m, x, y, r, extra) {
      const b = Object.assign({ x, y, r, vx: 0, vy: 0, masa: r * r, dentro: true, fija: false }, extra || {});
      m.bolas.push(b);
      return b;
    },
    seg(m, x1, y1, x2, y2, extra) { const s = Object.assign({ x1, y1, x2, y2 }, extra || {}); m.segs.push(s); return s; },
    rect(m, x0, y0, x1, y1) {
      S.fisica.seg(m, x0, y0, x1, y0); S.fisica.seg(m, x1, y0, x1, y1);
      S.fisica.seg(m, x1, y1, x0, y1); S.fisica.seg(m, x0, y1, x0, y0);
    },
    paso(m, dt, ev) {
      ev = ev || {};
      let vmax = 0, rmin = Infinity;
      for (const b of m.bolas) if (b.dentro) { vmax = Math.max(vmax, Math.hypot(b.vx, b.vy)); rmin = Math.min(rmin, b.r); }
      if (!isFinite(rmin)) return;
      const n = Math.max(1, Math.min(60, Math.ceil((vmax * dt) / (rmin * 0.4))));
      const h = dt / n;
      for (let k = 0; k < n; k++) {
        for (const b of m.bolas) {
          if (!b.dentro || b.fija) continue;
          b.x += b.vx * h; b.y += b.vy * h;
          const v = Math.hypot(b.vx, b.vy);
          if (v > 0) {
            const nv = Math.max(0, v - (b.decel != null ? b.decel : m.decel) * h) * Math.exp(-m.amort * h);
            if (nv < 2) { b.vx = 0; b.vy = 0; } else { b.vx *= nv / v; b.vy *= nv / v; }
          }
        }
        // bola contra bola
        const L = m.bolas;
        for (let i = 0; i < L.length; i++) {
          const a = L[i];
          if (!a.dentro) continue;
          for (let j = i + 1; j < L.length; j++) {
            const b = L[j];
            if (!b.dentro || (a.fantasma || b.fantasma)) continue;
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
            if (d >= min || d === 0) continue;
            const nx = dx / d, ny = dy / d;
            const ma = a.fija ? Infinity : a.masa, mb = b.fija ? Infinity : b.masa;
            const inv = (ma === Infinity ? 0 : 1 / ma) + (mb === Infinity ? 0 : 1 / mb);
            if (inv === 0) continue;
            const sol = (min - d) / inv;
            if (ma !== Infinity) { a.x -= nx * sol / ma; a.y -= ny * sol / ma; }
            if (mb !== Infinity) { b.x += nx * sol / mb; b.y += ny * sol / mb; }
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv > 0) continue;
            const imp = (-(1 + m.reboteBolas) * rv) / inv;
            if (ma !== Infinity) { a.vx -= (imp * nx) / ma; a.vy -= (imp * ny) / ma; }
            if (mb !== Infinity) { b.vx += (imp * nx) / mb; b.vy += (imp * ny) / mb; }
            if (ev.choque) ev.choque(a, b, -rv);
          }
        }
        // bola contra pared
        for (const b of m.bolas) {
          if (!b.dentro || b.fija) continue;
          for (const s of m.segs) {
            const ex = s.x2 - s.x1, ey = s.y2 - s.y1, l2 = ex * ex + ey * ey;
            let t = l2 ? ((b.x - s.x1) * ex + (b.y - s.y1) * ey) / l2 : 0;
            t = Math.max(0, Math.min(1, t));
            const px = s.x1 + ex * t, py = s.y1 + ey * t;
            const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy);
            if (d >= b.r || d === 0) continue;
            const nx = dx / d, ny = dy / d;
            b.x = px + nx * b.r; b.y = py + ny * b.r;
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0) {
              const reb = s.rebote != null ? s.rebote : m.rebote;
              b.vx -= (1 + reb) * vn * nx; b.vy -= (1 + reb) * vn * ny;
              if (ev.pared) ev.pared(b, s, -vn);
            }
          }
          for (const a of m.agujeros) {
            if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
              if (a.velMax && Math.hypot(b.vx, b.vy) > a.velMax) continue;
              b.dentro = false; b.vx = 0; b.vy = 0;
              if (ev.cae) ev.cae(b, a);
              break;
            }
          }
        }
      }
    },
    quieto(m) { return m.bolas.every((b) => !b.dentro || b.fija || (b.vx === 0 && b.vy === 0)); },
    clonar(m) {
      const c = Object.assign({}, m);
      c.bolas = m.bolas.map((b) => Object.assign({}, b));
      return c;
    },
    simular(m, maxT, ev) {
      // Simula hasta que todo se para (para la IA). Devuelve el tiempo usado.
      let t = 0;
      while (t < maxT) { S.fisica.paso(m, 1 / 60, ev); t += 1 / 60; if (S.fisica.quieto(m)) break; }
      return t;
    }
  };

  // ============================================================
  // Puntería (billar, carrom, minigolf, bolos, tanques)
  // Mando: ◀ ▶ ángulo (mantener acelera), ▲ ▼ fuerza, OK tira.
  // Móvil: arrastrar fija ángulo y fuerza; soltar tira.
  // ============================================================
  S.punteria = function (J, o) {
    o = o || {};
    const P = { angulo: o.angulo || 0, fuerza: o.fuerza == null ? 0.55 : o.fuerza, vel: 0, min: o.min, max: o.max, paso: o.paso || 0.012 };
    P.limitar = () => {
      if (P.min != null) P.angulo = Math.max(P.min, Math.min(P.max, P.angulo));
      P.fuerza = Math.max(0.05, Math.min(1, P.fuerza));
    };
    P.tecla = (a) => {
      if (a === "izquierda") P.angulo -= P.paso;
      else if (a === "derecha") P.angulo += P.paso;
      else if (a === "arriba") P.fuerza += 0.05;
      else if (a === "abajo") P.fuerza -= 0.05;
      else if (a === "ok") return true;
      P.limitar();
      return false;
    };
    P.apuntar = (a) => { P.angulo = a.angulo; P.fuerza = a.fuerza; P.limitar(); return !!a.disparar; };
    P.actualizar = (dt, jug) => {
      const iz = J.pulsada(jug, "izquierda"), de = J.pulsada(jug, "derecha");
      if (iz || de) { P.vel = Math.min(2, P.vel + dt * 2); P.angulo += (de ? 1 : -1) * (0.15 + P.vel) * dt; P.limitar(); }
      else P.vel = 0;
    };
    return P;
  };
  dib.barraFuerza = function (g, x, y, w, h, f, color) {
    dib.caja(g, x, y, w, h, { relleno: "rgba(0,0,0,.45)", r: h / 2, borde: "rgba(255,255,255,.25)", grosor: 2 });
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, "#5fd38d"); gr.addColorStop(0.6, "#f2b84b"); gr.addColorStop(1, "#ef5b5b");
    g.save(); dib.ruta(g, x + 3, y + 3, Math.max(h - 6, (w - 6) * f), h - 6, (h - 6) / 2); g.fillStyle = gr; g.fill(); g.restore();
    dib.texto(g, "Fuerza " + Math.round(f * 100) + "%", x + w / 2, y + h / 2 + 1, { tam: h * 0.55, alin: "center", color: color || "#fff" });
  };

  // ============================================================
  // Cartas
  // ============================================================
  const PALOS_FR = ["picas", "corazones", "diamantes", "treboles"];
  const PALOS_ES = ["oros", "copas", "espadas", "bastos"];
  const SIMB = { picas: "♠", corazones: "♥", diamantes: "♦", treboles: "♣" };
  S.cartas = {
    baraja(tipo) {
      const l = [];
      if (tipo === "es") PALOS_ES.forEach((p) => [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].forEach((v) => l.push({ palo: p, valor: v, es: true })));
      else PALOS_FR.forEach((p) => { for (let v = 1; v <= 13; v++) l.push({ palo: p, valor: v }); });
      return l;
    },
    barajar(l) {
      for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
      return l;
    },
    roja(c) { return c.palo === "corazones" || c.palo === "diamantes"; },
    texto(c) {
      if (c.es) return ({ 1: "As", 10: "Sota", 11: "Caballo", 12: "Rey" }[c.valor] || c.valor) + " de " + c.palo;
      return ({ 1: "A", 11: "J", 12: "Q", 13: "K" }[c.valor] || c.valor) + SIMB[c.palo];
    },
    dibujar(g, c, x, y, w, o) {
      o = o || {};
      const h = w * 1.45, r = w * 0.09;
      g.save();
      if (o.atenuada) g.globalAlpha = 0.45;
      g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = w * 0.12; g.shadowOffsetY = w * 0.04;
      dib.ruta(g, x, y, w, h, r);
      if (o.bocaAbajo || !c) {
        const gr = g.createLinearGradient(x, y, x + w, y + h);
        gr.addColorStop(0, "#7b2635"); gr.addColorStop(1, "#4a1420");
        g.fillStyle = gr; g.fill(); g.shadowColor = "transparent";
        g.strokeStyle = "rgba(255,217,138,.6)"; g.lineWidth = w * 0.025;
        dib.ruta(g, x + w * 0.08, y + w * 0.08, w * 0.84, h - w * 0.16, r * 0.6); g.stroke();
        g.fillStyle = "rgba(255,217,138,.35)";
        for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
          g.beginPath(); g.arc(x + w * (0.22 + i * 0.19), y + h * (0.14 + j * 0.145), w * 0.035, 0, 7); g.fill();
        }
        g.restore();
        return;
      }
      g.fillStyle = "#fbf7ee"; g.fill(); g.shadowColor = "transparent";
      if (o.resaltada) { g.lineWidth = w * 0.06; g.strokeStyle = "#ffd98a"; g.stroke(); }
      else { g.lineWidth = 1.5; g.strokeStyle = "rgba(0,0,0,.2)"; g.stroke(); }
      if (c.es) dibujarEspanola(g, c, x, y, w, h);
      else {
        const col = S.cartas.roja(c) ? "#c62f3a" : "#1d1b24";
        const rango = ({ 1: "A", 11: "J", 12: "Q", 13: "K" }[c.valor] || String(c.valor));
        g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "700 " + w * 0.24 + "px " + FUENTE;
        g.fillText(rango, x + w * 0.17, y + w * 0.2);
        g.font = w * 0.2 + "px serif";
        g.fillText(SIMB[c.palo], x + w * 0.17, y + w * 0.42);
        if (c.valor > 10) {
          g.font = "700 " + w * 0.5 + "px " + FUENTE_TIT;
          g.fillText(rango, x + w * 0.55, y + h * 0.52);
          g.font = w * 0.24 + "px serif";
          g.fillText(SIMB[c.palo], x + w * 0.55, y + h * 0.78);
        } else {
          g.font = w * (c.valor === 1 ? 0.62 : 0.46) + "px serif";
          g.fillText(SIMB[c.palo], x + w * 0.56, y + h * 0.56);
        }
      }
      g.restore();
    }
  };
  function dibujarEspanola(g, c, x, y, w, h) {
    const COL = { oros: "#d29a1e", copas: "#c62f3a", espadas: "#2c5fa8", bastos: "#3d7a3a" };
    const col = COL[c.palo];
    g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "700 " + w * 0.24 + "px " + FUENTE;
    g.fillText(String(c.valor), x + w * 0.17, y + w * 0.2);
    // marco típico de la baraja española (cortes según el palo)
    g.strokeStyle = col; g.lineWidth = w * 0.02;
    dib.ruta(g, x + w * 0.08, y + w * 0.08, w * 0.84, h - w * 0.16, w * 0.05); g.stroke();
    const cx = x + w / 2, cy = y + h * 0.55, s = w * 0.2;
    g.save(); g.translate(cx, cy);
    simboloEspanol(g, c.palo, s, col);
    g.restore();
    if (c.valor >= 10) {
      g.font = "600 " + w * 0.13 + "px " + FUENTE;
      g.fillStyle = "#3a3346";
      g.fillText({ 10: "SOTA", 11: "CABALLO", 12: "REY" }[c.valor], cx, y + h * 0.84);
    }
  }
  function simboloEspanol(g, palo, s, col) {
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = s * 0.14; g.lineCap = "round";
    if (palo === "oros") {
      g.beginPath(); g.arc(0, 0, s, 0, 7); g.fill();
      g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = s * 0.12; g.beginPath(); g.arc(0, 0, s * 0.62, 0, 7); g.stroke();
    } else if (palo === "copas") {
      g.beginPath(); g.moveTo(-s, -s * 0.8); g.quadraticCurveTo(-s, s * 0.3, 0, s * 0.35); g.quadraticCurveTo(s, s * 0.3, s, -s * 0.8); g.closePath(); g.fill();
      g.fillRect(-s * 0.12, s * 0.3, s * 0.24, s * 0.55); g.fillRect(-s * 0.5, s * 0.82, s, s * 0.2);
    } else if (palo === "espadas") {
      g.beginPath(); g.moveTo(0, -s * 1.3); g.lineTo(s * 0.18, -s * 1.0); g.lineTo(s * 0.12, s * 0.5); g.lineTo(-s * 0.12, s * 0.5); g.lineTo(-s * 0.18, -s * 1.0); g.closePath(); g.fill();
      g.fillRect(-s * 0.6, s * 0.48, s * 1.2, s * 0.16); g.fillRect(-s * 0.1, s * 0.6, s * 0.2, s * 0.6);
    } else {
      g.beginPath(); g.moveTo(-s * 0.18, s * 1.2); g.lineTo(-s * 0.35, -s * 0.9); g.quadraticCurveTo(0, -s * 1.4, s * 0.35, -s * 0.9); g.lineTo(s * 0.18, s * 1.2); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,.35)";
      [-0.5, 0, 0.5].forEach((k) => { g.beginPath(); g.arc(0, s * k, s * 0.09, 0, 7); g.fill(); });
    }
  }

  // ============================================================
  // IA: negamax con poda alfa-beta, y elección con ruido según nivel
  // ============================================================
  S.ia = {
    // f = { jugadas(e), aplicar(e, j) -> nuevo estado, evaluar(e) -> nota para quien mueve en e, fin(e) -> null | nota para quien mueve }
    negamax(e, prof, f, alfa, beta) {
      alfa = alfa == null ? -Infinity : alfa; beta = beta == null ? Infinity : beta;
      const fin = f.fin ? f.fin(e) : null;
      if (fin != null) return { valor: fin };
      if (prof <= 0) return { valor: f.evaluar(e) };
      const js = f.jugadas(e);
      if (!js.length) return { valor: f.evaluar(e) };
      if (f.ordenar) f.ordenar(e, js);
      let mejor = { valor: -Infinity, jugada: js[0] };
      for (const j of js) {
        const v = -S.ia.negamax(f.aplicar(e, j), prof - 1, f, -beta, -alfa).valor;
        if (v > mejor.valor) mejor = { valor: v, jugada: j };
        if (v > alfa) alfa = v;
        if (alfa >= beta) break;
      }
      return mejor;
    },
    // Elige entre opciones puntuadas: en fácil se equivoca a menudo, en difícil casi nunca.
    elegir(opciones, nivel) {
      if (!opciones.length) return null;
      opciones.sort((a, b) => b.nota - a.nota);
      const fallo = nivel === 1 ? 0.45 : nivel === 2 ? 0.15 : 0;
      if (Math.random() < fallo) return opciones[Math.floor(Math.random() * Math.min(opciones.length, 4))];
      const top = opciones.filter((o) => o.nota >= opciones[0].nota - 1e-9);
      return top[Math.floor(Math.random() * top.length)];
    }
  };

  // ============================================================
  // Confeti
  // ============================================================
  function confeti() {
    const cv = $("confeti"), cx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const ps = [];
    for (let i = 0; i < 160; i++) ps.push({
      x: Math.random() * cv.width, y: -Math.random() * cv.height * 0.6,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      r: 5 + Math.random() * 8, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: S.COLORES[i % 6]
    });
    const t0 = Date.now();
    (function frame() {
      cx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.a += p.va; p.vy += 0.03;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c; cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); cx.restore();
      });
      if (Date.now() - t0 < 4000) requestAnimationFrame(frame); else cx.clearRect(0, 0, cv.width, cv.height);
    })();
  }
  S.confeti = confeti;

  // ============================================================
  // Arranque
  // ============================================================
  S.arrancar = function () {
    ajustarLienzo();
    Red.conectar();
    pintarConexion();
    $("verRanking").addEventListener("click", () => mostrar("ranking"));
    $("volverRanking").addEventListener("click", () => mostrar("inicio"));
    $("pantallaCompleta").addEventListener("click", () => {
      const el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen;
      try { f && f.call(el); } catch (e) {}
    });
    requestAnimationFrame(bucle);
    const prueba = params.get("prueba");
    if (prueba) {
      const def = S.catalogo.find((d) => d.id === prueba);
      const n = parseInt(params.get("n"), 10) || (def.max > 1 ? Math.max(def.min, 2) : 1);
      const todosCpu = def.maquina && params.get("cpu") !== "0";
      const slots = [];
      for (let i = 0; i < n; i++) slots.push(todosCpu ? "cpu" : "tv");
      const opciones = {};
      (def.opciones || []).forEach((o) => (opciones[o.id] = params.has("op_" + o.id) ? +params.get("op_" + o.id) : o.def));
      empezar(def, { n, dificultad: parseInt(params.get("dif"), 10) || 2, opciones, slots });
      return;
    }
    mostrar("inicio");
  };
})();
