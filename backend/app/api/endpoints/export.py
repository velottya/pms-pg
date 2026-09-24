from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.session import get_db
from app.services.export_service import generate_pdf_report, generate_excel_report
from app.api.endpoints.planning import get_planning_summary, get_planning_detail
from app.api.endpoints.coaching import get_coaching_summary, get_coaching_detail
from app.api.endpoints.appraisal import get_appraisal_summary, get_appraisal_detail
from app.api.endpoints.review360 import get_review360_summary, get_review360_detail
from app.models.models import Period

router = APIRouter(prefix="/export", tags=["Export Reports"])

MODULE_TITLES = {
    "planning": "Performance Planning",
    "coaching": "Performance Coaching Superior",
    "appraisal": "Performance Appraisal",
    "review360": "Performance Review 360",
}

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
    
    if is_tahunan or triwulan is None:
        period_label = f"Laporan Tahunan - Tahun {tahun}"
        filename = f"Laporan_{modul}_Tahunan_{tahun}.pdf"
        # Combine or use latest available
        triwulan_target = 2 # default or iterate
    else:
        period_label = f"Triwulan {triwulan} - {tahun}"
        filename = f"Laporan_{modul}_TW{triwulan}_{tahun}.pdf"
        triwulan_target = triwulan

    if modul == "planning":
        summary = get_planning_summary(tahun=tahun, triwulan=triwulan_target, db=db)
    elif modul == "coaching":
        summary = get_coaching_summary(tahun=tahun, triwulan=triwulan_target, db=db)
    elif modul == "appraisal":
        summary = get_appraisal_summary(tahun=tahun, triwulan=triwulan_target, db=db)
    elif modul == "review360":
        summary = get_review360_summary(tahun=tahun, triwulan=triwulan_target, db=db)

    summary_dict = summary.dict() if hasattr(summary, 'dict') else summary.model_dump()
    pdf_bytes = generate_pdf_report(title=title, period_label=period_label, summary_data=summary_dict)
    
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

    if is_tahunan or triwulan is None:
        period_label = f"Laporan Tahunan - Tahun {tahun}"
        filename = f"Laporan_{modul}_Tahunan_{tahun}.xlsx"
        triwulan_target = 2
    else:
        period_label = f"Triwulan {triwulan} - {tahun}"
        filename = f"Laporan_{modul}_TW{triwulan}_{tahun}.xlsx"
        triwulan_target = triwulan

    if modul == "planning":
        summary = get_planning_summary(tahun=tahun, triwulan=triwulan_target, db=db)
        details = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in get_planning_detail(tahun=tahun, triwulan=triwulan_target, db=db)]
    elif modul == "coaching":
        summary = get_coaching_summary(tahun=tahun, triwulan=triwulan_target, db=db)
        details = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in get_coaching_detail(tahun=tahun, triwulan=triwulan_target, db=db)]
    elif modul == "appraisal":
        summary = get_appraisal_summary(tahun=tahun, triwulan=triwulan_target, db=db)
        details = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in get_appraisal_detail(tahun=tahun, triwulan=triwulan_target, db=db)]
    elif modul == "review360":
        summary = get_review360_summary(tahun=tahun, triwulan=triwulan_target, db=db)
        details = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in get_review360_detail(tahun=tahun, triwulan=triwulan_target, db=db)]

    summary_list = [d.dict() if hasattr(d, 'dict') else d.model_dump() for d in summary.per_departemen]
    excel_bytes = generate_excel_report(
        modul_title=title,
        period_label=period_label,
        summary_dept=summary_list,
        detail_records=details
    )

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
