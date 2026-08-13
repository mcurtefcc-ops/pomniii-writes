"""Insiste en registrar el webhook hasta que Telegram resuelva el dominio.

    python -m herramientas.reintentar_webhook <URL> <secreto> [minutos]

Cuando se acaba de crear un subdominio, los servidores DNS de Telegram pueden
tener cacheado que no existia y rechazan el registro con "Failed to resolve
host". No hay nada que arreglar: esa cache negativa caduca sola en 10-30
minutos. Esto reintenta cada dos minutos y avisa por Telegram al conseguirlo.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
load_dotenv(RAIZ / ".env")


def main() -> int:
    if len(sys.argv) < 3:
        raise SystemExit("Uso: python -m herramientas.reintentar_webhook <URL> <secreto> [minutos]")

    url, secreto = sys.argv[1].rstrip("/"), sys.argv[2]
    minutos = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    token = os.environ["TELEGRAM_TOKEN"]
    chat = os.environ.get("TELEGRAM_CHAT_ID", "")

    fin = time.monotonic() + minutos * 60
    intento = 0
    while time.monotonic() < fin:
        intento += 1
        r = requests.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={
                "url": url,
                "secret_token": secreto,
                "allowed_updates": ["message", "edited_message"],
                "drop_pending_updates": True,
            },
            timeout=60,
        ).json()

        if r.get("ok"):
            print(f"CONECTADO en el intento {intento}.", flush=True)
            if chat:
                try:
                    requests.post(
                        f"https://api.telegram.org/bot{token}/sendMessage",
                        json={
                            "chat_id": chat,
                            "text": "Bot conectado al Worker. Ya puedes mandar /probar "
                            "y responde en segundos.",
                        },
                        timeout=30,
                    )
                except requests.RequestException:
                    pass
            return 0

        print(f"intento {intento}: {r.get('description')}", flush=True)
        time.sleep(120)

    print(f"Sin exito tras {minutos} minutos.", flush=True)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
