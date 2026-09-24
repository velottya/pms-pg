import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import Period, PerformancePlanning, EmployeeMaster, Upload
from app.schemas.schemas import ModuleSummaryResponse, DepartmentSummaryItem, PlanningDetailItem

router = APIRouter(prefix="/planning", tags=["Performance Planning"])

@router.get("/summary", response_model=ModuleSummaryResponse)
def get_planning_summary(
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

    items = db.query(PerformancePlanning).filter(PerformancePlanning.period_id == period.id).all()
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

    approved = sum(1 for i in items if i.status_individu.lower() == 'approved')
    wait_apv = sum(1 for i in items if 'wait' in i.status_individu.lower() or 'waiting' in i.status_individu.lower())
    drafted = sum(1 for i in items if 'draft' in i.status_individu.lower())
    ny_submit = sum(1 for i in items if 'belum' in i.status_individu.lower() or 'not' in i.status_individu.lower() or 'ny' in i.status_individu.lower())

    # Group per department
    dept_map = {}
    for i in items:
        dept = i.departemen or "Tanpa Departemen"
        if dept not in dept_map:
            dept_map[dept] = {"total": 0, "approved": 0, "wait_apv": 0, "drafted": 0, "ny_submit": 0}
        dept_map[dept]["total"] += 1
        st = i.status_individu.lower()
        if st == 'approved':
            dept_map[dept]["approved"] += 1
        elif 'wait' in st:
            dept_map[dept]["wait_apv"] += 1
        elif 'draft' in st:
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


@router.get("/detail", response_model=List[PlanningDetailItem])
def get_planning_detail(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    departemen: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return []

    query = db.query(PerformancePlanning).filter(PerformancePlanning.period_id == period.id)
    if departemen:
        query = query.filter(PerformancePlanning.departemen == departemen)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (PerformancePlanning.nama.ilike(search_term)) |
            (PerformancePlanning.employee_nik.ilike(search_term))
        )

    records = query.order_by(PerformancePlanning.nama.asc()).all()

    # Match delegation info
    res = []
    for r in records:
        emp = db.query(EmployeeMaster).filter(
            (EmployeeMaster.nik == r.employee_nik) | (EmployeeMaster.nik_sap == r.employee_nik)
        ).first()
        res.append(PlanningDetailItem(
            nama=r.nama,
            nik=r.employee_nik,
            departemen=r.departemen,
            status=r.status_individu,
            submit_date=r.submitted_date,
            approved_date=r.approved_date,
            is_delegasi=emp.is_delegasi if emp else False,
            delegasi_posisi_lain=emp.delegasi_posisi_lain if emp else None
        ))
    return res


@router.delete("/data")
def delete_planning_data(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    deleted_by: Optional[str] = Query("Tim Operasional SDM"),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periode tahun dan triwulan tidak ditemukan.")

    deleted_count = db.query(PerformancePlanning).filter(PerformancePlanning.period_id == period.id).delete()

    upload_record = Upload(
        jenis_file="kpi_planning",
        period_id=period.id,
        filename=f"[Hapus Data] Performance Planning - TW{triwulan} {tahun}",
        uploaded_at=datetime.datetime.utcnow(),
        uploaded_by=deleted_by,
        row_count=0,
        orphan_row_count=0
    )
    db.add(upload_record)
    db.commit()

    return {
        "status": "success",
        "message": f"Berhasil menghapus {deleted_count} data Performance Planning untuk TW{triwulan} {tahun}.",
        "deleted_count": deleted_count
    }
