import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import Period, PerformanceAppraisal, Upload
from app.schemas.schemas import ModuleSummaryResponse, DepartmentSummaryItem, AppraisalDetailItem
from app.core.config import settings

router = APIRouter(prefix="/appraisal", tags=["Performance Appraisal"])

@router.get("/summary", response_model=ModuleSummaryResponse)
def get_appraisal_summary(
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
            declined_pct=0.0,
            not_yet_submitted_pct=0.0,
            per_departemen=[]
        )

    items = db.query(PerformanceAppraisal).filter(PerformanceAppraisal.period_id == period.id).all()
    total = len(items)
    if total == 0:
        return ModuleSummaryResponse(
            tahun=tahun,
            triwulan=triwulan,
            total_employees=0,
            approved_pct=0.0,
            waiting_approval_pct=0.0,
            declined_pct=0.0,
            not_yet_submitted_pct=0.0,
            per_departemen=[]
        )

    approved = sum(1 for i in items if i.status.lower() == 'approved')
    wait_apv = sum(1 for i in items if 'wait' in i.status.lower() or 'waiting' in i.status.lower() or 'proses' in i.status.lower())
    declined = sum(1 for i in items if 'decline' in i.status.lower() or 'reject' in i.status.lower() or 'tolak' in i.status.lower())
    ny_submit = sum(1 for i in items if 'belum' in i.status.lower() or 'not' in i.status.lower() or 'ny' in i.status.lower())

    dept_map = {}
    for i in items:
        dept = i.departemen or "Tanpa Departemen"
        if dept not in dept_map:
            dept_map[dept] = {"total": 0, "approved": 0, "wait_apv": 0, "declined": 0, "ny_submit": 0}
        dept_map[dept]["total"] += 1
        st = i.status.lower()
        if st == 'approved':
            dept_map[dept]["approved"] += 1
        elif 'wait' in st or 'proses' in st:
            dept_map[dept]["wait_apv"] += 1
        elif 'decline' in st or 'reject' in st or 'tolak' in st:
            dept_map[dept]["declined"] += 1
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
            drafted=counts["declined"], # mapped for column slot
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
        declined_count=declined,
        declined_pct=round(declined / total * 100, 1),
        not_yet_submitted_count=ny_submit,
        not_yet_submitted_pct=round(ny_submit / total * 100, 1),
        per_departemen=per_dept
    )


@router.get("/detail", response_model=List[AppraisalDetailItem])
def get_appraisal_detail(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    departemen: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return []

    query = db.query(PerformanceAppraisal).filter(PerformanceAppraisal.period_id == period.id)
    if departemen:
        query = query.filter(PerformanceAppraisal.departemen == departemen)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (PerformanceAppraisal.nama.ilike(search_term)) |
            (PerformanceAppraisal.employee_nik.ilike(search_term))
        )

    records = query.order_by(PerformanceAppraisal.nama.asc()).all()
    return [
        AppraisalDetailItem(
            nama=r.nama,
            nik=r.employee_nik,
            departemen=r.departemen,
            status=r.status,
            submit_date=r.submitted_date,
            total_score=float(r.total_score) if r.total_score is not None else None
        )
        for r in records
    ]


@router.get("/score-distribution")
def get_appraisal_score_distribution(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}

    items = db.query(PerformanceAppraisal).filter(
        PerformanceAppraisal.period_id == period.id,
        PerformanceAppraisal.total_score.isnot(None)
    ).all()

    buckets = {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}
    for item in items:
        sc = float(item.total_score)
        if sc < 85.0:
            buckets["under_85"] += 1
        elif 85.0 <= sc <= 95.0:
            buckets["85_to_95"] += 1
        elif 95.0 < sc <= 100.0:
            buckets["96_to_100"] += 1
        else:
            buckets["above_100"] += 1

    return {
        "labels": settings.SCORE_BUCKETS,
        "counts": buckets,
        "total_scored": len(items)
    }


@router.get("/average-score-per-departemen")
def get_appraisal_avg_score_per_department(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return []

    results = db.query(
        PerformanceAppraisal.departemen,
        func.avg(PerformanceAppraisal.total_score).label("avg_score"),
        func.count(PerformanceAppraisal.id).label("employee_count")
    ).filter(
        PerformanceAppraisal.period_id == period.id,
        PerformanceAppraisal.total_score.isnot(None)
    ).group_by(PerformanceAppraisal.departemen).order_by(func.avg(PerformanceAppraisal.total_score).desc()).all()

    return [
        {
            "departemen": r.departemen or "Tanpa Departemen",
            "avg_score": round(float(r.avg_score), 2),
            "employee_count": r.employee_count
        }
        for r in results
    ]


@router.delete("/data")
def delete_appraisal_data(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    deleted_by: Optional[str] = Query("Tim Operasional SDM"),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periode tahun dan triwulan tidak ditemukan.")

    deleted_count = db.query(PerformanceAppraisal).filter(PerformanceAppraisal.period_id == period.id).delete()

    upload_record = Upload(
        jenis_file="appraisal",
        period_id=period.id,
        filename=f"[Hapus Data] Performance Appraisal - TW{triwulan} {tahun}",
        uploaded_at=datetime.datetime.utcnow(),
        uploaded_by=deleted_by,
        row_count=0,
        orphan_row_count=0
    )
    db.add(upload_record)
    db.commit()

    return {
        "status": "success",
        "message": f"Berhasil menghapus {deleted_count} data Performance Appraisal untuk TW{triwulan} {tahun}.",
        "deleted_count": deleted_count
    }
