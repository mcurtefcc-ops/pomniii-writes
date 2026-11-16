Salon.juego("deslizante", function (J) {
  const D = Salon.dib;
  const N = [0, 3, 4, 5][J.dificultad], L = 900, C = L / N, X0 = 200, Y0 = 90;
  let tab = [...Array(N * N).keys()].map((i) => (i + 1) % (N * N)); // 0 = hueco, al final
  let hueco = N * N - 1, movs = 0, fin = false, t = 0, anim = null;
  const DIR = { arriba: [1, 0], abajo: [-1, 0], izquierda: [0, 1], derecha: [0, -1] }; // pieza que se mueve, relativa al hueco
  function intentar(a, sinAnim) {
    const d = DIR[a]; if (!d) return false;
    const hf = Math.floor(hueco / N), hc = hueco % N, f = hf + d[0], c = hc + d[1];
    if (f < 0 || f >= N || c < 0 || c >= N) return false;
    const i = f * N + c;
    if (!sinAnim) anim = { pieza: tab[i], desde: i, hasta: hueco, t: 0 };
    tab[hueco] = tab[i]; tab[i] = 0; hueco = i;
    return true;
  }
  // barajar con movimientos legales (siempre resoluble)
  let previo = null;
  const opuesto = { arriba: "abajo", abajo: "arriba", izquierda: "derecha", derecha: "izquierda" };
  for (let k = 0; k < N * N * 25; k++) { const a = J.elegir(Object.keys(DIR).filter((x) => x !== opuesto[previo])); if (intentar(a, true)) previo = a; }
  const resuelto = () => tab.every((v, i) => v === (i + 1) % (N * N));
  if (resuelto()) intentar("abajo", true);
  J.turno(0);
  return {
    tecla(j, a) {
      if (fin || anim) return;
      if (intentar(a)) {
        movs++; J.sonido("mover");
        if (resuelto()) {
          fin = true;
          const r = J.record(movs, false, "m" + N);
          J.despues(800, () => J.terminar({ puntos: movs, bien: true, icono: "🧩", titulo: "¡Resuelto!", texto: movs + " movimientos en " + Math.round(t) + " s" + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor + " movimientos") }));
        }
      }
    },
    actualizar(dt) { if (!fin) t += dt; if (anim) { anim.t += dt / 0.12; if (anim.t >= 1) anim = null; } },
    dibujar(g) {
      D.fondo(g, "#20263a", "#0a0c14");
      D.caja(g, X0 - 20, Y0 - 20, L + 40, L + 40, { relleno: "#141826", r: 20, sombra: 40 });
      const pieza = (v, x, y) => {
        const gr = g.createLinearGradient(x, y, x + C, y + C);
        const h = ((v - 1) / (N * N - 1)) * 260;
        gr.addColorStop(0, "hsl(" + h + ",65%,62%)"); gr.addColorStop(1, "hsl(" + h + ",60%,45%)");
        D.caja(g, x + 6, y + 6, C - 12, C - 12, { relleno: gr, r: 16, sombra: 10 });
        D.texto(g, v, x + C / 2, y + C / 2 + 4, { tam: C * 0.42, alin: "center", peso: 700, color: "#fff" });
      };
      tab.forEach((v, i) => {
        if (!v || (anim && v === anim.pieza)) return;
        pieza(v, X0 + (i % N) * C, Y0 + Math.floor(i / N) * C);
      });
      if (anim) {
        const e = anim.t, a = [X0 + (anim.desde % N) * C, Y0 + Math.floor(anim.desde / N) * C], b = [X0 + (anim.hasta % N) * C, Y0 + Math.floor(anim.hasta / N) * C];
        pieza(anim.pieza, a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e);
      }
      const px = 1240;
      D.titulo(g, "Puzle deslizante", px, 130, { tam: 52 });
      D.texto(g, N + " × " + N, px, 210, { tam: 34, color: "#a79db3" });
      D.texto(g, "Movimientos", px, 320, { tam: 28, color: "#a79db3" }); D.texto(g, movs, px, 380, { tam: 70, titulo: true });
      D.texto(g, "Tiempo", px, 480, { tam: 28, color: "#a79db3" }); D.texto(g, Math.floor(t) + " s", px, 540, { tam: 70, titulo: true });
      D.texto(g, "Las flechas mueven una pieza al hueco.", px, 680, { tam: 28, color: "#cfc6dd", peso: 400 });
      D.texto(g, "Ordénalas del 1 al " + (N * N - 1) + ".", px, 722, { tam: 28, color: "#cfc6dd", peso: 400 });
    }
  };
});
