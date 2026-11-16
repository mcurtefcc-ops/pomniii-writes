Salon.juego("nim", function (J) {
  const D = Salon.dib;
  // Palillos: filas de 1, 3, 5 y 7. Se cogen los que quieras de UNA fila.
  // Quien coge el último palillo pierde.
  const filas = [1, 3, 5, 7];
  let turno = 0, fila = 3, cuantos = 1, pensando = false, fin = false, cayendo = [];

  const memo = {};
  function gana(est) { // ¿gana quien mueve? (misère)
    const k = est.slice().sort().join(",");
    if (memo[k] != null) return memo[k];
    const total = est.reduce((a, b) => a + b, 0);
    if (total === 0) return (memo[k] = true); // el anterior cogió el último: pierde él
    let r = false;
    for (let i = 0; i < est.length && !r; i++) for (let q = 1; q <= est[i]; q++) {
      const n = est.slice(); n[i] -= q;
      if (!gana(n)) { r = true; break; }
    }
    return (memo[k] = r);
  }
  function jugadaMaquina() {
    const ops = [];
    for (let i = 0; i < 4; i++) for (let q = 1; q <= filas[i]; q++) {
      const n = filas.slice(); n[i] -= q;
      ops.push({ i, q, nota: gana(n) ? 0 : 1 });
    }
    const e = Salon.ia.elegir(ops, J.dificultad);
    return [e.i, e.q];
  }
  function coger(i, q) {
    for (let k = 0; k < q; k++) cayendo.push({ fila: i, idx: filas[i] - 1 - k, t: 0, col: J.jugadores[turno].color });
    filas[i] -= q;
    J.sonido("mover");
    if (filas.every((f) => f === 0)) {
      fin = true;
      return J.despues(900, () => J.terminar({ ganador: (turno + 1) % 2, texto: J.jugadores[turno].nombre + " cogió el último palillo." }));
    }
    turno = 1 - turno;
    siguiente();
  }
  function ajustar() {
    if (filas[fila] === 0) fila = filas.findIndex((f) => f > 0);
    cuantos = Math.max(1, Math.min(cuantos, filas[fila]));
  }
  function siguiente() {
    J.turno(turno);
    ajustar();
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(700, () => { pensando = false; const [i, q] = jugadaMaquina(); coger(i, q); }); }
  }
  siguiente();

  const X = (i, k) => 960 - (filas0[i] - 1) * 55 + k * 110;
  const filas0 = [1, 3, 5, 7];
  const Y = (i) => 230 + i * 190;
  return {
    tecla(j, a) {
      if (fin || pensando) return;
      if (a === "arriba" || a === "abajo") {
        let f = fila;
        do { f = (f + (a === "abajo" ? 1 : 3)) % 4; } while (filas[f] === 0);
        fila = f; cuantos = Math.min(cuantos, filas[fila]); J.sonido("clic");
      } else if (a === "izquierda") { cuantos = Math.max(1, cuantos - 1); J.sonido("clic"); }
      else if (a === "derecha") { cuantos = Math.min(filas[fila], cuantos + 1); J.sonido("clic"); }
      else if (a === "ok") coger(fila, cuantos);
    },
    actualizar(dt) { cayendo.forEach((c) => (c.t += dt)); cayendo = cayendo.filter((c) => c.t < 1.2); },
    dibujar(g) {
      D.fondo(g, "#2d2418", "#0e0a06");
      D.titulo(g, "Palillos", 960, 90, { alin: "center" });
      const humano = !fin && !pensando && !J.jugadores[turno].cpu;
      for (let i = 0; i < 4; i++) {
        for (let k = 0; k < filas[i]; k++) {
          const marcado = humano && i === fila && k >= filas[i] - cuantos;
          palillo(g, X(i, k), Y(i), marcado ? J.jugadores[turno].color : null, 0);
        }
      }
      cayendo.forEach((c) => palillo(g, X(c.fila, c.idx), Y(c.fila) + c.t * c.t * 900, c.col, c.t * 2, 1 - c.t / 1.2));
      if (humano) D.texto(g, "▶", X(fila, 0) - 110, Y(fila), { tam: 50, color: J.jugadores[turno].color, alin: "center" });
      D.marcador(g, J.jugadores.map((p, i) => ({ nombre: p.nombre, color: p.color, activo: i === turno && !fin })), 1450, 380, 420);
      D.texto(g, pensando ? "La máquina piensa…" : humano ? "Coges " + cuantos + (cuantos === 1 ? " palillo" : " palillos") : "", 1450, 640, { tam: 34, color: "#ffd98a" });
      D.texto(g, "Quien coge el último, pierde", 120, 1000, { tam: 30, color: "#a79db3", peso: 400 });
      D.ayuda(g, "▲ ▼ elegir fila · ◀ ▶ cuántos · OK coger");
    }
  };
  function palillo(g, x, y, col, giro, alfa) {
    g.save(); g.translate(x, y); g.rotate(giro || 0); g.globalAlpha = alfa == null ? 1 : Math.max(0, alfa);
    g.shadowColor = col || "rgba(0,0,0,.5)"; g.shadowBlur = col ? 25 : 12;
    const gr = g.createLinearGradient(-9, 0, 9, 0); gr.addColorStop(0, "#c99a5c"); gr.addColorStop(0.5, "#f1d3a1"); gr.addColorStop(1, "#b07f45");
    g.fillStyle = gr; D.ruta(g, -9, -70, 18, 140, 8); g.fill();
    g.fillStyle = col || "#c0392b"; D.ruta(g, -11, -84, 22, 28, 10); g.fill();
    g.restore();
  }
});
