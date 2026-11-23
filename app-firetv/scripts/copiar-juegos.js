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

fs.writeFileSync(
  path.join(destino, 'config.js'),
  '/* Generado al fabricar la app. */\nwindow.SALON_SERVIDOR = ' + JSON.stringify(servidor) + ';\n',
);
console.log('[pomniii] Salón copiado en assets/juegos' + (servidor ? ' · sala: ' + servidor : ' · SIN dirección de sala: el mando del móvil no funcionará'));
