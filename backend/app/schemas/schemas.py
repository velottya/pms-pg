from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# --- Period Schemas ---
class PeriodBase(BaseModel):
    tahun: int
    triwulan: int
    is_active: bool = True

class PeriodCreate(PeriodBase):
    pass

class PeriodOut(PeriodBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- OrgUnitAlias Schemas ---
class OrgUnitAliasBase(BaseModel):
    nama_asli: str
    nama_kanonik: str
    jenis: str # direktorat / kompartemen / departemen

class OrgUnitAliasCreate(OrgUnitAliasBase):
    pass

class OrgUnitAliasOut(OrgUnitAliasBase):
    id: int

    class Config:
        from_attributes = True


# --- EmployeeMaster Schemas ---
class EmployeeMasterBase(BaseModel):
    nik: str
    nik_sap: Optional[str] = None
    nama: str
    eselon: Optional[str] = None
    nm_jabatan: Optional[str] = None
    direktorat: Optional[str] = None
    kompartemen: Optional[str] = None
    departemen: Optional[str] = None
    bagian: Optional[str] = None
    seksi: Optional[str] = None
    regu: Optional[str] = None
    poscode: Optional[str] = None
    postitle: Optional[str] = None
    status_pegawai: Optional[str] = None
    status_kerja: Optional[str] = None
    kategori: str = "AKTIF"
    is_delegasi: bool = False
    delegasi_posisi_lain: Optional[str] = None
    is_tidak_coaching: bool = False
    source: str = "OVERVIEW"
    snapshot_date: date

class EmployeeMasterOut(EmployeeMasterBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Upload & Orphan Schemas ---
class UploadOrphanRowOut(BaseModel):
    id: int
    upload_id: int
    row_number: Optional[int] = None
    nik: Optional[str] = None
    nama: Optional[str] = None
    departemen: Optional[str] = None
    raw_data: Optional[str] = None
    jenis_file: Optional[str] = None
    tahun: Optional[int] = None
    triwulan: Optional[int] = None

    class Config:
        from_attributes = True

class UploadOut(BaseModel):
    id: int
    jenis_file: str
    period_id: Optional[int] = None
    filename: str
    uploaded_at: datetime
    uploaded_by: Optional[str] = None
    row_count: int
    orphan_row_count: int

    class Config:
        from_attributes = True


# --- Pipeline Summary Response Schemas ---
class MasterPipelineSummary(BaseModel):
    total_rows: int
    aktif_count: int
    pkwt_count: int
    purna_count: int
    pi_count: int
    delegasi_count: int
    tidak_coaching_count: int = 0
    unknown_units_count: int
    snapshot_date: date
    message: str


# --- Module Summary & Detail Schemas ---
class DepartmentSummaryItem(BaseModel):
    no: int
    departemen: str
    total: int
    approved: int
    wait_apv: int
    drafted: int
    ny_submit: int
    accomplishments_pct: float

class ModuleSummaryResponse(BaseModel):
    tahun: int
    triwulan: int
    total_employees: int
    total_departments: Optional[int] = 0
    approved_count: Optional[int] = 0
    approved_pct: float
    waiting_approval_count: Optional[int] = 0
    waiting_approval_pct: float
    drafted_count: Optional[int] = 0
    drafted_pct: Optional[float] = None
    declined_count: Optional[int] = 0
    declined_pct: Optional[float] = None
    not_yet_submitted_count: Optional[int] = 0
    not_yet_submitted_pct: float
    all_done_count: Optional[int] = 0
    all_done_pct: Optional[float] = None
    almost_done_count: Optional[int] = 0
    almost_done_pct: Optional[float] = None
    ny_done_count: Optional[int] = 0
    ny_done_pct: Optional[float] = None
    per_departemen: List[DepartmentSummaryItem]

class PlanningDetailItem(BaseModel):
    nama: str
    nik: str
    departemen: Optional[str]
    status: str
    submit_date: Optional[str]
    approved_date: Optional[str]
    is_delegasi: Optional[bool] = False
    delegasi_posisi_lain: Optional[str] = None

class CoachingDetailItem(BaseModel):
    nama: str
    nik: str
    departemen: Optional[str]
    superior_nik: Optional[str]
    superior_nama: Optional[str]
    jumlah_coaching: int
    tanggal_coaching: Optional[str]
    status: str

class AppraisalDetailItem(BaseModel):
    nama: str
    nik: str
    departemen: Optional[str]
    status: str
    submit_date: Optional[str]
    total_score: Optional[float]

class Review360DetailItem(BaseModel):
    nama: str
    nik: str
    departemen: Optional[str]
    status: str
    assessed: Optional[str]
    percentage: float
