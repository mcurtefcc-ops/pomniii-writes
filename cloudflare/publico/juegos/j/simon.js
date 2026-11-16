Salon.juego("simon", function (J) {
  const D = Salon.dib;
  const PADS = [
    { a: "arriba", c: "#3fbf6f", f: 392, ang: -Math.PI / 2 },
    { a: "derecha", c: "#e5484d", f: 330, ang: 0 },
    { a: "abajo", c: "#3f8be8", f: 262, ang: Math.PI / 2 },
    { a: "izquierda", c: "#f2c230", f: 523, ang: Math.PI }
  ];
  const DUR = [0, 0.6, 0.45, 0.32][J.dificultad];
  const sec = [];
  let fase = "mostrar", k = 0, t = 0, encendido = -1, brillo = 0, fin = false, ronda = 0;
  function nuevaRonda() { sec.push(J.entero(0, 3)); ronda = sec.length; fase = "mostrar"; k = 0; t = -0.6; }
  function encender(i) { encendido = i; brillo = 1; Salon.tono(PADS[i].f, DUR * 0.9); }
  nuevaRonda();
  J.turno(0);
  return {
    tecla(j, a) {
      if (fase !== "repetir" || fin) return;
      const i = PADS.findIndex((p) => p.a === a);
      if (i < 0) return;
      encender(i);
      if (sec[k] !== i) {
        fin = true; J.sonido("perder");
        const pts = ronda - 1, r = J.record(pts, true, "r" + J.dificultad);
        return J.despues(900, () => J.terminar({ puntos: pts, bien: r.nuevo, icono: "🔴", titulo: pts + (pts === 1 ? " ronda" : " rondas"), texto: r.nuevo ? "¡Nuevo récord en este nivel!" : "Récord: " + r.mejor }));
      }
      k++;
      if (k === sec.length) { fase = "bien"; J.despues(700, nuevaRonda); }
    },
    actualizar(dt) {
      brillo = Math.max(0, brillo - dt / (DUR * 0.8));
      if (fase === "mostrar") {
        t += dt;
        if (t >= DUR) { t = 0; if (k < sec.length) { encender(sec[k]); k++; } else { fase = "repetir"; k = 0; } }
      }
    },
    dibujar(g) {
      D.fondo(g, "#1d1a26", "#08070c");
      const cx = 760, cy = 560;
      PADS.forEach((p, i) => {
        const on = i === encendido && brillo > 0;
        g.save(); g.translate(cx, cy); g.rotate(p.ang);
        g.beginPath(); g.arc(0, 0, 400, -Math.PI / 4 + 0.05, Math.PI / 4 - 0.05); g.arc(0, 0, 150, Math.PI / 4 - 0.12, -Math.PI / 4 + 0.12, true); g.closePath();
        g.fillStyle = on ? D.mezclar(p.c, 0.45 * brillo) : D.mezclar(p.c, -0.45);
        if (on) { g.shadowColor = p.c; g.shadowBlur = 60 * brillo; }
        g.fill(); g.restore();
      });
      D.ficha(g, cx, cy, 130, "#2a2534", { anillo: false });
      D.texto(g, ronda, cx, cy - 10, { tam: 90, alin: "center", titulo: true });
      D.texto(g, "ronda", cx, cy + 55, { tam: 26, alin: "center", color: "#a79db3" });
      const px = 1290;
      D.titulo(g, "Simón", px, 200, { tam: 80 });
      D.texto(g, fase === "mostrar" ? "Mira la secuencia…" : fase === "repetir" ? "¡Tu turno! Repítela" : fin ? "" : "¡Bien!", px, 330, { tam: 40, color: "#ffd98a" });
      ["Cada flecha es un color:", "▲ verde · ▶ rojo", "▼ azul · ◀ amarillo"].forEach((s, i) => D.texto(g, s, px, 450 + i * 50, { tam: 30, color: "#cfc6dd", peso: 400 }));
    }
  };
});
