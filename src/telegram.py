"""Canal de control por Telegram: propuesta diaria y aprobacion con botones.

Se usa Telegram y no WhatsApp por un motivo tecnico concreto: WhatsApp solo
entrega los mensajes entrantes por webhook, asi que para leer tu "OK" harian
falta un dominio publico y un servicio siempre encendido. Telegram tiene
getUpdates, que se puede consultar desde una tarea programada sin servidor
ninguno. Eso es lo que permite que esto funcione sin PC y sin pagar nada.

No se usa parse_mode a proposito: los textos llevan comillas, dos puntos y
guiones, y en Markdown alguno acabaria rompiendo el envio.
"""

from __future__ import annotations

import requests

BASE = "https://api.telegram.org/bot"


class ErrorTelegram(RuntimeError):
    pass


def _llamar(token: str, metodo: str, datos: dict, espera: int = 60) -> dict:
    if not token:
        raise ErrorTelegram("Falta TELEGRAM_TOKEN. Mira el paso 4 del README.")
    try:
        r = requests.post(f"{BASE}{token}/{metodo}", json=datos, timeout=espera + 15)
    except requests.RequestException as e:
        raise ErrorTelegram(f"Sin conexion con Telegram: {e}") from e
    cuerpo = r.json() if r.content else {}
    if not cuerpo.get("ok"):
        raise ErrorTelegram(
            f"Telegram rechazo {metodo}: {cuerpo.get('description', r.text[:300])}"
        )
    return cuerpo["result"]


def enviar_texto(token: str, chat_id: str, texto: str) -> None:
    _llamar(token, "sendMessage", {"chat_id": chat_id, "text": texto})


def enviar_propuesta(
    token: str,
    chat_id: str,
    url_imagen: str,
    item: dict,
    fecha: str,
    numero: int | None = None,
) -> int:
    """Manda la imagen del dia con los botones. Devuelve el message_id."""
    cabecera = f"Propuesta para hoy ({fecha})"
    if numero is not None:
        cabecera += f" · seria el post #{numero:04d}"
    pie = (
        f"{cabecera}\n"
        f"texto {item['id']} · {item.get('voz', '-')} · {item.get('tipo', 'texto')} "
        f"· {item.get('tema', '-')}\n\n"
        f"{item['texto']}"
    )
    teclado = {
        "inline_keyboard": [
            [
                {"text": "✅ Publicar", "callback_data": f"pub:{item['id']}"},
                {"text": "⏭ Saltar hoy", "callback_data": f"salta:{item['id']}"},
            ],
            [
                {"text": "🔄 Otra", "callback_data": f"otra:{item['id']}"},
                {"text": "🚫 No usar nunca", "callback_data": f"desc:{item['id']}"},
            ],
        ]
    }
    res = _llamar(
        token,
        "sendPhoto",
        {
            "chat_id": chat_id,
            "photo": url_imagen,
            "caption": pie[:1024],
            "reply_markup": teclado,
        },
    )
    return res["message_id"]


def enviar_publicado(
    token: str,
    chat_id: str,
    url_imagen: str,
    item: dict,
    numero: int,
    fecha: str,
    enlace: str = "",
) -> None:
    """Aviso de que el post ya se ha publicado. Sin botones: no hay que decidir nada.

    Se manda igualmente en modo automatico para que tengas registro diario de
    lo que sale, y para enterarte el dia que algo deje de salir.
    """
    lineas = [
        f"PUBLICADO · post #{numero:04d} ({fecha})",
        f"texto {item['id']} · {item.get('voz', '-')} · {item.get('tipo', '-')}",
        "",
        item["texto"],
    ]
    if enlace:
        lineas += ["", enlace]
    _llamar(
        token,
        "sendPhoto",
        {"chat_id": chat_id, "photo": url_imagen, "caption": "\n".join(lineas)[:1024]},
    )


def confirmar_pulsacion(token: str, callback_id: str, aviso: str) -> None:
    """Quita el reloj de arena del boton y ensena un aviso corto en el movil."""
    try:
        _llamar(
            token,
            "answerCallbackQuery",
            {"callback_query_id": callback_id, "text": aviso[:200]},
        )
    except ErrorTelegram:
        # Si la pulsacion ya caduco da igual: el trabajo importante ya se hizo.
        pass


def quitar_botones(token: str, chat_id: str, message_id: int, nota: str) -> None:
    """Deja el mensaje sin botones y con el resultado, para no pulsar dos veces."""
    try:
        _llamar(
            token,
            "editMessageCaption",
            {
                "chat_id": chat_id,
                "message_id": message_id,
                "caption": nota[:1024],
                "reply_markup": {"inline_keyboard": []},
            },
        )
    except ErrorTelegram:
        pass


def leer_acciones(token: str, offset: int, espera_s: int = 0) -> tuple[list[dict], int]:
    """Recoge las pulsaciones de boton pendientes.

    espera_s usa el long polling de Telegram: el servidor mantiene la peticion
    abierta hasta que llega algo, en vez de que nosotros preguntemos en bucle.

    Devuelve (acciones, nuevo_offset). Cada accion es
    {"tipo": "pub"|"salta"|"otra", "id_texto", "callback_id", "chat_id",
     "message_id"}.
    """
    datos = {"offset": offset, "timeout": espera_s, "allowed_updates": ["callback_query"]}
    try:
        actualizaciones = _llamar(token, "getUpdates", datos, espera=espera_s)
    except ErrorTelegram:
        raise

    acciones = []
    nuevo_offset = offset
    for act in actualizaciones:
        nuevo_offset = max(nuevo_offset, act["update_id"] + 1)
        cb = act.get("callback_query")
        if not cb:
            continue
        datos_cb = cb.get("data", "")
        if ":" not in datos_cb:
            continue
        tipo, id_texto = datos_cb.split(":", 1)
        acciones.append(
            {
                "tipo": tipo,
                "id_texto": id_texto,
                "callback_id": cb["id"],
                "chat_id": str(cb["message"]["chat"]["id"]),
                "message_id": cb["message"]["message_id"],
            }
        )
    return acciones, nuevo_offset


def averiguar_chat_id(token: str) -> list[str]:
    """Ayuda de instalacion: lista los chats que han escrito al bot.

    Se usa una sola vez, para saber que valor poner en TELEGRAM_CHAT_ID.
    """
    actualizaciones = _llamar(token, "getUpdates", {"timeout": 0})
    vistos = []
    for act in actualizaciones:
        for clave in ("message", "callback_query"):
            obj = act.get(clave)
            if not obj:
                continue
            msg = obj if clave == "message" else obj.get("message", {})
            chat = msg.get("chat", {})
            etiqueta = f"{chat.get('id')}  ({chat.get('first_name') or chat.get('title')})"
            if etiqueta not in vistos:
                vistos.append(etiqueta)
    return vistos
