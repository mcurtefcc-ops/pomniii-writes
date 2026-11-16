# Salón de juegos

Juegos para la tele (navegador Silk del Fire TV) que se manejan con el mando
del Stick **o con el móvil** como mando por WiFi.

- Tele: `https://<worker>/juegos/`
- Móvil: escanea el QR de la tele, o abre `https://<worker>/juegos/mando.html` y
  escribe el código de sala.

## Cómo encaja todo

```
 móvil (mando.html) ──WebSocket──►  Worker /sala/<CODIGO>/ws  ──►  Durable Object "Sala"
                                                                       │
 tele (index.html)  ◄──WebSocket──────────────────────────────────────┘
```

El Durable Object `Sala` (en `cloudflare/worker.js`) solo reenvía mensajes: lo
que manda un móvil le llega a la tele, y la tele puede hablar a un móvil o a
todos. Toda la lógica de los juegos vive en la tele.

## Ficheros

| Fichero | Qué es |
|---|---|
| `index.html` | La app de la tele: menú, configuración, pausa y resultados |
| `motor.js` | Motor común: bucle, entrada, red, sonido, dibujo, física, cartas, IA |
| `catalogo.js` | Lista de juegos con sus opciones (lo que se ve en el menú) |
| `mando.html` | El mando del móvil |
| `j/<id>.js` | Cada juego. Se carga solo cuando se elige |

## Contrato de un juego

`catalogo.js` declara los datos del juego:

```js
{ id: "tresenraya", nombre: "Tres en raya", icono: "⭕", cat: "mesa",
  desc: "…", min: 2, max: 2, maquina: true, dificultad: true,
  control: "cruceta",          // cruceta | apuntar | respuestas | pulsar | letras
  tiempoReal: false,           // true: todos los jugadores actúan a la vez
  opciones: [{ id, nombre, valores: [[valor, "texto"], …], def }] }
```

`j/<id>.js` registra la función que crea la partida:

```js
Salon.juego("tresenraya", function (J) {
  return {
    actualizar(dt) {},             // dt en segundos
    dibujar(g) {},                 // g: contexto 2D en coordenadas 1920x1080
    tecla(jug, accion) {},         // arriba abajo izquierda derecha ok
    apuntar(jug, a) {},            // a = { angulo, fuerza (0..1), disparar }
    respuesta(jug, n) {},          // 0..3
    letra(jug, ch) {},             // "A".."Z", "Ñ"
  };
});
```

`J` (la API del motor):

- `J.jugadores[i]` → `{ nombre, color, cpu, control }`; `J.n` cuántos.
- `J.dificultad` → 1, 2 o 3. `J.opcion(id)` → valor de una opción.
- `J.turno(i)` → dice de quién es el turno (para saber qué mando manda).
- `J.pulsada(i, accion)` → si ese jugador mantiene pulsada la tecla.
- `J.despues(ms, fn)` → temporizador que respeta la pausa.
- `J.terminar({ ganador, texto })` → `ganador` = índice, `null` = empate.
  `J.terminar({ puntos, texto })` en juegos de un jugador con récord.
- `J.record(clave, valor, mayorEsMejor)` → guarda y devuelve `{ nuevo, mejor }`.
- `J.sonido(nombre)` → clic mover comer gol ganar perder error golpe caida punto.
- `J.aviso(texto)` → mensaje breve en pantalla.
- `Salon.dib`, `Salon.fisica`, `Salon.cartas`, `Salon.ia` → ayudas comunes.

El botón **Atrás** (mando o móvil) siempre abre la pausa: los juegos no lo reciben.

## Pruebas

`index.html?prueba=<id>&vel=8` arranca el juego con todos los jugadores en
máquina (si el juego lo permite) a 8x de velocidad, y deja en
`window.__resultado` el final de la partida y en `window.__errores` los fallos.
