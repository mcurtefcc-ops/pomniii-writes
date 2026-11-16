Salon.juego("ahorcado", function (J) {
  const D = Salon.dib;
  const PALABRAS = {
    1: { Animales: ["GATO", "PERRO", "VACA", "PATO", "LORO", "OSO", "LEON", "TIGRE", "RANA", "MONO", "CERDO", "OVEJA", "BURRO", "PULPO", "ZORRO"], Comida: ["PAN", "QUESO", "ARROZ", "SOPA", "PERA", "UVA", "MELON", "LECHE", "HUEVO", "TORTA", "PASTA", "PIZZA"], Casa: ["MESA", "SILLA", "CAMA", "PUERTA", "SOFA", "LAMPARA", "PLATO", "TAZA", "VASO", "TECHO"] },
    2: { Animales: ["JIRAFA", "ELEFANTE", "TORTUGA", "CABALLO", "DELFIN", "PINGUINO", "CANGURO", "MURCIELAGO", "ARDILLA", "BALLENA", "COCODRILO", "MARIPOSA"], Paises: ["ESPAÑA", "FRANCIA", "ITALIA", "MEXICO", "ARGENTINA", "PORTUGAL", "ALEMANIA", "COLOMBIA", "MARRUECOS", "JAPON", "CANADA", "PERU"], Oficios: ["MEDICO", "PROFESOR", "BOMBERO", "PANADERO", "CARPINTERO", "ENFERMERA", "ABOGADO", "PINTOR", "COCINERO", "CARTERO"] },
    3: { Ciencia: ["FOTOSINTESIS", "ELECTRICIDAD", "TELESCOPIO", "MICROSCOPIO", "GRAVEDAD", "MOLECULA", "VOLCAN", "TERREMOTO", "ECLIPSE", "HURACAN"], Musica: ["GUITARRA", "VIOLONCHELO", "SAXOFON", "ACORDEON", "PANDERETA", "CASTAÑUELAS", "TROMPETA", "CLARINETE", "ORQUESTA"], Palabras: ["MURCIELAGO", "PARALELEPIPEDO", "OTORRINOLARINGOLOGO", "ESTERNOCLEIDOMASTOIDEO", "QUEHACER", "ZAMBOMBA", "ARCHIPIELAGO", "CIGÜEÑA", "PINGÜINO", "ACUARELA"] }
  };
  const cats = PALABRAS[J.dificultad], cat = J.elegir(Object.keys(cats)), palabra = J.elegir(cats[cat]);
  const LETRAS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
  const base = (ch) => ch.normalize("NFD").replace(/[̀-ͯ]/g, "").replace("Ñ", "Ñ");
  const letrasPalabra = palabra.split("").map((ch) => (ch === "Ñ" ? "Ñ" : base(ch)));
  const usadas = new Set(), puntos = J.jugadores.map(() => 0);
  let errores = 0, turno = 0, cursor = 0, fin = false, msg = "";
  const MAX = 6;
  const resuelta = () => letrasPalabra.every((l) => usadas.has(l));
  function probar(l) {
    if (fin || usadas.has(l)) { if (!fin) { J.sonido("error"); J.aviso("La " + l + " ya está dicha"); } return; }
    usadas.add(l);
    const n = letrasPalabra.filter((x) => x === l).length;
    const nom = J.jugadores[turno].nombre;
    if (n) {
      puntos[turno] += n; J.sonido("punto"); msg = nom + ": ¡hay " + n + (n === 1 ? " " : " ") + l + "!";
      if (resuelta()) {
        puntos[turno] += 3; fin = true;
        if (J.n === 1) return J.despues(900, () => J.terminar({ bien: true, icono: "🎉", titulo: "¡Acertaste!", texto: "La palabra era " + palabra }));
        const max = Math.max(...puntos), g = puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
        return J.despues(900, () => J.terminar({ ganador: g.length === 1 ? g[0] : null, texto: "Era " + palabra + ". " + J.jugadores.map((p, i) => p.nombre + ": " + puntos[i]).join(" · ") }));
      }
    } else {
      errores++; J.sonido("error"); msg = nom + ": no hay " + l;
      if (errores >= MAX) {
        fin = true;
        if (J.n === 1) return J.despues(1000, () => J.terminar({ icono: "💀", titulo: "¡Ahorcado!", texto: "La palabra era " + palabra }));
        const max = Math.max(...puntos), g = puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
        return J.despues(1000, () => J.terminar({ ganador: g.length === 1 ? g[0] : null, titulo: "¡Ahorcado!", texto: "Era " + palabra + ". " + J.jugadores.map((p, i) => p.nombre + ": " + puntos[i]).join(" · ") }));
      }
      turno = (turno + 1) % J.n;
    }
    J.turno(turno);
  }
  J.turno(0);
  return {
    tecla(j, a) {
      if (fin) return;
      const f = Math.floor(cursor / 9), c = cursor % 9;
      const d = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] }[a];
      if (d) { cursor = ((f + d[0] + 3) % 3) * 9 + ((c + d[1] + 9) % 9); return; }
      if (a === "ok") probar(LETRAS[cursor]);
    },
    letra(j, ch) { if (LETRAS.includes(ch)) { cursor = LETRAS.indexOf(ch); probar(ch); } },
    dibujar(g) {
      D.fondo(g, "#2a2318", "#0d0a06");
      // horca
      g.strokeStyle = "#c9a36a"; g.lineWidth = 14; g.lineCap = "round";
      g.beginPath(); g.moveTo(120, 760); g.lineTo(460, 760); g.moveTo(200, 760); g.lineTo(200, 160); g.lineTo(430, 160); g.lineTo(430, 230); g.stroke();
      g.strokeStyle = "#f6efe2"; g.lineWidth = 10;
      const partes = [
        () => { g.beginPath(); g.arc(430, 280, 50, 0, 7); g.stroke(); },
        () => { g.beginPath(); g.moveTo(430, 330); g.lineTo(430, 500); g.stroke(); },
        () => { g.beginPath(); g.moveTo(430, 370); g.lineTo(360, 440); g.stroke(); },
        () => { g.beginPath(); g.moveTo(430, 370); g.lineTo(500, 440); g.stroke(); },
        () => { g.beginPath(); g.moveTo(430, 500); g.lineTo(370, 610); g.stroke(); },
        () => { g.beginPath(); g.moveTo(430, 500); g.lineTo(490, 610); g.stroke(); }
      ];
      for (let k = 0; k < errores; k++) partes[k]();
      // palabra
      const n = palabra.length, w = Math.min(96, 1250 / n);
      palabra.split("").forEach((ch, i) => {
        const x = 600 + i * w;
        g.fillStyle = "#c9a36a"; g.fillRect(x + 6, 420, w - 12, 6);
        if (usadas.has(letrasPalabra[i]) || fin) D.texto(g, ch, x + w / 2, 380, { tam: w * 0.8, alin: "center", peso: 700, color: usadas.has(letrasPalabra[i]) ? "#f6efe2" : "#ef8b7b" });
      });
      D.texto(g, "Pista: " + cat, 600, 220, { tam: 36, color: "#ffd98a" });
      D.texto(g, "Fallos: " + errores + " de " + MAX, 600, 280, { tam: 30, color: "#a79db3" });
      // teclado
      LETRAS.forEach((l, i) => {
        const x = 600 + (i % 9) * 118, y = 520 + Math.floor(i / 9) * 104;
        const usada = usadas.has(l), acierto = usada && letrasPalabra.includes(l);
        D.caja(g, x, y, 104, 90, { relleno: usada ? (acierto ? "rgba(95,211,141,.35)" : "rgba(239,91,91,.25)") : "rgba(255,255,255,.08)", r: 14 });
        D.texto(g, l, x + 52, y + 47, { tam: 44, alin: "center", peso: 700, color: usada ? "rgba(246,239,226,.45)" : "#f6efe2" });
      });
      if (!fin && !J.jugadores[turno].cpu) D.cursor(g, 600 + (cursor % 9) * 118, 520 + Math.floor(cursor / 9) * 104, 104, 90, J.jugadores[turno].color);
      if (J.n > 1) J.jugadores.forEach((p, i) => {
        const x = 600 + i * 300;
        D.caja(g, x, 40, 280, 76, { relleno: i === turno && !fin ? "rgba(255,217,138,.14)" : "rgba(255,255,255,.05)", borde: i === turno && !fin ? "#e8b85c" : "rgba(255,255,255,.1)", r: 14 });
        D.ficha(g, x + 34, 78, 16, p.color, { anillo: false });
        D.texto(g, p.nombre, x + 60, 78, { tam: 24, peso: 700, max: 150 });
        D.texto(g, puntos[i], x + 262, 80, { tam: 36, alin: "right", titulo: true });
      });
      D.texto(g, msg, 600, 870, { tam: 30, color: "#ffd98a" });
      D.ayuda(g, "Flechas y OK para elegir letra · desde el móvil puedes tocar las letras directamente");
    }
  };
});
