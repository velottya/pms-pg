from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import EmployeeMaster
from app.schemas.schemas import EmployeeMasterOut
from app.services.master_pipeline import MasterDataPipeline

router = APIRouter(prefix="/employees", tags=["Employees Master"])

@router.get("/master", response_model=List[EmployeeMasterOut])
def get_master_employees(
    kategori: Optional[str] = Query(None, description="ALL, AKTIF, PKWT, PURNA, PI, DELEGASI"),
    direktorat: Optional[str] = Query(None),
    kompartemen: Optional[str] = Query(None),
    departemen: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    source: str = Query("CONVERSION"),
    limit: int = Query(5000),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeMaster).filter(EmployeeMaster.source == source)
    if kategori and kategori.upper() != 'ALL':
        if kategori.upper() == 'DELEGASI':
            query = query.filter(EmployeeMaster.is_delegasi == True)
        else:
            query = query.filter(EmployeeMaster.kategori == kategori.upper())
    if direktorat:
        query = query.filter(EmployeeMaster.direktorat == direktorat)
    if kompartemen:
        query = query.filter(EmployeeMaster.kompartemen == kompartemen)
    if departemen:
        query = query.filter(EmployeeMaster.departemen == departemen)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (EmployeeMaster.nama.ilike(search_term)) |
            (EmployeeMaster.nik.ilike(search_term)) |
            (EmployeeMaster.nik_sap.ilike(search_term)) |
            (EmployeeMaster.departemen.ilike(search_term))
        )

    return query.order_by(EmployeeMaster.nama.asc()).offset(offset).limit(limit).all()


@router.get("/directorates", response_model=List[str])
def get_directorates_list(
    source: Optional[str] = Query("OVERVIEW"),
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeMaster.direktorat).filter(
        EmployeeMaster.source == source,
        EmployeeMaster.direktorat.isnot(None),
        EmployeeMaster.direktorat != ''
    )
    dirs = [d[0] for d in query.distinct().order_by(EmployeeMaster.direktorat.asc()).all() if d[0]]
    return dirs


@router.get("/departments", response_model=List[str])
def get_departments_list(
    direktorat: Optional[str] = Query(None),
    kategori: Optional[str] = Query("ALL"),
    source: Optional[str] = Query("OVERVIEW"),
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeMaster.departemen).filter(
        EmployeeMaster.source == source,
        EmployeeMaster.departemen.isnot(None),
        EmployeeMaster.departemen != ''
    )
    if direktorat and direktorat.upper() != 'ALL':
        query = query.filter(EmployeeMaster.direktorat == direktorat)
    if kategori and kategori.upper() != 'ALL':
        query = query.filter(EmployeeMaster.kategori == kategori.upper())
    
    depts = [d[0] for d in query.distinct().order_by(EmployeeMaster.departemen.asc()).all() if d[0]]
    return depts


@router.get("/delegasi", response_model=List[EmployeeMasterOut])
def get_delegasi_employees(
    direktorat: Optional[str] = Query(None),
    departemen: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = 5000,
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeMaster).filter(
        EmployeeMaster.source == "OVERVIEW",
        EmployeeMaster.is_delegasi == True
    )
    if direktorat and direktorat.upper() != 'ALL':
        query = query.filter(EmployeeMaster.direktorat == direktorat)
    if departemen:
        query = query.filter(EmployeeMaster.departemen == departemen)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (EmployeeMaster.nama.ilike(term)) |
            (EmployeeMaster.nik.ilike(term)) |
            (EmployeeMaster.departemen.ilike(term)) |
            (EmployeeMaster.delegasi_posisi_lain.ilike(term))
        )
    lim = int(limit) if isinstance(limit, (int, str)) and str(limit).isdigit() else 5000
    return query.order_by(EmployeeMaster.nama.asc()).limit(lim).all()


@router.get("/summary")
def get_master_summary(
    direktorat: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeMaster).filter(EmployeeMaster.source == "CONVERSION")
    if direktorat and direktorat.upper() != 'ALL':
        query = query.filter(EmployeeMaster.direktorat == direktorat)

    master_total = query.count()
    master_aktif = query.filter(EmployeeMaster.kategori == "AKTIF").count()
    master_pkwt = query.filter(EmployeeMaster.kategori == "PKWT").count()
    master_purna = query.filter(EmployeeMaster.kategori == "PURNA").count()
    master_pi = query.filter(EmployeeMaster.kategori == "PI").count()
    master_delegasi = query.filter(EmployeeMaster.is_delegasi == True).count()
    dept_count = query.filter(
        EmployeeMaster.departemen.isnot(None),
        EmployeeMaster.departemen != ''
    ).with_entities(func.count(func.distinct(EmployeeMaster.departemen))).scalar() or 0

    has_explicit_tc = query.filter(EmployeeMaster.is_tidak_coaching == True).count()
    tidak_coaching_count = has_explicit_tc

    return {
        "total_rows": master_total,
        "aktif_count": master_aktif,
        "tidak_coaching_count": tidak_coaching_count,
        "pkwt_count": master_pkwt,
        "purna_count": master_purna,
        "pi_count": master_pi,
        "delegasi_count": master_delegasi,
        "dept_count": dept_count
    }


@router.get("/tidak-coaching")
def get_tidak_coaching(
    direktorat: Optional[str] = Query(None),
    departemen: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = 5000,
    db: Session = Depends(get_db)
):
    from app.models.models import PerformanceCoaching
    has_explicit_tc = db.query(EmployeeMaster).filter(EmployeeMaster.source == "OVERVIEW", EmployeeMaster.is_tidak_coaching == True).first() is not None
    if has_explicit_tc:
        query = db.query(EmployeeMaster).filter(EmployeeMaster.source == "OVERVIEW", EmployeeMaster.is_tidak_coaching == True)
    else:
        coaching_records = db.query(PerformanceCoaching).all()
        if not coaching_records:
            return []
        coaching_niks = {c.employee_nik for c in coaching_records if c.employee_nik}
        query = db.query(EmployeeMaster).filter(
            EmployeeMaster.source == "OVERVIEW",
            EmployeeMaster.kategori == "AKTIF",
            ~EmployeeMaster.nik.in_(coaching_niks),
            ~EmployeeMaster.nik_sap.in_(coaching_niks)
        )
    if direktorat and direktorat.upper() != 'ALL':
        query = query.filter(EmployeeMaster.direktorat == direktorat)
    if departemen:
        query = query.filter(EmployeeMaster.departemen == departemen)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (EmployeeMaster.nama.ilike(term)) |
            (EmployeeMaster.nik.ilike(term)) |
            (EmployeeMaster.departemen.ilike(term))
        )
    
    lim = int(limit) if isinstance(limit, (int, str)) and str(limit).isdigit() else 5000
    all_tidak_coaching = query.order_by(EmployeeMaster.nama.asc()).limit(lim).all()
    return [
        EmployeeMasterOut.from_orm(e) for e in all_tidak_coaching
    ]


@router.get("/rekap-departemen")
def get_rekap_departemen(
    direktorat: Optional[str] = Query(None),
    source: str = Query("CONVERSION"),
    db: Session = Depends(get_db)
):
    from app.models.models import PerformancePlanning, PerformanceCoaching
    
    # Query all employees with department for specified source
    query = db.query(EmployeeMaster).filter(
        EmployeeMaster.source == source,
        EmployeeMaster.departemen.isnot(None),
        EmployeeMaster.departemen != ''
    )
    if direktorat and direktorat.upper() != 'ALL':
        query = query.filter(EmployeeMaster.direktorat == direktorat)

    def_employees = query.all()
    if not def_employees:
        return {
            "total_departemen": 0,
            "total_karyawan": 0,
            "rekap": []
        }
    
    plannings = db.query(PerformancePlanning).all()
    planning_approved_niks = {p.employee_nik for p in plannings if (p.status_individu or '').lower() in ['approved', 'sudah', 'done']}
    planning_wait_niks = {p.employee_nik for p in plannings if 'wait' in (p.status_individu or '').lower() or 'draft' in (p.status_individu or '').lower()}
    
    coachings = db.query(PerformanceCoaching).all()
    coaching_done_niks = {c.employee_nik for c in coachings if (c.status or '').lower() in ['approved', 'sudah', 'done']}

    # Group by all departemen
    dept_map: Dict[str, Dict[str, Any]] = {}
    for e in def_employees:
        dept = e.departemen.strip()
        if dept not in dept_map:
            dept_map[dept] = {
                "departemen": dept,
                "kompartemen": e.kompartemen or "-",
                "direktorat": e.direktorat or "-",
                "total": 0,
                "kpi_approved": 0,
                "kpi_wait": 0,
                "kpi_belum": 0,
                "coaching_sudah": 0,
                "coaching_belum": 0
            }
        dept_map[dept]["total"] += 1
        if e.nik in planning_approved_niks:
            dept_map[dept]["kpi_approved"] += 1
        elif e.nik in planning_wait_niks:
            dept_map[dept]["kpi_wait"] += 1
        else:
            dept_map[dept]["kpi_belum"] += 1

        if e.nik in coaching_done_niks:
            dept_map[dept]["coaching_sudah"] += 1
        else:
            dept_map[dept]["coaching_belum"] += 1

    rekap_list = sorted(list(dept_map.values()), key=lambda x: x["departemen"])
    for idx, item in enumerate(rekap_list, 1):
        item["no"] = idx

    return {
        "total_departemen": len(rekap_list),
        "total_karyawan": sum(d["total"] for d in rekap_list),
        "rekap": rekap_list
    }


@router.get("/export-master-excel")
def export_cleaned_master_excel(
    direktorat: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeMaster).filter(EmployeeMaster.source == "CONVERSION")
    if direktorat and direktorat.upper() != 'ALL':
        query = query.filter(EmployeeMaster.direktorat == direktorat)
        filename = f"Data_Master_Karyawan_{direktorat.replace(' ', '_')}.xlsx"
    else:
        filename = "Data_Master_Karyawan_Petrokimia_Gresik.xlsx"

    employees = query.all()
    records = []
    for e in employees:
        records.append({
            "nik": e.nik,
            "nik_sap": e.nik_sap,
            "nama": e.nama,
            "eselon": e.eselon,
            "nm_jabatan": e.nm_jabatan,
            "direktorat": e.direktorat,
            "kompartemen": e.kompartemen,
            "departemen": e.departemen,
            "bagian": e.bagian,
            "seksi": e.seksi,
            "regu": e.regu,
            "poscode": e.poscode,
            "postitle": e.postitle or e.nm_jabatan,
            "status_pegawai": e.status_pegawai,
            "status_kerja": e.status_kerja,
            "kategori": e.kategori,
            "is_delegasi": e.is_delegasi,
            "delegasi_posisi_lain": e.delegasi_posisi_lain
        })

    pipeline = MasterDataPipeline(db=db)
    excel_bytes = pipeline.generate_cleaned_master_excel(records, scope="kompartemen")

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/overview-stats")
def get_overview_stats(
    direktorat: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeMaster).filter(EmployeeMaster.source == "OVERVIEW")
    if direktorat and direktorat.upper() != 'ALL':
        query = query.filter(EmployeeMaster.direktorat == direktorat)

    all_employees = query.all()
    total_count = len(all_employees)
    
    # Counts by kategori
    aktif_count = sum(1 for e in all_employees if e.kategori == 'AKTIF')
    pkwt_count = sum(1 for e in all_employees if e.kategori == 'PKWT')
    purna_count = sum(1 for e in all_employees if e.kategori == 'PURNA')
    pi_count = sum(1 for e in all_employees if e.kategori == 'PI')
    delegasi_count = sum(1 for e in all_employees if e.is_delegasi)

    # Coaching stats - prioritize is_tidak_coaching flag from Master tab if present
    has_explicit_tc = any(getattr(e, 'is_tidak_coaching', False) for e in all_employees)
    if has_explicit_tc:
        tidak_coaching_count = sum(1 for e in all_employees if getattr(e, 'is_tidak_coaching', False))
    else:
        from app.models.models import PerformanceCoaching
        coaching_records = db.query(PerformanceCoaching).all()
        if coaching_records:
            coaching_niks = {c.employee_nik for c in coaching_records if c.employee_nik}
            tidak_coaching_count = sum(1 for e in all_employees if e.kategori == 'AKTIF' and e.nik not in coaching_niks and (not e.nik_sap or e.nik_sap not in coaching_niks))
        else:
            tidak_coaching_count = 0

    # Status distribution for charts
    status_distribution = [
        {"name": "Karyawan Aktif", "value": aktif_count, "color": "#10b981"},
        {"name": "Purna Tugas", "value": purna_count, "color": "#f43f5e"},
        {"name": "PKWT / Mitra", "value": pkwt_count, "color": "#f59e0b"},
    ]

    # Eselon distribution
    eselon_map: Dict[str, int] = {}
    for e in all_employees:
        es = e.eselon or "Non-Eselon"
        eselon_map[es] = eselon_map.get(es, 0) + 1
    eselon_distribution = [{"name": k, "count": v} for k, v in sorted(eselon_map.items(), key=lambda x: x[0])]

    # Directorate distribution
    dir_map: Dict[str, int] = {}
    for e in all_employees:
        d = e.direktorat or "Tanpa Direktorat"
        dir_map[d] = dir_map.get(d, 0) + 1
    dir_distribution = [{"name": k, "count": v} for k, v in sorted(dir_map.items(), key=lambda x: x[1], reverse=True)]

    # Purna tugas detail list
    purna_list = []
    for e in all_employees:
        if e.kategori == 'PURNA' or (e.status_pegawai and 'PURNA' in e.status_pegawai.upper()):
            purna_list.append({
                "nik": e.nik,
                "nama": e.nama,
                "nm_jabatan": e.nm_jabatan or e.postitle or "-",
                "eselon": e.eselon or "-",
                "departemen": e.departemen or "-",
                "kompartemen": e.kompartemen or "-",
                "direktorat": e.direktorat or "-",
                "tgl_pen": e.tgl_pen or "-",
                "status_pegawai": e.status_pegawai or "PURNA BAKTI"
            })

    return {
        "total_karyawan": total_count,
        "aktif_count": aktif_count,
        "pkwt_count": pkwt_count,
        "purna_count": purna_count,
        "pi_count": pi_count,
        "delegasi_count": delegasi_count,
        "tidak_coaching_count": tidak_coaching_count,
        "status_distribution": status_distribution,
        "eselon_distribution": eselon_distribution,
        "dir_distribution": dir_distribution,
        "purna_list": purna_list,
    }

