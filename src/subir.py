"""Hosting publico de la imagen.

Instagram no acepta que le subas un archivo: solo acepta una URL publica que
sus servidores puedan descargar. Asi que antes de publicar hay que dejar la
imagen colgada en algun sitio. Usamos imgbb, que es gratis y no pide tarjeta.
"""

from __future__ import annotations

import base64
from pathlib import Path

import requests

IMGBB = "https://api.imgbb.com/1/upload"


class ErrorSubida(RuntimeError):
    pass


def subir(ruta: Path, api_key: str, dias_vida: int = 30) -> str:
    """Sube la imagen y devuelve su URL publica.

    dias_vida solo le dice a imgbb cuando puede borrarla. Instagram se queda
    con su propia copia al publicar, asi que el enlace no necesita ser eterno.
    """
    if not api_key:
        raise ErrorSubida(
            "Falta IMGBB_API_KEY en el .env (o en los secrets de GitHub). "
            "Se saca gratis en https://api.imgbb.com/"
        )

    datos = {
        "key": api_key,
        "image": base64.b64encode(ruta.read_bytes()),
        "expiration": str(dias_vida * 86400),
        "name": ruta.stem,
    }
    try:
        r = requests.post(IMGBB, data=datos, timeout=90)
    except requests.RequestException as e:
        raise ErrorSubida(f"No se pudo contactar con imgbb: {e}") from e

    if r.status_code != 200:
        raise ErrorSubida(f"imgbb devolvio {r.status_code}: {r.text[:300]}")

    cuerpo = r.json()
    if not cuerpo.get("success"):
        raise ErrorSubida(f"imgbb rechazo la imagen: {cuerpo}")
    return cuerpo["data"]["url"]
