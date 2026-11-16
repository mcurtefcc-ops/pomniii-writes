Salon.juego("buscaminas", function (J) {
  const D = Salon.dib;
  const [COLS, FILAS, MINAS] = [null, [9, 9, 10], [16, 14, 35], [24, 15, 70]][J.dificultad];
  const C = Math.min(96, Math.floor(Math.min(1700 / COLS, 900 / FILAS))), X0 = (1920 - COLS * C) / 2, Y0 = 150 + (900 - FILAS * C) / 2;
  const mina = [], abierta = [], bandera = [], cerca = [];
  for (let f = 0; f < FILAS; f++) { mina.push(Array(COLS).fill(false)); abierta.push(Array(COLS).fill(false)); bandera.push(Array(COLS).fill(false)); cerca.push(Array(COLS).fill(0)); }
  let cursor = [Math.floor(FILAS / 2), Math.floor(COLS / 2)], primero = true, fin = false, t = 0, pulsando = null, explotada = null;
  const vecinos = (f, c) => { const l = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if ((a || b) && f + a >= 0 && f + a < FILAS && c + b >= 0 && c + b < COLS) l.push([f + a, c + b]); return l; };
  function sembrar(f0, c0) {
    let n = 0;
    while (n < MINAS) {
      const f = J.entero(0, FILAS - 1), c = J.entero(0, COLS - 1);
      if (mina[f][c] || (Math.abs(f - f0) <= 1 && Math.abs(c - c0) <= 1)) continue;
      mina[f][c] = true; n++;
    }
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) cerca[f][c] = vecinos(f, c).filter(([a, b]) => mina[a][b]).length;
  }
  function abrir(f, c) {
    if (abierta[f][c] || bandera[f][c]) return;
    if (primero) { sembrar(f, c); primero = false; }
    if (mina[f][c]) { explotada = [f, c]; perder(); return; }
    const pila = [[f, c]];
    while (pila.length) {
      const [a, b] = pila.pop();
      if (abierta[a][b] || bandera[a][b]) continue;
      abierta[a][b] = true;
      if (cerca[a][b] === 0) vecinos(a, b).forEach((v) => !abierta[v[0]][v[1]] && pila.push(v));
    }
    J.sonido("tic");
    comprobar();
  }
  function accion(f, c) {
    if (fin) return;
    if (abierta[f][c]) {
      // si ya hay tantas banderas como el número, abre el resto de vecinos
      const vs = vecinos(f, c);
      if (cerca[f][c] && vs.filter(([a, b]) => bandera[a][b]).length === cerca[f][c]) vs.forEach(([a, b]) => !fin && abrir(a, b));
      return;
    }
    abrir(f, c);
  }
  function marcar(f, c) { if (fin || abierta[f][c]) return; bandera[f][c] = !bandera[f][c]; J.sonido("clic"); }
  function comprobar() {
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) if (!mina[f][c] && !abierta[f][c]) return;
    fin = true;
    const seg = Math.round(t), r = J.record(seg, false, "t" + J.dificultad);
    J.sonido("ganar");
    J.despues(700, () => J.terminar({ puntos: seg, bien: true, icono: "🏆", titulo: "¡Despejado en " + seg + " s!", texto: r.nuevo ? "¡Nuevo récord en este nivel!" : "Récord: " + r.mejor + " s" }));
  }
  function perder() {
    fin = true; J.sonido("explosion");
    J.despues(1400, () => J.terminar({ titulo: "¡Boom!", icono: "💣", texto: "Pisaste una mina." }));
  }
  J.turno(0);
  return {
    tecla(j, a) {
      if (fin) return;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = [(cursor[0] + d[0] + FILAS) % FILAS, (cursor[1] + d[1] + COLS) % COLS]; return; }
      if (a === "ok") pulsando = { t: 0, f: cursor[0], c: cursor[1] };
    },
    actualizar(dt) {
      if (!primero && !fin) t += dt;
      if (pulsando) {
        pulsando.t += dt;
        if (pulsando.t > 0.45) { marcar(pulsando.f, pulsando.c); pulsando = null; }
        else if (!J.pulsada(0, "ok")) { accion(pulsando.f, pulsando.c); pulsando = null; }
      }
    },
    dibujar(g) {
      D.fondo(g, "#1c2230", "#090b10");
      for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
        const x = X0 + c * C, y = Y0 + f * C;
        if (abierta[f][c] || (fin && mina[f][c])) {
          g.fillStyle = explotada && explotada[0] === f && explotada[1] === c ? "#ef5b5b" : "#e9e2d0"; g.fillRect(x + 1, y + 1, C - 2, C - 2);
          if (mina[f][c]) { g.fillStyle = "#1d1b24"; g.beginPath(); g.arc(x + C / 2, y + C / 2, C * 0.25, 0, 7); g.fill(); }
          else if (cerca[f][c]) D.texto(g, cerca[f][c], x + C / 2, y + C / 2 + 2, { tam: C * 0.55, alin: "center", peso: 700, sombra: false, color: ["", "#2f6fd6", "#2e9b52", "#e0393e", "#3a2a8a", "#8b2a2a", "#1d8a8a", "#222", "#777"][cerca[f][c]] });
        } else {
          D.caja(g, x + 2, y + 2, C - 4, C - 4, { relleno: "#4a5878", r: 6 });
          g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 4, y + 4, C - 8, 5);
          if (bandera[f][c]) { g.fillStyle = "#ef5b5b"; g.beginPath(); g.moveTo(x + C * 0.35, y + C * 0.22); g.lineTo(x + C * 0.72, y + C * 0.36); g.lineTo(x + C * 0.35, y + C * 0.5); g.fill(); g.fillStyle = "#e9e2d0"; g.fillRect(x + C * 0.33, y + C * 0.22, 4, C * 0.58); }
        }
      }
      if (!fin) {
        D.cursor(g, X0 + cursor[1] * C, Y0 + cursor[0] * C, C, C, "#ffd98a");
        if (pulsando) { g.strokeStyle = "#ef5b5b"; g.lineWidth = 6; g.beginPath(); g.arc(X0 + cursor[1] * C + C / 2, Y0 + cursor[0] * C + C / 2, C * 0.42, -Math.PI / 2, -Math.PI / 2 + (pulsando.t / 0.45) * Math.PI * 2); g.stroke(); }
      }
      const banderas = bandera.flat().filter(Boolean).length;
      D.titulo(g, "Buscaminas", 60, 70, { tam: 48 });
      D.texto(g, "💣 " + (MINAS - banderas), 960, 70, { tam: 40, alin: "center" });
      D.texto(g, "⏱ " + Math.floor(t) + " s", 1860, 70, { tam: 40, alin: "right" });
      D.ayuda(g, "OK destapa · mantén OK para poner bandera · OK sobre un número abre sus vecinos");
    }
  };
});
