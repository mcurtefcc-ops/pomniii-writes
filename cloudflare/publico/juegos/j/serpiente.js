Salon.juego("serpiente", function (J) {
  const D = Salon.dib;
  const C = 40, COLS = 46, FILAS = 23, X0 = (1920 - COLS * C) / 2, Y0 = 130;
  const TICK = [0, 0.13, 0.095, 0.07][J.dificultad];
  const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
  const salidas = [[6, 4, "derecha"], [COLS - 7, FILAS - 5, "izquierda"], [COLS - 7, 4, "izquierda"], [6, FILAS - 5, "derecha"]];
  const serps = J.jugadores.map((p, i) => {
    const [x, y, d] = salidas[i];
    const dir = DIRS[d];
    return { cuerpo: [[x, y], [x - dir[0], y - dir[1]], [x - 2 * dir[0], y - 2 * dir[1]]], dir, cola: [], viva: true, crecer: 0, puntos: 0 };
  });
  let comida = [], t = 0, fin = false, cuenta = 2.5;
  const solo = J.n === 1;
  function ocupado(x, y) { return serps.some((s) => s.viva && s.cuerpo.some(([a, b]) => a === x && b === y)); }
  function nuevaComida() {
    for (let k = 0; k < 500; k++) {
      const x = J.entero(0, COLS - 1), y = J.entero(0, FILAS - 1);
      if (!ocupado(x, y) && !comida.some(([a, b]) => a === x && b === y)) { comida.push([x, y]); return; }
    }
  }
  for (let k = 0; k < Math.max(2, J.n + 1); k++) nuevaComida();

  function libreEn(x, y) { return x >= 0 && y >= 0 && x < COLS && y < FILAS && !ocupado(x, y); }
  function pensarBot(s) {
    // busca en anchura el camino a la comida más cercana; si no, cualquier hueco libre
    const [hx, hy] = s.cuerpo[0];
    const opciones = Object.values(DIRS).filter((d) => !(d[0] === -s.dir[0] && d[1] === -s.dir[1]));
    if (J.dificultad === 1 && Math.random() < 0.12) { const d = J.elegir(opciones); if (libreEn(hx + d[0], hy + d[1])) return d; }
    const visto = new Set([hx + "," + hy]), cola = [];
    opciones.forEach((d) => { const x = hx + d[0], y = hy + d[1]; if (libreEn(x, y)) { cola.push([x, y, d]); visto.add(x + "," + y); } });
    let i = 0;
    while (i < cola.length) {
      const [x, y, d0] = cola[i++];
      if (comida.some(([a, b]) => a === x && b === y)) return d0;
      if (i > 900) break;
      for (const d of Object.values(DIRS)) { const nx = x + d[0], ny = y + d[1], k = nx + "," + ny; if (!visto.has(k) && libreEn(nx, ny)) { visto.add(k); cola.push([nx, ny, d0]); } }
    }
    const libres = opciones.filter((d) => libreEn(hx + d[0], hy + d[1]));
    return libres.length ? J.elegir(libres) : s.dir;
  }
  function paso() {
    serps.forEach((s, i) => {
      if (!s.viva) return;
      if (J.jugadores[i].cpu) s.dir = pensarBot(s);
      else if (s.cola.length) { const d = s.cola.shift(); if (!(d[0] === -s.dir[0] && d[1] === -s.dir[1])) s.dir = d; }
    });
    const cabezas = serps.map((s) => (s.viva ? [s.cuerpo[0][0] + s.dir[0], s.cuerpo[0][1] + s.dir[1]] : null));
    const mueren = [];
    serps.forEach((s, i) => {
      if (!s.viva) return;
      const [x, y] = cabezas[i];
      let choca = x < 0 || y < 0 || x >= COLS || y >= FILAS;
      serps.forEach((o, j) => { if (o.viva && o.cuerpo.some(([a, b], k) => a === x && b === y && !(k === o.cuerpo.length - 1 && !o.crecer))) choca = true; if (j !== i && cabezas[j] && cabezas[j][0] === x && cabezas[j][1] === y) choca = true; });
      if (choca) mueren.push(i);
    });
    serps.forEach((s, i) => {
      if (!s.viva) return;
      if (mueren.includes(i)) { s.viva = false; J.sonido("perder"); return; }
      s.cuerpo.unshift(cabezas[i]);
      const k = comida.findIndex(([a, b]) => a === cabezas[i][0] && b === cabezas[i][1]);
      if (k >= 0) { comida.splice(k, 1); s.crecer += 2; s.puntos++; J.sonido("punto"); nuevaComida(); }
      if (s.crecer > 0) s.crecer--; else s.cuerpo.pop();
    });
    const vivas = serps.map((s, i) => (s.viva ? i : -1)).filter((i) => i >= 0);
    if (solo && !vivas.length) {
      fin = true;
      const r = J.record(serps[0].puntos, true);
      return J.despues(900, () => J.terminar({ puntos: serps[0].puntos, bien: r.nuevo, titulo: serps[0].puntos + " manzanas", texto: r.nuevo ? "¡Nuevo récord!" : "Récord: " + r.mejor }));
    }
    if (!solo && vivas.length <= 1) {
      fin = true;
      // gana la última viva; si mueren todas a la vez, quien más haya comido
      let g = vivas.length ? vivas[0] : null;
      if (g === null) { const max = Math.max(...serps.map((s) => s.puntos)); const l = serps.map((s, i) => (s.puntos === max ? i : -1)).filter((i) => i >= 0); g = l.length === 1 ? l[0] : null; }
      J.despues(900, () => J.terminar({ ganador: g, texto: J.jugadores.map((p, i) => p.nombre + ": " + serps[i].puntos).join(" · ") }));
    }
  }

  return {
    tecla(j, a) { const d = DIRS[a]; if (d && serps[j].cola.length < 3) serps[j].cola.push(d); },
    actualizar(dt) {
      if (fin) return;
      if (cuenta > 0) { cuenta -= dt; return; }
      t += dt;
      while (t >= TICK) { t -= TICK; paso(); if (fin) break; }
    },
    dibujar(g) {
      D.fondo(g, "#13261c", "#060d09");
      D.caja(g, X0 - 10, Y0 - 10, COLS * C + 20, FILAS * C + 20, { relleno: "#0c1a12", r: 18, borde: "#2c5b3f", grosor: 4 });
      for (let y = 0; y < FILAS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2) { g.fillStyle = "rgba(255,255,255,.02)"; g.fillRect(X0 + x * C, Y0 + y * C, C, C); }
      comida.forEach(([x, y]) => {
        const cx = X0 + x * C + C / 2, cy = Y0 + y * C + C / 2, s = 1 + Math.sin(J.tiempo * 5 + x) * 0.08;
        D.ficha(g, cx, cy, 15 * s, "#ef5b5b", { anillo: false });
        g.fillStyle = "#5fd38d"; g.beginPath(); g.ellipse(cx + 5, cy - 15, 7, 4, -0.5, 0, 7); g.fill();
      });
      serps.forEach((s, i) => {
        const col = J.jugadores[i].color;
        g.globalAlpha = s.viva ? 1 : 0.3;
        s.cuerpo.forEach(([x, y], k) => {
          const cx = X0 + x * C + C / 2, cy = Y0 + y * C + C / 2;
          D.caja(g, cx - 18, cy - 18, 36, 36, { relleno: k === 0 ? col : D.mezclar(col, -0.15 - (k % 2) * 0.08), r: k === 0 ? 14 : 10 });
          if (k === 0) { g.fillStyle = "#111"; const ox = s.dir[1] * 7, oy = s.dir[0] * 7; [[1], [-1]].forEach(([q]) => { g.beginPath(); g.arc(cx + s.dir[0] * 7 + ox * q, cy + s.dir[1] * 7 + oy * q, 4, 0, 7); g.fill(); }); }
        });
        g.globalAlpha = 1;
      });
      J.jugadores.forEach((p, i) => {
        const x = 40 + i * 470;
        D.caja(g, x, 22, 450, 80, { relleno: serps[i].viva ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.02)", borde: serps[i].viva ? p.color : "rgba(255,255,255,.1)", r: 16 });
        D.ficha(g, x + 38, 62, 18, p.color, { anillo: false });
        D.texto(g, p.nombre + (serps[i].viva ? "" : " ✖"), x + 68, 62, { tam: 28, peso: 700, max: 280 });
        D.texto(g, serps[i].puntos, x + 430, 64, { tam: 40, alin: "right", titulo: true });
      });
      if (cuenta > 0) D.texto(g, Math.ceil(cuenta), 960, 560, { tam: 200, alin: "center", titulo: true, color: "rgba(255,255,255,.85)" });
    }
  };
});
