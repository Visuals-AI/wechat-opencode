@echo off
setlocal
set NO_PAUSE=0
if /I "%~1"=="--no-pause" set NO_PAUSE=1

cd /d "%~dp0"

echo == WeChat OpenCode Windows desktop starter ==
echo Project: %cd%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Error: Node.js is not installed or not in PATH.
  goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm is not installed or not in PATH.
  goto :fail
)

where opencode >nul 2>nul
if errorlevel 1 (
  echo Error: opencode is not installed or not in PATH.
  goto :fail
)

echo Installing dependencies...
call npm install
if errorlevel 1 goto :fail

echo.
echo Starting Electron desktop console...
call npm run desktop
if errorlevel 1 goto :fail

goto :end

:fail
echo.
echo Startup failed. See the error above.
if "%NO_PAUSE%"=="0" pause
exit /b 1

:end
echo.
echo Desktop console exited.
if "%NO_PAUSE%"=="0" pause
