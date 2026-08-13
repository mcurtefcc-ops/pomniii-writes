"""Composicion de la imagen del post (1080x1350, formato 4:5).

Se dibuja todo al doble de tamano y se reduce con LANCZOS al final: es la
forma barata de conseguir bordes limpios en las figuras y en el texto.

Recursos visuales, de mas a menos evidente:
  - foco de escenario (degradado radial) detras del texto
  - marco interior con esquinas en angulo -> aspecto de cartel
  - resplandor difuso bajo las letras, para que el texto parezca iluminado
  - jerarquia a dos tonos: el arranque atenuado, el remate en blanco pleno
  - barra de acento al pie, para que la cuadricula del perfil tenga firma

Sin rombos ni damero en ninguna parte.
"""

from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from .marca import dibujar_marca
from .util import RAIZ, mezclar, rgb, ruta_fuente

SALIDA = RAIZ / "salida"


# --------------------------------------------------------------------------
# Fondo
# --------------------------------------------------------------------------


def _fondo_foco(W: int, H: int, pal: dict) -> Image.Image:
    """Degradado radial: un foco de escenario detras del texto."""
    c1, c2 = rgb(pal["fondo"]), rgb(pal["fondo_alto"])
    pw, ph = 96, 120
    peq = Image.new("RGB", (pw, ph))
    px = peq.load()
    cx, cy = pw * 0.5, ph * 0.42
    maxd = ((pw * 0.72) ** 2 + (ph * 0.72) ** 2) ** 0.5
    for y in range(ph):
        for x in range(pw):
            dist = ((x - cx) ** 2 + ((y - cy) * 0.88) ** 2) ** 0.5 / maxd
            t = max(0.0, 1.0 - dist * 1.12)
            px[x, y] = mezclar(c1, c2, t**1.5)
    return peq.resize((W, H), Image.BICUBIC).filter(
        ImageFilter.GaussianBlur(radius=W * 0.008)
    )


def _grano(img: Image.Image, fuerza: float = 0.26) -> Image.Image:
    ruido = Image.effect_noise(img.size, 20).convert("RGB")
    return Image.blend(img, ImageChops.overlay(img, ruido), fuerza)


def _barra_pie(d: ImageDraw.ImageDraw, W: int, y: int, alto: int, pal: dict) -> None:
    """Barra solida de acento al pie: da firma a la cuadricula del perfil."""
    d.rectangle([0, y, W, y + alto], fill=rgb(pal["acento"]))


def _marco(d: ImageDraw.ImageDraw, W: int, H: int, pal: dict, S: int, pie: int) -> None:
    """Marco interior fino, con las esquinas reforzadas en angulo."""
    m = 44 * S
    x1, y1, x2, y2 = m, m, W - m, H - pie - m
    d.rectangle(
        [x1, y1, x2, y2],
        outline=rgb(pal["texto_suave"], 85),
        width=max(1, int(1.4 * S)),
    )
    # Escuadras: un tramo corto mas grueso y en color de acento sobre cada
    # esquina del marco.
    largo = 26 * S
    grosor = max(2, int(3 * S))
    color = rgb(pal["acento"], 235)
    for x, y, sx, sy in (
        (x1, y1, 1, 1),
        (x2, y1, -1, 1),
        (x1, y2, 1, -1),
        (x2, y2, -1, -1),
    ):
        d.line([(x, y), (x + sx * largo, y)], fill=color, width=grosor)
        d.line([(x, y), (x, y + sy * largo)], fill=color, width=grosor)


# --------------------------------------------------------------------------
# Texto: tokenizado con enfasis, ajuste y dibujado
# --------------------------------------------------------------------------


def _tokenizar(texto: str, tipo: str) -> list[list[tuple[str, bool]]]:
    """Parte el texto en parrafos de tokens (palabra, es_remate).

    El "remate" es la parte que se dibuja en blanco pleno mientras el resto
    va atenuado: en los poemas es la ultima linea, en las frases la ultima
    oracion. Si el texto es de una sola oracion no hay atenuado y va entero
    en blanco, que es el comportamiento seguro.
    """
    if tipo == "poema" and "\n" in texto:
        parrafos = texto.split("\n")
        idx = max(i for i, p in enumerate(parrafos) if p.strip())
        return [
            [(w, i == idx) for w in p.strip().split()] if p.strip() else []
            for i, p in enumerate(parrafos)
        ]

    oraciones = [t.strip() for t in re.findall(r"[^.!?]+[.!?]*", texto) if t.strip()]
    if len(oraciones) >= 2:
        arranque, remate = " ".join(oraciones[:-1]), oraciones[-1]
    else:
        arranque, remate = "", texto.replace("\n", " ")

    # Arranque y remate van como parrafos separados a proposito: asi el salto
    # de linea cae justo en la frontera del enfasis y el remate empieza en
    # linea nueva, en vez de quedarse una palabra suelta colgando arriba.
    parrafos = []
    if arranque:
        parrafos.append([(w, False) for w in arranque.split()])
    parrafos.append([(w, True) for w in remate.split()])
    return parrafos


def _envolver(parrafos, fuente, ancho_max: int, d) -> list[list[tuple[str, bool]]]:
    """Ajusta al ancho conservando la marca de enfasis de cada palabra."""
    lineas: list[list[tuple[str, bool]]] = []
    for tokens in parrafos:
        if not tokens:
            lineas.append([])
            continue
        actual: list[tuple[str, bool]] = []
        for tok in tokens:
            prueba = " ".join(w for w, _ in [*actual, tok])
            if not actual or d.textlength(prueba, font=fuente) <= ancho_max:
                actual.append(tok)
            else:
                lineas.append(actual)
                actual = [tok]
        lineas.append(actual)
    return lineas


def _ancho_linea(d, linea, fuente) -> float:
    return d.textlength(" ".join(w for w, _ in linea), font=fuente)


def _ajustar_cita(
    parrafos, ruta_fuente: str, ancho_max: int, alto_max: int, d,
    tam_max: int, tam_min: int, interlineado: float,
):
    """Baja el cuerpo de letra de dos en dos hasta que la cita entra."""
    fuente = lineas = None
    for tam in range(tam_max, tam_min - 1, -2):
        fuente = ImageFont.truetype(ruta_fuente, tam)
        lineas = _envolver(parrafos, fuente, ancho_max, d)
        alto = len(lineas) * tam * interlineado
        if alto <= alto_max and all(
            _ancho_linea(d, l, fuente) <= ancho_max for l in lineas if l
        ):
            return fuente, lineas, tam
    return fuente, lineas, tam_min


def _dibujar_linea(d, centro_x: float, y: float, linea, fuente, col_base, col_remate):
    """Dibuja una linea centrada, palabra a palabra, con dos colores."""
    if not linea:
        return
    x = centro_x - _ancho_linea(d, linea, fuente) / 2
    espacio = d.textlength(" ", font=fuente)
    for palabra, destacado in linea:
        d.text(
            (x, y),
            palabra,
            font=fuente,
            fill=col_remate if destacado else col_base,
            anchor="lm",
        )
        x += d.textlength(palabra, font=fuente) + espacio


def _resplandor(
    tamano, lineas, fuente, centro_x: float, y0: float, paso: float, pal: dict, S: int
) -> Image.Image:
    """Capa difusa bajo las letras para que el texto parezca iluminado."""
    capa = Image.new("RGBA", tamano, (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    blanco = rgb(pal["texto"], 255)
    y = y0
    for linea in lineas:
        _dibujar_linea(d, centro_x, y, linea, fuente, blanco, blanco)
        y += paso
    capa = capa.filter(ImageFilter.GaussianBlur(radius=26 * S))
    tinte = Image.new("RGBA", tamano, mezclar(rgb(pal["texto"]), rgb(pal["acento"]), 0.4) + (255,))
    tinte.putalpha(capa.split()[3].point(lambda v: int(v * 0.42)))
    return tinte


# --------------------------------------------------------------------------
# Adornos de tipografia
# --------------------------------------------------------------------------


def _ancho_espaciado(d, texto: str, fuente, espaciado: float) -> float:
    if not texto:
        return 0.0
    return sum(d.textlength(c, font=fuente) for c in texto) + espaciado * (len(texto) - 1)


def _texto_espaciado(d, centro_x, y, texto: str, fuente, fill, espaciado: float) -> None:
    """Pillow no tiene tracking, asi que se dibuja caracter a caracter."""
    x = centro_x - _ancho_espaciado(d, texto, fuente, espaciado) / 2
    for c in texto:
        d.text((x, y), c, font=fuente, fill=fill, anchor="lm")
        x += d.textlength(c, font=fuente) + espaciado


def _wordmark_glitch(
    lienzo, centro_x, y, texto: str, fuente, pal: dict, espaciado: float, desplaz: int
) -> None:
    """Aberracion cromatica: rojo a un lado, cian al otro, blanco encima."""
    for dx, color in (
        (-desplaz, rgb(pal["acento"], 165)),
        (desplaz, rgb(pal["acento2"], 145)),
    ):
        capa = Image.new("RGBA", lienzo.size, (0, 0, 0, 0))
        _texto_espaciado(
            ImageDraw.Draw(capa), centro_x + dx, y, texto, fuente, color, espaciado
        )
        lienzo.alpha_composite(capa)
    _texto_espaciado(
        ImageDraw.Draw(lienzo), centro_x, y, texto, fuente, rgb(pal["texto"], 255), espaciado
    )


def _regla_con_etiqueta(d, x1, x2, y, etiqueta: str, fuente, pal: dict, S: int) -> None:
    """Linea horizontal partida por una etiqueta centrada."""
    grosor = max(1, int(1.2 * S))
    espaciado = 4 * S
    hueco = _ancho_espaciado(d, etiqueta, fuente, espaciado) / 2 + 14 * S
    centro = (x1 + x2) / 2
    linea = rgb(pal["texto_suave"], 110)
    d.line([(x1, y), (centro - hueco, y)], fill=linea, width=grosor)
    d.line([(centro + hueco, y), (x2, y)], fill=linea, width=grosor)
    _texto_espaciado(d, centro, y, etiqueta, fuente, rgb(pal["acento"], 235), espaciado)


def _regla_con_punto(d, x1, x2, y, pal: dict, S: int) -> None:
    """Linea horizontal partida por un punto: el punto final del texto."""
    grosor = max(1, int(1.2 * S))
    centro = (x1 + x2) / 2
    r = 4.5 * S
    hueco = r + 12 * S
    linea = rgb(pal["texto_suave"], 110)
    d.line([(x1, y), (centro - hueco, y)], fill=linea, width=grosor)
    d.line([(centro + hueco, y), (x2, y)], fill=linea, width=grosor)
    d.ellipse([centro - r, y - r, centro + r, y + r], fill=rgb(pal["acento"], 255))


def _swash(d, centro_x: float, y: float, ancho: float, pal: dict, S: int) -> None:
    """Trazo de pluma bajo la firma: sube en el centro y remata en cola."""
    x1, x2 = centro_x - ancho / 2, centro_x + ancho / 2
    puntos = []
    pasos = 90
    for i in range(pasos + 1):
        t = i / pasos
        px = x1 + (x2 - x1) * t
        py = y - (3.2 * S) * (t * (1 - t) * 4) ** 1.2 + (2.6 * S) * t**3
        puntos.append((px, py))
    d.line(puntos, fill=rgb(pal["acento"], 220), width=max(1, int(2.1 * S)), joint="curve")
    fx, fy = puntos[-1]
    rr = 2.4 * S
    d.ellipse([fx - rr, fy - rr, fx + rr, fy + rr], fill=rgb(pal["acento"], 220))


# --------------------------------------------------------------------------
# Post completo
# --------------------------------------------------------------------------


def crear_post(
    item: dict, cfg: dict, fecha: dt.date | None = None, numero: int | None = None
) -> Path:
    """Monta la tarjeta del texto.

    `numero` es el numero de post que sale impreso (1º, 2º, 3º...). No es el
    id del texto a proposito: asi la numeracion visible no deja huecos cuando
    descartas textos. Si no se pasa, se imprime el id, que es lo util cuando
    estas probando en local.
    """
    pal, marca = cfg["paleta"], cfg["marca"]
    tip = {rol: ruta_fuente(cfg, rol) for rol in ("cita", "ui", "ui_bold", "mono", "firma")}
    S = int(cfg["lienzo"]["supersampling"])
    ancho_final, alto_final = int(cfg["lienzo"]["ancho"]), int(cfg["lienzo"]["alto"])
    W, H = ancho_final * S, alto_final * S
    fecha = fecha or dt.date.today()
    alto_barra = 10 * S

    # --- fondo ---
    base = _grano(_fondo_foco(W, H, pal)).convert("RGBA")
    d = ImageDraw.Draw(base)
    _marco(d, W, H, pal, S, alto_barra)

    centro_x = W / 2
    margen = 96 * S

    # --- cabecera: sello + wordmark + lema ---
    lado_logo = 92 * S
    sello = dibujar_marca(lado_logo, cfg)
    base.alpha_composite(sello, (int(centro_x - lado_logo / 2), 100 * S))

    f_word = ImageFont.truetype(tip["ui_bold"], 26 * S)
    _wordmark_glitch(
        base, centro_x, 238 * S, marca["wordmark"], f_word, pal,
        espaciado=7 * S, desplaz=int(2.5 * S),
    )
    f_lema = ImageFont.truetype(tip["mono"], 15 * S)
    _texto_espaciado(
        d, centro_x, 274 * S, marca["lema"], f_lema, rgb(pal["texto_suave"], 210), 3 * S
    )

    # --- regla superior con el tipo de texto ---
    f_tag = ImageFont.truetype(tip["mono"], 14 * S)
    etiqueta = {"poema": "POEMA", "frase": "FRASE", "prosa": "PROSA"}.get(
        item.get("tipo", ""), str(item.get("tipo", "TEXTO")).upper()
    )
    _regla_con_etiqueta(
        d, margen + 44 * S, W - margen - 44 * S, 348 * S, etiqueta, f_tag, pal, S
    )

    # --- la cita ---
    caja_top, caja_bottom = 388 * S, 1006 * S
    ancho_cita = W - 2 * (132 * S)
    interlineado = 1.40
    parrafos = _tokenizar(item["texto"], item.get("tipo", "frase"))
    fuente_cita, lineas, tam = _ajustar_cita(
        parrafos, tip["cita"], ancho_cita, caja_bottom - caja_top, d,
        tam_max=78 * S, tam_min=26 * S, interlineado=interlineado,
    )
    paso = tam * interlineado
    y0 = caja_top + (caja_bottom - caja_top - len(lineas) * paso) / 2 + paso / 2

    base.alpha_composite(
        _resplandor(base.size, lineas, fuente_cita, centro_x, y0, paso, pal, S)
    )
    d = ImageDraw.Draw(base)
    col_base = mezclar(rgb(pal["texto"]), rgb(pal["texto_suave"]), 0.45)
    y = y0
    for linea in lineas:
        _dibujar_linea(d, centro_x, y, linea, fuente_cita, col_base, rgb(pal["texto"]))
        y += paso

    # --- regla inferior ---
    _regla_con_punto(d, margen + 44 * S, W - margen - 44 * S, 1046 * S, pal, S)

    # --- firma "digital" ---
    f_firma = ImageFont.truetype(tip["firma"], 76 * S)
    d.text(
        (centro_x, 1124 * S), marca["firma"], font=f_firma,
        fill=rgb(pal["texto"]), anchor="mm",
    )
    ancho_firma = d.textlength(marca["firma"], font=f_firma)
    _swash(d, centro_x, 1168 * S, max(ancho_firma * 1.45, 180 * S), pal, S)

    # Ojo: Consolas no tiene glifo para rombos ni bullets grandes, saldrian
    # como cuadrados vacios. El punto medio si esta.
    f_mono = ImageFont.truetype(tip["mono"], 17 * S)
    sello_num = f"#{numero:04d}" if numero is not None else f"#{item['id']}"
    pie = f"@{marca['handle']}  ·  {sello_num}  ·  {fecha.strftime('%d.%m.%Y')}"
    _texto_espaciado(
        d, centro_x, 1222 * S, pie, f_mono, rgb(pal["texto_suave"], 235), 1.6 * S
    )

    # --- barra de acento al pie ---
    _barra_pie(d, W, H - alto_barra, alto_barra, pal)

    # --- reducir y guardar ---
    final = base.convert("RGB").resize((ancho_final, alto_final), Image.LANCZOS)
    SALIDA.mkdir(parents=True, exist_ok=True)
    ruta = SALIDA / f"{fecha.isoformat()}_{item['id']}.png"
    final.save(ruta, "PNG", optimize=True)
    return ruta


def construir_pie_de_foto(item: dict, cfg: dict) -> str:
    """Texto del caption de Instagram."""
    pf = cfg["pie_de_foto"]
    partes = [item["texto"], "", pf["cierre"], "", pf["cta"], "", " ".join(pf["hashtags"])]
    return "\n".join(partes)
