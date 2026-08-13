"""Utilidades minimas compartidas."""

from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def cargar_config() -> dict:
    with open(RAIZ / "config.json", encoding="utf-8") as f:
        return json.load(f)


def ruta_fuente(cfg: dict, rol: str) -> str:
    """Primera fuente que exista de las candidatas de ese rol.

    Cada rol lleva una lista: primero las fuentes libres que van dentro del
    repo (para que el render sea identico aqui y en el servidor) y detras las
    de Windows como red de seguridad. Esto es lo que permite que la tarjeta
    salga igual en un portatil y en un runner de Ubuntu, donde no existe
    ninguna fuente de Microsoft.
    """
    candidatas = cfg["tipografias"][rol]
    if isinstance(candidatas, str):
        candidatas = [candidatas]
    for c in candidatas:
        p = Path(c)
        if not p.is_absolute():
            p = RAIZ / c
        if p.exists():
            return str(p)
    raise FileNotFoundError(
        f"No hay ninguna fuente disponible para '{rol}'. Probadas: {candidatas}. "
        "Ejecuta: python -m herramientas.descargar_fuentes"
    )


def rgb(hexcolor: str, alfa: int | None = None) -> tuple:
    """'#0B0B10' -> (11, 11, 16). Con alfa devuelve RGBA."""
    h = hexcolor.lstrip("#")
    t = tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))
    return t + (alfa,) if alfa is not None else t


def mezclar(c1: tuple, c2: tuple, t: float) -> tuple:
    """Interpola dos colores RGB. t=0 -> c1, t=1 -> c2."""
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))
