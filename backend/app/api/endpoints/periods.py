from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import distinct

from app.db.session import get_db
from app.models.models import Period, PerformancePlanning, EmployeeMaster

router = APIRouter(prefix="/periods", tags=["Periods"])

@router.get("/years", response_model=List[int])
def get_available_years(db: Session = Depends(get_db)):
    # Query distinct years in periods or data
    period_years = db.query(distinct(Period.tahun)).all()
    years = [r[0] for r in period_years if r[0]]
    if not years:
        years = [2026]
    return sorted(list(set(years)))

@router.post("/add-year")
def add_year(tahun: int = Query(...), db: Session = Depends(get_db)):
    # Create 4 quarters for this new year
    for tw in [1, 2, 3, 4]:
        existing = db.query(Period).filter(Period.tahun == tahun, Period.triwulan == tw).first()
        if not existing:
            db.add(Period(tahun=tahun, triwulan=tw))
    db.commit()
    return {"status": "success", "message": f"Tahun {tahun} (TW I - IV) berhasil ditambahkan.", "tahun": tahun}
