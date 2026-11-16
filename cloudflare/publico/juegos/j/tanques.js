Salon.juego("tanques", function (J) {
  const D = Salon.dib;
  const ANCHO = 1920, PASO = 4, N = ANCHO / PASO + 1, GRAV = 420, VMAX = 1050, RADIO_EXP = 62;
  // terreno: altura (y) de la superficie en cada columna
  const suelo = new Float32Array(N);
  (function () {
    const a = [J.azar(60, 140), J.azar(30, 80), J.azar(15, 40)], f = [J.azar(0.002, 0.004), J.azar(0.006, 0.01), J.azar(0.015, 0.03)], fase = [J.azar(6), J.azar(6), J.azar(6)];
    for (let i = 0; i < N; i++) { const x = i * PASO; suelo[i] = 760 - a[0] * Math.sin(x * f[0] + fase[0]) - a[1] * Math.sin(x * f[1] + fase[1]) - a[2] * Math.sin(x * f[2] + fase[2]); }
  })();
  const alturaEn = (x) => { const i = Math.max(0, Math.min(N - 1, Math.round(x / PASO))); return suelo[i]; };
  const tanques = J.jugadores.map((p, i) => {
    const x = 180 + (i * (ANCHO - 360)) / Math.max(1, J.n - 1);
    return { x, y: alturaEn(x), vida: 100, angulo: i < J.n / 2 ? -Math.PI / 4 : (-3 * Math.PI) / 4, fuerza: 0.6, vivo: true };
  });
  // aplanar un poco donde están los tanques
  tanques.forEach((t) => { for (let dx = -30; dx <= 30; dx += PASO) { const i = Math.round((t.x + dx) / PASO); if (i >= 0 && i < N) suelo[i] = Math.max(suelo[i], alturaEn(t.x)); } t.y = alturaEn(t.x); });
  let turno = 0, viento = 0, fase = "apuntar", bala = null, explosion = null, pensando = false, fin = false, msg = "", animCpu = null, rastro = [];
  const P = Salon.punteria(J, { min: -Math.PI, max: 0, paso: 0.02 });

  function nuevoViento() { viento = Math.round(J.azar(-1, 1) * 10) * 9; }
  function empezar() {
    if (fin) return;
    fase = "apuntar";
    const t = tanques[turno];
    P.angulo = t.angulo; P.fuerza = t.fuerza;
    nuevoViento();
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(600, () => { const s = tiroMaquina(); pensando = false; animCpu = { t: 0, desde: [P.angulo, P.fuerza], ...s }; }); }
  }
  function boca(t) { return [t.x + Math.cos(P.angulo) * 34, t.y - 22 + Math.sin(P.angulo) * 34]; }
  function disparar() {
    const t = tanques[turno];
    t.angulo = P.angulo; t.fuerza = P.fuerza;
    const [x, y] = boca(t);
    bala = { x, y, vx: Math.cos(P.angulo) * P.fuerza * VMAX, vy: Math.sin(P.angulo) * P.fuerza * VMAX };
    rastro = []; fase = "volando"; msg = ""; J.sonido("explosion");
  }
  function moverBala(b, dt) {
    b.vx += viento * dt; b.vy += GRAV * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
  function impacta(b, ignorar) {
    if (b.x < -50 || b.x > ANCHO + 50 || b.y > 1100) return "fuera";
    if (b.y >= alturaEn(b.x)) return "suelo";
    for (let i = 0; i < tanques.length; i++) { const t = tanques[i]; if (t.vivo && i !== ignorar && Math.hypot(b.x - t.x, b.y - (t.y - 14)) < 28) return "tanque"; }
    return null;
  }
  function explotar(x, y) {
    explosion = { x, y, t: 0 };
    J.sonido("explosion");
    for (let i = 0; i < N; i++) {
      const dx = i * PASO - x;
      if (Math.abs(dx) > RADIO_EXP) continue;
      const h = Math.sqrt(RADIO_EXP * RADIO_EXP - dx * dx);
      if (suelo[i] < y + h) suelo[i] = Math.max(suelo[i], Math.min(1080, y + h));
    }
    const daños = [];
    tanques.forEach((t, i) => {
      if (!t.vivo) return;
      const d = Math.hypot(t.x - x, t.y - 14 - y);
      if (d < RADIO_EXP + 20) { const dmg = Math.round(Math.max(0, (RADIO_EXP + 20 - d) * 0.95)); t.vida -= dmg; if (dmg) daños.push(J.jugadores[i].nombre + " −" + dmg); }
    });
    msg = daños.length ? daños.join(" · ") : "¡Fallo!";
  }
  function asentar() {
    tanques.forEach((t, i) => {
      if (!t.vivo) return;
      const nuevo = alturaEn(t.x);
      if (nuevo > t.y + 1) { const caida = nuevo - t.y; if (caida > 40) t.vida -= Math.round(caida / 8); t.y = nuevo; }
      if (t.vida <= 0 || t.y > 1060) { t.vivo = false; t.vida = 0; J.aviso("¡" + J.jugadores[i].nombre + " eliminado!"); }
    });
    const vivos = tanques.map((t, i) => (t.vivo ? i : -1)).filter((i) => i >= 0);
    if (vivos.length <= 1) { fin = true; return J.despues(1000, () => J.terminar({ ganador: vivos.length ? vivos[0] : null })); }
    do { turno = (turno + 1) % J.n; } while (!tanques[turno].vivo);
    J.despues(700, empezar);
  }
  function tiroMaquina() {
    const yo = tanques[turno];
    const rivales = tanques.map((t, i) => ({ t, i })).filter((r) => r.t.vivo && r.i !== turno);
    const obj = rivales.sort((a, b) => Math.abs(a.t.x - yo.x) - Math.abs(b.t.x - yo.x))[J.dificultad === 3 ? 0 : J.entero(0, rivales.length - 1)].t;
    let mejor = { d: Infinity, a: -Math.PI / 4, f: 0.6 };
    const lado = obj.x > yo.x ? 1 : -1;
    for (let k = 0; k <= 30; k++) {
      const a = lado > 0 ? -0.15 - k * 0.045 : -Math.PI + 0.15 + k * 0.045;
      for (let f = 0.3; f <= 1.001; f += 0.035) {
        const b = { x: yo.x + Math.cos(a) * 34, y: yo.y - 22 + Math.sin(a) * 34, vx: Math.cos(a) * f * VMAX, vy: Math.sin(a) * f * VMAX };
        let r = null, t = 0;
        while (!r && t < 8) { moverBala(b, 1 / 60); t += 1 / 60; r = impacta(b, turno); }
        if (r === "fuera") continue;
        const d = Math.hypot(b.x - obj.x, b.y - obj.y);
        if (d < mejor.d) mejor = { d, a, f };
      }
    }
    const ruidoA = [0, 0.09, 0.035, 0.01][J.dificultad], ruidoF = [0, 0.09, 0.035, 0.012][J.dificultad];
    return { a: mejor.a + (Math.random() - 0.5) * 2 * ruidoA, f: Math.max(0.1, Math.min(1, mejor.f + (Math.random() - 0.5) * 2 * ruidoF)) };
  }
  empezar();

  return {
    tecla(j, a) { if (fase === "apuntar" && !pensando && !animCpu && !fin && P.tecla(a)) disparar(); },
    apuntar(j, a) { if (fase === "apuntar" && !pensando && !animCpu && !fin && P.apuntar(Object.assign({}, a, { angulo: a.angulo > 0 ? (a.angulo > Math.PI / 2 ? -Math.PI : 0) : a.angulo }))) disparar(); },
    actualizar(dt) {
      if (fase === "apuntar" && !J.jugadores[turno].cpu) P.actualizar(dt, turno);
      if (animCpu) {
        animCpu.t += dt * 1.3;
        const e = Math.min(1, animCpu.t);
        P.angulo = animCpu.desde[0] + (animCpu.a - animCpu.desde[0]) * e; P.fuerza = animCpu.desde[1] + (animCpu.f - animCpu.desde[1]) * e;
        if (animCpu.t > 1.3) { animCpu = null; P.angulo = Math.max(-Math.PI, Math.min(0, P.angulo)); disparar(); }
      }
      if (fase === "volando" && bala) {
        for (let k = 0; k < 4; k++) {
          moverBala(bala, dt / 4);
          const r = impacta(bala, -1);
          if (r) { if (r !== "fuera") explotar(bala.x, Math.min(bala.y, 1075)); else msg = "Se salió del mapa"; bala = null; fase = "explotando"; J.despues(900, asentar); break; }
        }
        if (bala) { rastro.push([bala.x, bala.y]); if (rastro.length > 60) rastro.shift(); }
      }
      if (explosion) { explosion.t += dt; if (explosion.t > 0.8) explosion = null; }
    },
    dibujar(g) {
      // cielo
      const cielo = g.createLinearGradient(0, 0, 0, 1080); cielo.addColorStop(0, "#1b2a4a"); cielo.addColorStop(0.6, "#e08a5a"); cielo.addColorStop(1, "#f2c48a");
      g.fillStyle = cielo; g.fillRect(0, 0, 1920, 1080);
      g.fillStyle = "rgba(255,240,200,.85)"; g.beginPath(); g.arc(1500, 300, 70, 0, 7); g.fill();
      // terreno
      g.beginPath(); g.moveTo(0, 1080);
      for (let i = 0; i < N; i++) g.lineTo(i * PASO, suelo[i]);
      g.lineTo(1920, 1080); g.closePath();
      const tg = g.createLinearGradient(0, 500, 0, 1080); tg.addColorStop(0, "#5f7a3a"); tg.addColorStop(0.15, "#4a5f2c"); tg.addColorStop(1, "#2a2216");
      g.fillStyle = tg; g.fill();
      g.strokeStyle = "#86a64e"; g.lineWidth = 5; g.beginPath(); for (let i = 0; i < N; i++) (i ? g.lineTo(i * PASO, suelo[i]) : g.moveTo(0, suelo[0])); g.stroke();
      // tanques
      tanques.forEach((t, i) => {
        if (!t.vivo) { g.fillStyle = "rgba(30,25,20,.8)"; D.ruta(g, t.x - 28, t.y - 14, 56, 14, 4); g.fill(); return; }
        const p = J.jugadores[i];
        const ang = i === turno && fase === "apuntar" ? P.angulo : t.angulo;
        g.save();
        g.strokeStyle = "#2b2b2b"; g.lineWidth = 9; g.lineCap = "round";
        g.beginPath(); g.moveTo(t.x, t.y - 22); g.lineTo(t.x + Math.cos(ang) * 34, t.y - 22 + Math.sin(ang) * 34); g.stroke();
        g.fillStyle = p.color; g.beginPath(); g.arc(t.x, t.y - 20, 16, Math.PI, 0); g.fill();
        D.caja(g, t.x - 30, t.y - 20, 60, 16, { relleno: D.mezclar(p.color, -0.2), r: 6 });
        g.fillStyle = "#222"; D.ruta(g, t.x - 32, t.y - 8, 64, 10, 5); g.fill();
        g.restore();
        // vida
        D.caja(g, t.x - 32, t.y - 62, 64, 9, { relleno: "rgba(0,0,0,.5)", r: 4 });
        D.caja(g, t.x - 32, t.y - 62, 64 * Math.max(0, t.vida) / 100, 9, { relleno: t.vida > 50 ? "#5fd38d" : t.vida > 25 ? "#f2b84b" : "#ef5b5b", r: 4 });
        if (i === turno && !fin) D.texto(g, "▼", t.x, t.y - 82, { tam: 26, alin: "center", color: p.color });
      });
      // bala y rastro
      g.fillStyle = "rgba(255,255,255,.5)"; rastro.forEach(([x, y], k) => { if (k % 2) return; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); });
      if (bala) { g.fillStyle = "#1d1b24"; g.beginPath(); g.arc(bala.x, bala.y, 7, 0, 7); g.fill(); }
      if (explosion) {
        const e = explosion.t / 0.8;
        const gr = g.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, RADIO_EXP * (0.6 + e));
        gr.addColorStop(0, "rgba(255,240,180," + (1 - e) + ")"); gr.addColorStop(0.5, "rgba(255,140,40," + (1 - e) * 0.9 + ")"); gr.addColorStop(1, "rgba(255,60,20,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(explosion.x, explosion.y, RADIO_EXP * (0.6 + e), 0, 7); g.fill();
      }
      // panel superior
      J.jugadores.forEach((p, i) => {
        const x = 30 + i * 380;
        D.caja(g, x, 20, 360, 70, { relleno: i === turno && !fin ? "rgba(255,217,138,.2)" : "rgba(0,0,0,.35)", borde: i === turno && !fin ? "#e8b85c" : "rgba(255,255,255,.12)", r: 14 });
        D.ficha(g, x + 34, 55, 16, p.color, { anillo: false });
        D.texto(g, p.nombre, x + 62, 55, { tam: 26, peso: 700, max: 200 });
        D.texto(g, tanques[i].vivo ? tanques[i].vida + "%" : "✖", x + 340, 55, { tam: 26, alin: "right" });
      });
      // viento
      const vx = 1640, vy = 55;
      D.texto(g, "Viento", vx, vy - 2, { tam: 24, color: "#f6efe2" });
      g.strokeStyle = "#fff"; g.lineWidth = 6; g.lineCap = "round";
      const largo = (viento / 90) * 80;
      g.beginPath(); g.moveTo(vx + 140, vy); g.lineTo(vx + 140 + largo, vy); g.stroke();
      if (Math.abs(largo) > 4) { g.beginPath(); g.moveTo(vx + 140 + largo, vy); g.lineTo(vx + 140 + largo - Math.sign(largo) * 14, vy - 10); g.moveTo(vx + 140 + largo, vy); g.lineTo(vx + 140 + largo - Math.sign(largo) * 14, vy + 10); g.stroke(); }
      else D.texto(g, "calma", vx + 140, vy, { tam: 22, alin: "center" });
      D.texto(g, pensando ? J.jugadores[turno].nombre + " calcula…" : msg, 960, 140, { tam: 32, alin: "center", color: "#fff6e0" });
      if (fase === "apuntar" && !J.jugadores[turno].cpu && !fin) {
        D.barraFuerza(g, 760, 1012, 400, 44, P.fuerza);
        D.texto(g, "◀ ▶ ángulo " + Math.round((-P.angulo * 180) / Math.PI) + "° · ▲ ▼ fuerza · OK disparar", 60, 1034, { tam: 24, color: "#fff6e0", peso: 400 });
      }
    }
  };
});
