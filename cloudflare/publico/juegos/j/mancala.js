Salon.juego("mancala", function (J) {
  const D = Salon.dib;
  // Kalah: hoyos 0-5 del jugador 0 (abajo, de izquierda a derecha) y su almacén 6;
  // hoyos 7-12 del jugador 1 (arriba, de derecha a izquierda) y su almacén 13.
  let p = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
  let turno = 0, sel = 0, anim = null, fin = false, pensando = false, ultimo = -1;
  const almacen = (j) => (j === 0 ? 6 : 13);
  const hoyos = (j) => (j === 0 ? [0, 1, 2, 3, 4, 5] : [12, 11, 10, 9, 8, 7]); // en orden visual izq->dcha

  function mover(e, i) {
    // devuelve {p, extra, pasos:[índices por donde cae cada semilla]}
    const q = e.p.slice(), j = e.j;
    let n = q[i], k = i;
    q[i] = 0;
    const pasos = [];
    while (n > 0) { k = (k + 1) % 14; if (k === almacen(1 - j)) continue; q[k]++; n--; pasos.push(k); }
    let extra = k === almacen(j);
    const mio = j === 0 ? k >= 0 && k <= 5 : k >= 7 && k <= 12;
    if (mio && q[k] === 1 && q[12 - k] > 0) { q[almacen(j)] += q[12 - k] + 1; q[12 - k] = 0; q[k] = 0; }
    let terminado = false;
    const lado0 = [0, 1, 2, 3, 4, 5].reduce((s, x) => s + q[x], 0), lado1 = [7, 8, 9, 10, 11, 12].reduce((s, x) => s + q[x], 0);
    if (!lado0 || !lado1) {
      q[6] += lado0; q[13] += lado1;
      for (let x = 0; x < 14; x++) if (x !== 6 && x !== 13) q[x] = 0;
      terminado = true; extra = false;
    }
    return { p: q, j: extra ? j : 1 - j, pasos, terminado };
  }
  const validas = (e) => hoyos(e.j).filter((i) => e.p[i] > 0);
  function negamax(e, prof, a, b) {
    const vs = validas(e);
    if (prof <= 0 || !vs.length) return e.p[almacen(e.j)] - e.p[almacen(1 - e.j)];
    let mejor = -Infinity;
    for (const i of vs) {
      const n = mover(e, i);
      const v = n.terminado ? (n.p[almacen(e.j)] - n.p[almacen(1 - e.j)]) * 10 : n.j === e.j ? negamax(n, prof - 1, a, b) : -negamax(n, prof - 1, -b, -a);
      if (v > mejor) mejor = v;
      if (v > a) a = v;
      if (a >= b) break;
    }
    return mejor;
  }
  function jugar(i) {
    const r = mover({ p, j: turno }, i);
    anim = { desde: i, pasos: r.pasos, k: 0, t: 0, res: r, mano: p[i] };
    p[i] = 0;
    J.sonido("mover");
  }
  function siguiente() {
    J.turno(turno);
    const vs = validas({ p, j: turno });
    if (!vs.includes(hoyos(turno)[sel])) sel = hoyos(turno).indexOf(vs[0]);
    if (J.jugadores[turno].cpu) {
      pensando = true;
      J.despues(550, () => {
        const prof = J.dificultad === 1 ? 1 : J.dificultad === 2 ? 4 : 8;
        const ops = vs.map((i) => { const n = mover({ p, j: turno }, i); return { i, nota: n.terminado ? (n.p[almacen(turno)] - n.p[almacen(1 - turno)]) * 10 : n.j === turno ? negamax(n, prof - 1, -Infinity, Infinity) : -negamax(n, prof - 1, -Infinity, Infinity) }; });
        pensando = false;
        jugar(Salon.ia.elegir(ops, J.dificultad).i);
      });
    }
  }
  siguiente();

  // geometría
  const posHoyo = (i) => {
    if (i === 6) return [1660, 500];
    if (i === 13) return [260, 500];
    if (i <= 5) return [460 + i * 200, 660];
    return [460 + (12 - i) * 200, 340];
  };
  function dibujarSemillas(g, x, y, n, grande) {
    const rr = grande ? 120 : 62;
    for (let k = 0; k < Math.min(n, 40); k++) {
      const a = k * 2.4, d = Math.sqrt(k / Math.max(n, 1)) * rr * 0.75;
      const hue = (k * 47) % 360;
      g.fillStyle = "hsl(" + hue + ",55%,62%)";
      g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * (grande ? 2 : 1), 11, 9, a, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.arc(x + Math.cos(a) * d - 3, y + Math.sin(a) * d * (grande ? 2 : 1) - 3, 3, 0, 7); g.fill();
    }
  }

  return {
    tecla(j, a) {
      if (anim || fin || pensando) return;
      if (a === "izquierda") { sel = (sel + 5) % 6; J.sonido("clic"); }
      else if (a === "derecha") { sel = (sel + 1) % 6; J.sonido("clic"); }
      else if (a === "ok") {
        const i = hoyos(turno)[sel];
        if (p[i] > 0) jugar(i); else { J.sonido("error"); J.aviso("Ese hoyo está vacío"); }
      }
    },
    actualizar(dt) {
      if (!anim) return;
      anim.t += dt;
      if (anim.t < 0.16) return;
      anim.t = 0;
      if (anim.k < anim.pasos.length) { p[anim.pasos[anim.k]]++; ultimo = anim.pasos[anim.k]; anim.k++; J.sonido("tic"); return; }
      const r = anim.res;
      const capturo = r.p[almacen(turno)] - p[almacen(turno)] > 0 && !r.terminado && r.pasos[r.pasos.length - 1] !== almacen(turno);
      p = r.p; anim = null;
      if (capturo) { J.sonido("comer"); J.aviso("¡" + J.jugadores[turno].nombre + " captura!"); }
      if (r.terminado) {
        fin = true;
        const a = p[6], b = p[13];
        return J.despues(900, () => J.terminar({ ganador: a > b ? 0 : b > a ? 1 : null, texto: a + " a " + b }));
      }
      if (r.j === turno) J.aviso(J.jugadores[turno].nombre + " repite turno");
      turno = r.j;
      siguiente();
    },
    dibujar(g) {
      D.fondo(g, "#2a1d14", "#0e0906");
      D.titulo(g, "Mancala", 960, 90, { alin: "center" });
      // tablero de madera
      g.save(); g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 50;
      const gr = g.createLinearGradient(0, 200, 0, 800); gr.addColorStop(0, "#9a6235"); gr.addColorStop(1, "#6b3f1f");
      D.ruta(g, 120, 200, 1680, 600, 200); g.fillStyle = gr; g.fill(); g.restore();
      for (let i = 0; i < 14; i++) {
        const [x, y] = posHoyo(i), grande = i === 6 || i === 13;
        g.fillStyle = "#4a2a14";
        g.beginPath();
        if (grande) g.ellipse(x, y, 100, 230, 0, 0, 7); else g.arc(x, y, 80, 0, 7);
        g.fill();
        g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 6; g.stroke();
        dibujarSemillas(g, x, y, p[i], grande);
        const ty = grande ? y + 270 : i <= 5 ? y + 115 : y - 115;
        D.texto(g, p[i], x, ty, { tam: grande ? 52 : 38, alin: "center", peso: 700, color: i === ultimo ? "#ffd98a" : "#f6efe2" });
      }
      if (!anim && !fin && !J.jugadores[turno].cpu) {
        const [x, y] = posHoyo(hoyos(turno)[sel]);
        g.save(); g.strokeStyle = J.jugadores[turno].color; g.lineWidth = 8; g.shadowColor = J.jugadores[turno].color; g.shadowBlur = 25 + 10 * Math.sin(J.tiempo * 6);
        g.beginPath(); g.arc(x, y, 90, 0, 7); g.stroke(); g.restore();
      }
      D.texto(g, J.jugadores[1].nombre, 260, 170, { tam: 30, alin: "center", color: turno === 1 && !fin ? J.jugadores[1].color : "#a79db3" });
      D.texto(g, J.jugadores[0].nombre, 1660, 850, { tam: 30, alin: "center", color: turno === 0 && !fin ? J.jugadores[0].color : "#a79db3" });
      D.texto(g, "◀ " + J.jugadores[1].nombre + " siembra por arriba", 960, 880, { tam: 24, alin: "center", color: "#a79db3", peso: 400 });
      D.texto(g, pensando ? "La máquina piensa…" : "Turno de " + J.jugadores[turno].nombre, 960, 950, { tam: 34, alin: "center", color: "#ffd98a" });
      D.ayuda(g, "◀ ▶ elegir hoyo · OK sembrar · Si la última cae en tu almacén, repites");
    }
  };
});
