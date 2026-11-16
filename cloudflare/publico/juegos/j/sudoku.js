Salon.juego("sudoku", function (J) {
  const D = Salon.dib;
  const C = 104, X0 = 140, Y0 = 72;
  // ---- generador con solución única ----
  function puede(t, i, v) {
    const f = Math.floor(i / 9), c = i % 9, bf = f - (f % 3), bc = c - (c % 3);
    for (let k = 0; k < 9; k++) if (t[f * 9 + k] === v || t[k * 9 + c] === v || t[(bf + Math.floor(k / 3)) * 9 + bc + (k % 3)] === v) return false;
    return true;
  }
  function llenar(t) {
    const i = t.indexOf(0);
    if (i < 0) return true;
    for (const v of Salon.cartas.barajar([1, 2, 3, 4, 5, 6, 7, 8, 9])) { if (puede(t, i, v)) { t[i] = v; if (llenar(t)) return true; t[i] = 0; } }
    return false;
  }
  function contar(t, limite) {
    let mejor = -1, opciones = null;
    for (let i = 0; i < 81; i++) if (!t[i]) {
      const o = []; for (let v = 1; v <= 9; v++) if (puede(t, i, v)) o.push(v);
      if (!o.length) return 0;
      if (!opciones || o.length < opciones.length) { mejor = i; opciones = o; if (o.length === 1) break; }
    }
    if (mejor < 0) return 1;
    let n = 0;
    for (const v of opciones) { t[mejor] = v; n += contar(t, limite - n); t[mejor] = 0; if (n >= limite) break; }
    return n;
  }
  const solucion = Array(81).fill(0);
  llenar(solucion);
  const pistas = [0, 38, 31, 26][J.dificultad];
  const tab = solucion.slice();
  const orden = Salon.cartas.barajar([...Array(81).keys()]);
  let quedan = 81;
  for (const i of orden) {
    if (quedan <= pistas) break;
    const v = tab[i]; tab[i] = 0;
    if (contar(tab.slice(), 2) !== 1) tab[i] = v; else quedan--;
  }
  const fija = tab.map((v) => v > 0);
  let cursor = 40, eligiendo = false, opcion = 0, fin = false, t = 0, errores = 0;
  while (fija[cursor]) cursor++;
  function conflicto(i) {
    const v = tab[i]; if (!v) return false;
    const f = Math.floor(i / 9), c = i % 9;
    for (let k = 0; k < 81; k++) {
      if (k === i || tab[k] !== v) continue;
      const kf = Math.floor(k / 9), kc = k % 9;
      if (kf === f || kc === c || (Math.floor(kf / 3) === Math.floor(f / 3) && Math.floor(kc / 3) === Math.floor(c / 3))) return true;
    }
    return false;
  }
  function poner(v) {
    tab[cursor] = v;
    if (v && v !== solucion[cursor]) { errores++; J.sonido("error"); } else J.sonido("clic");
    if (tab.every((x, i) => x === solucion[i])) {
      fin = true;
      const seg = Math.round(t), r = J.record(seg, false, "t" + J.dificultad);
      J.despues(800, () => J.terminar({ puntos: seg, bien: true, icono: "🏆", titulo: "¡Sudoku resuelto!", texto: Math.floor(seg / 60) + " min " + (seg % 60) + " s" + (r.nuevo ? " · ¡Nuevo récord en este nivel!" : " · Récord: " + Math.floor(r.mejor / 60) + " min " + (r.mejor % 60) + " s") }));
    }
  }
  J.turno(0);
  const OPC = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  return {
    tecla(j, a) {
      if (fin) return;
      if (eligiendo) {
        if (a === "izquierda") opcion = (opcion + 9) % 10;
        else if (a === "derecha") opcion = (opcion + 1) % 10;
        else if (a === "arriba") opcion = (opcion + 5) % 10;
        else if (a === "abajo") opcion = (opcion + 5) % 10;
        else if (a === "ok") { poner(OPC[opcion]); eligiendo = false; }
        return;
      }
      const f = Math.floor(cursor / 9), c = cursor % 9;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = ((f + d[0] + 9) % 9) * 9 + ((c + d[1] + 9) % 9); return; }
      if (a === "ok") { if (fija[cursor]) { J.sonido("error"); return; } eligiendo = true; opcion = tab[cursor] ? tab[cursor] - 1 : 0; J.sonido("clic"); }
    },
    actualizar(dt) { if (!fin) t += dt; },
    dibujar(g) {
      D.fondo(g, "#1f1d2b", "#0a0910");
      D.caja(g, X0 - 16, Y0 - 16, C * 9 + 32, C * 9 + 32, { relleno: "#f6f1e4", r: 18, sombra: 40 });
      const cf = Math.floor(cursor / 9), cc = cursor % 9;
      for (let i = 0; i < 81; i++) {
        const f = Math.floor(i / 9), c = i % 9, x = X0 + c * C, y = Y0 + f * C;
        const mismaZona = f === cf || c === cc || (Math.floor(f / 3) === Math.floor(cf / 3) && Math.floor(c / 3) === Math.floor(cc / 3));
        if (!fin && mismaZona) { g.fillStyle = "rgba(76,195,240,.12)"; g.fillRect(x, y, C, C); }
        if (!fin && tab[cursor] && tab[i] === tab[cursor]) { g.fillStyle = "rgba(242,184,75,.3)"; g.fillRect(x, y, C, C); }
        if (tab[i]) D.texto(g, tab[i], x + C / 2, y + C / 2 + 3, { tam: 60, alin: "center", sombra: false, peso: fija[i] ? 700 : 500, color: fija[i] ? "#1d1b24" : conflicto(i) || tab[i] !== solucion[i] ? "#d8343f" : "#2f6fd6" });
      }
      for (let k = 0; k <= 9; k++) {
        g.strokeStyle = k % 3 ? "rgba(0,0,0,.2)" : "#1d1b24"; g.lineWidth = k % 3 ? 2 : 5;
        g.beginPath(); g.moveTo(X0 + k * C, Y0); g.lineTo(X0 + k * C, Y0 + 9 * C); g.stroke();
        g.beginPath(); g.moveTo(X0, Y0 + k * C); g.lineTo(X0 + 9 * C, Y0 + k * C); g.stroke();
      }
      if (!fin) D.cursor(g, X0 + cc * C, Y0 + cf * C, C, C, "#e8b85c");
      const px = 1150;
      D.titulo(g, "Sudoku", px, 120);
      D.texto(g, ["", "Fácil", "Medio", "Difícil"][J.dificultad] + " · ⏱ " + Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0"), px, 200, { tam: 32, color: "#a79db3" });
      D.texto(g, errores ? errores + (errores === 1 ? " fallo" : " fallos") : "Sin fallos", px, 250, { tam: 28, color: errores ? "#ef8b7b" : "#5fd38d" });
      if (eligiendo) {
        D.texto(g, "Elige un número", px, 350, { tam: 32, color: "#ffd98a" });
        OPC.forEach((v, k) => {
          const x = px + (k % 5) * 130, y = 390 + Math.floor(k / 5) * 130;
          D.caja(g, x, y, 116, 116, { relleno: k === opcion ? "#e8b85c" : "rgba(255,255,255,.07)", r: 18, borde: k === opcion ? "#ffd98a" : "rgba(255,255,255,.12)" });
          D.texto(g, v || "⌫", x + 58, y + 60, { tam: 54, alin: "center", color: k === opcion ? "#2a1a05" : "#f6efe2", sombra: false });
        });
        D.texto(g, "◀ ▶ ▲ ▼ elegir · OK poner", px, 700, { tam: 26, color: "#a79db3", peso: 400 });
      } else {
        ["Flechas: moverte", "OK: escribir un número", "Los números en azul los pones tú;", "si uno no encaja, sale en rojo."].forEach((s, k) => D.texto(g, s, px, 380 + k * 46, { tam: 28, color: "#cfc6dd", peso: 400 }));
      }
    }
  };
});
