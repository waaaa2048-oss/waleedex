@echo off
setlocal
cd /d "%~dp0"

where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Open a new terminal or install Node.js LTS.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Open a new terminal after installing Node.js LTS.
  pause
  exit /b 1
)

set "HAS_DATABASE_URL="
if defined DATABASE_URL set "HAS_DATABASE_URL=1"
for %%F in (.env .env.local .env.development.local) do if exist "%%F" (
  findstr /R /B /C:"DATABASE_URL=" "%%F" >nul 2>nul && set "HAS_DATABASE_URL=1"
)
if not defined HAS_DATABASE_URL (
  echo DATABASE_URL is missing.
  echo Configure a PostgreSQL connection in .env.local before starting the app.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing project dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

call npm.cmd run dev
pause