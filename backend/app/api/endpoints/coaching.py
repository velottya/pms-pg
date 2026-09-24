import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Period, PerformanceCoaching, Upload
from app.schemas.schemas import ModuleSummaryResponse, DepartmentSummaryItem, CoachingDetailItem

router = APIRouter(prefix="/coaching", tags=["Performance Coaching"])

@router.get("/summary", response_model=ModuleSummaryResponse)
def get_coaching_summary(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return ModuleSummaryResponse(
            tahun=tahun,
            triwulan=triwulan,
            total_employees=0,
            approved_pct=0.0,
            waiting_approval_pct=0.0,
            drafted_pct=0.0,
            not_yet_submitted_pct=0.0,
            per_departemen=[]
        )

    items = db.query(PerformanceCoaching).filter(PerformanceCoaching.period_id == period.id).all()
    total = len(items)
    if total == 0:
        return ModuleSummaryResponse(
            tahun=tahun,
            triwulan=triwulan,
            total_employees=0,
            approved_pct=0.0,
            waiting_approval_pct=0.0,
            drafted_pct=0.0,
            not_yet_submitted_pct=0.0,
            per_departemen=[]
        )

    approved = sum(1 for i in items if i.status == 'Approved')
    wait_apv = sum(1 for i in items if 'Wait' in i.status)
    drafted = sum(1 for i in items if 'Draft' in i.status)
    ny_submit = sum(1 for i in items if 'Not' in i.status or 'Belum' in i.status)

    dept_map = {}
    for i in items:
        dept = i.departemen or "Tanpa Departemen"
        if dept not in dept_map:
            dept_map[dept] = {"total": 0, "approved": 0, "wait_apv": 0, "drafted": 0, "ny_submit": 0}
        dept_map[dept]["total"] += 1
        if i.status == 'Approved':
            dept_map[dept]["approved"] += 1
        elif 'Wait' in i.status:
            dept_map[dept]["wait_apv"] += 1
        elif 'Draft' in i.status:
            dept_map[dept]["drafted"] += 1
        else:
            dept_map[dept]["ny_submit"] += 1

    per_dept: List[DepartmentSummaryItem] = []
    for idx, (dept_name, counts) in enumerate(sorted(dept_map.items()), 1):
        accomplishment = (counts["approved"] / counts["total"] * 100) if counts["total"] > 0 else 0.0
        per_dept.append(DepartmentSummaryItem(
            no=idx,
            departemen=dept_name,
            total=counts["total"],
            approved=counts["approved"],
            wait_apv=counts["wait_apv"],
            drafted=counts["drafted"],
            ny_submit=counts["ny_submit"],
            accomplishments_pct=round(accomplishment, 1)
        ))

    return ModuleSummaryResponse(
        tahun=tahun,
        triwulan=triwulan,
        total_employees=total,
        total_departments=len(per_dept),
        approved_count=approved,
        approved_pct=round(approved / total * 100, 1),
        waiting_approval_count=wait_apv,
        waiting_approval_pct=round(wait_apv / total * 100, 1),
        drafted_count=drafted,
        drafted_pct=round(drafted / total * 100, 1),
        not_yet_submitted_count=ny_submit,
        not_yet_submitted_pct=round(ny_submit / total * 100, 1),
        per_departemen=per_dept
    )


@router.get("/detail", response_model=List[CoachingDetailItem])
def get_coaching_detail(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    departemen: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return []

    query = db.query(PerformanceCoaching).filter(PerformanceCoaching.period_id == period.id)
    if departemen:
        query = query.filter(PerformanceCoaching.departemen == departemen)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (PerformanceCoaching.nama.ilike(search_term)) |
            (PerformanceCoaching.employee_nik.ilike(search_term)) |
            (PerformanceCoaching.superior_nama.ilike(search_term))
        )

    records = query.order_by(PerformanceCoaching.nama.asc()).all()
    return [
        CoachingDetailItem(
            nama=r.nama,
            nik=r.employee_nik,
            departemen=r.departemen,
            superior_nik=r.superior_nik,
            superior_nama=r.superior_nama,
            jumlah_coaching=r.jumlah_coaching or 0,
            tanggal_coaching=r.tanggal_coaching,
            status=r.status
        )
        for r in records
    ]


@router.delete("/data")
def delete_coaching_data(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    deleted_by: Optional[str] = Query("Tim Operasional SDM"),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periode tahun dan triwulan tidak ditemukan.")

    deleted_count = db.query(PerformanceCoaching).filter(PerformanceCoaching.period_id == period.id).delete()

    upload_record = Upload(
        jenis_file="coaching",
        period_id=period.id,
        filename=f"[Hapus Data] Performance Coaching - TW{triwulan} {tahun}",
        uploaded_at=datetime.datetime.utcnow(),
        uploaded_by=deleted_by,
        row_count=0,
        orphan_row_count=0
    )
    db.add(upload_record)
    db.commit()

    return {
        "status": "success",
        "message": f"Berhasil menghapus {deleted_count} data Performance Coaching untuk TW{triwulan} {tahun}.",
        "deleted_count": deleted_count
    }
