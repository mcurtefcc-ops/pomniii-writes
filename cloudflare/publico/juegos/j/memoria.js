Salon.juego("memoria", function (J) {
  const D = Salon.dib;
  const [COLS, FILAS] = [null, [4, 3], [6, 4], [6, 6]][J.dificultad];
  const PARES = (COLS * FILAS) / 2;
  const FORMAS = ["circulo", "cuadrado", "triangulo", "estrella", "rombo", "corazon"], COLORES = ["#ef5b5b", "#4cc3f0", "#f2b84b"];
  const cartas = [];
  for (let k = 0; k < PARES; k++) cartas.push(k, k);
  Salon.cartas.barajar(cartas);
  const estado = cartas.map(() => ({ abierta: false, de: -1, giro: 0 }));
  const C = Math.min(200, Math.floor(Math.min(1150 / COLS, 960 / FILAS))), X0 = 80 + (1150 - C * COLS) / 2, Y0 = 60 + (960 - C * FILAS) / 2;
  const puntos = J.jugadores.map(() => 0), recuerdo = new Map(); // índice -> símbolo visto (para la máquina)
  let turno = 0, cursor = 0, elegidas = [], bloqueo = false, intentos = 0, fin = false;
  function voltear(i) {
    if (bloqueo || estado[i].abierta || elegidas.includes(i)) { J.sonido("error"); return; }
    elegidas.push(i); J.sonido("clic");
    if (Math.random() < [0, 0.35, 0.7, 0.97][J.dificultad]) recuerdo.set(i, cartas[i]);
    if (elegidas.length === 2) {
      intentos++; bloqueo = true;
      const [a, b] = elegidas;
      if (cartas[a] === cartas[b]) {
        J.despues(500, () => {
          estado[a].abierta = estado[b].abierta = true; estado[a].de = estado[b].de = turno;
          recuerdo.delete(a); recuerdo.delete(b);
          puntos[turno]++; elegidas = []; bloqueo = false; J.sonido("punto");
          if (estado.every((e) => e.abierta)) return acabar();
          siguiente();
        });
      } else {
        J.despues(1100, () => { elegidas = []; bloqueo = false; turno = (turno + 1) % J.n; siguiente(); });
      }
    }
  }
  function acabar() {
    fin = true;
    if (J.n === 1) { const r = J.record(intentos, false, "i" + J.dificultad); return J.despues(600, () => J.terminar({ puntos: intentos, bien: true, icono: "🃏", titulo: "¡Todas las parejas!", texto: intentos + " intentos" + (r.nuevo ? " · ¡Nuevo récord en este nivel!" : " · Récord: " + r.mejor) })); }
    const max = Math.max(...puntos), g = puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
    J.despues(600, () => J.terminar({ ganador: g.length === 1 ? g[0] : null, texto: J.jugadores.map((p, i) => p.nombre + ": " + puntos[i]).join(" · ") }));
  }
  function siguiente() {
    J.turno(turno);
    if (J.jugadores[turno].cpu) J.despues(700, jugarMaquina);
  }
  function jugarMaquina() {
    const cerradas = estado.map((e, i) => (!e.abierta && !elegidas.includes(i) ? i : -1)).filter((i) => i >= 0);
    let elige;
    if (!elegidas.length) {
      // ¿conoce una pareja completa?
      const vistos = {};
      for (const [i, s] of recuerdo) { if (!cerradas.includes(i)) continue; if (vistos[s] != null) { elige = vistos[s]; break; } vistos[s] = i; }
      if (elige == null) elige = J.elegir(cerradas.filter((i) => !recuerdo.has(i)).length ? cerradas.filter((i) => !recuerdo.has(i)) : cerradas);
    } else {
      const s = cartas[elegidas[0]];
      const conocida = [...recuerdo].find(([i, v]) => v === s && i !== elegidas[0] && cerradas.includes(i));
      elige = conocida ? conocida[0] : J.elegir(cerradas.filter((i) => !recuerdo.has(i)).length ? cerradas.filter((i) => !recuerdo.has(i)) : cerradas);
    }
    cursor = elige;
    voltear(elige);
    if (elegidas.length === 1) J.despues(800, jugarMaquina);
  }
  function simbolo(g, s, x, y, r) {
    const forma = FORMAS[s % FORMAS.length], col = COLORES[Math.floor(s / FORMAS.length) % COLORES.length];
    g.save(); g.fillStyle = col; g.translate(x, y); g.beginPath();
    if (forma === "circulo") g.arc(0, 0, r, 0, 7);
    else if (forma === "cuadrado") D.ruta(g, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.25);
    else if (forma === "triangulo") { g.moveTo(0, -r); g.lineTo(r, r * 0.8); g.lineTo(-r, r * 0.8); g.closePath(); }
    else if (forma === "rombo") { g.moveTo(0, -r); g.lineTo(r * 0.8, 0); g.lineTo(0, r); g.lineTo(-r * 0.8, 0); g.closePath(); }
    else if (forma === "corazon") { g.moveTo(0, r * 0.9); g.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.6, -r * 1.2, 0, -r * 0.4); g.bezierCurveTo(r * 0.6, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9); }
    if (forma === "estrella") { g.restore(); D.estrella(g, x, y, r * 1.1, col); return; }
    g.fill(); g.restore();
  }
  siguiente();
  return {
    tecla(j, a) {
      if (fin || bloqueo) return;
      const f = Math.floor(cursor / COLS), c = cursor % COLS;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = ((f + d[0] + FILAS) % FILAS) * COLS + ((c + d[1] + COLS) % COLS); return; }
      if (a === "ok") voltear(cursor);
    },
    actualizar(dt) { estado.forEach((e, i) => { const objetivo = e.abierta || elegidas.includes(i) ? 1 : 0; e.giro += Math.sign(objetivo - e.giro) * Math.min(Math.abs(objetivo - e.giro), dt * 6); }); },
    dibujar(g) {
      D.fondo(g, "#1e2a2a", "#081010");
      cartas.forEach((s, i) => {
        const x = X0 + (i % COLS) * C + C / 2, y = Y0 + Math.floor(i / COLS) * C + C / 2, e = estado[i];
        const esc = Math.abs(Math.cos(e.giro * Math.PI));
        const cara = e.giro > 0.5;
        g.save(); g.translate(x, y); g.scale(Math.max(0.04, esc), 1);
        D.caja(g, -C / 2 + 8, -C / 2 + 8, C - 16, C - 16, { relleno: cara ? "#fbf7ee" : "#2f6b6b", r: 16, sombra: 10, borde: e.abierta ? J.jugadores[e.de].color : cara ? "#ffd98a" : "rgba(255,255,255,.15)", grosor: e.abierta ? 6 : 3 });
        if (!cara) { g.fillStyle = "rgba(255,255,255,.12)"; D.estrella(g, 0, 0, C * 0.18, "rgba(255,255,255,.18)"); }
        g.restore();
        if (cara && esc > 0.2) simbolo(g, s, x, y, C * 0.26 * esc);
      });
      if (!fin && !J.jugadores[turno].cpu && !bloqueo) D.cursor(g, X0 + (cursor % COLS) * C + 4, Y0 + Math.floor(cursor / COLS) * C + 4, C - 8, C - 8, J.jugadores[turno].color);
      const px = 1300;
      D.titulo(g, "Parejas", px, 110);
      D.marcador(g, J.jugadores.map((p, i) => ({ nombre: p.nombre, color: p.color, valor: puntos[i], activo: i === turno && !fin })), px, 190, 560);
      D.texto(g, "Intentos: " + intentos, px, 210 + J.n * 104, { tam: 30, color: "#a79db3" });
      D.texto(g, "Si aciertas una pareja, repites.", px, 260 + J.n * 104, { tam: 26, color: "#cfc6dd", peso: 400 });
    }
  };
});
