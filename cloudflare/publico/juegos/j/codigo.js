Salon.juego("codigo", function (J) {
  const D = Salon.dib;
  const [HUECOS, NCOL, REPITE] = [null, [4, 6, false], [4, 6, true], [5, 8, true]][J.dificultad];
  const COLORES = ["#ef5b5b", "#4cc3f0", "#f2c230", "#5fd38d", "#b38cff", "#ff8f5a", "#f6efe2", "#f06bb3"].slice(0, NCOL);
  const INTENTOS = 10;
  const secreto = [];
  while (secreto.length < HUECOS) { const c = J.entero(0, NCOL - 1); if (REPITE || !secreto.includes(c)) secreto.push(c); }
  const filas = []; // {cols, negras, blancas}
  let actual = Array(HUECOS).fill(-1), hueco = 0, fin = false;
  function pistas(p) {
    let negras = 0; const s1 = [], s2 = [];
    p.forEach((c, i) => { if (c === secreto[i]) negras++; else { s1.push(secreto[i]); s2.push(c); } });
    let blancas = 0;
    s2.forEach((c) => { const k = s1.indexOf(c); if (k >= 0) { blancas++; s1.splice(k, 1); } });
    return { negras, blancas };
  }
  function enviar() {
    if (actual.includes(-1)) { J.sonido("error"); J.aviso("Rellena todos los huecos"); return; }
    if (!REPITE && new Set(actual).size < HUECOS) { J.sonido("error"); J.aviso("En este nivel no se repiten colores"); return; }
    const p = pistas(actual);
    filas.push({ cols: actual.slice(), ...p });
    J.sonido(p.negras ? "punto" : "mover");
    if (p.negras === HUECOS) {
      fin = true;
      const r = J.record(filas.length, false, "i" + J.dificultad);
      return J.despues(900, () => J.terminar({ puntos: filas.length, bien: true, icono: "🔓", titulo: "¡Código descifrado!", texto: "En " + filas.length + (filas.length === 1 ? " intento" : " intentos") + (r.nuevo ? " · ¡Nuevo récord en este nivel!" : " · Récord: " + r.mejor) }));
    }
    if (filas.length >= INTENTOS) { fin = true; return J.despues(1200, () => J.terminar({ icono: "🔐", titulo: "Se acabaron los intentos", texto: "El código se queda sin descubrir." })); }
    actual = Array(HUECOS).fill(-1); hueco = 0;
  }
  J.turno(0);
  const X0 = 360, Y0 = 70, FH = 90;
  return {
    tecla(j, a) {
      if (fin) return;
      if (a === "izquierda") hueco = (hueco + HUECOS - 1) % HUECOS;
      else if (a === "derecha") hueco = (hueco + 1) % HUECOS;
      else if (a === "arriba") { actual[hueco] = (actual[hueco] + 1 + NCOL) % NCOL; J.sonido("clic"); }
      else if (a === "abajo") { actual[hueco] = actual[hueco] <= 0 ? NCOL - 1 : actual[hueco] - 1; J.sonido("clic"); }
      else if (a === "ok") enviar();
    },
    dibujar(g) {
      D.fondo(g, "#1d2333", "#080a10");
      D.caja(g, X0 - 40, Y0 - 20, HUECOS * 100 + 330, INTENTOS * FH + 40, { relleno: "#4a3221", r: 24, sombra: 40 });
      for (let i = 0; i < INTENTOS; i++) {
        const y = Y0 + (INTENTOS - 1 - i) * FH + FH / 2;
        const f = filas[i], esActual = i === filas.length && !fin;
        if (esActual) D.caja(g, X0 - 24, y - FH / 2 + 6, HUECOS * 100 + 20, FH - 12, { relleno: "rgba(255,217,138,.15)", r: 16 });
        D.texto(g, i + 1, X0 - 60, y, { tam: 24, alin: "center", color: "#a79db3" });
        for (let k = 0; k < HUECOS; k++) {
          const x = X0 + 40 + k * 100, c = f ? f.cols[k] : esActual ? actual[k] : -1;
          if (c >= 0) D.ficha(g, x, y, 32, COLORES[c]);
          else { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); }
          if (esActual && k === hueco) { g.save(); g.strokeStyle = "#ffd98a"; g.lineWidth = 5; g.shadowColor = "#ffd98a"; g.shadowBlur = 16; g.beginPath(); g.arc(x, y, 40, 0, 7); g.stroke(); g.restore(); }
        }
        if (f) {
          const pins = Array(f.negras).fill("#111").concat(Array(f.blancas).fill("#f6f1e4"));
          for (let k = 0; k < HUECOS; k++) {
            const px = X0 + HUECOS * 100 + 60 + (k % 3) * 34, py = y - 14 + Math.floor(k / 3) * 30;
            g.fillStyle = pins[k] || "rgba(0,0,0,.3)"; g.beginPath(); g.arc(px, py, pins[k] ? 12 : 6, 0, 7); g.fill();
          }
        }
      }
      // código oculto / revelado
      D.caja(g, X0 - 24, 990, HUECOS * 100 + 20, 70, { relleno: "#2a1d14", r: 16 });
      for (let k = 0; k < HUECOS; k++) { const x = X0 + 40 + k * 100; if (fin) D.ficha(g, x, 1025, 28, COLORES[secreto[k]]); else D.texto(g, "?", x, 1027, { tam: 44, alin: "center", color: "#a79db3" }); }
      const px = 1240;
      D.titulo(g, "Código secreto", px, 120, { tam: 54 });
      [HUECOS + " colores escondidos, " + NCOL + " posibles" + (REPITE ? " (pueden repetirse)" : ""), "Tienes " + INTENTOS + " intentos.", "", "● negra: color y sitio correctos", "○ blanca: color correcto, sitio no", "", "◀ ▶ elegir hueco", "▲ ▼ cambiar color", "OK comprobar"].forEach((s, k) => D.texto(g, s, px, 220 + k * 48, { tam: 28, color: k < 2 ? "#ffd98a" : "#cfc6dd", peso: 400, max: 640 }));
      COLORES.forEach((c, k) => D.ficha(g, px + 30 + k * 64, 720, 24, c));
    }
  };
});
