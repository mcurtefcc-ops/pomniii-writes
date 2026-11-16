Salon.juego("gomoku", function (J) {
  const D = Salon.dib;
  const N = 15, C = 64, X0 = 170, Y0 = 92;
  const t = Array.from({ length: N }, () => Array(N).fill(-1));
  let turno = 0, cursor = [7, 7], fin = null, pensando = false, ultima = null, puestas = 0;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const en = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

  function linea(r, c, j) {
    for (const [dr, dc] of DIRS) {
      const l = [[r, c]];
      for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (en(rr, cc) && t[rr][cc] === j) { l.push([rr, cc]); rr += dr * s; cc += dc * s; } }
      if (l.length >= 5) return l;
    }
    return null;
  }
  // Valor de poner j en (r,c): suma por direcciones según largo y extremos abiertos
  function valor(r, c, j) {
    let v = 0;
    for (const [dr, dc] of DIRS) {
      let n = 1, abiertos = 0;
      for (const s of [1, -1]) {
        let rr = r + dr * s, cc = c + dc * s;
        while (en(rr, cc) && t[rr][cc] === j) { n++; rr += dr * s; cc += dc * s; }
        if (en(rr, cc) && t[rr][cc] < 0) abiertos++;
      }
      if (n >= 5) v += 1e6;
      else if (n === 4) v += abiertos === 2 ? 1e5 : abiertos === 1 ? 1e4 : 0;
      else if (n === 3) v += abiertos === 2 ? 5e3 : abiertos === 1 ? 400 : 0;
      else if (n === 2) v += abiertos === 2 ? 200 : abiertos === 1 ? 30 : 0;
      else v += abiertos;
    }
    return v;
  }
  function jugadaMaquina() {
    if (!puestas) return [7, 7];
    const ops = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (t[r][c] >= 0) continue;
      let cerca = false;
      for (let a = -2; a <= 2 && !cerca; a++) for (let b = -2; b <= 2; b++) if (en(r + a, c + b) && t[r + a][c + b] >= 0) { cerca = true; break; }
      if (!cerca) continue;
      const ataque = valor(r, c, turno), defensa = valor(r, c, 1 - turno);
      const k = J.dificultad === 1 ? 0.5 : J.dificultad === 2 ? 0.85 : 1;
      ops.push({ r, c, nota: ataque * (J.dificultad === 3 ? 1.1 : 1) + defensa * k + Math.random() * (J.dificultad === 1 ? 300 : 5) });
    }
    const e = Salon.ia.elegir(ops, J.dificultad === 1 ? 2 : J.dificultad);
    return [e.r, e.c];
  }
  function poner(r, c) {
    if (t[r][c] >= 0) { J.sonido("error"); return; }
    t[r][c] = turno; ultima = [r, c]; puestas++;
    J.sonido("golpe");
    const l = linea(r, c, turno);
    if (l) { fin = l; return J.despues(1000, () => J.terminar({ ganador: turno })); }
    if (puestas === N * N) { fin = []; return J.despues(800, () => J.terminar({ ganador: null })); }
    turno = 1 - turno;
    siguiente();
  }
  function siguiente() {
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(450, () => { pensando = false; const [r, c] = jugadaMaquina(); poner(r, c); }); }
  }
  siguiente();

  return {
    tecla(j, a) {
      if (fin || pensando) return;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = [(cursor[0] + d[0] + N) % N, (cursor[1] + d[1] + N) % N]; return; }
      if (a === "ok") poner(cursor[0], cursor[1]);
    },
    dibujar(g) {
      D.fondo(g, "#2c2216", "#0f0b07");
      const L = (N - 1) * C;
      D.caja(g, X0 - 50, Y0 - 50, L + 100, L + 100, { relleno: "#d9b26f", r: 16, sombra: 40 });
      g.strokeStyle = "rgba(60,38,10,.75)"; g.lineWidth = 2;
      for (let i = 0; i < N; i++) {
        g.beginPath(); g.moveTo(X0, Y0 + i * C); g.lineTo(X0 + L, Y0 + i * C); g.stroke();
        g.beginPath(); g.moveTo(X0 + i * C, Y0); g.lineTo(X0 + i * C, Y0 + L); g.stroke();
      }
      [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].forEach(([r, c]) => { g.fillStyle = "rgba(60,38,10,.85)"; g.beginPath(); g.arc(X0 + c * C, Y0 + r * C, 6, 0, 7); g.fill(); });
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (t[r][c] >= 0) D.ficha(g, X0 + c * C, Y0 + r * C, 27, J.jugadores[t[r][c]].color, { anillo: false });
      if (ultima) { g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(X0 + ultima[1] * C, Y0 + ultima[0] * C, 6, 0, 7); g.fill(); }
      if (fin) fin.forEach(([r, c]) => { g.save(); g.strokeStyle = "#fff"; g.lineWidth = 5; g.shadowColor = "#fff"; g.shadowBlur = 18; g.beginPath(); g.arc(X0 + c * C, Y0 + r * C, 30, 0, 7); g.stroke(); g.restore(); });
      if (!fin && !J.jugadores[turno].cpu) D.cursor(g, X0 + cursor[1] * C - C / 2, Y0 + cursor[0] * C - C / 2, C, C, J.jugadores[turno].color);
      D.titulo(g, "Cinco en raya", 1260, 160);
      D.marcador(g, J.jugadores.map((p, i) => ({ nombre: p.nombre, color: p.color, activo: i === turno && !fin })), 1260, 240, 560);
      D.texto(g, pensando ? "La máquina piensa…" : "Junta cinco en línea: recta o diagonal.", 1260, 480, { tam: 28, color: pensando ? "#ffd98a" : "#a79db3", peso: pensando ? 600 : 400 });
      D.ayuda(g, "Flechas: mover · OK: poner piedra");
    }
  };
});
