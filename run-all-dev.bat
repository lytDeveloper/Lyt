@echo off
setlocal
set "ROOT=%~dp0"

echo [1/4] git pull - webapp
cd /d "%ROOT%webapp"
git pull

echo [2/4] git pull - backoffice
cd /d "%ROOT%backoffice"
git pull

echo [3/4] Starting webapp dev server...
start "webapp" cmd /k "cd /d %ROOT%webapp && npm run dev"

echo [4/4] Starting backoffice dev server...
start "backoffice" cmd /k "cd /d %ROOT%backoffice && npm run dev"

echo.
echo Done. webapp: http://localhost:5173 , backoffice: http://localhost:5174
pause
