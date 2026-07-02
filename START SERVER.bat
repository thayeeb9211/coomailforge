@echo off
cd /d "%~dp0"

:: Build the command that runs inside the minimized window
set RUN_CMD=python serve.py

:: If a venv exists, activate it first then run
if exist "venv\Scripts\activate.bat" (
    set RUN_CMD=call venv\Scripts\activate.bat ^&^& python serve.py
)

echo  Starting COO Mail Forge server in background...
echo  Your browser will open automatically.
echo  Use STOP SERVER.bat to shut it down.
echo.

:: Launch in a MINIMIZED window — lives in the taskbar, not on screen
START "COO Mail Forge Server" /MIN cmd /c "%RUN_CMD% & echo. & echo  Server stopped. Press any key... & pause >nul"

:: Give it 2 seconds to spin up, then close this launcher window
timeout /t 2 >nul
