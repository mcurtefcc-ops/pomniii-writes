Salon.juego("solitario", function (J) {
  const D = Salon.dib, K = Salon.cartas;
  // Klondike. Zonas: 0 mazo, 1 descarte, 2-5 bases, 6-12 columnas.
  const ROBA = J.dificultad === 3 ? 3 : 1;
  const mazo = K.barajar(K.baraja()).map((c) => Object.assign(c, { arriba: false }));
  const cols = [];
  for (let i = 0; i < 7; i++) { cols.push(mazo.splice(0, i + 1)); cols[i][i].arriba = true; }
  const descarte = [], bases = [[], [], [], []];
  let cursor = { z: 0, p: 0 }, mano = null, fin = false, t = 0, movs = 0;
  const CW = 150, CH = CW * 1.45, X0 = 960 - (7 * 180) / 2 + 15, YT = 40, YC = 330;
  const zx = (z) => (z <= 1 ? X0 + z * 180 : z <= 5 ? X0 + (z + 1) * 180 : X0 + (z - 6) * 180);
  const pila = (z) => (z === 0 ? mazo : z === 1 ? descarte : z <= 5 ? bases[z - 2] : cols[z - 6]);
  const roja = (c) => K.roja(c);
  function separacion(col) { const arriba = col.filter((c) => c.arriba).length, abajo = col.length - arriba; const disp = 1060 - YC - CH - abajo * 22; return Math.min(48, arriba > 1 ? disp / (arriba - 1) : 48); }
  function yCarta(col, k) { const sep = separacion(col); let y = YC; for (let i = 0; i < k; i++) y += col[i].arriba ? sep : 22; return y; }
  function primeraArriba(col) { const k = col.findIndex((c) => c.arriba); return k < 0 ? col.length : k; }
  function puedeEnBase(c, b) { const top = b[b.length - 1]; return top ? top.palo === c.palo && c.valor === top.valor + 1 : c.valor === 1; }
  function puedeEnCol(c, col) { const top = col[col.length - 1]; return top ? top.arriba && roja(top) !== roja(c) && c.valor === top.valor - 1 : c.valor === 13; }
  function voltear() { cols.forEach((col) => { const top = col[col.length - 1]; if (top && !top.arriba) top.arriba = true; }); }
  function robar() {
    if (!mazo.length) { while (descarte.length) { const c = descarte.pop(); c.arriba = false; mazo.push(c); } J.sonido("mover"); return; }
    for (let k = 0; k < ROBA && mazo.length; k++) { const c = mazo.pop(); c.arriba = true; descarte.push(c); }
    J.sonido("clic");
  }
  function coger() {
    const z = cursor.z, p = pila(z);
    if (z === 0) return robar();
    if (!p.length) return;
    if (z >= 6) {
      const k = Math.max(primeraArriba(p), Math.min(cursor.p, p.length - 1));
      if (!p[k].arriba) return;
      mano = { de: z, cartas: p.slice(k) };
    } else mano = { de: z, cartas: [p[p.length - 1]] };
    J.sonido("clic");
  }
  function soltar() {
    const z = cursor.z, c = mano.cartas[0], origen = pila(mano.de);
    if (z === mano.de) {
      // soltar en el mismo sitio: intenta mandarla sola a una base
      if (mano.cartas.length === 1) for (let b = 0; b < 4; b++) if (puedeEnBase(c, bases[b])) { mover(origen, bases[b], 1); mano = null; return; }
      mano = null; return;
    }
    let ok = false;
    if (z >= 2 && z <= 5) ok = mano.cartas.length === 1 && puedeEnBase(c, bases[z - 2]);
    else if (z >= 6) ok = puedeEnCol(c, cols[z - 6]);
    if (!ok) { J.sonido("error"); J.aviso("Ahí no se puede poner"); mano = null; return; }
    mover(origen, pila(z), mano.cartas.length);
    mano = null;
  }
  function mover(origen, destino, n) {
    destino.push(...origen.splice(origen.length - n, n));
    movs++; J.sonido("mover"); voltear(); comprobar();
  }
  function comprobar() {
    if (bases.every((b) => b.length === 13)) {
      fin = true;
      const seg = Math.round(t), r = J.record(seg, false, "t" + ROBA);
      J.despues(600, () => J.terminar({ puntos: seg, bien: true, icono: "🏆", titulo: "¡Solitario completado!", texto: movs + " movimientos · " + Math.floor(seg / 60) + " min " + (seg % 60) + " s" + (r.nuevo ? " · ¡Nuevo récord!" : "") }));
    }
  }
  function autoFinal() {
    // si todo está boca arriba y el mazo vacío, lo manda todo a las bases
    if (mazo.length || descarte.length || cols.some((c) => c.some((x) => !x.arriba))) return false;
    let algo = true;
    while (algo) { algo = false; for (const col of cols) { const c = col[col.length - 1]; if (!c) continue; for (const b of bases) if (puedeEnBase(c, b)) { b.push(col.pop()); algo = true; break; } } }
    comprobar(); return true;
  }
  J.turno(0);
  return {
    tecla(j, a) {
      if (fin) return;
      const z = cursor.z;
      if (a === "izquierda" || a === "derecha") {
        const d = a === "derecha" ? 1 : -1;
        if (z <= 5) cursor.z = (z + d + 6) % 6; else cursor.z = 6 + ((z - 6 + d + 7) % 7);
        if (cursor.z >= 6) cursor.p = pila(cursor.z).length - 1;
        J.sonido("clic"); return;
      }
      if (a === "arriba") {
        if (z >= 6) {
          const col = pila(z), k = primeraArriba(col);
          if (!mano && cursor.p > k && col.length) { cursor.p--; return; }
          // columna -> zona de arriba que tiene encima (la 3ª columna no tiene: va al descarte)
          const i = z - 6;
          cursor.z = i <= 1 ? i : i === 2 ? 1 : i - 1;
        }
        return;
      }
      if (a === "abajo") {
        if (z <= 5) { cursor.z = 6 + (z <= 1 ? z : Math.min(6, z + 1)); cursor.p = pila(cursor.z).length - 1; }
        else if (cursor.p < pila(z).length - 1) cursor.p++;
        return;
      }
      if (a === "ok") { if (autoFinal()) return; if (mano) soltar(); else coger(); }
    },
    actualizar(dt) { if (!fin) t += dt; if (cursor.z >= 6) { const col = pila(cursor.z); cursor.p = Math.max(Math.min(cursor.p, col.length - 1), Math.min(primeraArriba(col), col.length - 1)); } },
    dibujar(g) {
      D.fondo(g, "#145236", "#05180f");
      const hueco = (x, y, txt) => { D.caja(g, x, y, CW, CH, { borde: "rgba(255,255,255,.25)", grosor: 3, r: 12 }); if (txt) D.texto(g, txt, x + CW / 2, y + CH / 2, { tam: 50, alin: "center", color: "rgba(255,255,255,.25)", sombra: false }); };
      // mazo y descarte
      if (mazo.length) K.dibujar(g, mazo[0], zx(0), YT, CW, { bocaAbajo: true }); else hueco(zx(0), YT, "↺");
      if (descarte.length) { const vis = descarte.slice(-ROBA); vis.forEach((c, k) => { if (!(mano && mano.de === 1 && k === vis.length - 1)) K.dibujar(g, c, zx(1) + k * 30, YT, CW); }); } else hueco(zx(1), YT);
      bases.forEach((b, i) => { const top = b[b.length - (mano && mano.de === i + 2 ? 2 : 1)]; if (top) K.dibujar(g, top, zx(i + 2), YT, CW); else hueco(zx(i + 2), YT, "A"); });
      cols.forEach((col, i) => {
        if (!col.length) hueco(zx(i + 6), YC, "K");
        col.forEach((c, k) => {
          if (mano && mano.de === i + 6 && k >= col.length - mano.cartas.length) return;
          K.dibujar(g, c, zx(i + 6), yCarta(col, k), CW, { bocaAbajo: !c.arriba });
        });
      });
      // cursor
      if (!fin) {
        const z = cursor.z;
        let x = zx(z) + (z === 1 && descarte.length ? (Math.min(ROBA, descarte.length) - 1) * 30 : 0), y = YT, h = CH;
        if (z >= 6) { const col = pila(z); y = col.length ? yCarta(col, Math.max(0, cursor.p)) : YC; h = col.length ? yCarta(col, col.length - 1) + CH - y : CH; }
        if (mano && z >= 6) { const col = pila(z); y = col.length ? yCarta(col, col.length - 1) : YC; h = CH; }
        D.cursor(g, x - 8, y - 8, CW + 16, h + 16, mano ? "#5fd38d" : "#ffd98a");
        if (mano) {
          const by = z >= 6 ? y + (pila(z).length ? 60 : 0) : YT + 60;
          mano.cartas.forEach((c, k) => K.dibujar(g, c, x + 20, by + k * 40, CW, { resaltada: k === 0 }));
        }
      }
      D.texto(g, "⏱ " + Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0") + "   ·   " + movs + " movimientos", 1880, 1005, { tam: 24, alin: "right", color: "#cfe8da" });
      D.texto(g, "OK coger / soltar · OK dos veces en la misma carta la sube a su base · ▲ ▼ elige cuántas cartas coges", 40, 1050, { tam: 22, color: "#cfe8da", peso: 400 });
    }
  };
});
