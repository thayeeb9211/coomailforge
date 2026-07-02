@echo off
title COO Mail Forge — Auto-Start Setup
cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"
set "SERVE_SCRIPT=%PROJECT_DIR%serve.py"
set "TASK_NAME=COO Mail Forge Server"

echo.
echo  ============================================================
echo   COO Mail Forge — Windows Auto-Start Setup
echo  ============================================================
echo.
echo  This will register the server to start automatically
echo  every time Windows boots, even before you log in.
echo.
echo  Project folder: %PROJECT_DIR%
echo.

:: Create the scheduled task using schtasks
schtasks /create /tn "%TASK_NAME%" /tr "python \"%SERVE_SCRIPT%\"" /sc ONSTART /ru SYSTEM /rl HIGHEST /f

if %errorlevel% == 0 (
    echo.
    echo  SUCCESS! Server will now start automatically on boot.
    echo.
    echo  To manually control the task:
    echo    Start:  schtasks /run /tn "%TASK_NAME%"
    echo    Stop:   schtasks /end /tn "%TASK_NAME%"
    echo    Remove: schtasks /delete /tn "%TASK_NAME%" /f
    echo.
) else (
    echo.
    echo  NOTE: Run this file as Administrator for auto-start setup.
    echo  Right-click "SETUP AUTOSTART.bat" and choose "Run as administrator"
    echo.
)

echo  Press any key to exit.
pause >nul
