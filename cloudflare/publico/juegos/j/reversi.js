Salon.juego("reversi", function (J) {
  const D = Salon.dib;
  const N = 8, C = 118, X0 = 150, Y0 = 68;
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  let t = Array.from({ length: N }, () => Array(N).fill(-1));
  t[3][3] = 1; t[4][4] = 1; t[3][4] = 0; t[4][3] = 0;
  const PESOS = [
    [120, -20, 20, 5, 5, 20, -20, 120], [-20, -40, -5, -5, -5, -5, -40, -20], [20, -5, 15, 3, 3, 15, -5, 20], [5, -5, 3, 3, 3, 3, -5, 5],
    [5, -5, 3, 3, 3, 3, -5, 5], [20, -5, 15, 3, 3, 15, -5, 20], [-20, -40, -5, -5, -5, -5, -40, -20], [120, -20, 20, 5, 5, 20, -20, 120]];
  let turno = 0, cursor = [2, 3], pensando = false, fin = false, volteo = [], tVolteo = 1;

  function vuelca(t, r, c, j) {
    if (t[r][c] >= 0) return [];
    const out = [];
    for (const [dr, dc] of DIRS) {
      const l = [];
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && t[rr][cc] === 1 - j) { l.push([rr, cc]); rr += dr; cc += dc; }
      if (l.length && rr >= 0 && rr < N && cc >= 0 && cc < N && t[rr][cc] === j) out.push(...l);
    }
    return out;
  }
  function jugadas(t, j) {
    const l = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = vuelca(t, r, c, j); if (v.length) l.push({ r, c, v }); }
    return l;
  }
  function aplicar(t, m, j) { const n = t.map((f) => f.slice()); n[m.r][m.c] = j; m.v.forEach(([r, c]) => (n[r][c] = j)); return n; }
  function cuenta(t, j) { return t.flat().filter((v) => v === j).length; }
  function evaluar(t, j) {
    let v = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (t[r][c] === j) v += PESOS[r][c]; else if (t[r][c] === 1 - j) v -= PESOS[r][c];
    return v + 5 * (jugadas(t, j).length - jugadas(t, 1 - j).length);
  }
  function negamax(t, j, prof, a, b) {
    const ms = jugadas(t, j);
    if (!ms.length) {
      if (!jugadas(t, 1 - j).length) { const d = cuenta(t, j) - cuenta(t, 1 - j); return d * 1000; }
      return -negamax(t, 1 - j, prof - 1, -b, -a);
    }
    if (prof <= 0) return evaluar(t, j);
    let mejor = -Infinity;
    for (const m of ms) {
      const v = -negamax(aplicar(t, m, j), 1 - j, prof - 1, -b, -a);
      if (v > mejor) mejor = v;
      if (v > a) a = v;
      if (a >= b) break;
    }
    return mejor;
  }
  function poner(m) {
    t = aplicar(t, m, turno);
    volteo = m.v.concat([[m.r, m.c]]); tVolteo = 0;
    J.sonido("mover");
    turno = 1 - turno;
    J.despues(450, siguiente);
  }
  function siguiente() {
    if (!jugadas(t, turno).length) {
      if (!jugadas(t, 1 - turno).length) {
        fin = true;
        const a = cuenta(t, 0), b = cuenta(t, 1);
        return J.despues(700, () => J.terminar({ ganador: a > b ? 0 : b > a ? 1 : null, texto: a + " a " + b }));
      }
      J.aviso(J.jugadores[turno].nombre + " no puede mover y pasa");
      turno = 1 - turno;
    }
    J.turno(turno);
    if (J.jugadores[turno].cpu) {
      pensando = true;
      J.despues(450, () => {
        const prof = J.dificultad === 1 ? 1 : J.dificultad === 2 ? 3 : 5;
        const ops = jugadas(t, turno).map((m) => ({ m, nota: -negamax(aplicar(t, m, turno), 1 - turno, prof - 1, -Infinity, Infinity) }));
        pensando = false;
        poner(Salon.ia.elegir(ops, J.dificultad).m);
      });
    }
  }
  siguiente();

  return {
    tecla(j, a) {
      if (pensando || fin || tVolteo < 1) return;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = [(cursor[0] + d[0] + N) % N, (cursor[1] + d[1] + N) % N]; J.sonido("clic"); return; }
      if (a === "ok") {
        const m = jugadas(t, turno).find((m) => m.r === cursor[0] && m.c === cursor[1]);
        if (m) poner(m); else { J.sonido("error"); J.aviso("Ahí no das la vuelta a ninguna ficha"); }
      }
    },
    actualizar(dt) { tVolteo = Math.min(1, tVolteo + dt * 3); },
    dibujar(g) {
      D.fondo(g, "#123026", "#07120e");
      D.caja(g, X0 - 24, Y0 - 24, N * C + 48, N * C + 48, { relleno: "#0b3d2a", r: 20, sombra: 40 });
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        g.fillStyle = (r + c) % 2 ? "#1f7a50" : "#228556";
        g.fillRect(X0 + c * C + 2, Y0 + r * C + 2, C - 4, C - 4);
      }
      const humano = !J.jugadores[turno].cpu && !fin && !pensando;
      const ms = humano ? jugadas(t, turno) : [];
      ms.forEach((m) => { g.fillStyle = D.alfa(J.jugadores[turno].color, 0.45); g.beginPath(); g.arc(X0 + m.c * C + C / 2, Y0 + m.r * C + C / 2, 14, 0, 7); g.fill(); });
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (t[r][c] < 0) continue;
        const enVolteo = volteo.some(([a, b]) => a === r && b === c) && tVolteo < 1;
        const esc = enVolteo ? Math.abs(Math.cos(tVolteo * Math.PI)) : 1;
        const col = enVolteo && tVolteo < 0.5 ? J.jugadores[1 - t[r][c]].color : J.jugadores[t[r][c]].color;
        g.save(); g.translate(X0 + c * C + C / 2, Y0 + r * C + C / 2); g.scale(Math.max(0.05, esc), 1);
        D.ficha(g, 0, 0, 46, col, { anillo: false });
        g.restore();
      }
      if (humano) D.cursor(g, X0 + cursor[1] * C, Y0 + cursor[0] * C, C, C, "#ffd98a");
      D.titulo(g, "Reversi", 1230, 120);
      D.marcador(g, J.jugadores.map((p, i) => ({ nombre: p.nombre, color: p.color, valor: cuenta(t, i), activo: i === turno && !fin })), 1230, 210, 560);
      D.texto(g, pensando ? "La máquina piensa…" : "", 1230, 450, { tam: 34, color: "#ffd98a" });
      D.texto(g, "Pon una ficha que encierre fichas rivales", 1230, 520, { tam: 26, color: "#a79db3", peso: 400 });
      D.texto(g, "en línea: se dan la vuelta y son tuyas.", 1230, 556, { tam: 26, color: "#a79db3", peso: 400 });
    }
  };
});
