Salon.juego("karts", function (J) {
  const D = Salon.dib;
  // ---------- Circuitos (puntos de control, se suavizan con una curva) ----------
  const CIRCUITOS = {
    1: { nombre: "Bosque", cesped: ["#2f7a3a", "#256a31"], borde: "#e9e2d0", deco: "arbol",
      p: [[0.12, 0.5], [0.18, 0.2], [0.4, 0.12], [0.6, 0.25], [0.8, 0.12], [0.93, 0.3], [0.9, 0.65], [0.7, 0.88], [0.45, 0.75], [0.25, 0.9], [0.1, 0.78]] },
    2: { nombre: "Playa", cesped: ["#e8cf8e", "#dcc07a"], borde: "#ffffff", deco: "palmera",
      p: [[0.1, 0.3], [0.3, 0.12], [0.55, 0.2], [0.72, 0.1], [0.9, 0.2], [0.9, 0.42], [0.68, 0.46], [0.88, 0.72], [0.7, 0.92], [0.42, 0.86], [0.36, 0.6], [0.16, 0.76]] },
    3: { nombre: "Volcán", cesped: ["#3b2a2a", "#2e2020"], borde: "#ff9a3c", deco: "roca",
      p: [[0.08, 0.16], [0.34, 0.1], [0.46, 0.34], [0.58, 0.12], [0.92, 0.13], [0.93, 0.4], [0.72, 0.46], [0.92, 0.6], [0.9, 0.9], [0.62, 0.92], [0.52, 0.66], [0.36, 0.9], [0.1, 0.9], [0.2, 0.56], [0.07, 0.42]] }
  };
  const C = CIRCUITOS[J.opcion("circuito") || 1];
  const AX = 90, AY = 150, AW = 1740, AH = 880, ANCHO = 128, VUELTAS = J.opcion("vueltas") || 5;
  const ctrl = C.p.map(([x, y]) => [AX + x * AW, AY + y * AH]);
  // curva cerrada de Catmull-Rom muestreada
  const pista = [];
  for (let i = 0; i < ctrl.length; i++) {
    const p0 = ctrl[(i - 1 + ctrl.length) % ctrl.length], p1 = ctrl[i], p2 = ctrl[(i + 1) % ctrl.length], p3 = ctrl[(i + 2) % ctrl.length];
    for (let k = 0; k < 40; k++) {
      const t = k / 40, t2 = t * t, t3 = t2 * t;
      pista.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  const N = pista.length;
  const dirEn = (i) => { const a = pista[(i - 2 + N) % N], b = pista[(i + 2) % N]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
  // salida: un poco antes del punto 0
  const SALIDA = 0;

  // ---------- Corredores: los jugadores + rivales de la máquina hasta 6 ----------
  const NOMBRES = ["Rayo", "Chispa", "Cometa", "Nube", "Bólido", "Centella"];
  const COLORES_RIVAL = ["#e5484d", "#3fbf6f", "#b38cff", "#ff8f5a", "#4cc3f0", "#f06bb3"];
  const karts = [];
  const total = Math.max(6, J.n);
  for (let i = 0; i < total; i++) {
    const slot = i < J.n ? i : -1;
    const humano = slot >= 0 && !J.jugadores[slot].cpu;
    karts.push({
      i, slot, humano,
      nombre: slot >= 0 ? J.jugadores[slot].nombre : NOMBRES[i % NOMBRES.length],
      color: slot >= 0 ? J.jugadores[slot].color : COLORES_RIVAL[i % COLORES_RIVAL.length],
      x: 0, y: 0, a: 0, v: 0, vx: 0, vy: 0, idx: 0, vuelta: 0, mitad: false,
      objeto: null, turbo: 0, giro: 0, escudo: 0, giroGirando: 0, derrape: 0, dirDerrape: 0,
      fin: null, offset: (Math.random() - 0.5) * 50, nivel: (slot >= 0 ? 0.97 : [0.86, 0.9, 0.94, 0.97, 1.0, 0.92][i % 6]) * (J.dificultad === 1 ? 0.88 : J.dificultad === 2 ? 0.95 : 1.02)
    });
  }
  // parrilla de salida: dos filas detrás de la línea
  karts.forEach((k, n) => {
    const fila = Math.floor(n / 2), lado = n % 2 ? 1 : -1;
    const idx = (SALIDA - 6 - fila * 7 + N) % N, [dx, dy] = dirEn(idx);
    k.x = pista[idx][0] - dy * lado * 28; k.y = pista[idx][1] + dx * lado * 28;
    k.a = Math.atan2(dy, dx); k.idx = idx; k.vuelta = -1; k.mitad = true;
  });

  // ---------- Objetos ----------
  const cajas = [];
  [0.22, 0.52, 0.78].forEach((f) => {
    const idx = Math.floor(N * f), [dx, dy] = dirEn(idx);
    [-39, -13, 13, 39].forEach((o) => cajas.push({ x: pista[idx][0] - dy * o, y: pista[idx][1] + dx * o, vuelve: 0 }));
  });
  const OBJ = { turbo: "⚡", aceite: "🛢", misil: "🚀", escudo: "🛡" };
  let manchas = [], misiles = [], chispas = [], cuenta = 3.9, t = 0, fin = false, tFin = null, orden = [];

  // ---------- Dibujo del circuito (una vez, en una capa aparte) ----------
  let capa = null;
  function pintarCapa() {
    const esc = Salon.escala || 1;
    capa = document.createElement("canvas");
    capa.width = Math.ceil(1920 * esc); capa.height = Math.ceil(1080 * esc);
    const g = capa.getContext("2d");
    g.scale(esc, esc);
    // fondo con textura
    g.fillStyle = C.cesped[0]; g.fillRect(0, 0, 1920, 1080);
    for (let k = 0; k < 2600; k++) { g.fillStyle = k % 2 ? C.cesped[1] : D.mezclar(C.cesped[0], 0.06); g.fillRect((k * 397) % 1920, (k * 631) % 1080, 3 + (k % 4), 3 + (k % 3)); }
    const ruta = () => { g.beginPath(); pista.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    g.lineJoin = "round"; g.lineCap = "round";
    // sombra, piano rojo y blanco, asfalto
    ruta(); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = ANCHO + 34; g.stroke();
    ruta(); g.strokeStyle = C.borde; g.lineWidth = ANCHO + 18; g.stroke();
    ruta(); g.setLineDash([22, 22]); g.strokeStyle = "#d8343f"; g.lineWidth = ANCHO + 18; g.stroke(); g.setLineDash([]);
    ruta(); g.strokeStyle = "#4a4a52"; g.lineWidth = ANCHO; g.stroke();
    ruta(); g.strokeStyle = "rgba(255,255,255,.06)"; g.lineWidth = ANCHO - 30; g.stroke();
    ruta(); g.setLineDash([26, 30]); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
    // línea de meta a cuadros
    const [mx, my] = pista[SALIDA], [dx, dy] = dirEn(SALIDA);
    g.save(); g.translate(mx, my); g.rotate(Math.atan2(dy, dx));
    for (let a = 0; a < 2; a++) for (let b = -8; b < 8; b++) { g.fillStyle = (a + b) % 2 ? "#111" : "#fff"; g.fillRect(-8 + a * 8, b * 8, 8, 8); }
    g.restore();
    // decoración alrededor (lejos del asfalto)
    for (let k = 0; k < 70; k++) {
      const x = 40 + ((k * 733) % 1840), y = 120 + ((k * 457) % 940);
      let lejos = true;
      for (let q = 0; q < N; q += 4) if (Math.hypot(pista[q][0] - x, pista[q][1] - y) < ANCHO / 2 + 45) { lejos = false; break; }
      if (!lejos) continue;
      if (C.deco === "arbol") { g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(x + 6, y + 8, 22, 0, 7); g.fill(); D.ficha(g, x, y, 22, "#2e9b52", { anillo: false, sombra: false }); D.ficha(g, x - 6, y - 6, 12, "#4fc06a", { anillo: false, sombra: false }); }
      else if (C.deco === "palmera") { g.fillStyle = "rgba(0,0,0,.2)"; g.beginPath(); g.arc(x + 6, y + 8, 18, 0, 7); g.fill(); g.strokeStyle = "#2e9b52"; g.lineWidth = 7; g.lineCap = "round"; for (let h = 0; h < 5; h++) { const an = h * 1.26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * 24, y + Math.sin(an) * 24); g.stroke(); } D.ficha(g, x, y, 6, "#8b5a2b", { anillo: false, sombra: false }); }
      else { D.ficha(g, x, y, 16 + (k % 3) * 5, "#5a4848", { anillo: false }); if (k % 4 === 0) { g.fillStyle = "rgba(255,120,40,.5)"; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); } }
    }
  }

  // ---------- Lógica ----------
  function masCercano(k) {
    let mejor = k.idx, dmin = Infinity;
    for (let o = -25; o <= 25; o++) { const i = (k.idx + o + N) % N, d = (pista[i][0] - k.x) ** 2 + (pista[i][1] - k.y) ** 2; if (d < dmin) { dmin = d; mejor = i; } }
    return [mejor, Math.sqrt(dmin)];
  }
  const progreso = (k) => (k.fin != null ? 1e6 - k.fin : k.vuelta * N + k.idx);
  function posiciones() { return karts.slice().sort((a, b) => progreso(b) - progreso(a)); }
  function darObjeto(k) {
    const pos = posiciones().indexOf(k);
    const atras = pos / (karts.length - 1);
    const r = Math.random();
    k.objeto = atras > 0.6 ? (r < 0.45 ? "turbo" : r < 0.8 ? "misil" : "escudo") : atras > 0.25 ? (r < 0.3 ? "turbo" : r < 0.55 ? "misil" : r < 0.8 ? "aceite" : "escudo") : (r < 0.45 ? "aceite" : r < 0.75 ? "escudo" : "turbo");
    if (k.humano) J.sonido("punto");
  }
  function usar(k) {
    const o = k.objeto; if (!o) return;
    k.objeto = null;
    if (o === "turbo") { k.turbo = 1.4; J.sonido("gol"); }
    else if (o === "escudo") k.escudo = 6;
    else if (o === "aceite") manchas.push({ x: k.x - Math.cos(k.a) * 34, y: k.y - Math.sin(k.a) * 34, t: 25 });
    else if (o === "misil") {
      const ps = posiciones(), yo = ps.indexOf(k), obj = yo > 0 ? ps[yo - 1] : null;
      misiles.push({ x: k.x + Math.cos(k.a) * 30, y: k.y + Math.sin(k.a) * 30, a: k.a, obj, de: k, t: 6 });
      J.sonido("explosion");
    }
  }
  function golpe(k) {
    if (k.escudo > 0) { k.escudo = 0; return; }
    k.giro = 1.1; k.v *= 0.3; if (k.humano) J.sonido("error");
  }
  function ia(k, dt) {
    const mira = (k.idx + 14 + Math.floor(k.v / 60)) % N, [dx, dy] = dirEn(mira);
    const tx = pista[mira][0] - dy * k.offset, ty = pista[mira][1] + dx * k.offset;
    let dif = Math.atan2(ty - k.y, tx - k.x) - k.a; dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    k.dir = Math.max(-1, Math.min(1, dif * 3));
    k.frena = Math.abs(dif) > 0.9 && k.v > 260;
    if (k.objeto) {
      const ps = posiciones(), yo = ps.indexOf(k);
      if (k.objeto === "turbo" && Math.abs(dif) < 0.2) usar(k);
      else if (k.objeto === "misil" && yo > 0) usar(k);
      else if (k.objeto === "aceite" && yo < ps.length - 1 && Math.hypot(ps[yo + 1].x - k.x, ps[yo + 1].y - k.y) < 220) usar(k);
      else if (k.objeto === "escudo" && misiles.some((m) => m.obj === k)) usar(k);
      else if (Math.random() < dt * 0.15) usar(k);
    }
  }
  function mover(k, dt) {
    const humano = k.humano;
    let dir = 0, frena = false;
    if (k.fin != null && !humano) { dir = 0; }
    if (humano) { dir = (J.pulsada(k.slot, "derecha") ? 1 : 0) - (J.pulsada(k.slot, "izquierda") ? 1 : 0); frena = J.pulsada(k.slot, "abajo"); }
    else { ia(k, dt); dir = k.dir; frena = k.frena; }
    if (k.fin != null) { frena = false; }
    const [idx, dist] = masCercano(k);
    const fuera = dist > ANCHO / 2 + 6;
    const base = 390 * (humano ? 1 : k.nivel) * (fuera ? 0.45 : 1);
    const vmax = k.turbo > 0 ? base * 1.55 : base;
    if (k.giro > 0) { k.giro -= dt; k.a += dt * 12; k.v = Math.max(0, k.v - 400 * dt); }
    else {
      if (frena) k.v = Math.max(-120, k.v - 520 * dt);
      else if (k.v < vmax) k.v = Math.min(vmax, k.v + (k.turbo > 0 ? 900 : 300) * dt);
      else k.v = Math.max(vmax, k.v - 500 * dt);
      const giroFuerza = 2.7 * Math.min(1, Math.abs(k.v) / 160) * Math.sign(k.v || 1);
      k.a += dir * giroFuerza * dt * (k.derrape > 0.4 ? 1.15 : 1);
      // derrape: mantener el giro a toda velocidad carga un mini-turbo
      if (dir !== 0 && k.v > base * 0.75 && (k.dirDerrape === 0 || k.dirDerrape === dir)) { k.dirDerrape = dir; k.derrape += dt; }
      else if (k.derrape > 0) {
        if (k.derrape > 1.6) { k.turbo = Math.max(k.turbo, 1.0); if (humano) J.sonido("gol"); }
        else if (k.derrape > 0.7) { k.turbo = Math.max(k.turbo, 0.55); if (humano) J.sonido("punto"); }
        k.derrape = 0; k.dirDerrape = 0;
      }
    }
    k.turbo = Math.max(0, k.turbo - dt); k.escudo = Math.max(0, k.escudo - dt);
    // velocidad con algo de deslizamiento lateral
    const agarre = k.derrape > 0.4 ? 5 : 11;
    const tx = Math.cos(k.a) * k.v, ty = Math.sin(k.a) * k.v;
    k.vx += (tx - k.vx) * Math.min(1, agarre * dt); k.vy += (ty - k.vy) * Math.min(1, agarre * dt);
    k.x += k.vx * dt; k.y += k.vy * dt;
    k.x = Math.max(20, Math.min(1900, k.x)); k.y = Math.max(130, Math.min(1065, k.y));
    // vueltas
    const antes = k.idx; k.idx = idx;
    if (k.idx > N * 0.4 && k.idx < N * 0.6) k.mitad = true;
    if (antes > N * 0.85 && k.idx < N * 0.15 && k.mitad) {
      k.vuelta++; k.mitad = false;
      if (k.vuelta >= VUELTAS && k.fin == null) { k.fin = t; orden.push(k); if (k.humano) J.sonido(orden.length === 1 ? "ganar" : "punto"); if (tFin == null) tFin = t; }
      else if (k.humano && k.vuelta === VUELTAS - 1) J.aviso(k.nombre + ": ¡última vuelta!");
    } else if (antes < N * 0.15 && k.idx > N * 0.85) { k.vuelta--; k.mitad = true; }
    // chispas
    if (k.derrape > 0.7 && Math.random() < 0.7) chispas.push({ x: k.x - Math.cos(k.a) * 16, y: k.y - Math.sin(k.a) * 16, vx: J.azar(-60, 60), vy: J.azar(-60, 60), t: 0.3, c: k.derrape > 1.6 ? "#ff8f3a" : "#7fd6ff" });
    if (k.turbo > 0 && Math.random() < 0.8) chispas.push({ x: k.x - Math.cos(k.a) * 20, y: k.y - Math.sin(k.a) * 20, vx: -Math.cos(k.a) * 120, vy: -Math.sin(k.a) * 120, t: 0.25, c: "#ffd98a" });
    if (fuera && Math.abs(k.v) > 100 && Math.random() < 0.4) chispas.push({ x: k.x, y: k.y, vx: J.azar(-40, 40), vy: J.azar(-40, 40), t: 0.4, c: "rgba(120,90,60,.6)" });
  }
  J.turno(0);

  function dibujarKart(g, k) {
    g.save(); g.translate(k.x, k.y);
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(5, 7, 24, 16, k.a, 0, 7); g.fill();
    g.rotate(k.a);
    // ruedas
    g.fillStyle = "#1a1a1e";
    [[-13, -14], [-13, 14], [12, -14], [12, 14]].forEach(([x, y]) => D.caja(g, x - 6, y - 4, 12, 8, { relleno: "#1a1a1e", r: 3 }));
    // carrocería
    const gr = g.createLinearGradient(0, -12, 0, 12); gr.addColorStop(0, D.mezclar(k.color, 0.35)); gr.addColorStop(0.5, k.color); gr.addColorStop(1, D.mezclar(k.color, -0.35));
    g.fillStyle = gr; g.beginPath(); g.moveTo(22, 0); g.quadraticCurveTo(20, -11, 8, -12); g.lineTo(-18, -11); g.quadraticCurveTo(-22, 0, -18, 11); g.lineTo(8, 12); g.quadraticCurveTo(20, 11, 22, 0); g.fill();
    g.fillStyle = "rgba(0,0,0,.35)"; D.ruta(g, -22, -10, 5, 20, 2); g.fill();
    // casco del piloto
    D.ficha(g, -3, 0, 8, "#f6f1e4", { anillo: false, sombra: false });
    g.fillStyle = "#1d1b24"; g.beginPath(); g.arc(-1, 0, 5, -1.2, 1.2); g.fill();
    g.restore();
    if (k.escudo > 0) { g.save(); g.strokeStyle = "rgba(127,214,255,.85)"; g.lineWidth = 4; g.shadowColor = "#7fd6ff"; g.shadowBlur = 14; g.beginPath(); g.arc(k.x, k.y, 30, 0, 7); g.stroke(); g.restore(); }
    if (k.humano) D.texto(g, k.nombre, k.x, k.y - 34, { tam: 18, alin: "center", peso: 700, color: k.color });
  }

  return {
    tecla(j, a) {
      const k = karts.find((x) => x.slot === j);
      if (a === "ok" && k && cuenta <= 0 && k.fin == null) usar(k);
    },
    actualizar(dt) {
      if (fin) return;
      if (!capa) pintarCapa();
      if (cuenta > 0) { const antes = Math.ceil(cuenta); cuenta -= dt; if (Math.ceil(cuenta) !== antes && cuenta > 0) J.sonido("tic"); if (cuenta <= 0) J.sonido("gol"); return; }
      t += dt;
      karts.forEach((k) => mover(k, dt));
      // choques entre karts
      for (let a = 0; a < karts.length; a++) for (let b = a + 1; b < karts.length; b++) {
        const p = karts[a], q = karts[b], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < 34) { const e = (34 - d) / 2, nx = dx / d, ny = dy / d; p.x -= nx * e; p.y -= ny * e; q.x += nx * e; q.y += ny * e; }
      }
      // cajas
      cajas.forEach((c) => {
        if (c.vuelve > 0) { c.vuelve -= dt; return; }
        const k = karts.find((k) => !k.objeto && Math.hypot(k.x - c.x, k.y - c.y) < 26);
        if (k) { c.vuelve = 3; darObjeto(k); }
      });
      // manchas de aceite
      manchas.forEach((m) => { m.t -= dt; karts.forEach((k) => { if (k.giro <= 0 && Math.hypot(k.x - m.x, k.y - m.y) < 24) { golpe(k); m.t = 0; } }); });
      manchas = manchas.filter((m) => m.t > 0);
      // misiles teledirigidos
      misiles.forEach((m) => {
        m.t -= dt;
        if (m.obj && m.obj.fin == null) { let d = Math.atan2(m.obj.y - m.y, m.obj.x - m.x) - m.a; d = Math.atan2(Math.sin(d), Math.cos(d)); m.a += Math.max(-4 * dt, Math.min(4 * dt, d)); }
        m.x += Math.cos(m.a) * 620 * dt; m.y += Math.sin(m.a) * 620 * dt;
        chispas.push({ x: m.x, y: m.y, vx: 0, vy: 0, t: 0.3, c: "rgba(255,255,255,.6)" });
        const k = karts.find((k) => k !== m.de && Math.hypot(k.x - m.x, k.y - m.y) < 24);
        if (k) { golpe(k); m.t = 0; J.sonido("explosion"); for (let q = 0; q < 14; q++) chispas.push({ x: m.x, y: m.y, vx: J.azar(-200, 200), vy: J.azar(-200, 200), t: 0.5, c: "#ff8f3a" }); }
      });
      misiles = misiles.filter((m) => m.t > 0);
      chispas.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; c.t -= dt; });
      chispas = chispas.filter((c) => c.t > 0);
      // final: cuando acaban todos los jugadores, o 15 s después del primero
      const humanos = karts.filter((k) => k.slot >= 0);
      if (tFin != null && (humanos.every((k) => k.fin != null) || t - tFin > 15)) {
        fin = true;
        const ps = posiciones(), primero = ps[0];
        const texto = ps.map((k, n) => n + 1 + "º " + k.nombre + (k.fin != null ? " (" + k.fin.toFixed(1) + " s)" : "")).join(" · ");
        if (J.n === 1) {
          const pos = ps.indexOf(humanos[0]) + 1;
          J.despues(1200, () => J.terminar({ bien: pos === 1, icono: pos === 1 ? "🏆" : pos <= 3 ? "🥉" : "🏁", titulo: pos === 1 ? "¡Has ganado la carrera!" : "Llegas " + pos + "º", texto }));
        } else if (primero.slot >= 0) J.despues(1200, () => J.terminar({ ganador: primero.slot, texto }));
        else J.despues(1200, () => J.terminar({ icono: "🏁", titulo: "Gana " + primero.nombre, texto }));
      }
    },
    dibujar(g) {
      if (!capa) pintarCapa();
      g.drawImage(capa, 0, 0, 1920, 1080);
      // cajas de objetos
      cajas.forEach((c) => {
        if (c.vuelve > 0) return;
        g.save(); g.translate(c.x, c.y); g.rotate(J.tiempo * 1.5);
        const hue = (J.tiempo * 80 + c.x) % 360;
        D.caja(g, -12, -12, 24, 24, { relleno: "hsla(" + hue + ",80%,60%,.9)", r: 5, borde: "#fff", grosor: 2 });
        g.rotate(-J.tiempo * 1.5); D.texto(g, "?", 0, 1, { tam: 18, alin: "center", peso: 700, sombra: false });
        g.restore();
      });
      manchas.forEach((m) => { g.fillStyle = "rgba(20,15,30,.85)"; g.beginPath(); g.ellipse(m.x, m.y, 24, 17, 0.4, 0, 7); g.fill(); g.fillStyle = "rgba(140,120,255,.35)"; g.beginPath(); g.ellipse(m.x - 5, m.y - 4, 9, 5, 0.4, 0, 7); g.fill(); });
      chispas.forEach((c) => { g.globalAlpha = Math.min(1, c.t * 3); g.fillStyle = c.c; g.fillRect(c.x - 2.5, c.y - 2.5, 5, 5); g.globalAlpha = 1; });
      misiles.forEach((m) => { g.save(); g.translate(m.x, m.y); g.rotate(m.a); g.fillStyle = "#ef5b5b"; D.ruta(g, -12, -5, 24, 10, 5); g.fill(); g.fillStyle = "#ffd98a"; g.beginPath(); g.moveTo(-12, -4); g.lineTo(-22, 0); g.lineTo(-12, 4); g.fill(); g.restore(); });
      karts.slice().sort((a, b) => a.y - b.y).forEach((k) => dibujarKart(g, k));
      // marcador superior
      g.fillStyle = "rgba(10,8,14,.82)"; g.fillRect(0, 0, 1920, 108);
      const ps = posiciones();
      ps.forEach((k, n) => {
        const x = 20 + n * 272;
        D.caja(g, x, 12, 258, 84, { relleno: k.humano ? D.alfa(k.color, 0.22) : "rgba(255,255,255,.05)", borde: k.humano ? k.color : "rgba(255,255,255,.1)", r: 14 });
        D.texto(g, n + 1 + "º", x + 14, 54, { tam: 34, titulo: true, color: n === 0 ? "#ffd98a" : "#f6efe2" });
        D.ficha(g, x + 82, 40, 11, k.color, { anillo: false });
        D.texto(g, k.nombre, x + 100, 40, { tam: 22, peso: 700, max: 120 });
        D.texto(g, k.fin != null ? "¡Meta!" : "Vuelta " + Math.max(1, Math.min(VUELTAS, k.vuelta + 1)) + "/" + VUELTAS, x + 82, 74, { tam: 18, color: "#a79db3", peso: 400 });
        if (k.humano) { D.caja(g, x + 200, 24, 46, 46, { relleno: "rgba(0,0,0,.4)", r: 10, borde: "rgba(255,255,255,.25)" }); if (k.objeto) D.texto(g, OBJ[k.objeto], x + 223, 49, { tam: 28, alin: "center" }); }
      });
      if (cuenta > 0) {
        const n = Math.ceil(cuenta);
        D.caja(g, 810, 420, 300, 120, { relleno: "rgba(10,8,14,.85)", r: 30 });
        [3, 2, 1].forEach((v, q) => D.ficha(g, 870 + q * 90, 480, 30, n <= v - 0 && cuenta > 0 ? (n === 0 ? "#3fbf6f" : "#ef5b5b") : "#3a3346", { anillo: false }));
        D.texto(g, n > 3 ? C.nombre : n, 960, 360, { tam: 90, alin: "center", titulo: true });
      } else if (t < 1) D.texto(g, "¡YA!", 960, 480, { tam: 140, alin: "center", titulo: true, color: "#5fd38d" });
      D.ayuda(g, "◀ ▶ girar · ▼ frenar · OK usar objeto · mantén el giro para derrapar y ganar turbo");
    }
  };
});
