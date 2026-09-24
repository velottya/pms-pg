from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router
from app.db.session import engine, Base
from app.db.seed import init_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Allow all origins for seamless development and cloud deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    try:
        init_db()
    except Exception as e:
        print(f"Database startup notice: {e}")

@app.get("/")
def root():
    return {
        "message": "Performance Management System - PT Petrokimia Gresik API",
        "docs": f"{settings.API_V1_STR}/docs",
        "status": "healthy"
    }

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {"status": "ok"}
