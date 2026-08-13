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

# OJO: allowed_updates NO es un filtro por llamada, Telegram lo MEMORIZA hasta
# que se lo cambias. Si una sola llamada pide solo ["callback_query"], Telegram
# se queda descartando los mensajes de texto de todas las llamadas siguientes,
# aunque estas no pasen el parametro: los tira antes de encolarlos y ni siquiera
# aparecen en pending_update_count. Por eso todas las llamadas a getUpdates de
# este modulo mandan la misma lista completa.
TIPOS = ["message", "edited_message", "callback_query"]


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
    datos = {"offset": offset, "timeout": espera_s, "allowed_updates": TIPOS}
    actualizaciones = _llamar(token, "getUpdates", datos, espera=espera_s)

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


def leer_ordenes(token: str, offset: int, espera_s: int = 0) -> tuple[list[dict], int]:
    """Recoge las ordenes de texto que le has mandado al bot (/post, /estado...).

    No se filtra por allowed_updates a proposito: ese filtro descarta del todo
    los updates que no encajan cuando el offset avanza, y asi no se pierde nada
    si algun dia se vuelve a usar los botones.

    Devuelve (ordenes, nuevo_offset). Cada orden es
    {"orden", "argumento", "chat_id", "message_id", "de"}.
    """
    actualizaciones = _llamar(
        token,
        "getUpdates",
        {"offset": offset, "timeout": espera_s, "allowed_updates": TIPOS},
        espera=espera_s,
    )

    ordenes = []
    nuevo_offset = offset
    for act in actualizaciones:
        nuevo_offset = max(nuevo_offset, act["update_id"] + 1)
        msg = act.get("message") or act.get("edited_message")
        if not msg:
            continue
        texto = (msg.get("text") or "").strip()
        if not texto.startswith("/"):
            continue
        # Telegram manda /post@mi_bot en los grupos; se queda solo la orden.
        cuerpo = texto[1:].split(maxsplit=1)
        orden = cuerpo[0].split("@")[0].lower()
        ordenes.append(
            {
                "orden": orden,
                "argumento": cuerpo[1].strip() if len(cuerpo) > 1 else "",
                "chat_id": str(msg["chat"]["id"]),
                "message_id": msg["message_id"],
                "de": (msg.get("from") or {}).get("username")
                or (msg.get("from") or {}).get("first_name", "?"),
            }
        )
    return ordenes, nuevo_offset


def enviar_teclado(token: str, chat_id: str, texto: str) -> None:
    """Deja un teclado fijo en el chat con las ordenes como botones.

    Escribir "/post" a mano en el movil falla mas de lo que parece: el
    autocorrector se come la barra, el menu del "/" deja la orden escrita sin
    enviarla... Con un teclado de respuesta, tocar el boton manda el texto exacto.
    """
    teclado = {
        "keyboard": [
            [{"text": "/post"}, {"text": "/probar"}],
            [{"text": "/estado"}, {"text": "/saltar"}],
        ],
        "resize_keyboard": True,
        "is_persistent": True,
    }
    _llamar(
        token,
        "sendMessage",
        {"chat_id": chat_id, "text": texto, "reply_markup": teclado},
    )


def registrar_comandos(token: str) -> None:
    """Da de alta el menu de ordenes del bot, para que salgan al escribir "/"."""
    _llamar(
        token,
        "setMyCommands",
        {
            "commands": [
                {"command": "post", "description": "Publicar ahora el siguiente texto"},
                {"command": "probar", "description": "Ver la tarjeta sin publicar nada"},
                {"command": "saltar", "description": "Descartar el siguiente sin publicarlo"},
                {"command": "estado", "description": "Cuantos textos quedan"},
            ]
        },
    )


def averiguar_chat_id(token: str) -> list[str]:
    """Ayuda de instalacion: lista los chats que han escrito al bot.

    Se usa una sola vez, para saber que valor poner en TELEGRAM_CHAT_ID.
    """
    actualizaciones = _llamar(
        token, "getUpdates", {"timeout": 0, "allowed_updates": TIPOS}
    )
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
