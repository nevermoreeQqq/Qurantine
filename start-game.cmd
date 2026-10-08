@echo off
setlocal
title Quarantine - Game Server
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)
if not exist "node_modules\ws\package.json" (
  echo Installing server dependencies...
  call npm.cmd ci --omit=dev
  if errorlevel 1 (
    echo Installation failed. Check your Internet connection and try again.
    pause
    exit /b 1
  )
)
set "HOST=0.0.0.0"
set "PORT=5173"
echo Quarantine server - independent of Codex.
echo Open http://localhost:5173 in your browser.
echo Keep THIS window open. Codex can be closed.
echo Press Ctrl+C to stop the server.
echo.
node server.js
echo.
echo Server stopped. If the port is already in use, another server is running.
pause
