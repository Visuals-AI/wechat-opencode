@echo off
setlocal

cd /d "%~dp0"

echo == WeChat OpenCode Windows stopper ==
echo Project: %cd%
echo.

if exist dist\daemon.js (
  echo Stopping background daemon if running...
  call npm run daemon -- stop
) else (
  echo dist\daemon.js not found; skipping daemon stop.
)

echo Stopping Electron desktop processes for this project...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$project = (Resolve-Path '.').Path; Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -like '*wechat-opencode*') -and (($_.Name -eq 'electron.exe') -or ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*scripts/desktop.mjs*') -or ($_.Name -eq 'cmd.exe' -and $_.CommandLine -like '*start-windows.cmd*')) } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Host ('Stopped PID ' + $_.ProcessId + ' ' + $_.Name) } catch { Write-Host ('Failed PID ' + $_.ProcessId + ': ' + $_.Exception.Message) } }"

echo Done.
if /I not "%~1"=="--no-pause" pause
