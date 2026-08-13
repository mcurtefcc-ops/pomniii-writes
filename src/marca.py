"""Logo de la cuenta, dibujado por codigo (arte propio, sin marcas de nadie).

Hay tres estilos y se elige en config.json -> marca.logo:

  "plumin"    Aro con un plumin de pluma estilografica. Dice "esto se escribe"
              sin una sola palabra. El mas descriptivo.
  "monograma" Aro con la inicial en negrita y aberracion cromatica (rojo/cian).
              El que mejor aguanta el tamano diminuto: es el que Instagram
              ensena a 110 px en el movil y a 32 px en los comentarios.
  "punto"     Aro con un punto final y su cola, como una gota de tinta.
              El mas minimalista y el que mejor queda ampliado.

Ninguno usa rombos ni damero.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .util import RAIZ, rgb, ruta_fuente

SS = 4  # supersampling interno para que los bordes salgan suaves


def _aro(d, cx, cy, r, color, grosor) -> None:
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=grosor)


def _plumin(d, n, cx, cy, claro, acento, hueco, grosor) -> None:
    """Plumin estrecho: hombros redondeados arriba y punta larga abajo.

    Va desplazado un poco hacia arriba porque la punta alarga la silueta y
    sin ese ajuste el conjunto queda descentrado dentro del aro.
    """
    cy -= n * 0.045
    w = n * 0.150
    h = n * 0.185
    d.ellipse([cx - w, cy - h * 1.30, cx + w, cy + h * 0.30], fill=claro)
    d.polygon([(cx - w, cy - h * 0.05), (cx + w, cy - h * 0.05), (cx, cy + h * 2.05)], fill=claro)
    ro = n * 0.036
    d.ellipse([cx - ro, cy - h * 0.60 - ro, cx + ro, cy - h * 0.60 + ro], fill=hueco)
    d.line(
        [(cx, cy - h * 0.60), (cx, cy + h * 1.70)],
        fill=hueco,
        width=max(1, int(grosor * 1.4)),
    )


def _punto(d, n, cx, cy, claro, acento, grosor) -> None:
    """Gota de tinta: circulo con vertice hacia arriba."""
    r = n * 0.125
    ccy = cy + n * 0.05
    d.ellipse([cx - r, ccy - r, cx + r, ccy + r], fill=claro)
    d.polygon(
        [(cx, cy - n * 0.235), (cx - r * 0.88, ccy + r * 0.10), (cx + r * 0.88, ccy + r * 0.10)],
        fill=claro,
    )


def _monograma(img, n, cx, cy, letra, ruta_fuente, pal, grosor) -> None:
    """Inicial en negrita con aberracion cromatica rojo/cian."""
    fuente = ImageFont.truetype(ruta_fuente, int(n * 0.46))
    desplaz = int(n * 0.016)
    for dx, color in (
        (-desplaz, rgb(pal["acento"], 200)),
        (desplaz, rgb(pal["acento2"], 175)),
    ):
        capa = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(capa).text(
            (cx + dx, cy), letra, font=fuente, fill=color, anchor="mm"
        )
        img.alpha_composite(capa)
    ImageDraw.Draw(img).text(
        (cx, cy), letra, font=fuente, fill=rgb(pal["texto"], 255), anchor="mm"
    )


def dibujar_marca(
    tamano: int, cfg: dict, estilo: str | None = None, sobre_oscuro: bool = True
) -> Image.Image:
    pal = cfg["paleta"]
    estilo = estilo or cfg["marca"].get("logo", "monograma")

    n = tamano * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    claro = rgb(pal["texto"], 255)
    acento = rgb(pal["acento"], 255)
    hueco = rgb(pal["fondo"], 255) if sobre_oscuro else (255, 255, 255, 255)

    cx = cy = n / 2
    r = n * 0.455
    grosor = max(1, int(n * 0.022))

    _aro(d, cx, cy, r, acento, grosor)

    if estilo == "plumin":
        _plumin(d, n, cx, cy, claro, acento, hueco, grosor)
    elif estilo == "punto":
        _punto(d, n, cx, cy, claro, acento, grosor)
    else:
        letra = cfg["marca"].get("monograma", cfg["marca"]["firma"][:1].upper())
        _monograma(img, n, cx, cy, letra, ruta_fuente(cfg, "ui_bold"), pal, grosor)

    return img.resize((tamano, tamano), Image.LANCZOS)


def guardar_logos(cfg: dict) -> list[Path]:
    """Genera los PNG de marca: sellos transparentes y avatares 1000x1000.

    El avatar deja el sello al 62% del lienzo: Instagram recorta en circulo
    y asi no se come nada del aro.
    """
    pal = cfg["paleta"]
    destino = RAIZ / "assets"
    destino.mkdir(parents=True, exist_ok=True)
    hechos = []

    for estilo in ("monograma", "plumin", "punto"):
        # sello transparente para incrustar en el post
        p = destino / f"logo_{estilo}_512.png"
        dibujar_marca(512, cfg, estilo).save(p)
        hechos.append(p)

        # avatar listo para subir como foto de perfil
        avatar = Image.new("RGB", (1000, 1000), rgb(pal["fondo"]))
        sello = dibujar_marca(620, cfg, estilo)
        avatar.paste(sello, (190, 190), sello)
        p = destino / f"avatar_{estilo}_1000.png"
        avatar.save(p)
        hechos.append(p)

    return hechos
