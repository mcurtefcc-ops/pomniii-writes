"""Descarga a assets/fonts las tipografias libres que usa la tarjeta.

    python -m herramientas.descargar_fuentes

Normalmente no hace falta: las fuentes van dentro del repositorio a proposito,
para que el servidor no dependa de que Google este disponible el dia que toca
publicar. Esto esta aqui para reponerlas si se borran o para cambiar de familia.

Todas son licencia OFL, que permite redistribuirlas siempre que se incluya el
texto de la licencia. Por eso se baja tambien el OFL.txt de cada familia: sin
el, meterlas en el repositorio no seria legal.

No se usan las tipografias de Windows (Georgia, Segoe Script...) porque son de
Microsoft y no se pueden redistribuir. Quedan como alternativa local en
config.json, pero el render "oficial" es con estas.
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

DESTINO = Path(__file__).resolve().parent.parent / "assets" / "fonts"
BASE = "https://github.com/google/fonts/raw/main"

# archivo local -> ruta dentro del repositorio google/fonts
FUENTES = {
    "CrimsonText-Italic.ttf": "ofl/crimsontext/CrimsonText-Italic.ttf",
    "EBGaramond-Italic.ttf": "ofl/ebgaramond/EBGaramond-Italic%5Bwght%5D.ttf",
    "Barlow-Regular.ttf": "ofl/barlow/Barlow-Regular.ttf",
    "Barlow-Bold.ttf": "ofl/barlow/Barlow-Bold.ttf",
    "SpaceMono-Regular.ttf": "ofl/spacemono/SpaceMono-Regular.ttf",
    "Parisienne-Regular.ttf": "ofl/parisienne/Parisienne-Regular.ttf",
}

LICENCIAS = {
    "OFL-CrimsonText.txt": "ofl/crimsontext/OFL.txt",
    "OFL-EBGaramond.txt": "ofl/ebgaramond/OFL.txt",
    "OFL-Barlow.txt": "ofl/barlow/OFL.txt",
    "OFL-SpaceMono.txt": "ofl/spacemono/OFL.txt",
    "OFL-Parisienne.txt": "ofl/parisienne/OFL.txt",
}

INTENTOS = 3


def _bajar(url: str, destino: Path) -> bool:
    for intento in range(1, INTENTOS + 1):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                datos = r.read()
            if len(datos) < 1024:
                raise ValueError(f"solo {len(datos)} bytes, parece una pagina de error")
            destino.write_bytes(datos)
            return True
        except Exception as e:  # red, 404, contenido raro
            if intento == INTENTOS:
                print(f"  FALLA {destino.name}: {e}", file=sys.stderr)
    return False


def main() -> int:
    DESTINO.mkdir(parents=True, exist_ok=True)
    fallos = 0

    print(f"Descargando en {DESTINO}")
    for nombre, ruta in {**FUENTES, **LICENCIAS}.items():
        salida = DESTINO / nombre
        if salida.exists():
            print(f"  ya esta  {nombre}")
            continue
        if _bajar(f"{BASE}/{ruta}", salida):
            print(f"  OK       {nombre} ({salida.stat().st_size // 1024} KB)")
        else:
            fallos += 1

    if fallos:
        print(
            f"\n{fallos} archivo(s) no se pudieron bajar. La tarjeta sigue funcionando "
            "mientras quede al menos una candidata por rol en config.json.",
            file=sys.stderr,
        )
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
