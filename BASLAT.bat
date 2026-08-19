@echo off
title PARTI PANIK - oyun sunucusu
cd /d "%~dp0"

if exist "%ProgramFiles%\nodejs\node.exe" (
  "%ProgramFiles%\nodejs\node.exe" server\index.js
) else (
  node server\index.js
)

echo.
echo Sunucu kapandi. Pencereyi kapatabilirsin.
pause >nul
