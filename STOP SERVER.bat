@echo off
title COO Mail Forge — Stop Server
cd /d "%~dp0"
echo.
echo  =========================================
echo   COO Mail Forge — Stop Server
echo  =========================================
echo.

set FOUND=0

for %%p in (5001 5002 5003 5004 5005) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        if not "%%a"=="" (
            echo  Found server on port %%p  [PID %%a] -- stopping...
            taskkill /F /PID %%a >nul 2>&1
            if errorlevel 1 (
                echo  Could not stop PID %%a  ^(may need to run as Admin^)
            ) else (
                echo  Server stopped successfully.
            )
            set FOUND=1
        )
    )
)

if "%FOUND%"=="0" (
    echo  No COO Mail Forge server found on ports 5001-5005.
    echo  It may already be stopped.
)

echo.
echo  Press any key to close...
pause >nul
