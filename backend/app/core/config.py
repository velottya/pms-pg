import os
from pydantic_settings import BaseSettings
from typing import List

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Settings(BaseSettings):
    PROJECT_NAME: str = "PMS PT Petrokimia Gresik"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "postgresql://postgres:Megumine14_@127.0.0.1:5432/pms-pg"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost"]
    UPLOAD_DIR: str = "uploads"
    SCORE_BUCKETS: dict = {
        "under_85": "< 85",
        "85_to_95": "85 - 95",
        "96_to_100": "96 - 100",
        "above_100": "> 100"
    }

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = [os.path.join(_BASE_DIR, ".env"), os.path.join(_BASE_DIR, "backend", ".env"), ".env"]

settings = Settings()

