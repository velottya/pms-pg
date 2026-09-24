import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Numeric,
    ForeignKey, UniqueConstraint, Index, Text
)
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="Operasional SDM") # Operasional SDM / Admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class EmployeeMaster(Base):
    __tablename__ = "employees_master"

    id = Column(Integer, primary_key=True, index=True)
    nik = Column(String(50), index=True, nullable=False)
    nik_sap = Column(String(50), index=True, nullable=True)
    nama = Column(String(255), index=True, nullable=False)
    eselon = Column(String(50), nullable=True)
    nm_jabatan = Column(String(255), nullable=True)
    direktorat = Column(String(255), index=True, nullable=True)
    kompartemen = Column(String(255), index=True, nullable=True)
    departemen = Column(String(255), index=True, nullable=True)
    bagian = Column(String(255), nullable=True)
    seksi = Column(String(255), nullable=True)
    regu = Column(String(255), nullable=True)
    poscode = Column(String(100), nullable=True)
    postitle = Column(String(255), nullable=True)
    status_pegawai = Column(String(50), nullable=True) # TETAP, PKWT, PRO_HIRE, PURNA BAKTI
    status_kerja = Column(String(50), nullable=True)   # K (Kerja), TK (Tidak Kerja)
    tgl_pen = Column(String(50), nullable=True)        # Tanggal Pensiun
    kategori = Column(String(50), index=True, nullable=False, default="AKTIF") # AKTIF, PKWT, PURNA, PI
    is_delegasi = Column(Boolean, default=False, nullable=False)
    delegasi_posisi_lain = Column(Text, nullable=True)
    is_tidak_coaching = Column(Boolean, default=False, nullable=False)
    source = Column(String(50), default="OVERVIEW", nullable=False, index=True) # OVERVIEW / CONVERSION
    snapshot_date = Column(Date, index=True, nullable=False, default=datetime.date.today)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('ix_emp_nik_snapshot', 'nik', 'snapshot_date'),
    )


class OrgUnitAlias(Base):
    __tablename__ = "org_unit_aliases"

    id = Column(Integer, primary_key=True, index=True)
    nama_asli = Column(String(255), unique=True, index=True, nullable=False)
    nama_kanonik = Column(String(255), index=True, nullable=False)
    jenis = Column(String(50), nullable=False) # direktorat / kompartemen / departemen


class Period(Base):
    __tablename__ = "periods"

    id = Column(Integer, primary_key=True, index=True)
    tahun = Column(Integer, index=True, nullable=False)
    triwulan = Column(Integer, nullable=False) # 1, 2, 3, 4
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('tahun', 'triwulan', name='uq_period_tahun_triwulan'),
    )

    uploads = relationship("Upload", back_populates="period", cascade="all, delete-orphan")
    plannings = relationship("PerformancePlanning", back_populates="period", cascade="all, delete-orphan")
    coachings = relationship("PerformanceCoaching", back_populates="period", cascade="all, delete-orphan")
    appraisals = relationship("PerformanceAppraisal", back_populates="period", cascade="all, delete-orphan")
    reviews = relationship("PerformanceReview360", back_populates="period", cascade="all, delete-orphan")


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    jenis_file = Column(String(50), index=True, nullable=False) # master, kpi_planning, coaching, appraisal, review360
    period_id = Column(Integer, ForeignKey("periods.id", ondelete="CASCADE"), nullable=True)
    filename = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    uploaded_by = Column(String(100), nullable=True, default="Tim Operasional SDM")
    row_count = Column(Integer, default=0, nullable=False)
    orphan_row_count = Column(Integer, default=0, nullable=False)

    period = relationship("Period", back_populates="uploads")
    orphan_records = relationship("UploadOrphanRow", back_populates="upload", cascade="all, delete-orphan")


class UploadOrphanRow(Base):
    __tablename__ = "upload_orphan_rows"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False)
    row_number = Column(Integer, nullable=True)
    nik = Column(String(50), nullable=True)
    nama = Column(String(255), nullable=True)
    departemen = Column(String(255), nullable=True)
    raw_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    upload = relationship("Upload", back_populates="orphan_records")


class PerformancePlanning(Base):
    __tablename__ = "performance_planning"

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(Integer, ForeignKey("periods.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_nik = Column(String(50), index=True, nullable=False)
    nama = Column(String(255), index=True, nullable=False)
    departemen = Column(String(255), index=True, nullable=True)
    grade = Column(String(50), nullable=True)
    status_individu = Column(String(50), index=True, nullable=False) # Approved, Waiting Approval, Drafted, Belum
    status_unit = Column(String(50), nullable=True)
    submitted_date = Column(String(50), nullable=True)
    approved_date = Column(String(50), nullable=True)
    is_delegasi = Column(Boolean, default=False, nullable=False)
    delegasi_posisi_lain = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    period = relationship("Period", back_populates="plannings")


class PerformanceCoaching(Base):
    __tablename__ = "performance_coaching"

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(Integer, ForeignKey("periods.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_nik = Column(String(50), index=True, nullable=False)
    nama = Column(String(255), index=True, nullable=False)
    departemen = Column(String(255), index=True, nullable=True)
    superior_nik = Column(String(50), index=True, nullable=True)
    superior_nama = Column(String(255), nullable=True)
    superior_posisi = Column(String(255), nullable=True)
    jumlah_coaching = Column(Integer, default=0)
    tanggal_coaching = Column(String(100), nullable=True)
    status = Column(String(50), index=True, nullable=False) # Approved, Waiting Approval, Drafted, Not Yet Submitted
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    period = relationship("Period", back_populates="coachings")


class PerformanceAppraisal(Base):
    __tablename__ = "performance_appraisal"

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(Integer, ForeignKey("periods.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_nik = Column(String(50), index=True, nullable=False)
    nama = Column(String(255), index=True, nullable=False)
    departemen = Column(String(255), index=True, nullable=True)
    status = Column(String(50), index=True, nullable=False) # Approved, Waiting Approval, Declined, Belum Mengajukan
    submitted_date = Column(String(50), nullable=True)
    approved_date = Column(String(50), nullable=True)
    total_score = Column(Numeric(6, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    period = relationship("Period", back_populates="appraisals")


class PerformanceReview360(Base):
    __tablename__ = "performance_review360"

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(Integer, ForeignKey("periods.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_nik = Column(String(50), index=True, nullable=False)
    nama = Column(String(255), index=True, nullable=False)
    departemen = Column(String(255), index=True, nullable=True)
    atasan_assessed = Column(String(255), nullable=True) # "11/11" or "Atasan: 13/13, Rekan: 2/2"
    rekan_assessed = Column(String(255), nullable=True)  # "3/3"
    bawahan_assessed = Column(String(255), nullable=True)# "0/0"
    pribadi_assessed = Column(String(255), nullable=True)# "1/1"
    total_assessed = Column(String(255), nullable=True)  # "9/9" or custom formatted summary
    total_pct = Column(Numeric(6, 2), default=0.0)      # 100.00
    status = Column(String(50), index=True, nullable=False) # all_done, almost, ny_done, ny_submit
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    period = relationship("Period", back_populates="reviews")
