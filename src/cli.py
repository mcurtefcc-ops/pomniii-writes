"""Linea de comandos de pomniii.writes.

El dia a dia son dos comandos, y los lanza GitHub Actions, no tu:

  proponer   elige el siguiente texto, monta la tarjeta, la sube a un host
             publico y te la manda por Telegram con los botones.
  recoger    lee que boton pulsaste y actua: publica, salta o propone otra.

Estan separados a proposito. Si fuera un solo comando que espera tu respuesta,
la tarea tendria que quedarse encendida horas cada dia esperando, y eso son
minutos de Actions tirados. Asi "proponer" acaba en un minuto y "recoger"
pasa cada media hora a ver si has contestado.

Comandos de instalacion y de mano: logos, estado, probar, chatid, verificar.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from . import instagram, telegram
from .frases import (
    RAIZ,
    cargar_banco,
    cargar_estado,
    descartar,
    elegir,
    guardar_estado,
    marcar_usado,
    numero_siguiente,
    resumen,
)
from .imagen import construir_pie_de_foto, crear_post
from .marca import guardar_logos
from .subir import subir
from .util import cargar_config

PENDIENTE = RAIZ / "data" / "pendiente.json"


# --------------------------------------------------------------------------
# Entorno y estado de la propuesta en curso
# --------------------------------------------------------------------------


def _entorno() -> dict:
    load_dotenv(RAIZ / ".env")
    return {
        "ig_user_id": os.environ.get("IG_USER_ID", ""),
        "ig_token": os.environ.get("IG_ACCESS_TOKEN", ""),
        "graph": os.environ.get("GRAPH_VERSION", "v23.0"),
        # "instagram" = Instagram API con Instagram Login (graph.instagram.com).
        # "facebook"  = con Facebook Login y token de pagina.
        "modo": os.environ.get("IG_MODO", "instagram").strip().lower(),
        "imgbb": os.environ.get("IMGBB_API_KEY", ""),
        "tg_token": os.environ.get("TELEGRAM_TOKEN", ""),
        "tg_chat": os.environ.get("TELEGRAM_CHAT_ID", ""),
    }


def _toca_ahora(cfg: dict) -> tuple[bool, str]:
    """¿Es la hora local de mandar la propuesta?

    El cron de GitHub Actions solo entiende UTC y no conoce el horario de
    verano, asi que proponer.yml se lanza a dos horas UTC distintas y este
    guardian deja pasar solo la que cae bien segun la epoca del ano.

    Se acepta una ventana de varias horas y no la hora exacta porque las tareas
    programadas de Actions se retrasan entre 5 y 30 minutos cuando hay cola: con
    una comprobacion exacta, un retraso grande haria que ese dia no se publicara
    nada. Que las dos ejecuciones caigan dentro de la ventana no duplica el post,
    porque proponer() ya se niega a actuar si hay una propuesta sin responder.
    """
    prog = cfg.get("programacion") or {}
    hora = prog.get("hora")
    if hora is None:
        return True, ""

    zona = prog.get("zona", "Europe/Madrid")
    ventana = int(prog.get("ventana_horas", 2))
    try:
        from zoneinfo import ZoneInfo

        ahora = dt.datetime.now(ZoneInfo(zona))
    except Exception as e:
        # Sin base de datos de zonas horarias no se puede decidir. Se sigue
        # adelante a proposito: es mejor mandar la propuesta a una hora rara
        # que quedarse sin publicar.
        print(f"AVISO: no se pudo leer la zona '{zona}' ({e}). Se continua sin comprobar la hora.")
        return True, ""

    if hora <= ahora.hour < hora + ventana:
        return True, f"{ahora:%H:%M} en {zona}"
    return False, (
        f"En {zona} son las {ahora:%H:%M}. La propuesta se manda entre las "
        f"{hora}:00 y las {hora + ventana}:00, asi que hoy no toca en esta pasada."
    )


def cargar_pendiente() -> dict | None:
    if not PENDIENTE.exists():
        return None
    with open(PENDIENTE, encoding="utf-8") as f:
        return json.load(f)


def guardar_pendiente(datos: dict) -> None:
    PENDIENTE.parent.mkdir(parents=True, exist_ok=True)
    with open(PENDIENTE, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)


def borrar_pendiente() -> None:
    PENDIENTE.unlink(missing_ok=True)


# --------------------------------------------------------------------------
# Piezas compartidas
# --------------------------------------------------------------------------


def _preparar(item: dict, cfg: dict, env: dict, fecha: dt.date, numero: int) -> dict:
    """Monta la tarjeta, la deja colgada en un host publico y devuelve el pendiente."""
    ruta = crear_post(item, cfg, fecha, numero)
    print(f"  tarjeta: {ruta.name} (post #{numero:04d})")
    url = subir(ruta, env["imgbb"])
    print(f"  subida:  {url}")
    return {
        "id": item["id"],
        "numero": numero,
        "fecha": fecha.isoformat(),
        "url": url,
        "pie": construir_pie_de_foto(item, cfg),
        "ruta_local": str(ruta),
    }


def _publicar_pendiente(pendiente: dict, env: dict) -> str:
    return instagram.publicar(
        pendiente["url"],
        pendiente["pie"],
        env["ig_user_id"],
        env["ig_token"],
        env["graph"],
        env["modo"],
    )


# --------------------------------------------------------------------------
# Comandos
# --------------------------------------------------------------------------


def cmd_logos(args) -> int:
    cfg = cargar_config()
    for p in guardar_logos(cfg):
        print(p)
    print("\nPara el perfil de Instagram usa avatar_monograma_1000.png.")
    return 0


def cmd_estado(args) -> int:
    print(resumen())
    pendiente = cargar_pendiente()
    if pendiente:
        print(f"\nHay una propuesta esperando respuesta: #{pendiente['id']} ({pendiente['fecha']})")
    else:
        print("\nNo hay ninguna propuesta pendiente.")
    return 0


def cmd_probar(args) -> int:
    """Genera tarjetas en local sin subir ni publicar nada."""
    cfg = cargar_config()
    banco = {i["id"]: i for i in cargar_banco()}
    if args.id:
        ids = args.id
    else:
        ids = [i["id"] for i in sorted(banco.values(), key=lambda x: x["id"])[: args.cuantas]]
    for iid in ids:
        if iid not in banco:
            print(f"  #{iid} no existe en el banco", file=sys.stderr)
            continue
        item = banco[iid]
        ruta = crear_post(item, cfg, dt.date.today())
        print(f"  #{iid} [{item.get('voz', '-')}/{item.get('tipo', '-')}] -> {ruta}")
    return 0


def cmd_descartar(args) -> int:
    """Marca textos para que no vuelvan a proponerse nunca."""
    banco = {i["id"]: i for i in cargar_banco()}
    nuevos, inexistentes = descartar(args.id)

    for iid in nuevos:
        print(f"  descartado {iid}: {banco[iid]['texto'][:70]}")
    for iid in inexistentes:
        print(f"  el texto {iid} no existe en el banco", file=sys.stderr)
    if not nuevos and not inexistentes:
        print("  ya estaban todos descartados")

    print()
    print(resumen())
    return 1 if inexistentes else 0


def cmd_verificar(args) -> int:
    env = _entorno()
    fallos = 0

    # En modo "instagram" el IG_USER_ID no hace falta: se deduce del token.
    obligatorias = ["imgbb", "tg_token", "tg_chat", "ig_token"]
    if env["modo"] != "instagram":
        obligatorias.append("ig_user_id")
    faltan = [k for k in obligatorias if not env[k]]
    if faltan:
        print(f"Faltan claves en el .env: {', '.join(faltan)}")
        fallos += 1

    if env["ig_token"]:
        print(f"Modo de Instagram: {env['modo']}")
        try:
            perfil = instagram.comprobar_credenciales(
                env["ig_user_id"], env["ig_token"], env["modo"], env["graph"]
            )
            usuario = perfil.get("username", "?")
            uid = perfil.get("user_id") or perfil.get("id") or env["ig_user_id"]
            extra = (
                f" ({perfil['followers_count']} seguidores)"
                if perfil.get("followers_count") is not None
                else ""
            )
            print(f"Instagram OK: @{usuario}{extra}  [id {uid}]")
            if env["modo"] == "instagram" and not env["ig_user_id"]:
                print(f"  Puedes poner IG_USER_ID={uid} en el .env, o dejarlo vacio.")
        except instagram.ErrorInstagram as e:
            print(f"Instagram FALLA: {e}")
            fallos += 1

    if env["tg_token"] and env["tg_chat"]:
        try:
            telegram.enviar_texto(
                env["tg_token"], env["tg_chat"], "Prueba de pomniii.writes: el bot funciona."
            )
            print("Telegram OK: mensaje de prueba enviado.")
        except telegram.ErrorTelegram as e:
            print(f"Telegram FALLA: {e}")
            fallos += 1

    print("\nTodo listo." if not fallos else f"\n{fallos} cosa(s) por arreglar.")
    return 1 if fallos else 0


def cmd_comandos(args) -> int:
    """Da de alta el menu de ordenes del bot para que salgan al escribir '/'."""
    env = _entorno()
    telegram.registrar_comandos(env["tg_token"])
    print("Menu del bot registrado: /post, /probar, /saltar, /estado")
    return 0


def cmd_renovar(args) -> int:
    """Renueva el token de Instagram Login por 60 dias mas.

    No lo escribe en el .env a proposito: es una credencial y el .env puede
    estar en el ordenador o en los secrets de GitHub. Lo imprime para que lo
    pegues donde toque.
    """
    env = _entorno()
    if env["modo"] != "instagram":
        print(
            "En modo 'facebook' el token de pagina no caduca, asi que no hay "
            "nada que renovar."
        )
        return 0

    datos = instagram.renovar(env["ig_token"])
    dias = int(datos.get("expires_in", 0)) // 86400
    print(f"Token renovado. Vuelve a caducar en {dias} dias.\n")
    print("Pega este valor en IG_ACCESS_TOKEN (en el .env y en los secrets de GitHub):\n")
    print(datos["access_token"])
    return 0


def cmd_chatid(args) -> int:
    env = _entorno()
    chats = telegram.averiguar_chat_id(env["tg_token"])
    if not chats:
        print(
            "Ningun chat encontrado. Abre Telegram, busca tu bot, pulsa Empezar\n"
            "y escribele cualquier cosa. Luego repite este comando."
        )
        return 1
    print("Pon uno de estos en TELEGRAM_CHAT_ID:")
    for c in chats:
        print(f"  {c}")
    return 0


def cmd_proponer(args) -> int:
    cfg, env = cargar_config(), _entorno()
    hoy = dt.date.today()

    if args.respetar_hora and not args.forzar:
        toca, motivo = _toca_ahora(cfg)
        if not toca:
            print(motivo)
            return 0
        if motivo:
            print(f"Hora correcta ({motivo}).")

    if (pendiente := cargar_pendiente()) and not args.forzar:
        print(f"Ya hay una propuesta sin responder (#{pendiente['id']}). Usa --forzar para reemplazarla.")
        return 0

    estado = cargar_estado()
    ya_hoy = [h for h in estado.get("historial", []) if h.get("fecha") == hoy.isoformat()]
    if ya_hoy and not args.forzar:
        print(f"Hoy ya se publico #{ya_hoy[-1]['id']}. Nada que hacer.")
        return 0

    item, _ = elegir()
    numero = numero_siguiente(estado)
    print(f"Propuesta texto {item['id']} [{item.get('voz')}/{item.get('tipo')}]: {item['texto'][:60]}...")
    pendiente = _preparar(item, cfg, env, hoy, numero)

    message_id = telegram.enviar_propuesta(
        env["tg_token"], env["tg_chat"], pendiente["url"], item,
        hoy.strftime("%d.%m.%Y"), numero,
    )
    pendiente["message_id"] = message_id
    pendiente["chat_id"] = env["tg_chat"]
    pendiente["salto"] = 0
    guardar_pendiente(pendiente)
    print("Enviada a Telegram. Esperando que pulses un boton.")
    return 0


def _publicar_ahora(cfg: dict, env: dict, fecha: dt.date) -> dict:
    """Elige el siguiente texto, monta la tarjeta, la sube y la publica.

    Marca el texto como usado SOLO despues de que Instagram confirme. Si algo
    falla antes, el texto sigue disponible y se reintentara la proxima vez.
    """
    estado = cargar_estado()
    item, _ = elegir()
    numero = numero_siguiente(estado)
    print(f"Post #{numero:04d} · texto {item['id']} [{item.get('voz')}/{item.get('tipo')}]")
    print(f"  {item['texto'][:70]}")

    listo = _preparar(item, cfg, env, fecha, numero)
    post_id = _publicar_pendiente(listo, env)
    enlace = instagram.obtener_enlace(post_id, env["ig_token"], env["modo"], env["graph"])

    marcar_usado(
        cargar_estado(), item,
        {
            "fecha": fecha.isoformat(),
            "numero": numero,
            "ig_post_id": post_id,
            "url": listo["url"],
            "enlace": enlace,
        },
    )
    print(f"  publicado: {post_id}  {enlace}")
    return {"item": item, "numero": numero, "url": listo["url"], "enlace": enlace}


def cmd_escuchar(args) -> int:
    """Atiende las ordenes del bot: /post, /probar, /saltar, /estado.

    Con --bucle se queda escuchando esos minutos en vez de dar una sola pasada.
    Combinado con --espera (long polling de Telegram) la respuesta es de
    segundos: el servidor de Telegram mantiene la peticion abierta y contesta en
    el instante en que escribes la orden, sin que haya que preguntar en bucle.
    """
    if not args.bucle:
        return _atender(args)

    fin = time.monotonic() + args.bucle * 60
    pasadas = 0
    while time.monotonic() < fin:
        codigo = _atender(args)
        pasadas += 1
        if codigo != 0:
            return codigo
    print(f"Fin del turno de escucha ({args.bucle} min, {pasadas} pasadas).")
    return 0


def _atender(args) -> int:
    cfg, env = cargar_config(), _entorno()
    hoy = dt.date.today()
    tg = env["tg_token"]

    estado = cargar_estado()
    offset = int(estado.get("telegram_offset", 0))
    ordenes, nuevo_offset = telegram.leer_ordenes(tg, offset, args.espera)
    if nuevo_offset != offset:
        # Se guarda antes de actuar: si la publicacion falla, la orden no debe
        # volver a entregarse y publicar dos veces sin que lo pidas.
        estado["telegram_offset"] = nuevo_offset
        guardar_estado(estado)

    if not ordenes:
        print("Sin ordenes nuevas.")
        return 0

    # Solo se atiende un /post por pasada: si mandaste la orden dos veces por
    # impaciencia, no se publican dos posts.
    posts = [o for o in ordenes if o["orden"] == "post"]
    if len(posts) > 1:
        print(f"{len(posts)} ordenes /post en la cola; se atiende solo la ultima.")
        ordenes = [o for o in ordenes if o["orden"] != "post"] + posts[-1:]

    for o in ordenes:
        # El bot es publico: cualquiera que lo encuentre puede escribirle. Sin
        # esta comprobacion, un desconocido podria publicar en tu Instagram.
        if o["chat_id"] != str(env["tg_chat"]):
            print(f"Ignorada /{o['orden']} de un chat no autorizado ({o['chat_id']}, {o['de']})")
            try:
                telegram.enviar_texto(tg, o["chat_id"], "Este bot es privado.")
            except telegram.ErrorTelegram:
                pass
            continue

        chat = o["chat_id"]
        print(f"Orden /{o['orden']}")

        if o["orden"] == "post":
            try:
                res = _publicar_ahora(cfg, env, hoy)
            except (instagram.ErrorInstagram, Exception) as e:
                telegram.enviar_texto(tg, chat, f"No se pudo publicar:\n{e}")
                print(f"FALLO al publicar: {e}", file=sys.stderr)
                return 1
            telegram.enviar_publicado(
                tg, chat, res["url"], res["item"], res["numero"],
                hoy.strftime("%d.%m.%Y"), res["enlace"],
            )

        elif o["orden"] == "probar":
            item, _ = elegir()
            numero = numero_siguiente(cargar_estado())
            listo = _preparar(item, cfg, env, hoy, numero)
            telegram.enviar_texto(
                tg, chat,
                f"Vista previa del proximo post (#{numero:04d}, texto {item['id']}). "
                "No se ha publicado nada.",
            )
            telegram.enviar_publicado(
                tg, chat, listo["url"], item, numero, hoy.strftime("%d.%m.%Y")
            )

        elif o["orden"] == "saltar":
            item, _ = elegir()
            marcar_usado(cargar_estado(), item, {"fecha": hoy.isoformat(), "saltado": True})
            telegram.enviar_texto(
                tg, chat,
                f"Saltado el texto {item['id']} sin publicarlo:\n\n{item['texto']}\n\n"
                "El siguiente /post cogera el que va detras.",
            )

        elif o["orden"] == "estado":
            telegram.enviar_texto(tg, chat, resumen())

        else:
            telegram.enviar_texto(
                tg, chat,
                "No conozco esa orden. Las que entiendo:\n\n"
                "/post — publicar ahora el siguiente texto\n"
                "/probar — ver la tarjeta sin publicar\n"
                "/saltar — descartar el siguiente sin publicarlo\n"
                "/estado — cuantos textos quedan",
            )

    return 0


def cmd_automatico(args) -> int:
    """Publica el texto del dia sin pedir permiso a nadie.

    Es el comando del modo desatendido: elige, monta la tarjeta, la sube,
    publica en Instagram y luego te avisa por Telegram de lo que ha salido.
    El aviso no lleva botones porque ya no hay nada que decidir; sirve de
    registro y para que notes el dia que algo deje de funcionar.
    """
    cfg, env = cargar_config(), _entorno()
    hoy = dt.date.today()

    if args.respetar_hora and not args.forzar:
        toca, motivo = _toca_ahora(cfg)
        if not toca:
            print(motivo)
            return 0

    estado = cargar_estado()
    ya_hoy = [
        h for h in estado.get("historial", [])
        if h.get("fecha") == hoy.isoformat() and h.get("ig_post_id")
    ]
    if ya_hoy and not args.forzar:
        print(f"Hoy ya se publico el post #{ya_hoy[-1].get('numero')}. Nada que hacer.")
        return 0

    # Si habia una propuesta a medias de una epoca con aprobacion manual, se
    # descarta: en modo automatico no hay nada esperando respuesta.
    borrar_pendiente()
    res = _publicar_ahora(cfg, env, hoy)

    try:
        telegram.enviar_publicado(
            env["tg_token"], env["tg_chat"], res["url"], res["item"], res["numero"],
            hoy.strftime("%d.%m.%Y"), res["enlace"],
        )
    except telegram.ErrorTelegram as e:
        # El post ya esta publicado. Que falle el aviso no debe tumbar la tarea.
        print(f"AVISO: no se pudo mandar el aviso por Telegram: {e}", file=sys.stderr)

    return 0


def cmd_recoger(args) -> int:
    cfg, env = cargar_config(), _entorno()
    estado = cargar_estado()
    offset = int(estado.get("telegram_offset", 0))

    acciones, nuevo_offset = telegram.leer_acciones(env["tg_token"], offset, args.espera)
    if nuevo_offset != offset:
        # Se guarda siempre, aunque una accion falle: si no, Telegram volveria
        # a entregar la misma pulsacion en la siguiente pasada.
        estado["telegram_offset"] = nuevo_offset
        guardar_estado(estado)

    if not acciones:
        print("Sin pulsaciones nuevas.")
        return 0

    banco = {i["id"]: i for i in cargar_banco()}

    for accion in acciones:
        pendiente = cargar_pendiente()
        tg, chat = env["tg_token"], accion["chat_id"]

        if not pendiente:
            telegram.confirmar_pulsacion(tg, accion["callback_id"], "Ya no hay propuesta pendiente.")
            continue
        if accion["id_texto"] != pendiente["id"]:
            telegram.confirmar_pulsacion(tg, accion["callback_id"], "Ese boton ya caduco.")
            continue

        item = banco.get(pendiente["id"], {"id": pendiente["id"], "texto": ""})

        if accion["tipo"] == "pub":
            try:
                post_id = _publicar_pendiente(pendiente, env)
            except instagram.ErrorInstagram as e:
                telegram.confirmar_pulsacion(tg, accion["callback_id"], "Error al publicar.")
                telegram.enviar_texto(tg, chat, f"No se pudo publicar #{pendiente['id']}:\n{e}")
                print(f"FALLO al publicar #{pendiente['id']}: {e}", file=sys.stderr)
                return 1
            marcar_usado(
                cargar_estado(), item,
                {
                    "fecha": pendiente["fecha"],
                    "numero": pendiente.get("numero"),
                    "ig_post_id": post_id,
                    "url": pendiente["url"],
                },
            )
            borrar_pendiente()
            telegram.confirmar_pulsacion(tg, accion["callback_id"], "Publicado.")
            telegram.quitar_botones(
                tg, chat, accion["message_id"],
                f"PUBLICADO · post #{int(pendiente.get('numero', 0)):04d}"
                f"\n\n{item.get('texto', '')}",
            )
            print(f"Publicado texto {pendiente['id']} (post de Instagram {post_id})")

        elif accion["tipo"] == "salta":
            # Se marca como usado para que manana no vuelva a salir la misma.
            marcar_usado(cargar_estado(), item, {"fecha": pendiente["fecha"], "saltado": True})
            borrar_pendiente()
            telegram.confirmar_pulsacion(tg, accion["callback_id"], "Saltada.")
            telegram.quitar_botones(
                tg, chat, accion["message_id"], f"SALTADA · #{pendiente['id']}"
            )
            print(f"Saltada #{pendiente['id']}")

        elif accion["tipo"] in ("otra", "desc"):
            if accion["tipo"] == "desc":
                descartar([pendiente["id"]])
                # El texto descartado sale del banco, asi que el mismo indice
                # ya apunta al siguiente: aqui no hay que subir el salto.
                salto = int(pendiente.get("salto", 0))
                nota, aviso = "DESCARTADO PARA SIEMPRE", "No volvera a salir."
            else:
                salto = int(pendiente.get("salto", 0)) + 1
                nota, aviso = "PASADO POR AHORA", "Buscando otro..."

            telegram.confirmar_pulsacion(tg, accion["callback_id"], aviso)
            telegram.quitar_botones(
                tg, chat, accion["message_id"], f"{nota} · texto {pendiente['id']}"
            )

            nuevo, _ = elegir(salto)
            fecha = dt.date.fromisoformat(pendiente["fecha"])
            numero = int(pendiente.get("numero") or numero_siguiente(cargar_estado()))
            nuevo_pendiente = _preparar(nuevo, cfg, env, fecha, numero)
            nuevo_pendiente["message_id"] = telegram.enviar_propuesta(
                tg, chat, nuevo_pendiente["url"], nuevo,
                fecha.strftime("%d.%m.%Y"), numero,
            )
            nuevo_pendiente["chat_id"] = chat
            nuevo_pendiente["salto"] = salto
            guardar_pendiente(nuevo_pendiente)
            print(f"{nota}: texto {pendiente['id']} -> ahora propuesto {nuevo['id']}")

    return 0


# --------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="pomniii", description=__doc__.splitlines()[0])
    sub = p.add_subparsers(dest="comando", required=True)

    sub.add_parser("logos", help="genera los PNG de marca y los avatares").set_defaults(
        func=cmd_logos
    )
    sub.add_parser("estado", help="cuantos textos quedan y si hay algo pendiente").set_defaults(
        func=cmd_estado
    )
    sub.add_parser("verificar", help="comprueba que las claves funcionan").set_defaults(
        func=cmd_verificar
    )
    sub.add_parser("chatid", help="averigua tu TELEGRAM_CHAT_ID").set_defaults(func=cmd_chatid)
    sub.add_parser("renovar", help="renueva el token de Instagram (60 dias mas)").set_defaults(
        func=cmd_renovar
    )

    ds = sub.add_parser("descartar", help="marca textos para no usarlos nunca")
    ds.add_argument("id", nargs="+", help="ids del banco, p.ej. 0007 0031 0244")
    ds.set_defaults(func=cmd_descartar)

    pr = sub.add_parser("probar", help="genera tarjetas en local, sin publicar")
    pr.add_argument("id", nargs="*", help="ids concretos, p.ej. 0001 0042")
    pr.add_argument("--cuantas", type=int, default=4, help="si no das ids, cuantas de las primeras")
    pr.set_defaults(func=cmd_probar)

    pp = sub.add_parser("proponer", help="manda la propuesta del dia a Telegram")
    pp.add_argument("--forzar", action="store_true", help="aunque ya haya pendiente o ya se publicara hoy")
    pp.add_argument(
        "--respetar-hora",
        action="store_true",
        help="salir sin hacer nada si no es la hora local de config.json (lo usa GitHub Actions)",
    )
    pp.set_defaults(func=cmd_proponer)

    es = sub.add_parser("escuchar", help="atiende las ordenes del bot (/post, /probar...)")
    es.add_argument(
        "--espera", type=int, default=0,
        help="segundos que Telegram mantiene la peticion abierta esperando una orden (max 50)",
    )
    es.add_argument(
        "--bucle", type=int, default=0,
        help="quedarse escuchando estos minutos en vez de dar una sola pasada",
    )
    es.set_defaults(func=cmd_escuchar)

    sub.add_parser("comandos", help="registra el menu de ordenes del bot").set_defaults(
        func=cmd_comandos
    )

    au = sub.add_parser("automatico", help="publica el post del dia sin pedir permiso")
    au.add_argument("--forzar", action="store_true", help="aunque ya se publicara hoy")
    au.add_argument(
        "--respetar-hora",
        action="store_true",
        help="salir sin hacer nada si no es la hora local de config.json",
    )
    au.set_defaults(func=cmd_automatico)

    rc = sub.add_parser("recoger", help="lee los botones pulsados y actua")
    rc.add_argument("--espera", type=int, default=0, help="segundos de long polling (max 50)")
    rc.set_defaults(func=cmd_recoger)

    args = p.parse_args(argv)
    try:
        return args.func(args)
    except (instagram.ErrorInstagram, telegram.ErrorTelegram) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
