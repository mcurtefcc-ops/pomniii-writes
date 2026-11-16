Salon.juego("tenis", function (J) {
  const D = Salon.dib;
  const X1 = 120, X2 = 1800, Y1 = 150, Y2 = 1000, PALA = 170, ANCHO_P = 26, A_GANAR = 11;
  const palas = [{ x: X1 + 30, y: (Y1 + Y2) / 2 }, { x: X2 - 30, y: (Y1 + Y2) / 2 }];
  const puntos = [0, 0];
  let bola, saca = J.entero(0, 1), espera = 1.5, fin = false, golpes = 0, rastro = [];
  function sacar() {
    const dir = saca === 0 ? 1 : -1;
    bola = { x: (X1 + X2) / 2, y: J.azar(Y1 + 150, Y2 - 150), vx: dir * 620, vy: J.azar(-260, 260) };
    golpes = 0; espera = 1.1; rastro = [];
  }
  sacar();
  J.turno(0);
  function ia(i, dt) {
    const p = palas[i], viene = i === 0 ? bola.vx < 0 : bola.vx > 0;
    let objetivo = (Y1 + Y2) / 2;
    if (viene) {
      // predice dónde llegará la bola (con rebotes)
      let y = bola.y, vy = bola.vy, t = Math.abs((p.x - bola.x) / bola.vx);
      y += vy * t;
      const h = Y2 - Y1;
      let r = (y - Y1) % (2 * h); if (r < 0) r += 2 * h;
      y = r > h ? Y2 - (r - h) : Y1 + r;
      // cada vez que la bola viene, la máquina calcula con un error que crece con la velocidad
      if (!p.viene) { p.viene = true; const v = Math.hypot(bola.vx, bola.vy); p.error = J.azar(-1, 1) * ([0, 95, 60, 38][J.dificultad] + v * 0.05); }
      objetivo = y + p.error;
    }
    if (!viene) p.viene = false;
    const vmax = [0, 420, 640, 900][J.dificultad];
    const d = objetivo - p.y;
    p.y += Math.max(-vmax * dt, Math.min(vmax * dt, d));
  }
  return {
    actualizar(dt) {
      if (fin) return;
      palas.forEach((p, i) => {
        if (J.jugadores[i].cpu) ia(i, dt);
        else p.y += ((J.pulsada(i, "abajo") ? 1 : 0) - (J.pulsada(i, "arriba") ? 1 : 0)) * 820 * dt;
        p.y = Math.max(Y1 + PALA / 2, Math.min(Y2 - PALA / 2, p.y));
      });
      if (espera > 0) { espera -= dt; return; }
      const pasos = 4;
      for (let k = 0; k < pasos; k++) {
        const h = dt / pasos;
        bola.x += bola.vx * h; bola.y += bola.vy * h;
        if (bola.y < Y1 + 14) { bola.y = Y1 + 14; bola.vy = Math.abs(bola.vy); J.sonido("tic"); }
        if (bola.y > Y2 - 14) { bola.y = Y2 - 14; bola.vy = -Math.abs(bola.vy); J.sonido("tic"); }
        palas.forEach((p, i) => {
          const lado = i === 0 ? 1 : -1;
          if (Math.abs(bola.x - p.x) < ANCHO_P / 2 + 14 && Math.abs(bola.y - p.y) < PALA / 2 + 14 && Math.sign(bola.vx) === -lado) {
            const rel = (bola.y - p.y) / (PALA / 2);
            const v = Math.min(1700, Math.hypot(bola.vx, bola.vy) * 1.05 + 20);
            const ang = rel * 1.0;
            bola.vx = Math.cos(ang) * v * lado; bola.vy = Math.sin(ang) * v;
            bola.x = p.x + lado * (ANCHO_P / 2 + 15);
            golpes++; J.sonido("golpe");
          }
        });
      }
      rastro.push([bola.x, bola.y]); if (rastro.length > 12) rastro.shift();
      if (bola.x < X1 - 40 || bola.x > X2 + 40) {
        const gana = bola.x < X1 ? 1 : 0;
        puntos[gana]++; J.sonido("punto"); saca = 1 - gana;
        if (puntos[gana] >= A_GANAR && puntos[gana] - puntos[1 - gana] >= 2) { fin = true; return J.despues(900, () => J.terminar({ ganador: gana, texto: puntos[0] + " a " + puntos[1] })); }
        sacar();
      }
    },
    dibujar(g) {
      D.fondo(g, "#0f2236", "#050b12");
      D.caja(g, X1, Y1, X2 - X1, Y2 - Y1, { relleno: "#1f5f8c", r: 20, borde: "#e9f2fa", grosor: 6, sombra: 40 });
      g.strokeStyle = "rgba(233,242,250,.7)"; g.lineWidth = 4; g.setLineDash([18, 14]);
      g.beginPath(); g.moveTo((X1 + X2) / 2, Y1); g.lineTo((X1 + X2) / 2, Y2); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.moveTo(X1, (Y1 + Y2) / 2); g.lineTo(X2, (Y1 + Y2) / 2); g.strokeStyle = "rgba(233,242,250,.3)"; g.stroke();
      rastro.forEach(([x, y], k) => { g.fillStyle = "rgba(255,240,200," + (k / rastro.length) * 0.35 + ")"; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); });
      D.ficha(g, bola.x, bola.y, 14, "#fff6e0", { anillo: false });
      palas.forEach((p, i) => D.caja(g, p.x - ANCHO_P / 2, p.y - PALA / 2, ANCHO_P, PALA, { relleno: J.jugadores[i].color, r: 12, sombra: 20 }));
      D.texto(g, puntos[0], 860, 85, { tam: 90, alin: "center", titulo: true, color: J.jugadores[0].color });
      D.texto(g, puntos[1], 1060, 85, { tam: 90, alin: "center", titulo: true, color: J.jugadores[1].color });
      D.texto(g, J.jugadores[0].nombre, X1, 85, { tam: 36, peso: 700, color: J.jugadores[0].color });
      D.texto(g, J.jugadores[1].nombre, X2, 85, { tam: 36, peso: 700, alin: "right", color: J.jugadores[1].color });
      D.ayuda(g, "Mantén ▲ ▼ para mover la pala · a " + A_GANAR + " puntos, con 2 de diferencia");
    }
  };
});
