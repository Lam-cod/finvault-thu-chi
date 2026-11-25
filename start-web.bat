@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua tim thay Node.js tren may nay.
  echo Vui long tai va cai dat Node.js v24 LTS tai: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dang cai dat thu vien lan dau...
  call npm install
  if errorlevel 1 (
    echo [LOI] Cai dat thu vien that bai!
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
  echo Dang build giao dien FinVault...
  call npm run build
  if errorlevel 1 (
    echo [LOI] Build that bai!
    pause
    exit /b 1
  )
)

echo Khoi chay FinVault tai http://localhost:3456 ...
start "" "http://localhost:3456"
call npx tsx server/index.ts
