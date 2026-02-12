@echo off
echo ========================================
echo Landing Page Local Server
echo ========================================
echo.
echo Starting server at http://localhost:8080
echo Press Ctrl+C to stop
echo.
echo Opening service.html in browser...
echo.

cd /d "%~dp0"
start http://localhost:8080/service.html
python -m http.server 8080
