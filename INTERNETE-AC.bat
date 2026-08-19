@echo off
title PARTI PANIK - internete acik
cd /d "%~dp0"

rem --- cloudflared'i bul ---
set "CF="
if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles%\cloudflared\cloudflared.exe"
if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\cloudflared.exe" set "CF=%LOCALAPPDATA%\Microsoft\WinGet\Links\cloudflared.exe"
if "%CF%"=="" for %%i in (cloudflared.exe) do if not "%%~$PATH:i"=="" set "CF=%%~$PATH:i"

if "%CF%"=="" (
  echo cloudflared bulunamadi.
  echo Kurmak icin bir komut satirinda sunu calistir:
  echo     winget install Cloudflare.cloudflared
  echo.
  pause
  exit /b 1
)

rem --- node'u bul ---
set "NODE=node"
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"

echo.
echo  [1/2] Oyun sunucusu baslatiliyor...
start "PARTI PANIK - sunucu" /min "%NODE%" server\index.js
timeout /t 3 >nul

echo  [2/2] Internet adresi olusturuluyor...
echo.
echo  ============================================================
echo   Birazdan asagida  https://....trycloudflare.com  seklinde
echo   bir adres cikacak. ISTE O ADRESI arkadaslarina gonder.
echo.
echo   BU PENCEREYI KAPATMA - kapatirsan baglanti kesilir.
echo   Oyun bitince kapatabilirsin.
echo  ============================================================
echo.

"%CF%" tunnel --url http://localhost:3000

echo.
echo Baglanti kapandi.
pause >nul
