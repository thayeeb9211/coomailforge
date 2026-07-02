@echo off
title COO Mail Forge — Server
cd /d "%~dp0"

echo.
echo  Starting COO Mail Forge...
echo.

:: Activate virtualenv if present
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

python serve.py

echo.
echo  Server stopped. Press any key to exit.
pause >nul
