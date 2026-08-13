@echo off
REM Escuchador permanente del bot, con respuesta instantanea.
REM
REM Usa el long polling de Telegram: cada peticion se queda abierta hasta 50
REM segundos y el servidor contesta en el INSTANTE en que mandas la orden. No
REM hay sondeo ni espera de minutos.
REM
REM El bucle exterior existe porque cualquier proceso se cae alguna vez (corte
REM de red, reinicio del router): si el escuchador termina, espera 15 segundos y
REM vuelve a arrancar solo.
REM
REM OJO: no puede haber dos escuchadores del mismo bot a la vez. Telegram
REM rechaza al segundo con un error 409. Por eso el cron de escuchar.yml esta
REM desactivado mientras se use esto.

cd /d "%~dp0.."
title pomniii.writes - escuchando el bot

:bucle
echo [%date% %time%] arrancando escuchador...
python -u -m src.cli escuchar --bucle 60 --espera 50
echo [%date% %time%] el escuchador ha terminado, reintentando en 15s
timeout /t 15 /nobreak >nul
goto bucle
