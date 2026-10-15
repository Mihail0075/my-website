@echo off
rem Kargo Roman - start the app and open a screen. Usage: Start.bat counter|admin|driver|kiosk
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start.ps1" %1
