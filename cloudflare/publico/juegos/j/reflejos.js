Salon.juego("reflejos", function (J) {
  const D = Salon.dib;
  const RONDAS = 10;
  const puntos = J.jugadores.map(() => 0);
  let ronda = 0, fase = "inicio", t = 0, espera = 0, tiempos = [], adelantados = [], ganador = -1, fin = false;
  function nuevaRonda() {
    ronda++;
    if (ronda > RONDAS) return acabar();
    fase = "espera"; t = 0; espera = J.azar(1.6, 4.5);
    tiempos = J.jugadores.map(() => null); adelantados = J.jugadores.map(() => false); ganador = -1;
    J.jugadores.forEach((p, i) => {
      if (!p.cpu) return;
      if (J.dificultad === 1 && Math.random() < 0.12) J.despues(J.azar(0.5, espera - 0.1) * 1000, () => pulsar(i));
    });
  }
  function ya() {
    fase = "ya"; t = 0; J.sonido("gol");
    J.jugadores.forEach((p, i) => {
      if (!p.cpu || adelantados[i]) return;
      const [a, b] = [[0, 0], [0.42, 0.7], [0.29, 0.45], [0.2, 0.3]][J.dificultad];
      J.despues(J.azar(a, b) * 1000, () => pulsar(i));
    });
  }
  function pulsar(i) {
    if (fin) return;
    if (fase === "espera") {
      if (adelantados[i]) return;
      adelantados[i] = true; puntos[i] = Math.max(0, puntos[i] - 1); J.sonido("error");
      J.aviso(J.jugadores[i].nombre + " se adelanta: −1");
      return;
    }
    if (fase !== "ya" || adelantados[i] || tiempos[i] !== null) return;
    tiempos[i] = t;
    if (ganador < 0) { ganador = i; puntos[i]++; J.sonido("punto"); }
    if (J.jugadores.every((p, k) => tiempos[k] !== null || adelantados[k])) J.despues(400, resultado);
  }
  function resultado() { if (fase === "ya") { fase = "resultado"; J.despues(1800, nuevaRonda); } }
  function acabar() {
    fin = true;
    if (J.n === 1) {
      const r = J.record(puntos[0], true);
      return J.terminar({ puntos: puntos[0], bien: r.nuevo, icono: "⚡", titulo: puntos[0] + " de " + RONDAS, texto: "Mejor reacción: " + (mejor[0] ? Math.round(mejor[0] * 1000) + " ms" : "—") + (r.nuevo ? " · ¡Nuevo récord!" : "") });
    }
    const max = Math.max(...puntos), g = puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
    J.terminar({ ganador: g.length === 1 ? g[0] : null, texto: J.jugadores.map((p, i) => p.nombre + ": " + puntos[i] + (mejor[i] ? " (mejor " + Math.round(mejor[i] * 1000) + " ms)" : "")).join(" · ") });
  }
  const mejor = J.jugadores.map(() => null);
  J.turno(0);
  J.despues(1500, nuevaRonda);
  return {
    tecla(j, a) { if (a === "ok") pulsar(j); },
    respuesta(j) { pulsar(j); },
    actualizar(dt) {
      t += dt;
      if (fase === "espera" && t >= espera) ya();
      if (fase === "ya") {
        tiempos.forEach((x, i) => { if (x !== null && (mejor[i] === null || x < mejor[i])) mejor[i] = x; });
        if (t > 2.5) resultado();
      }
    },
    dibujar(g) {
      const col = fase === "ya" ? "#2fbf62" : fase === "espera" ? "#c0392b" : "#2a2238";
      g.fillStyle = col; g.fillRect(0, 0, 1920, 1080);
      const texto = fase === "inicio" ? "Prepárate…" : fase === "espera" ? "Espera…" : fase === "ya" ? "¡YA!" : ganador >= 0 ? "¡" + J.jugadores[ganador].nombre + "!" : "Nadie a tiempo";
      D.texto(g, texto, 960, 380, { tam: fase === "ya" ? 260 : 140, alin: "center", titulo: true, color: "#fff" });
      if (fase !== "inicio") D.texto(g, "Ronda " + Math.min(ronda, RONDAS) + " de " + RONDAS, 960, 120, { tam: 36, alin: "center", color: "rgba(255,255,255,.75)" });
      const w = Math.min(440, 1800 / J.n);
      J.jugadores.forEach((p, i) => {
        const x = 960 - (J.n * w) / 2 + i * w, y = 680;
        D.caja(g, x + 6, y, w - 12, 220, { relleno: "rgba(0,0,0,.25)", borde: i === ganador && fase !== "espera" ? "#fff" : "rgba(255,255,255,.15)", grosor: i === ganador ? 6 : 2, r: 20 });
        D.ficha(g, x + 44, y + 44, 18, p.color, { anillo: false });
        D.texto(g, p.nombre, x + 72, y + 44, { tam: 26, peso: 700, max: w - 100 });
        D.texto(g, puntos[i], x + 34, y + 130, { tam: 70, titulo: true });
        const estado = adelantados[i] ? "¡Antes de tiempo!" : tiempos[i] !== null ? Math.round(tiempos[i] * 1000) + " ms" : "";
        D.texto(g, estado, x + w - 30, y + 130, { tam: 28, alin: "right", peso: 700, color: adelantados[i] ? "#ffd0c8" : "#fff" });
      });
      D.ayuda(g, "Pulsa OK (o el botón del móvil) cuando la pantalla se ponga verde. Si te adelantas, pierdes un punto.");
    }
  };
});
