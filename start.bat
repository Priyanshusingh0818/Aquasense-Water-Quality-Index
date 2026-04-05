@echo off
echo =========================================
echo Starting AquaSense Dashboard System
echo =========================================

echo.
echo [1/2] Starting Flask Backend (Port 5000)...
start "AquaSense Backend" cmd /k "cd backend && python app.py"

echo.
echo [2/2] Starting React Frontend (Vite)...
start "AquaSense Frontend" cmd /k "npm run dev"

echo.
echo =========================================
echo All services started!
echo Frontend is usually at: http://localhost:5173
echo Backend API is running on: http://localhost:5000
echo =========================================
pause
