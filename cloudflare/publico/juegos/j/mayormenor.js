Salon.juego("mayormenor", function (J) {
  const D = Salon.dib, K = Salon.cartas;
  const VIDAS = 3;
  let mazo = K.barajar(K.baraja()), actual = mazo.pop(), siguiente = null, turno = 0, opcion = 0, fase = "elegir", msg = "", fin = false, giro = 0;
  const puntos = J.jugadores.map(() => 0), vidas = J.jugadores.map(() => VIDAS), racha = J.jugadores.map(() => 0), mejorRacha = J.jugadores.map(() => 0);
  const nombre = (c) => ({ 1: "As", 11: "J", 12: "Q", 13: "K" }[c.valor] || c.valor);
  function adivinar(op) {
    if (fase !== "elegir" || fin) return;
    if (!mazo.length) mazo = K.barajar(K.baraja());
    siguiente = mazo.pop(); fase = "girando"; giro = 0;
    const nom = J.jugadores[turno].nombre;
    J.despues(650, () => {
      const igual = siguiente.valor === actual.valor;
      const acierto = igual ? null : op === 0 ? siguiente.valor > actual.valor : siguiente.valor < actual.valor;
      if (acierto === null) { msg = "¡Igual! No cuenta"; J.sonido("tic"); }
      else if (acierto) { puntos[turno]++; racha[turno]++; mejorRacha[turno] = Math.max(mejorRacha[turno], racha[turno]); msg = "¡Bien, " + nom + "! Racha de " + racha[turno]; J.sonido("punto"); }
      else { vidas[turno]--; racha[turno] = 0; msg = "Fallo de " + nom + (vidas[turno] ? "" : ": sin vidas"); J.sonido("error"); }
      actual = siguiente; siguiente = null;
      J.despues(900, () => {
        if (vidas.every((v) => v <= 0)) return acabar();
        if (acierto === false || J.n > 1) { do { turno = (turno + 1) % J.n; } while (vidas[turno] <= 0); }
        fase = "elegir"; J.turno(turno);
        if (J.jugadores[turno].cpu) J.despues(700, jugarMaquina);
      });
    });
  }
  function jugarMaquina() { adivinar(actual.valor <= 7 ? 0 : 1); }
  function acabar() {
    fin = true;
    if (J.n === 1) { const r = J.record(puntos[0], true); return J.terminar({ puntos: puntos[0], bien: r.nuevo, icono: "⇅", titulo: puntos[0] + " aciertos", texto: "Mejor racha: " + mejorRacha[0] + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor) }); }
    const max = Math.max(...puntos), g = puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
    J.terminar({ ganador: g.length === 1 ? g[0] : null, texto: J.jugadores.map((p, i) => p.nombre + ": " + puntos[i]).join(" · ") });
  }
  J.turno(0);
  if (J.jugadores[0].cpu) J.despues(700, jugarMaquina);
  return {
    tecla(j, a) {
      if (fase !== "elegir" || fin) return;
      if (a === "arriba") adivinar(0);
      else if (a === "abajo") adivinar(1);
      else if (a === "izquierda" || a === "derecha") opcion = 1 - opcion;
      else if (a === "ok") adivinar(opcion);
    },
    actualizar(dt) { giro = Math.min(1, giro + dt * 2.5); },
    dibujar(g) {
      D.fondo(g, "#1d2a4a", "#070b16");
      D.titulo(g, "Mayor o menor", 960, 90, { alin: "center" });
      K.dibujar(g, actual, 520, 230, 300);
      if (siguiente) { const e = Math.abs(Math.cos(giro * Math.PI)); g.save(); g.translate(1250, 0); g.scale(Math.max(0.05, e), 1); K.dibujar(g, siguiente, -150, 230, 300, { bocaAbajo: giro < 0.5 }); g.restore(); }
      else K.dibujar(g, null, 1100, 230, 300, { bocaAbajo: true });
      D.texto(g, "La carta es un " + nombre(actual), 670, 720, { tam: 34, alin: "center", color: "#cfc6dd" });
      if (!fin && fase === "elegir" && !J.jugadores[turno].cpu) {
        ["▲ Mayor", "▼ Menor"].forEach((t, k) => {
          const x = 1100 + k * 160;
          D.caja(g, x - 10, 680, 150, 80, { relleno: k === opcion ? "#e8b85c" : "rgba(255,255,255,.08)", r: 16 });
          D.texto(g, t, x + 65, 721, { tam: 28, alin: "center", peso: 700, color: k === opcion ? "#2a1a05" : "#f6efe2", sombra: false });
        });
      }
      D.texto(g, msg, 960, 830, { tam: 36, alin: "center", color: "#ffd98a" });
      J.jugadores.forEach((p, i) => {
        const w = Math.min(440, 1800 / J.n), x = 960 - (J.n * w) / 2 + i * w;
        D.caja(g, x + 6, 900, w - 12, 110, { relleno: i === turno && !fin ? "rgba(255,217,138,.14)" : "rgba(255,255,255,.05)", borde: i === turno && !fin ? "#e8b85c" : "rgba(255,255,255,.1)", r: 16 });
        D.ficha(g, x + 40, 935, 16, p.color, { anillo: false });
        D.texto(g, p.nombre, x + 66, 935, { tam: 24, peso: 700, max: w - 160 });
        D.texto(g, puntos[i], x + w - 30, 950, { tam: 44, alin: "right", titulo: true });
        D.texto(g, "♥".repeat(Math.max(0, vidas[i])) + "♡".repeat(VIDAS - Math.max(0, vidas[i])), x + 40, 980, { tam: 26, color: "#ef5b5b" });
      });
    }
  };
});
