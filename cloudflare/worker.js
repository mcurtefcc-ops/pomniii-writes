/**
 * Puente entre Telegram y GitHub Actions para pomniii.writes.
 *
 * Telegram avisa a este Worker en el instante en que mandas una orden al bot
 * (o pulsas Si / No en la propuesta de cada noche, o le escribes un texto tuyo),
 * y el Worker dispara el workflow que la ejecuta. Sin sondeos ni crons: la orden
 * llega en el momento y el post sale en unos 15 segundos.
 *
 * El Worker no publica nada ni toca Instagram. Solo hace de timbre: comprueba
 * que la orden es legitima y tuya, y avisa a GitHub. Toda la logica sigue en el
 * repositorio.
 *
 * Variables que hay que configurar en Cloudflare (Settings > Variables):
 *   GITHUB_PAT        token de GitHub con permiso sobre el repositorio  [secreto]
 *   GITHUB_REPO       mcurtefcc-ops/pomniii-writes
 *   TELEGRAM_SECRET   cadena inventada, la misma que se le da a Telegram [secreto]
 *   CHAT_AUTORIZADO   tu id de chat de Telegram
 */

const ORDENES = ["post", "probar", "saltar", "estado", "frase", "publicar", "cancelar", "si", "no"];

export default {
  async fetch(peticion, entorno) {
    // Salon de juegos: los ficheros de /juegos/ los sirve Cloudflare solo
    // (carpeta cloudflare/publico). Aqui solo llegan las conexiones de las salas
    // que unen el movil con la tele. Ver Sala, al final de este fichero.
    const sala = new URL(peticion.url).pathname.match(/^\/sala\/([A-Z0-9]{4,8})\/ws$/);
    if (sala) {
      if (!entorno.SALAS) return new Response("Salas no configuradas", { status: 503 });
      return entorno.SALAS.get(entorno.SALAS.idFromName(sala[1])).fetch(peticion);
    }
    if (peticion.method !== "POST") {
      // Visitas con el navegador: sirve para comprobar que el Worker esta vivo.
      return new Response("Puente de pomniii.writes activo.", { status: 200 });
    }

    // Telegram manda esta cabecera con el secreto que le dimos al registrar el
    // webhook. Sin esto, cualquiera que averigue la URL podria publicar.
    const secreto = peticion.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!entorno.TELEGRAM_SECRET || secreto !== entorno.TELEGRAM_SECRET) {
      return new Response("no", { status: 401 });
    }

    let actualizacion;
    try {
      actualizacion = await peticion.json();
    } catch {
      return respuestaOk();
    }

    const mensaje = actualizacion.message || actualizacion.edited_message;
    const texto = (mensaje?.text || "").trim();
    const chat = String(mensaje?.chat?.id || "");

    // A Telegram SIEMPRE se le contesta 200, aunque descartemos el mensaje: si
    // devolvemos un error, reintenta y acaba desactivando el webhook.
    if (!texto) return respuestaOk();
    if (chat !== String(entorno.CHAT_AUTORIZADO)) return respuestaOk();

    let orden, argumento;
    const simple = texto.toLowerCase();
    if (texto.startsWith("✅") || simple === "si" || simple === "sí") {
      // Boton "Si, publicalo" de la propuesta de cada noche.
      orden = "si";
      argumento = "";
    } else if (texto.startsWith("⏭") || simple === "no") {
      // Boton "No, otro": salta ese poema y propone el siguiente.
      orden = "no";
      argumento = "";
    } else if (!texto.startsWith("/")) {
      // Texto escrito tal cual: es un texto tuyo para publicar. Se manda como
      // /frase, que te ensena la tarjeta con los botones Si / No.
      orden = "frase";
      argumento = texto;
    } else {
      // La orden es la primera palabra; el resto (si lo hay) es el argumento,
      // que /frase necesita para llevar el texto que has escrito.
      const sinBarra = texto.slice(1);
      const corte = sinBarra.search(/\s/);
      orden = (corte === -1 ? sinBarra : sinBarra.slice(0, corte)).split("@")[0].toLowerCase();
      argumento = corte === -1 ? "" : sinBarra.slice(corte + 1).trim();
    }
    if (!ORDENES.includes(orden)) {
      await avisar(entorno, chat, "No conozco esa orden. Usa /post, /probar, /saltar, /estado o /frase <tu texto>.");
      return respuestaOk();
    }
    if (orden === "frase" && !argumento) {
      await avisar(
        entorno,
        chat,
        "Escribe la frase despues de la orden. Por ejemplo:\n/frase El silencio tambien es una respuesta."
      );
      return respuestaOk();
    }

    const r = await fetch(
      `https://api.github.com/repos/${entorno.GITHUB_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${entorno.GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          // GitHub rechaza las peticiones sin User-Agent.
          "User-Agent": "pomniii-writes-worker",
        },
        body: JSON.stringify({
          event_type: "telegram",
          client_payload: { orden, chat, texto: argumento },
        }),
      }
    );

    if (!r.ok) {
      const detalle = await r.text();
      await avisar(entorno, chat, `No pude avisar a GitHub (${r.status}). Revisa el GITHUB_PAT del Worker.`);
      return new Response(detalle.slice(0, 200), { status: 200 });
    }

    if (orden === "post" || orden === "publicar" || orden === "si") {
      await avisar(entorno, chat, "Recibido. Publicando, tardo unos segundos...");
    } else if (orden === "no") {
      await avisar(entorno, chat, "Vale, te preparo otro...");
    } else if (orden === "frase") {
      await avisar(entorno, chat, "Recibido. Preparando tu tarjeta...");
    }
    return respuestaOk();
  },
};

function respuestaOk() {
  return new Response("ok", { status: 200 });
}

/** Acuse de recibo inmediato, para que no parezca que el bot te ignora. */
async function avisar(entorno, chat, texto) {
  if (!entorno.TELEGRAM_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${entorno.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: texto }),
    });
  } catch {
    // Que falle el acuse no debe impedir que la orden siga su curso.
  }
}

/**
 * Una sala del Salon de juegos: une una tele con los moviles que hacen de mando.
 *
 * No sabe nada de juegos: lo que manda un movil se reenvia a la tele, y la tele
 * puede hablar a un movil concreto o a todos. Usa WebSockets con hibernacion,
 * asi que mientras nadie pulsa nada no gasta.
 *
 *   tele  -> /sala/ABCD/ws?rol=tv
 *   movil -> /sala/ABCD/ws?rol=mando&id=<id del movil>&nombre=<nombre>
 */
export class Sala {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(peticion) {
    if (peticion.headers.get("Upgrade") !== "websocket") {
      return new Response("Aqui se entra con WebSocket.", { status: 426 });
    }
    const url = new URL(peticion.url);
    const rol = url.searchParams.get("rol") === "tv" ? "tv" : "mando";
    const id = rol === "tv" ? "tv" : (url.searchParams.get("id") || crypto.randomUUID()).slice(0, 40);
    const nombre = (url.searchParams.get("nombre") || "Movil").slice(0, 16);

    // Una sola tele por sala, y un solo enchufe por movil (si recarga, se cierra el viejo).
    for (const viejo of this.ctx.getWebSockets(rol === "tv" ? "tv" : "m:" + id)) {
      try { viejo.close(4000, "reemplazado"); } catch {}
    }

    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor, rol === "tv" ? ["tv"] : ["mando", "m:" + id]);
    servidor.serializeAttachment({ rol, id, nombre });

    if (rol === "tv") {
      const mandos = this.abiertos("mando").map((w) => w.deserializeAttachment());
      servidor.send(JSON.stringify({ t: "lista", mandos }));
      this.aMandos({ t: "tele", on: true });
    } else {
      this.aTele({ t: "entra", id, nombre });
      servidor.send(JSON.stringify({ t: "hola", tele: this.abiertos("tv").length > 0 }));
    }
    return new Response(null, { status: 101, webSocket: cliente });
  }

  abiertos(etiqueta, salvo) {
    return this.ctx.getWebSockets(etiqueta).filter((w) => w !== salvo && w.readyState === 1);
  }

  aTele(m) {
    const texto = JSON.stringify(m);
    for (const w of this.abiertos("tv")) try { w.send(texto); } catch {}
  }

  aMandos(m, id) {
    const texto = JSON.stringify(m);
    for (const w of this.abiertos(id ? "m:" + id : "mando")) try { w.send(texto); } catch {}
  }

  webSocketMessage(ws, mensaje) {
    if (typeof mensaje !== "string" || mensaje.length > 8000) return;
    let m;
    try { m = JSON.parse(mensaje); } catch { return; }
    const yo = ws.deserializeAttachment();
    if (!yo) return;
    if (yo.rol === "mando") {
      if (m && m.t === "nombre" && typeof m.nombre === "string") {
        yo.nombre = m.nombre.slice(0, 16);
        ws.serializeAttachment(yo);
        this.aTele({ t: "entra", id: yo.id, nombre: yo.nombre });
        return;
      }
      this.aTele({ t: "in", id: yo.id, d: m });
    } else if (m && m.para) {
      this.aMandos({ t: "tv", d: m.d }, m.para === "todos" ? null : String(m.para));
    }
  }

  webSocketClose(ws, codigo) {
    this.despedir(ws);
    try { ws.close(codigo === 1005 ? 1000 : codigo, "adios"); } catch {}
  }

  webSocketError(ws) {
    this.despedir(ws);
  }

  despedir(ws) {
    const yo = ws.deserializeAttachment();
    if (!yo) return;
    if (yo.rol === "tv") {
      if (!this.abiertos("tv", ws).length) this.aMandos({ t: "tele", on: false });
    } else if (!this.abiertos("m:" + yo.id, ws).length) {
      this.aTele({ t: "sale", id: yo.id });
    }
  }
}
