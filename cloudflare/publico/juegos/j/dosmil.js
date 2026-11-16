Salon.juego("dosmil", function (J) {
  const D = Salon.dib;
  const N = 4, C = 210, G = 18, X0 = 960 - (N * C + (N + 1) * G) / 2 - 300, Y0 = 540 - (N * C + (N + 1) * G) / 2;
  const COL = { 2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563", 32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61", 512: "#edc850", 1024: "#edc53f", 2048: "#edc22e" };
  let tab = Array.from({ length: N }, () => Array(N).fill(0)), puntos = 0, fin = false, ganado = false, pop = {}, nuevos = {};
  function libres() { const l = []; for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) if (!tab[f][c]) l.push([f, c]); return l; }
  function añadir() { const l = libres(); if (!l.length) return; const [f, c] = J.elegir(l); tab[f][c] = Math.random() < 0.9 ? 2 : 4; nuevos[f + "," + c] = 0; }
  añadir(); añadir();
  function desliza(fila) {
    const v = fila.filter((x) => x), out = [], unidos = [];
    for (let i = 0; i < v.length; i++) {
      if (v[i] === v[i + 1]) { out.push(v[i] * 2); puntos += v[i] * 2; unidos.push(out.length - 1); i++; }
      else out.push(v[i]);
    }
    while (out.length < N) out.push(0);
    return { out, unidos };
  }
  function mover(d) {
    const antes = JSON.stringify(tab);
    pop = {}; nuevos = {};
    for (let k = 0; k < N; k++) {
      let linea = [];
      for (let i = 0; i < N; i++) {
        const [f, c] = d === "izquierda" ? [k, i] : d === "derecha" ? [k, N - 1 - i] : d === "arriba" ? [i, k] : [N - 1 - i, k];
        linea.push(tab[f][c]);
      }
      const { out, unidos } = desliza(linea);
      for (let i = 0; i < N; i++) {
        const [f, c] = d === "izquierda" ? [k, i] : d === "derecha" ? [k, N - 1 - i] : d === "arriba" ? [i, k] : [N - 1 - i, k];
        tab[f][c] = out[i];
        if (unidos.includes(i)) pop[f + "," + c] = 0;
      }
    }
    if (JSON.stringify(tab) === antes) return;
    J.sonido(Object.keys(pop).length ? "punto" : "mover");
    añadir();
    if (!ganado && tab.flat().includes(2048)) { ganado = true; J.aviso("¡2048! Puedes seguir jugando"); J.sonido("ganar"); }
    if (!puedeMover()) {
      fin = true;
      const r = J.record(puntos, true);
      J.despues(900, () => J.terminar({ puntos, bien: r.nuevo || ganado, titulo: puntos + " puntos", texto: "Ficha más alta: " + Math.max(...tab.flat()) + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor) }));
    }
  }
  function puedeMover() {
    if (libres().length) return true;
    for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) if ((c < N - 1 && tab[f][c] === tab[f][c + 1]) || (f < N - 1 && tab[f][c] === tab[f + 1][c])) return true;
    return false;
  }
  J.turno(0);
  return {
    tecla(j, a) { if (!fin && a !== "ok") mover(a); },
    actualizar(dt) { for (const k in pop) pop[k] += dt; for (const k in nuevos) nuevos[k] += dt; },
    dibujar(g) {
      D.fondo(g, "#2a2520", "#0e0c0a");
      const L = N * C + (N + 1) * G;
      D.caja(g, X0, Y0, L, L, { relleno: "#bbada0", r: 24, sombra: 40 });
      for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
        const x = X0 + G + c * (C + G), y = Y0 + G + f * (C + G), v = tab[f][c], k = f + "," + c;
        D.caja(g, x, y, C, C, { relleno: "rgba(238,228,218,.35)", r: 14 });
        if (!v) continue;
        let s = 1;
        if (pop[k] != null && pop[k] < 0.15) s = 1 + Math.sin((pop[k] / 0.15) * Math.PI) * 0.12;
        if (nuevos[k] != null && nuevos[k] < 0.15) s = nuevos[k] / 0.15;
        g.save(); g.translate(x + C / 2, y + C / 2); g.scale(s, s);
        D.caja(g, -C / 2, -C / 2, C, C, { relleno: COL[v] || "#3c3a32", r: 14 });
        D.texto(g, v, 0, 4, { tam: v < 100 ? 96 : v < 1000 ? 80 : 62, alin: "center", peso: 700, sombra: false, color: v <= 4 ? "#776e65" : "#f9f6f2" });
        g.restore();
      }
      const px = X0 + L + 90;
      D.titulo(g, "2048", px, 180, { tam: 110 });
      D.texto(g, "Puntos", px, 330, { tam: 30, color: "#a79db3" }); D.texto(g, puntos, px, 390, { tam: 70, titulo: true });
      D.texto(g, "Junta números iguales con las flechas.", px, 520, { tam: 28, color: "#cfc6dd", peso: 400 });
      D.texto(g, "Llega a 2048… o más allá.", px, 562, { tam: 28, color: "#cfc6dd", peso: 400 });
    }
  };
});
