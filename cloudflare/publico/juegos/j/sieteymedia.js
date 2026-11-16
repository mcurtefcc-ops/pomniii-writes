Salon.juego("sieteymedia", function (J) {
  const D = Salon.dib, K = Salon.cartas;
  const RONDAS = 5, APUESTA = 10;
  const fichas = J.jugadores.map(() => 100);
  let mazo = [], manos = [], banca = [], turno = 0, ronda = 0, fase = "", opcion = 0, msg = "", resultados = [], fin = false;
  const valor = (m) => m.reduce((s, c) => s + (c.valor >= 10 ? 0.5 : c.valor), 0);
  const txt = (v) => (v % 1 ? Math.floor(v) + " y media" : String(v)).replace(/^0 y media$/, "media");
  const robar = () => { if (!mazo.length) mazo = K.barajar(K.baraja("es")); return mazo.pop(); };
  function nuevaRonda() {
    ronda++; resultados = []; mazo = K.barajar(K.baraja("es"));
    manos = J.jugadores.map(() => [robar()]);
    banca = [robar()];
    turno = 0; fase = "jugar"; msg = "Ronda " + ronda + " de " + RONDAS;
    empezarTurno();
  }
  function empezarTurno() {
    if (turno >= J.n) return juegaBanca();
    opcion = 0;
    J.turno(turno);
    if (J.jugadores[turno].cpu) J.despues(800, decideMaquina);
  }
  function decideMaquina() {
    const v = valor(manos[turno]);
    const pide = v <= 4 || (v <= 5 && Math.random() < 0.6);
    const yo = turno;
    accion(pide ? 0 : 1);
    // sigue pidiendo solo si sigue siendo su turno
    if (pide && fase === "jugar" && turno === yo) J.despues(800, decideMaquina);
  }
  function accion(op) {
    if (op === 0) {
      manos[turno].push(robar()); J.sonido("clic");
      const v = valor(manos[turno]);
      if (v > 7.5) { msg = J.jugadores[turno].nombre + " se pasa (" + txt(v) + ")"; J.sonido("error"); turno++; J.despues(700, empezarTurno); }
      else if (v === 7.5) { msg = "¡" + J.jugadores[turno].nombre + " tiene siete y media!"; J.sonido("punto"); turno++; J.despues(700, empezarTurno); }
    } else { turno++; empezarTurno(); }
  }
  function juegaBanca() {
    fase = "banca"; J.turno(0);
    const paso = () => {
      if (valor(banca) < 6 && manos.some((m) => valor(m) <= 7.5)) { banca.push(robar()); J.sonido("clic"); J.despues(700, paso); }
      else J.despues(600, pagar);
    };
    J.despues(600, paso);
  }
  function pagar() {
    const vb = valor(banca);
    resultados = manos.map((m, i) => {
      const v = valor(m);
      let r;
      if (v > 7.5) r = -APUESTA;
      else if (vb > 7.5 || v > vb) r = v === 7.5 ? APUESTA * 2 : APUESTA;
      else r = -APUESTA; // los empates los gana la banca
      fichas[i] += r;
      return r;
    });
    fase = "resultado";
    msg = vb > 7.5 ? "¡La banca se pasa!" : "La banca tiene " + txt(vb) + " (los empates son para la banca)";
    J.sonido(resultados.some((r) => r > 0) ? "punto" : "perder");
    J.despues(2600, () => (ronda >= RONDAS ? acabar() : nuevaRonda()));
  }
  function acabar() {
    fin = true;
    if (J.n === 1) { const r = J.record(fichas[0], true); return J.terminar({ puntos: fichas[0], bien: fichas[0] > 100, icono: fichas[0] > 100 ? "💰" : "🂠", titulo: "Terminas con " + fichas[0] + " fichas", texto: r.nuevo ? "¡Nuevo récord!" : "Récord: " + r.mejor }); }
    const max = Math.max(...fichas), g = fichas.map((f, i) => (f === max ? i : -1)).filter((i) => i >= 0);
    J.terminar({ ganador: g.length === 1 ? g[0] : null, texto: J.jugadores.map((p, i) => p.nombre + ": " + fichas[i]).join(" · ") });
  }
  nuevaRonda();
  const CW = 120;
  const mano = (g, cartas, x, y) => cartas.forEach((c, k) => K.dibujar(g, c, x + k * 50, y, CW));
  return {
    tecla(j, a) {
      if (fase !== "jugar" || fin) return;
      if (a === "izquierda" || a === "derecha") { opcion = 1 - opcion; J.sonido("clic"); }
      else if (a === "ok") accion(opcion);
    },
    dibujar(g) {
      D.fondo(g, "#4a1622", "#14050a");
      D.texto(g, "Banca", 960, 50, { tam: 32, alin: "center", color: "#ffd98a" });
      mano(g, banca, 960 - (banca.length * 50 + CW - 50) / 2, 80);
      D.texto(g, txt(valor(banca)), 960 + (banca.length * 50 + CW) / 2 + 30, 160, { tam: 44, titulo: true });
      D.texto(g, msg, 960, 340, { tam: 32, alin: "center", color: "#f6efe2" });
      const w = 1840 / J.n;
      J.jugadores.forEach((p, i) => {
        const x0 = 40 + i * w, activo = fase === "jugar" && i === turno;
        D.caja(g, x0 + 10, 400, w - 20, 560, { relleno: activo ? "rgba(255,217,138,.12)" : "rgba(0,0,0,.2)", borde: activo ? "#e8b85c" : "rgba(255,255,255,.08)", r: 20 });
        D.ficha(g, x0 + 50, 445, 18, p.color, { anillo: false });
        D.texto(g, p.nombre, x0 + 80, 445, { tam: 28, peso: 700, max: w - 220 });
        D.texto(g, fichas[i] + " 🪙", x0 + w - 30, 445, { tam: 26, alin: "right" });
        mano(g, manos[i], x0 + 40, 490);
        const v = valor(manos[i]);
        D.texto(g, txt(v), x0 + 40, 760, { tam: 44, titulo: true, color: v > 7.5 ? "#ef8b7b" : v === 7.5 ? "#ffd98a" : "#f6efe2" });
        if (resultados.length) { const r = resultados[i]; D.texto(g, r > 0 ? "+" + r : String(r), x0 + w - 40, 760, { tam: 40, alin: "right", peso: 700, color: r > 0 ? "#5fd38d" : "#ef8b7b" }); }
        if (activo && !p.cpu) ["Otra carta", "Me planto"].forEach((t, k) => {
          const bx = x0 + 40 + k * ((w - 100) / 2 + 20), bw = (w - 100) / 2;
          D.caja(g, bx, 840, bw, 80, { relleno: k === opcion ? "#e8b85c" : "rgba(255,255,255,.08)", r: 16, borde: k === opcion ? "#ffd98a" : "rgba(255,255,255,.15)" });
          D.texto(g, t, bx + bw / 2, 882, { tam: Math.min(30, bw / 7), alin: "center", peso: 700, color: k === opcion ? "#2a1a05" : "#f6efe2", sombra: false });
        });
      });
      D.ayuda(g, "◀ ▶ elegir · OK confirmar · Las figuras valen media. Siete y media paga doble.");
    }
  };
});
