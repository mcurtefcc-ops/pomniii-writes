"""Seleccion de textos sin repeticion.

Lleva la cuenta de lo publicado en data/estado.json y no repite un texto
hasta haber agotado el banco entero. Cuando se agota, arranca otra ronda.
"""

from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
LOTES = RAIZ / "data" / "lotes"
ESTADO = RAIZ / "data" / "estado.json"


class BancoInvalido(RuntimeError):
    pass


def cargar_banco() -> list[dict]:
    """Junta todos los lotes de data/lotes/*.json en un solo banco.

    Esta partido en lotes para poder anadir tandas nuevas sin tocar las
    anteriores, y para que dos tandas distintas nunca choquen en el mismo
    archivo. Los ids tienen que ser unicos en el conjunto: si se repite uno,
    el estado de "ya publicado" dejaria de ser fiable.
    """
    archivos = sorted(LOTES.glob("*.json"))
    if not archivos:
        raise BancoInvalido(f"No hay ningun lote de textos en {LOTES}")

    banco: list[dict] = []
    vistos: dict[str, str] = {}
    for archivo in archivos:
        with open(archivo, encoding="utf-8") as f:
            items = json.load(f)["items"]
        for item in items:
            iid = item["id"]
            if iid in vistos:
                raise BancoInvalido(
                    f"El id {iid} esta repetido: aparece en {vistos[iid]} y en {archivo.name}"
                )
            vistos[iid] = archivo.name
            banco.append(item)
    return banco


def cargar_estado() -> dict:
    if ESTADO.exists():
        with open(ESTADO, encoding="utf-8") as f:
            return json.load(f)
    return {"usados": [], "rondas": 0, "historial": []}


def guardar_estado(estado: dict) -> None:
    ESTADO.parent.mkdir(parents=True, exist_ok=True)
    with open(ESTADO, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)


def elegir(salto: int = 0) -> tuple[dict, dict]:
    """Devuelve (item, estado) cogiendo el id mas bajo sin publicar.

    El orden es secuencial: se empieza por el #0001 y se va bajando por el
    banco. `salto` sirve para el boton "Otra frase" de Telegram: salto=1
    devuelve la siguiente, salto=2 la de despues, sin marcar nada como usado.

    El estado NO se guarda aqui: solo se guarda cuando el post se publica
    de verdad (ver cli.py).
    """
    banco = cargar_banco()
    estado = cargar_estado()
    descartados = set(estado.get("descartados", []))
    fuera = set(estado.get("usados", [])) | descartados

    disponibles = sorted((i for i in banco if i["id"] not in fuera), key=lambda i: i["id"])
    if not disponibles:
        # Banco agotado: nueva ronda desde el principio. Los descartados
        # siguen descartados: si no te gustaron, tampoco te gustaran en la
        # segunda vuelta.
        estado["rondas"] = estado.get("rondas", 0) + 1
        estado["usados"] = []
        disponibles = sorted(
            (i for i in banco if i["id"] not in descartados), key=lambda i: i["id"]
        )
    if not disponibles:
        raise BancoInvalido("Has descartado todos los textos del banco.")

    return disponibles[salto % len(disponibles)], estado


def numero_siguiente(estado: dict) -> int:
    """Numero que le toca al proximo post publicado.

    Es un contador de publicaciones, no el id del texto. Asi el numero que
    sale en la tarjeta va 1, 2, 3... sin huecos, aunque descartes textos o
    saltes dias. Si se usara el id, descartar el texto 7 dejaria un agujero
    visible para siempre, y renumerar los ids romperia el registro de lo ya
    publicado.
    """
    return sum(1 for h in estado.get("historial", []) if h.get("ig_post_id")) + 1


def descartar(ids: list[str]) -> tuple[list[str], list[str]]:
    """Marca textos para no volver a proponerlos nunca.

    No se borran del lote: se apuntan en el estado. Asi no se pierde el texto
    (por si cambias de opinion) y los archivos de lotes siguen intactos.
    Devuelve (descartados_ahora, ids_que_no_existen).
    """
    banco_ids = {i["id"] for i in cargar_banco()}
    estado = cargar_estado()
    ya = set(estado.get("descartados", []))

    nuevos, inexistentes = [], []
    for iid in ids:
        iid = iid.strip().zfill(4)
        if iid not in banco_ids:
            inexistentes.append(iid)
        elif iid not in ya:
            nuevos.append(iid)
            ya.add(iid)

    estado["descartados"] = sorted(ya)
    guardar_estado(estado)
    return nuevos, inexistentes


def marcar_usado(estado: dict, item: dict, extra: dict | None = None) -> None:
    estado.setdefault("usados", []).append(item["id"])
    registro = {"id": item["id"], "texto": item["texto"]}
    if extra:
        registro.update(extra)
    estado.setdefault("historial", []).append(registro)
    guardar_estado(estado)


def resumen() -> str:
    banco = cargar_banco()
    estado = cargar_estado()
    usados = len(estado.get("usados", []))
    descartados = len(estado.get("descartados", []))
    por_voz: dict[str, int] = {}
    for i in banco:
        clave = i.get("voz", "sin voz")
        por_voz[clave] = por_voz.get(clave, 0) + 1
    detalle = ", ".join(f"{k}: {v}" for k, v in sorted(por_voz.items()))
    quedan = len(banco) - usados - descartados
    return (
        f"Banco: {len(banco)} textos ({detalle})\n"
        f"Ya usados: {usados} | descartados: {descartados} | quedan {quedan}\n"
        f"Rondas completas: {estado.get('rondas', 0)} | "
        f"proximo post: #{numero_siguiente(estado):04d}\n"
        f"A un post al dia, quedan {quedan / 365:.1f} anos de contenido."
    )
