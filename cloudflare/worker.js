/**
 * Puente entre Telegram y GitHub Actions para pomniii.writes.
 *
 * Telegram avisa a este Worker en el instante en que mandas una orden al bot, y
 * el Worker dispara el workflow que la ejecuta. Sin sondeos ni crons: la orden
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

const ORDENES = ["post", "probar", "saltar", "estado"];

export default {
  async fetch(peticion, entorno) {
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
    if (!texto.startsWith("/")) return respuestaOk();
    if (chat !== String(entorno.CHAT_AUTORIZADO)) return respuestaOk();

    const orden = texto.slice(1).split(/\s+/)[0].split("@")[0].toLowerCase();
    if (!ORDENES.includes(orden)) {
      await avisar(entorno, chat, "No conozco esa orden. Usa /post, /probar, /saltar o /estado.");
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
          client_payload: { orden, chat },
        }),
      }
    );

    if (!r.ok) {
      const detalle = await r.text();
      await avisar(entorno, chat, `No pude avisar a GitHub (${r.status}). Revisa el GITHUB_PAT del Worker.`);
      return new Response(detalle.slice(0, 200), { status: 200 });
    }

    if (orden === "post") {
      await avisar(entorno, chat, "Recibido. Publicando, tardo unos segundos...");
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
