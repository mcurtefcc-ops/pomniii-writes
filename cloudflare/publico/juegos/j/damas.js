Salon.juego("damas", function (J) {
  const D = Salon.dib;
  // Tablero 8x8. 1 = peón jugador 0 (claras, abajo, suben), 2 = su dama;
  // -1 / -2 = jugador 1 (oscuras). Reglas españolas: comer es obligatorio,
  // se elige la jugada que más come, peones comen solo hacia delante, damas vuelan.
  const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const C = 120, X0 = 150, Y0 = 60;
  const dentro = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  let t = [];
  for (let r = 0; r < 8; r++) { t.push([]); for (let c = 0; c < 8; c++) { const o = (r + c) % 2 === 1; t[r].push(o && r < 3 ? -1 : o && r > 4 ? 1 : 0); } }
  const copiar = (t) => t.map((f) => f.slice());

  function capturasDesde(t, r0, c0, p) {
    const lado = Math.sign(p), dama = Math.abs(p) === 2, av = lado === 1 ? -1 : 1, out = [];
    t[r0][c0] = 0;
    (function buscar(r, c, camino, comidas) {
      let siguio = false;
      for (const d of DIRS) {
        if (!dama && d[0] !== av) continue;
        let i = 1, rr = r + d[0], cc = c + d[1];
        if (dama) while (dentro(rr, cc) && t[rr][cc] === 0) { i++; rr = r + d[0] * i; cc = c + d[1] * i; }
        if (!dentro(rr, cc) || Math.sign(t[rr][cc]) !== -lado) continue;
        if (comidas.some((x) => x[0] === rr && x[1] === cc)) continue;
        let j = 1, lr = rr + d[0], lc = cc + d[1];
        while (dentro(lr, lc) && t[lr][lc] === 0) {
          siguio = true;
          buscar(lr, lc, camino.concat([[lr, lc]]), comidas.concat([[rr, cc]]));
          if (!dama) break;
          j++; lr = rr + d[0] * j; lc = cc + d[1] * j;
        }
      }
      if (!siguio && comidas.length) out.push({ de: [r0, c0], camino, comidas });
    })(r0, c0, [], []);
    t[r0][c0] = p;
    return out;
  }
  function jugadas(t, lado) {
    let comer = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (Math.sign(t[r][c]) === lado) comer = comer.concat(capturasDesde(t, r, c, t[r][c]));
    if (comer.length) { const m = Math.max(...comer.map((j) => j.comidas.length)); return comer.filter((j) => j.comidas.length === m); }
    const out = [], av = lado === 1 ? -1 : 1;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const q = t[r][c];
      if (Math.sign(q) !== lado) continue;
      const dama = Math.abs(q) === 2;
      for (const d of DIRS) {
        if (!dama && d[0] !== av) continue;
        let rr = r + d[0], cc = c + d[1];
        while (dentro(rr, cc) && t[rr][cc] === 0) { out.push({ de: [r, c], camino: [[rr, cc]], comidas: [] }); if (!dama) break; rr += d[0]; cc += d[1]; }
      }
    }
    return out;
  }
  function aplicar(t, j) {
    const n = copiar(t);
    let p = n[j.de[0]][j.de[1]];
    const f = j.camino[j.camino.length - 1];
    n[j.de[0]][j.de[1]] = 0;
    j.comidas.forEach((x) => (n[x[0]][x[1]] = 0));
    if (p === 1 && f[0] === 0) p = 2;
    if (p === -1 && f[0] === 7) p = -2;
    n[f[0]][f[1]] = p;
    return n;
  }
  function valorar(t) {
    let v = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = t[r][c]; if (!p) continue;
      const centro = c >= 2 && c <= 5 && r >= 2 && r <= 5 ? 6 : 0;
      if (p === 1) v += 100 + (7 - r) * 5 + centro + (r === 7 ? 8 : 0);
      else if (p === -1) v -= 100 + r * 5 + centro + (r === 0 ? 8 : 0);
      else v += p > 0 ? 320 : -320;
    }
    return v;
  }
  function negamax(t, lado, prof, a, b, ply) {
    const js = jugadas(t, lado);
    if (!js.length) return -100000 + ply;
    if (prof <= 0 && (!js[0].comidas.length || ply > 12)) return lado * valorar(t);
    let mejor = -Infinity;
    for (const j of js) {
      const v = -negamax(aplicar(t, j), -lado, prof - 1, -b, -a, ply + 1);
      if (v > mejor) mejor = v;
      if (v > a) a = v;
      if (a >= b) break;
    }
    return mejor;
  }
  const lado = (i) => (i === 0 ? 1 : -1);

  let turno = 0, cursor = [5, 0], elegida = null, anim = null, ultimo = null, sinCambio = 0, fin = false, pensando = false, msg = "";
  let js = jugadas(t, 1);

  function empezarTurno() {
    js = jugadas(t, lado(turno));
    if (!js.length) { fin = true; return J.despues(600, () => J.terminar({ ganador: 1 - turno })); }
    if (sinCambio >= 50) { fin = true; return J.despues(600, () => J.terminar({ ganador: null, texto: "Demasiados movimientos sin comer." })); }
    J.turno(turno);
    msg = js[0].comidas.length ? "¡Hay que comer" + (js[0].comidas.length > 1 ? " " + js[0].comidas.length + " fichas" : "") + "!" : "";
    if (J.jugadores[turno].cpu) {
      pensando = true;
      J.despues(500, () => {
        const prof = J.dificultad === 1 ? 1 : J.dificultad === 2 ? 3 : 5;
        const notas = js.map((j) => ({ j, nota: -negamax(aplicar(t, j), -lado(turno), prof - 1, -Infinity, Infinity, 1) }));
        const e = Salon.ia.elegir(notas, J.dificultad);
        pensando = false;
        mover(e.j);
      });
    } else if (Math.sign(t[cursor[0]][cursor[1]]) !== lado(turno)) cursor = js[0].de.slice();
  }
  function mover(j) {
    elegida = null;
    anim = { j, paso: 0, t: 0, pieza: t[j.de[0]][j.de[1]] };
    J.sonido(j.comidas.length ? "comer" : "mover");
  }
  function terminarMovimiento() {
    const j = anim.j, p0 = anim.pieza;
    t = aplicar(t, j);
    const f = j.camino[j.camino.length - 1];
    j.comidas.forEach(([r, c]) => { const [x, y] = posPieza(r, c); J.efecto("chispas", x, y, { color: p0 > 0 ? "#3a2f42" : "#efe3cb", n: 18 }); });
    if (Math.abs(t[f[0]][f[1]]) === 2 && Math.abs(p0) === 1) { J.sonido("gol"); const [x, y] = posPieza(f[0], f[1]); J.efecto("anillo", x, y, { color: "#ffd98a", r: 80 }); J.efecto("texto", x, y - 40, { texto: "¡Dama!", color: "#ffd98a" }); }
    sinCambio = j.comidas.length || Math.abs(p0) === 1 ? 0 : sinCambio + 1;
    ultimo = [j.de, f];
    if (!J.jugadores[turno].cpu) cursor = f.slice();
    anim = null;
    turno = 1 - turno;
    empezarTurno();
  }
  empezarTurno();

  function posPieza(r, c) { return [X0 + c * C + C / 2, Y0 + r * C + C / 2]; }

  return {
    tecla(jug, a) {
      if (fin || anim || pensando) return;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = [Math.max(0, Math.min(7, cursor[0] + d[0])), Math.max(0, Math.min(7, cursor[1] + d[1]))]; J.sonido("clic"); return; }
      if (a !== "ok") return;
      const [r, c] = cursor;
      if (elegida) {
        const j = js.find((j) => j.de[0] === elegida[0] && j.de[1] === elegida[1] && j.camino[j.camino.length - 1][0] === r && j.camino[j.camino.length - 1][1] === c);
        if (j) return mover(j);
      }
      if (js.some((j) => j.de[0] === r && j.de[1] === c)) { elegida = [r, c]; J.sonido("clic"); }
      else if (Math.sign(t[r][c]) === lado(turno)) { J.aviso(js[0].comidas.length ? "Con esa no: ¡estás obligado a comer!" : "Esa ficha no puede moverse"); J.sonido("error"); elegida = null; }
      else elegida = null;
    },
    actualizar(dt) {
      if (!anim) return;
      anim.t += dt / 0.22;
      if (anim.t >= 1) { anim.t = 0; anim.paso++; if (anim.paso >= anim.j.camino.length) terminarMovimiento(); }
    },
    dibujar(g) {
      D.fondo(g, "#2b1f2a", "#0f0b12");
      // marco y tablero
      D.caja(g, X0 - 28, Y0 - 28, C * 8 + 56, C * 8 + 56, { relleno: "#3a2112", r: 18, sombra: 40 });
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        g.fillStyle = (r + c) % 2 ? "#6d4428" : "#ecd9b4";
        g.fillRect(X0 + c * C, Y0 + r * C, C, C);
      }
      if (ultimo) ultimo.forEach(([r, c]) => { g.fillStyle = "rgba(232,184,92,.3)"; g.fillRect(X0 + c * C, Y0 + r * C, C, C); });
      const humano = !J.jugadores[turno].cpu && !fin && !anim;
      if (humano) {
        if (elegida) js.filter((j) => j.de[0] === elegida[0] && j.de[1] === elegida[1]).forEach((j) => {
          const f = j.camino[j.camino.length - 1];
          const [x, y] = posPieza(f[0], f[1]);
          g.fillStyle = "rgba(95,211,141,.85)"; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill();
        });
        else js.forEach((j) => { const [x, y] = posPieza(j.de[0], j.de[1]); g.strokeStyle = "rgba(95,211,141,.7)"; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 50, 0, 7); g.stroke(); });
      }
      const comidas = anim ? anim.j.comidas.slice(0, anim.paso) : [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = t[r][c];
        if (!p) continue;
        if (anim && anim.j.de[0] === r && anim.j.de[1] === c) continue;
        if (comidas.some((x) => x[0] === r && x[1] === c)) continue;
        const [x, y] = posPieza(r, c);
        pieza(g, x, y, p, elegida && elegida[0] === r && elegida[1] === c);
      }
      if (anim) {
        const desde = anim.paso === 0 ? anim.j.de : anim.j.camino[anim.paso - 1];
        const hasta = anim.j.camino[anim.paso];
        const a = posPieza(desde[0], desde[1]), b = posPieza(hasta[0], hasta[1]);
        const e = anim.t * anim.t * (3 - 2 * anim.t);
        pieza(g, a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e - Math.sin(e * Math.PI) * 30, anim.pieza, true);
      }
      if (humano) D.cursor(g, X0 + cursor[1] * C, Y0 + cursor[0] * C, C, C, "#ffd98a");
      // lateral
      D.titulo(g, "Damas", 1250, 120);
      const cuenta = (s) => t.flat().filter((v) => Math.sign(v) === s).length;
      D.marcador(g, [1, 0].map((i) => ({ nombre: J.jugadores[i].nombre, color: i === 0 ? "#efe3cb" : "#3a2f42", detalle: i === 0 ? "Claras · empiezan" : "Oscuras", valor: cuenta(lado(i)), activo: turno === i && !fin })), 1250, 220, 540);
      D.texto(g, pensando ? "La máquina piensa…" : msg, 1250, 470, { tam: 34, color: "#ffd98a" });
      D.texto(g, "Elige ficha con OK y luego la casilla destino.", 1250, 540, { tam: 26, color: "#a79db3", peso: 400 });
      D.texto(g, "Comer es obligatorio, y siempre la jugada que más come.", 1250, 580, { tam: 26, color: "#a79db3", peso: 400 });
    }
  };
  function pieza(g, x, y, p, alzada) {
    const clara = p > 0;
    if (alzada) { y -= 8; }
    D.ficha(g, x, y, 46, clara ? "#efe3cb" : "#3a2f42");
    if (alzada) { g.save(); g.strokeStyle = "#5fd38d"; g.lineWidth = 6; g.shadowColor = "#5fd38d"; g.shadowBlur = 20; g.beginPath(); g.arc(x, y, 48, 0, 7); g.stroke(); g.restore(); }
    if (Math.abs(p) === 2) D.texto(g, "♛", x, y + 3, { tam: 56, color: "#e8b85c", alin: "center", sombra: 12 });
  }
});
