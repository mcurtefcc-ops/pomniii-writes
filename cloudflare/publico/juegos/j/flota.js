Salon.juego("flota", function (J) {
  const D = Salon.dib;
  const N = 10, C = 72, BARCOS = [5, 4, 3, 3, 2];
  const NOMBRES = { 5: "portaaviones", 4: "acorazado", 3: "submarino", 2: "lancha" };
  const XS = [110, 1010], Y0 = 200; // tablero de la flota del jugador 1 a la izquierda (al que dispara el 0)

  function colocar() {
    const t = Array.from({ length: N }, () => Array(N).fill(-1)), barcos = [];
    BARCOS.forEach((l, id) => {
      for (let intento = 0; intento < 1000; intento++) {
        const h = Math.random() < 0.5, r = J.entero(0, h ? N - 1 : N - l), c = J.entero(0, h ? N - l : N - 1);
        const celdas = [];
        for (let k = 0; k < l; k++) celdas.push(h ? [r, c + k] : [r + k, c]);
        // sin tocarse, ni en diagonal
        if (celdas.some(([a, b]) => { for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) { const aa = a + x, bb = b + y; if (aa >= 0 && aa < N && bb >= 0 && bb < N && t[aa][bb] >= 0) return true; } return false; })) continue;
        celdas.forEach(([a, b]) => (t[a][b] = id));
        barcos.push({ l, celdas, tocados: 0 });
        break;
      }
    });
    return { t, barcos, tiros: Array.from({ length: N }, () => Array(N).fill(0)) }; // tiros: 0 nada, 1 agua, 2 tocado
  }
  const flotas = [colocar(), colocar()]; // flotas[i] = barcos del jugador i
  let turno = 0, cursor = [4, 4], pensando = false, fin = false, ultimo = null, msg = "";
  const unHumano = J.jugadores.filter((j) => !j.cpu).length === 1;
  const humanoIdx = J.jugadores.findIndex((j) => !j.cpu);

  function disparar(r, c) {
    const f = flotas[1 - turno];
    if (f.tiros[r][c]) { J.sonido("error"); J.aviso("Ya disparaste ahí"); return; }
    const id = f.t[r][c];
    ultimo = { f: 1 - turno, r, c };
    if (id < 0) {
      f.tiros[r][c] = 1; msg = "Agua"; J.sonido("caida");
      turno = 1 - turno;
      return J.despues(700, siguiente);
    }
    f.tiros[r][c] = 2;
    const b = f.barcos[id]; b.tocados++;
    if (b.tocados === b.l) {
      msg = "¡Tocado y hundido! (" + NOMBRES[b.l] + ")"; J.sonido("explosion");
      // marca agua alrededor del barco hundido
      b.celdas.forEach(([a, bb]) => { for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) { const aa = a + x, cc = bb + y; if (aa >= 0 && aa < N && cc >= 0 && cc < N && !f.tiros[aa][cc]) f.tiros[aa][cc] = 1; } });
      if (f.barcos.every((x) => x.tocados === x.l)) { fin = true; return J.despues(1200, () => J.terminar({ ganador: turno })); }
    } else { msg = "¡Tocado! Repites"; J.sonido("golpe"); }
    J.despues(600, siguiente);
  }
  function jugadaMaquina() {
    const f = flotas[1 - turno];
    const libres = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!f.tiros[r][c]) libres.push([r, c]);
    if (J.dificultad === 1) return J.elegir(libres);
    // tocados de barcos aún a flote
    const abiertos = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (f.tiros[r][c] === 2) { const b = f.barcos[f.t[r][c]]; if (b.tocados < b.l) abiertos.push([r, c]); }
    if (abiertos.length) {
      let cand = [];
      if (abiertos.length >= 2 && J.dificultad === 3) {
        const h = abiertos.every(([r]) => r === abiertos[0][0]);
        const ord = abiertos.slice().sort((a, b) => (h ? a[1] - b[1] : a[0] - b[0]));
        const a = ord[0], z = ord[ord.length - 1];
        cand = h ? [[a[0], a[1] - 1], [z[0], z[1] + 1]] : [[a[0] - 1, a[1]], [z[0] + 1, z[1]]];
      } else abiertos.forEach(([r, c]) => cand.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]));
      cand = cand.filter(([r, c]) => r >= 0 && r < N && c >= 0 && c < N && !f.tiros[r][c]);
      if (cand.length) return J.elegir(cand);
    }
    if (J.dificultad === 3) { const par = libres.filter(([r, c]) => (r + c) % 2 === 0); if (par.length) return J.elegir(par); }
    return J.elegir(libres);
  }
  function siguiente() {
    J.turno(turno);
    if (J.jugadores[turno].cpu) { pensando = true; J.despues(650, () => { pensando = false; const [r, c] = jugadaMaquina(); disparar(r, c); }); }
  }
  siguiente();

  function tablero(g, i, x0) {
    // tablero que contiene la flota del jugador i
    const f = flotas[i], ver = fin || (unHumano && i === humanoIdx);
    D.caja(g, x0 - 16, Y0 - 16, N * C + 32, N * C + 32, { relleno: "#0d3550", r: 14, sombra: 30 });
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = x0 + c * C, y = Y0 + r * C;
      g.fillStyle = (r + c) % 2 ? "#14507a" : "#175a87"; g.fillRect(x + 1, y + 1, C - 2, C - 2);
      const id = f.t[r][c];
      if (id >= 0 && (ver || f.barcos[id].tocados === f.barcos[id].l)) { g.fillStyle = f.barcos[id].tocados === f.barcos[id].l ? "#5a5560" : "#9aa3ad"; D.ruta(g, x + 6, y + 6, C - 12, C - 12, 10); g.fill(); }
      if (f.tiros[r][c] === 1) { g.fillStyle = "rgba(220,240,255,.75)"; g.beginPath(); g.arc(x + C / 2, y + C / 2, 9, 0, 7); g.fill(); }
      if (f.tiros[r][c] === 2) { g.save(); g.strokeStyle = "#ff5a3c"; g.lineWidth = 9; g.lineCap = "round"; g.shadowColor = "#ff5a3c"; g.shadowBlur = 16; g.beginPath(); g.moveTo(x + 18, y + 18); g.lineTo(x + C - 18, y + C - 18); g.moveTo(x + C - 18, y + 18); g.lineTo(x + 18, y + C - 18); g.stroke(); g.restore(); }
    }
    if (ultimo && ultimo.f === i) D.cursor(g, x0 + ultimo.c * C, Y0 + ultimo.r * C, C, C, "rgba(255,255,255,.6)");
    const quedan = f.barcos.filter((b) => b.tocados < b.l).length;
    D.texto(g, "Flota de " + J.jugadores[i].nombre, x0, Y0 - 60, { tam: 34, color: J.jugadores[i].color, peso: 700 });
    D.texto(g, quedan + (quedan === 1 ? " barco a flote" : " barcos a flote"), x0 + N * C, Y0 - 60, { tam: 26, alin: "right", color: "#a79db3", peso: 400 });
  }

  return {
    tecla(j, a) {
      if (fin || pensando) return;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = [(cursor[0] + d[0] + N) % N, (cursor[1] + d[1] + N) % N]; return; }
      if (a === "ok") disparar(cursor[0], cursor[1]);
    },
    dibujar(g) {
      D.fondo(g, "#0f2a3f", "#05101a");
      D.titulo(g, "Hundir la flota", 960, 70, { alin: "center", tam: 50 });
      tablero(g, 1, XS[0]);
      tablero(g, 0, XS[1]);
      if (!fin && !J.jugadores[turno].cpu) D.cursor(g, XS[turno === 0 ? 0 : 1] + cursor[1] * C, Y0 + cursor[0] * C, C, C, J.jugadores[turno].color);
      const quien = J.jugadores[turno];
      D.texto(g, pensando ? quien.nombre + " apunta…" : fin ? "" : "Dispara " + quien.nombre + (J.jugadores[turno].cpu ? "" : " → al tablero de " + J.jugadores[1 - turno].nombre), 960, 960, { tam: 34, alin: "center", color: quien.color });
      D.texto(g, msg, 960, 1005, { tam: 30, alin: "center", color: "#ffd98a" });
    }
  };
});
