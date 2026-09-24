@echo off
echo ========================================================
echo   Starting PMS - PT Petrokimia Gresik (Backend + Frontend)
echo ========================================================
start cmd /k "start-backend.bat"
start cmd /k "start-frontend.bat"
echo System is starting up...
echo Frontend: http://localhost:5173
echo Backend API Docs: http://localhost:8000/api/docs
