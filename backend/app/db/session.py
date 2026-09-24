import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

def find_sqlite_db():
    candidates = [
        os.path.join(os.getcwd(), "pms.db"),
        os.path.join(os.path.dirname(__file__), "..", "..", "pms.db"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "pms.db"),
    ]
    for p in candidates:
        abs_p = os.path.abspath(p)
        if os.path.exists(abs_p) and os.path.getsize(abs_p) > 1000:
            return f"sqlite:///{abs_p.replace(chr(92), '/')}"
    return "sqlite:///pms.db"

engine = None
if settings.DATABASE_URL and not settings.DATABASE_URL.startswith("sqlite"):
    try:
        test_engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            connect_args={"connect_timeout": 5}
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = test_engine
        print("[DB] Successfully connected to PostgreSQL/Supabase database.")
    except Exception as e:
        print(f"[DB] PostgreSQL connection failed ({e}). Falling back to local bundled SQLite pms.db.")
        engine = create_engine(find_sqlite_db(), connect_args={"check_same_thread": False})
else:
    db_uri = settings.DATABASE_URL if (settings.DATABASE_URL and settings.DATABASE_URL.startswith("sqlite") and settings.DATABASE_URL != "sqlite:///./pms.db") else find_sqlite_db()
    engine = create_engine(db_uri, connect_args={"check_same_thread": False})
    print(f"[DB] Using SQLite database: {engine.url}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
