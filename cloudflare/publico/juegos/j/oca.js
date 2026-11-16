Salon.juego("oca", function (J) {
  const D = Salon.dib;
  // Tablero en espiral de 9x7 = 63 casillas, de fuera hacia dentro.
  const COLS = 9, FILAS = 7, W = 128, H = 122, X0 = 70, Y0 = 115;
  const pos = [];
  (function () {
    let top = 0, bot = FILAS - 1, izq = 0, der = COLS - 1;
    const celdas = [];
    while (top <= bot && izq <= der) {
      for (let c = izq; c <= der; c++) celdas.push([bot, c]);
      bot--;
      for (let r = bot; r >= top; r--) celdas.push([r, der]);
      der--;
      if (top <= bot) { for (let c = der; c >= izq; c--) celdas.push([top, c]); top++; }
      if (izq <= der) { for (let r = top; r <= bot; r++) celdas.push([r, izq]); izq++; }
    }
    celdas.forEach(([r, c]) => pos.push([X0 + c * W + W / 2, Y0 + r * H + H / 2]));
  })();
  const OCAS = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];
  const ESPECIAL = {
    6: ["🌉", "Puente"], 12: ["🌉", "Puente"], 19: ["🏨", "Posada"], 26: ["🎲", "Dados"], 53: ["🎲", "Dados"],
    31: ["🕳", "Pozo"], 42: ["🌀", "Laberinto"], 56: ["⛓", "Cárcel"], 58: ["💀", "Muerte"], 63: ["🏆", "Meta"]
  };
  OCAS.forEach((o) => (ESPECIAL[o] = ["🪿", "Oca"]));
  const casilla = J.jugadores.map(() => 0), pierde = J.jugadores.map(() => 0), enPozo = J.jugadores.map(() => false);
  let turno = 0, dado = 1, tirando = 0, anim = null, msg = "Pulsa OK para tirar el dado", fin = false, espera = false;

  function tirar() {
    if (tirando || anim || fin || espera) return;
    tirando = 0.9; instr = ""; J.sonido("tic");
  }
  function mover(n) {
    let destino = casilla[turno] + n;
    if (destino > 63) destino = 63 - (destino - 63);
    anim = { desde: casilla[turno], hasta: destino, t: 0, rebote: casilla[turno] + n > 63 };
  }
  function llegar() {
    const i = turno;
    let c = casilla[i], otra = false;
    const nombre = J.jugadores[i].nombre;
    if (c === 63) { fin = true; msg = "¡" + nombre + " llega a la meta!"; return J.despues(800, () => J.terminar({ ganador: i })); }
    if (OCAS.includes(c)) {
      const sig = OCAS.find((o) => o > c) || 63;
      msg = "De oca a oca y tiro porque me toca"; J.sonido("punto");
      saltar(sig, true); return;
    }
    if (c === 6 || c === 12) { msg = "De puente a puente y tiro porque me lleva la corriente"; J.sonido("punto"); saltar(c === 6 ? 12 : 6, true); return; }
    if (c === 26 || c === 53) { msg = "De dado a dado y tiro porque me ha tocado"; J.sonido("punto"); saltar(c === 26 ? 53 : 26, true); return; }
    if (c === 42) { msg = "¡Laberinto! Vuelves a la 30"; J.sonido("error"); saltar(30, false); return; }
    if (c === 58) { msg = "¡La muerte! Vuelves a empezar"; J.sonido("perder"); saltar(1, false); return; }
    if (c === 19) { pierde[i] = 1; msg = nombre + " descansa en la posada: pierde un turno"; }
    else if (c === 56) { pierde[i] = 2; msg = nombre + " va a la cárcel: pierde dos turnos"; }
    else if (c === 31) {
      J.jugadores.forEach((_, k) => { if (k !== i && enPozo[k]) { enPozo[k] = false; msg = J.jugadores[k].nombre + " sale del pozo"; } });
      enPozo[i] = true; msg = nombre + " cae en el pozo: espera a que otro le rescate";
    }
    pasar(otra);
  }
  function saltar(a, otra) {
    J.despues(700, () => { anim = { desde: casilla[turno], hasta: a, t: 0, salto: true, otra }; });
  }
  function pasar(otra) {
    espera = true;
    J.despues(900, () => {
      espera = false;
      if (!otra) {
        // siguiente jugador que pueda tirar
        for (let k = 0; k < J.n; k++) {
          turno = (turno + 1) % J.n;
          if (pierde[turno] > 0) { pierde[turno]--; continue; }
          if (enPozo[turno] && !J.jugadores.every((_, x) => enPozo[x] || x === turno)) continue;
          break;
        }
      }
      empezar();
    });
  }
  let instr = "";
  function empezar() {
    J.turno(turno);
    instr = J.jugadores[turno].cpu ? "Tira " + J.jugadores[turno].nombre : J.jugadores[turno].nombre + ": pulsa OK para tirar";
    if (J.jugadores[turno].cpu) J.despues(700, tirar);
  }
  empezar();
  msg = "";

  return {
    tecla(j, a) { if (a === "ok") tirar(); },
    actualizar(dt) {
      if (tirando) {
        tirando -= dt;
        if (Math.random() < 0.5) dado = J.entero(1, 6);
        if (tirando <= 0) { tirando = 0; dado = J.entero(1, 6); msg = J.jugadores[turno].nombre + " saca un " + dado; mover(dado); }
      }
      if (anim) {
        const pasos = Math.abs(anim.hasta - anim.desde);
        anim.t += dt * (anim.salto ? 1.6 : 6 / Math.max(1, pasos) * Math.min(pasos, 3));
        if (anim.t >= 1) {
          casilla[turno] = anim.hasta;
          const a = anim; anim = null;
          J.sonido("mover");
          if (a.salto) { if (a.otra) pasar(true); else pasar(false); }
          else llegar();
        }
      }
    },
    dibujar(g) {
      D.fondo(g, "#2e2a17", "#0d0b05");
      D.texto(g, "Juego de la oca", 960, 60, { tam: 48, titulo: true, alin: "center", peso: 700 });
      for (let k = 0; k < 63; k++) {
        const n = k + 1, [x, y] = pos[k];
        const esp = ESPECIAL[n];
        const col = esp ? (esp[1] === "Oca" ? "#f3e7b8" : esp[1] === "Muerte" || esp[1] === "Cárcel" || esp[1] === "Pozo" ? "#e9b6a6" : "#bfe3c8") : n % 2 ? "#f7f0dc" : "#efe4c6";
        D.caja(g, x - W / 2 + 3, y - H / 2 + 3, W - 6, H - 6, { relleno: col, r: 12 });
        D.texto(g, n, x - W / 2 + 12, y - H / 2 + 20, { tam: 22, color: "#5b4a2a", sombra: false, peso: 700 });
        if (esp) { D.texto(g, esp[0], x, y + 2, { tam: 44, alin: "center", sombra: false }); D.texto(g, esp[1], x, y + H / 2 - 16, { tam: 16, alin: "center", color: "#5b4a2a", sombra: false }); }
      }
      // fichas
      J.jugadores.forEach((p, i) => {
        let x, y;
        if (anim && i === turno) {
          const e = anim.t;
          if (anim.salto) {
            const a = anim.desde ? pos[anim.desde - 1] : [X0 - 30, Y0 + 6 * H + 60], b = pos[anim.hasta - 1];
            x = a[0] + (b[0] - a[0]) * e; y = a[1] + (b[1] - a[1]) * e - Math.sin(e * Math.PI) * 120;
          } else {
            const total = anim.rebote ? (63 - anim.desde) + (63 - anim.hasta) : Math.abs(anim.hasta - anim.desde);
            const k = e * total;
            const casillaK = anim.rebote ? (k <= 63 - anim.desde ? anim.desde + k : 63 - (k - (63 - anim.desde))) : anim.desde + Math.sign(anim.hasta - anim.desde) * k;
            const a = Math.floor(casillaK), f = casillaK - a;
            const pa = a ? pos[a - 1] : [X0 - 30, Y0 + 6 * H + 60], pb = pos[Math.min(62, a)];
            x = pa[0] + (pb[0] - pa[0]) * f; y = pa[1] + (pb[1] - pa[1]) * f - Math.abs(Math.sin(f * Math.PI)) * 25;
          }
        } else {
          const c = casilla[i];
          const base = c ? pos[c - 1] : [X0 + 30 + i * 40, Y0 + 7 * H + 40];
          const off = [[-22, -18], [22, -18], [-22, 18], [22, 18]][i];
          x = base[0] + (c ? off[0] : 0); y = base[1] + (c ? off[1] : 0);
        }
        D.ficha(g, x, y, 20, p.color);
      });
      // panel
      const px = 1280;
      D.marcador(g, J.jugadores.map((p, i) => ({ nombre: p.nombre, color: p.color, valor: casilla[i], detalle: enPozo[i] ? "En el pozo" : pierde[i] ? "Pierde " + pierde[i] + (pierde[i] > 1 ? " turnos" : " turno") : "", activo: i === turno && !fin })), px, 130, 580);
      // dado
      const dx = px + 200, dy = 130 + J.n * 104 + 40;
      g.save(); g.translate(dx + 80, dy + 80); if (tirando) g.rotate(Math.sin(J.tiempo * 30) * 0.3);
      D.caja(g, -75, -75, 150, 150, { relleno: "#fbf7ee", r: 26, sombra: 20 });
      const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[dado];
      g.fillStyle = "#c62f3a"; P.forEach(([a, b]) => { g.beginPath(); g.arc(a * 38, b * 38, 13, 0, 7); g.fill(); });
      g.restore();
      D.texto(g, instr, px, dy + 215, { tam: 30, color: J.jugadores[turno].color, max: 600 });
      D.texto(g, msg, px, dy + 260, { tam: 24, color: "#ffd98a", max: 600, peso: 400 });
      D.ayuda(g, "OK: tirar el dado");
    }
  };
});
