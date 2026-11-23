Salon.juego("tresenraya", function (J) {
  const D = Salon.dib;
  const LINEAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const T = 260, X0 = 170, Y0 = 540 - T * 1.5;
  const tab = Array(9).fill(-1);
  let turno = 0, cursor = 4, linea = null, pensando = false, anim = Array(9).fill(0);

  function ganador(t) {
    for (const l of LINEAS) if (t[l[0]] >= 0 && t[l[0]] === t[l[1]] && t[l[1]] === t[l[2]]) return { j: t[l[0]], l };
    return t.every((v) => v >= 0) ? { j: null } : null;
  }
  function minimax(t, j, prof) {
    const g = ganador(t);
    if (g) return g.j === null ? 0 : (g.j === j ? 10 - prof : prof - 10);
    let mejor = -Infinity;
    for (let i = 0; i < 9; i++) if (t[i] < 0) {
      t[i] = j;
      mejor = Math.max(mejor, -minimax(t, 1 - j, prof + 1));
      t[i] = -1;
    }
    return mejor;
  }
  function jugadaMaquina() {
    const ops = [];
    for (let i = 0; i < 9; i++) if (tab[i] < 0) {
      tab[i] = turno;
      ops.push({ i, nota: -minimax(tab, 1 - turno, 1) });
      tab[i] = -1;
    }
    return Salon.ia.elegir(ops, J.dificultad).i;
  }
  function poner(i) {
    if (tab[i] >= 0 || linea) return;
    tab[i] = turno; anim[i] = 0;
    J.sonido("mover");
    const g = ganador(tab);
    if (g) {
      linea = g;
      if (g.l) g.l.forEach((k) => J.efecto("chispas", X0 + (k % 3) * T + T / 2, Y0 + ((k / 3) | 0) * T + T / 2, { color: J.jugadores[g.j].color }));
      J.despues(900, () => J.terminar({ ganador: g.j }));
      return;
    }
    turno = 1 - turno;
    J.turno(turno);
    siguiente();
  }
  function siguiente() {
    if (J.jugadores[turno].cpu) {
      pensando = true;
      J.despues(550, () => { pensando = false; poner(jugadaMaquina()); });
    }
  }
  J.turno(0);
  siguiente();

  return {
    tecla(j, a) {
      if (pensando || linea) return;
      const f = (cursor / 3) | 0, c = cursor % 3;
      if (a === "arriba") cursor = ((f + 2) % 3) * 3 + c;
      else if (a === "abajo") cursor = ((f + 1) % 3) * 3 + c;
      else if (a === "izquierda") cursor = f * 3 + (c + 2) % 3;
      else if (a === "derecha") cursor = f * 3 + (c + 1) % 3;
      else if (a === "ok") { if (tab[cursor] >= 0) J.sonido("error"); else poner(cursor); return; }
      J.sonido("clic");
    },
    actualizar(dt) { for (let i = 0; i < 9; i++) anim[i] = Math.min(1, anim[i] + dt * 4); },
    dibujar(g) {
      D.fondo(g);
      D.titulo(g, "Tres en raya", 1160, 200);
      D.caja(g, X0 - 30, Y0 - 30, T * 3 + 60, T * 3 + 60, { relleno: "rgba(255,255,255,.04)", borde: "rgba(255,255,255,.08)", r: 30, sombra: 30 });
      g.save();
      g.strokeStyle = "rgba(246,239,226,.35)"; g.lineWidth = 8; g.lineCap = "round";
      for (let k = 1; k < 3; k++) {
        g.beginPath(); g.moveTo(X0 + k * T, Y0 + 20); g.lineTo(X0 + k * T, Y0 + 3 * T - 20); g.stroke();
        g.beginPath(); g.moveTo(X0 + 20, Y0 + k * T); g.lineTo(X0 + 3 * T - 20, Y0 + k * T); g.stroke();
      }
      g.restore();
      for (let i = 0; i < 9; i++) {
        if (tab[i] < 0) continue;
        const cx = X0 + (i % 3) * T + T / 2, cy = Y0 + ((i / 3) | 0) * T + T / 2, s = 80 * anim[i];
        g.save();
        g.lineWidth = 26; g.lineCap = "round";
        g.strokeStyle = J.jugadores[tab[i]].color;
        g.shadowColor = J.jugadores[tab[i]].color; g.shadowBlur = 20;
        g.beginPath();
        if (tab[i] === 0) { g.moveTo(cx - s, cy - s); g.lineTo(cx + s, cy + s); g.moveTo(cx + s, cy - s); g.lineTo(cx - s, cy + s); }
        else g.arc(cx, cy, s, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
      if (linea && linea.l) {
        const p = (k) => [X0 + (k % 3) * T + T / 2, Y0 + ((k / 3) | 0) * T + T / 2];
        const a = p(linea.l[0]), b = p(linea.l[2]);
        g.save(); g.strokeStyle = "#fff"; g.lineWidth = 14; g.lineCap = "round"; g.shadowColor = "#fff"; g.shadowBlur = 30;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
      }
      if (!linea && !J.jugadores[turno].cpu) D.cursor(g, X0 + (cursor % 3) * T, Y0 + ((cursor / 3) | 0) * T, T, T, J.jugadores[turno].color);
      D.marcador(g, J.jugadores.map((j, i) => ({ nombre: j.nombre, color: j.color, detalle: i === 0 ? "Juega con ✕" : "Juega con ◯", activo: i === turno && !linea })), 1160, 300, 520);
      D.texto(g, pensando ? "La máquina piensa…" : (linea ? "" : (J.jugadores[turno].cpu ? "" : "Turno de " + J.jugadores[turno].nombre)), 1160, 560, { tam: 34, color: "#ffd98a" });
      D.ayuda(g, "Flechas: mover · OK: poner ficha");
    }
  };
});
