from app.db.session import SessionLocal, Base, engine
from app.models.models import Period, OrgUnitAlias, User
from app.core.security import hash_password

def init_db():
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text('ALTER TABLE employees_master ADD COLUMN IF NOT EXISTS tgl_pen VARCHAR(50);'))
            conn.execute(text('ALTER TABLE employees_master ADD COLUMN IF NOT EXISTS delegasi_posisi_lain TEXT;'))
            conn.commit()
        except Exception as e:
            pass
    db = SessionLocal()
    try:
        # Seed Default User (Operasional SDM)
        default_user = db.query(User).filter(User.username == "operasional.sdm").first()
        if not default_user:
            user = User(
                username="operasional.sdm",
                email="operasional.sdm@petrokimia-gresik.com",
                hashed_password=hash_password("password123"),
                full_name="Tim Operasional SDM",
                role="Operasional SDM",
                is_active=True
            )
            db.add(user)

        # Seed 2026 Periods
        for tw in [1, 2, 3, 4]:
            exists = db.query(Period).filter(Period.tahun == 2026, Period.triwulan == tw).first()
            if not exists:
                period = Period(tahun=2026, triwulan=tw, is_active=(tw == 2))
                db.add(period)

        # Seed Common Org Unit Aliases
        aliases = [
            # Kompartemen
            ("Komp. Pemeliharaan", "Kompartemen Pemeliharaan", "kompartemen"),
            ("Komp Pemeliharaan", "Kompartemen Pemeliharaan", "kompartemen"),
            ("Komp. Mitra Bisnis", "Kompartemen Mitra Bisnis", "kompartemen"),
            ("Komp Mitra Bisnis", "Kompartemen Mitra Bisnis", "kompartemen"),
            ("Komp. Sekretaris Perusahaan", "Kompartemen Sekretaris Perusahaan", "kompartemen"),
            ("Komp. Operasi I", "Kompartemen Operasi I", "kompartemen"),
            ("Komp Operasi I", "Kompartemen Operasi I", "kompartemen"),
            ("Komp. Operasi II", "Kompartemen Operasi II", "kompartemen"),
            ("Komp Operasi II", "Kompartemen Operasi II", "kompartemen"),
            ("Komp. Operasi III", "Kompartemen Operasi III", "kompartemen"),
            ("Komp Operasi III", "Kompartemen Operasi III", "kompartemen"),
            ("Komp. Teknologi", "Kompartemen Teknologi", "kompartemen"),
            ("Komp Teknologi", "Kompartemen Teknologi", "kompartemen"),
            ("Komp. Manajemen Logistik", "Kompartemen Manajemen Logistik", "kompartemen"),
            ("Komp. Riset", "Kompartemen Riset", "kompartemen"),
            ("Komp. SDM", "Kompartemen SDM", "kompartemen"),
            
            # Departemen
            ("Dep. Keselamatan & Kesehatan Kerja", "Departemen Keselamatan & Kesehatan Kerja", "departemen"),
            ("Dep. Operasi Pabrik I A", "Departemen Operasi Pabrik I A", "departemen"),
            ("Dep. Operasi Pabrik I B", "Departemen Operasi Pabrik I B", "departemen"),
            ("Dep. Operasi Pabrik II A", "Departemen Operasi Pabrik II A", "departemen"),
            ("Dep. Operasi Pabrik II B", "Departemen Operasi Pabrik II B", "departemen"),
            ("Dep. Operasi Pabrik III A", "Departemen Operasi Pabrik III A", "departemen"),
            ("Dep. Operasi Pabrik III B", "Departemen Operasi Pabrik III B", "departemen"),
            ("Dep. Pemeliharaan Mekanik I", "Departemen Pemeliharaan Mekanik I", "departemen"),
            ("Dep. Pemeliharaan Mekanik II", "Departemen Pemeliharaan Mekanik II", "departemen"),
            ("Dep. Pemeliharaan Mekanik III", "Departemen Pemeliharaan Mekanik III", "departemen"),
            ("Dep. Pemeliharaan Listrik & Instrumen I", "Departemen Pemeliharaan Listrik & Instrumen I", "departemen"),
            ("Dep. Pemeliharaan Listrik & Instrumen II", "Departemen Pemeliharaan Listrik & Instrumen II", "departemen"),
            ("Dep. Pemeliharaan Listrik & Instrumen III", "Departemen Pemeliharaan Listrik & Instrumen III", "departemen"),
        ]

        for asli, kanonik, jenis in aliases:
            existing = db.query(OrgUnitAlias).filter(OrgUnitAlias.nama_asli == asli).first()
            if not existing:
                db.add(OrgUnitAlias(nama_asli=asli, nama_kanonik=kanonik, jenis=jenis))

        db.commit()
        print("Database initialized, seeded Operasional SDM user and org aliases successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
