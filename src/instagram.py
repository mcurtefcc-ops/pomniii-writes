"""Publicacion en Instagram. Soporta las dos modalidades de Meta.

Meta ofrece dos caminos distintos para lo mismo, y no son intercambiables:

  modo "instagram"  (Instagram API con Instagram Login)  <- el que usamos
      Host graph.instagram.com. La app tiene su propio App ID de Instagram y
      el token se genera desde el panel de la app, en "Genera identificadores
      de acceso". No hace falta pagina de Facebook ni el Explorador de la API
      Graph. Permisos con prefijo instagram_business_*.
      Contrapartida: el token dura 60 dias y hay que renovarlo (ver renovar()).

  modo "facebook"  (Instagram API con Facebook Login)
      Host graph.facebook.com. Requiere pagina de Facebook vinculada y sacar
      un token de pagina, que a cambio no caduca nunca. Permisos instagram_basic
      e instagram_content_publish.

Se elige con IG_MODO en el .env. Por defecto "instagram".

En las dos modalidades publicar son dos llamadas y una espera:

  1. POST /{ig_user_id}/media          crea un "contenedor" con la imagen
  2. GET  /{creation_id}?status_code   hay que esperar a que ponga FINISHED
  3. POST /{ig_user_id}/media_publish  lo saca al perfil

El paso 2 se lo salta mucha gente y es justo el que provoca fallos
intermitentes: Instagram tarda unos segundos en descargar la imagen desde la
URL publica, y hasta que no acaba no se puede publicar.
"""

from __future__ import annotations

import time

import requests

HOSTS = {
    "instagram": "https://graph.instagram.com",
    "facebook": "https://graph.facebook.com",
}


class ErrorInstagram(RuntimeError):
    pass


def _host(modo: str) -> str:
    if modo not in HOSTS:
        raise ErrorInstagram(
            f"IG_MODO='{modo}' no es valido. Usa 'instagram' o 'facebook'."
        )
    return HOSTS[modo]


def _raiz(modo: str, version: str) -> str:
    return f"{_host(modo)}/{version}"


def _detalle(r: requests.Response) -> str:
    try:
        err = r.json().get("error", {})
        partes = [
            err.get("message", ""),
            f"(tipo: {err.get('type')}, codigo: {err.get('code')})" if err.get("code") else "",
            err.get("error_user_msg", "") or "",
        ]
        return " ".join(p for p in partes if p).strip() or r.text[:300]
    except ValueError:
        return r.text[:300]


def _post(url: str, datos: dict) -> dict:
    try:
        r = requests.post(url, data=datos, timeout=90)
    except requests.RequestException as e:
        raise ErrorInstagram(f"Sin conexion con la API: {e}") from e
    if r.status_code != 200:
        raise ErrorInstagram(_detalle(r))
    return r.json()


def _get(url: str, params: dict) -> dict:
    try:
        r = requests.get(url, params=params, timeout=60)
    except requests.RequestException as e:
        raise ErrorInstagram(f"Sin conexion con la API: {e}") from e
    if r.status_code != 200:
        raise ErrorInstagram(_detalle(r))
    return r.json()


# --------------------------------------------------------------------------
# Identidad y token
# --------------------------------------------------------------------------


def descubrir_user_id(token: str, modo: str = "instagram", version: str = "v23.0") -> str:
    """Averigua el id de la cuenta a partir del token.

    Solo funciona en modo "instagram": ahi el token ya pertenece a la cuenta
    de Instagram, asi que el id se puede deducir y no hace falta pedirlo en el
    .env. En modo "facebook" el token es de una pagina que puede administrar
    varias cuentas, y hay que decir cual.
    """
    if modo != "instagram":
        raise ErrorInstagram(
            "En modo 'facebook' hay que indicar IG_USER_ID a mano: el token de "
            "pagina no identifica una sola cuenta."
        )
    datos = _get(f"{_raiz(modo, version)}/me", {"fields": "user_id,username", "access_token": token})
    uid = datos.get("user_id") or datos.get("id")
    if not uid:
        raise ErrorInstagram(f"La API no devolvio el id de la cuenta: {datos}")
    return str(uid)


def comprobar_credenciales(
    ig_user_id: str, token: str, modo: str = "instagram", version: str = "v23.0"
) -> dict:
    """Consulta el perfil para verificar que el token sirve."""
    if modo == "instagram":
        # El propio token identifica la cuenta, asi que "me" basta y de paso
        # comprueba que el token no ha caducado.
        return _get(
            f"{_raiz(modo, version)}/me",
            {"fields": "user_id,username", "access_token": token},
        )
    return _get(
        f"{_raiz(modo, version)}/{ig_user_id}",
        {"fields": "username,followers_count", "access_token": token},
    )


def obtener_enlace(
    post_id: str, token: str, modo: str = "instagram", version: str = "v23.0"
) -> str:
    """Enlace publico del post, para poder abrirlo desde el aviso de Telegram."""
    try:
        return _get(
            f"{_raiz(modo, version)}/{post_id}",
            {"fields": "permalink", "access_token": token},
        ).get("permalink", "")
    except ErrorInstagram:
        # El post ya esta publicado; no tener el enlace no es un fallo.
        return ""


def renovar(token: str) -> dict:
    """Renueva un token de larga duracion de Instagram Login (60 dias mas).

    Solo aplica al modo "instagram". Se puede llamar en cualquier momento
    mientras el token siga vivo; si ya caduco no hay renovacion posible y hay
    que generar uno nuevo desde el panel de la app.

    Devuelve {"access_token": ..., "expires_in": segundos}.
    """
    return _get(
        "https://graph.instagram.com/refresh_access_token",
        {"grant_type": "ig_refresh_token", "access_token": token},
    )


# --------------------------------------------------------------------------
# Publicacion
# --------------------------------------------------------------------------


def publicar(
    url_imagen: str,
    pie: str,
    ig_user_id: str,
    token: str,
    version: str = "v23.0",
    modo: str = "instagram",
    espera_max: int = 90,
) -> str:
    """Publica la foto y devuelve el id del post. Lanza ErrorInstagram si no."""
    if not token:
        raise ErrorInstagram("Falta IG_ACCESS_TOKEN. Mira el README.")
    if not ig_user_id:
        if modo != "instagram":
            raise ErrorInstagram("Falta IG_USER_ID.")
        ig_user_id = descubrir_user_id(token, modo, version)

    raiz = _raiz(modo, version)

    # 1. contenedor
    contenedor = _post(
        f"{raiz}/{ig_user_id}/media",
        {"image_url": url_imagen, "caption": pie, "access_token": token},
    )
    creation_id = contenedor.get("id")
    if not creation_id:
        raise ErrorInstagram(f"No se recibio contenedor: {contenedor}")

    # 2. esperar a que Instagram termine de descargar la imagen
    esperado, intervalo = 0, 3
    while esperado < espera_max:
        try:
            estado = _get(
                f"{raiz}/{creation_id}",
                {"fields": "status_code", "access_token": token},
            ).get("status_code")
        except ErrorInstagram:
            estado = None

        if estado == "FINISHED":
            break
        if estado == "ERROR":
            raise ErrorInstagram(
                "Instagram no pudo procesar la imagen. Casi siempre es que la "
                f"URL publica no le responde bien: {url_imagen}"
            )
        time.sleep(intervalo)
        esperado += intervalo
    else:
        raise ErrorInstagram(
            f"El contenedor sigue sin estar listo tras {espera_max}s. "
            "Reintenta mas tarde; la imagen ya esta subida."
        )

    # 3. publicar
    resultado = _post(
        f"{raiz}/{ig_user_id}/media_publish",
        {"creation_id": creation_id, "access_token": token},
    )
    post_id = resultado.get("id")
    if not post_id:
        raise ErrorInstagram(f"No se recibio id del post publicado: {resultado}")
    return post_id
