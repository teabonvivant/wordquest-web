@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later is required for the optional voice server.
  echo Normal learning: open START_HERE.html or START_WINDOWS.cmd.
  pause
  exit /b 1
)
echo Optional voice: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set in this shell.
echo No key is included in this package. Do not share keys or enter them into the app.
node "%~dp0server\local_server.mjs"
pause
