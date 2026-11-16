Salon.juego("preguntas", function (J) {
  const D = Salon.dib;
  // [pregunta, respuesta correcta, otras tres]
  const BANCO = [
    ["¿Cuál es la capital de Australia?", "Canberra", "Sídney", "Melbourne", "Perth"],
    ["¿Cuál es el río más largo de la península ibérica?", "Tajo", "Ebro", "Duero", "Guadalquivir"],
    ["¿En qué continente está Egipto?", "África", "Asia", "Europa", "Oceanía"],
    ["¿Cuál es el océano más grande?", "Pacífico", "Atlántico", "Índico", "Ártico"],
    ["¿Cuál es la capital de Canadá?", "Ottawa", "Toronto", "Montreal", "Vancouver"],
    ["¿Cuál es la montaña más alta del mundo?", "Everest", "K2", "Kilimanjaro", "Aconcagua"],
    ["¿Cuál es la capital de Japón?", "Tokio", "Osaka", "Kioto", "Pekín"],
    ["¿Qué país tiene forma de bota?", "Italia", "Grecia", "Portugal", "Chile"],
    ["¿En qué país está Machu Picchu?", "Perú", "Bolivia", "México", "Ecuador"],
    ["¿Cuál es el país más grande del mundo?", "Rusia", "Canadá", "China", "Estados Unidos"],
    ["¿Cuál es la capital de Portugal?", "Lisboa", "Oporto", "Coímbra", "Braga"],
    ["¿En qué comunidad está Santiago de Compostela?", "Galicia", "Asturias", "Castilla y León", "Cantabria"],
    ["¿Cuál es el desierto cálido más grande del mundo?", "Sahara", "Gobi", "Atacama", "Kalahari"],
    ["¿Cuál es la isla más grande de Canarias?", "Tenerife", "Gran Canaria", "Lanzarote", "Fuerteventura"],
    ["¿Cuál es la capital de Argentina?", "Buenos Aires", "Córdoba", "Rosario", "Mendoza"],
    ["¿Qué río pasa por Sevilla?", "Guadalquivir", "Guadiana", "Tajo", "Ebro"],
    ["¿Cuál es la capital de Alemania?", "Berlín", "Múnich", "Hamburgo", "Fráncfort"],
    ["¿Cuál es el lago más grande de África?", "Victoria", "Tanganica", "Malaui", "Chad"],
    ["¿En qué país está la Torre Eiffel?", "Francia", "Bélgica", "Italia", "Suiza"],
    ["¿Qué estrecho separa España de África?", "Gibraltar", "Bósforo", "Magallanes", "Ormuz"],
    ["¿Cuál es la capital de Marruecos?", "Rabat", "Casablanca", "Marrakech", "Fez"],
    ["¿Qué país tiene más habitantes del mundo desde 2023?", "India", "China", "Estados Unidos", "Indonesia"],
    ["¿En qué ciudad está la Sagrada Familia?", "Barcelona", "Madrid", "Valencia", "Bilbao"],
    ["¿Cuál es la capital de Brasil?", "Brasilia", "Río de Janeiro", "São Paulo", "Salvador"],
    ["¿Cuál es la capital de Italia?", "Roma", "Milán", "Venecia", "Florencia"],
    ["¿Cuál es la capital de Egipto?", "El Cairo", "Alejandría", "Luxor", "Giza"],
    ["¿Qué mar baña Barcelona?", "Mediterráneo", "Cantábrico", "Atlántico", "Báltico"],
    ["¿Cuál es el punto más alto de España?", "El Teide", "Mulhacén", "Aneto", "Veleta"],
    ["¿En qué año llegó Colón a América?", "1492", "1500", "1488", "1512"],
    ["¿Quién pintó «Las Meninas»?", "Velázquez", "Goya", "El Greco", "Murillo"],
    ["¿Quién pintó el «Guernica»?", "Picasso", "Dalí", "Miró", "Sorolla"],
    ["¿En qué año cayó el Muro de Berlín?", "1989", "1991", "1985", "1979"],
    ["¿Quién escribió «Don Quijote de la Mancha»?", "Cervantes", "Lope de Vega", "Quevedo", "Calderón"],
    ["¿Quién fue el primer hombre en pisar la Luna?", "Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "Michael Collins"],
    ["¿En qué año llegó el ser humano a la Luna?", "1969", "1965", "1972", "1959"],
    ["¿Qué civilización construyó las pirámides de Giza?", "La egipcia", "La romana", "La maya", "La persa"],
    ["¿Quién fue el primer emperador romano?", "Augusto", "Julio César", "Nerón", "Trajano"],
    ["¿En qué año empezó la Segunda Guerra Mundial?", "1939", "1914", "1945", "1936"],
    ["¿Quién escribió «Romeo y Julieta»?", "Shakespeare", "Cervantes", "Dante", "Molière"],
    ["¿Quién pintó la Mona Lisa?", "Leonardo da Vinci", "Miguel Ángel", "Rafael", "Botticelli"],
    ["¿En qué año se aprobó la Constitución española?", "1978", "1975", "1982", "1977"],
    ["¿Quién compuso «Las cuatro estaciones»?", "Vivaldi", "Mozart", "Bach", "Beethoven"],
    ["¿Quién escribió «Cien años de soledad»?", "García Márquez", "Vargas Llosa", "Borges", "Cortázar"],
    ["¿Quién formuló la teoría de la relatividad?", "Einstein", "Newton", "Galileo", "Tesla"],
    ["¿Quién descubrió la penicilina?", "Alexander Fleming", "Louis Pasteur", "Marie Curie", "Robert Koch"],
    ["¿Dónde se celebraron los Juegos Olímpicos de 1992?", "Barcelona", "Atlanta", "Seúl", "Sídney"],
    ["¿Quién financió el primer viaje de Colón?", "Los Reyes Católicos", "Felipe II", "Carlos V", "Alfonso X"],
    ["¿Quién escribió «La casa de Bernarda Alba»?", "Lorca", "Machado", "Valle-Inclán", "Unamuno"],
    ["¿Qué país regaló la Estatua de la Libertad a EE. UU.?", "Francia", "Reino Unido", "España", "Italia"],
    ["¿Cuál es el símbolo químico del oro?", "Au", "Ag", "Or", "Go"],
    ["¿Cuántos planetas tiene el sistema solar?", "8", "9", "7", "10"],
    ["¿Qué planeta es conocido como el planeta rojo?", "Marte", "Júpiter", "Venus", "Saturno"],
    ["¿Cuál es el planeta más grande del sistema solar?", "Júpiter", "Saturno", "Neptuno", "La Tierra"],
    ["¿Qué planeta está más cerca del Sol?", "Mercurio", "Venus", "Marte", "La Tierra"],
    ["¿Qué gas necesitamos respirar para vivir?", "Oxígeno", "Nitrógeno", "Hidrógeno", "Helio"],
    ["¿Cuántos huesos tiene el cuerpo humano adulto?", "206", "180", "250", "312"],
    ["¿Cuál es el órgano más grande del cuerpo humano?", "La piel", "El hígado", "El cerebro", "Los pulmones"],
    ["¿A qué temperatura hierve el agua a nivel del mar?", "100 ºC", "90 ºC", "120 ºC", "80 ºC"],
    ["¿Cuál es la fórmula del agua?", "H2O", "CO2", "O2", "NaCl"],
    ["¿Qué planeta tiene los anillos más visibles?", "Saturno", "Urano", "Marte", "Mercurio"],
    ["¿Cuántas patas tiene una araña?", "8", "6", "10", "12"],
    ["¿Qué tipo de animal es la ballena?", "Un mamífero", "Un pez", "Un reptil", "Un anfibio"],
    ["¿Cuál es el animal terrestre más rápido?", "El guepardo", "El león", "El caballo", "La gacela"],
    ["¿Cuántos corazones tiene un pulpo?", "3", "1", "2", "4"],
    ["¿A qué velocidad viaja la luz, más o menos?", "300.000 km/s", "30.000 km/s", "3.000 km/s", "3 millones de km/s"],
    ["¿Qué vitamina fabrica el cuerpo con la luz del sol?", "Vitamina D", "Vitamina C", "Vitamina A", "Vitamina B12"],
    ["¿Qué metal es líquido a temperatura ambiente?", "Mercurio", "Plomo", "Hierro", "Aluminio"],
    ["¿Qué científica ganó dos Nobel en ciencias distintas?", "Marie Curie", "Rosalind Franklin", "Ada Lovelace", "Jane Goodall"],
    ["¿Cuál es la estrella más cercana a la Tierra?", "El Sol", "Sirio", "Alfa Centauri", "La Estrella Polar"],
    ["¿Qué parte de la planta hace sobre todo la fotosíntesis?", "La hoja", "La raíz", "La flor", "El tallo"],
    ["¿Cuántos cromosomas tiene una célula humana normal?", "46", "23", "48", "44"],
    ["¿Cuál es el hueso más largo del cuerpo?", "El fémur", "La tibia", "El húmero", "El peroné"],
    ["¿Cuál es el animal más grande del planeta?", "La ballena azul", "El elefante africano", "El tiburón ballena", "La jirafa"],
    ["¿Qué órgano bombea la sangre?", "El corazón", "El pulmón", "El riñón", "El hígado"],
    ["¿Qué aparato mide la temperatura?", "El termómetro", "El barómetro", "El velocímetro", "El higrómetro"],
    ["¿Qué vitamina abunda en la naranja?", "Vitamina C", "Vitamina D", "Vitamina K", "Vitamina B1"],
    ["¿Qué mamífero pone huevos?", "El ornitorrinco", "El delfín", "El murciélago", "El canguro"],
    ["¿Cuántos jugadores de un equipo de fútbol hay en el campo?", "11", "10", "9", "12"],
    ["¿Cada cuántos años se juega el Mundial de fútbol?", "4", "2", "3", "5"],
    ["¿Qué país ganó el Mundial de fútbol de 2010?", "España", "Países Bajos", "Alemania", "Brasil"],
    ["¿En qué deporte destaca Rafael Nadal?", "Tenis", "Golf", "Pádel", "Baloncesto"],
    ["¿Cuántos puntos vale un triple en baloncesto?", "3", "2", "4", "1"],
    ["¿Cuántos aros tiene la bandera olímpica?", "5", "4", "6", "7"],
    ["¿En qué deporte se puede hacer un «hoyo en uno»?", "Golf", "Billar", "Críquet", "Hockey"],
    ["¿Qué torneo de tenis se juega en tierra batida en París?", "Roland Garros", "Wimbledon", "US Open", "Open de Australia"],
    ["¿Cuánto mide una maratón?", "42,195 km", "40 km", "45 km", "21 km"],
    ["¿Qué selección ha ganado más Mundiales de fútbol?", "Brasil", "Alemania", "Italia", "Argentina"],
    ["¿Cuántos jugadores por equipo hay en una pista de baloncesto?", "5", "6", "7", "4"],
    ["¿Cuántos jugadores por equipo hay en una pista de voleibol?", "6", "5", "7", "4"],
    ["¿Cuántos días tiene un año bisiesto?", "366", "365", "364", "367"],
    ["¿Cuántos lados tiene un hexágono?", "6", "5", "7", "8"],
    ["¿Cuánto es 7 × 8?", "56", "54", "64", "48"],
    ["¿Cuántos minutos tiene un día?", "1.440", "1.200", "1.600", "2.400"],
    ["¿Qué lengua tiene más hablantes nativos?", "Chino mandarín", "Inglés", "Español", "Hindi"],
    ["¿En qué idioma se escribió «El principito»?", "Francés", "Inglés", "Alemán", "Español"],
    ["¿Quién escribió «Harry Potter»?", "J. K. Rowling", "Tolkien", "Roald Dahl", "C. S. Lewis"],
    ["¿Cuántas cuerdas tiene una guitarra española?", "6", "4", "5", "12"],
    ["¿Qué instrumento tocaba Paco de Lucía?", "La guitarra", "El piano", "El violín", "El cajón"],
    ["¿Cuál es el ingrediente principal del guacamole?", "Aguacate", "Tomate", "Pepino", "Pimiento"],
    ["¿Cuántos colores tiene el arcoíris?", "7", "6", "5", "8"],
    ["¿Qué color sale al mezclar azul y amarillo?", "Verde", "Morado", "Naranja", "Marrón"],
    ["¿Qué número romano vale 50?", "L", "C", "D", "X"],
    ["¿Cuántos ceros tiene un millón?", "6", "5", "7", "9"],
    ["¿Qué idioma se habla oficialmente en Brasil?", "Portugués", "Español", "Brasileño", "Inglés"],
    ["¿Qué moneda se usa en Japón?", "El yen", "El yuan", "El won", "La rupia"],
    ["¿Cuál es la moneda del Reino Unido?", "La libra esterlina", "El euro", "El dólar", "El franco"],
    ["¿Cómo se llama la cría de la vaca?", "Ternero", "Potro", "Cordero", "Cabrito"],
    ["¿Cuántas teclas tiene un piano normal?", "88", "76", "92", "100"],
    ["¿En qué año empezaron a circular los billetes de euro?", "2002", "1999", "2000", "2004"],
    ["¿Quién dirigió «Parque Jurásico»?", "Steven Spielberg", "George Lucas", "James Cameron", "Ridley Scott"],
    ["¿Cómo se llama el ratón más famoso de Disney?", "Mickey", "Jerry", "Speedy", "Stuart"],
    ["¿Qué superhéroe es Peter Parker?", "Spider-Man", "Batman", "Superman", "Iron Man"],
    ["¿Quién creó a Sherlock Holmes?", "Arthur Conan Doyle", "Agatha Christie", "Edgar Allan Poe", "Charles Dickens"],
    ["¿Cuántos años tiene un siglo?", "100", "10", "1.000", "50"],
    ["¿Quién pintó «La noche estrellada»?", "Van Gogh", "Monet", "Dalí", "Picasso"],
    ["¿Qué pintor es famoso por sus relojes blandos?", "Dalí", "Magritte", "Miró", "Picasso"],
    ["¿Qué compositor siguió componiendo tras quedarse sordo?", "Beethoven", "Mozart", "Chopin", "Vivaldi"],
    ["¿En qué país nació el flamenco?", "España", "Portugal", "México", "Argentina"]
  ];
  const RONDAS = J.opcion("rondas") || 10, TIEMPO = 15;
  const COL = ["#ef5b5b", "#4c8ff0", "#e0a93a", "#4cb87a"], LET = ["A", "B", "C", "D"];
  const lista = Salon.cartas.barajar(BANCO.slice()).slice(0, RONDAS);
  const puntos = J.jugadores.map(() => 0);
  let k = -1, preg = null, fase = "", t = 0, resp = [], ganados = [], sel = J.jugadores.map(() => 0), fin = false;
  function siguiente() {
    k++;
    if (k >= lista.length) return acabar();
    const q = lista[k], ops = Salon.cartas.barajar([q[1], q[2], q[3], q[4]]);
    preg = { texto: q[0], ops, buena: ops.indexOf(q[1]) };
    resp = J.jugadores.map(() => null); ganados = J.jugadores.map(() => 0);
    fase = "pregunta"; t = TIEMPO;
    J.sonido("punto");
    J.jugadores.forEach((p, i) => {
      if (!p.cpu) return;
      const acierta = Math.random() < [0, 0.45, 0.7, 0.9][J.dificultad];
      const n = acierta ? preg.buena : J.elegir([0, 1, 2, 3].filter((x) => x !== preg.buena));
      J.despues(J.azar(2, 10) * 1000, () => responder(i, n));
    });
  }
  function responder(i, n) {
    if (fase !== "pregunta" || resp[i] !== null) return;
    resp[i] = { n, t };
    J.sonido("clic");
    if (resp.every((r) => r !== null)) J.despues(500, revelar);
  }
  function revelar() {
    if (fase !== "pregunta") return;
    fase = "resultado";
    resp.forEach((r, i) => { if (r && r.n === preg.buena) { ganados[i] = Math.round(500 + 500 * (r.t / TIEMPO)); puntos[i] += ganados[i]; } });
    J.sonido(ganados.some((x) => x) ? "gol" : "error");
    J.despues(4200, siguiente);
  }
  function acabar() {
    fin = true;
    if (J.n === 1) { const r = J.record(puntos[0], true); return J.terminar({ puntos: puntos[0], bien: r.nuevo, icono: "❓", titulo: puntos[0] + " puntos", texto: r.nuevo ? "¡Nuevo récord!" : "Récord: " + r.mejor }); }
    const max = Math.max(...puntos), g = puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
    J.terminar({ ganador: g.length === 1 ? g[0] : null, texto: J.jugadores.map((p, i) => p.nombre + ": " + puntos[i]).join(" · ") });
  }
  J.turno(0);
  J.despues(1200, siguiente);
  return {
    respuesta(j, n) { responder(j, n); },
    tecla(j, a) {
      if (fase !== "pregunta" || resp[j] !== null) return;
      const s = sel[j];
      if (a === "izquierda" || a === "derecha") sel[j] = s ^ 1;
      else if (a === "arriba" || a === "abajo") sel[j] = s ^ 2;
      else if (a === "ok") responder(j, s);
    },
    actualizar(dt) { if (fase === "pregunta") { t -= dt; if (t <= 0) { t = 0; revelar(); } } },
    dibujar(g) {
      D.fondo(g, "#2a1f4a", "#0b0716");
      if (!preg) { D.titulo(g, "¡Empieza el concurso!", 960, 480, { alin: "center", tam: 80 }); D.texto(g, RONDAS + " preguntas · responde desde el móvil", 960, 580, { tam: 36, alin: "center", color: "#a79db3" }); return; }
      D.texto(g, "Pregunta " + (k + 1) + " de " + lista.length, 80, 60, { tam: 30, color: "#a79db3" });
      // tiempo
      const fr = t / TIEMPO;
      D.caja(g, 80, 90, 1760, 14, { relleno: "rgba(255,255,255,.1)", r: 7 });
      D.caja(g, 80, 90, 1760 * fr, 14, { relleno: fr > 0.33 ? "#5fd38d" : "#ef5b5b", r: 7 });
      D.texto(g, preg.texto, 960, 210, { tam: 56, alin: "center", titulo: true, max: 1760 });
      preg.ops.forEach((o, i) => {
        const x = 80 + (i % 2) * 890, y = 300 + Math.floor(i / 2) * 210;
        const buena = fase === "resultado" && i === preg.buena, mala = fase === "resultado" && i !== preg.buena;
        D.caja(g, x, y, 870, 190, { relleno: mala ? D.alfa(COL[i], 0.25) : COL[i], r: 24, sombra: 20, borde: buena ? "#fff" : null, grosor: 8 });
        D.texto(g, LET[i], x + 60, y + 95, { tam: 70, alin: "center", peso: 700, color: "rgba(255,255,255,.85)" });
        D.texto(g, o, x + 130, y + 97, { tam: 46, peso: 700, color: "#fff", max: 710 });
        J.jugadores.forEach((p, j) => { if (p.control === "tv" && !p.cpu && fase === "pregunta" && resp[j] === null && sel[j] === i) D.cursor(g, x - 6, y - 6, 882, 202, "#fff"); });
      });
      // jugadores
      const w = Math.min(450, 1760 / J.n);
      J.jugadores.forEach((p, i) => {
        const x = 960 - (J.n * w) / 2 + i * w, y = 760;
        D.caja(g, x + 6, y, w - 12, 150, { relleno: "rgba(255,255,255,.06)", borde: resp[i] ? p.color : "rgba(255,255,255,.1)", r: 18 });
        D.ficha(g, x + 40, y + 40, 16, p.color, { anillo: false });
        D.texto(g, p.nombre, x + 66, y + 40, { tam: 24, peso: 700, max: w - 90 });
        D.texto(g, puntos[i], x + 30, y + 100, { tam: 44, titulo: true });
        if (fase === "pregunta") D.texto(g, resp[i] ? "✓" : "…", x + w - 36, y + 100, { tam: 40, alin: "right", color: resp[i] ? "#5fd38d" : "#a79db3" });
        else if (resp[i]) D.texto(g, ganados[i] ? "+" + ganados[i] : LET[resp[i].n] + " ✗", x + w - 36, y + 100, { tam: 32, alin: "right", peso: 700, color: ganados[i] ? "#5fd38d" : "#ef8b7b" });
        else D.texto(g, "sin responder", x + w - 36, y + 100, { tam: 22, alin: "right", color: "#a79db3" });
      });
      D.ayuda(g, "Responde con los botones de colores del móvil · con el mando: flechas y OK · cuanto antes, más puntos");
    }
  };
});
