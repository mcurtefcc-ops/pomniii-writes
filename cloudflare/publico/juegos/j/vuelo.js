Salon.juego("vuelo", function (J) {
  const D = Salon.dib;
  const GRAV = 1900, ALETEO = -620, VEL = [0, 300, 360, 430][J.dificultad], HUECO = [0, 330, 280, 240][J.dificultad], SEP = 470;
  const pajaros = J.jugadores.map((p, i) => ({ x: 420 - i * 60, y: 420 + i * 70, vy: 0, vivo: true, puntos: 0, giro: 0 }));
  let tubos = [], fin = false, empezado = false, desplaz = 0, nubes = [];
  for (let k = 0; k < 6; k++) nubes.push({ x: J.azar(0, 1920), y: J.azar(60, 400), s: J.azar(0.6, 1.4) });
  function nuevoTubo(x) { tubos.push({ x, hueco: J.azar(250, 830 - HUECO), pasado: J.jugadores.map(() => false) }); }
  for (let k = 0; k < 4; k++) nuevoTubo(1200 + k * SEP);
  J.turno(0);
  function aletear(j) { const p = pajaros[j]; if (!p.vivo || fin) return; empezado = true; p.vy = ALETEO; J.sonido("mover"); }
  function morir(p) { if (!p.vivo) return; p.vivo = false; J.sonido("perder"); }
  return {
    tecla(j, a) { if (a === "ok" || a === "arriba") aletear(j); },
    actualizar(dt) {
      if (fin) return;
      nubes.forEach((n) => { n.x -= VEL * 0.2 * n.s * dt; if (n.x < -200) { n.x = 2100; n.y = J.azar(60, 400); } });
      if (!empezado) { pajaros.forEach((p, i) => (p.y = 420 + i * 70 + Math.sin(J.tiempo * 4 + i) * 12)); return; }
      desplaz += VEL * dt;
      tubos.forEach((t) => (t.x -= VEL * dt));
      if (tubos[0].x < -140) { tubos.shift(); nuevoTubo(tubos[tubos.length - 1].x + SEP); }
      pajaros.forEach((p, i) => {
        if (!p.vivo) { p.y = Math.min(1000, p.y + 900 * dt); p.x -= VEL * dt; return; }
        p.vy += GRAV * dt; p.y += p.vy * dt; p.giro = Math.max(-0.5, Math.min(1.2, p.vy / 700));
        if (p.y > 980 || p.y < 20) morir(p);
        tubos.forEach((t) => {
          if (p.x + 26 > t.x && p.x - 26 < t.x + 120 && (p.y - 22 < t.hueco || p.y + 22 > t.hueco + HUECO)) morir(p);
          if (!t.pasado[i] && t.x + 120 < p.x) { t.pasado[i] = true; p.puntos++; J.sonido("tic"); }
        });
      });
      if (pajaros.every((p) => !p.vivo)) {
        fin = true;
        if (J.n === 1) {
          const pts = pajaros[0].puntos, r = J.record(pts, true);
          return J.despues(900, () => J.terminar({ puntos: pts, bien: r.nuevo, titulo: pts + (pts === 1 ? " tubo" : " tubos"), texto: r.nuevo ? "¡Nuevo récord!" : "Récord: " + r.mejor }));
        }
        const max = Math.max(...pajaros.map((p) => p.puntos)), g = pajaros.map((p, i) => (p.puntos === max ? i : -1)).filter((i) => i >= 0);
        J.despues(900, () => J.terminar({ ganador: g.length === 1 ? g[0] : null, texto: J.jugadores.map((p, i) => p.nombre + ": " + pajaros[i].puntos).join(" · ") }));
      }
    },
    dibujar(g) {
      const cielo = g.createLinearGradient(0, 0, 0, 1080); cielo.addColorStop(0, "#5ec2f0"); cielo.addColorStop(1, "#c9ecfb");
      g.fillStyle = cielo; g.fillRect(0, 0, 1920, 1080);
      nubes.forEach((n) => { g.fillStyle = "rgba(255,255,255,.85)"; [[0, 0, 50], [45, -15, 40], [85, 5, 45], [40, 15, 45]].forEach(([a, b, r]) => { g.beginPath(); g.arc(n.x + a * n.s, n.y + b * n.s, r * n.s, 0, 7); g.fill(); }); });
      tubos.forEach((t) => {
        const gr = g.createLinearGradient(t.x, 0, t.x + 120, 0); gr.addColorStop(0, "#3d9b4a"); gr.addColorStop(0.5, "#6fd37c"); gr.addColorStop(1, "#2f7d3a");
        g.fillStyle = gr;
        g.fillRect(t.x, 0, 120, t.hueco); g.fillRect(t.x, t.hueco + HUECO, 120, 1080);
        g.fillStyle = "#2a6a32"; g.fillRect(t.x - 10, t.hueco - 40, 140, 40); g.fillRect(t.x - 10, t.hueco + HUECO, 140, 40);
      });
      g.fillStyle = "#d9b26f"; g.fillRect(0, 1000, 1920, 80);
      g.fillStyle = "#6fbf4a"; g.fillRect(0, 1000, 1920, 14);
      for (let x = -(desplaz % 60); x < 1920; x += 60) { g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(x, 1014, 30, 66); }
      pajaros.forEach((p, i) => {
        g.save(); g.translate(p.x, p.y); g.rotate(p.giro); g.globalAlpha = p.vivo ? 1 : 0.5;
        D.ficha(g, 0, 0, 26, J.jugadores[i].color, { anillo: false });
        g.fillStyle = "#fff"; g.beginPath(); g.arc(10, -8, 9, 0, 7); g.fill();
        g.fillStyle = "#111"; g.beginPath(); g.arc(13, -8, 4, 0, 7); g.fill();
        g.fillStyle = "#ff8f3a"; g.beginPath(); g.moveTo(22, 0); g.lineTo(40, 5); g.lineTo(22, 10); g.fill();
        g.fillStyle = D.mezclar(J.jugadores[i].color, 0.35); g.beginPath(); g.ellipse(-8, 6 + Math.sin(J.tiempo * 20) * 4, 14, 8, 0.3, 0, 7); g.fill();
        g.restore();
      });
      J.jugadores.forEach((p, i) => {
        const x = 40 + i * 300;
        D.caja(g, x, 24, 280, 70, { relleno: "rgba(0,0,0,.25)", r: 14 });
        D.ficha(g, x + 34, 59, 16, p.color, { anillo: false });
        D.texto(g, p.nombre + (pajaros[i].vivo ? "" : " ✖"), x + 60, 59, { tam: 24, peso: 700, max: 150 });
        D.texto(g, pajaros[i].puntos, x + 262, 60, { tam: 38, alin: "right", titulo: true });
      });
      if (!empezado) D.texto(g, "Pulsa OK para aletear", 960, 540, { tam: 60, alin: "center", titulo: true, color: "#1d3a5a", sombra: false });
    }
  };
});
