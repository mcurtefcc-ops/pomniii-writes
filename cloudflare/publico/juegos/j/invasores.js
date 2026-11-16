Salon.juego("invasores", function (J) {
  const D = Salon.dib;
  const W = 1920, SUELO = 1000;
  let nave = { x: W / 2 }, balas = [], disparosEnemigos = [], aliens = [], escudos = [], chispas = [];
  let dir = 1, vel = 0, oleada = 0, vidas = 3, puntos = 0, fin = false, cadencia = 0, golpeado = 0, ovni = null;
  const COLS = 11, FILAS = 5, COLORES = ["#ef5b5b", "#ff8f5a", "#f2b84b", "#5fd38d", "#4cc3f0"];
  function nuevaOleada() {
    oleada++;
    aliens = [];
    const y0 = 160 + Math.min(oleada - 1, 4) * 30;
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) aliens.push({ x: 420 + c * 100, y: y0 + f * 72, f, vivo: true });
    vel = [0, 40, 55, 70][J.dificultad] + oleada * 10;
    dir = 1;
    if (oleada === 1) { escudos = []; for (let k = 0; k < 4; k++) for (let a = 0; a < 6; a++) for (let b = 0; b < 4; b++) escudos.push({ x: 360 + k * 380 + a * 22, y: 820 + b * 22, vida: 3 }); }
  }
  function chispazo(x, y, c, n) { for (let k = 0; k < n; k++) { const a = J.azar(7), v = J.azar(80, 280); chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.5, c }); } }
  nuevaOleada();
  J.turno(0);
  function dibAlien(g, a, t) {
    const c = COLORES[a.f], abre = Math.floor(t * 3) % 2;
    g.save(); g.translate(a.x, a.y);
    g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 14;
    D.ruta(g, -26, -16, 52, 30, 12); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = "#0a0816"; g.beginPath(); g.arc(-10, -3, 6, 0, 7); g.arc(10, -3, 6, 0, 7); g.fill();
    g.strokeStyle = c; g.lineWidth = 5; g.lineCap = "round";
    g.beginPath(); g.moveTo(-18, 12); g.lineTo(-26 - abre * 6, 26); g.moveTo(18, 12); g.lineTo(26 + abre * 6, 26); g.moveTo(-12, -16); g.lineTo(-18, -28); g.moveTo(12, -16); g.lineTo(18, -28); g.stroke();
    g.restore();
  }
  return {
    tecla(j, a) {
      if (a === "ok" && !fin && cadencia <= 0 && balas.length < 2) { balas.push({ x: nave.x, y: SUELO - 50 }); cadencia = 0.3; J.sonido("tic"); }
    },
    actualizar(dt) {
      chispas.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; c.t -= dt; });
      chispas = chispas.filter((c) => c.t > 0);
      if (fin) return;
      cadencia -= dt; golpeado = Math.max(0, golpeado - dt);
      nave.x = Math.max(80, Math.min(W - 80, nave.x + ((J.pulsada(0, "derecha") ? 1 : 0) - (J.pulsada(0, "izquierda") ? 1 : 0)) * 640 * dt));
      const vivos = aliens.filter((a) => a.vivo);
      const rapidez = vel * (1 + (1 - vivos.length / (COLS * FILAS)) * 2.2);
      let bajar = false;
      vivos.forEach((a) => { a.x += dir * rapidez * dt; if ((dir > 0 && a.x > W - 90) || (dir < 0 && a.x < 90)) bajar = true; });
      if (bajar) { dir = -dir; vivos.forEach((a) => (a.y += 34)); }
      // disparos enemigos desde el alien más bajo de una columna
      if (Math.random() < dt * (0.8 + oleada * 0.25) * [0, 0.6, 1, 1.4][J.dificultad] && vivos.length) {
        const a = J.elegir(vivos), bajo = vivos.filter((b) => Math.abs(b.x - a.x) < 30).sort((p, q) => q.y - p.y)[0];
        disparosEnemigos.push({ x: bajo.x, y: bajo.y + 20 });
      }
      if (!ovni && Math.random() < dt * 0.06) ovni = { x: -60, d: 1 };
      if (ovni) { ovni.x += 260 * dt; if (ovni.x > W + 80) ovni = null; }
      balas.forEach((b) => (b.y -= 1100 * dt));
      disparosEnemigos.forEach((b) => (b.y += [0, 330, 420, 520][J.dificultad] * dt));
      for (const b of balas) {
        for (const a of vivos) if (!b.fuera && Math.abs(b.x - a.x) < 28 && Math.abs(b.y - a.y) < 22) { a.vivo = false; b.fuera = true; puntos += (FILAS - a.f) * 10; chispazo(a.x, a.y, COLORES[a.f], 14); J.sonido("explosion"); }
        if (ovni && !b.fuera && Math.abs(b.x - ovni.x) < 50 && Math.abs(b.y - 100) < 25) { b.fuera = true; puntos += 150; chispazo(ovni.x, 100, "#ef5b5b", 30); J.aviso("¡Ovni! +150"); ovni = null; J.sonido("gol"); }
        for (const e of escudos) if (!b.fuera && e.vida > 0 && Math.abs(b.x - e.x - 10) < 13 && Math.abs(b.y - e.y - 10) < 13) { e.vida--; b.fuera = true; }
      }
      for (const b of disparosEnemigos) {
        for (const e of escudos) if (!b.fuera && e.vida > 0 && Math.abs(b.x - e.x - 10) < 13 && Math.abs(b.y - e.y - 10) < 13) { e.vida--; b.fuera = true; }
        if (!b.fuera && !golpeado && Math.abs(b.x - nave.x) < 44 && Math.abs(b.y - (SUELO - 30)) < 26) { b.fuera = true; vidas--; golpeado = 1.5; chispazo(nave.x, SUELO - 30, J.jugadores[0].color, 30); J.sonido("perder"); }
      }
      // aliens que tocan los escudos los rompen
      vivos.forEach((a) => escudos.forEach((e) => { if (e.vida > 0 && Math.abs(a.x - e.x - 10) < 36 && Math.abs(a.y - e.y - 10) < 28) e.vida = 0; }));
      balas = balas.filter((b) => !b.fuera && b.y > 0);
      disparosEnemigos = disparosEnemigos.filter((b) => !b.fuera && b.y < 1080);
      const llegan = vivos.some((a) => a.y > SUELO - 70);
      if (vidas <= 0 || llegan) {
        fin = true;
        const r = J.record(puntos, true);
        return J.despues(1200, () => J.terminar({ puntos, bien: r.nuevo, titulo: puntos + " puntos", texto: (llegan ? "¡Han llegado abajo! " : "") + "Oleada " + oleada + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor) }));
      }
      if (!aliens.some((a) => a.vivo)) { J.sonido("ganar"); nuevaOleada(); }
    },
    dibujar(g) {
      g.fillStyle = "#07051a"; g.fillRect(0, 0, W, 1080);
      for (let k = 0; k < 90; k++) { g.fillStyle = "rgba(255,255,255," + (0.15 + (k % 4) * 0.1) + ")"; g.fillRect((k * 523) % W, (k * 331) % 1000, 2, 2); }
      aliens.forEach((a) => a.vivo && dibAlien(g, a, J.tiempo));
      if (ovni) { g.fillStyle = "#ef5b5b"; g.beginPath(); g.ellipse(ovni.x, 100, 50, 16, 0, 0, 7); g.fill(); g.fillStyle = "#ffd0c8"; g.beginPath(); g.ellipse(ovni.x, 88, 22, 14, 0, Math.PI, 0); g.fill(); }
      escudos.forEach((e) => { if (e.vida > 0) { g.fillStyle = ["", "#2e6b45", "#3f9a5f", "#5fd38d"][e.vida]; g.fillRect(e.x, e.y, 21, 21); } });
      balas.forEach((b) => { g.fillStyle = "#ffd98a"; g.fillRect(b.x - 3, b.y - 14, 6, 22); });
      disparosEnemigos.forEach((b) => { g.strokeStyle = "#ef8bff"; g.lineWidth = 4; g.beginPath(); g.moveTo(b.x, b.y - 10); g.lineTo(b.x + 6, b.y); g.lineTo(b.x - 6, b.y + 8); g.lineTo(b.x, b.y + 16); g.stroke(); });
      chispas.forEach((c) => { g.globalAlpha = c.t * 2; g.fillStyle = c.c; g.fillRect(c.x - 3, c.y - 3, 6, 6); g.globalAlpha = 1; });
      if (!fin && (!golpeado || Math.floor(J.tiempo * 10) % 2)) {
        const c = J.jugadores[0].color;
        g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 16;
        g.beginPath(); g.moveTo(nave.x - 44, SUELO - 12); g.lineTo(nave.x + 44, SUELO - 12); g.lineTo(nave.x + 30, SUELO - 32); g.lineTo(nave.x + 8, SUELO - 36); g.lineTo(nave.x, SUELO - 56); g.lineTo(nave.x - 8, SUELO - 36); g.lineTo(nave.x - 30, SUELO - 32); g.closePath(); g.fill();
        g.shadowBlur = 0;
      }
      g.fillStyle = "#3a3266"; g.fillRect(0, SUELO, W, 4);
      D.texto(g, puntos, 40, 50, { tam: 48, titulo: true });
      D.texto(g, "Oleada " + oleada, 960, 50, { tam: 32, alin: "center", color: "#a79db3" });
      for (let k = 0; k < vidas; k++) D.ficha(g, 1860 - k * 46, 50, 16, J.jugadores[0].color, { anillo: false });
      D.ayuda(g, "Mantén ◀ ▶ para moverte · OK disparar");
    }
  };
});
