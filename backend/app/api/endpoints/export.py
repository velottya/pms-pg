from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.db.session import get_db
from app.services.export_service import generate_pdf_report, generate_excel_report
from app.api.endpoints.planning import get_planning_summary, get_planning_detail
from app.api.endpoints.coaching import get_coaching_summary, get_coaching_detail
from app.api.endpoints.appraisal import get_appraisal_summary, get_appraisal_detail, get_appraisal_score_distribution
from app.api.endpoints.review360 import get_review360_summary, get_review360_detail, get_review360_score_distribution
from app.models.models import Period, PerformancePlanning, PerformanceCoaching, PerformanceAppraisal, PerformanceReview360, EmployeeMaster
from app.schemas.schemas import ModuleSummaryResponse, DepartmentSummaryItem, PlanningDetailItem, CoachingDetailItem, AppraisalDetailItem, Review360DetailItem

router = APIRouter(prefix="/export", tags=["Export Reports"])

MODULE_TITLES = {
    "planning": "Performance Planning",
    "coaching": "Performance Coaching Superior",
    "appraisal": "Performance Appraisal",
    "review360": "Performance Review 360",
}


def get_tahunan_planning_data(tahun: int, db: Session):
    periods = db.query(Period).filter(Period.tahun == tahun).all()
    period_ids = [p.id for p in periods]
    if not period_ids:
        empty_summary = ModuleSummaryResponse(
            tahun=tahun, triwulan=0, total_employees=0, approved_pct=0.0,
            waiting_approval_pct=0.0, drafted_pct=0.0, not_yet_submitted_pct=0.0, per_departemen=[]
        )
        return empty_summary, []

    items = db.query(PerformancePlanning).filter(PerformancePlanning.period_id.in_(period_ids)).all()
    total = len(items)
    if total == 0:
        empty_summary = ModuleSummaryResponse(
            tahun=tahun, triwulan=0, total_employees=0, approved_pct=0.0,
            waiting_approval_pct=0.0, drafted_pct=0.0, not_yet_submitted_pct=0.0, per_departemen=[]
        )
        return empty_summary, []

    approved = sum(1 for i in items if i.status_individu.lower() == 'approved')
    wait_apv = sum(1 for i in items if 'wait' in i.status_individu.lower() or 'waiting' in i.status_individu.lower())
    drafted = sum(1 for i in items if 'draft' in i.status_individu.lower())
    ny_submit = sum(1 for i in items if 'belum' in i.status_individu.lower() or 'not' in i.status_individu.lower() or 'ny' in i.status_individu.lower())

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

    summary = ModuleSummaryResponse(
        tahun=tahun,
        triwulan=0,
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

    details = []
    for r in items:
        details.append({
            "nama": r.nama,
            "nik": r.employee_nik,
            "departemen": r.departemen,
            "status": r.status_individu,
            "submit_date": r.submitted_date,
            "approved_date": r.approved_date,
            "is_delegasi": r.is_delegasi,
            "delegasi_posisi_lain": r.delegasi_posisi_lain
        })

    return summary, details


def get_tahunan_coaching_data(tahun: int, db: Session):
    periods = db.query(Period).filter(Period.tahun == tahun).all()
    period_ids = [p.id for p in periods]
    if not period_ids:
        empty_summary = ModuleSummaryResponse(
            tahun=tahun, triwulan=0, total_employees=0, approved_pct=0.0,
            waiting_approval_pct=0.0, drafted_pct=0.0, not_yet_submitted_pct=0.0, per_departemen=[]
        )
        return empty_summary, []

    items = db.query(PerformanceCoaching).filter(PerformanceCoaching.period_id.in_(period_ids)).all()
    total = len(items)
    if total == 0:
        empty_summary = ModuleSummaryResponse(
            tahun=tahun, triwulan=0, total_employees=0, approved_pct=0.0,
            waiting_approval_pct=0.0, drafted_pct=0.0, not_yet_submitted_pct=0.0, per_departemen=[]
        )
        return empty_summary, []

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

    summary = ModuleSummaryResponse(
        tahun=tahun,
        triwulan=0,
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

    details = []
    for r in items:
        details.append({
            "nama": r.nama,
            "nik": r.employee_nik,
            "departemen": r.departemen,
            "superior_nik": r.superior_nik,
            "superior_nama": r.superior_nama,
            "jumlah_coaching": r.jumlah_coaching or 0,
            "tanggal_coaching": r.tanggal_coaching,
            "status": r.status
        })

    return summary, details


def get_tahunan_appraisal_data(tahun: int, db: Session):
    periods = db.query(Period).filter(Period.tahun == tahun).all()
    period_ids = [p.id for p in periods]
    if not period_ids:
        empty_summary = ModuleSummaryResponse(
            tahun=tahun, triwulan=0, total_employees=0, approved_pct=0.0,
            waiting_approval_pct=0.0, drafted_pct=0.0, not_yet_submitted_pct=0.0, per_departemen=[]
        )
        return empty_summary, [], {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}

    items = db.query(PerformanceAppraisal).filter(PerformanceAppraisal.period_id.in_(period_ids)).all()
    total = len(items)
    if total == 0:
        empty_summary = ModuleSummaryResponse(
            tahun=tahun, triwulan=0, total_employees=0, approved_pct=0.0,
            waiting_approval_pct=0.0, drafted_pct=0.0, not_yet_submitted_pct=0.0, per_departemen=[]
        )
        return empty_summary, [], {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}

    approved = sum(1 for i in items if i.status.lower() == 'approved')
    wait_apv = sum(1 for i in items if 'wait' in i.status.lower() or 'waiting' in i.status.lower() or 'proses' in i.status.lower())
    declined = sum(1 for i in items if 'decline' in i.status.lower() or 'reject' in i.status.lower() or 'tolak' in i.status.lower())
    ny_submit = sum(1 for i in items if 'belum' in i.status.lower() or 'not' in i.status.lower() or 'ny' in i.status.lower())

    dept_map = {}
    buckets = {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}

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

        if i.total_score is not None:
            sc = float(i.total_score)
            if sc < 85.0:
                buckets["under_85"] += 1
            elif 85.0 <= sc <= 95.0:
                buckets["85_to_95"] += 1
            elif 95.0 < sc <= 100.0:
                buckets["96_to_100"] += 1
            else:
                buckets["above_100"] += 1

    per_dept: List[DepartmentSummaryItem] = []
    for idx, (dept_name, counts) in enumerate(sorted(dept_map.items()), 1):
        accomplishment = (counts["approved"] / counts["total"] * 100) if counts["total"] > 0 else 0.0
        per_dept.append(DepartmentSummaryItem(
            no=idx,
            departemen=dept_name,
            total=counts["total"],
            approved=counts["approved"],
            wait_apv=counts["wait_apv"],
            drafted=counts["declined"],
            ny_submit=counts["ny_submit"],
            accomplishments_pct=round(accomplishment, 1)
        ))

    summary = ModuleSummaryResponse(
        tahun=tahun,
        triwulan=0,
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

    details = []
    for r in items:
        details.append({
            "nama": r.nama,
            "nik": r.employee_nik,
            "departemen": r.departemen,
            "status": r.status,
            "submit_date": r.submitted_date,
            "total_score": float(r.total_score) if r.total_score is not None else None
        })

    return summary, details, {"counts": buckets}


def get_tahunan_review360_data(tahun: int, db: Session):
    periods = db.query(Period).filter(Period.tahun == tahun).all()
    period_ids = [p.id for p in periods]
    if not period_ids:
        empty_summary = ModuleSummaryResponse(
            tahun=tahun, triwulan=0, total_employees=0, approved_pct=0.0,
            waiting_approval_pct=0.0, drafted_pct=0.0, not_yet_submitted_pct=0.0, per_departemen=[]
        )
        return empty_summary, [], {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}

    items = db.query(PerformanceReview360).filter(PerformanceReview360.period_id.in_(period_ids)).all()
    total = len(items)
    if total == 0:
        empty_summary = ModuleSummaryResponse(
            tahun=tahun, triwulan=0, total_employees=0, approved_pct=0.0,
            waiting_approval_pct=0.0, drafted_pct=0.0, not_yet_submitted_pct=0.0, per_departemen=[]
        )
        return empty_summary, [], {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}

    all_done = sum(1 for i in items if i.status == 'All Done')
    almost_done = sum(1 for i in items if i.status == 'Almost Done')
    ny_done = sum(1 for i in items if i.status == 'NY Done')
    ny_submit = sum(1 for i in items if i.status == 'NY Submitted')

    dept_map = {}
    buckets = {"under_85": 0, "85_to_95": 0, "96_to_100": 0, "above_100": 0}

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

        pct = float(i.total_pct or 0)
        if pct < 85.0:
            buckets["under_85"] += 1
        elif 85.0 <= pct <= 95.0:
            buckets["85_to_95"] += 1
        elif 95.0 < pct <= 100.0:
            buckets["96_to_100"] += 1
        else:
            buckets["above_100"] += 1

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

    summary = ModuleSummaryResponse(
        tahun=tahun,
        triwulan=0,
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

    details = []
    for r in items:
        details.append({
            "nama": r.nama,
            "nik": r.employee_nik,
            "departemen": r.departemen,
            "status": r.status,
            "assessed": r.total_assessed,
            "percentage": float(r.total_pct) if r.total_pct is not None else 0.0
        })

    return summary, details, {"counts": buckets}


@router.get("/{modul}/pdf")
def export_module_pdf(
    modul: str,
    tahun: int = Query(...),
    triwulan: Optional[int] = Query(None),
    is_tahunan: bool = Query(False),
    db: Session = Depends(get_db)
):
    if modul not in MODULE_TITLES:
        raise HTTPException(status_code=400, detail="Modul tidak valid")

    title = MODULE_TITLES[modul]
    score_dist = None

    if is_tahunan or triwulan is None:
        period_label = f"Laporan Tahunan - Tahun {tahun}"
        filename = f"Laporan_{modul}_Tahunan_{tahun}.pdf"
        if modul == "planning":
            summary, _ = get_tahunan_planning_data(tahun=tahun, db=db)
        elif modul == "coaching":
            summary, _ = get_tahunan_coaching_data(tahun=tahun, db=db)
        elif modul == "appraisal":
            summary, _, score_dist = get_tahunan_appraisal_data(tahun=tahun, db=db)
        elif modul == "review360":
            summary, _, score_dist = get_tahunan_review360_data(tahun=tahun, db=db)
    else:
        period_label = f"Triwulan {triwulan} - {tahun}"
        filename = f"Laporan_{modul}_TW{triwulan}_{tahun}.pdf"
        if modul == "planning":
            summary = get_planning_summary(tahun=tahun, triwulan=triwulan, db=db)
        elif modul == "coaching":
            summary = get_coaching_summary(tahun=tahun, triwulan=triwulan, db=db)
        elif modul == "appraisal":
            summary = get_appraisal_summary(tahun=tahun, triwulan=triwulan, db=db)
            score_dist = get_appraisal_score_distribution(tahun=tahun, triwulan=triwulan, db=db)
        elif modul == "review360":
            summary = get_review360_summary(tahun=tahun, triwulan=triwulan, db=db)
            score_dist = get_review360_score_distribution(tahun=tahun, triwulan=triwulan, db=db)

    summary_dict = summary.dict() if hasattr(summary, 'dict') else summary.model_dump()
    pdf_bytes = generate_pdf_report(
        title=title,
        period_label=period_label,
        summary_data=summary_dict,
        score_distribution=score_dist
    )
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{modul}/excel")
def export_module_excel(
    modul: str,
    tahun: int = Query(...),
    triwulan: Optional[int] = Query(None),
    is_tahunan: bool = Query(False),
    db: Session = Depends(get_db)
):
    if modul not in MODULE_TITLES:
        raise HTTPException(status_code=400, detail="Modul tidak valid")

    title = MODULE_TITLES[modul]
    score_dist = None

    if is_tahunan or triwulan is None:
        period_label = f"Laporan Tahunan - Tahun {tahun}"
        filename = f"Laporan_{modul}_Tahunan_{tahun}.xlsx"
        if modul == "planning":
            summary, details = get_tahunan_planning_data(tahun=tahun, db=db)
        elif modul == "coaching":
            summary, details = get_tahunan_coaching_data(tahun=tahun, db=db)
        elif modul == "appraisal":
            summary, details, score_dist = get_tahunan_appraisal_data(tahun=tahun, db=db)
        elif modul == "review360":
            summary, details, score_dist = get_tahunan_review360_data(tahun=tahun, db=db)
    else:
        period_label = f"Triwulan {triwulan} - {tahun}"
        filename = f"Laporan_{modul}_TW{triwulan}_{tahun}.xlsx"
        if modul == "planning":
            summary = get_planning_summary(tahun=tahun, triwulan=triwulan, db=db)
            details = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in get_planning_detail(tahun=tahun, triwulan=triwulan, departemen=None, search=None, db=db)]
        elif modul == "coaching":
            summary = get_coaching_summary(tahun=tahun, triwulan=triwulan, db=db)
            details = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in get_coaching_detail(tahun=tahun, triwulan=triwulan, departemen=None, search=None, db=db)]
        elif modul == "appraisal":
            summary = get_appraisal_summary(tahun=tahun, triwulan=triwulan, db=db)
            details = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in get_appraisal_detail(tahun=tahun, triwulan=triwulan, departemen=None, search=None, db=db)]
            score_dist = get_appraisal_score_distribution(tahun=tahun, triwulan=triwulan, db=db)
        elif modul == "review360":
            summary = get_review360_summary(tahun=tahun, triwulan=triwulan, db=db)
            details = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in get_review360_detail(tahun=tahun, triwulan=triwulan, departemen=None, search=None, db=db)]
            score_dist = get_review360_score_distribution(tahun=tahun, triwulan=triwulan, db=db)

    summary_dict = summary.dict() if hasattr(summary, 'dict') else summary.model_dump()
    summary_list = summary_dict.get('per_departemen', [])
    
    excel_bytes = generate_excel_report(
        modul_title=title,
        period_label=period_label,
        summary_dept=summary_list,
        detail_records=details,
        summary_data=summary_dict,
        score_distribution=score_dist
    )

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
