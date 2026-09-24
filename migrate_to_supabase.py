import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text

# Add paths
sys.path.insert(0, os.path.abspath("backend"))

from app.db.session import Base
from app.models.models import (
    User, EmployeeMaster, OrgUnitAlias, Period,
    PerformancePlanning, PerformanceCoaching,
    PerformanceAppraisal, PerformanceReview360,
    UploadHistory, UploadOrphanRow
)

def migrate(supabase_url: str):
    print(f"Connecting to SQLite local database (pms.db)...")
    sqlite_engine = create_engine("sqlite:///pms.db")
    
    print(f"Connecting to Supabase PostgreSQL...")
    pg_engine = create_engine(supabase_url)
    
    # 1. Create all tables in Supabase
    print("Creating tables in Supabase schema...")
    Base.metadata.create_all(bind=pg_engine)
    print("All tables created successfully.")
    
    # Tables in order
    tables = [
        "users",
        "employees_master",
        "org_unit_aliases",
        "periods",
        "uploads",
        "performance_planning",
        "performance_coaching",
        "performance_appraisal",
        "performance_review360",
        "upload_orphan_rows",
    ]
    
    for tbl in tables:
        print(f"Migrating table '{tbl}'...")
        df = pd.read_sql(f"SELECT * FROM {tbl}", sqlite_engine)
        if df.empty:
            print(f"  -> 0 rows (skipped)")
            continue
        
        # Write to PostgreSQL
        with pg_engine.begin() as conn:
            # Clear existing to avoid duplicate conflicts
            conn.execute(text(f'TRUNCATE TABLE "{tbl}" CASCADE;'))
            df.to_sql(tbl, con=conn, if_exists="append", index=False)
        print(f"  -> Successfully migrated {len(df):,} rows.")
        
    print("\n🎉 ALL DATA MIGRATED SUCCESSFULLY TO SUPABASE!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_to_supabase.py '<SUPABASE_DATABASE_URL>'")
        sys.exit(1)
    
    supabase_url = sys.argv[1]
    migrate(supabase_url)
