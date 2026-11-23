Salon.juego("bolos", function (J) {
  const D = Salon.dib, F = Salon.fisica;
  // Pista vista desde arriba: se lanza desde abajo hacia los bolos de arriba.
  const PX1 = 760, PX2 = 1060, CX = (PX1 + PX2) / 2, LINEA = 960, RB = 26, RP = 14, VMAX = 1700;
  const SPOTS = [[0, 0], [-1, -1], [1, -1], [-2, -2], [0, -2], [2, -2], [-3, -3], [-1, -3], [1, -3], [3, -3]].map(([c, f]) => [CX + c * 25, 300 + f * 44]);
  const tiradas = J.jugadores.map(() => []); // bolos derribados en cada tirada
  let turno = 0, frame = 0, tiradaFrame = 0, fase = "colocar", pos = 0, pensando = false, fin = false, msg = "", animCpu = null;
  let mundo, bola, bolosObj = [], enPie = [], tiempo = 0;
  const P = Salon.punteria(J, { angulo: -Math.PI / 2, fuerza: 0.85, min: -Math.PI / 2 - 0.22, max: -Math.PI / 2 + 0.22, paso: 0.006 });

  function montarBolos(soloEnPie) {
    mundo = F.mundo({ decel: 40, amort: 0.1, rebote: 0.4, reboteBolas: 0.6 });
    F.seg(mundo, PX1 - 70, 40, PX2 + 70, 40); // fondo
    bolosObj = [];
    SPOTS.forEach(([x, y], k) => {
      if (soloEnPie && !enPie[k]) { bolosObj.push(null); return; }
      bolosObj.push(F.bola(mundo, x, y, RP, { k, masa: 1, decel: 420 }));
    });
  }
  function nuevaTirada() {
    fase = "colocar"; pos = 0;
    P.angulo = -Math.PI / 2;
    tiempo = 0;
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(500, () => { pensando = false; const t = tiroMaquina(); animCpu = { t: 0, ...t, desde: [pos, P.angulo] }; }); }
  }
  function empezarFrame() { enPie = Array(10).fill(true); montarBolos(false); tiradaFrame = 0; nuevaTirada(); }
  function tirar() {
    bola = F.bola(mundo, CX + pos, LINEA - 30, RB, { masa: 40, decel: 30 });
    bola.vx = Math.cos(P.angulo) * P.fuerza * VMAX; bola.vy = Math.sin(P.angulo) * P.fuerza * VMAX;
    fase = "rodando"; tiempo = 0; msg = ""; J.sonido("golpe");
  }
  function derribado(b) { return !b || !b.dentro || Math.hypot(b.x - SPOTS[b.k][0], b.y - SPOTS[b.k][1]) > 9 || b.x < PX1 || b.x > PX2; }
  function trasTirada() {
    const antes = enPie.filter(Boolean).length;
    bolosObj.forEach((b, k) => { if (b && derribado(b)) enPie[k] = false; });
    const ahora = enPie.filter(Boolean).length, tumbados = antes - ahora;
    tiradas[turno].push(tumbados);
    const decimo = frame === 9;
    if (tiradaFrame === 0 && ahora === 0) { msg = "¡Pleno!"; J.sonido("ganar"); J.efecto("texto", CX, 420, { texto: "¡PLENO!", tam: 90, color: "#ffd98a" }); J.efecto("chispas", CX, 230, { n: 40 }); J.efecto("destello", 0, 0, { color: "#ffd98a" }); }
    else if (tiradaFrame === 1 && ahora === 0 && antes < 10) { msg = "¡Semipleno!"; J.sonido("gol"); J.efecto("texto", CX, 420, { texto: "¡SEMIPLENO!", tam: 70, color: "#7fd6ff" }); }
    else msg = tumbados ? tumbados + (tumbados === 1 ? " bolo" : " bolos") : "Ninguno";
    tiradaFrame++;
    let acabaFrame;
    if (!decimo) acabaFrame = ahora === 0 || tiradaFrame === 2;
    else {
      const t = tiradas[turno].slice(-tiradaFrame);
      const suma2 = (t[0] || 0) + (t[1] || 0);
      acabaFrame = tiradaFrame === 3 || (tiradaFrame === 2 && t[0] < 10 && suma2 < 10);
    }
    if (!acabaFrame) {
      if (ahora === 0) { enPie = Array(10).fill(true); montarBolos(false); } else montarBolos(true);
      return J.despues(900, nuevaTirada);
    }
    // siguiente jugador / frame
    turno++;
    if (turno >= J.n) { turno = 0; frame++; }
    if (frame >= 10) return J.despues(1000, terminar);
    J.despues(1100, empezarFrame);
  }
  // Puntuación estándar de bolos
  function puntos(ts) {
    const out = []; let i = 0, total = 0;
    for (let f = 0; f < 10 && i < ts.length; f++) {
      if (ts[i] === 10) { if (ts[i + 2] === undefined) break; total += 10 + ts[i + 1] + ts[i + 2]; out.push(total); i += 1; }
      else if (ts[i + 1] === undefined) break;
      else if (ts[i] + ts[i + 1] === 10) { if (ts[i + 2] === undefined) break; total += 10 + ts[i + 2]; out.push(total); i += 2; }
      else { total += ts[i] + ts[i + 1]; out.push(total); i += 2; }
    }
    return out;
  }
  function marcas(ts) {
    // texto de cada casilla de tirada por frame
    const fr = []; let i = 0;
    for (let f = 0; f < 10 && i < ts.length; f++) {
      if (f < 9) {
        if (ts[i] === 10) { fr.push(["", "X"]); i++; }
        else { const a = ts[i], b = ts[i + 1]; fr.push([a === 0 ? "-" : String(a), b === undefined ? "" : a + b === 10 ? "/" : b === 0 ? "-" : String(b)]); i += 2; }
      } else {
        const r = ts.slice(i); const c = [];
        r.forEach((v, k) => { if (v === 10 && (k === 0 || c[k - 1] === "X" || c[k - 1] === "/")) c.push("X"); else if (k > 0 && c[k - 1] !== "X" && c[k - 1] !== "/" && r[k - 1] + v === 10) c.push("/"); else c.push(v === 0 ? "-" : String(v)); });
        fr.push(c); i = ts.length;
      }
    }
    return fr;
  }
  const totalDe = (j) => { const p = puntos(tiradas[j]); return p.length ? p[p.length - 1] : 0; };
  function terminar() {
    fin = true;
    const tot = J.jugadores.map((_, j) => totalDe(j));
    if (J.n === 1) { const r = J.record(tot[0], true); return J.terminar({ puntos: tot[0], bien: r.nuevo, titulo: tot[0] + " puntos", texto: r.nuevo ? "¡Nuevo récord!" : "Récord: " + r.mejor }); }
    const max = Math.max(...tot), gan = tot.map((t, j) => (t === max ? j : -1)).filter((j) => j >= 0);
    J.terminar({ ganador: gan.length === 1 ? gan[0] : null, texto: J.jugadores.map((p, j) => p.nombre + " " + tot[j]).join(" · ") });
  }
  function tiroMaquina() {
    // apunta al hueco entre el 1 y el 3 (o al grupo de bolos en pie)
    const vivos = SPOTS.filter((_, k) => enPie[k]);
    const objetivoX = vivos.length === 10 ? CX + 13 : vivos.reduce((s, p) => s + p[0], 0) / vivos.length;
    const objetivoY = vivos.length === 10 ? SPOTS[0][1] : vivos.reduce((s, p) => s + p[1], 0) / vivos.length;
    const ps = Math.max(-110, Math.min(110, (objetivoX - CX) * 0.6 + J.azar(-40, 40)));
    let ang = Math.atan2(objetivoY - (LINEA - 30), objetivoX - (CX + ps));
    const ruido = [0, 0.05, 0.022, 0.008][J.dificultad];
    ang += (Math.random() - 0.5) * 2 * ruido;
    return { pos: ps, ang: Math.max(P.min, Math.min(P.max, ang)), f: J.azar(0.8, 1) };
  }
  empezarFrame();

  function bolo(g, b, k) {
    const x = b ? b.x : SPOTS[k][0], y = b ? b.y : SPOTS[k][1];
    const caido = b && derribado(b) && fase !== "colocar";
    g.save(); g.globalAlpha = caido ? 0.55 : 1;
    D.ficha(g, x, y, RP, "#f6f2ea", { anillo: false });
    g.strokeStyle = "#d8343f"; g.lineWidth = 3; g.beginPath(); g.arc(x, y, RP * 0.6, 0, 7); g.stroke();
    g.restore();
  }

  return {
    tecla(j, a) {
      if (fin || pensando || animCpu) return;
      if (fase === "colocar") {
        if (a === "izquierda" || a === "derecha") { pos = Math.max(-115, Math.min(115, pos + (a === "derecha" ? 10 : -10))); J.sonido("clic"); }
        else if (a === "ok") { fase = "apuntar"; J.sonido("clic"); }
        return;
      }
      if (fase === "apuntar" && P.tecla(a)) tirar();
    },
    apuntar(j, a) {
      if (fin || pensando || animCpu || fase === "rodando") return;
      if (fase === "colocar") fase = "apuntar";
      if (P.apuntar(a)) tirar();
    },
    actualizar(dt) {
      if (fase === "apuntar" && !J.jugadores[turno].cpu) P.actualizar(dt, turno);
      if (animCpu) {
        animCpu.t += dt;
        const e = Math.min(1, animCpu.t / 0.7);
        pos = animCpu.desde[0] + (animCpu.pos - animCpu.desde[0]) * e;
        P.angulo = animCpu.desde[1] + (animCpu.ang - animCpu.desde[1]) * e; P.fuerza = animCpu.f;
        fase = animCpu.t > 0.7 ? "apuntar" : "colocar";
        if (animCpu.t > 1.2) { animCpu = null; tirar(); }
      }
      if (fase === "rodando") {
        tiempo += dt;
        F.paso(mundo, dt, { choque(a, b, v) { if (v > 80) J.sonido("tic"); } });
        // canal: si la bola se sale de la pista, sigue recta por el canal sin tocar bolos
        if (bola.dentro && (bola.x < PX1 + RB * 0.3 || bola.x > PX2 - RB * 0.3) && !bola.canal) { bola.canal = true; bola.fantasma = true; bola.vx = 0; bola.x = bola.x < CX ? PX1 - 32 : PX2 + 32; J.sonido("caida"); }
        if (bola.y < 60) bola.dentro = false;
        if ((F.quieto(mundo) && tiempo > 0.5) || tiempo > 6) { fase = "contando"; J.despues(500, trasTirada); }
      }
    },
    dibujar(g) {
      D.fondo(g, "#1d1626", "#09060d");
      // pista
      g.fillStyle = "#2a2230"; g.fillRect(PX1 - 70, 30, PX2 - PX1 + 140, 1040);
      g.fillStyle = "#3b3242"; g.fillRect(PX1 - 60, 30, 50, 1040); g.fillRect(PX2 + 10, 30, 50, 1040);
      const gr = g.createLinearGradient(PX1, 0, PX2, 0); gr.addColorStop(0, "#d6a768"); gr.addColorStop(0.5, "#ecc78f"); gr.addColorStop(1, "#d6a768");
      g.fillStyle = gr; g.fillRect(PX1, 30, PX2 - PX1, 1040);
      for (let x = PX1 + 30; x < PX2; x += 30) { g.strokeStyle = "rgba(120,70,20,.15)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 1070); g.stroke(); }
      for (let k = -3; k <= 3; k++) { g.fillStyle = "#7a4a1f"; g.beginPath(); g.moveTo(CX + k * 30, 640 + Math.abs(k) * 22); g.lineTo(CX + k * 30 - 8, 660 + Math.abs(k) * 22); g.lineTo(CX + k * 30 + 8, 660 + Math.abs(k) * 22); g.fill(); }
      g.strokeStyle = "#7a1f1f"; g.lineWidth = 4; g.beginPath(); g.moveTo(PX1, LINEA); g.lineTo(PX2, LINEA); g.stroke();
      bolosObj.forEach((b, k) => { if (b && b.dentro) bolo(g, b, k); });
      const preparando = (fase === "colocar" || fase === "apuntar") && !fin;
      const bx = preparando ? CX + pos : bola ? bola.x : CX, by = preparando ? LINEA - 30 : bola ? bola.y : LINEA - 30;
      if (preparando || (bola && bola.dentro)) {
        if (preparando && (fase === "apuntar")) {
          g.save(); g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 3; g.setLineDash([10, 10]);
          g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(P.angulo) * 520, by + Math.sin(P.angulo) * 520); g.stroke(); g.restore();
        }
        D.ficha(g, bx, by, RB, J.jugadores[turno].color, { anillo: false });
        g.fillStyle = "rgba(0,0,0,.6)"; [[-6, -8], [6, -8], [0, 4]].forEach(([a, b]) => { g.beginPath(); g.arc(bx + a, by + b, 3.5, 0, 7); g.fill(); });
      }
      // marcadores
      const x0 = 1150;
      D.titulo(g, "Bolos", 60, 90);
      D.texto(g, "Turno " + Math.min(10, frame + 1) + " de 10", 60, 150, { tam: 30, color: "#a79db3" });
      D.texto(g, pensando ? J.jugadores[turno].nombre + " se prepara…" : msg, 60, 220, { tam: 40, color: "#ffd98a", peso: 700, max: 640 });
      if (!J.jugadores[turno].cpu && !fin) {
        D.texto(g, fase === "colocar" ? "◀ ▶ colócate · OK para apuntar" : fase === "apuntar" ? "◀ ▶ apuntar · ▲ ▼ fuerza · OK lanzar" : "", 60, 300, { tam: 26, color: "#f6efe2", peso: 400 });
        if (fase === "apuntar") D.barraFuerza(g, 60, 340, 420, 44, P.fuerza);
      }
      J.jugadores.forEach((p, j) => {
        const y = 80 + j * 230;
        D.caja(g, x0, y, 720, 200, { relleno: j === turno && !fin ? "rgba(255,217,138,.12)" : "rgba(255,255,255,.05)", borde: j === turno && !fin ? "#e8b85c" : "rgba(255,255,255,.1)", r: 16 });
        D.ficha(g, x0 + 34, y + 36, 16, p.color, { anillo: false });
        D.texto(g, p.nombre, x0 + 62, y + 36, { tam: 28, peso: 700, max: 420 });
        D.texto(g, totalDe(j), x0 + 700, y + 38, { tam: 44, alin: "right", titulo: true });
        const ms = marcas(tiradas[j]), ps = puntos(tiradas[j]);
        for (let f = 0; f < 10; f++) {
          const cx = x0 + 14 + f * 69.5, cy = y + 76;
          D.caja(g, cx, cy, 64, 108, { relleno: "rgba(0,0,0,.25)", r: 8 });
          const m = ms[f] || [];
          m.forEach((t, k) => D.texto(g, t, cx + (m.length === 3 ? 12 + k * 20 : k === 0 ? 18 : 46), cy + 24, { tam: 22, alin: "center", color: t === "X" || t === "/" ? "#ffd98a" : "#f6efe2" }));
          if (ps[f] != null) D.texto(g, ps[f], cx + 32, cy + 74, { tam: 26, alin: "center", peso: 700 });
        }
      });
    }
  };
});
