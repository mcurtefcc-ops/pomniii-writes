Salon.juego("hockey", function (J) {
  const D = Salon.dib, F = Salon.fisica;
  const X1 = 160, X2 = 1760, Y1 = 170, Y2 = 970, CY = (Y1 + Y2) / 2, CX = (X1 + X2) / 2, PORT = 120, A_GANAR = 7;
  const m = F.mundo({ decel: 25, amort: 0.15, rebote: 0.92, reboteBolas: 0.9 });
  F.seg(m, X1, Y1, X2, Y1); F.seg(m, X1, Y2, X2, Y2);
  F.seg(m, X1, Y1, X1, CY - PORT); F.seg(m, X1, CY + PORT, X1, Y2);
  F.seg(m, X2, Y1, X2, CY - PORT); F.seg(m, X2, CY + PORT, X2, Y2);
  const disco = F.bola(m, CX, CY, 26, { masa: 1 });
  const mazos = [F.bola(m, X1 + 160, CY, 46, { fija: true }), F.bola(m, X2 - 160, CY, 46, { fija: true })];
  const goles = [0, 0];
  let pausa = 1.2, fin = false, destello = 0, ultimoGol = -1, quieto = 0;
  const VMAZO = 950;
  saque(J.entero(0, 1));
  const vel = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  J.turno(0);

  function saque(hacia) {
    disco.x = CX + (hacia === 0 ? -120 : hacia === 1 ? 120 : 0); disco.y = CY; disco.vx = disco.vy = 0; disco.dentro = true;
    mazos[0].x = X1 + 160; mazos[0].y = CY; mazos[1].x = X2 - 160; mazos[1].y = CY;
    pausa = 1.2;
  }
  function gol(quien) {
    goles[quien]++; ultimoGol = quien; destello = 1;
    J.sonido("gol");
    if (goles[quien] >= A_GANAR) { fin = true; return J.despues(1200, () => J.terminar({ ganador: quien, texto: goles[0] + " a " + goles[1] })); }
    saque(1 - quien);
  }
  function ia(i, dt) {
    const mz = mazos[i], miGol = i === 0 ? X1 : X2, signo = i === 0 ? 1 : -1;
    const rapidez = [0, 430, 650, 900][J.dificultad];
    let tx, ty;
    const enMiCampo = i === 0 ? disco.x < CX - 10 : disco.x > CX + 10;
    const viene = i === 0 ? disco.vx < 50 : disco.vx > -50;
    let golpe = false;
    if (enMiCampo && (viene || Math.abs(disco.vx) < 200)) {
      // colocarse detrás del disco (mirando a la portería rival) y atravesarlo a tope
      const objX = i === 0 ? X2 : X1;
      const dx = objX - disco.x, dy = CY + (Math.random() - 0.5) * 100 - disco.y, d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const rx = disco.x - mz.x, ry = disco.y - mz.y, rd = Math.hypot(rx, ry) || 1;
      const alineado = (rx * ux + ry * uy) / rd > 0.75;
      if (alineado && rd < 260) { tx = disco.x + ux * 90; ty = disco.y + uy * 90; golpe = true; }
      else { tx = disco.x - ux * 95; ty = disco.y - uy * 95; }
    } else {
      tx = miGol + signo * 130; ty = CY + (disco.y - CY) * 0.45;
    }
    const dx = tx - mz.x, dy = ty - mz.y, d = Math.hypot(dx, dy);
    const v = golpe ? rapidez * 1.15 : Math.min(rapidez, d * 8);
    return d > 1 ? { x: (dx / d) * v, y: (dy / d) * v } : { x: 0, y: 0 };
  }

  return {
    actualizar(dt) {
      destello = Math.max(0, destello - dt);
      if (fin) return;
      [0, 1].forEach((i) => {
        let v;
        if (J.jugadores[i].cpu) v = ia(i, dt);
        else {
          const ax = (J.pulsada(i, "derecha") ? 1 : 0) - (J.pulsada(i, "izquierda") ? 1 : 0);
          const ay = (J.pulsada(i, "abajo") ? 1 : 0) - (J.pulsada(i, "arriba") ? 1 : 0);
          const n = Math.hypot(ax, ay) || 1;
          const objetivo = { x: (ax / n) * VMAZO, y: (ay / n) * VMAZO };
          v = { x: vel[i].x + (objetivo.x - vel[i].x) * Math.min(1, dt * 14), y: vel[i].y + (objetivo.y - vel[i].y) * Math.min(1, dt * 14) };
        }
        vel[i] = v;
        const mz = mazos[i];
        const nx = Math.max(i === 0 ? X1 + mz.r : CX + mz.r, Math.min(i === 0 ? CX - mz.r : X2 - mz.r, mz.x + v.x * dt));
        const ny = Math.max(Y1 + mz.r, Math.min(Y2 - mz.r, mz.y + v.y * dt));
        mz.vx = (nx - mz.x) / Math.max(dt, 1e-4); mz.vy = (ny - mz.y) / Math.max(dt, 1e-4);
        mz.x = nx; mz.y = ny;
      });
      if (pausa > 0) { pausa -= dt; return; }
      F.paso(m, dt, { choque(a, b, v) { if (v > 100) J.sonido("golpe"); }, pared(b, s, v) { if (v > 150) J.sonido("tic"); } });
      const sp = Math.hypot(disco.vx, disco.vy);
      if (sp > 2200) { disco.vx *= 2200 / sp; disco.vy *= 2200 / sp; }
      // si el disco se queda atascado (entre los mazos o parado), nuevo saque
      quieto = Math.hypot(disco.vx, disco.vy) < 60 ? quieto + dt : 0;
      if (quieto > 3) { quieto = 0; saque(J.entero(0, 1)); J.aviso("Disco atascado: nuevo saque"); return; }
      if (disco.x < X1 - 10) gol(1);
      else if (disco.x > X2 + 10) gol(0);
      // por si se escapa por una esquina
      if (disco.y < Y1 - 40 || disco.y > Y2 + 40) saque(-1);
    },
    dibujar(g) {
      D.fondo(g, "#10233a", "#050b14");
      D.caja(g, X1 - 30, Y1 - 30, X2 - X1 + 60, Y2 - Y1 + 60, { relleno: "#2b3442", r: 70, sombra: 50 });
      const gr = g.createLinearGradient(0, Y1, 0, Y2); gr.addColorStop(0, "#eef6ff"); gr.addColorStop(1, "#d6e6f5");
      D.caja(g, X1, Y1, X2 - X1, Y2 - Y1, { relleno: gr, r: 50 });
      g.strokeStyle = "rgba(239,91,91,.6)"; g.lineWidth = 6; g.beginPath(); g.moveTo(CX, Y1); g.lineTo(CX, Y2); g.stroke();
      g.strokeStyle = "rgba(76,195,240,.6)"; g.beginPath(); g.arc(CX, CY, 120, 0, 7); g.stroke();
      [X1, X2].forEach((x, i) => {
        g.strokeStyle = "rgba(76,195,240,.6)"; g.beginPath(); g.arc(x, CY, 200, i === 0 ? -Math.PI / 2 : Math.PI / 2, i === 0 ? Math.PI / 2 : Math.PI * 1.5); g.stroke();
        g.fillStyle = J.jugadores[i].color; g.fillRect(i === 0 ? x - 26 : x + 6, CY - PORT, 20, PORT * 2);
      });
      if (destello > 0) { g.fillStyle = D.alfa(J.jugadores[Math.max(0, ultimoGol)].color, destello * 0.35); g.fillRect(X1, Y1, X2 - X1, Y2 - Y1); }
      // disco y mazos
      g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 14; g.shadowOffsetY = 6;
      g.fillStyle = "#1d1b24"; g.beginPath(); g.arc(disco.x, disco.y, disco.r, 0, 7); g.fill(); g.restore();
      g.strokeStyle = "#ef5b5b"; g.lineWidth = 4; g.beginPath(); g.arc(disco.x, disco.y, disco.r * 0.6, 0, 7); g.stroke();
      mazos.forEach((mz, i) => {
        D.ficha(g, mz.x, mz.y, mz.r, J.jugadores[i].color);
        D.ficha(g, mz.x, mz.y, mz.r * 0.45, D.mezclar(J.jugadores[i].color, -0.25), { sombra: false, anillo: false });
      });
      // marcador
      D.texto(g, goles[0], CX - 70, 85, { tam: 90, alin: "center", titulo: true, color: J.jugadores[0].color });
      D.texto(g, "–", CX, 85, { tam: 70, alin: "center", color: "#a79db3" });
      D.texto(g, goles[1], CX + 70, 85, { tam: 90, alin: "center", titulo: true, color: J.jugadores[1].color });
      D.texto(g, J.jugadores[0].nombre, X1, 85, { tam: 36, peso: 700, color: J.jugadores[0].color });
      D.texto(g, J.jugadores[1].nombre, X2, 85, { tam: 36, peso: 700, color: J.jugadores[1].color, alin: "right" });
      if (pausa > 0 && !fin) D.texto(g, goles[0] + goles[1] ? "¡Gol!" : "¡A " + A_GANAR + " goles!", CX, CY - 200, { tam: 70, alin: "center", titulo: true, color: "#2b3442", sombra: false });
      D.ayuda(g, "Mantén las flechas para mover tu mazo");
    }
  };
});
