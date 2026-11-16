Salon.juego("ladrillos", function (J) {
  const D = Salon.dib;
  const X1 = 360, X2 = 1560, Y1 = 80, Y2 = 1060, BR = 13;
  const anchoPala = [0, 230, 190, 150][J.dificultad];
  const velBase = [0, 560, 700, 840][J.dificultad];
  const COLORES = ["#ef5b5b", "#ff8f5a", "#f2b84b", "#5fd38d", "#4cc3f0", "#b38cff"];
  let pala = (X1 + X2) / 2, bolas = [], ladrillos = [], vidas = 3, puntos = 0, nivel = 1, pegada = true, fin = false, chispas = [];
  function montarNivel() {
    ladrillos = [];
    const filas = Math.min(9, 4 + nivel), cols = 12, w = (X2 - X1 - 40) / cols, h = 40;
    for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) {
      // patrones distintos por nivel
      if (nivel % 3 === 2 && (f + c) % 2) continue;
      if (nivel % 3 === 0 && Math.abs(c - 5.5) < f * 0.6 - 1) continue;
      const duro = nivel > 1 && f === 0 ? 2 : 1;
      ladrillos.push({ x: X1 + 20 + c * w, y: Y1 + 70 + f * (h + 8), w: w - 6, h, vida: duro, col: COLORES[f % COLORES.length] });
    }
    nuevaBola();
  }
  function nuevaBola() { bolas = [{ x: pala, y: Y2 - 70, vx: 0, vy: 0 }]; pegada = true; }
  function lanzar() {
    if (!pegada) return;
    pegada = false;
    const v = velBase * (1 + (nivel - 1) * 0.08);
    const a = -Math.PI / 2 + J.azar(-0.4, 0.4);
    bolas[0].vx = Math.cos(a) * v; bolas[0].vy = Math.sin(a) * v;
    J.sonido("golpe");
  }
  montarNivel();
  J.turno(0);
  return {
    tecla(j, a) { if (a === "ok" || a === "arriba") lanzar(); },
    actualizar(dt) {
      if (fin) return;
      const mover = (J.pulsada(0, "derecha") ? 1 : 0) - (J.pulsada(0, "izquierda") ? 1 : 0);
      pala = Math.max(X1 + anchoPala / 2, Math.min(X2 - anchoPala / 2, pala + mover * 1000 * dt));
      if (pegada) { bolas[0].x = pala; bolas[0].y = Y2 - 70; return; }
      const pasos = 5;
      for (let k = 0; k < pasos; k++) {
        const h = dt / pasos;
        bolas.forEach((b) => {
          b.x += b.vx * h; b.y += b.vy * h;
          if (b.x < X1 + BR) { b.x = X1 + BR; b.vx = Math.abs(b.vx); }
          if (b.x > X2 - BR) { b.x = X2 - BR; b.vx = -Math.abs(b.vx); }
          if (b.y < Y1 + BR) { b.y = Y1 + BR; b.vy = Math.abs(b.vy); }
          // pala
          const py = Y2 - 50;
          if (b.vy > 0 && b.y + BR > py && b.y < py + 20 && Math.abs(b.x - pala) < anchoPala / 2 + BR) {
            const rel = (b.x - pala) / (anchoPala / 2), v = Math.hypot(b.vx, b.vy);
            const a = -Math.PI / 2 + rel * 1.05;
            b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.y = py - BR;
            J.sonido("golpe");
          }
          // ladrillos
          for (const l of ladrillos) {
            if (l.vida <= 0) continue;
            const cx = Math.max(l.x, Math.min(b.x, l.x + l.w)), cy = Math.max(l.y, Math.min(b.y, l.y + l.h));
            if (Math.hypot(b.x - cx, b.y - cy) < BR) {
              const dx = Math.min(Math.abs(b.x - l.x), Math.abs(b.x - l.x - l.w)), dy = Math.min(Math.abs(b.y - l.y), Math.abs(b.y - l.y - l.h));
              if (dx < dy && (b.x < l.x || b.x > l.x + l.w)) b.vx = -b.vx; else b.vy = -b.vy;
              l.vida--;
              if (l.vida <= 0) {
                puntos += 10 * nivel; J.sonido("tic");
                for (let q = 0; q < 8; q++) chispas.push({ x: b.x, y: b.y, vx: J.azar(-200, 200), vy: J.azar(-200, 200), t: 0.6, c: l.col });
              } else J.sonido("golpe");
              const v = Math.hypot(b.vx, b.vy) * 1.004; const a = Math.atan2(b.vy, b.vx); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v;
              break;
            }
          }
        });
      }
      bolas = bolas.filter((b) => b.y < Y2 + 30);
      if (!bolas.length) {
        vidas--; J.sonido("perder");
        if (vidas <= 0) {
          fin = true;
          const r = J.record(puntos, true);
          return J.despues(800, () => J.terminar({ puntos, bien: r.nuevo, titulo: puntos + " puntos", texto: "Llegaste al nivel " + nivel + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor) }));
        }
        nuevaBola();
      }
      if (ladrillos.every((l) => l.vida <= 0)) { nivel++; J.sonido("ganar"); J.aviso("¡Nivel " + nivel + "!"); montarNivel(); }
      chispas.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 600 * dt; c.t -= dt; });
      chispas = chispas.filter((c) => c.t > 0);
    },
    dibujar(g) {
      D.fondo(g, "#1a1630", "#07060f");
      D.caja(g, X1, Y1, X2 - X1, Y2 - Y1, { relleno: "#110e22", r: 10, borde: "#3a3266", grosor: 4 });
      ladrillos.forEach((l) => { if (l.vida > 0) D.caja(g, l.x, l.y, l.w, l.h, { relleno: l.vida > 1 ? "#d9d4e8" : l.col, r: 8 }); });
      chispas.forEach((c) => { g.fillStyle = c.c; g.globalAlpha = c.t / 0.6; g.fillRect(c.x - 3, c.y - 3, 6, 6); g.globalAlpha = 1; });
      D.caja(g, pala - anchoPala / 2, Y2 - 50, anchoPala, 20, { relleno: J.jugadores[0].color, r: 10, sombra: 16 });
      bolas.forEach((b) => D.ficha(g, b.x, b.y, BR, "#fff6e0", { anillo: false }));
      D.titulo(g, "Rompeladrillos", 40, 120, { tam: 44 });
      D.texto(g, "Puntos", 40, 220, { tam: 26, color: "#a79db3" }); D.texto(g, puntos, 40, 270, { tam: 60, titulo: true });
      D.texto(g, "Nivel", 40, 360, { tam: 26, color: "#a79db3" }); D.texto(g, nivel, 40, 410, { tam: 60, titulo: true });
      D.texto(g, "Vidas", 40, 500, { tam: 26, color: "#a79db3" });
      for (let k = 0; k < vidas; k++) D.ficha(g, 60 + k * 50, 550, 17, "#ef5b5b", { anillo: false });
      if (pegada) D.texto(g, "OK para lanzar", 960, Y2 - 130, { tam: 34, alin: "center", color: "#ffd98a" });
      D.texto(g, "Mantén ◀ ▶ para mover", 1590, 1000, { tam: 24, color: "#a79db3", peso: 400 });
    }
  };
});
