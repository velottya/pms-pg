import datetime
import json
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.models import (
    EmployeeMaster, Period, Upload, UploadOrphanRow,
    PerformancePlanning, PerformanceCoaching, PerformanceAppraisal, PerformanceReview360
)
from app.services.master_pipeline import clean_str, clean_nik

class ReportDataPipeline:
    def __init__(self, db: Session):
        self.db = db

    def get_master_nik_lookup(self, custom_records: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if custom_records is not None:
            lookup = {}
            for r in custom_records:
                nik = clean_nik(r.get('nik'))
                nik_sap = clean_nik(r.get('nik_sap'))
                obj = type('SimpleEmp', (), {
                    'nik': nik,
                    'nik_sap': nik_sap,
                    'nama': r.get('nama'),
                    'departemen': r.get('departemen'),
                    'kompartemen': r.get('kompartemen'),
                    'direktorat': r.get('direktorat'),
                    'eselon': r.get('eselon'),
                    'is_delegasi': r.get('is_delegasi', False),
                    'delegasi_posisi_lain': r.get('delegasi_posisi_lain')
                })()
                if nik:
                    lookup[str(nik).strip()] = obj
                if nik_sap:
                    lookup[str(nik_sap).strip()] = obj
            return lookup

        employees = self.db.query(EmployeeMaster).all()
        lookup = {}
        for emp in employees:
            if emp.nik:
                lookup[str(emp.nik).strip()] = emp
            if emp.nik_sap:
                lookup[str(emp.nik_sap).strip()] = emp
        return lookup

    def process_kpi_planning(self, df: pd.DataFrame, period_id: int, upload_id: int, custom_master_records: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        df.columns = [str(c).strip().lower().replace(' ', '_').replace('#', 'no') for c in df.columns]
        master_lookup = self.get_master_nik_lookup(custom_master_records)

        records = []
        orphan_rows = []

        nik_col = next((c for c in df.columns if 'nik' in c), None)
        nama_col = next((c for c in df.columns if 'nama_karyawan' in c or 'nama' in c), None)
        posisi_col = next((c for c in df.columns if 'nama_posisi' in c or 'posisi' in c or 'jabatan' in c), None)
        dept_col = next((c for c in df.columns if 'nama_departemen' in c or 'departemen' in c), None)
        grade_col = next((c for c in df.columns if 'grade' in c), None)
        status_col = next((c for c in df.columns if 'status_kpi_individu' in c or 'status' in c), None)
        status_unit_col = next((c for c in df.columns if 'status_kpi_unit' in c), None)
        sub_col = next((c for c in df.columns if 'submitted' in c), None)
        appr_col = next((c for c in df.columns if 'approved' in c), None)

        # Detect duplicates (Delegasi) within this Report KPI file by NIK or Nama
        duplicate_niks = set()
        if nik_col:
            cleaned_niks = df[nik_col].apply(clean_nik)
            nik_counts = cleaned_niks.value_counts()
            duplicate_niks = set(nik_counts[nik_counts > 1].index.dropna())

        duplicate_names = set()
        if nama_col:
            cleaned_names = df[nama_col].apply(clean_str).apply(lambda x: x.lower().strip() if x else None)
            name_counts = cleaned_names.value_counts()
            duplicate_names = set(name_counts[name_counts > 1].index.dropna())

        self.db.query(PerformancePlanning).filter(PerformancePlanning.period_id == period_id).delete()

        # Reset delegasi status in EmployeeMaster table if we are operating on the DB master
        if custom_master_records is None:
            self.db.query(EmployeeMaster).update({
                EmployeeMaster.is_delegasi: False,
                EmployeeMaster.delegasi_posisi_lain: None
            })
            self.db.commit()

        for idx, row in df.iterrows():
            raw_nik = clean_nik(row.get(nik_col)) if nik_col else None
            nama = clean_str(row.get(nama_col)) if nama_col else "Unknown"
            posisi = clean_str(row.get(posisi_col)) if posisi_col else None
            dept = clean_str(row.get(dept_col)) if dept_col else None
            grade = clean_str(row.get(grade_col)) if grade_col else None
            status = clean_str(row.get(status_col)) or "Belum"
            status_unit = clean_str(row.get(status_unit_col)) if status_unit_col else None
            sub_date = clean_str(row.get(sub_col)) if sub_col else None
            appr_date = clean_str(row.get(appr_col)) if appr_col else None

            if not raw_nik:
                continue

            # Check delegasi flag: duplicate NIK or duplicate Nama
            is_delegasi = False
            delegasi_posisi_lain = None
            cleaned_nama_lower = nama.lower().strip() if nama else None
            is_dup_nik = raw_nik in duplicate_niks
            is_dup_nama = cleaned_nama_lower and cleaned_nama_lower in duplicate_names

            if is_dup_nik or is_dup_nama:
                is_delegasi = True
                if is_dup_nik and nik_col:
                    other_rows = df[(df[nik_col].apply(clean_nik) == raw_nik) & (df.index != idx)]
                elif is_dup_nama and nama_col:
                    other_rows = df[(df[nama_col].apply(clean_str).apply(lambda x: x.lower().strip() if x else None) == cleaned_nama_lower) & (df.index != idx)]
                else:
                    other_rows = pd.DataFrame()

                if not other_rows.empty:
                    other_info = []
                    for _, r in other_rows.iterrows():
                        jbt = clean_str(r.get(posisi_col)) or clean_str(r.get('nm_jabatan')) or 'Jabatan Lain'
                        bgn = clean_str(r.get('bagian')) or '-'
                        dpt = clean_str(r.get(dept_col)) or clean_str(r.get('departemen')) or '-'
                        kmp = clean_str(r.get('kompartemen')) or '-'
                        other_info.append(f"Jabatan: {jbt} | Bagian: {bgn} | Departemen: {dpt} | Kompartemen: {kmp}")
                    delegasi_posisi_lain = " || ".join(other_info)

            master_emp = master_lookup.get(raw_nik)
            if not master_emp:
                orphan_rows.append(UploadOrphanRow(
                    upload_id=upload_id,
                    row_number=idx + 2,
                    nik=raw_nik,
                    nama=nama,
                    departemen=dept,
                    raw_data=json.dumps({k: str(v) for k, v in row.items() if pd.notna(v)})
                ))
            else:
                dept_final = getattr(master_emp, 'departemen', None) or dept
                nama_final = getattr(master_emp, 'nama', None) or nama
                if is_delegasi:
                    setattr(master_emp, 'is_delegasi', True)
                    if delegasi_posisi_lain:
                        setattr(master_emp, 'delegasi_posisi_lain', delegasi_posisi_lain)
                elif getattr(master_emp, 'is_delegasi', False):
                    is_delegasi = True
                    delegasi_posisi_lain = getattr(master_emp, 'delegasi_posisi_lain', None)

                records.append(PerformancePlanning(
                    period_id=period_id,
                    employee_nik=raw_nik,
                    nama=nama_final,
                    departemen=dept_final,
                    grade=grade,
                    status_individu=status,
                    status_unit=status_unit,
                    submitted_date=sub_date,
                    approved_date=appr_date,
                    is_delegasi=is_delegasi,
                    delegasi_posisi_lain=delegasi_posisi_lain
                ))

        self.db.bulk_save_objects(records)
        if orphan_rows:
            self.db.bulk_save_objects(orphan_rows)

        upload_record = self.db.query(Upload).filter(Upload.id == upload_id).first()
        if upload_record:
            upload_record.row_count = len(records)
            upload_record.orphan_row_count = len(orphan_rows)

        self.db.commit()

        return {
            "row_count": len(records),
            "orphan_row_count": len(orphan_rows),
            "delegasi_count": sum(1 for r in records if r.is_delegasi),
            "message": f"Berhasil memproses {len(records)} baris KPI Planning ({sum(1 for r in records if r.is_delegasi)} delegasi terdeteksi) dengan {len(orphan_rows)} orphan rows."
        }

    def process_coaching(self, df: pd.DataFrame, period_id: int, upload_id: int, custom_master_records: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]
        master_lookup = self.get_master_nik_lookup(custom_master_records)

        records = []
        orphan_rows = []

        nik_karyawan_col = next((c for c in df.columns if 'nik_karyawan' in c or c == 'nik'), None)
        nama_karyawan_col = next((c for c in df.columns if 'nama_karyawan' in c or c == 'nama'), None)
        nik_superior_col = next((c for c in df.columns if 'nik_superior' in c), None)
        nama_superior_col = next((c for c in df.columns if 'nama_superior' in c), None)
        pos_superior_col = next((c for c in df.columns if 'posisi_superior' in c), None)
        jml_coaching_col = next((c for c in df.columns if 'jumlah_coaching' in c or 'jumlah' in c), None)
        tgl_coaching_col = next((c for c in df.columns if 'tanggal_coaching' in c or 'tanggal' in c), None)

        self.db.query(PerformanceCoaching).filter(PerformanceCoaching.period_id == period_id).delete()

        current_superior_nik = None
        current_superior_nama = None
        current_superior_posisi = None

        for idx, row in df.iterrows():
            sup_nik = clean_nik(row.get(nik_superior_col)) if nik_superior_col else None
            sup_nama = clean_str(row.get(nama_superior_col)) if nama_superior_col else None
            sup_pos = clean_str(row.get(pos_superior_col)) if pos_superior_col else None

            if sup_nik:
                current_superior_nik = sup_nik
                current_superior_nama = sup_nama
                current_superior_posisi = sup_pos

            raw_nik = clean_nik(row.get(nik_karyawan_col)) if nik_karyawan_col else None
            nama = clean_str(row.get(nama_karyawan_col)) if nama_karyawan_col else "Unknown"
            
            jml_raw = row.get(jml_coaching_col) if jml_coaching_col else 0
            try:
                jml_coaching = int(jml_raw) if pd.notna(jml_raw) else 0
            except:
                jml_coaching = 0
            
            tgl_coaching = clean_str(row.get(tgl_coaching_col)) if tgl_coaching_col else None

            if not raw_nik:
                continue

            status = "Approved" if jml_coaching >= 2 else ("Drafted" if jml_coaching == 1 else "Not Yet Submitted")

            master_emp = master_lookup.get(raw_nik)
            if not master_emp:
                orphan_rows.append(UploadOrphanRow(
                    upload_id=upload_id,
                    row_number=idx + 2,
                    nik=raw_nik,
                    nama=nama,
                    departemen=None,
                    raw_data=json.dumps({k: str(v) for k, v in row.items() if pd.notna(v)})
                ))
            else:
                dept_final = getattr(master_emp, 'departemen', None)
                nama_final = getattr(master_emp, 'nama', None) or nama
                records.append(PerformanceCoaching(
                    period_id=period_id,
                    employee_nik=raw_nik,
                    nama=nama_final,
                    departemen=dept_final,
                    superior_nik=current_superior_nik,
                    superior_nama=current_superior_nama,
                    superior_posisi=current_superior_posisi,
                    jumlah_coaching=jml_coaching,
                    tanggal_coaching=tgl_coaching,
                    status=status
                ))

        self.db.bulk_save_objects(records)
        if orphan_rows:
            self.db.bulk_save_objects(orphan_rows)

        upload_record = self.db.query(Upload).filter(Upload.id == upload_id).first()
        if upload_record:
            upload_record.row_count = len(records)
            upload_record.orphan_row_count = len(orphan_rows)

        self.db.commit()

        return {
            "row_count": len(records),
            "orphan_row_count": len(orphan_rows),
            "message": f"Berhasil memproses {len(records)} baris Coaching Superior dengan {len(orphan_rows)} orphan rows."
        }

    def process_appraisal(self, df: pd.DataFrame, period_id: int, upload_id: int, triwulan: int, custom_master_records: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]
        master_lookup = self.get_master_nik_lookup(custom_master_records)

        records = []
        orphan_rows = []

        nik_col = next((c for c in df.columns if 'nik' in c), None)
        nama_col = next((c for c in df.columns if 'nama_karyawan' in c or 'nama' in c), None)
        dept_col = next((c for c in df.columns if 'nama_departemen' in c or 'departemen' in c), None)

        # Dynamic triwulan columns matching real Excel headers with fallbacks
        status_tw_col = next((c for c in df.columns if f'status_triwulan_{triwulan}' in c or (f'status' in c and str(triwulan) in c) or f'status_tw_{triwulan}' in c), None)
        if not status_tw_col:
            status_tw_col = next((c for c in df.columns if 'status' in c), None)

        tgl_pengajuan_col = next((c for c in df.columns if f'pengajuan_triwulan_{triwulan}' in c or (f'pengajuan' in c and str(triwulan) in c) or (f'sub' in c and str(triwulan) in c)), None)
        if not tgl_pengajuan_col:
            tgl_pengajuan_col = next((c for c in df.columns if 'pengajuan' in c or 'submitted' in c), None)

        tgl_approve_col = next((c for c in df.columns if f'approve_triwulan_{triwulan}' in c or (f'approve' in c and str(triwulan) in c) or f'tgl._approve' in c or f'tgl_approve' in c), None)
        if not tgl_approve_col:
            tgl_approve_col = next((c for c in df.columns if 'approve' in c or 'disetujui' in c), None)

        nilai_tw_col = next((c for c in df.columns if f'total_nilai_triwulan_{triwulan}' in c or (f'nilai' in c and str(triwulan) in c) or (f'skor' in c and str(triwulan) in c) or f'nilai_triwulan_{triwulan}' in c), None)
        if not nilai_tw_col:
            nilai_tw_col = next((c for c in df.columns if 'total_nilai' in c or 'total_score' in c or 'nilai' in c or 'skor' in c), None)

        self.db.query(PerformanceAppraisal).filter(PerformanceAppraisal.period_id == period_id).delete()

        for idx, row in df.iterrows():
            raw_nik = clean_nik(row.get(nik_col)) if nik_col else None
            nama = clean_str(row.get(nama_col)) if nama_col else "Unknown"
            dept = clean_str(row.get(dept_col)) if dept_col else None
            
            status_val = clean_str(row.get(status_tw_col)) if status_tw_col else "Belum Mengajukan"
            if not status_val:
                status_val = "Belum Mengajukan"
            else:
                st_l = status_val.lower().strip()
                if st_l in ['approved', 'approve', 'disetujui']:
                    status_val = 'Approved'
                elif st_l in ['waitapv', 'waiting approval', 'wait approval', 'menunggu approval', 'menunggu']:
                    status_val = 'Waiting Approval'
                elif st_l in ['declined', 'decline', 'ditolak', 'reject', 'rejected']:
                    status_val = 'Declined'
                elif st_l in ['ny submit', 'ny_submit', 'not yet submitted', 'belum', 'belum mengajukan']:
                    status_val = 'Belum Mengajukan'

            tgl_sub = clean_str(row.get(tgl_pengajuan_col)) if tgl_pengajuan_col else None
            tgl_appr = clean_str(row.get(tgl_approve_col)) if tgl_approve_col else None
            
            score_val = None
            if nilai_tw_col and pd.notna(row.get(nilai_tw_col)):
                try:
                    score_val = float(row.get(nilai_tw_col))
                except:
                    score_val = None

            if not raw_nik:
                continue

            master_emp = master_lookup.get(raw_nik)
            if not master_emp:
                orphan_rows.append(UploadOrphanRow(
                    upload_id=upload_id,
                    row_number=idx + 2,
                    nik=raw_nik,
                    nama=nama,
                    departemen=dept,
                    raw_data=json.dumps({k: str(v) for k, v in row.items() if pd.notna(v)})
                ))
            else:
                dept_final = getattr(master_emp, 'departemen', None) or dept
                nama_final = getattr(master_emp, 'nama', None) or nama
                records.append(PerformanceAppraisal(
                    period_id=period_id,
                    employee_nik=raw_nik,
                    nama=nama_final,
                    departemen=dept_final,
                    status=status_val,
                    submitted_date=tgl_sub,
                    approved_date=tgl_appr,
                    total_score=score_val
                ))

        self.db.bulk_save_objects(records)
        if orphan_rows:
            self.db.bulk_save_objects(orphan_rows)

        upload_record = self.db.query(Upload).filter(Upload.id == upload_id).first()
        if upload_record:
            upload_record.row_count = len(records)
            upload_record.orphan_row_count = len(orphan_rows)

        self.db.commit()

        return {
            "row_count": len(records),
            "orphan_row_count": len(orphan_rows),
            "message": f"Berhasil memproses {len(records)} baris Appraisal TW {triwulan} dengan {len(orphan_rows)} orphan rows."
        }

    def process_review360(self, df: pd.DataFrame, period_id: int, upload_id: int, custom_master_records: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]
        master_lookup = self.get_master_nik_lookup(custom_master_records)

        records = []
        orphan_rows = []

        nik_col = next((c for c in df.columns if 'nik' in c), None)
        nama_col = next((c for c in df.columns if 'nama_karyawan' in c or 'nama' in c), None)
        dept_col = next((c for c in df.columns if 'nama_departemen' in c or 'departemen' in c), None)
        atasan_col = next((c for c in df.columns if 'atasan' in c), None)
        rekan_col = next((c for c in df.columns if 'rekan' in c), None)
        bawahan_col = next((c for c in df.columns if 'bawahan' in c), None)
        pribadi_col = next((c for c in df.columns if 'pribadi' in c), None)
        pct_col = next((c for c in df.columns if 'penilaian' in c or 'pct' in c or '%' in c), None)

        self.db.query(PerformanceReview360).filter(PerformanceReview360.period_id == period_id).delete()

        for idx, row in df.iterrows():
            raw_nik = clean_nik(row.get(nik_col)) if nik_col else None
            nama = clean_str(row.get(nama_col)) if nama_col else "Unknown"
            dept = clean_str(row.get(dept_col)) if dept_col else None
            
            atasan = clean_str(row.get(atasan_col)) if atasan_col else "0/0"
            rekan = clean_str(row.get(rekan_col)) if rekan_col else "0/0"
            bawahan = clean_str(row.get(bawahan_col)) if bawahan_col else "0/0"
            pribadi = clean_str(row.get(pribadi_col)) if pribadi_col else "0/0"
            
            pct_val = 0.0
            if pct_col and pd.notna(row.get(pct_col)):
                try:
                    pct_val = float(row.get(pct_col))
                except:
                    pct_val = 0.0

            if pct_val >= 100.0:
                status = "All Done"
            elif pct_val >= 75.0:
                status = "Almost Done"
            elif pct_val > 0.0:
                status = "NY Done"
            else:
                status = "NY Submitted"

            if not raw_nik:
                continue

            master_emp = master_lookup.get(raw_nik)
            if not master_emp:
                orphan_rows.append(UploadOrphanRow(
                    upload_id=upload_id,
                    row_number=idx + 2,
                    nik=raw_nik,
                    nama=nama,
                    departemen=dept,
                    raw_data=json.dumps({k: str(v) for k, v in row.items() if pd.notna(v)})
                ))
            else:
                dept_final = getattr(master_emp, 'departemen', None) or dept
                nama_final = getattr(master_emp, 'nama', None) or nama
                records.append(PerformanceReview360(
                    period_id=period_id,
                    employee_nik=raw_nik,
                    nama=nama_final,
                    departemen=dept_final,
                    atasan_assessed=atasan,
                    rekan_assessed=rekan,
                    bawahan_assessed=bawahan,
                    pribadi_assessed=pribadi,
                    total_assessed=f"Atasan: {atasan}, Rekan: {rekan}",
                    total_pct=pct_val,
                    status=status
                ))

        self.db.bulk_save_objects(records)
        if orphan_rows:
            self.db.bulk_save_objects(orphan_rows)

        upload_record = self.db.query(Upload).filter(Upload.id == upload_id).first()
        if upload_record:
            upload_record.row_count = len(records)
            upload_record.orphan_row_count = len(orphan_rows)

        self.db.commit()

        return {
            "row_count": len(records),
            "orphan_row_count": len(orphan_rows),
            "message": f"Berhasil memproses {len(records)} baris Review 360 dengan {len(orphan_rows)} orphan rows."
        }
