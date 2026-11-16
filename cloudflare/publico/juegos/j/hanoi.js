Salon.juego("hanoi", function (J) {
  const D = Salon.dib;
  const N = [0, 3, 5, 7][J.dificultad], MIN = Math.pow(2, N) - 1;
  const torres = [[...Array(N).keys()].map((i) => N - i), [], []]; // número = tamaño, el último es el de arriba
  let sel = 0, mano = null, movs = 0, fin = false, t = 0;
  const X = [480, 960, 1440], BASE = 860, H = 54;
  const ancho = (n) => 80 + (n / N) * 300;
  const COLS = ["#ef5b5b", "#ff8f5a", "#f2b84b", "#5fd38d", "#4cc3f0", "#4c7bf0", "#b38cff"];
  J.turno(0);
  return {
    tecla(j, a) {
      if (fin) return;
      if (a === "izquierda") { sel = (sel + 2) % 3; J.sonido("clic"); }
      else if (a === "derecha") { sel = (sel + 1) % 3; J.sonido("clic"); }
      else if (a === "ok" || a === "arriba" || a === "abajo") {
        if (mano === null) {
          if (!torres[sel].length) { J.sonido("error"); return; }
          mano = { n: torres[sel].pop(), de: sel }; J.sonido("mover");
        } else {
          const arriba = torres[sel][torres[sel].length - 1];
          if (arriba && arriba < mano.n) { J.sonido("error"); J.aviso("No puedes poner un disco grande sobre uno pequeño"); return; }
          torres[sel].push(mano.n);
          if (sel !== mano.de) movs++;
          mano = null; J.sonido("golpe");
          if (torres[2].length === N) {
            fin = true;
            const r = J.record(movs, false, "m" + N);
            J.despues(800, () => J.terminar({ puntos: movs, bien: true, icono: "🗼", titulo: movs === MIN ? "¡Perfecto!" : "¡Torre completada!", texto: movs + " movimientos (el mínimo es " + MIN + ")" + (r.nuevo ? " · ¡Nuevo récord!" : "") }));
          }
        }
      }
    },
    actualizar(dt) { if (!fin) t += dt; },
    dibujar(g) {
      D.fondo(g, "#22263a", "#0a0b12");
      D.titulo(g, "Torres de Hanói", 960, 110, { alin: "center" });
      D.texto(g, "Movimientos: " + movs + "   ·   Mínimo posible: " + MIN, 960, 190, { tam: 32, alin: "center", color: "#a79db3" });
      D.caja(g, 180, BASE, 1560, 40, { relleno: "#6b4a2f", r: 12, sombra: 20 });
      X.forEach((x, i) => {
        D.caja(g, x - 12, BASE - H * (N + 1.5), 24, H * (N + 1.5), { relleno: "#8a6342", r: 10 });
        torres[i].forEach((n, k) => {
          const w = ancho(n);
          D.caja(g, x - w / 2, BASE - (k + 1) * H, w, H - 6, { relleno: COLS[(n - 1) % COLS.length], r: 14, sombra: 8 });
        });
        if (i === 2) D.texto(g, "Meta", x, BASE + 80, { tam: 30, alin: "center", color: "#ffd98a" });
      });
      if (!fin) {
        const x = X[sel];
        if (mano) { const w = ancho(mano.n); D.caja(g, x - w / 2, BASE - H * (N + 3) + Math.sin(J.tiempo * 5) * 8, w, H - 6, { relleno: COLS[(mano.n - 1) % COLS.length], r: 14, sombra: 25 }); }
        D.texto(g, "▼", x, BASE - H * (N + 4.3), { tam: 50, alin: "center", color: "#ffd98a" });
      }
      D.ayuda(g, "◀ ▶ elegir torre · OK coger o soltar disco · pasa toda la torre a la derecha");
    }
  };
});
