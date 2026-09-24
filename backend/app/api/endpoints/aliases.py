from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import OrgUnitAlias
from app.schemas.schemas import OrgUnitAliasCreate, OrgUnitAliasOut

router = APIRouter(prefix="/aliases", tags=["Org Unit Aliases"])

@router.get("", response_model=List[OrgUnitAliasOut])
def get_aliases(
    jenis: Optional[str] = Query(None, description="direktorat, kompartemen, departemen"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(OrgUnitAlias)
    if jenis:
        query = query.filter(OrgUnitAlias.jenis == jenis.lower())
    if search:
        term = f"%{search}%"
        query = query.filter(
            (OrgUnitAlias.nama_asli.ilike(term)) |
            (OrgUnitAlias.nama_kanonik.ilike(term))
        )
    return query.order_by(OrgUnitAlias.jenis.asc(), OrgUnitAlias.nama_kanonik.asc()).all()


@router.post("", response_model=OrgUnitAliasOut)
def create_alias(
    alias_in: OrgUnitAliasCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(OrgUnitAlias).filter(OrgUnitAlias.nama_asli.ilike(alias_in.nama_asli.strip())).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Alias untuk nama asli '{alias_in.nama_asli}' sudah ada (mapping ke: {existing.nama_kanonik})."
        )
    
    new_alias = OrgUnitAlias(
        nama_asli=alias_in.nama_asli.strip(),
        nama_kanonik=alias_in.nama_kanonik.strip(),
        jenis=alias_in.jenis.strip().lower()
    )
    db.add(new_alias)
    db.commit()
    db.refresh(new_alias)
    return new_alias


@router.put("/{alias_id}", response_model=OrgUnitAliasOut)
def update_alias(
    alias_id: int,
    alias_in: OrgUnitAliasCreate,
    db: Session = Depends(get_db)
):
    alias = db.query(OrgUnitAlias).filter(OrgUnitAlias.id == alias_id).first()
    if not alias:
        raise HTTPException(status_code=404, detail="Data alias tidak ditemukan.")
    
    alias.nama_asli = alias_in.nama_asli.strip()
    alias.nama_kanonik = alias_in.nama_kanonik.strip()
    alias.jenis = alias_in.jenis.strip().lower()
    db.commit()
    db.refresh(alias)
    return alias


@router.delete("/{alias_id}")
def delete_alias(
    alias_id: int,
    db: Session = Depends(get_db)
):
    alias = db.query(OrgUnitAlias).filter(OrgUnitAlias.id == alias_id).first()
    if not alias:
        raise HTTPException(status_code=404, detail="Data alias tidak ditemukan.")
    db.delete(alias)
    db.commit()
    return {"status": "success", "message": f"Alias '{alias.nama_asli}' berhasil dihapus."}
