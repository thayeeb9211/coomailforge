@echo off
title COO Mail Forge — Server
cd /d "%~dp0"
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set PYTHONUNBUFFERED=1

echo.
echo  =========================================
echo   COO Mail Forge — Local Server
echo  =========================================
echo   Minimize this window — server keeps running.
echo   Use STOP SERVER.bat to shut it down cleanly.
echo  =========================================
echo.

:: Activate virtualenv if present
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

:: Run server and mirror all output to server.log
powershell -Command "python serve.py 2>&1 | Tee-Object -FilePath server.log"

echo.
echo  Server stopped. Press any key to exit.
pause >nul
