@echo off
echo Starting Backend FastAPI Server (PMS PT Petrokimia Gresik)...
cd backend
call .\venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
