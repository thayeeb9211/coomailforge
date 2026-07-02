@echo off
title COO Mail Forge Server
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set PYTHONUNBUFFERED=1

echo.
echo  =========================================
echo   COO Mail Forge - Local Server
echo  =========================================
echo   Minimize this window - server keeps running.
echo   Use STOP SERVER.bat to shut it down cleanly.
echo  =========================================
echo.

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

python serve.py

echo.
echo  Server stopped. Press any key to exit.
pause >nul
