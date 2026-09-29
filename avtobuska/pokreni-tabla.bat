@echo off
rem Avtobuska Prilep - informativna tabla na cel ekran (kiosk rezim).
rem Dvoen klik na ovaa datoteka ja otvora tablata vo Microsoft Edge.
rem Izlez od tablata: Alt+F4

start "" msedge --kiosk "%~dp0index.html" --edge-kiosk-type=fullscreen --no-first-run --user-data-dir="%LOCALAPPDATA%\avtobuska-tabla"
