Salon.juego("parchis", function (J) {
  const D = Salon.dib;
  // Recorrido de 68 casillas alrededor del tablero. Cada color sale en su casilla
  // de salida con un 5, da la vuelta y entra por su pasillo (7 casillas) hasta la meta.
  const COLORES = [
    { nombre: "Amarillo", c: "#f2c230", salida: 5, entrada: 68, casa: [540, 860] },
    { nombre: "Azul", c: "#3f8be8", salida: 22, entrada: 17, casa: [220, 540] },
    { nombre: "Rojo", c: "#e5484d", salida: 39, entrada: 34, casa: [540, 220] },
    { nombre: "Verde", c: "#3fbf6f", salida: 56, entrada: 51, casa: [860, 540] }
  ];
  const SEGUROS = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68];
  // con 2 jugadores, colores enfrentados
  const colorDe = J.n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, J.n);
  const META = 108;
  // fichas[jugador] = 4 posiciones: -1 casa, 1..68 recorrido, 101..107 pasillo, 108 meta
  const fichas = J.jugadores.map(() => [-1, -1, -1, -1]);
  let turno = 0, dado = 1, fase = "tirar", seises = 0, opciones = [], sel = 0, anim = null, msg = "", tirando = 0, ultimaMovida = null, bonus = 0, fin = false;

  // ---- geometría ----
  const L = 900, X0 = 90, Y0 = 90, PASO = (4 * L) / 68;
  function puntoPerimetro(t) {
    t = ((t % (4 * L)) + 4 * L) % (4 * L);
    if (t < L) return [X0 + L - t, Y0 + L];
    if (t < 2 * L) return [X0, Y0 + L - (t - L)];
    if (t < 3 * L) return [X0 + (t - 2 * L), Y0];
    return [X0 + L, Y0 + (t - 3 * L)];
  }
  const posCasilla = (k) => { const [x, y] = puntoPerimetro((k - 0.5) * PASO); return [x + (540 - x) * 0.06, y + (540 - y) * 0.06]; };
  function posPasillo(col, k) { // k = 1..8 (8 = meta)
    const e = posCasilla(COLORES[col].entrada);
    const f = 0.13 + (k - 1) * 0.105;
    const meta = k === 8;
    const x = e[0] + (540 - e[0]) * (meta ? 0.86 : f), y = e[1] + (540 - e[1]) * (meta ? 0.86 : f);
    return [x, y];
  }
  function posFicha(j, i, p) {
    const col = colorDe[j];
    if (p === -1) { const [cx, cy] = COLORES[col].casa; return [cx + (i % 2 ? 34 : -34), cy + (i < 2 ? -34 : 34)]; }
    if (p > 100) return posPasillo(col, p - 100);
    return posCasilla(p);
  }

  // ---- reglas ----
  function enCasilla(k) { // fichas en una casilla del recorrido: [{j,i}]
    const l = [];
    fichas.forEach((fs, j) => fs.forEach((p, i) => { if (p === k) l.push({ j, i }); }));
    return l;
  }
  const barrera = (k) => { const l = enCasilla(k); return l.length === 2 && l[0].j === l[1].j; };
  function destino(j, i, n) {
    // devuelve {a, come, camino} o null si no se puede
    const col = colorDe[j], C = COLORES[col], p = fichas[j][i];
    if (p === META) return null;
    if (p === -1) {
      if (n !== 5) return null;
      const l = enCasilla(C.salida);
      if (l.length === 2) {
        const rival = l.find((x) => x.j !== j);
        if (!rival) return null;
        return { a: C.salida, come: rival, camino: [C.salida] };
      }
      return { a: C.salida, come: null, camino: [C.salida] };
    }
    const camino = [];
    let q = p;
    for (let s = 0; s < n; s++) {
      if (q > 100) q++;
      else if (q === C.entrada) q = 101;
      else q = q === 68 ? 1 : q + 1;
      if (q > META) return null;
      camino.push(q);
      if (q <= 68 && s < n - 1 && barrera(q)) return null;
    }
    if (q <= 68) {
      const l = enCasilla(q);
      if (l.length >= 2) return null;
      if (l.length === 1 && l[0].j !== j) {
        if (SEGUROS.includes(q)) return { a: q, come: null, camino };
        return { a: q, come: l[0], camino };
      }
    } else if (q < META) {
      if (fichas[j].filter((x) => x === q).length >= 2) return null;
    }
    return { a: q, come: null, camino };
  }
  function movimientos(j, n) {
    const l = [];
    for (let i = 0; i < 4; i++) { const d = destino(j, i, n); if (d) l.push(Object.assign({ i }, d)); }
    // con un 5 y fichas en casa, salir es obligatorio
    if (n === 5 && !bonus) { const salir = l.filter((m) => fichas[j][m.i] === -1); if (salir.length) return [salir[0]]; }
    return l;
  }

  function tirar() {
    if (fase !== "tirar" || anim || fin) return;
    fase = "rodando"; tirando = 0.8; J.sonido("tic");
  }
  function trasTirar() {
    let n = dado;
    if (n === 6) {
      seises++;
      if (seises === 3) {
        msg = "¡Tres seises! ";
        if (ultimaMovida && ultimaMovida.j === turno && fichas[turno][ultimaMovida.i] > 0 && fichas[turno][ultimaMovida.i] <= 68) { fichas[turno][ultimaMovida.i] = -1; msg += "La última ficha movida vuelve a casa."; J.sonido("perder"); }
        return J.despues(1200, () => pasarTurno());
      }
      if (fichas[turno].every((p) => p !== -1)) n = 7;
    }
    prepararMovimiento(n);
  }
  function prepararMovimiento(n) {
    opciones = movimientos(turno, n);
    if (!opciones.length) {
      msg = bonus ? "No se pueden contar los " + n : J.jugadores[turno].nombre + " no puede mover";
      bonus = 0;
      return J.despues(1000, () => (dado === 6 && seises < 3 ? otraVez() : pasarTurno()));
    }
    fase = "elegir"; sel = 0;
    opciones.n = n;
    if (J.jugadores[turno].cpu) J.despues(500, () => mover(elegirMaquina()));
    else if (opciones.length === 1) J.despues(350, () => { if (fase === "elegir") mover(opciones[0]); });
  }
  function elegirMaquina() {
    const ops = opciones.map((m) => {
      let nota = Math.random() * (J.dificultad === 1 ? 100 : 3);
      if (m.come) nota += 100;
      if (m.a === META) nota += 80;
      if (m.a > 100 && fichas[turno][m.i] <= 68) nota += 40;
      if (fichas[turno][m.i] === -1) nota += 50;
      if (m.a <= 68 && SEGUROS.includes(m.a)) nota += 20;
      if (J.dificultad === 3 && m.a <= 68 && !SEGUROS.includes(m.a)) {
        // peligro: fichas rivales que pueden alcanzar la casilla
        fichas.forEach((fs, j) => { if (j !== turno) fs.forEach((p) => { if (p > 0 && p <= 68) { const d = (m.a - p + 68) % 68; if (d >= 1 && d <= 7) nota -= 25; } }); });
      }
      nota += opciones.n * 0.5;
      return { m, nota };
    });
    return Salon.ia.elegir(ops, J.dificultad).m;
  }
  function mover(m) {
    if (fase !== "elegir") return;
    fase = "moviendo";
    anim = { m, k: 0, t: 0 };
    J.sonido("mover");
  }
  function trasMover() {
    const m = anim.m;
    anim = null;
    fichas[turno][m.i] = m.a;
    ultimaMovida = { j: turno, i: m.i };
    bonus = 0;
    if (m.come) {
      fichas[m.come.j][m.come.i] = -1;
      J.sonido("comer");
      msg = "¡" + J.jugadores[turno].nombre + " se come una ficha! Cuenta 20";
      bonus = 20;
    } else if (m.a === META) {
      J.sonido("gol");
      msg = "¡Ficha en la meta! Cuenta 10";
      bonus = 10;
    } else msg = "";
    if (fichas[turno].every((p) => p === META)) { fin = true; return J.despues(900, () => J.terminar({ ganador: turno })); }
    if (bonus) return J.despues(700, () => prepararMovimiento(bonus));
    J.despues(400, () => (dado === 6 && seises > 0 && seises < 3 ? otraVez() : pasarTurno()));
  }
  function otraVez() { msg = "Sacó 6: vuelve a tirar"; fase = "tirar"; empezar(); }
  function pasarTurno() { seises = 0; turno = (turno + 1) % J.n; fase = "tirar"; empezar(); }
  function empezar() {
    J.turno(turno);
    if (J.jugadores[turno].cpu) J.despues(600, tirar);
  }
  empezar();

  return {
    tecla(j, a) {
      if (fin) return;
      if (fase === "tirar" && a === "ok") return tirar();
      if (fase !== "elegir") return;
      if (a === "izquierda" || a === "arriba") { sel = (sel + opciones.length - 1) % opciones.length; J.sonido("clic"); }
      else if (a === "derecha" || a === "abajo") { sel = (sel + 1) % opciones.length; J.sonido("clic"); }
      else if (a === "ok") mover(opciones[sel]);
    },
    actualizar(dt) {
      if (fase === "rodando") {
        tirando -= dt;
        if (Math.random() < 0.5) dado = J.entero(1, 6);
        if (tirando <= 0) { dado = J.entero(1, 6); if (J.__dadoFijo) dado = J.__dadoFijo; fase = "tirado"; trasTirar(); }
      }
      if (anim) {
        anim.t += dt / 0.13;
        if (anim.t >= 1) { anim.t = 0; anim.k++; J.sonido("tic"); if (anim.k >= anim.m.camino.length) trasMover(); }
      }
    },
    dibujar(g) {
      D.fondo(g, "#24211c", "#0b0a08");
      // tablero
      D.caja(g, 20, 20, 1040, 1040, { relleno: "#f4ecd9", r: 40, sombra: 40 });
      // casas
      colorDe.forEach((col) => {
        const [cx, cy] = COLORES[col].casa;
        g.fillStyle = D.alfa(COLORES[col].c, 0.25); g.beginPath(); g.arc(cx, cy, 90, 0, 7); g.fill();
        g.strokeStyle = COLORES[col].c; g.lineWidth = 6; g.stroke();
      });
      // casillas del recorrido
      for (let k = 1; k <= 68; k++) {
        const [x, y] = posCasilla(k);
        const sal = COLORES.find((c) => c.salida === k), seguro = SEGUROS.includes(k);
        g.fillStyle = sal ? sal.c : seguro ? "#d8cdb4" : "#fffaf0";
        g.beginPath(); g.arc(x, y, 23, 0, 7); g.fill();
        g.strokeStyle = "rgba(60,45,20,.35)"; g.lineWidth = 2; g.stroke();
        if (seguro && !sal) D.texto(g, "●", x, y + 1, { tam: 14, alin: "center", color: "rgba(60,45,20,.45)", sombra: false });
      }
      // pasillos y meta
      COLORES.forEach((C, col) => {
        for (let k = 1; k <= 7; k++) { const [x, y] = posPasillo(col, k); g.fillStyle = D.alfa(C.c, 0.55); g.beginPath(); g.arc(x, y, 21, 0, 7); g.fill(); }
        const [mx, my] = posPasillo(col, 8);
        g.fillStyle = C.c; g.beginPath(); g.arc(mx, my, 30, 0, 7); g.fill();
      });
      D.texto(g, "🏁", 540, 540, { tam: 50, alin: "center" });
      // fichas
      const animando = anim ? { j: turno, i: anim.m.i } : null;
      const conteo = {};
      fichas.forEach((fs, j) => fs.forEach((p, i) => {
        if (animando && animando.j === j && animando.i === i) return;
        let [x, y] = posFicha(j, i, p);
        if (p !== -1) { const k = p + "," ; conteo[k] = (conteo[k] || 0) + 1; if (conteo[k] === 2) { x += 14; y -= 10; } else { x -= 6; y += 4; } }
        const elegible = fase === "elegir" && j === turno && !J.jugadores[turno].cpu && opciones.some((m) => m.i === i);
        const marcada = elegible && opciones[sel].i === i;
        D.ficha(g, x, y, marcada ? 22 : 19, COLORES[colorDe[j]].c);
        if (elegible) { g.save(); g.strokeStyle = marcada ? "#fff" : "rgba(255,255,255,.55)"; g.lineWidth = marcada ? 5 : 3; if (marcada) { g.shadowColor = "#fff"; g.shadowBlur = 20; } g.beginPath(); g.arc(x, y, 27, 0, 7); g.stroke(); g.restore(); }
      }));
      if (anim) {
        const m = anim.m, desde = anim.k === 0 ? posFicha(turno, m.i, fichas[turno][m.i]) : posFicha(turno, m.i, m.camino[anim.k - 1]);
        const hasta = posFicha(turno, m.i, m.camino[anim.k]);
        const e = anim.t;
        D.ficha(g, desde[0] + (hasta[0] - desde[0]) * e, desde[1] + (hasta[1] - desde[1]) * e - Math.sin(e * Math.PI) * 18, 21, COLORES[colorDe[turno]].c);
      }
      // destino de la ficha elegida
      if (fase === "elegir" && !J.jugadores[turno].cpu && opciones[sel]) {
        const [x, y] = posFicha(turno, opciones[sel].i, opciones[sel].a);
        g.save(); g.setLineDash([6, 6]); g.strokeStyle = "#1d1b24"; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 26, 0, 7); g.stroke(); g.restore();
      }
      // panel
      const px = 1130;
      D.titulo(g, "Parchís", px, 80);
      D.marcador(g, J.jugadores.map((p, j) => ({ nombre: p.nombre, color: COLORES[colorDe[j]].c, detalle: COLORES[colorDe[j]].nombre, valor: fichas[j].filter((x) => x === META).length + "/4", activo: j === turno && !fin })), px, 150, 700);
      const dy = 150 + J.n * 104 + 30;
      g.save(); g.translate(px + 75, dy + 75); if (fase === "rodando") g.rotate(Math.sin(J.tiempo * 30) * 0.3);
      D.caja(g, -70, -70, 140, 140, { relleno: "#fbf7ee", r: 24, sombra: 20 });
      const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[dado];
      g.fillStyle = "#1d1b24"; P.forEach(([a, b]) => { g.beginPath(); g.arc(a * 36, b * 36, 12, 0, 7); g.fill(); });
      g.restore();
      const quien = J.jugadores[turno];
      let instr = "";
      if (!fin && !quien.cpu) instr = fase === "tirar" ? "Pulsa OK para tirar" : fase === "elegir" ? (opciones.length > 1 ? "◀ ▶ elige ficha · OK mover " + opciones.n : "Moviendo " + opciones.n) : "";
      D.texto(g, instr, px + 180, dy + 50, { tam: 32, color: COLORES[colorDe[turno]].c, max: 560 });
      D.texto(g, quien.nombre + (quien.cpu ? " juega" : ""), px + 180, dy + 100, { tam: 26, color: "#a79db3", peso: 400 });
      D.texto(g, msg, px, dy + 190, { tam: 26, color: "#ffd98a", max: 760 });
      D.texto(g, "Sales con un 5 · el 6 repite · comer cuenta 20 · meta cuenta 10", px, 1010, { tam: 22, color: "#a79db3", peso: 400 });
    }
  };
});
