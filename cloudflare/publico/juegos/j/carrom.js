Salon.juego("carrom", function (J) {
  const D = Salon.dib, F = Salon.fisica;
  // Tablero cuadrado con 4 troneras. Blancas (bando 0) contra negras (bando 1).
  // Con 4 jugadores van por parejas: 0 y 2 con blancas, 1 y 3 con negras.
  const CX = 600, CY = 540, L = 860, X1 = CX - L / 2, Y1 = CY - L / 2, X2 = CX + L / 2, Y2 = CY + L / 2;
  const RP = 20, RS = 27, VMAX = 2300, BASE = L / 2 - 118; // distancia del centro a la línea de tiro
  const bando = (j) => j % 2;
  const mundo = F.mundo({ decel: 260, amort: 0.6, rebote: 0.75, reboteBolas: 0.9 });
  F.rect(mundo, X1, Y1, X2, Y2);
  mundo.agujeros = [[X1 + 30, Y1 + 30], [X2 - 30, Y1 + 30], [X1 + 30, Y2 - 30], [X2 - 30, Y2 - 30]].map(([x, y]) => ({ x, y, r: 33 }));
  const piezas = [];
  piezas.push(F.bola(mundo, CX, CY, RP, { tipo: "reina" }));
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; piezas.push(F.bola(mundo, CX + Math.cos(a) * 2.05 * RP, CY + Math.sin(a) * 2.05 * RP, RP, { tipo: k % 2 ? "negra" : "blanca" })); }
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6 + Math.PI / 12; piezas.push(F.bola(mundo, CX + Math.cos(a) * 4.05 * RP, CY + Math.sin(a) * 4.05 * RP, RP, { tipo: k % 2 ? "blanca" : "negra" })); }
  const lanzador = F.bola(mundo, CX, CY + BASE, RS, { tipo: "lanzador", masa: RS * RS * 1.6 });

  // lado desde el que tira cada jugador: 0 abajo, 1 arriba (2 jugadores); con 4: abajo, derecha, arriba, izquierda
  const ladoDe = (j) => (J.n === 2 ? (j === 0 ? 0 : 2) : j);
  const geom = (lado) => [[0, 1, 1, 0], [1, 0, 0, -1], [0, -1, -1, 0], [-1, 0, 0, 1]][lado]; // [nx, ny, tx, ty] normal hacia el jugador y tangente
  let turno = 0, fase = "colocar", pos = 0, metidas = [], msg = "", fin = false, pensando = false, reinaPendiente = null, animCpu = null;
  const guardadas = [0, 0], reinaDe = [false, false];
  const P = Salon.punteria(J, { angulo: -Math.PI / 2, fuerza: 0.6 });

  function situarLanzador() {
    const [nx, ny, tx, ty] = geom(ladoDe(turno));
    lanzador.x = CX + nx * BASE + tx * pos; lanzador.y = CY + ny * BASE + ty * pos;
    lanzador.vx = lanzador.vy = 0; lanzador.dentro = true;
  }
  const libreLanzador = () => piezas.every((p) => !p.dentro || Math.hypot(p.x - lanzador.x, p.y - lanzador.y) > RP + RS + 1);
  const quedan = (t) => piezas.filter((p) => p.dentro && p.tipo === t).length;
  const color = (j) => (bando(j) === 0 ? "blanca" : "negra");

  function empezar() {
    fase = "colocar";
    pos = 0;
    situarLanzador();
    const [nx, ny] = geom(ladoDe(turno));
    P.angulo = Math.atan2(-ny, -nx);
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(500, () => { const t = tiroMaquina(); pensando = false; animCpu = { t: 0, desde: [pos, P.angulo], ...t }; }); }
  }
  function tirar() {
    if (!libreLanzador()) { J.aviso("Mueve el lanzador: está encima de una ficha"); J.sonido("error"); return; }
    lanzador.vx = Math.cos(P.angulo) * P.fuerza * VMAX; lanzador.vy = Math.sin(P.angulo) * P.fuerza * VMAX;
    metidas = []; fase = "moviendo"; msg = ""; J.sonido("golpe");
  }
  const ev = { cae(b, h) { metidas.push(b.tipo); J.sonido("caida"); J.efecto("chispas", h.x, h.y, { color: b.tipo === "reina" ? "#d8343f" : b.tipo === "negra" ? "#444" : "#efe2c4", n: 14, fuerza: 200 }); }, choque(a, b, v) { if (v > 250) J.sonido("tic"); } };
  function alCentro(b) {
    b.dentro = true; b.vx = b.vy = 0;
    for (let k = 0; k < 60; k++) {
      const a = k * 0.9, d = k === 0 ? 0 : 10 + k * 3;
      b.x = CX + Math.cos(a) * d; b.y = CY + Math.sin(a) * d;
      if (mundo.bolas.every((o) => o === b || o === lanzador || !o.dentro || Math.hypot(o.x - b.x, o.y - b.y) > o.r + b.r + 1)) return;
    }
  }
  function trasTiro() {
    const yo = bando(turno), mia = color(turno), suya = color(turno + 1);
    const nom = J.jugadores[turno].nombre;
    const propias = metidas.filter((t) => t === mia).length;
    let sigue = false;
    guardadas[yo] += propias; guardadas[1 - yo] += metidas.filter((t) => t === suya).length;
    if (metidas.includes("lanzador")) {
      msg = "Falta de " + nom + ": se coló el lanzador";
      J.sonido("error");
      if (guardadas[yo] > 0) { guardadas[yo]--; const p = piezas.find((p) => !p.dentro && p.tipo === mia); if (p) alCentro(p); }
      if (metidas.includes("reina")) alCentro(piezas[0]);
      reinaPendiente = null;
    } else {
      if (reinaPendiente === yo) {
        if (propias) { reinaDe[yo] = true; msg = "¡" + nom + " cubre la reina!"; J.sonido("gol"); }
        else { alCentro(piezas[0]); msg = "No cubrió la reina: vuelve al centro"; }
        reinaPendiente = null;
      }
      if (metidas.includes("reina")) {
        if (propias) { reinaDe[yo] = true; msg = "¡Reina cubierta!"; J.sonido("gol"); }
        else { reinaPendiente = yo; msg = nom + " mete la reina: tiene que cubrirla ahora"; sigue = true; }
      }
      if (propias) { sigue = true; if (!msg) msg = nom + " mete y repite"; }
      // no se puede acabar sin haber cubierto la reina
      if (quedan(mia) === 0 && piezas[0].dentro && !reinaDe[yo]) {
        const p = piezas.find((p) => !p.dentro && p.tipo === mia); if (p) { alCentro(p); guardadas[yo]--; }
        msg = "Antes de la última hay que meter la reina";
      }
    }
    if (quedan("blanca") === 0 || quedan("negra") === 0) {
      const gana = quedan("blanca") === 0 ? 0 : 1;
      fin = true;
      const nombres = J.jugadores.filter((_, i) => bando(i) === gana).map((p) => p.nombre).join(" y ");
      return J.despues(900, () => J.terminar({ ganador: J.jugadores.findIndex((_, i) => bando(i) === gana), titulo: "¡Ganan las " + (gana === 0 ? "blancas" : "negras") + "!", texto: nombres + " meten todas sus fichas." + (reinaDe[gana] ? " Con la reina." : "") }));
    }
    if (!sigue) turno = (turno + 1) % J.n;
    lanzador.dentro = true;
    empezar();
  }

  function tiroMaquina() {
    const mia = color(turno), [nx, ny, tx, ty] = geom(ladoDe(turno));
    const dianas = piezas.filter((p) => p.dentro && (p.tipo === mia || (p.tipo === "reina" && quedan(mia) < 9)));
    let mejor = { nota: -Infinity, pos: 0, ang: Math.atan2(-ny, -nx), f: 0.6 };
    const posiciones = J.dificultad === 1 ? [0, -150, 150] : [-280, -180, -90, 0, 90, 180, 280];
    posiciones.forEach((ps) => {
      const lx = CX + nx * BASE + tx * ps, ly = CY + ny * BASE + ty * ps;
      if (!piezas.every((p) => !p.dentro || Math.hypot(p.x - lx, p.y - ly) > RP + RS + 1)) return;
      dianas.forEach((d) => mundo.agujeros.forEach((h) => {
        const dx = h.x - d.x, dy = h.y - d.y, dd = Math.hypot(dx, dy);
        const gx = d.x - (dx / dd) * (RP + RS), gy = d.y - (dy / dd) * (RP + RS);
        const ang = Math.atan2(gy - ly, gx - lx);
        if (Math.cos(ang - Math.atan2(dy, dx)) < 0.35) return;
        // no tirar hacia atrás (hacia el propio jugador)
        if (Math.cos(ang) * -nx + Math.sin(ang) * -ny < -0.2) return;
        for (const f of J.dificultad === 1 ? [0.55] : [0.45, 0.65, 0.85]) {
          const m = F.clonar(mundo);
          const l = m.bolas.find((b) => b.tipo === "lanzador");
          l.x = lx; l.y = ly; l.vx = Math.cos(ang) * f * VMAX; l.vy = Math.sin(ang) * f * VMAX;
          const mets = [];
          let t = 0;
          while (t < 8) { F.paso(m, 1 / 40, { cae(b) { mets.push(b.tipo); } }); t += 1 / 40; if (F.quieto(m)) break; }
          let nota = mets.filter((x) => x === mia).length * 100 - mets.filter((x) => x !== mia && x !== "reina" && x !== "lanzador").length * 60 + (mets.includes("reina") ? 40 : 0) - (mets.includes("lanzador") ? 150 : 0);
          nota += Math.random() * 5;
          if (nota > mejor.nota) mejor = { nota, pos: ps, ang, f };
        }
      }));
    });
    const ruido = J.dificultad === 1 ? 0.07 : J.dificultad === 2 ? 0.025 : 0.008;
    return { pos: mejor.pos, ang: mejor.ang + (Math.random() - 0.5) * 2 * ruido, f: mejor.f };
  }
  empezar();

  function ficha(g, b) {
    const col = b.tipo === "blanca" ? "#efe2c4" : b.tipo === "negra" ? "#2b2420" : b.tipo === "reina" ? "#d8343f" : "#f5f0e6";
    D.ficha(g, b.x, b.y, b.r, col);
    if (b.tipo === "lanzador") { g.strokeStyle = "#c79a3b"; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r * 0.6, 0, 7); g.stroke(); }
    else { g.strokeStyle = b.tipo === "negra" ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.25)"; g.lineWidth = 2; for (const k of [0.45, 0.75]) { g.beginPath(); g.arc(b.x, b.y, b.r * k, 0, 7); g.stroke(); } }
  }

  return {
    tecla(j, a) {
      if (fin || pensando || animCpu) return;
      if (fase === "colocar") {
        const [, , tx, ty] = geom(ladoDe(turno));
        // ◀ ▶ mueven el lanzador en la dirección que ve el jugador en pantalla
        const paso = 14 * ((a === "derecha" ? 1 : a === "izquierda" ? -1 : 0) * (tx !== 0 ? Math.sign(tx) : 1) + (a === "abajo" ? 1 : a === "arriba" ? -1 : 0) * (ty !== 0 ? Math.sign(ty) : 0));
        if (paso) { pos = Math.max(-300, Math.min(300, pos + paso)); situarLanzador(); return; }
        if (a === "ok") { fase = "apuntar"; J.sonido("clic"); }
        return;
      }
      if (fase === "apuntar") { if (P.tecla(a)) tirar(); }
    },
    apuntar(j, a) {
      if (fin || pensando || animCpu || fase === "moviendo") return;
      if (fase === "colocar") fase = "apuntar";
      if (P.apuntar(a)) tirar();
    },
    actualizar(dt) {
      if (fase === "apuntar" && !J.jugadores[turno].cpu) P.actualizar(dt, turno);
      if (animCpu) {
        animCpu.t += dt;
        const e = Math.min(1, animCpu.t / 0.8);
        pos = animCpu.desde[0] + (animCpu.pos - animCpu.desde[0]) * e; situarLanzador();
        let d = animCpu.ang - animCpu.desde[1]; d = Math.atan2(Math.sin(d), Math.cos(d));
        P.angulo = animCpu.desde[1] + d * e; P.fuerza = animCpu.f;
        if (animCpu.t > 1.3) { animCpu = null; fase = "apuntar"; tirar(); }
      }
      if (fase === "moviendo") { F.paso(mundo, dt, ev); if (F.quieto(mundo)) { fase = "fin"; J.despues(300, trasTiro); } }
    },
    dibujar(g) {
      D.fondo(g, "#2a1e14", "#0b0806");
      D.caja(g, X1 - 50, Y1 - 50, L + 100, L + 100, { relleno: "#3d2312", r: 26, sombra: 50 });
      const gr = g.createRadialGradient(CX, CY, 50, CX, CY, L * 0.75); gr.addColorStop(0, "#f2dcab"); gr.addColorStop(1, "#d9b878");
      g.fillStyle = gr; g.fillRect(X1, Y1, L, L);
      // dibujos del tablero
      g.strokeStyle = "rgba(90,50,20,.55)"; g.lineWidth = 3;
      g.beginPath(); g.arc(CX, CY, 90, 0, 7); g.stroke(); g.beginPath(); g.arc(CX, CY, 25, 0, 7); g.stroke();
      for (let lado = 0; lado < 4; lado++) {
        const [nx, ny, tx, ty] = geom(lado);
        const ax = CX + nx * BASE, ay = CY + ny * BASE;
        g.beginPath(); g.moveTo(ax - tx * 300 + nx * 20, ay - ty * 300 + ny * 20); g.lineTo(ax + tx * 300 + nx * 20, ay + ty * 300 + ny * 20); g.stroke();
        g.beginPath(); g.moveTo(ax - tx * 300 - nx * 20, ay - ty * 300 - ny * 20); g.lineTo(ax + tx * 300 - nx * 20, ay + ty * 300 - ny * 20); g.stroke();
        for (const s of [-1, 1]) { g.fillStyle = "#c0392b"; g.beginPath(); g.arc(ax + tx * 300 * s, ay + ty * 300 * s, 20, 0, 7); g.fill(); }
      }
      mundo.agujeros.forEach((h) => { g.fillStyle = "#1a0f08"; g.beginPath(); g.arc(h.x, h.y, h.r, 0, 7); g.fill(); });
      // guía
      const humano = !fin && (fase === "apuntar" || fase === "colocar") && (!J.jugadores[turno].cpu || animCpu);
      if (humano) {
        g.save(); g.setLineDash([8, 8]); g.strokeStyle = fase === "apuntar" || animCpu ? "rgba(60,30,10,.7)" : "rgba(60,30,10,.25)"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(lanzador.x, lanzador.y); g.lineTo(lanzador.x + Math.cos(P.angulo) * (120 + P.fuerza * 300), lanzador.y + Math.sin(P.angulo) * (120 + P.fuerza * 300)); g.stroke(); g.restore();
      }
      mundo.bolas.forEach((b) => b.dentro && ficha(g, b));
      if (humano && !libreLanzador()) { g.strokeStyle = "#ef5b5b"; g.lineWidth = 5; g.beginPath(); g.arc(lanzador.x, lanzador.y, RS + 6, 0, 7); g.stroke(); }
      // panel
      const px = 1150;
      D.titulo(g, "Carrom", px, 90);
      D.marcador(g, J.jugadores.map((p, i) => ({ nombre: p.nombre, color: bando(i) === 0 ? "#efe2c4" : "#2b2420", detalle: (bando(i) === 0 ? "Blancas" : "Negras") + (J.n === 4 ? " · pareja" : ""), valor: guardadas[bando(i)], activo: i === turno && !fin })), px, 160, 680);
      const y = 160 + J.n * 104 + 30;
      D.texto(g, "Quedan " + quedan("blanca") + " blancas y " + quedan("negra") + " negras" + (piezas[0].dentro ? " · reina en juego" : ""), px, y, { tam: 26, color: "#a79db3", peso: 400 });
      D.texto(g, pensando ? J.jugadores[turno].nombre + " estudia el tiro…" : msg, px, y + 50, { tam: 28, color: "#ffd98a", max: 720 });
      if (!J.jugadores[turno].cpu && !fin) {
        D.texto(g, fase === "colocar" ? "◀ ▶ mueve el lanzador · OK para apuntar" : fase === "apuntar" ? "◀ ▶ apuntar · ▲ ▼ fuerza · OK tirar" : "", px, y + 110, { tam: 26, color: "#f6efe2", peso: 400 });
        if (fase === "apuntar") D.barraFuerza(g, px, y + 150, 420, 44, P.fuerza);
      }
    }
  };
});
