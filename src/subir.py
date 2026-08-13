"""Hosting publico de la tarjeta.

Instagram no acepta que le subas un archivo: solo una URL publica que sus
servidores puedan descargar. Y no le basta con que exista, tiene que servirla
rapido: si tarda, responde "Timeout, la descarga del archivo multimedia tarda
demasiado" (codigo -2) y no publica.

Hay dos destinos:

  github  (recomendado)  Sube la tarjeta al propio repositorio y usa la URL de
          raw.githubusercontent.com, que va por CDN y responde rapido a los
          servidores de Meta. No hace falta ningun servicio extra ni otra clave:
          reutiliza el GH_PAT que ya se usa para renovar el token. El precio es
          que el repositorio engorda unos 124 KB por post (~45 MB al ano).

  imgbb   Alternativa sin GitHub. Funciona, pero es lenta de forma intermitente
          para el descargador de Meta y provoca el timeout de arriba.

Se elige con HOSTING en el .env. Por defecto se usa github si estan GH_PAT y
GITHUB_REPO, y si no se cae a imgbb.
"""

from __future__ import annotations

import base64
from pathlib import Path

import requests

IMGBB = "https://api.imgbb.com/1/upload"
GITHUB = "https://api.github.com"


class ErrorSubida(RuntimeError):
    pass


# --------------------------------------------------------------------------


def subir_a_github(ruta: Path, repo: str, token: str, carpeta: str = "publicadas") -> str:
    """Sube la tarjeta al repositorio y devuelve su URL de descarga directa."""
    if not (repo and token):
        raise ErrorSubida("Faltan GITHUB_REPO o GH_PAT para alojar en GitHub.")

    destino = f"{carpeta}/{ruta.name}"
    url = f"{GITHUB}/repos/{repo}/contents/{destino}"
    cabeceras = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    # Si el archivo ya existe hay que mandar su sha o GitHub rechaza el cambio.
    # Pasa al reintentar el mismo dia con el mismo texto.
    sha = None
    try:
        previo = requests.get(url, headers=cabeceras, timeout=30)
        if previo.status_code == 200:
            sha = previo.json().get("sha")
    except requests.RequestException:
        pass

    datos = {
        "message": f"tarjeta {ruta.name} [skip ci]",
        "content": base64.b64encode(ruta.read_bytes()).decode(),
    }
    if sha:
        datos["sha"] = sha

    try:
        r = requests.put(url, headers=cabeceras, json=datos, timeout=90)
    except requests.RequestException as e:
        raise ErrorSubida(f"No se pudo contactar con GitHub: {e}") from e

    if r.status_code not in (200, 201):
        raise ErrorSubida(f"GitHub devolvio {r.status_code}: {r.text[:300]}")

    enlace = (r.json().get("content") or {}).get("download_url")
    if not enlace:
        raise ErrorSubida(f"GitHub no devolvio enlace de descarga: {r.text[:300]}")
    return enlace


def subir_a_imgbb(ruta: Path, api_key: str, dias_vida: int = 30) -> str:
    """Sube la tarjeta a imgbb y devuelve su URL publica."""
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


# --------------------------------------------------------------------------


def hospedar(ruta: Path, env: dict) -> str:
    """Deja la tarjeta en una URL publica, por el destino que toque."""
    destino = (env.get("hosting") or "").strip().lower()
    if not destino:
        destino = "github" if (env.get("gh_pat") and env.get("gh_repo")) else "imgbb"

    if destino == "github":
        return subir_a_github(ruta, env["gh_repo"], env["gh_pat"])
    if destino == "imgbb":
        return subir_a_imgbb(ruta, env.get("imgbb", ""))
    raise ErrorSubida(f"HOSTING='{destino}' no es valido. Usa 'github' o 'imgbb'.")


# Nombre antiguo, por si queda alguna llamada suelta.
def subir(ruta: Path, api_key: str, dias_vida: int = 30) -> str:
    return subir_a_imgbb(ruta, api_key, dias_vida)
