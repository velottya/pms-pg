import os
import sys
import json
import datetime
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

# Setup path for backend imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from app.models.models import (
    Base, Period, EmployeeMaster, Upload, UploadOrphanRow,
    PerformancePlanning, PerformanceCoaching, PerformanceAppraisal, PerformanceReview360
)
from app.services.master_pipeline import MasterDataPipeline, clean_nik, clean_str
from app.services.report_pipeline import ReportDataPipeline

# Configure Streamlit page
st.set_page_config(
    page_title="PMS — PT Petrokimia Gresik",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for styling
st.markdown("""
<style>
    .main-header {
        font-size: 1.6rem;
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        font-size: 0.85rem;
        color: #64748b;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .badge-approved { background-color: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .badge-waiting { background-color: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .badge-drafted { background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .badge-danger { background-color: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
</style>
""", unsafe_allow_html=True)

# Database connection
@st.cache_resource
def get_engine():
    # Check streamlit secrets, env, or fallback to SQLite pms.db
    db_url = None
    try:
        if "DATABASE_URL" in st.secrets:
            db_url = st.secrets["DATABASE_URL"]
    except Exception:
        pass
    
    if not db_url:
        db_url = os.environ.get("DATABASE_URL")
        
    if not db_url or "localhost" in db_url or "127.0.0.1" in db_url:
        # Fallback to local SQLite file
        sqlite_path = os.path.join(os.path.dirname(__file__), "pms.db")
        db_url = f"sqlite:///{sqlite_path}"

    if db_url.startswith("sqlite"):
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(db_url, pool_pre_ping=True)
        
    Base.metadata.create_all(bind=engine)
    return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db_session():
    return SessionLocal()

# ----------------- SIDEBAR -----------------
with st.sidebar:
    st.image("logo-pg.jpg", use_container_width=True) if os.path.exists("logo-pg.jpg") else st.title("🏢 PMS Petrokimia")
    st.markdown("### **Performance Management**")
    st.caption("PT Petrokimia Gresik Tbk")
    
    st.markdown("---")
    
    # Year & Triwulan Filters
    col_yr, col_tw = st.columns(2)
    with col_yr:
        sel_year = st.selectbox("Tahun", [2026, 2027], index=0)
    with col_tw:
        sel_tw = st.selectbox("Triwulan", [1, 2, 3, 4], index=1)
        
    st.markdown("---")
    
    # Navigation Menu
    menu = st.radio(
        "Menu Navigasi",
        [
            "🎯 Performance Planning",
            "👥 Performance Coaching",
            "📊 Performance Appraisal",
            "🧭 Performance Review (360)",
            "📈 Overview Master Karyawan",
            "⚠️ Data Perlu Review",
            "📜 Riwayat Aktivitas"
        ]
    )
    
    st.markdown("---")
    st.caption(f"Aktif: **Tahun {sel_year} TW {sel_tw}**")

# Get Period ID
db = get_db_session()
period = db.query(Period).filter(Period.tahun == sel_year, Period.triwulan == sel_tw).first()
if not period:
    period = Period(tahun=sel_year, triwulan=sel_tw)
    db.add(period)
    db.commit()
    db.refresh(period)

period_id = period.id

# ----------------- 1. PERFORMANCE PLANNING -----------------
if menu == "🎯 Performance Planning":
    st.markdown('<div class="main-header">🎯 Performance Planning</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">Monitoring Perencanaan KPI Karyawan — Periode Tahun {sel_year} TW {sel_tw}</div>', unsafe_allow_html=True)
    
    # Query data
    plannings = db.query(PerformancePlanning).filter(PerformancePlanning.period_id == period_id).all()
    total = len(plannings)
    
    approved = sum(1 for p in plannings if p.status_individu.lower() == 'approved')
    waiting = sum(1 for p in plannings if 'wait' in p.status_individu.lower())
    drafted = sum(1 for p in plannings if 'draft' in p.status_individu.lower())
    belum = sum(1 for p in plannings if 'belum' in p.status_individu.lower() or 'not' in p.status_individu.lower())
    
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Karyawan", f"{total:,}")
    c2.metric("Approved", f"{approved:,}", f"{(approved/total*100 if total else 0):.1f}%")
    c3.metric("Waiting Approval", f"{waiting:,}", f"{(waiting/total*100 if total else 0):.1f}%")
    c4.metric("Drafted", f"{drafted:,}", f"{(drafted/total*100 if total else 0):.1f}%")
    c5.metric("Not Yet Submitted", f"{belum:,}", f"{(belum/total*100 if total else 0):.1f}%")
    
    st.markdown("---")
    
    if total > 0:
        col_chart, col_dept = st.columns([1, 2])
        with col_chart:
            st.subheader("Distribusi Status")
            fig = px.pie(
                values=[approved, waiting, drafted, belum],
                names=['Approved', 'Waiting Approval', 'Drafted', 'Not Yet Submitted'],
                color_discrete_sequence=['#10b981', '#f59e0b', '#0ea5e9', '#ef4444'],
                hole=0.6
            )
            fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=300)
            st.plotly_chart(fig, use_container_width=True)
            
        with col_dept:
            st.subheader("Ringkasan Per Departemen")
            dept_data = []
            depts = set(p.departemen for p in plannings if p.departemen)
            for d in depts:
                dept_items = [p for p in plannings if p.departemen == d]
                app_count = sum(1 for p in dept_items if p.status_individu.lower() == 'approved')
                dept_data.append({
                    "Departemen": d,
                    "Total": len(dept_items),
                    "Approved": app_count,
                    "Waiting": sum(1 for p in dept_items if 'wait' in p.status_individu.lower()),
                    "Drafted": sum(1 for p in dept_items if 'draft' in p.status_individu.lower()),
                    "Belum": sum(1 for p in dept_items if 'belum' in p.status_individu.lower() or 'not' in p.status_individu.lower()),
                    "% Approved": round(app_count / len(dept_items) * 100, 1)
                })
            df_dept = pd.DataFrame(dept_data).sort_values(by="% Approved", ascending=False)
            st.dataframe(df_dept, use_container_width=True, hide_index=True)
            
        st.subheader("Daftar Detail Karyawan")
        search_kw = st.text_input("🔍 Cari Nama atau NIK Karyawan", "")
        plan_rows = [
            {
                "NIK": p.employee_nik,
                "Nama": p.nama,
                "Departemen": p.departemen or "-",
                "Status": p.status_individu,
                "Submit Date": p.submitted_date or "-",
                "Approved Date": p.approved_date or "-",
                "Delegasi": "Ya" if p.is_delegasi else "Tidak"
            }
            for p in plannings
            if not search_kw or search_kw.lower() in p.nama.lower() or search_kw in p.employee_nik
        ]
        st.dataframe(pd.DataFrame(plan_rows), use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Planning untuk periode ini.")

# ----------------- 2. PERFORMANCE COACHING -----------------
elif menu == "👥 Performance Coaching":
    st.markdown('<div class="main-header">👥 Performance Coaching</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">Monitoring Coaching & Bimbingan Superior — Periode Tahun {sel_year} TW {sel_tw}</div>', unsafe_allow_html=True)
    
    coachings = db.query(PerformanceCoaching).filter(PerformanceCoaching.period_id == period_id).all()
    total = len(coachings)
    
    approved = sum(1 for c in coachings if c.status == 'Approved')
    waiting = sum(1 for c in coachings if 'Wait' in c.status)
    drafted = sum(1 for c in coachings if 'Draft' in c.status)
    ny = sum(1 for c in coachings if 'Not' in c.status or 'Belum' in c.status)
    
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Karyawan", f"{total:,}")
    c2.metric("Approved", f"{approved:,}", f"{(approved/total*100 if total else 0):.1f}%")
    c3.metric("Waiting Approval", f"{waiting:,}", f"{(waiting/total*100 if total else 0):.1f}%")
    c4.metric("Drafted", f"{drafted:,}", f"{(drafted/total*100 if total else 0):.1f}%")
    c5.metric("Not Yet Submitted", f"{ny:,}", f"{(ny/total*100 if total else 0):.1f}%")
    
    st.markdown("---")
    
    if total > 0:
        col_c1, col_c2 = st.columns([1, 2])
        with col_c1:
            st.subheader("Distribusi Status Coaching")
            fig = px.pie(
                values=[approved, waiting, drafted, ny],
                names=['Approved', 'Waiting Approval', 'Drafted', 'Not Yet Submitted'],
                color_discrete_sequence=['#10b981', '#f59e0b', '#0ea5e9', '#ef4444'],
                hole=0.6
            )
            fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=300)
            st.plotly_chart(fig, use_container_width=True)
            
        with col_c2:
            st.subheader("Ringkasan Coaching Per Departemen")
            c_dept_data = []
            for d in set(c.departemen for c in coachings if c.departemen):
                items = [c for c in coachings if c.departemen == d]
                appr = sum(1 for c in items if c.status == 'Approved')
                c_dept_data.append({
                    "Departemen": d,
                    "Total": len(items),
                    "Approved": appr,
                    "Drafted": sum(1 for c in items if 'Draft' in c.status),
                    "Not Submitted": sum(1 for c in items if 'Not' in c.status or 'Belum' in c.status),
                    "% Approved": round(appr / len(items) * 100, 1)
                })
            st.dataframe(pd.DataFrame(c_dept_data).sort_values(by="% Approved", ascending=False), use_container_width=True, hide_index=True)
            
        st.subheader("Daftar Detail Coaching Karyawan & Atasan")
        search_c = st.text_input("🔍 Cari Karyawan, NIK, atau Atasan", "")
        c_rows = [
            {
                "NIK": c.employee_nik,
                "Nama": c.nama,
                "Departemen": c.departemen or "-",
                "Superior": f"{c.superior_nama or '-'} ({c.superior_nik or '-'})",
                "Jml Coaching": c.jumlah_coaching or 0,
                "Tgl Coaching": c.tanggal_coaching or "-",
                "Status": c.status
            }
            for c in coachings
            if not search_c or search_c.lower() in c.nama.lower() or search_c in c.employee_nik or (c.superior_nama and search_c.lower() in c.superior_nama.lower())
        ]
        st.dataframe(pd.DataFrame(c_rows), use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Coaching untuk periode ini.")

# ----------------- 3. PERFORMANCE APPRAISAL -----------------
elif menu == "📊 Performance Appraisal":
    st.markdown('<div class="main-header">📊 Performance Appraisal</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">Evaluasi Penilaian Kinerja Karyawan — Periode Tahun {sel_year} TW {sel_tw}</div>', unsafe_allow_html=True)
    
    appraisals = db.query(PerformanceAppraisal).filter(PerformanceAppraisal.period_id == period_id).all()
    total = len(appraisals)
    
    approved = sum(1 for a in appraisals if a.status.lower() == 'approved')
    waiting = sum(1 for a in appraisals if 'wait' in a.status.lower())
    declined = sum(1 for a in appraisals if 'decline' in a.status.lower() or 'tolak' in a.status.lower())
    belum = sum(1 for a in appraisals if 'belum' in a.status.lower() or 'not' in a.status.lower())
    
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Karyawan", f"{total:,}")
    c2.metric("Approved", f"{approved:,}", f"{(approved/total*100 if total else 0):.1f}%")
    c3.metric("Waiting Approval", f"{waiting:,}", f"{(waiting/total*100 if total else 0):.1f}%")
    c4.metric("Declined", f"{declined:,}", f"{(declined/total*100 if total else 0):.1f}%")
    c5.metric("Belum Mengajukan", f"{belum:,}", f"{(belum/total*100 if total else 0):.1f}%")
    
    st.markdown("---")
    
    if total > 0:
        col_a1, col_a2 = st.columns([1, 1])
        with col_a1:
            st.subheader("Distribusi Status Appraisal")
            fig = px.pie(
                values=[approved, waiting, declined, belum],
                names=['Approved', 'Waiting Approval', 'Declined', 'Belum Mengajukan'],
                color_discrete_sequence=['#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
                hole=0.6
            )
            fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=280)
            st.plotly_chart(fig, use_container_width=True)
            
        with col_a2:
            st.subheader("Distribusi Skor Kinerja (Score Buckets)")
            scores = [float(a.total_score) for a in appraisals if a.total_score is not None]
            b_u85 = sum(1 for s in scores if s < 85)
            b_85_95 = sum(1 for s in scores if 85 <= s <= 95)
            b_96_100 = sum(1 for s in scores if 95 < s <= 100)
            b_a100 = sum(1 for s in scores if s > 100)
            
            fig_bar = px.bar(
                x=['< 85', '85 - 95', '96 - 100', '> 100'],
                y=[b_u85, b_85_95, b_96_100, b_a100],
                color=['< 85', '85 - 95', '96 - 100', '> 100'],
                color_discrete_sequence=['#ef4444', '#f59e0b', '#0ea5e9', '#10b981'],
                labels={'x': 'Rentang Nilai', 'y': 'Jumlah Karyawan'}
            )
            fig_bar.update_layout(showlegend=False, margin=dict(t=10, b=10, l=10, r=10), height=280)
            st.plotly_chart(fig_bar, use_container_width=True)
            
        st.subheader("Rata-rata Skor Penilaian per Departemen")
        dept_scores = []
        for d in set(a.departemen for a in appraisals if a.departemen):
            d_items = [a for a in appraisals if a.departemen == d and a.total_score is not None]
            if d_items:
                avg_sc = sum(float(a.total_score) for a in d_items) / len(d_items)
                dept_scores.append({
                    "Departemen": d,
                    "Jml Ternilai": len(d_items),
                    "Rata-rata Skor": round(avg_sc, 2)
                })
        st.dataframe(pd.DataFrame(dept_scores).sort_values(by="Rata-rata Skor", ascending=False), use_container_width=True, hide_index=True)
        
        st.subheader("Daftar Detail Penilaian Karyawan")
        search_a = st.text_input("🔍 Cari Karyawan atau NIK", "")
        a_rows = [
            {
                "NIK": a.employee_nik,
                "Nama": a.nama,
                "Departemen": a.departemen or "-",
                "Status": a.status,
                "Tgl Pengajuan": a.submitted_date or "-",
                "Total Skor": float(a.total_score) if a.total_score is not None else "-"
            }
            for a in appraisals
            if not search_a or search_a.lower() in a.nama.lower() or search_a in a.employee_nik
        ]
        st.dataframe(pd.DataFrame(a_rows), use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Appraisal untuk periode ini.")

# ----------------- 4. PERFORMANCE REVIEW 360 -----------------
elif menu == "🧭 Performance Review (360)":
    st.markdown('<div class="main-header">🧭 Performance Review (360)</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">Monitoring Evaluasi Umpan Balik 360 Derajat — Periode Tahun {sel_year} TW {sel_tw}</div>', unsafe_allow_html=True)
    
    reviews = db.query(PerformanceReview360).filter(PerformanceReview360.period_id == period_id).all()
    total = len(reviews)
    
    all_done = sum(1 for r in reviews if r.status == 'All Done')
    almost = sum(1 for r in reviews if r.status == 'Almost Done')
    ny_done = sum(1 for r in reviews if r.status == 'NY Done')
    ny_submit = sum(1 for r in reviews if r.status == 'NY Submitted')
    
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Karyawan", f"{total:,}")
    c2.metric("All Done", f"{all_done:,}", f"{(all_done/total*100 if total else 0):.1f}%")
    c3.metric("Almost Done", f"{almost:,}", f"{(almost/total*100 if total else 0):.1f}%")
    c4.metric("NY Done", f"{ny_done:,}", f"{(ny_done/total*100 if total else 0):.1f}%")
    c5.metric("NY Submitted", f"{ny_submit:,}", f"{(ny_submit/total*100 if total else 0):.1f}%")
    
    st.markdown("---")
    
    if total > 0:
        st.subheader("Daftar Penilaian 360 Karyawan")
        search_r = st.text_input("🔍 Cari Karyawan atau NIK", "")
        r_rows = [
            {
                "NIK": r.employee_nik,
                "Nama": r.nama,
                "Departemen": r.departemen or "-",
                "Atasan": r.atasan_assessed or "-",
                "Rekan": r.rekan_assessed or "-",
                "Bawahan": r.bawahan_assessed or "-",
                "Pribadi": r.pribadi_assessed or "-",
                "Total Dinilai": r.total_assessed or "-",
                "% Selesai": f"{float(r.total_pct):.1f}%" if r.total_pct else "-",
                "Status": r.status
            }
            for r in reviews
            if not search_r or search_r.lower() in r.nama.lower() or search_r in r.employee_nik
        ]
        st.dataframe(pd.DataFrame(r_rows), use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Review 360 untuk periode ini.")

# ----------------- 5. OVERVIEW MASTER KARYAWAN -----------------
elif menu == "📈 Overview Master Karyawan":
    st.markdown('<div class="main-header">📈 Overview Master Data Karyawan</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Visualisasi & Struktur Master Data Karyawan Aktif PT Petrokimia Gresik</div>', unsafe_allow_html=True)
    
    total_m = db.query(EmployeeMaster).count()
    aktif = db.query(EmployeeMaster).filter(EmployeeMaster.kategori == 'AKTIF').count()
    pkwt = db.query(EmployeeMaster).filter(EmployeeMaster.kategori == 'PKWT').count()
    purna = db.query(EmployeeMaster).filter(EmployeeMaster.kategori == 'PURNA').count()
    pi = db.query(EmployeeMaster).filter(EmployeeMaster.kategori == 'PI').count()
    
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Master", f"{total_m:,}")
    c2.metric("Karyawan Aktif", f"{aktif:,}")
    c3.metric("PKWT", f"{pkwt:,}")
    c4.metric("Purna Tugas", f"{purna:,}")
    c5.metric("Perbantuan (PI)", f"{pi:,}")
    
    st.markdown("---")
    
    col_m1, col_m2 = st.columns([1, 2])
    with col_m1:
        st.subheader("Kategori Karyawan")
        fig_m = px.pie(
            values=[aktif, pkwt, purna, pi],
            names=['Aktif', 'PKWT', 'Purna Tugas', 'PI'],
            color_discrete_sequence=['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6'],
            hole=0.5
        )
        st.plotly_chart(fig_m, use_container_width=True)
        
    with col_m2:
        st.subheader("Distribusi Per Kompartemen")
        komp_counts = db.query(EmployeeMaster.kompartemen, func.count(EmployeeMaster.id)).group_by(EmployeeMaster.kompartemen).order_by(func.count(EmployeeMaster.id).desc()).all()
        df_komp = pd.DataFrame([{"Kompartemen": k or "Lainnya", "Jumlah": cnt} for k, cnt in komp_counts if cnt > 10])
        fig_bar = px.bar(df_komp, x="Jumlah", y="Kompartemen", orientation='h', color="Jumlah", color_continuous_scale="Viridis")
        fig_bar.update_layout(yaxis=dict(autorange="reversed"), height=350)
        st.plotly_chart(fig_bar, use_container_width=True)

# ----------------- 6. DATA PERLU REVIEW -----------------
elif menu == "⚠️ Data Perlu Review":
    st.markdown('<div class="main-header">⚠️ Data Perlu Review (Orphan Rows)</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Daftar baris laporan kinerja yang NIK-nya tidak ditemukan pada Master Data Karyawan Aktif</div>', unsafe_allow_html=True)
    
    orphans = db.query(UploadOrphanRow, Upload.jenis_file).join(Upload, UploadOrphanRow.upload_id == Upload.id).all()
    
    # Filter module
    mod_filter = st.selectbox("Filter Modul", ["Semua Modul", "KPI Planning", "Performance Coaching", "Performance Appraisal", "Review 360"])
    
    key_map = {
        "KPI Planning": "kpi_planning",
        "Performance Coaching": "coaching",
        "Performance Appraisal": "appraisal",
        "Review 360": "review360"
    }
    
    filtered_orphans = [
        o for o, jf in orphans
        if mod_filter == "Semua Modul" or jf == key_map.get(mod_filter)
    ]
    
    st.metric("Total Data Perlu Review", len(filtered_orphans))
    
    if filtered_orphans:
        orphan_rows = [
            {
                "No": idx + 1,
                "Modul": o.upload.jenis_file if o.upload else "-",
                "Baris": o.row_number or "-",
                "NIK Tertera": o.nik or "-",
                "Nama Tertera": o.nama or "-",
                "Departemen": o.departemen or "-",
                "Data Mentah": o.raw_data or "-"
            }
            for idx, o in enumerate(filtered_orphans)
        ]
        st.dataframe(pd.DataFrame(orphan_rows), use_container_width=True, hide_index=True)
    else:
        st.success("Tidak ada data orphan pada filter ini! Semua baris cocok dengan Master Data.")

# ----------------- 7. RIWAYAT AKTIVITAS -----------------
elif menu == "📜 Riwayat Aktivitas":
    st.markdown('<div class="main-header">📜 Riwayat Aktivitas & Sinkronisasi</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Log historis berkas unggahan dan aktivitas pengelolaan data sistem</div>', unsafe_allow_html=True)
    
    uploads = db.query(Upload).order_by(Upload.id.desc()).limit(15).all()
    
    u_rows = [
        {
            "No": idx + 1,
            "Modul": u.jenis_file,
            "Keterangan / Berkas": u.filename,
            "Waktu": u.uploaded_at.strftime("%d %b %Y, %H:%M WIB") if u.uploaded_at else "-",
            "Operator": u.uploaded_by or "Admin",
            "Baris Sukses": f"{u.row_count} baris" if not "Hapus" in u.filename else "Data Dihapus",
            "Orphan (Review)": u.orphan_row_count
        }
        for idx, u in enumerate(uploads)
    ]
    st.dataframe(pd.DataFrame(u_rows), use_container_width=True, hide_index=True)

db.close()
