Salon.juego("cajas", function (J) {
  const D = Salon.dib;
  const n = J.opcion("tam") || 5;
  const M = 2 * n + 1; // rejilla: (par,par)=punto, (impar,impar)=caja, resto=línea
  const P = Math.min(150, Math.floor(880 / n)), X0 = 140 + (900 - P * n) / 2, Y0 = 100 + (880 - P * n) / 2;
  const lineas = {}; // "r,c" -> jugador
  const cajas = {}; // "r,c" -> jugador
  let turno = 0, cursor = [0, 1], pensando = false, fin = false, ultima = null;
  const puntos = Array(J.n).fill(0);
  const esLinea = (r, c) => (r + c) % 2 === 1;
  const todas = [];
  for (let r = 0; r < M; r++) for (let c = 0; c < M; c++) if (esLinea(r, c)) todas.push([r, c]);

  function lados(r, c, L) { return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => L[a + "," + b] != null).length; }
  function cajasDe(r, c) {
    // cajas adyacentes a una línea
    return r % 2 === 0 ? [[r - 1, c], [r + 1, c]].filter(([a]) => a > 0 && a < M) : [[r, c - 1], [r, c + 1]].filter(([, b]) => b > 0 && b < M);
  }
  function poner(r, c) {
    const k = r + "," + c;
    if (lineas[k] != null) { J.sonido("error"); return false; }
    lineas[k] = turno; ultima = [r, c];
    let cerro = 0;
    for (const [a, b] of cajasDe(r, c)) if (lados(a, b, lineas) === 4) { cajas[a + "," + b] = turno; puntos[turno]++; cerro++; }
    J.sonido(cerro ? "punto" : "mover");
    if (Object.keys(lineas).length === todas.length) {
      fin = true;
      const max = Math.max(...puntos), gan = puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
      J.despues(900, () => J.terminar({ ganador: gan.length === 1 ? gan[0] : null, texto: J.jugadores.map((j, i) => j.nombre + ": " + puntos[i]).join(" · ") }));
      return true;
    }
    if (!cerro) turno = (turno + 1) % J.n;
    siguiente();
    return true;
  }
  // Cuántas cajas regala una línea (simulando que el rival come en cadena)
  function regala(r, c) {
    const L = Object.assign({}, lineas);
    L[r + "," + c] = 1;
    let total = 0, algo = true;
    while (algo) {
      algo = false;
      for (let a = 1; a < M; a += 2) for (let b = 1; b < M; b += 2) {
        if (lados(a, b, L) === 3) {
          for (const [x, y] of [[a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]]) if (L[x + "," + y] == null) L[x + "," + y] = 1;
          total++; algo = true;
        }
      }
    }
    return total;
  }
  function jugadaMaquina() {
    const libres = todas.filter(([r, c]) => lineas[r + "," + c] == null);
    const cierra = libres.filter(([r, c]) => cajasDe(r, c).some(([a, b]) => lados(a, b, lineas) === 3));
    if (cierra.length && (J.dificultad > 1 || Math.random() < 0.7)) return J.elegir(cierra);
    const seguras = libres.filter(([r, c]) => cajasDe(r, c).every(([a, b]) => lados(a, b, lineas) < 2));
    if (J.dificultad === 1) return J.elegir(Math.random() < 0.6 && seguras.length ? seguras : libres);
    if (seguras.length) return J.elegir(seguras);
    if (J.dificultad === 2) return J.elegir(libres);
    let mejor = null, min = Infinity;
    for (const l of libres) { const v = regala(l[0], l[1]); if (v < min) { min = v; mejor = l; } }
    return mejor;
  }
  function siguiente() {
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(380, () => { pensando = false; const [r, c] = jugadaMaquina(); poner(r, c); }); }
  }
  siguiente();

  const xy = (r, c) => [X0 + (c / 2) * P, Y0 + (r / 2) * P];
  return {
    tecla(j, a) {
      if (fin || pensando) return;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) {
        let [r, c] = cursor;
        r = Math.max(0, Math.min(M - 1, r + d[0])); c = Math.max(0, Math.min(M - 1, c + d[1]));
        if (r % 2 === 0 && c % 2 === 0) { // punto: salta uno más
          const r2 = r + d[0], c2 = c + d[1];
          if (r2 >= 0 && r2 < M && c2 >= 0 && c2 < M) { r = r2; c = c2; } else return;
        }
        cursor = [r, c];
        return;
      }
      if (a === "ok") {
        if (!esLinea(cursor[0], cursor[1])) { J.aviso("Ponte encima de una línea (entre dos puntos)"); return; }
        poner(cursor[0], cursor[1]);
      }
    },
    dibujar(g) {
      D.fondo(g, "#1d2433", "#0b0d14");
      D.caja(g, X0 - 50, Y0 - 50, P * n + 100, P * n + 100, { relleno: "#f3ecdc", r: 18, sombra: 40 });
      // cajas
      for (const k in cajas) {
        const [r, c] = k.split(",").map(Number), [x, y] = xy(r - 1, c - 1);
        g.fillStyle = D.alfa(J.jugadores[cajas[k]].color, 0.55); g.fillRect(x + 4, y + 4, P - 8, P - 8);
        D.texto(g, J.jugadores[cajas[k]].nombre[0], x + P / 2, y + P / 2, { tam: P * 0.4, alin: "center", color: "#3a2a12", sombra: false, peso: 700 });
      }
      // líneas
      for (const [r, c] of todas) {
        const k = r + "," + c, [x1, y1] = xy(r - (r % 2), c - (c % 2)), [x2, y2] = xy(r + (r % 2), c + (c % 2));
        g.lineCap = "round";
        if (lineas[k] != null) {
          g.strokeStyle = J.jugadores[lineas[k]].color; g.lineWidth = 12;
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
          if (ultima && ultima[0] === r && ultima[1] === c) { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 4; g.stroke(); }
        } else { g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 6; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      }
      for (let r = 0; r < M; r += 2) for (let c = 0; c < M; c += 2) { const [x, y] = xy(r, c); g.fillStyle = "#2b2333"; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); }
      if (!fin && !J.jugadores[turno].cpu) {
        const [r, c] = cursor;
        const col = J.jugadores[turno].color;
        g.save(); g.shadowColor = col; g.shadowBlur = 25; g.strokeStyle = col; g.lineCap = "round";
        if (esLinea(r, c)) {
          const [x1, y1] = xy(r - (r % 2), c - (c % 2)), [x2, y2] = xy(r + (r % 2), c + (c % 2));
          g.globalAlpha = 0.5 + 0.4 * Math.sin(J.tiempo * 6); g.lineWidth = 14;
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        } else { const [x, y] = xy(r, c); g.lineWidth = 4; g.beginPath(); g.arc(x, y, 18, 0, 7); g.stroke(); }
        g.restore();
      }
      D.titulo(g, "Puntos y cajas", 1250, 120);
      D.marcador(g, J.jugadores.map((p, i) => ({ nombre: p.nombre, color: p.color, valor: puntos[i], activo: i === turno && !fin })), 1250, 200, 560);
      D.texto(g, pensando ? "La máquina piensa…" : "Quien cierra una caja, repite.", 1250, 200 + J.n * 104 + 40, { tam: 30, color: pensando ? "#ffd98a" : "#a79db3" });
      D.ayuda(g, "Flechas: moverte por las líneas · OK: trazar línea");
    }
  };
});
