Salon.juego("rocas", function (J) {
  const D = Salon.dib;
  const W = 1920, H = 1080;
  const nave = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, inmune: 2 };
  let rocas = [], balas = [], chispas = [], vidas = 3, puntos = 0, oleada = 0, fin = false, cadencia = 0;
  const velRoca = [0, 70, 100, 130][J.dificultad];
  const envolver = (o) => { if (o.x < -60) o.x += W + 120; if (o.x > W + 60) o.x -= W + 120; if (o.y < -60) o.y += H + 120; if (o.y > H + 60) o.y -= H + 120; };
  function roca(x, y, t) {
    const a = J.azar(Math.PI * 2), v = velRoca * J.azar(0.6, 1.4) * (4 - t) * 0.5;
    const r = [0, 30, 55, 90][t];
    const forma = Array.from({ length: 11 }, () => J.azar(0.75, 1.15));
    rocas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t, r, forma, giro: J.azar(-1, 1), ang: 0 });
  }
  function nuevaOleada() {
    oleada++;
    for (let k = 0; k < 3 + oleada; k++) {
      let x, y;
      do { x = J.azar(W); y = J.azar(H); } while (Math.hypot(x - nave.x, y - nave.y) < 350);
      roca(x, y, 3);
    }
    J.aviso("Oleada " + oleada);
  }
  function explota(x, y, n, c) { for (let k = 0; k < n; k++) { const a = J.azar(7), v = J.azar(60, 260); chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: J.azar(0.4, 0.9), c }); } }
  nuevaOleada();
  J.turno(0);
  return {
    tecla(j, a) {
      if (a === "ok" && !fin && cadencia <= 0 && balas.length < 6) {
        balas.push({ x: nave.x + Math.cos(nave.a) * 30, y: nave.y + Math.sin(nave.a) * 30, vx: Math.cos(nave.a) * 900 + nave.vx, vy: Math.sin(nave.a) * 900 + nave.vy, t: 1.1 });
        cadencia = 0.12; J.sonido("tic");
      }
    },
    actualizar(dt) {
      chispas.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; c.t -= dt; });
      chispas = chispas.filter((c) => c.t > 0);
      if (fin) return;
      cadencia -= dt;
      const giro = (J.pulsada(0, "derecha") ? 1 : 0) - (J.pulsada(0, "izquierda") ? 1 : 0);
      nave.a += giro * 4.2 * dt;
      if (J.pulsada(0, "arriba")) { nave.vx += Math.cos(nave.a) * 520 * dt; nave.vy += Math.sin(nave.a) * 520 * dt; if (Math.random() < 0.6) chispas.push({ x: nave.x - Math.cos(nave.a) * 22, y: nave.y - Math.sin(nave.a) * 22, vx: -Math.cos(nave.a) * 200 + J.azar(-40, 40), vy: -Math.sin(nave.a) * 200 + J.azar(-40, 40), t: 0.25, c: "#ffb347" }); }
      if (J.pulsada(0, "abajo")) { nave.vx *= 1 - 2.5 * dt; nave.vy *= 1 - 2.5 * dt; }
      nave.vx *= 1 - 0.35 * dt; nave.vy *= 1 - 0.35 * dt;
      nave.x += nave.vx * dt; nave.y += nave.vy * dt; envolver(nave);
      nave.inmune = Math.max(0, nave.inmune - dt);
      balas.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; envolver(b); });
      rocas.forEach((r) => { r.x += r.vx * dt; r.y += r.vy * dt; r.ang += r.giro * dt; envolver(r); });
      // balas contra rocas
      for (const b of balas) for (const r of rocas) {
        if (b.t > 0 && !r.rota && Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
          b.t = 0; r.rota = true; puntos += [0, 100, 50, 20][r.t];
          explota(r.x, r.y, 12, "#cfc6dd"); J.sonido(r.t === 1 ? "tic" : "explosion");
          if (r.t > 1) { roca(r.x, r.y, r.t - 1); roca(r.x, r.y, r.t - 1); }
        }
      }
      balas = balas.filter((b) => b.t > 0);
      rocas = rocas.filter((r) => !r.rota);
      // nave contra rocas
      if (!nave.inmune && rocas.some((r) => Math.hypot(r.x - nave.x, r.y - nave.y) < r.r * 0.85 + 18)) {
        vidas--; explota(nave.x, nave.y, 30, J.jugadores[0].color); J.sonido("perder");
        if (vidas <= 0) {
          fin = true;
          const r = J.record(puntos, true);
          return J.despues(1200, () => J.terminar({ puntos, bien: r.nuevo, titulo: puntos + " puntos", texto: "Oleada " + oleada + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor) }));
        }
        Object.assign(nave, { x: W / 2, y: H / 2, vx: 0, vy: 0, inmune: 2.5 });
      }
      if (!rocas.length) nuevaOleada();
    },
    dibujar(g) {
      g.fillStyle = "#05040c"; g.fillRect(0, 0, W, H);
      for (let k = 0; k < 120; k++) { g.fillStyle = "rgba(255,255,255," + (0.2 + (k % 5) * 0.12) + ")"; g.fillRect((k * 397) % W, (k * 613) % H, 2, 2); }
      rocas.forEach((r) => {
        g.save(); g.translate(r.x, r.y); g.rotate(r.ang);
        g.beginPath(); r.forma.forEach((f, k) => { const a = (k / r.forma.length) * Math.PI * 2; const x = Math.cos(a) * r.r * f, y = Math.sin(a) * r.r * f; k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
        g.fillStyle = "#3a3346"; g.fill(); g.strokeStyle = "#a79db3"; g.lineWidth = 3; g.stroke(); g.restore();
      });
      balas.forEach((b) => { g.fillStyle = "#ffd98a"; g.beginPath(); g.arc(b.x, b.y, 4, 0, 7); g.fill(); });
      chispas.forEach((c) => { g.globalAlpha = Math.min(1, c.t * 2); g.fillStyle = c.c; g.fillRect(c.x - 2, c.y - 2, 4, 4); g.globalAlpha = 1; });
      if (!fin && (!nave.inmune || Math.floor(J.tiempo * 10) % 2)) {
        g.save(); g.translate(nave.x, nave.y); g.rotate(nave.a);
        g.beginPath(); g.moveTo(28, 0); g.lineTo(-18, -18); g.lineTo(-10, 0); g.lineTo(-18, 18); g.closePath();
        g.fillStyle = J.jugadores[0].color; g.shadowColor = J.jugadores[0].color; g.shadowBlur = 20; g.fill(); g.restore();
      }
      D.texto(g, puntos, 40, 60, { tam: 56, titulo: true });
      for (let k = 0; k < vidas; k++) { g.save(); g.translate(60 + k * 46, 130); g.rotate(-Math.PI / 2); g.beginPath(); g.moveTo(16, 0); g.lineTo(-10, -10); g.lineTo(-6, 0); g.lineTo(-10, 10); g.closePath(); g.fillStyle = J.jugadores[0].color; g.fill(); g.restore(); }
      D.texto(g, "Oleada " + oleada, 1880, 60, { tam: 32, alin: "right", color: "#a79db3" });
      D.ayuda(g, "◀ ▶ girar · ▲ acelerar · ▼ frenar · OK disparar");
    }
  };
});
