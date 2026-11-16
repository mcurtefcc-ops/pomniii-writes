Salon.juego("sopa", function (J) {
  const D = Salon.dib;
  const TEMAS = {
    Frutas: ["MANZANA", "PLATANO", "NARANJA", "FRESA", "SANDIA", "MELON", "CEREZA", "LIMON", "KIWI", "PIÑA", "MANGO", "UVA", "PERA", "CIRUELA"],
    Animales: ["PERRO", "GATO", "CABALLO", "TORTUGA", "LEON", "TIGRE", "JIRAFA", "CEBRA", "DELFIN", "BALLENA", "AGUILA", "LOBO", "ZORRO", "CONEJO"],
    Colores: ["ROJO", "AZUL", "VERDE", "AMARILLO", "NARANJA", "MORADO", "ROSA", "NEGRO", "BLANCO", "GRIS", "MARRON", "VIOLETA", "CELESTE", "DORADO"],
    Deportes: ["FUTBOL", "TENIS", "GOLF", "RUGBY", "BOXEO", "NATACION", "CICLISMO", "KARATE", "ESQUI", "SURF", "HOCKEY", "BEISBOL", "VOLEY", "JUDO"],
    Ciudades: ["MADRID", "SEVILLA", "BILBAO", "VALENCIA", "MALAGA", "TOLEDO", "CADIZ", "LEON", "SORIA", "GIRONA", "ZARAGOZA", "MURCIA", "OVIEDO", "LUGO"]
  };
  const [N, NPAL, DIRS] = [null, [10, 6, [[0, 1], [1, 0]]], [12, 8, [[0, 1], [1, 0], [1, 1], [-1, 1]]], [14, 10, [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]]]][J.dificultad];
  const tema = J.elegir(Object.keys(TEMAS));
  const tab = Array.from({ length: N }, () => Array(N).fill(""));
  const palabras = [];
  for (const p of Salon.cartas.barajar(TEMAS[tema].filter((w) => w.length <= N).slice())) {
    if (palabras.length >= NPAL) break;
    for (let intento = 0; intento < 200; intento++) {
      const [df, dc] = J.elegir(DIRS), f = J.entero(0, N - 1), c = J.entero(0, N - 1);
      const ef = f + df * (p.length - 1), ec = c + dc * (p.length - 1);
      if (ef < 0 || ef >= N || ec < 0 || ec >= N) continue;
      let ok = true;
      for (let k = 0; k < p.length; k++) { const v = tab[f + df * k][c + dc * k]; if (v && v !== p[k]) { ok = false; break; } }
      if (!ok) continue;
      for (let k = 0; k < p.length; k++) tab[f + df * k][c + dc * k] = p[k];
      palabras.push({ p, f, c, df, dc, hallada: false });
      break;
    }
  }
  const ABC = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) if (!tab[f][c]) tab[f][c] = ABC[J.entero(0, ABC.length - 1)];
  const C = Math.floor(940 / N), X0 = 120, Y0 = 70;
  let cursor = [0, 0], inicio = null, fin = false, t = 0;
  const COLS = ["#ef5b5b", "#4cc3f0", "#f2b84b", "#5fd38d", "#b38cff", "#ff8f5a", "#f06bb3", "#9ad14b", "#4c7bf0", "#e8b85c"];
  function marcar() {
    if (!inicio) { inicio = cursor.slice(); J.sonido("clic"); return; }
    const [f0, c0] = inicio, [f1, c1] = cursor;
    inicio = null;
    const df = Math.sign(f1 - f0), dc = Math.sign(c1 - c0), largo = Math.max(Math.abs(f1 - f0), Math.abs(c1 - c0)) + 1;
    if (!(f0 === f1 || c0 === c1 || Math.abs(f1 - f0) === Math.abs(c1 - c0))) { J.sonido("error"); return; }
    let s = ""; for (let k = 0; k < largo; k++) s += tab[f0 + df * k][c0 + dc * k];
    const p = palabras.find((w) => !w.hallada && (w.p === s || w.p === s.split("").reverse().join("")) && w.p.length === largo);
    if (!p) { J.sonido("error"); J.aviso("Ahí no hay ninguna palabra de la lista"); return; }
    p.hallada = true; p.desde = [f0, c0]; p.hasta = [f1, c1];
    J.sonido("punto");
    if (palabras.every((w) => w.hallada)) {
      fin = true;
      const seg = Math.round(t), r = J.record(seg, false, "t" + J.dificultad);
      J.despues(800, () => J.terminar({ puntos: seg, bien: true, icono: "🔎", titulo: "¡Todas encontradas!", texto: seg + " segundos" + (r.nuevo ? " · ¡Nuevo récord en este nivel!" : " · Récord: " + r.mejor + " s") }));
    }
  }
  J.turno(0);
  return {
    tecla(j, a) {
      if (fin) return;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = [(cursor[0] + d[0] + N) % N, (cursor[1] + d[1] + N) % N]; return; }
      if (a === "ok") marcar();
    },
    actualizar(dt) { if (!fin) t += dt; },
    dibujar(g) {
      D.fondo(g, "#1e2433", "#090b12");
      D.caja(g, X0 - 20, Y0 - 20, N * C + 40, N * C + 40, { relleno: "#f6f1e4", r: 18, sombra: 40 });
      const centro = (f, c) => [X0 + c * C + C / 2, Y0 + f * C + C / 2];
      palabras.forEach((w, i) => {
        if (!w.hallada) return;
        const a = centro(w.desde[0], w.desde[1]), b = centro(w.hasta[0], w.hasta[1]);
        g.strokeStyle = D.alfa(COLS[i % COLS.length], 0.45); g.lineWidth = C * 0.8; g.lineCap = "round";
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      });
      if (inicio) {
        const a = centro(inicio[0], inicio[1]), b = centro(cursor[0], cursor[1]);
        g.strokeStyle = "rgba(232,184,92,.5)"; g.lineWidth = C * 0.8; g.lineCap = "round";
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) { const [x, y] = centro(f, c); D.texto(g, tab[f][c], x, y + 2, { tam: C * 0.55, alin: "center", peso: 700, sombra: false, color: "#2a2333" }); }
      if (!fin) D.cursor(g, X0 + cursor[1] * C, Y0 + cursor[0] * C, C, C, "#e8b85c");
      const px = 1180;
      D.titulo(g, "Sopa de letras", px, 110, { tam: 52 });
      D.texto(g, "Tema: " + tema + " · ⏱ " + Math.floor(t) + " s", px, 180, { tam: 30, color: "#ffd98a" });
      palabras.forEach((w, i) => {
        const x = px + (i % 2) * 330, y = 270 + Math.floor(i / 2) * 64;
        D.texto(g, w.p, x, y, { tam: 34, peso: 700, color: w.hallada ? D.alfa(COLS[i % COLS.length], 0.9) : "#f6efe2" });
        if (w.hallada) { g.strokeStyle = "#f6efe2"; g.lineWidth = 3; const ww = D.medir(g, w.p, 34, 700); g.beginPath(); g.moveTo(x, y); g.lineTo(x + ww, y); g.stroke(); }
      });
      D.texto(g, "OK en la primera letra, muévete hasta la última y OK otra vez.", px, 980, { tam: 24, color: "#a79db3", peso: 400, max: 720 });
    }
  };
});
