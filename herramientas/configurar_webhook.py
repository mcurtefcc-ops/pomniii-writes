"""Conecta (o desconecta) el bot de Telegram con el Worker de Cloudflare.

    python -m herramientas.configurar_webhook https://algo.workers.dev
    python -m herramientas.configurar_webhook --quitar

Con webhook activo, Telegram deja de encolar las ordenes para getUpdates y las
entrega al instante al Worker. Por eso los dos modos son excluyentes: mientras
haya webhook, "escuchar" ya no recibe nada y su cron debe estar desactivado.

El secreto que se genera aqui viaja en una cabecera en cada aviso de Telegram, y
el Worker lo comprueba. Sin el, cualquiera que averigue la URL del Worker podria
hacerse pasar por Telegram y publicar en tu cuenta.
"""

from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent


def _token() -> str:
    load_dotenv(RAIZ / ".env")
    t = os.environ.get("TELEGRAM_TOKEN", "")
    if not t:
        raise SystemExit("Falta TELEGRAM_TOKEN en el .env")
    return t


def _llamar(token: str, metodo: str, datos: dict | None = None) -> dict:
    r = requests.post(f"https://api.telegram.org/bot{token}/{metodo}", json=datos or {}, timeout=40)
    cuerpo = r.json()
    if not cuerpo.get("ok"):
        raise SystemExit(f"Telegram rechazo {metodo}: {cuerpo.get('description')}")
    return cuerpo["result"]


def estado(token: str) -> None:
    info = _llamar(token, "getWebhookInfo")
    print(f"  URL            : {info.get('url') or 'ninguna (modo sondeo)'}")
    print(f"  Pendientes     : {info.get('pending_update_count', 0)}")
    if info.get("last_error_message"):
        print(f"  Ultimo error   : {info['last_error_message']}")
        print(f"  Cuando         : {info.get('last_error_date')}")


def main() -> int:
    args = sys.argv[1:]
    token = _token()

    if not args:
        print("Estado actual del webhook:")
        estado(token)
        print("\nUso: python -m herramientas.configurar_webhook <URL del Worker>")
        print("     python -m herramientas.configurar_webhook --quitar")
        return 0

    if args[0] == "--quitar":
        _llamar(token, "deleteWebhook", {"drop_pending_updates": False})
        print("Webhook eliminado. Vuelve a funcionar el sondeo con 'escuchar'.")
        print("Acuerdate de reactivar el cron de escuchar.yml.")
        return 0

    url = args[0].rstrip("/")
    if not url.startswith("https://"):
        raise SystemExit("La URL del Worker tiene que empezar por https://")

    # Se puede pasar un secreto ya elegido, para poder configurar el Worker
    # antes de registrar el webhook y no tener que volver a tocarlo despues.
    secreto = args[1] if len(args) > 1 else secrets.token_urlsafe(32)
    _llamar(
        token,
        "setWebhook",
        {
            "url": url,
            "secret_token": secreto,
            # Solo mensajes: no hay botones que atender en este modo.
            "allowed_updates": ["message", "edited_message"],
            "drop_pending_updates": True,
        },
    )
    print("Webhook conectado.\n")
    estado(token)
    print("\n" + "=" * 62)
    print("Pega este valor en la variable TELEGRAM_SECRET del Worker,")
    print("marcandola como secreta (Encrypt):\n")
    print(f"  {secreto}\n")
    print("Sin ese valor el Worker rechazara todos los avisos de Telegram.")
    print("=" * 62)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
