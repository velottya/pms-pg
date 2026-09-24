import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import Period, PerformanceReview360, Upload
from app.schemas.schemas import ModuleSummaryResponse, DepartmentSummaryItem, Review360DetailItem

router = APIRouter(prefix="/review360", tags=["Performance Review 360"])

@router.get("/summary", response_model=ModuleSummaryResponse)
def get_review360_summary(
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
            all_done_pct=0.0,
            almost_done_pct=0.0,
            ny_done_pct=0.0,
            not_yet_submitted_pct=0.0,
            per_departemen=[]
        )

    items = db.query(PerformanceReview360).filter(PerformanceReview360.period_id == period.id).all()
    total = len(items)
    if total == 0:
        return ModuleSummaryResponse(
            tahun=tahun,
            triwulan=triwulan,
            total_employees=0,
            approved_pct=0.0,
            waiting_approval_pct=0.0,
            all_done_pct=0.0,
            almost_done_pct=0.0,
            ny_done_pct=0.0,
            not_yet_submitted_pct=0.0,
            per_departemen=[]
        )

    all_done = sum(1 for i in items if i.status == 'All Done')
    almost_done = sum(1 for i in items if i.status == 'Almost Done')
    ny_done = sum(1 for i in items if i.status == 'NY Done')
    ny_submit = sum(1 for i in items if i.status == 'NY Submitted')

    dept_map = {}
    for i in items:
        dept = i.departemen or "Tanpa Departemen"
        if dept not in dept_map:
            dept_map[dept] = {"total": 0, "approved": 0, "wait_apv": 0, "drafted": 0, "ny_submit": 0}
        dept_map[dept]["total"] += 1
        if i.status == 'All Done':
            dept_map[dept]["approved"] += 1
        elif i.status == 'Almost Done':
            dept_map[dept]["wait_apv"] += 1
        elif i.status == 'NY Done':
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
        approved_count=all_done,
        approved_pct=round(all_done / total * 100, 1),
        waiting_approval_count=almost_done,
        waiting_approval_pct=round(almost_done / total * 100, 1),
        all_done_count=all_done,
        all_done_pct=round(all_done / total * 100, 1),
        almost_done_count=almost_done,
        almost_done_pct=round(almost_done / total * 100, 1),
        ny_done_count=ny_done,
        ny_done_pct=round(ny_done / total * 100, 1),
        not_yet_submitted_count=ny_submit,
        not_yet_submitted_pct=round(ny_submit / total * 100, 1),
        per_departemen=per_dept
    )


@router.get("/detail", response_model=List[Review360DetailItem])
def get_review360_detail(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    departemen: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return []

    query = db.query(PerformanceReview360).filter(PerformanceReview360.period_id == period.id)
    if departemen:
        query = query.filter(PerformanceReview360.departemen == departemen)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (PerformanceReview360.nama.ilike(search_term)) |
            (PerformanceReview360.employee_nik.ilike(search_term))
        )

    records = query.order_by(PerformanceReview360.nama.asc()).all()
    return [
        Review360DetailItem(
            nama=r.nama,
            nik=r.employee_nik,
            departemen=r.departemen,
            status=r.status,
            assessed=r.total_assessed,
            percentage=float(r.total_pct) if r.total_pct is not None else 0.0
        )
        for r in records
    ]


@router.get("/score-distribution")
def get_review360_score_distribution(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}

    items = db.query(PerformanceReview360).filter(PerformanceReview360.period_id == period.id).all()

    buckets = {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}
    for item in items:
        pct = float(item.total_pct or 0)
        if pct < 85.0:
            buckets["under_85"] += 1
        elif 85.0 <= pct <= 95.0:
            buckets["85_to_95"] += 1
        elif 95.0 < pct <= 100.0:
            buckets["96_to_100"] += 1
        else:
            buckets["above_100"] += 1

    return {
        "labels": {"under_85": "< 85%", "85_to_95": "85% - 95%", "96_to_100": "96% - 100%", "above_100": "100%"},
        "counts": buckets,
        "total_assessed": len(items)
    }


@router.get("/average-score-per-departemen")
def get_review360_avg_score_per_department(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        return []

    results = db.query(
        PerformanceReview360.departemen,
        func.avg(PerformanceReview360.total_pct).label("avg_pct"),
        func.count(PerformanceReview360.id).label("employee_count")
    ).filter(
        PerformanceReview360.period_id == period.id
    ).group_by(PerformanceReview360.departemen).order_by(func.avg(PerformanceReview360.total_pct).desc()).all()

    return [
        {
            "departemen": r.departemen or "Tanpa Departemen",
            "avg_pct": round(float(r.avg_pct), 2),
            "employee_count": r.employee_count
        }
        for r in results
    ]


@router.delete("/data")
def delete_review360_data(
    tahun: int = Query(...),
    triwulan: int = Query(...),
    deleted_by: Optional[str] = Query("Tim Operasional SDM"),
    db: Session = Depends(get_db)
):
    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periode tahun dan triwulan tidak ditemukan.")

    deleted_count = db.query(PerformanceReview360).filter(PerformanceReview360.period_id == period.id).delete()

    upload_record = Upload(
        jenis_file="review360",
        period_id=period.id,
        filename=f"[Hapus Data] Performance Review 360 - TW{triwulan} {tahun}",
        uploaded_at=datetime.datetime.utcnow(),
        uploaded_by=deleted_by,
        row_count=0,
        orphan_row_count=0
    )
    db.add(upload_record)
    db.commit()

    return {
        "status": "success",
        "message": f"Berhasil menghapus {deleted_count} data Performance Review 360 untuk TW{triwulan} {tahun}.",
        "deleted_count": deleted_count
    }
