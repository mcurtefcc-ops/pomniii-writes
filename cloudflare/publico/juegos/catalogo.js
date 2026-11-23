/* Catálogo del Salón de juegos: lo que se ve en el menú y las opciones de cada
   juego. El código de cada uno está en j/<id>.js y se carga al elegirlo. */
(function () {
  var NIVELES = { dificultad: true };
  Salon.categorias = [
    ["mesa", "De mesa"],
    ["fisica", "Billar, carrom y punteria"],
    ["arcade", "Arcade"],
    ["puzle", "Puzles"],
    ["cartas", "Cartas"],
    ["fiesta", "Fiesta (con móviles)"]
  ];
  Salon.catalogo = [
    // ---------------- Mesa ----------------
    { id: "damas", nombre: "Damas", icono: "⛀", cat: "mesa", desc: "Reglas españolas: comer es obligatorio y las damas vuelan.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "ajedrez", nombre: "Ajedrez", icono: "♞", cat: "mesa", desc: "El de siempre, con enroque, al paso y coronación.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "tresenraya", nombre: "Tres en raya", icono: "✕", cat: "mesa", desc: "Tres iguales en línea. En difícil la máquina no pierde nunca.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "cuatroenraya", nombre: "Cuatro en raya", icono: "◉", cat: "mesa", desc: "Deja caer fichas y junta cuatro.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "reversi", nombre: "Reversi", icono: "◐", cat: "mesa", desc: "Encierra las fichas rivales para darles la vuelta.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "gomoku", nombre: "Cinco en raya", icono: "⊕", cat: "mesa", desc: "En un tablero grande, junta cinco antes que el otro.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "mancala", nombre: "Mancala", icono: "◍", cat: "mesa", desc: "Siembra semillas y llena tu almacén.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "cajas", nombre: "Puntos y cajas", icono: "▦", cat: "mesa", desc: "Une puntos; quien cierra una caja la gana y repite.", min: 2, max: 4, maquina: true, dificultad: true, control: "cruceta",
      opciones: [{ id: "tam", nombre: "Tablero", valores: [[4, "4 x 4"], [5, "5 x 5"], [6, "6 x 6"]], def: 5 }] },
    { id: "nim", nombre: "Palillos", icono: "𝍸", cat: "mesa", desc: "Coge palillos de una fila. Quien coge el último pierde.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "flota", nombre: "Hundir la flota", icono: "⚓", cat: "mesa", desc: "Dispara a ciegas y hunde los barcos rivales.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta" },
    { id: "oca", nombre: "Juego de la oca", icono: "🎲", cat: "mesa", desc: "De oca a oca y tiro porque me toca. Hasta 4.", min: 2, max: 4, maquina: true, dificultad: false, control: "pulsar" },
    { id: "domino", nombre: "Dominó", icono: "🁫", cat: "mesa", desc: "Coloca tus fichas y quédate sin ninguna.", min: 2, max: 4, maquina: true, dificultad: true, control: "cruceta" },
    { id: "parchis", nombre: "Parchís", icono: "🟡", cat: "mesa", desc: "Cuatro fichas a casa. Se come y se cuentan 20.", min: 2, max: 4, maquina: true, dificultad: true, control: "cruceta" },

    // ---------------- Física ----------------
    { id: "billar", nombre: "Billar", icono: "🎱", cat: "fisica", desc: "Bola 8: lisas o rayadas y luego la negra.", min: 2, max: 2, maquina: true, dificultad: true, control: "apuntar" },
    { id: "carrom", nombre: "Carrom", icono: "◎", cat: "fisica", desc: "El billar de dedo de la India. Mete tus fichas y la reina.", min: 2, max: 4, maquina: true, dificultad: true, control: "apuntar" },
    { id: "hockey", nombre: "Hockey de aire", icono: "🏒", cat: "fisica", desc: "Mete el disco en la portería rival. A 7 goles.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta", tiempoReal: true },
    { id: "minigolf", nombre: "Minigolf", icono: "⛳", cat: "fisica", desc: "Nueve hoyos con obstáculos. Gana quien menos golpes da.", min: 1, max: 4, maquina: true, dificultad: true, control: "apuntar" },
    { id: "bolos", nombre: "Bolos", icono: "🎳", cat: "fisica", desc: "Diez turnos, con plenos y semiplenos.", min: 1, max: 4, maquina: true, dificultad: true, control: "apuntar" },
    { id: "tanques", nombre: "Tanques", icono: "💥", cat: "fisica", desc: "Ajusta ángulo y fuerza, cuenta con el viento y dispara.", min: 2, max: 4, maquina: true, dificultad: true, control: "apuntar" },

    // ---------------- Arcade ----------------
    { id: "serpiente", nombre: "Serpientes", icono: "🐍", cat: "arcade", desc: "Come y crece sin chocarte. Hasta 4 a la vez.", min: 1, max: 4, maquina: true, dificultad: true, control: "cruceta", tiempoReal: true },
    { id: "karts", nombre: "Karts", icono: "🏎", cat: "arcade", desc: "Carreras a tres vueltas con derrapes, turbos y objetos. Hasta 4 contra la máquina.", min: 1, max: 4, maquina: true, dificultad: true, control: "cruceta", tiempoReal: true,
      opciones: [{ id: "circuito", nombre: "Circuito", valores: [[1, "Bosque"], [2, "Playa"], [3, "Volcán"]], def: 1 }, { id: "vueltas", nombre: "Vueltas", valores: [[3, "3"], [5, "5"], [7, "7"]], def: 5 }] },
    { id: "tenis", nombre: "Tenis de mesa", icono: "🏓", cat: "arcade", desc: "Pala arriba y abajo. A 11 puntos.", min: 2, max: 2, maquina: true, dificultad: true, control: "cruceta", tiempoReal: true },
    { id: "ladrillos", nombre: "Rompeladrillos", icono: "🧱", cat: "arcade", desc: "Rompe todos los ladrillos con la pelota.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta", tiempoReal: true },
    { id: "bloques", nombre: "Bloques", icono: "🟪", cat: "arcade", desc: "Encaja las piezas que caen y completa filas.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta", tiempoReal: true },
    { id: "vuelo", nombre: "Vuelo", icono: "🐤", cat: "arcade", desc: "Aletea entre los tubos. Hasta 4 a la vez.", min: 1, max: 4, maquina: false, dificultad: true, control: "pulsar", tiempoReal: true },
    { id: "rocas", nombre: "Rocas espaciales", icono: "☄", cat: "arcade", desc: "Gira, dispara y parte las rocas en pedazos.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta", tiempoReal: true },
    { id: "invasores", nombre: "Defensa espacial", icono: "👾", cat: "arcade", desc: "Que no lleguen abajo. Oleadas cada vez más rápidas.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta", tiempoReal: true },

    // ---------------- Puzles ----------------
    { id: "buscaminas", nombre: "Buscaminas", icono: "💣", cat: "puzle", desc: "Destapa todo sin pisar una mina. OK destapa, mantén OK marca.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta" },
    { id: "sudoku", nombre: "Sudoku", icono: "#", cat: "puzle", desc: "Del 1 al 9 sin repetir en fila, columna ni cuadro.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta" },
    { id: "dosmil", nombre: "2048", icono: "🔢", cat: "puzle", desc: "Junta números iguales hasta llegar a 2048.", min: 1, max: 1, maquina: false, dificultad: false, control: "cruceta" },
    { id: "deslizante", nombre: "Puzle deslizante", icono: "🧩", cat: "puzle", desc: "Ordena las piezas moviéndolas al hueco.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta" },
    { id: "hanoi", nombre: "Torres de Hanói", icono: "🗼", cat: "puzle", desc: "Pasa la torre entera sin poner un disco grande sobre uno pequeño.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta" },
    { id: "simon", nombre: "Simón", icono: "🔴", cat: "puzle", desc: "Repite la secuencia de colores. Cada vez es más larga.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta" },
    { id: "memoria", nombre: "Parejas", icono: "🃏", cat: "puzle", desc: "Encuentra las parejas. Solo o contra otros.", min: 1, max: 4, maquina: true, dificultad: true, control: "cruceta" },
    { id: "ahorcado", nombre: "Ahorcado", icono: "🔤", cat: "puzle", desc: "Adivina la palabra letra a letra.", min: 1, max: 4, maquina: false, dificultad: true, control: "letras" },
    { id: "codigo", nombre: "Código secreto", icono: "🔐", cat: "puzle", desc: "Descubre la combinación de colores con las pistas.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta" },
    { id: "sopa", nombre: "Sopa de letras", icono: "🔎", cat: "puzle", desc: "Encuentra las palabras escondidas.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta" },

    // ---------------- Cartas ----------------
    { id: "veintiuna", nombre: "Veintiuna", icono: "🂡", cat: "cartas", desc: "Acércate a 21 sin pasarte. Contra la banca.", min: 1, max: 4, maquina: true, dificultad: false, control: "cruceta" },
    { id: "sieteymedia", nombre: "Siete y media", icono: "🂧", cat: "cartas", desc: "Con baraja española. Las figuras valen medio.", min: 1, max: 4, maquina: true, dificultad: false, control: "cruceta" },
    { id: "mayormenor", nombre: "Mayor o menor", icono: "⇅", cat: "cartas", desc: "¿La siguiente carta será mayor o menor? Haz racha.", min: 1, max: 4, maquina: false, dificultad: false, control: "cruceta" },
    { id: "solitario", nombre: "Solitario", icono: "♠", cat: "cartas", desc: "El clásico: ordena las cuatro pilas del as al rey.", min: 1, max: 1, maquina: false, dificultad: true, control: "cruceta" },

    // ---------------- Fiesta ----------------
    { id: "preguntas", nombre: "Concurso", icono: "❓", cat: "fiesta", desc: "Preguntas de cultura general. Responde rápido desde el móvil.", min: 1, max: 8, maquina: true, dificultad: true, control: "respuestas", tiempoReal: true,
      opciones: [{ id: "rondas", nombre: "Preguntas", valores: [[10, "10"], [15, "15"], [20, "20"]], def: 10 }] },
    { id: "reflejos", nombre: "¡Pulsa ya!", icono: "⚡", cat: "fiesta", desc: "Pulsa cuando se ponga verde. Si te adelantas, pierdes la ronda.", min: 1, max: 8, maquina: true, dificultad: true, control: "pulsar", tiempoReal: true }
  ];
})();
