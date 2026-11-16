Salon.juego("veintiuna", function (J) {
  const D = Salon.dib, K = Salon.cartas;
  const RONDAS = 5, APUESTA = 10;
  const fichas = J.jugadores.map(() => 100);
  let mazo = [], manos = [], banca = [], turno = 0, ronda = 0, fase = "", opcion = 0, msg = "", resultados = [], fin = false;
  const valor = (m) => { let v = 0, ases = 0; m.forEach((c) => { const x = c.valor === 1 ? 11 : Math.min(10, c.valor); v += x; if (c.valor === 1) ases++; }); while (v > 21 && ases) { v -= 10; ases--; } return v; };
  const natural = (m) => m.length === 2 && valor(m) === 21;
  const robar = () => { if (!mazo.length) mazo = K.barajar(K.baraja().concat(K.baraja())); return mazo.pop(); };
  function nuevaRonda() {
    ronda++; resultados = [];
    manos = J.jugadores.map(() => [robar(), robar()]);
    banca = [robar(), robar()];
    turno = 0; fase = "jugar"; msg = "Ronda " + ronda + " de " + RONDAS;
    J.sonido("mover");
    empezarTurno();
  }
  function empezarTurno() {
    while (turno < J.n && natural(manos[turno])) turno++;
    if (turno >= J.n) return juegaBanca();
    opcion = 0;
    J.turno(turno);
    if (J.jugadores[turno].cpu) J.despues(800, decideMaquina);
  }
  function decideMaquina() {
    const v = valor(manos[turno]), vista = Math.min(10, banca[0].valor === 1 ? 11 : banca[0].valor);
    const pide = v < 12 || (v < 17 && vista >= 7) || (v === 12 && vista <= 3);
    const yo = turno;
    accion(pide ? 0 : 1);
    // sigue pidiendo solo si sigue siendo su turno
    if (pide && fase === "jugar" && turno === yo) J.despues(800, decideMaquina);
  }
  function accion(op) {
    if (op === 0) {
      manos[turno].push(robar()); J.sonido("clic");
      const v = valor(manos[turno]);
      if (v > 21) { msg = J.jugadores[turno].nombre + " se pasa con " + v; J.sonido("error"); turno++; J.despues(700, empezarTurno); }
      else if (v === 21) { turno++; J.despues(600, empezarTurno); }
    } else { turno++; empezarTurno(); }
  }
  function juegaBanca() {
    fase = "banca"; J.turno(0);
    const paso = () => {
      if (valor(banca) < 17 && manos.some((m) => valor(m) <= 21)) { banca.push(robar()); J.sonido("clic"); J.despues(700, paso); }
      else J.despues(600, pagar);
    };
    J.despues(700, paso);
  }
  function pagar() {
    const vb = valor(banca), nb = natural(banca);
    resultados = manos.map((m, i) => {
      const v = valor(m);
      let r;
      if (v > 21) r = -APUESTA;
      else if (natural(m) && !nb) r = APUESTA * 1.5;
      else if (nb && !natural(m)) r = -APUESTA;
      else if (vb > 21 || v > vb) r = APUESTA;
      else if (v === vb) r = 0;
      else r = -APUESTA;
      fichas[i] += r;
      return r;
    });
    fase = "resultado";
    msg = vb > 21 ? "¡La banca se pasa!" : "La banca tiene " + vb;
    J.sonido(resultados.some((r) => r > 0) ? "punto" : "perder");
    J.despues(2600, () => {
      if (ronda >= RONDAS) return acabar();
      nuevaRonda();
    });
  }
  function acabar() {
    fin = true;
    if (J.n === 1) { const r = J.record(fichas[0], true); return J.terminar({ puntos: fichas[0], bien: fichas[0] > 100, icono: fichas[0] > 100 ? "💰" : "🂠", titulo: "Terminas con " + fichas[0] + " fichas", texto: (fichas[0] >= 100 ? "Ganas " + (fichas[0] - 100) : "Pierdes " + (100 - fichas[0])) + (r.nuevo ? " · ¡Nuevo récord!" : " · Récord: " + r.mejor) }); }
    const max = Math.max(...fichas), g = fichas.map((f, i) => (f === max ? i : -1)).filter((i) => i >= 0);
    J.terminar({ ganador: g.length === 1 ? g[0] : null, texto: J.jugadores.map((p, i) => p.nombre + ": " + fichas[i]).join(" · ") });
  }
  nuevaRonda();
  const CW = 120;
  function mano(g, cartas, x, y, ocultaSegunda) { cartas.forEach((c, k) => K.dibujar(g, c, x + k * 46, y, CW, { bocaAbajo: ocultaSegunda && k === 1 })); }
  return {
    tecla(j, a) {
      if (fase !== "jugar" || fin) return;
      if (a === "izquierda" || a === "derecha") { opcion = 1 - opcion; J.sonido("clic"); }
      else if (a === "ok") accion(opcion);
    },
    dibujar(g) {
      D.fondo(g, "#0f4a32", "#041a10");
      D.texto(g, "Banca", 960, 50, { tam: 32, alin: "center", color: "#ffd98a" });
      mano(g, banca, 960 - (banca.length * 46 + CW - 46) / 2, 80, fase === "jugar");
      if (fase !== "jugar") D.texto(g, valor(banca), 960 + (banca.length * 46 + CW) / 2 + 30, 160, { tam: 50, titulo: true });
      D.texto(g, msg, 960, 340, { tam: 34, alin: "center", color: "#f6efe2" });
      const w = 1840 / J.n;
      J.jugadores.forEach((p, i) => {
        const x0 = 40 + i * w, activo = fase === "jugar" && i === turno;
        D.caja(g, x0 + 10, 400, w - 20, 560, { relleno: activo ? "rgba(255,217,138,.12)" : "rgba(0,0,0,.18)", borde: activo ? "#e8b85c" : "rgba(255,255,255,.08)", r: 20 });
        D.ficha(g, x0 + 50, 445, 18, p.color, { anillo: false });
        D.texto(g, p.nombre, x0 + 80, 445, { tam: 28, peso: 700, max: w - 220 });
        D.texto(g, fichas[i] + " 🪙", x0 + w - 30, 445, { tam: 26, alin: "right" });
        mano(g, manos[i], x0 + 40, 490);
        const v = valor(manos[i]);
        D.texto(g, natural(manos[i]) ? "¡21!" : v, x0 + 40, 760, { tam: 48, titulo: true, color: v > 21 ? "#ef8b7b" : "#f6efe2" });
        if (resultados.length) { const r = resultados[i]; D.texto(g, r > 0 ? "+" + r : r < 0 ? String(r) : "Empate", x0 + w - 40, 760, { tam: 40, alin: "right", peso: 700, color: r > 0 ? "#5fd38d" : r < 0 ? "#ef8b7b" : "#ffd98a" }); }
        if (activo && !p.cpu) ["Pedir carta", "Plantarse"].forEach((t, k) => {
          const bx = x0 + 40 + k * ((w - 100) / 2 + 20), bw = (w - 100) / 2;
          D.caja(g, bx, 840, bw, 80, { relleno: k === opcion ? "#e8b85c" : "rgba(255,255,255,.08)", r: 16, borde: k === opcion ? "#ffd98a" : "rgba(255,255,255,.15)" });
          D.texto(g, t, bx + bw / 2, 882, { tam: Math.min(30, bw / 7), alin: "center", peso: 700, color: k === opcion ? "#2a1a05" : "#f6efe2", sombra: false });
        });
      });
      D.ayuda(g, "◀ ▶ elegir · OK confirmar · Acércate a 21 sin pasarte. La banca pide hasta 17.");
    }
  };
});
