@echo off
title COO Mail Forge — Remove from Windows Startup
set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\COO Mail Forge.lnk"

if exist "%SHORTCUT%" (
    del "%SHORTCUT%"
    echo  Removed COO Mail Forge from Windows startup.
) else (
    echo  Not found in startup — nothing to remove.
)

:: Kill any running pythonw serve.py instances
taskkill /f /im pythonw.exe >nul 2>&1
echo  Server process stopped.
echo.
pause >nul
