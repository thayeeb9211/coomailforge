@echo off
title COO Mail Forge — Add to Windows Startup
cd /d "%~dp0"

set "VBS_SOURCE=%~dp0START_HIDDEN.vbs"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\COO Mail Forge.lnk"

echo.
echo  ============================================================
echo   COO Mail Forge — Adding to Windows Startup
echo   (No admin required)
echo  ============================================================
echo.

:: Create a .lnk shortcut in the user startup folder using PowerShell
powershell -NoProfile -Command ^
  "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT%'); $s.TargetPath='%VBS_SOURCE%'; $s.WorkingDirectory='%~dp0'; $s.Description='COO Mail Forge Server'; $s.Save()"

if exist "%SHORTCUT%" (
    echo  SUCCESS! COO Mail Forge will now start automatically
    echo  every time YOU log in to Windows.
    echo.
    echo  Shortcut placed at:
    echo  %SHORTCUT%
    echo.
    echo  To REMOVE auto-start later, run: REMOVE FROM STARTUP.bat
    echo  Or delete the shortcut manually from:
    echo  %STARTUP_DIR%
) else (
    echo  Something went wrong. Try running this file again.
)

echo.
echo  Starting server now for this session...
start "" wscript.exe "%VBS_SOURCE%"
timeout /t 2 >nul
start "" "http://localhost:5001"

echo.
echo  Press any key to exit.
pause >nul
