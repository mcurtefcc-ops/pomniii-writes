Salon.juego("ajedrez", function (J) {
  const D = Salon.dib;
  // Tablero de 64 casillas: índice = fila*8 + columna, fila 0 arriba (negras).
  // Mayúsculas = blancas (jugador 0), minúsculas = negras (jugador 1).
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  };
  const blanca = (p) => p !== "." && p === p.toUpperCase();
  const colorDe = (p) => (p === "." ? null : blanca(p) ? "w" : "b");
  const FC = (i) => [i >> 3, i & 7];
  const IDX = (f, c) => f * 8 + c;
  const en = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8;

  let E = {
    b: "rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR".split(""),
    t: "w", enr: { K: true, Q: true, k: true, q: true }, ap: -1, medio: 0
  };

  function atacada(b, sq, por) {
    const [f, c] = FC(sq);
    const w = por === "w";
    const P = w ? "P" : "p", N = w ? "N" : "n", B = w ? "B" : "b", R = w ? "R" : "r", Q = w ? "Q" : "q", K = w ? "K" : "k";
    const pf = w ? f + 1 : f - 1;
    for (const dc of [-1, 1]) if (en(pf, c + dc) && b[IDX(pf, c + dc)] === P) return true;
    for (const [a, d] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) if (en(f + a, c + d) && b[IDX(f + a, c + d)] === N) return true;
    for (const [a, d] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (en(f + a, c + d) && b[IDX(f + a, c + d)] === K) return true;
    for (const [a, d] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let ff = f + a, cc = c + d;
      while (en(ff, cc)) { const p = b[IDX(ff, cc)]; if (p !== ".") { if (p === B || p === Q) return true; break; } ff += a; cc += d; }
    }
    for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let ff = f + a, cc = c + d;
      while (en(ff, cc)) { const p = b[IDX(ff, cc)]; if (p !== ".") { if (p === R || p === Q) return true; break; } ff += a; cc += d; }
    }
    return false;
  }
  const rey = (b, col) => b.indexOf(col === "w" ? "K" : "k");
  const enJaque = (e, col) => atacada(e.b, rey(e.b, col), col === "w" ? "b" : "w");

  function pseudo(e) {
    const b = e.b, yo = e.t, ms = [];
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (colorDe(p) !== yo) continue;
      const [f, c] = FC(i), t = p.toLowerCase();
      const add = (j, extra) => ms.push(Object.assign({ de: i, a: j, cap: b[j] !== "." }, extra || {}));
      if (t === "p") {
        const dir = yo === "w" ? -1 : 1, ini = yo === "w" ? 6 : 1, ult = yo === "w" ? 0 : 7;
        const f1 = f + dir;
        if (en(f1, c) && b[IDX(f1, c)] === ".") {
          if (f1 === ult) add(IDX(f1, c), { prom: true }); else add(IDX(f1, c));
          if (f === ini && b[IDX(f + 2 * dir, c)] === ".") add(IDX(f + 2 * dir, c), { doble: true });
        }
        for (const dc of [-1, 1]) {
          if (!en(f1, c + dc)) continue;
          const j = IDX(f1, c + dc);
          if (b[j] !== "." && colorDe(b[j]) !== yo) { if (f1 === ult) add(j, { prom: true }); else add(j); }
          else if (j === e.ap) add(j, { alPaso: true, cap: true });
        }
      } else if (t === "n" || t === "k") {
        const ds = t === "n" ? [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [a, d] of ds) if (en(f + a, c + d)) { const j = IDX(f + a, c + d); if (colorDe(b[j]) !== yo) add(j); }
        if (t === "k") {
          const fila = yo === "w" ? 7 : 0, otro = yo === "w" ? "b" : "w";
          if (i === IDX(fila, 4) && !atacada(b, i, otro)) {
            if (e.enr[yo === "w" ? "K" : "k"] && b[IDX(fila, 5)] === "." && b[IDX(fila, 6)] === "." && !atacada(b, IDX(fila, 5), otro) && !atacada(b, IDX(fila, 6), otro)) add(IDX(fila, 6), { enroque: "corto" });
            if (e.enr[yo === "w" ? "Q" : "q"] && b[IDX(fila, 3)] === "." && b[IDX(fila, 2)] === "." && b[IDX(fila, 1)] === "." && !atacada(b, IDX(fila, 3), otro) && !atacada(b, IDX(fila, 2), otro)) add(IDX(fila, 2), { enroque: "largo" });
          }
        }
      } else {
        const ds = t === "b" ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : t === "r" ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [a, d] of ds) {
          let ff = f + a, cc = c + d;
          while (en(ff, cc)) { const j = IDX(ff, cc); if (b[j] === ".") add(j); else { if (colorDe(b[j]) !== yo) add(j); break; } ff += a; cc += d; }
        }
      }
    }
    return ms;
  }
  function aplicar(e, m) {
    const b = e.b.slice(), p = b[m.de], yo = e.t;
    const n = { b, t: yo === "w" ? "b" : "w", enr: Object.assign({}, e.enr), ap: -1, medio: e.medio + 1 };
    if (p.toLowerCase() === "p" || b[m.a] !== ".") n.medio = 0;
    b[m.a] = m.prom ? (yo === "w" ? "Q" : "q") : p;
    b[m.de] = ".";
    if (m.alPaso) b[m.a + (yo === "w" ? 8 : -8)] = ".";
    if (m.doble) n.ap = (m.de + m.a) / 2;
    if (m.enroque) {
      const fila = yo === "w" ? 7 : 0;
      if (m.enroque === "corto") { b[IDX(fila, 5)] = b[IDX(fila, 7)]; b[IDX(fila, 7)] = "."; }
      else { b[IDX(fila, 3)] = b[IDX(fila, 0)]; b[IDX(fila, 0)] = "."; }
    }
    if (p === "K") { n.enr.K = n.enr.Q = false; }
    if (p === "k") { n.enr.k = n.enr.q = false; }
    if (m.de === 63 || m.a === 63) n.enr.K = false;
    if (m.de === 56 || m.a === 56) n.enr.Q = false;
    if (m.de === 7 || m.a === 7) n.enr.k = false;
    if (m.de === 0 || m.a === 0) n.enr.q = false;
    return n;
  }
  function legales(e) { return pseudo(e).filter((m) => !enJaque(aplicar(e, m), e.t)); }
  function evaluar(e) {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = e.b[i];
      if (p === ".") continue;
      const t = p.toLowerCase();
      const s = VAL[t] + PST[t][blanca(p) ? i : (7 - (i >> 3)) * 8 + (i & 7)];
      v += blanca(p) ? s : -s;
    }
    return e.t === "w" ? v : -v;
  }
  function ordenar(e, ms) {
    ms.forEach((m) => (m.o = (m.cap ? 10 * VAL[(e.b[m.a] === "." ? "p" : e.b[m.a]).toLowerCase()] - VAL[e.b[m.de].toLowerCase()] + 1000 : 0) + (m.prom ? 800 : 0)));
    ms.sort((a, b) => b.o - a.o);
  }
  let nodos = 0;
  function quies(e, a, b, prof) {
    nodos++;
    const est = evaluar(e);
    if (est >= b) return b;
    if (est > a) a = est;
    if (prof <= 0) return a;
    const ms = pseudo(e).filter((m) => m.cap || m.prom);
    ordenar(e, ms);
    for (const m of ms) {
      const n = aplicar(e, m);
      if (enJaque(n, e.t)) continue;
      const v = -quies(n, -b, -a, prof - 1);
      if (v >= b) return b;
      if (v > a) a = v;
    }
    return a;
  }
  function negamax(e, prof, a, b, ply) {
    nodos++;
    if (prof <= 0) return quies(e, a, b, 4);
    const ms = pseudo(e);
    ordenar(e, ms);
    let hay = false, mejor = -Infinity;
    for (const m of ms) {
      const n = aplicar(e, m);
      if (enJaque(n, e.t)) continue;
      hay = true;
      const v = -negamax(n, prof - 1, -b, -a, ply + 1);
      if (v > mejor) mejor = v;
      if (v > a) a = v;
      if (a >= b) break;
    }
    if (!hay) return enJaque(e, e.t) ? -100000 + ply : 0;
    return mejor;
  }
  function jugadaMaquina() {
    const ms = legales(E);
    ordenar(E, ms);
    const prof = J.dificultad === 1 ? 1 : J.dificultad === 2 ? 2 : 3;
    nodos = 0;
    const ops = ms.map((m) => ({ m, nota: -negamax(aplicar(E, m), prof - 1, -Infinity, Infinity, 1) + (J.dificultad === 1 ? Math.random() * 60 : 0) }));
    return Salon.ia.elegir(ops, J.dificultad).m;
  }

  // ---------- Partida ----------
  const humanos = J.jugadores.map((j, i) => (j.cpu ? -1 : i)).filter((i) => i >= 0);
  const girado = humanos.length === 1 && humanos[0] === 1;
  let cursor = girado ? IDX(1, 4) : IDX(6, 4), elegida = -1, ms = legales(E), pensando = false, fin = false, ultima = null, anim = null;
  const historial = {}, capturadas = { w: [], b: [] };
  let plies = 0, msg = "";
  const clave = (e) => e.b.join("") + e.t + JSON.stringify(e.enr) + e.ap;
  const turnoIdx = () => (E.t === "w" ? 0 : 1);

  function hacer(m) {
    elegida = -1;
    anim = { m, t: 0, p: E.b[m.de] };
    J.sonido(m.cap ? "comer" : "mover");
  }
  function trasMover() {
    const m = anim.m;
    if (m.cap) capturadas[E.t].push(m.alPaso ? (E.t === "w" ? "p" : "P") : E.b[m.a]);
    E = aplicar(E, m);
    ultima = [m.de, m.a];
    anim = null;
    plies++;
    const k = clave(E);
    historial[k] = (historial[k] || 0) + 1;
    empezar();
  }
  function material() {
    const piezas = E.b.filter((p) => p !== "." && p.toLowerCase() !== "k").map((p) => p.toLowerCase());
    return piezas.length === 0 || (piezas.length === 1 && (piezas[0] === "n" || piezas[0] === "b"));
  }
  function empezar() {
    ms = legales(E);
    const jaque = enJaque(E, E.t);
    msg = jaque ? "¡Jaque!" : "";
    if (!ms.length) {
      fin = true;
      if (jaque) { msg = "¡Jaque mate!"; return J.despues(1200, () => J.terminar({ ganador: 1 - turnoIdx(), texto: "Jaque mate." })); }
      return J.despues(1000, () => J.terminar({ ganador: null, texto: "Rey ahogado: tablas." }));
    }
    let tablas = "";
    if (E.medio >= 100) tablas = "Cincuenta movimientos sin capturas ni peones.";
    else if (material()) tablas = "No queda material para dar mate.";
    else if (historial[clave(E)] >= 3) tablas = "La misma posición se ha repetido tres veces.";
    else if (plies >= 400) tablas = "Partida demasiado larga.";
    if (tablas) { fin = true; return J.despues(900, () => J.terminar({ ganador: null, texto: tablas })); }
    if (jaque) J.sonido("error");
    J.turno(turnoIdx());
    if (J.jugadores[turnoIdx()].cpu) {
      pensando = true;
      J.despues(250, () => { const m = jugadaMaquina(); pensando = false; hacer(m); });
    }
  }
  empezar();

  const C = 120, X0 = 150, Y0 = 60;
  const pant = (i) => { let [f, c] = FC(i); if (girado) { f = 7 - f; c = 7 - c; } return [X0 + c * C, Y0 + f * C]; };
  const GLIFO = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  function pieza(g, p, x, y, tam) {
    tam = tam || 96;
    g.save();
    g.font = tam + "px 'DejaVu Sans', 'Segoe UI Symbol', 'Noto Sans Symbols 2', serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    const w = blanca(p);
    g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 10; g.shadowOffsetY = 4;
    g.lineWidth = tam * 0.06; g.strokeStyle = w ? "#3a2c1c" : "#d9c9a8";
    g.strokeText(GLIFO[p.toLowerCase()], x, y + tam * 0.04);
    g.shadowColor = "transparent";
    g.fillStyle = w ? "#fbf3e0" : "#2a2230";
    g.fillText(GLIFO[p.toLowerCase()], x, y + tam * 0.04);
    g.restore();
  }

  return {
    tecla(j, a) {
      if (fin || pensando || anim) return;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) {
        let [f, c] = FC(cursor);
        const s = girado ? -1 : 1;
        f = Math.max(0, Math.min(7, f + d[0] * s)); c = Math.max(0, Math.min(7, c + d[1] * s));
        cursor = IDX(f, c); J.sonido("clic"); return;
      }
      if (a !== "ok") return;
      if (elegida >= 0) {
        const m = ms.find((m) => m.de === elegida && m.a === cursor);
        if (m) return hacer(m);
      }
      if (ms.some((m) => m.de === cursor)) { elegida = cursor; J.sonido("clic"); }
      else if (colorDe(E.b[cursor]) === E.t) { J.sonido("error"); J.aviso(enJaque(E, E.t) ? "Estás en jaque: esa pieza no lo arregla" : "Esa pieza no puede moverse"); elegida = -1; }
      else elegida = -1;
    },
    actualizar(dt) { if (anim) { anim.t += dt / 0.28; if (anim.t >= 1) trasMover(); } },
    dibujar(g) {
      D.fondo(g, "#232027", "#0c0a0e");
      D.caja(g, X0 - 28, Y0 - 28, C * 8 + 56, C * 8 + 56, { relleno: "#3a2112", r: 18, sombra: 40 });
      for (let i = 0; i < 64; i++) {
        const [x, y] = pant(i), [f, c] = FC(i);
        g.fillStyle = (f + c) % 2 ? "#a7744b" : "#efd9b5";
        g.fillRect(x, y, C, C);
      }
      if (ultima) ultima.forEach((i) => { const [x, y] = pant(i); g.fillStyle = "rgba(232,184,92,.35)"; g.fillRect(x, y, C, C); });
      if (!fin && enJaque(E, E.t)) { const [x, y] = pant(rey(E.b, E.t)); const gr = g.createRadialGradient(x + C / 2, y + C / 2, 5, x + C / 2, y + C / 2, C * 0.7); gr.addColorStop(0, "rgba(239,91,91,.9)"); gr.addColorStop(1, "rgba(239,91,91,0)"); g.fillStyle = gr; g.fillRect(x, y, C, C); }
      // coordenadas
      for (let k = 0; k < 8; k++) {
        const col = girado ? 7 - k : k, fil = girado ? k + 1 : 8 - k;
        D.texto(g, "abcdefgh"[col], X0 + k * C + C - 12, Y0 + 8 * C - 12, { tam: 18, alin: "right", color: "rgba(60,40,20,.7)", sombra: false });
        D.texto(g, fil, X0 + 8, Y0 + k * C + 16, { tam: 18, color: "rgba(60,40,20,.7)", sombra: false });
      }
      const humano = !J.jugadores[turnoIdx()].cpu && !fin && !anim && !pensando;
      if (humano && elegida >= 0) ms.filter((m) => m.de === elegida).forEach((m) => {
        const [x, y] = pant(m.a);
        g.fillStyle = "rgba(95,211,141,.8)";
        if (m.cap) { g.strokeStyle = "rgba(95,211,141,.9)"; g.lineWidth = 8; g.beginPath(); g.arc(x + C / 2, y + C / 2, C * 0.44, 0, 7); g.stroke(); }
        else { g.beginPath(); g.arc(x + C / 2, y + C / 2, 16, 0, 7); g.fill(); }
      });
      for (let i = 0; i < 64; i++) {
        const p = E.b[i];
        if (p === "." || (anim && i === anim.m.de)) continue;
        const [x, y] = pant(i);
        if (i === elegida) { g.fillStyle = "rgba(95,211,141,.35)"; g.fillRect(x, y, C, C); }
        pieza(g, p, x + C / 2, y + C / 2);
      }
      if (anim) {
        const a = pant(anim.m.de), b = pant(anim.m.a), e = anim.t * anim.t * (3 - 2 * anim.t);
        pieza(g, anim.p, a[0] + (b[0] - a[0]) * e + C / 2, a[1] + (b[1] - a[1]) * e + C / 2 - Math.sin(e * Math.PI) * 20, 104);
      }
      if (humano) { const [x, y] = pant(cursor); D.cursor(g, x, y, C, C, "#ffd98a"); }
      // panel
      D.titulo(g, "Ajedrez", 1250, 110);
      const filas = [1, 0].map((i) => ({ nombre: J.jugadores[i].nombre, color: i === 0 ? "#fbf3e0" : "#2a2230", detalle: i === 0 ? "Blancas · empiezan" : "Negras", activo: turnoIdx() === i && !fin }));
      D.marcador(g, filas, 1250, 190, 560);
      // piezas capturadas
      const cap = (lista, y) => lista.slice().sort((a, b) => VAL[b.toLowerCase()] - VAL[a.toLowerCase()]).forEach((p, k) => pieza(g, p, 1275 + (k % 12) * 44, y + Math.floor(k / 12) * 46, 44));
      cap(capturadas.b, 420); cap(capturadas.w, 520);
      D.texto(g, pensando ? "La máquina piensa…" : msg, 1250, 640, { tam: 40, color: msg ? "#ef8b7b" : "#ffd98a", peso: 700 });
      D.texto(g, "Elige pieza con OK y luego la casilla.", 1250, 720, { tam: 26, color: "#a79db3", peso: 400 });
      D.texto(g, "Los peones que llegan al final coronan en dama.", 1250, 760, { tam: 26, color: "#a79db3", peso: 400 });
    }
  };
});
