import io
import datetime
import pandas as pd
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Period, Upload, UploadOrphanRow, EmployeeMaster
from app.services.master_pipeline import MasterDataPipeline
from app.services.report_pipeline import ReportDataPipeline
from app.schemas.schemas import UploadOut, UploadOrphanRowOut, MasterPipelineSummary

router = APIRouter(prefix="/uploads", tags=["Uploads"])

@router.post("/master", response_model=MasterPipelineSummary)
async def upload_master_file(
    file: UploadFile = File(...),
    snapshot_date_str: Optional[str] = Form(None),
    source: Optional[str] = Form("OVERVIEW"),
    uploaded_by: Optional[str] = Form("Tim Operasional SDM"),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File harus berformat Excel (.xlsx atau .xls)")

    snapshot_date = datetime.date.today()
    if snapshot_date_str:
        try:
            snapshot_date = datetime.datetime.strptime(snapshot_date_str, "%Y-%m-%d").date()
        except ValueError:
            pass

    content = await file.read()
    try:
        excel_bytes = io.BytesIO(content)
        pipeline = MasterDataPipeline(db=db)
        result = pipeline.process_workbook(excel_bytes, snapshot_date=snapshot_date)
        saved_count = pipeline.save_to_db(result["records"], snapshot_date=snapshot_date, source=source)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses file Excel Master: {str(e)}")

    upload_record = Upload(
        jenis_file="master",
        period_id=None,
        filename=file.filename,
        uploaded_at=datetime.datetime.utcnow(),
        uploaded_by=uploaded_by,
        row_count=saved_count,
        orphan_row_count=0
    )
    db.add(upload_record)
    db.commit()

    return MasterPipelineSummary(
        total_rows=result["total_rows"],
        aktif_count=result["aktif_count"],
        pkwt_count=result["pkwt_count"],
        purna_count=result["purna_count"],
        pi_count=result["pi_count"],
        delegasi_count=result["delegasi_count"],
        tidak_coaching_count=result.get("tidak_coaching_count", 0),
        unknown_units_count=result["unknown_units_count"],
        snapshot_date=snapshot_date,
        message=f"Berhasil memproses {result['total_rows']} baris Master Data ({result['aktif_count']} Karyawan Aktif, {result['pkwt_count']} PKWT, {result['purna_count']} Purna Tugas, {result.get('tidak_coaching_count', 0)} Tidak Coaching)."
    )


@router.post("/report")
async def upload_report_file(
    file: UploadFile = File(...),
    master_file: Optional[UploadFile] = File(None),
    jenis: str = Form(..., description="kpi_planning, coaching, appraisal, review360"),
    tahun: int = Form(...),
    triwulan: int = Form(...),
    uploaded_by: Optional[str] = Form("Tim Operasional SDM"),
    db: Session = Depends(get_db)
):
    valid_jenis = ["kpi_planning", "coaching", "appraisal", "review360"]
    if jenis not in valid_jenis:
        raise HTTPException(status_code=400, detail=f"Jenis file harus salah satu dari: {', '.join(valid_jenis)}")

    if triwulan not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Triwulan harus antara 1 sampai 4")

    if not file.filename.endswith(('.xlsx', '.xls', '.html', '.htm')):
        raise HTTPException(status_code=400, detail="File harus berformat Excel (.xlsx, .xls) atau Dashboard HTML (.html)")

    # Process custom master file in-memory if supplied, without replacing the main EmployeeMaster table
    custom_master_records = None
    if master_file and master_file.filename:
        try:
            m_content = await master_file.read()
            m_bytes = io.BytesIO(m_content)
            m_pipeline = MasterDataPipeline(db=db)
            m_result = m_pipeline.process_workbook(m_bytes, snapshot_date=datetime.date(tahun, 6, 30))
            custom_master_records = m_result.get("records")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Gagal memproses file Master pembanding: {str(e)}")

    period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
    if not period:
        period = Period(tahun=tahun, triwulan=triwulan)
        db.add(period)
        db.commit()
        db.refresh(period)

    content = await file.read()
    if file.filename.endswith(('.html', '.htm')):
        try:
            import json, re
            text_html = content.decode('utf-8', errors='ignore')
            m = re.search(r'window\.__DASH_DATA__\s*=\s*(\{.*?\});', text_html)
            if m:
                dash_data = json.loads(m.group(1))
                emp_list = dash_data.get('employees', [])
                df = pd.DataFrame(emp_list)
            else:
                dfs = pd.read_html(io.StringIO(text_html))
                if not dfs:
                    raise Exception("Tidak ditemukan tabel atau data pada file HTML.")
                df = dfs[0]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Gagal membaca data dari file HTML: {str(e)}")
    else:
        try:
            df = pd.read_excel(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Gagal membaca file Excel: {str(e)}")

    upload_record = Upload(
        jenis_file=jenis,
        period_id=period.id,
        filename=file.filename,
        uploaded_at=datetime.datetime.utcnow(),
        uploaded_by=uploaded_by,
        row_count=0,
        orphan_row_count=0
    )
    db.add(upload_record)
    db.commit()
    db.refresh(upload_record)

    report_pipeline = ReportDataPipeline(db=db)
    
    if jenis == "kpi_planning":
        result = report_pipeline.process_kpi_planning(df, period_id=period.id, upload_id=upload_record.id, custom_master_records=custom_master_records)
    elif jenis == "coaching":
        result = report_pipeline.process_coaching(df, period_id=period.id, upload_id=upload_record.id, custom_master_records=custom_master_records)
    elif jenis == "appraisal":
        result = report_pipeline.process_appraisal(df, period_id=period.id, upload_id=upload_record.id, triwulan=triwulan, custom_master_records=custom_master_records)
    elif jenis == "review360":
        result = report_pipeline.process_review360(df, period_id=period.id, upload_id=upload_record.id, custom_master_records=custom_master_records)

    return {
        "status": "success",
        "upload_id": upload_record.id,
        "jenis_file": jenis,
        "tahun": tahun,
        "triwulan": triwulan,
        "row_count": result["row_count"],
        "orphan_row_count": result["orphan_row_count"],
        "message": result["message"]
    }


@router.get("/last-status")
def get_last_upload_status(
    jenis: Optional[str] = Query(None),
    tahun: Optional[int] = Query(None),
    triwulan: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    # Get last master upload
    last_master = db.query(Upload).filter(Upload.jenis_file == "master").order_by(Upload.uploaded_at.desc()).first()
    
    # Get last module upload for period if specified
    report_query = db.query(Upload)
    if jenis:
        report_query = report_query.filter(Upload.jenis_file == jenis)
    
    if tahun and triwulan:
        period = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == triwulan).first()
        if period:
            report_query = report_query.filter(Upload.period_id == period.id)
            
    last_report = report_query.filter(Upload.jenis_file != "master").order_by(Upload.uploaded_at.desc()).first()

    # Query current master counts
    master_total = db.query(EmployeeMaster).count()
    master_aktif = db.query(EmployeeMaster).filter(EmployeeMaster.kategori == "AKTIF").count()
    master_pkwt = db.query(EmployeeMaster).filter(EmployeeMaster.kategori == "PKWT").count()
    master_purna = db.query(EmployeeMaster).filter(EmployeeMaster.kategori == "PURNA").count()
    master_pi = db.query(EmployeeMaster).filter(EmployeeMaster.kategori == "PI").count()

    return {
        "master": {
            "total_rows": master_total,
            "aktif_count": master_aktif,
            "pkwt_count": master_pkwt,
            "purna_count": master_purna,
            "pi_count": master_pi,
            "filename": last_master.filename if last_master else None,
            "uploaded_at": last_master.uploaded_at.isoformat() if last_master else None,
        } if master_total > 0 else None,
        "report": {
            "jenis_file": last_report.jenis_file,
            "filename": last_report.filename,
            "row_count": last_report.row_count,
            "orphan_row_count": last_report.orphan_row_count,
            "uploaded_at": last_report.uploaded_at.isoformat() if last_report else None,
        } if last_report else None
    }


@router.get("/history", response_model=List[UploadOut])
def get_upload_history(
    jenis: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Upload).order_by(Upload.uploaded_at.desc())
    if jenis:
        query = query.filter(Upload.jenis_file == jenis)
    return query.all()


@router.get("/orphan-rows", response_model=List[UploadOrphanRowOut])
def get_orphan_rows(
    upload_id: Optional[int] = Query(None),
    jenis: Optional[str] = Query(None, description="kpi_planning, coaching, appraisal, review360"),
    tahun: Optional[int] = Query(None),
    triwulan: Optional[int] = Query(None),
    limit: int = Query(500),
    db: Session = Depends(get_db)
):
    query = db.query(UploadOrphanRow, Upload.jenis_file, Period.tahun, Period.triwulan)\
        .join(Upload, UploadOrphanRow.upload_id == Upload.id)\
        .outerjoin(Period, Upload.period_id == Period.id)
        
    if upload_id:
        query = query.filter(UploadOrphanRow.upload_id == upload_id)
    if jenis:
        query = query.filter(Upload.jenis_file == jenis)
    if tahun:
        query = query.filter(Period.tahun == tahun)
    if triwulan:
        query = query.filter(Period.triwulan == triwulan)
    
    results = query.order_by(UploadOrphanRow.id.desc()).limit(limit).all()
    out = []
    for r, j_file, thn, tw in results:
        out.append(UploadOrphanRowOut(
            id=r.id,
            upload_id=r.upload_id,
            row_number=r.row_number,
            nik=r.nik,
            nama=r.nama,
            departemen=r.departemen,
            raw_data=r.raw_data,
            jenis_file=j_file,
            tahun=thn,
            triwulan=tw
        ))
    return out
