"""Renueva el token de Instagram y lo guarda donde toca, sin intervencion.

    python -m herramientas.renovar_token

El token de Instagram Login dura 60 dias. Renovarlo devuelve una cadena NUEVA:
extender la caducidad no sirve de nada si no se guarda el valor nuevo, asi que
este script hace las dos cosas.

Donde lo guarda:
  - Si hay GH_PAT y GITHUB_REPOSITORY, actualiza el secret IG_ACCESS_TOKEN del
    repositorio via API. Esto es lo que hace que el proyecto siga solo: la
    tarea de manana leera ya el token nuevo.
  - Si existe un .env local, tambien lo actualiza ahi.

Sobre el GH_PAT: los workflows no pueden escribir secrets con el token que
GitHub les da por defecto, hace falta uno personal. Crea uno fino en
Settings > Developer settings > Personal access tokens > Fine-grained, dale
acceso solo a este repositorio y solo el permiso "Secrets: read and write", y
guardalo como secret GH_PAT.
"""

from __future__ import annotations

import base64
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from src import instagram, telegram  # noqa: E402

API = "https://api.github.com"


def _cifrar(clave_publica_b64: str, secreto: str) -> str:
    """Cifra el valor con la clave publica del repositorio (sealed box)."""
    try:
        from nacl import encoding, public
    except ImportError:
        raise SystemExit(
            "Falta PyNaCl, que es lo que cifra el secret. Instalalo con:\n"
            "  pip install pynacl"
        )
    clave = public.PublicKey(clave_publica_b64.encode(), encoding.Base64Encoder())
    return base64.b64encode(public.SealedBox(clave).encrypt(secreto.encode())).decode()


def guardar_en_github(repo: str, pat: str, nombre: str, valor: str) -> None:
    cabeceras = {
        "Authorization": f"Bearer {pat}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    r = requests.get(f"{API}/repos/{repo}/actions/secrets/public-key", headers=cabeceras, timeout=30)
    if r.status_code != 200:
        raise SystemExit(
            f"No se pudo leer la clave publica del repositorio ({r.status_code}). "
            "Revisa que el GH_PAT tenga permiso 'Secrets: read and write' sobre "
            f"{repo}. Respuesta: {r.text[:200]}"
        )
    clave = r.json()

    r = requests.put(
        f"{API}/repos/{repo}/actions/secrets/{nombre}",
        headers=cabeceras,
        json={"encrypted_value": _cifrar(clave["key"], valor), "key_id": clave["key_id"]},
        timeout=30,
    )
    if r.status_code not in (201, 204):
        raise SystemExit(f"No se pudo escribir el secret ({r.status_code}): {r.text[:200]}")
    print(f"  secret {nombre} actualizado en {repo}")


def guardar_en_env(ruta: Path, valor: str) -> None:
    lineas = ruta.read_text(encoding="utf-8").splitlines()
    salida = [
        f"IG_ACCESS_TOKEN={valor}" if l.startswith("IG_ACCESS_TOKEN=") else l
        for l in lineas
    ]
    ruta.write_text("\n".join(salida) + "\n", encoding="utf-8")
    print(f"  {ruta.name} actualizado")


def main() -> int:
    load_dotenv(RAIZ / ".env")

    modo = os.environ.get("IG_MODO", "instagram").strip().lower()
    if modo != "instagram":
        print("Modo 'facebook': el token de pagina no caduca, no hay nada que renovar.")
        return 0

    token = os.environ.get("IG_ACCESS_TOKEN", "")
    if not token:
        raise SystemExit("Falta IG_ACCESS_TOKEN.")

    try:
        datos = instagram.renovar(token)
    except instagram.ErrorInstagram as e:
        aviso = (
            "No se pudo renovar el token de Instagram. Si ya ha caducado, hay que "
            "generar uno nuevo a mano desde el panel de la app (paso 3 del README).\n\n"
            f"{e}"
        )
        print(aviso, file=sys.stderr)
        tg, chat = os.environ.get("TELEGRAM_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
        if tg and chat:
            try:
                telegram.enviar_texto(tg, chat, aviso)
            except telegram.ErrorTelegram:
                pass
        return 1

    nuevo = datos["access_token"]
    dias = int(datos.get("expires_in", 0)) // 86400
    print(f"Token renovado, vuelve a caducar en {dias} dias. Guardando:")

    guardado = False
    repo, pat = os.environ.get("GITHUB_REPOSITORY"), os.environ.get("GH_PAT")
    if repo and pat:
        guardar_en_github(repo, pat, "IG_ACCESS_TOKEN", nuevo)
        guardado = True
    else:
        print("  (sin GH_PAT/GITHUB_REPOSITORY: no se toca el secret del repositorio)")

    env = RAIZ / ".env"
    if env.exists():
        guardar_en_env(env, nuevo)
        guardado = True

    if not guardado:
        print("\nNo habia donde guardarlo. Pega este valor a mano:\n")
        print(nuevo)
        return 1

    tg, chat = os.environ.get("TELEGRAM_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if tg and chat:
        try:
            telegram.enviar_texto(
                tg, chat,
                f"Token de Instagram renovado sin problemas. Caduca dentro de {dias} dias. "
                "No tienes que hacer nada.",
            )
        except telegram.ErrorTelegram:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
