# Performance Management System (PMS) — PT Petrokimia Gresik

Sistem Pengelolaan Kinerja Karyawan internal PT Petrokimia Gresik dengan otomatisasi pemrosesan Master Data dan integrasi 4 modul laporan kinerja (Planning, Coaching, Appraisal, Review 360).

---

## Tech Stack

- **Backend & Data Pipeline**: Python FastAPI, pandas, openpyxl, rapidfuzz, SQLAlchemy 2.0, Alembic
- **Database**: PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Lucide Icons + Recharts / Chart.js
- **Export Engine**: WeasyPrint (PDF berlogo) & openpyxl (Excel)

---

## Menjalankan Sistem Secara Lokal

### 1. Prasyarat
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL database aktif

### 2. Setup Backend
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Jalankan server
uvicorn app.main:app --reload --port 8000
```
Dokumentasi Swagger API dapat diakses di `http://localhost:8000/api/docs`.

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend dapat diakses di `http://localhost:5173`.

### 4. Menjalankan via Docker Compose
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/api/docs`
- PostgreSQL: Port `5432`
