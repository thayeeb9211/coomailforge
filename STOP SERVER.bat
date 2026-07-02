@echo off
title COO Mail Forge — Stop Server
cd /d "%~dp0"
echo.
echo  =========================================
echo   COO Mail Forge — Stop Server
echo  =========================================
echo.

powershell -NoProfile -Command ^
  "$ports = 5001,5002,5003,5004,5005; $stopped = $false;" ^
  "foreach ($p in $ports) {" ^
  "  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue;" ^
  "  if ($conns) {" ^
  "    $procIds = $conns.OwningProcess | Sort-Object -Unique;" ^
  "    foreach ($procId in $procIds) {" ^
  "      Write-Host ('  Port ' + $p + '  [PID ' + $procId + ']  stopping...');" ^
  "      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue;" ^
  "    }" ^
  "    Write-Host '  Done.';" ^
  "    $stopped = $true;" ^
  "  }" ^
  "}" ^
  "if (-not $stopped) { Write-Host '  No server found on ports 5001-5005. Already stopped.' }"

echo.
echo  Press any key to close...
pause >nul
