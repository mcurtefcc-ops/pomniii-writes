Salon.juego("minigolf", function (J) {
  const D = Salon.dib, F = Salon.fisica;
  const R = 13, VMAX = 1500, MAX_GOLPES = 8;
  const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  const rombo = (x, y, r) => [[x, y - r], [x + r, y], [x, y + r], [x - r, y]];
  const octo = (x, y, r) => Array.from({ length: 8 }, (_, k) => [x + Math.cos((k * Math.PI) / 4) * r, y + Math.sin((k * Math.PI) / 4) * r]);
  // Cada hoyo: borde (polígono), obstáculos (polígonos), muros sueltos (segmentos), salida, hoyo y par
  const HOYOS = [
    { borde: rect(250, 430, 1350, 670), salida: [350, 550], hoyo: [1250, 550], par: 2 },
    { borde: [[200, 250], [1350, 250], [1350, 900], [1050, 900], [1050, 520], [200, 520]], salida: [320, 385], hoyo: [1200, 790], par: 3 },
    { borde: rect(200, 280, 1400, 820), obst: [rect(680, 400, 920, 700)], salida: [300, 550], hoyo: [1300, 550], par: 3 },
    { borde: rect(200, 200, 1400, 900), muros: [[560, 200, 560, 690], [1000, 410, 1000, 900]], salida: [330, 320], hoyo: [1260, 790], par: 4 },
    { borde: rect(200, 300, 1400, 800), muros: [[800, 300, 800, 495], [800, 605, 800, 800]], salida: [300, 550], hoyo: [1300, 550], par: 2 },
    { borde: rect(200, 200, 1400, 900), obst: [rect(200, 480, 1100, 620)], salida: [320, 340], hoyo: [320, 770], par: 3 },
    { borde: rect(200, 250, 1400, 850), obst: [rombo(560, 420, 90), rombo(800, 680, 90), rombo(1040, 420, 90)], salida: [280, 550], hoyo: [1320, 550], par: 3 },
    { borde: rect(200, 200, 1400, 900), muros: [[200, 560, 1050, 560]], obst: [rombo(800, 380, 70)], salida: [320, 780], hoyo: [330, 320], par: 3 },
    { borde: rect(200, 200, 1400, 900), obst: [octo(700, 650, 80), octo(950, 380, 70), octo(1200, 700, 75), octo(500, 380, 60)], salida: [290, 820], hoyo: [1060, 560], par: 3 }
  ];
  let h = 0, turno = 0, fase = "apuntar", pensando = false, fin = false, msg = "", animCpu = null, entrando = null;
  const golpes = J.jugadores.map(() => Array(HOYOS.length).fill(null)); // golpes por hoyo
  let enHoyo = [], bolas = [], golpesHoyo = [];
  let mundo;
  const P = Salon.punteria(J, { angulo: 0, fuerza: 0.5 });

  function montarHoyo() {
    const H = HOYOS[h];
    mundo = F.mundo({ decel: 230, amort: 0.55, rebote: 0.72 });
    const poli = (pts) => pts.forEach((p, k) => { const q = pts[(k + 1) % pts.length]; F.seg(mundo, p[0], p[1], q[0], q[1]); });
    poli(H.borde);
    (H.obst || []).forEach(poli);
    (H.muros || []).forEach(([a, b, c, d]) => F.seg(mundo, a, b, c, d));
    mundo.agujeros = [{ x: H.hoyo[0], y: H.hoyo[1], r: 17, velMax: 560 }];
    bolas = J.jugadores.map(() => ({ x: H.salida[0], y: H.salida[1] }));
    enHoyo = J.jugadores.map(() => false);
    golpesHoyo = J.jugadores.map(() => 0);
    turno = 0;
    msg = "Hoyo " + (h + 1) + " · par " + H.par;
    empezar();
  }
  function quedan() { return J.jugadores.map((_, i) => i).filter((i) => !enHoyo[i]); }
  function empezar() {
    fase = "apuntar";
    const H = HOYOS[h];
    P.angulo = Math.atan2(H.hoyo[1] - bolas[turno].y, H.hoyo[0] - bolas[turno].x);
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(450, () => { const t = tiroMaquina(); pensando = false; animCpu = { t: 0, desde: P.angulo, ...t }; }); }
  }
  let bola = null;
  function tirar(ang, f) {
    mundo.bolas = [];
    bola = F.bola(mundo, bolas[turno].x, bolas[turno].y, R);
    bola.vx = Math.cos(ang) * f * VMAX; bola.vy = Math.sin(ang) * f * VMAX;
    golpesHoyo[turno]++;
    fase = "moviendo"; msg = ""; J.sonido("golpe");
  }
  function trasTiro(dentro) {
    const nom = J.jugadores[turno].nombre;
    if (dentro) {
      enHoyo[turno] = true;
      golpes[turno][h] = golpesHoyo[turno];
      const d = golpesHoyo[turno] - HOYOS[h].par;
      msg = golpesHoyo[turno] === 1 ? "¡Hoyo en uno de " + nom + "!" : d <= -2 ? "¡Eagle de " + nom + "!" : d === -1 ? "Birdie de " + nom : d === 0 ? nom + " hace el par" : nom + ": " + golpesHoyo[turno] + " golpes";
      J.sonido(d < 0 ? "ganar" : "punto");
    } else {
      bolas[turno] = { x: bola.x, y: bola.y };
      if (golpesHoyo[turno] >= MAX_GOLPES) { enHoyo[turno] = true; golpes[turno][h] = MAX_GOLPES; msg = nom + " llega al máximo de " + MAX_GOLPES + " golpes"; }
    }
    const resto = quedan();
    if (!resto.length) {
      if (h === HOYOS.length - 1) return terminar();
      h++;
      return J.despues(1500, montarHoyo);
    }
    // juega quien esté más lejos del hoyo (como en el golf)
    const H = HOYOS[h];
    turno = resto.sort((a, b) => Math.hypot(bolas[b].x - H.hoyo[0], bolas[b].y - H.hoyo[1]) - Math.hypot(bolas[a].x - H.hoyo[0], bolas[a].y - H.hoyo[1]))[0];
    J.despues(600, empezar);
  }
  function total(i) { return golpes[i].reduce((s, x) => s + (x || 0), 0); }
  function terminar() {
    fin = true;
    const tot = J.jugadores.map((_, i) => total(i));
    const min = Math.min(...tot), gan = tot.map((t, i) => (t === min ? i : -1)).filter((i) => i >= 0);
    const par = HOYOS.reduce((s, x) => s + x.par, 0);
    if (J.n === 1) {
      const r = J.record(tot[0], false);
      return J.despues(1200, () => J.terminar({ puntos: tot[0], bien: tot[0] <= par, titulo: tot[0] + " golpes", texto: "Par del campo: " + par + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor) }));
    }
    J.despues(1200, () => J.terminar({ ganador: gan.length === 1 ? gan[0] : null, texto: J.jugadores.map((j, i) => j.nombre + " " + tot[i]).join(" · ") + " (par " + par + ")" }));
  }
  function simular(ang, f) {
    const m = Object.assign({}, mundo, { bolas: [] });
    const b = F.bola(m, bolas[turno].x, bolas[turno].y, R);
    b.vx = Math.cos(ang) * f * VMAX; b.vy = Math.sin(ang) * f * VMAX;
    let t = 0, dentro = false;
    while (t < 8) { F.paso(m, 1 / 30, { cae() { dentro = true; } }); t += 1 / 30; if (dentro || F.quieto(m)) break; }
    return { dentro, x: b.x, y: b.y };
  }
  function tiroMaquina() {
    const H = HOYOS[h], b = bolas[turno];
    const directo = Math.atan2(H.hoyo[1] - b.y, H.hoyo[0] - b.x);
    let mejor = { nota: Infinity, ang: directo, f: 0.5 };
    const angs = [];
    for (let k = 0; k < 48; k++) angs.push((k / 48) * Math.PI * 2);
    for (let k = -6; k <= 6; k++) angs.push(directo + k * 0.02);
    const fuerzas = [0.2, 0.32, 0.45, 0.6, 0.78, 0.95];
    for (const a of angs) for (const f of fuerzas) {
      const s = simular(a, f);
      const nota = s.dentro ? -1000 + f * 10 : Math.hypot(s.x - H.hoyo[0], s.y - H.hoyo[1]);
      if (nota < mejor.nota) mejor = { nota, ang: a, f };
    }
    const ruido = [0, 0.09, 0.035, 0.012][J.dificultad], ruidoF = [0, 0.12, 0.05, 0.02][J.dificultad];
    return { ang: mejor.ang + (Math.random() - 0.5) * 2 * ruido, f: Math.max(0.08, Math.min(1, mejor.f * (1 + (Math.random() - 0.5) * 2 * ruidoF))) };
  }
  montarHoyo();

  function dibujarPoli(g, pts, relleno, borde) {
    g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    if (relleno) { g.fillStyle = relleno; g.fill(); }
    if (borde) { g.strokeStyle = borde; g.lineWidth = 14; g.lineJoin = "round"; g.stroke(); }
  }

  return {
    tecla(j, a) { if (fase === "apuntar" && !pensando && !animCpu && !fin && P.tecla(a)) tirar(P.angulo, P.fuerza); },
    apuntar(j, a) { if (fase === "apuntar" && !pensando && !animCpu && !fin && P.apuntar(a)) tirar(P.angulo, P.fuerza); },
    actualizar(dt) {
      if (fase === "apuntar" && !J.jugadores[turno].cpu) P.actualizar(dt, turno);
      if (animCpu) {
        animCpu.t += dt * 1.5;
        let d = animCpu.ang - animCpu.desde; d = Math.atan2(Math.sin(d), Math.cos(d));
        P.angulo = animCpu.desde + d * Math.min(1, animCpu.t); P.fuerza = animCpu.f;
        if (animCpu.t > 1.4) { const c = animCpu; animCpu = null; tirar(c.ang, c.f); }
      }
      if (fase === "moviendo") {
        let dentro = false;
        F.paso(mundo, dt, { cae() { dentro = true; }, pared(b, s, v) { if (v > 120) J.sonido("tic"); } });
        if (dentro) { fase = "fin"; entrando = { t: 0 }; J.sonido("caida"); J.efecto("chispas", HOYOS[h].hoyo[0], HOYOS[h].hoyo[1], { color: J.jugadores[turno].color }); if (golpesHoyo[turno] === 1) J.efecto("texto", HOYOS[h].hoyo[0], HOYOS[h].hoyo[1] - 60, { texto: "¡Hoyo en uno!", color: "#ffd98a" }); J.despues(700, () => { entrando = null; trasTiro(true); }); }
        else if (F.quieto(mundo)) { fase = "fin"; J.despues(300, () => trasTiro(false)); }
      }
    },
    dibujar(g) {
      D.fondo(g, "#18301f", "#07120a");
      const H = HOYOS[h];
      dibujarPoli(g, H.borde, "#3fae5a", "#7a4a26");
      // franjas de césped
      g.save(); dibujarPoli(g, H.borde); g.clip();
      for (let x = 0; x < 1600; x += 80) { g.fillStyle = "rgba(255,255,255,.04)"; g.fillRect(x, 0, 40, 1080); }
      g.restore();
      (H.obst || []).forEach((o) => dibujarPoli(g, o, "#8a5a33", "#6a3f1f"));
      (H.muros || []).forEach(([a, b, c, d]) => { g.strokeStyle = "#6a3f1f"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
      // salida
      g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(H.salida[0] - 22, H.salida[1] - 22, 44, 44);
      // hoyo y bandera
      g.fillStyle = "#0b1a0f"; g.beginPath(); g.arc(H.hoyo[0], H.hoyo[1], 19, 0, 7); g.fill();
      g.strokeStyle = "#e9e2d0"; g.lineWidth = 4; g.beginPath(); g.moveTo(H.hoyo[0], H.hoyo[1]); g.lineTo(H.hoyo[0], H.hoyo[1] - 90); g.stroke();
      g.fillStyle = "#ef5b5b"; g.beginPath(); g.moveTo(H.hoyo[0], H.hoyo[1] - 90); g.lineTo(H.hoyo[0] + 50, H.hoyo[1] - 75); g.lineTo(H.hoyo[0], H.hoyo[1] - 60); g.fill();
      // bolas
      J.jugadores.forEach((p, i) => {
        if (enHoyo[i] || (fase !== "apuntar" && i === turno)) return;
        g.globalAlpha = i === turno ? 1 : 0.6; D.ficha(g, bolas[i].x, bolas[i].y, R, p.color, { anillo: false }); g.globalAlpha = 1;
      });
      if (fase !== "apuntar" && bola && bola.dentro && !entrando) D.ficha(g, bola.x, bola.y, R, J.jugadores[turno].color, { anillo: false });
      // guía
      if (fase === "apuntar" && !fin && (!J.jugadores[turno].cpu || animCpu)) {
        const b = bolas[turno], l = 60 + P.fuerza * 260;
        g.save(); g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 4; g.setLineDash([10, 8]);
        g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x + Math.cos(P.angulo) * l, b.y + Math.sin(P.angulo) * l); g.stroke(); g.restore();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(b.x + Math.cos(P.angulo) * l, b.y + Math.sin(P.angulo) * l, 7, 0, 7); g.fill();
      }
      // tarjeta de puntos
      const px = 1500;
      D.titulo(g, "Hoyo " + (h + 1) + "/9", px, 70, { tam: 48 });
      D.texto(g, "Par " + H.par, px + 330, 72, { tam: 30, color: "#a79db3" });
      J.jugadores.forEach((p, i) => {
        const y = 130 + i * 100;
        D.caja(g, px, y, 400, 86, { relleno: i === turno && !fin ? "rgba(255,217,138,.14)" : "rgba(255,255,255,.05)", borde: i === turno && !fin ? "#e8b85c" : "rgba(255,255,255,.1)", r: 14 });
        D.ficha(g, px + 36, y + 43, 18, p.color, { anillo: false });
        D.texto(g, p.nombre, px + 66, y + 30, { tam: 26, peso: 700, max: 220 });
        D.texto(g, "Este hoyo: " + golpesHoyo[i] + (enHoyo[i] ? " ✓" : ""), px + 66, y + 62, { tam: 20, color: "#a79db3", peso: 400 });
        D.texto(g, total(i), px + 380, y + 45, { tam: 40, alin: "right", titulo: true });
      });
      const y = 150 + J.n * 100;
      D.texto(g, pensando ? J.jugadores[turno].nombre + " estudia el tiro…" : msg, px, y, { tam: 24, color: "#ffd98a", max: 400 });
      if (fase === "apuntar" && !J.jugadores[turno].cpu && !fin) {
        D.barraFuerza(g, px, y + 40, 400, 40, P.fuerza);
        D.texto(g, "◀ ▶ apuntar · ▲ ▼ fuerza", px, y + 120, { tam: 22, color: "#a79db3", peso: 400 });
        D.texto(g, "OK golpear", px, y + 152, { tam: 22, color: "#a79db3", peso: 400 });
      }
    }
  };
});
