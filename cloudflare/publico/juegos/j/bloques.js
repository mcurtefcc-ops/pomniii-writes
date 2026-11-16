Salon.juego("bloques", function (J) {
  const D = Salon.dib;
  const COLS = 10, FILAS = 20, C = 48, X0 = 960 - (COLS * C) / 2, Y0 = 60;
  const PIEZAS = {
    I: { c: "#4cc3f0", f: [[0, 1], [1, 1], [2, 1], [3, 1]] }, O: { c: "#f2c230", f: [[1, 0], [2, 0], [1, 1], [2, 1]] },
    T: { c: "#b38cff", f: [[1, 0], [0, 1], [1, 1], [2, 1]] }, S: { c: "#5fd38d", f: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    Z: { c: "#ef5b5b", f: [[0, 0], [1, 0], [1, 1], [2, 1]] }, J: { c: "#4c7bf0", f: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    L: { c: "#ff8f5a", f: [[2, 0], [0, 1], [1, 1], [2, 1]] }
  };
  const tab = Array.from({ length: FILAS }, () => Array(COLS).fill(null));
  let bolsa = [], actual, siguiente, x, y, caida = 0, lineas = 0, puntos = 0, fin = false, limpiando = null, bajaRapido = false;
  const nivelInicial = [0, 1, 4, 8][J.dificultad];
  const nivel = () => nivelInicial + Math.floor(lineas / 10);
  const intervalo = () => Math.max(0.06, 0.85 * Math.pow(0.82, nivel() - 1));
  function nueva(t) { return { t, celdas: PIEZAS[t].f.map((p) => p.slice()) }; }
  function tomar() { if (!bolsa.length) bolsa = Salon.cartas.barajar(Object.keys(PIEZAS).slice()); return nueva(bolsa.pop()); }
  function cabe(celdas, px, py) { return celdas.every(([a, b]) => { const cx = px + a, cy = py + b; return cx >= 0 && cx < COLS && cy < FILAS && (cy < 0 || !tab[cy][cx]); }); }
  function girar(celdas, t) {
    if (t === "O") return celdas;
    const n = t === "I" ? 4 : 3;
    return celdas.map(([a, b]) => [n - 1 - b, a]);
  }
  function entrar() {
    actual = siguiente || tomar(); siguiente = tomar();
    x = 3; y = -1;
    if (!cabe(actual.celdas, x, y + 1)) { fin = true; terminar(); }
  }
  function fijar() {
    actual.celdas.forEach(([a, b]) => { if (y + b >= 0) tab[y + b][x + a] = PIEZAS[actual.t].c; });
    J.sonido("golpe");
    const llenas = [];
    for (let f = 0; f < FILAS; f++) if (tab[f].every((v) => v)) llenas.push(f);
    if (llenas.length) {
      limpiando = { filas: llenas, t: 0 };
      puntos += [0, 100, 300, 500, 800][llenas.length] * (nivel() || 1);
      J.sonido(llenas.length >= 4 ? "ganar" : "punto");
    } else entrar();
  }
  function terminar() {
    const r = J.record(puntos, true);
    J.despues(900, () => J.terminar({ puntos, bien: r.nuevo, titulo: puntos + " puntos", texto: lineas + " líneas · nivel " + nivel() + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor) }));
  }
  entrar();
  J.turno(0);
  return {
    tecla(j, a) {
      if (fin || limpiando) return;
      if (a === "izquierda" && cabe(actual.celdas, x - 1, y)) { x--; J.sonido("clic"); }
      else if (a === "derecha" && cabe(actual.celdas, x + 1, y)) { x++; J.sonido("clic"); }
      else if (a === "arriba") {
        const g2 = girar(actual.celdas, actual.t);
        for (const k of [0, -1, 1, -2, 2]) if (cabe(g2, x + k, y)) { actual.celdas = g2; x += k; J.sonido("mover"); break; }
      } else if (a === "abajo") { if (cabe(actual.celdas, x, y + 1)) { y++; puntos += 1; } }
      else if (a === "ok") { let n = 0; while (cabe(actual.celdas, x, y + 1)) { y++; n++; } puntos += 2 * n; fijar(); }
    },
    actualizar(dt) {
      if (fin) return;
      if (limpiando) {
        limpiando.t += dt;
        if (limpiando.t > 0.3) {
          limpiando.filas.forEach((f) => { tab.splice(f, 1); tab.unshift(Array(COLS).fill(null)); });
          lineas += limpiando.filas.length; limpiando = null; entrar();
        }
        return;
      }
      bajaRapido = J.pulsada(0, "abajo");
      caida += dt;
      const iv = bajaRapido ? Math.min(0.05, intervalo()) : intervalo();
      if (caida >= iv) {
        caida = 0;
        if (cabe(actual.celdas, x, y + 1)) y++;
        else fijar();
      }
    },
    dibujar(g) {
      D.fondo(g, "#191530", "#07060f");
      D.caja(g, X0 - 14, Y0 - 14, COLS * C + 28, FILAS * C + 28, { relleno: "#0e0b1c", r: 14, borde: "#3a3266", grosor: 4 });
      const celda = (cx, cy, col, alfa) => { g.globalAlpha = alfa == null ? 1 : alfa; D.caja(g, X0 + cx * C + 2, Y0 + cy * C + 2, C - 4, C - 4, { relleno: col, r: 8 }); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(X0 + cx * C + 6, Y0 + cy * C + 6, C - 12, 6); g.globalAlpha = 1; };
      for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
        if (tab[f][c]) celda(c, f, tab[f][c], limpiando && limpiando.filas.includes(f) ? 1 - limpiando.t / 0.3 : 1);
        else { g.fillStyle = "rgba(255,255,255,.025)"; g.fillRect(X0 + c * C + 1, Y0 + f * C + 1, C - 2, C - 2); }
      }
      if (actual && !limpiando && !fin) {
        let gy = y; while (cabe(actual.celdas, x, gy + 1)) gy++;
        actual.celdas.forEach(([a, b]) => { if (gy + b >= 0) { g.strokeStyle = PIEZAS[actual.t].c; g.lineWidth = 3; g.globalAlpha = 0.4; D.ruta(g, X0 + (x + a) * C + 4, Y0 + (gy + b) * C + 4, C - 8, C - 8, 8); g.stroke(); g.globalAlpha = 1; } });
        actual.celdas.forEach(([a, b]) => { if (y + b >= 0) celda(x + a, y + b, PIEZAS[actual.t].c); });
      }
      // panel
      const px = X0 + COLS * C + 70;
      D.texto(g, "Siguiente", px, 100, { tam: 28, color: "#a79db3" });
      D.caja(g, px, 130, 240, 170, { relleno: "rgba(255,255,255,.05)", r: 16 });
      if (siguiente) siguiente.celdas.forEach(([a, b]) => D.caja(g, px + 40 + a * 40, 175 + b * 40, 36, 36, { relleno: PIEZAS[siguiente.t].c, r: 6 }));
      [["Puntos", puntos, 380], ["Líneas", lineas, 520], ["Nivel", nivel(), 660]].forEach(([t, v, yy]) => { D.texto(g, t, px, yy, { tam: 28, color: "#a79db3" }); D.texto(g, v, px, yy + 55, { tam: 60, titulo: true }); });
      const ax = 140;
      D.titulo(g, "Bloques", ax, 120, { tam: 56 });
      ["◀ ▶  mover", "▲  girar", "▼  bajar (mantén)", "OK  dejar caer"].forEach((t, k) => D.texto(g, t, ax, 230 + k * 50, { tam: 28, color: "#cfc6dd", peso: 400 }));
    }
  };
});
