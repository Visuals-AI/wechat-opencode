@echo off
setlocal

cd /d "%~dp0"

set YES=0
if /I "%~1"=="--yes" set YES=1

if defined WOC_DATA_DIR (
  set "DATA_DIR=%WOC_DATA_DIR%"
) else (
  set "DATA_DIR=%USERPROFILE%\.wechat-opencode"
)

echo == WeChat OpenCode login reset ==
echo This will stop the bridge and remove WeChat account bindings.
echo Kept: %DATA_DIR%\config.env
echo Removed: accounts, sessions, sync buffer, QR image
echo.

if "%YES%"=="0" (
  choice /C YN /N /M "Continue? [Y/N] "
  if errorlevel 2 (
    echo Cancelled.
    exit /b 0
  )
)

if exist dist\daemon.js (
  call npm run daemon -- stop
)

call stop-windows.cmd --no-pause

if exist "%DATA_DIR%\accounts" rmdir /S /Q "%DATA_DIR%\accounts"
if exist "%DATA_DIR%\sessions" rmdir /S /Q "%DATA_DIR%\sessions"
if exist "%DATA_DIR%\get_updates_buf" del /F /Q "%DATA_DIR%\get_updates_buf"
if exist "%DATA_DIR%\qrcode.png" del /F /Q "%DATA_DIR%\qrcode.png"

echo.
echo Reset complete. Run start.vbs or npm run setup to scan a new WeChat account.
if /I not "%~1"=="--yes" pause
