// Copia el Salón de juegos dentro de la app antes de fabricarla, y escribe
// config.js con la dirección de la sala de Cloudflare (para el mando del móvil).
//
// La dirección se toma de la variable SALON_SERVIDOR o del fichero servidor.txt
// de esta carpeta (una línea, p. ej. https://pomniii-bot.micuenta.workers.dev).
const fs = require('fs');
const path = require('path');

const origen = path.join(__dirname, '..', '..', 'cloudflare', 'publico', 'juegos');
const destino = path.join(__dirname, '..', 'assets', 'juegos');

fs.rmSync(destino, {recursive: true, force: true});
fs.cpSync(origen, destino, {recursive: true});
fs.rmSync(path.join(destino, 'LEEME.md'), {force: true});

let servidor = (process.env.SALON_SERVIDOR || '').trim();
const fichero = path.join(__dirname, '..', 'servidor.txt');
if (!servidor && fs.existsSync(fichero)) servidor = fs.readFileSync(fichero, 'utf8').trim();
servidor = servidor.replace(/\/+$/, '');

// Datos privados (agenda y ciudad): solo en privado.json, que NO se sube al
// repositorio (está en .gitignore). Ejemplo:
//   {"ciudad": "Zaragoza", "agenda": {"servidor": "https://…workers.dev", "grupo": "CODIGO"}}
let privado = {};
const fPrivado = path.join(__dirname, '..', 'privado.json');
if (fs.existsSync(fPrivado)) privado = JSON.parse(fs.readFileSync(fPrivado, 'utf8'));

// Lo público de config.js (p. ej. el Client ID de Spotify) se conserva.
const publico = fs.readFileSync(path.join(origen, 'config.js'), 'utf8');
fs.writeFileSync(
  path.join(destino, 'config.js'),
  publico + '\n/* Generado al fabricar la app. */\nwindow.SALON_SERVIDOR = ' + JSON.stringify(servidor) + ';\n' +
    (privado.ciudad ? 'window.SALON_CIUDAD = ' + JSON.stringify(privado.ciudad) + ';\n' : '') +
    (privado.agenda ? 'window.SALON_AGENDA = ' + JSON.stringify(privado.agenda) + ';\n' : ''),
);
if (privado.agenda) console.log('[pomniii] Agenda incluida (dato privado, no se sube a GitHub)');
console.log('[pomniii] Salón copiado en assets/juegos' + (servidor ? ' · sala: ' + servidor : ' · SIN dirección de sala: el mando del móvil no funcionará'));
