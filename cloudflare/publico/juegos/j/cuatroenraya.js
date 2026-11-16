Salon.juego("cuatroenraya", function (J) {
  const D = Salon.dib;
  const COLS = 7, FILAS = 6, C = 128, X0 = 140, Y0 = 200;
  const tab = Array.from({ length: FILAS }, () => Array(COLS).fill(-1));
  let turno = 0, col = 3, caida = null, fin = null, pensando = false;

  function libre(t, c) { for (let r = FILAS - 1; r >= 0; r--) if (t[r][c] < 0) return r; return -1; }
  function cuatro(t, r, c) {
    const j = t[r][c];
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const l = [[r, c]];
      for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < FILAS && cc >= 0 && cc < COLS && t[rr][cc] === j) { l.push([rr, cc]); rr += dr * s; cc += dc * s; } }
      if (l.length >= 4) return l;
    }
    return null;
  }
  // IA: negamax sobre una copia plana del tablero
  function evaluar(t, j) {
    let v = 0;
    const ventana = (cs) => {
      let mio = 0, suyo = 0;
      for (const [r, c] of cs) { if (t[r][c] === j) mio++; else if (t[r][c] === 1 - j) suyo++; }
      if (mio && suyo) return 0;
      return mio === 3 ? 50 : mio === 2 ? 10 : suyo === 3 ? -60 : suyo === 2 ? -10 : 0;
    };
    for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const cs = [];
        for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= FILAS || cc < 0 || cc >= COLS) break; cs.push([rr, cc]); }
        if (cs.length === 4) v += ventana(cs);
      }
      if (c === 3 && t[r][c] === j) v += 6;
    }
    return v;
  }
  const ORDEN = [3, 2, 4, 1, 5, 0, 6];
  function negamax(t, j, prof, a, b) {
    let algo = false, mejor = -Infinity;
    for (const c of ORDEN) {
      const r = libre(t, c);
      if (r < 0) continue;
      algo = true;
      t[r][c] = j;
      let v;
      if (cuatro(t, r, c)) v = 10000 + prof;
      else if (prof <= 1) v = evaluar(t, j);
      else v = -negamax(t, 1 - j, prof - 1, -b, -a);
      t[r][c] = -1;
      if (v > mejor) mejor = v;
      if (v > a) a = v;
      if (a >= b) break;
    }
    return algo ? mejor : 0;
  }
  function jugadaMaquina() {
    const prof = J.dificultad === 1 ? 2 : J.dificultad === 2 ? 4 : 7;
    const ops = [];
    for (const c of ORDEN) {
      const r = libre(tab, c);
      if (r < 0) continue;
      tab[r][c] = turno;
      const v = cuatro(tab, r, c) ? 100000 : -negamax(tab, 1 - turno, prof - 1, -Infinity, Infinity);
      tab[r][c] = -1;
      ops.push({ c, nota: v });
    }
    return Salon.ia.elegir(ops, J.dificultad).c;
  }
  function soltar(c) {
    const r = libre(tab, c);
    if (r < 0) { J.sonido("error"); return; }
    caida = { r, c, y: -1, v: 0, j: turno };
    J.sonido("mover");
  }
  function asentar() {
    const { r, c, j } = caida;
    tab[r][c] = j;
    caida = null;
    J.sonido("golpe");
    const l = cuatro(tab, r, c);
    if (l) { fin = l; return J.despues(1000, () => J.terminar({ ganador: j })); }
    if (tab[0].every((v) => v >= 0)) { fin = []; return J.despues(800, () => J.terminar({ ganador: null })); }
    turno = 1 - turno;
    siguiente();
  }
  function siguiente() {
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(450, () => { pensando = false; soltar(jugadaMaquina()); }); }
  }
  siguiente();

  return {
    tecla(j, a) {
      if (caida || fin || pensando) return;
      if (a === "izquierda") { col = (col + COLS - 1) % COLS; J.sonido("clic"); }
      else if (a === "derecha") { col = (col + 1) % COLS; J.sonido("clic"); }
      else if (a === "ok" || a === "abajo") soltar(col);
    },
    actualizar(dt) {
      if (!caida) return;
      caida.v += dt * 40;
      caida.y += caida.v * dt;
      if (caida.y >= caida.r) asentar();
    },
    dibujar(g) {
      D.fondo(g, "#16233a", "#0a0e18");
      const cx = (c) => X0 + c * C + C / 2, cy = (r) => Y0 + r * C + C / 2;
      // fichas (detrás del tablero)
      for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLS; c++) if (tab[r][c] >= 0) D.ficha(g, cx(c), cy(r), 52, J.jugadores[tab[r][c]].color, { sombra: false });
      if (caida) D.ficha(g, cx(caida.c), cy(Math.min(caida.y, caida.r)), 52, J.jugadores[caida.j].color, { sombra: false });
      // tablero con agujeros
      g.save();
      g.beginPath();
      D.ruta(g, X0 - 20, Y0 - 20, COLS * C + 40, FILAS * C + 40, 28);
      for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLS; c++) { g.moveTo(cx(c) + 56, cy(r)); g.arc(cx(c), cy(r), 56, 0, Math.PI * 2, true); }
      const gr = g.createLinearGradient(0, Y0, 0, Y0 + FILAS * C);
      gr.addColorStop(0, "#2f5fd0"); gr.addColorStop(1, "#1d3f99");
      g.fillStyle = gr; g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 40;
      g.fill("evenodd");
      g.restore();
      if (fin && fin.length) fin.forEach(([r, c]) => { g.save(); g.strokeStyle = "#fff"; g.lineWidth = 8; g.shadowColor = "#fff"; g.shadowBlur = 25; g.beginPath(); g.arc(cx(c), cy(r), 46, 0, 7); g.stroke(); g.restore(); });
      // ficha en espera arriba
      if (!caida && !fin && !J.jugadores[turno].cpu) {
        const y = 110 + Math.sin(J.tiempo * 5) * 8;
        D.ficha(g, cx(col), y, 52, J.jugadores[turno].color);
        D.texto(g, "▼", cx(col), y + 75, { tam: 30, alin: "center", color: "rgba(255,255,255,.6)" });
      }
      D.titulo(g, "Cuatro en raya", 1190, 220);
      D.marcador(g, J.jugadores.map((p, i) => ({ nombre: p.nombre, color: p.color, activo: i === turno && !fin })), 1190, 300, 560);
      D.texto(g, pensando ? "La máquina piensa…" : "", 1190, 540, { tam: 34, color: "#ffd98a" });
      D.ayuda(g, "◀ ▶ elegir columna · OK soltar ficha");
    }
  };
});
