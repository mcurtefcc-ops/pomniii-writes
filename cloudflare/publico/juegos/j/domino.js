Salon.juego("domino", function (J) {
  const D = Salon.dib;
  // Dominó doble seis. Con 2-3 jugadores se roba del montón; con 4 se pasa.
  const fichas = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) fichas.push([a, b]);
  Salon.cartas.barajar(fichas);
  const manos = J.jugadores.map(() => fichas.splice(0, 7));
  const monton = fichas;
  const cadena = []; // [{a, b}] orientadas de izquierda a derecha
  let turno = 0, sel = 0, lado = 1, pensando = false, fin = false, pases = 0, msg = "";

  // Empieza quien tenga el doble más alto
  (function () {
    let mejor = -1;
    manos.forEach((m, i) => m.forEach(([a, b]) => { if (a === b && a > mejor) { mejor = a; turno = i; } }));
  })();

  const extremos = () => (cadena.length ? [cadena[0].a, cadena[cadena.length - 1].b] : null);
  function opciones(f) {
    // lados donde encaja la ficha: 0 = izquierda, 1 = derecha
    const e = extremos();
    if (!e) return [1];
    const l = [];
    if (f[0] === e[0] || f[1] === e[0]) l.push(0);
    if (f[0] === e[1] || f[1] === e[1]) l.push(1);
    return l;
  }
  const jugables = (i) => manos[i].map((f, k) => ({ f, k, lados: opciones(f) })).filter((x) => x.lados.length);
  function colocar(i, k, l) {
    const f = manos[i].splice(k, 1)[0];
    const e = extremos();
    if (!e) cadena.push({ a: f[0], b: f[1] });
    else if (l === 0) cadena.unshift(f[1] === e[0] ? { a: f[0], b: f[1] } : { a: f[1], b: f[0] });
    else cadena.push(f[0] === e[1] ? { a: f[0], b: f[1] } : { a: f[1], b: f[0] });
    pases = 0;
    J.sonido("golpe");
    msg = J.jugadores[i].nombre + " pone " + f[0] + "·" + f[1];
    if (!manos[i].length) { fin = true; return J.despues(1000, () => J.terminar({ ganador: i, texto: "Se ha quedado sin fichas." })); }
    turno = (turno + 1) % J.n;
    J.despues(400, empezar);
  }
  function empezar() {
    J.turno(turno);
    // robar si hace falta (solo con montón)
    while (!jugables(turno).length && monton.length && J.n < 4) { manos[turno].push(monton.pop()); msg = J.jugadores[turno].nombre + " roba una ficha"; J.sonido("tic"); }
    if (!jugables(turno).length) {
      pases++;
      msg = J.jugadores[turno].nombre + " pasa";
      if (pases >= J.n) return cierre();
      turno = (turno + 1) % J.n;
      return J.despues(900, empezar);
    }
    sel = Math.min(sel, manos[turno].length - 1);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(700, () => { pensando = false; jugarMaquina(); }); }
  }
  function cierre() {
    fin = true;
    const pts = manos.map((m) => m.reduce((s, f) => s + f[0] + f[1], 0));
    const min = Math.min(...pts), gan = pts.map((p, i) => (p === min ? i : -1)).filter((i) => i >= 0);
    J.despues(1000, () => J.terminar({ ganador: gan.length === 1 ? gan[0] : null, texto: "Partida cerrada. Puntos en mano: " + J.jugadores.map((j, i) => j.nombre + " " + pts[i]).join(" · ") }));
  }
  function jugarMaquina() {
    const js = jugables(turno), ops = [];
    js.forEach(({ f, k, lados }) => lados.forEach((l) => {
      let nota = f[0] + f[1];
      if (J.dificultad >= 2 && f[0] === f[1]) nota += 6;
      if (J.dificultad === 3) {
        // conserva variedad de números y deja extremos que tengas tú
        const resto = manos[turno].filter((_, x) => x !== k);
        const e = extremos(), nuevo = !e ? f[1] : l === 0 ? (f[0] === e[0] ? f[1] : f[0]) : (f[0] === e[1] ? f[1] : f[0]);
        nota += 4 * resto.filter((r) => r[0] === nuevo || r[1] === nuevo).length;
      }
      ops.push({ k, l, nota });
    }));
    const e = Salon.ia.elegir(ops, J.dificultad);
    colocar(turno, e.k, e.l);
  }
  empezar();

  // ---- dibujo ----
  function ficha(g, x, y, a, b, w, vertical, o) {
    o = o || {};
    const h = w / 2;
    g.save(); g.translate(x, y); if (vertical) g.rotate(Math.PI / 2);
    D.caja(g, -w / 2, -h / 2, w, h, { relleno: o.atenuada ? "#bdb5a6" : "#fbf7ee", r: h * 0.18, sombra: o.alzada ? 30 : 10, borde: o.resaltada ? "#ffd98a" : "rgba(0,0,0,.25)", grosor: o.resaltada ? 6 : 2 });
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -h * 0.38); g.lineTo(0, h * 0.38); g.stroke();
    if (!o.oculta) { puntos(g, -w / 4, 0, a, h); puntos(g, w / 4, 0, b, h); }
    else { g.fillStyle = "#7b2635"; D.ruta(g, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 8); g.fill(); }
    g.restore();
  }
  function puntos(g, cx, cy, n, h) {
    const s = h * 0.26, P = { 0: [], 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
    g.fillStyle = "#1d1b24";
    P.forEach(([a, b]) => { g.beginPath(); g.arc(cx + a * s, cy + b * s, h * 0.085, 0, 7); g.fill(); });
  }

  return {
    tecla(j, a) {
      if (fin || pensando) return;
      const m = manos[turno];
      if (a === "izquierda") { sel = (sel + m.length - 1) % m.length; J.sonido("clic"); }
      else if (a === "derecha") { sel = (sel + 1) % m.length; J.sonido("clic"); }
      else if (a === "arriba" || a === "abajo") { lado = a === "arriba" ? 0 : 1; J.sonido("clic"); }
      else if (a === "ok") {
        const ls = opciones(m[sel]);
        if (!ls.length) { J.sonido("error"); J.aviso("Esa ficha no encaja en ningún extremo"); return; }
        colocar(turno, sel, ls.includes(lado) ? lado : ls[0]);
      }
    },
    dibujar(g) {
      D.fondo(g, "#123a2a", "#06140e");
      // mesa
      D.caja(g, 40, 140, 1840, 560, { relleno: "#17573c", r: 30, sombra: 30, borde: "#0c3a27", grosor: 10 });
      // cadena en filas de ida y vuelta
      const W = 110, porFila = 14, filas = Math.ceil(cadena.length / porFila) || 1;
      const y0 = 420 - (filas - 1) * 80;
      cadena.forEach((f, i) => {
        const fila = Math.floor(i / porFila), col = i % porFila, ida = fila % 2 === 0;
        const n = Math.min(porFila, cadena.length - fila * porFila);
        const x0 = 960 - (n * (W + 6)) / 2 + W / 2;
        const x = ida ? x0 + col * (W + 6) : x0 + (n - 1 - col) * (W + 6);
        ficha(g, x, y0 + fila * 160, ida ? f.a : f.b, ida ? f.b : f.a, W, false);
      });
      const e = extremos();
      D.texto(g, e ? "Extremos: " + e[0] + " y " + e[1] : "Mesa vacía: pon cualquier ficha", 960, 185, { tam: 30, alin: "center", color: "#ffd98a" });
      D.texto(g, monton.length && J.n < 4 ? "Montón: " + monton.length : "", 1840, 185, { tam: 26, alin: "right", color: "#a7d9be", peso: 400 });
      // jugadores
      J.jugadores.forEach((p, i) => {
        const x = 70 + i * 460;
        D.caja(g, x, 40, 440, 80, { relleno: i === turno && !fin ? "rgba(255,217,138,.15)" : "rgba(255,255,255,.05)", borde: i === turno && !fin ? "#e8b85c" : "rgba(255,255,255,.1)", r: 16 });
        D.ficha(g, x + 40, 80, 20, p.color, { anillo: false });
        D.texto(g, p.nombre, x + 74, 80, { tam: 28, peso: 700, max: 260 });
        D.texto(g, manos[i].length + (manos[i].length === 1 ? " ficha" : " fichas"), x + 420, 80, { tam: 24, alin: "right", color: "#a79db3", peso: 400 });
      });
      // mano del jugador del turno (si es humano)
      const humano = !J.jugadores[turno].cpu && !fin;
      const quien = humano ? turno : J.jugadores.findIndex((p) => !p.cpu);
      if (quien >= 0) {
        const m = manos[quien], W2 = Math.min(150, 1800 / Math.max(1, m.length) - 16), x0 = 960 - (m.length * (W2 + 16)) / 2 + W2 / 2;
        D.texto(g, humano ? "Tus fichas, " + J.jugadores[quien].nombre : "Fichas de " + J.jugadores[quien].nombre, 960, 760, { tam: 28, alin: "center", color: "#a79db3" });
        m.forEach((f, k) => {
          const ok = opciones(f).length > 0, s = humano && k === sel;
          ficha(g, x0 + k * (W2 + 16), 860 - (s ? 20 : 0), f[0], f[1], W2, false, { resaltada: s, atenuada: humano && !ok, alzada: s });
        });
        if (humano && m[sel]) {
          const ls = opciones(m[sel]);
          if (ls.length === 2) D.texto(g, "▲ poner a la izquierda · ▼ a la derecha → ahora: " + (lado === 0 ? "izquierda" : "derecha"), 960, 960, { tam: 26, alin: "center", color: "#ffd98a" });
        }
      }
      D.texto(g, pensando ? J.jugadores[turno].nombre + " piensa…" : msg, 960, 1010, { tam: 28, alin: "center", color: "#f6efe2", peso: 400 });
    }
  };
});
