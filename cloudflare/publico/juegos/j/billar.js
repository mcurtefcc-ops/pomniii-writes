Salon.juego("billar", function (J) {
  const D = Salon.dib, F = Salon.fisica;
  const X1 = 230, Y1 = 230, X2 = 1690, Y2 = 960, CY = (Y1 + Y2) / 2, R = 17, VMAX = 2600;
  const COL = { 1: "#f2c230", 2: "#2f6fd6", 3: "#e0393e", 4: "#7b3fb3", 5: "#f07b22", 6: "#2e9b52", 7: "#8b2a2a", 8: "#151515" };
  const tipo = (n) => (n === 8 ? "negra" : n < 8 ? "lisas" : "rayadas");

  function nuevoMundo() {
    const m = F.mundo({ decel: 140, amort: 0.35, rebote: 0.8, reboteBolas: 0.96 });
    F.rect(m, X1, Y1, X2, Y2);
    m.agujeros = [[X1, Y1, 40], [X2, Y1, 40], [X1, Y2, 40], [X2, Y2, 40], [(X1 + X2) / 2, Y1 - 6, 34], [(X1 + X2) / 2, Y2 + 6, 34]].map(([x, y, r]) => ({ x, y, r }));
    return m;
  }
  const mundo = nuevoMundo();
  const blanca = F.bola(mundo, 520, CY, R, { n: 0 });
  (function triangulo() {
    const orden = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
    // las esquinas de atrás: una lisa y una rayada; la 8 en el centro
    const resto = orden.filter((n) => n !== 8 && n !== 1);
    Salon.cartas.barajar(resto);
    const lista = [];
    let k = 0;
    for (let fila = 0; fila < 5; fila++) for (let i = 0; i <= fila; i++) {
      let n;
      if (fila === 0) n = 1; else if (fila === 2 && i === 1) n = 8; else n = resto[k++];
      lista.push([fila, i, n]);
    }
    lista.forEach(([fila, i, n]) => F.bola(mundo, 1240 + fila * (2 * R * 0.87 + 1), CY + (i - fila / 2) * (2 * R + 1), R, { n }));
  })();

  const grupo = [null, null];
  let turno = 0, fase = "apuntar", primerToque = null, metidas = [], msg = "Saque: rompe el triángulo", pensando = false, fin = false;
  const P = Salon.punteria(J, { angulo: 0, fuerza: 0.8 });
  const quedan = (g) => mundo.bolas.filter((b) => b.dentro && b.n && tipo(b.n) === g).length;
  const objetivo = (j) => (grupo[j] ? (quedan(grupo[j]) ? grupo[j] : "negra") : "abierta");

  function tirar(ang, f) {
    blanca.vx = Math.cos(ang) * f * VMAX; blanca.vy = Math.sin(ang) * f * VMAX;
    primerToque = null; metidas = []; fase = "moviendo"; msg = "";
    J.sonido("golpe");
  }
  const eventos = {
    choque(a, b, v) { if (primerToque === null && (a === blanca || b === blanca)) primerToque = (a === blanca ? b : a).n; if (v > 200) J.sonido("tic"); },
    cae(b) { metidas.push(b.n); J.sonido("caida"); }
  };
  function evaluar(j, primer, mets, estadoGrupo) {
    // devuelve {falta, gana, pierde, sigue, asigna}
    const obj = estadoGrupo[j] ? (mundo.bolas.filter((b) => b.dentro && b.n && tipo(b.n) === estadoGrupo[j]).length + mets.filter((n) => n && tipo(n) === estadoGrupo[j]).length ? estadoGrupo[j] : "negra") : "abierta";
    let falta = mets.includes(0) || primer === null;
    if (!falta && primer != null) {
      if (obj === "abierta") falta = primer === 8;
      else if (obj === "negra") falta = primer !== 8;
      else falta = tipo(primer) !== obj;
    }
    const r = { falta, gana: false, pierde: false, sigue: false, asigna: null };
    if (mets.includes(8)) { if (obj === "negra" && !falta) r.gana = true; else r.pierde = true; return r; }
    if (falta) return r;
    const propias = mets.filter((n) => n && n !== 8);
    if (obj === "abierta") { if (propias.length) { r.asigna = tipo(propias[0]); r.sigue = true; } }
    else r.sigue = propias.some((n) => tipo(n) === obj);
    return r;
  }
  function trasTiro() {
    const r = evaluar(turno, primerToque, metidas, grupo);
    const nom = J.jugadores[turno].nombre;
    if (r.gana) { fin = true; msg = nom + " mete la negra"; return J.despues(900, () => J.terminar({ ganador: turno, texto: "Metió la bola 8." })); }
    if (r.pierde) { fin = true; msg = "La negra antes de tiempo"; return J.despues(900, () => J.terminar({ ganador: 1 - turno, texto: nom + " metió la 8 cuando no tocaba." })); }
    if (r.asigna) { grupo[turno] = r.asigna; grupo[1 - turno] = r.asigna === "lisas" ? "rayadas" : "lisas"; J.aviso(nom + " juega con " + r.asigna); }
    if (r.falta) {
      msg = "Falta de " + nom + (metidas.includes(0) ? ": metió la blanca" : primerToque === null ? ": no tocó ninguna bola" : ": tocó primero una bola que no era suya");
      J.sonido("error");
      colocarBlanca();
      turno = 1 - turno;
    } else if (r.sigue) msg = nom + " mete y repite";
    else { msg = ""; turno = 1 - turno; }
    empezar();
  }
  function colocarBlanca() {
    blanca.dentro = true; blanca.vx = blanca.vy = 0;
    for (let k = 0; k < 40; k++) {
      blanca.x = 520 + (k % 5) * 40 - 80; blanca.y = CY + Math.floor(k / 5) * 40 * (k % 2 ? 1 : -1);
      if (mundo.bolas.every((b) => b === blanca || !b.dentro || Math.hypot(b.x - blanca.x, b.y - blanca.y) > 2 * R + 2)) break;
    }
  }
  function empezar() {
    fase = "apuntar";
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(500, () => { const [a, f] = tiroMaquina(); pensando = false; animarCpu(a, f); }); }
  }
  let animCpu = null;
  function animarCpu(a, f) { animCpu = { desde: P.angulo, a, f, t: 0 }; }

  // IA: prueba tiros a bolas propias hacia cada tronera, los simula y se queda con el mejor
  function simular(ang, f) {
    const m = F.clonar(mundo);
    const bl = m.bolas.find((b) => b.n === 0);
    bl.vx = Math.cos(ang) * f * VMAX; bl.vy = Math.sin(ang) * f * VMAX;
    let primer = null; const mets = [];
    let t = 0;
    while (t < 10) { F.paso(m, 1 / 40, { choque(a, b) { if (primer === null && (a === bl || b === bl)) primer = (a === bl ? b : a).n; }, cae(b) { mets.push(b.n); } }); t += 1 / 40; if (F.quieto(m)) break; }
    return { primer, mets };
  }
  function tiroMaquina() {
    const obj = objetivo(turno);
    const dianas = mundo.bolas.filter((b) => b.dentro && b.n && (obj === "abierta" ? b.n !== 8 : obj === "negra" ? b.n === 8 : tipo(b.n) === obj));
    const cands = [];
    dianas.forEach((b) => mundo.agujeros.forEach((h) => {
      const dx = h.x - b.x, dy = h.y - b.y, d = Math.hypot(dx, dy);
      const gx = b.x - (dx / d) * 2 * R, gy = b.y - (dy / d) * 2 * R;
      const ang = Math.atan2(gy - blanca.y, gx - blanca.x);
      const corte = Math.cos(ang - Math.atan2(dy, dx));
      if (corte > 0.25) cands.push({ ang, corte: corte - d / 4000 });
    }));
    cands.sort((a, b) => b.corte - a.corte);
    const lista = cands.slice(0, J.dificultad === 1 ? 4 : J.dificultad === 2 ? 10 : 18);
    for (let k = 0; k < 6; k++) lista.push({ ang: Math.atan2((dianas[k % Math.max(1, dianas.length)] || blanca).y - blanca.y, (dianas[k % Math.max(1, dianas.length)] || blanca).x - blanca.x) + (Math.random() - 0.5) * 0.2 });
    let mejor = { nota: -Infinity, ang: 0, f: 0.6 };
    const fuerzas = J.dificultad === 1 ? [0.6] : [0.45, 0.7, 0.9];
    lista.forEach((c) => fuerzas.forEach((f) => {
      const s = simular(c.ang, f);
      const r = evaluar(turno, s.primer, s.mets, grupo.slice());
      let nota = r.gana ? 1000 : r.pierde ? -1000 : r.falta ? -150 : 0;
      if (!r.falta && !r.pierde) nota += r.sigue ? 100 + 20 * s.mets.length : 0;
      nota += (c.corte || 0) * 5;
      if (nota > mejor.nota) mejor = { nota, ang: c.ang, f };
    }));
    const ruido = J.dificultad === 1 ? 0.06 : J.dificultad === 2 ? 0.022 : 0.006;
    return [mejor.ang + (Math.random() - 0.5) * 2 * ruido, Math.min(1, mejor.f + (Math.random() - 0.5) * 0.08)];
  }
  empezar();

  // trayectoria de ayuda: hasta la primera bola o banda
  function rayo() {
    const dx = Math.cos(P.angulo), dy = Math.sin(P.angulo);
    let tmin = Infinity, golpe = null;
    mundo.bolas.forEach((b) => {
      if (b === blanca || !b.dentro) return;
      const fx = blanca.x - b.x, fy = blanca.y - b.y;
      const bb = fx * dx + fy * dy, c = fx * fx + fy * fy - 4 * R * R, disc = bb * bb - c;
      if (disc < 0) return;
      const t = -bb - Math.sqrt(disc);
      if (t > 0 && t < tmin) { tmin = t; golpe = b; }
    });
    const tx = dx > 0 ? (X2 - R - blanca.x) / dx : dx < 0 ? (X1 + R - blanca.x) / dx : Infinity;
    const ty = dy > 0 ? (Y2 - R - blanca.y) / dy : dy < 0 ? (Y1 + R - blanca.y) / dy : Infinity;
    const tp = Math.min(tx, ty);
    if (tp < tmin) return { x: blanca.x + dx * tp, y: blanca.y + dy * tp, bola: null };
    return { x: blanca.x + dx * tmin, y: blanca.y + dy * tmin, bola: golpe };
  }

  function bola(g, b) {
    const x = b.x, y = b.y;
    g.save();
    g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 8; g.shadowOffsetY = 4;
    if (b.n === 0) { D.ficha(g, x, y, R, "#f7f3ea", { anillo: false }); g.restore(); return; }
    const c = COL[b.n > 8 ? b.n - 8 : b.n];
    if (b.n > 8) {
      D.ficha(g, x, y, R, "#f7f3ea", { anillo: false, sombra: false });
      g.shadowColor = "transparent";
      g.save(); g.beginPath(); g.arc(x, y, R, 0, 7); g.clip(); g.fillStyle = c; g.fillRect(x - R, y - R * 0.55, 2 * R, R * 1.1); g.restore();
    } else D.ficha(g, x, y, R, c, { anillo: false, sombra: false });
    g.shadowColor = "transparent";
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, R * 0.5, 0, 7); g.fill();
    g.fillStyle = "#111"; g.font = "700 " + R * 0.68 + "px Barlow, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(b.n, x, y + 1);
    g.restore();
  }

  return {
    tecla(j, a) {
      if (fase !== "apuntar" || pensando || fin || animCpu) return;
      if (P.tecla(a)) tirar(P.angulo, P.fuerza);
    },
    apuntar(j, a) {
      if (fase !== "apuntar" || pensando || fin || animCpu) return;
      if (P.apuntar(a)) tirar(P.angulo, P.fuerza);
    },
    actualizar(dt) {
      if (fase === "apuntar" && !J.jugadores[turno].cpu) P.actualizar(dt, turno);
      if (animCpu) {
        animCpu.t += dt * 1.6;
        let d = animCpu.a - animCpu.desde; d = Math.atan2(Math.sin(d), Math.cos(d));
        P.angulo = animCpu.desde + d * Math.min(1, animCpu.t); P.fuerza = animCpu.f;
        if (animCpu.t >= 1.4) { const c = animCpu; animCpu = null; tirar(c.a, c.f); }
      }
      if (fase === "moviendo") {
        F.paso(mundo, dt, eventos);
        if (F.quieto(mundo)) { fase = "pensando"; J.despues(300, trasTiro); }
      }
    },
    dibujar(g) {
      D.fondo(g, "#1f1814", "#0a0806");
      // mesa
      D.caja(g, X1 - 80, Y1 - 80, X2 - X1 + 160, Y2 - Y1 + 160, { relleno: "#5a3417", r: 40, sombra: 50 });
      D.caja(g, X1 - 40, Y1 - 40, X2 - X1 + 80, Y2 - Y1 + 80, { relleno: "#0f6b45", r: 20 });
      const gr = g.createRadialGradient(960, CY, 100, 960, CY, 900); gr.addColorStop(0, "#1a8a5a"); gr.addColorStop(1, "#0c5b39");
      g.fillStyle = gr; g.fillRect(X1, Y1, X2 - X1, Y2 - Y1);
      for (let k = 1; k < 4; k++) { g.fillStyle = "#e9dcc0"; [Y1 - 60, Y2 + 60].forEach((y) => { g.beginPath(); g.arc(X1 + (X2 - X1) * k / 4, y, 5, 0, 7); g.fill(); }); }
      mundo.agujeros.forEach((h) => { g.fillStyle = "#050505"; g.beginPath(); g.arc(h.x, h.y, h.r, 0, 7); g.fill(); });
      // ayuda de apuntado
      const humano = fase === "apuntar" && !fin && (!J.jugadores[turno].cpu || animCpu);
      if (humano && blanca.dentro) {
        const r = rayo();
        g.save(); g.setLineDash([10, 10]); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(blanca.x, blanca.y); g.lineTo(r.x, r.y); g.stroke(); g.setLineDash([]);
        g.strokeStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(r.x, r.y, R, 0, 7); g.stroke();
        if (r.bola) { const dx = r.bola.x - r.x, dy = r.bola.y - r.y, d = Math.hypot(dx, dy); g.strokeStyle = "rgba(255,217,138,.8)"; g.beginPath(); g.moveTo(r.bola.x, r.bola.y); g.lineTo(r.bola.x + dx / d * 160, r.bola.y + dy / d * 160); g.stroke(); }
        g.restore();
        // taco
        const atras = 30 + P.fuerza * 90;
        g.save(); g.translate(blanca.x, blanca.y); g.rotate(P.angulo);
        const tg = g.createLinearGradient(-atras - 520, 0, -atras, 0); tg.addColorStop(0, "#3b2310"); tg.addColorStop(0.8, "#d9b07a"); tg.addColorStop(1, "#f4ecd9");
        g.fillStyle = tg; g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 10;
        g.beginPath(); g.moveTo(-atras, -5); g.lineTo(-atras - 520, -10); g.lineTo(-atras - 520, 10); g.lineTo(-atras, 5); g.closePath(); g.fill();
        g.restore();
      }
      mundo.bolas.forEach((b) => b.dentro && bola(g, b));
      // panel superior
      J.jugadores.forEach((p, i) => {
        const x = i === 0 ? 60 : 1100;
        D.caja(g, x, 20, 760, 100, { relleno: i === turno && !fin ? "rgba(255,217,138,.14)" : "rgba(255,255,255,.05)", borde: i === turno && !fin ? "#e8b85c" : "rgba(255,255,255,.1)", r: 18 });
        D.ficha(g, x + 46, 70, 22, p.color, { anillo: false });
        D.texto(g, p.nombre, x + 84, 55, { tam: 32, peso: 700, max: 330 });
        D.texto(g, grupo[i] ? (quedan(grupo[i]) ? "Juega con " + grupo[i] : "¡A por la negra!") : "Mesa abierta", x + 84, 92, { tam: 22, color: "#a79db3", peso: 400 });
        if (grupo[i]) {
          const mias = mundo.bolas.filter((b) => b.n && b.dentro && tipo(b.n) === grupo[i]).sort((a, b) => a.n - b.n);
          mias.forEach((b, k) => bola(g, { x: x + 450 + k * 40, y: 70, n: b.n }));
        }
      });
      if (fase === "apuntar" && !J.jugadores[turno].cpu && !fin) D.barraFuerza(g, 760, 1012, 400, 44, P.fuerza);
      D.texto(g, pensando ? J.jugadores[turno].nombre + " estudia el tiro…" : msg, 960, 160, { tam: 30, alin: "center", color: "#ffd98a" });
      if (!J.jugadores[turno].cpu) D.texto(g, "◀ ▶ apuntar · ▲ ▼ fuerza · OK tirar", 60, 1034, { tam: 24, color: "#a79db3", peso: 400 });
    }
  };
});
