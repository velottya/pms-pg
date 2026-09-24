import os
import sys
import json
import sqlite3
import datetime
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# Configure Streamlit page
st.set_page_config(
    page_title="PMS — PT Petrokimia Gresik",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
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
        padding: 14px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
</style>
""", unsafe_allow_html=True)

# Database Connection Helper
def get_db_connection():
    db_url = None
    try:
        if "DATABASE_URL" in st.secrets:
            db_url = st.secrets["DATABASE_URL"]
    except Exception:
        pass
    
    if not db_url:
        db_url = os.environ.get("DATABASE_URL")
        
    if db_url and ("postgresql" in db_url or "postgres" in db_url) and "localhost" not in db_url:
        try:
            from sqlalchemy import create_engine
            engine = create_engine(db_url, pool_pre_ping=True)
            return engine
        except Exception:
            pass

    # Default to local SQLite pms.db
    sqlite_path = os.path.join(os.path.dirname(__file__), "pms.db")
    if not os.path.exists(sqlite_path):
        sqlite_path = os.path.join(os.path.dirname(__file__), "backend", "pms.db")
    
    return sqlite3.connect(sqlite_path, check_same_thread=False)

conn = get_db_connection()

def query_df(sql, params=None):
    try:
        if isinstance(conn, sqlite3.Connection):
            return pd.read_sql_query(sql, conn, params=params)
        else:
            return pd.read_sql_query(sql, conn, params=params)
    except Exception as e:
        st.error(f"Error querying database: {e}")
        return pd.DataFrame()

# ----------------- SIDEBAR -----------------
with st.sidebar:
    if os.path.exists("logo-pg.jpg"):
        st.image("logo-pg.jpg", use_container_width=True)
    elif os.path.exists("frontend/public/logo-pg.jpg"):
        st.image("frontend/public/logo-pg.jpg", use_container_width=True)
    else:
        st.title("🏢 PMS Petrokimia")
        
    st.markdown("### **Performance Management**")
    st.caption("PT Petrokimia Gresik Tbk")
    st.markdown("---")
    
    # Filter Periode
    col_yr, col_tw = st.columns(2)
    with col_yr:
        sel_year = st.selectbox("Tahun", [2026, 2027], index=0)
    with col_tw:
        sel_tw = st.selectbox("Triwulan", [1, 2, 3, 4], index=1)
        
    st.markdown("---")
    
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
    st.caption(f"Periode Aktif: **Tahun {sel_year} TW {sel_tw}**")

# Get Period ID
df_period = query_df("SELECT id FROM periods WHERE tahun = ? AND triwulan = ?", (sel_year, sel_tw))
if not df_period.empty:
    period_id = int(df_period.iloc[0]['id'])
else:
    period_id = 2 # Fallback to 2026 TW2

# ----------------- 1. PERFORMANCE PLANNING -----------------
if menu == "🎯 Performance Planning":
    st.markdown('<div class="main-header">🎯 Performance Planning</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">Monitoring Perencanaan KPI Karyawan & Unit Kerja — Periode Tahun {sel_year} TW {sel_tw}</div>', unsafe_allow_html=True)
    
    df_plan = query_df("SELECT * FROM performance_planning WHERE period_id = ?", (period_id,))
    total = len(df_plan)
    
    if total > 0:
        approved = int((df_plan['status_individu'].str.lower() == 'approved').sum())
        waiting = int(df_plan['status_individu'].str.lower().str.contains('wait').sum())
        drafted = int(df_plan['status_individu'].str.lower().str.contains('draft').sum())
        belum = int(df_plan['status_individu'].str.lower().str.contains('belum|not').sum())
    else:
        approved = waiting = drafted = belum = 0
        
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
            st.subheader("Distribusi Status KPI")
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
            df_plan['departemen_clean'] = df_plan['departemen'].fillna('Tanpa Departemen')
            dept_summary = df_plan.groupby('departemen_clean').agg(
                Total=('id', 'count'),
                Approved=('status_individu', lambda s: (s.str.lower() == 'approved').sum()),
                Drafted=('status_individu', lambda s: s.str.lower().str.contains('draft').sum()),
                Belum=('status_individu', lambda s: s.str.lower().str.contains('belum|not').sum())
            ).reset_index()
            dept_summary['% Approved'] = (dept_summary['Approved'] / dept_summary['Total'] * 100).round(1)
            dept_summary = dept_summary.sort_values(by='% Approved', ascending=False)
            st.dataframe(dept_summary, use_container_width=True, hide_index=True)
            
        st.subheader("Daftar Detail Karyawan")
        search_p = st.text_input("🔍 Cari Nama atau NIK Karyawan", "")
        if search_p:
            df_display = df_plan[df_plan['nama'].str.contains(search_p, case=False, na=False) | df_plan['employee_nik'].str.contains(search_p, na=False)]
        else:
            df_display = df_plan
            
        out_table = df_display[['employee_nik', 'nama', 'departemen', 'status_individu', 'submitted_date', 'approved_date']].copy()
        out_table.columns = ['NIK', 'Nama', 'Departemen', 'Status', 'Tgl Pengajuan', 'Tgl Disetujui']
        st.dataframe(out_table, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Planning untuk periode ini.")

# ----------------- 2. PERFORMANCE COACHING -----------------
elif menu == "👥 Performance Coaching":
    st.markdown('<div class="main-header">👥 Performance Coaching</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">Monitoring Coaching & Bimbingan Superior — Periode Tahun {sel_year} TW {sel_tw}</div>', unsafe_allow_html=True)
    
    df_coach = query_df("SELECT * FROM performance_coaching WHERE period_id = ?", (period_id,))
    total = len(df_coach)
    
    if total > 0:
        approved = int((df_coach['status'].str.lower() == 'approved').sum())
        drafted = int(df_coach['status'].str.lower().str.contains('draft').sum())
        ny = int(df_coach['status'].str.lower().str.contains('not|belum').sum())
        waiting = total - approved - drafted - ny
    else:
        approved = drafted = ny = waiting = 0
        
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Karyawan", f"{total:,}")
    c2.metric("Approved", f"{approved:,}", f"{(approved/total*100 if total else 0):.1f}%")
    c3.metric("Drafted", f"{drafted:,}", f"{(drafted/total*100 if total else 0):.1f}%")
    c4.metric("Not Yet Submitted", f"{ny:,}", f"{(ny/total*100 if total else 0):.1f}%")
    
    st.markdown("---")
    
    if total > 0:
        col_c1, col_c2 = st.columns([1, 2])
        with col_c1:
            st.subheader("Distribusi Status Coaching")
            fig = px.pie(
                values=[approved, drafted, ny],
                names=['Approved', 'Drafted', 'Not Yet Submitted'],
                color_discrete_sequence=['#10b981', '#0ea5e9', '#ef4444'],
                hole=0.6
            )
            fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=300)
            st.plotly_chart(fig, use_container_width=True)
            
        with col_c2:
            st.subheader("Ringkasan Per Departemen")
            df_coach['departemen_clean'] = df_coach['departemen'].fillna('Tanpa Departemen')
            c_dept_summary = df_coach.groupby('departemen_clean').agg(
                Total=('id', 'count'),
                Approved=('status', lambda s: (s.str.lower() == 'approved').sum()),
                Drafted=('status', lambda s: s.str.lower().str.contains('draft').sum()),
                Not_Submitted=('status', lambda s: s.str.lower().str.contains('not|belum').sum())
            ).reset_index()
            c_dept_summary['% Approved'] = (c_dept_summary['Approved'] / c_dept_summary['Total'] * 100).round(1)
            c_dept_summary = c_dept_summary.sort_values(by='% Approved', ascending=False)
            st.dataframe(c_dept_summary, use_container_width=True, hide_index=True)
            
        st.subheader("Daftar Detail Coaching Karyawan & Superior")
        search_c = st.text_input("🔍 Cari Karyawan, NIK, atau Atasan", "")
        if search_c:
            df_c_display = df_coach[
                df_coach['nama'].str.contains(search_c, case=False, na=False) |
                df_coach['employee_nik'].str.contains(search_c, na=False) |
                df_coach['superior_nama'].str.contains(search_c, case=False, na=False)
            ]
        else:
            df_c_display = df_coach
            
        out_c = df_c_display[['employee_nik', 'nama', 'departemen', 'superior_nama', 'superior_nik', 'jumlah_coaching', 'status']].copy()
        out_c.columns = ['NIK', 'Nama Karyawan', 'Departemen', 'Nama Atasan', 'NIK Atasan', 'Jml Coaching', 'Status']
        st.dataframe(out_c, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Coaching untuk periode ini.")

# ----------------- 3. PERFORMANCE APPRAISAL -----------------
elif menu == "📊 Performance Appraisal":
    st.markdown('<div class="main-header">📊 Performance Appraisal</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">Evaluasi Penilaian Kinerja Karyawan — Periode Tahun {sel_year} TW {sel_tw}</div>', unsafe_allow_html=True)
    
    df_app = query_df("SELECT * FROM performance_appraisal WHERE period_id = ?", (period_id,))
    total = len(df_app)
    
    if total > 0:
        approved = int((df_app['status'].str.lower() == 'approved').sum())
        waiting = int(df_app['status'].str.lower().str.contains('wait').sum())
        declined = int(df_app['status'].str.lower().str.contains('decline|tolak').sum())
        belum = int(df_app['status'].str.lower().str.contains('belum|not|ny').sum())
    else:
        approved = waiting = declined = belum = 0
        
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
            scores = pd.to_numeric(df_app['total_score'], errors='coerce').dropna()
            b_u85 = int((scores < 85).sum())
            b_85_95 = int(((scores >= 85) & (scores <= 95)).sum())
            b_96_100 = int(((scores > 95) & (scores <= 100)).sum())
            b_a100 = int((scores > 100).sum())
            
            fig_bar = px.bar(
                x=['< 85', '85 - 95', '96 - 100', '> 100'],
                y=[b_u85, b_85_95, b_96_100, b_a100],
                color=['< 85', '85 - 95', '96 - 100', '> 100'],
                color_discrete_sequence=['#ef4444', '#f59e0b', '#0ea5e9', '#10b981'],
                labels={'x': 'Rentang Nilai', 'y': 'Jumlah Karyawan'}
            )
            fig_bar.update_layout(showlegend=False, margin=dict(t=10, b=10, l=10, r=10), height=280)
            st.plotly_chart(fig_bar, use_container_width=True)
            
        st.subheader("Rata-rata Skor per Departemen")
        df_app['score_num'] = pd.to_numeric(df_app['total_score'], errors='coerce')
        dept_app_summary = df_app[df_app['score_num'].notna()].groupby('departemen').agg(
            Jml_Ternilai=('id', 'count'),
            Rata_Rata_Skor=('score_num', 'mean')
        ).reset_index()
        dept_app_summary['Rata_Rata_Skor'] = dept_app_summary['Rata_Rata_Skor'].round(2)
        dept_app_summary = dept_app_summary.sort_values(by='Rata_Rata_Skor', ascending=False)
        st.dataframe(dept_app_summary, use_container_width=True, hide_index=True)
        
        st.subheader("Daftar Detail Penilaian Karyawan")
        search_a = st.text_input("🔍 Cari Karyawan atau NIK", "")
        if search_a:
            df_a_display = df_app[df_app['nama'].str.contains(search_a, case=False, na=False) | df_app['employee_nik'].str.contains(search_a, na=False)]
        else:
            df_a_display = df_app
            
        out_a = df_a_display[['employee_nik', 'nama', 'departemen', 'status', 'submitted_date', 'total_score']].copy()
        out_a.columns = ['NIK', 'Nama Karyawan', 'Departemen', 'Status', 'Tgl Pengajuan', 'Total Skor']
        st.dataframe(out_a, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Appraisal untuk periode ini.")

# ----------------- 4. PERFORMANCE REVIEW 360 -----------------
elif menu == "🧭 Performance Review (360)":
    st.markdown('<div class="main-header">🧭 Performance Review (360)</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">Monitoring Evaluasi Umpan Balik 360 Derajat — Periode Tahun {sel_year} TW {sel_tw}</div>', unsafe_allow_html=True)
    
    df_rev = query_df("SELECT * FROM performance_review360 WHERE period_id = ?", (period_id,))
    total = len(df_rev)
    
    all_done = int((df_rev['status'] == 'All Done').sum()) if total else 0
    almost = int((df_rev['status'] == 'Almost Done').sum()) if total else 0
    ny = total - all_done - almost if total else 0
    
    c1, c2, c3 = st.columns(3)
    c1.metric("Total Karyawan", f"{total:,}")
    c2.metric("All Done (100% Selesai)", f"{all_done:,}", f"{(all_done/total*100 if total else 0):.1f}%")
    c3.metric("Dalam Proses / NY Done", f"{ny:,}", f"{(ny/total*100 if total else 0):.1f}%")
    
    st.markdown("---")
    
    if total > 0:
        st.subheader("Daftar Penilaian 360 Karyawan")
        search_r = st.text_input("🔍 Cari Karyawan atau NIK", "")
        if search_r:
            df_r_display = df_rev[df_rev['nama'].str.contains(search_r, case=False, na=False) | df_rev['employee_nik'].str.contains(search_r, na=False)]
        else:
            df_r_display = df_rev
            
        out_r = df_r_display[['employee_nik', 'nama', 'departemen', 'atasan_assessed', 'rekan_assessed', 'bawahan_assessed', 'pribadi_assessed', 'total_assessed', 'total_pct', 'status']].copy()
        out_r.columns = ['NIK', 'Nama', 'Departemen', 'Atasan', 'Rekan', 'Bawahan', 'Pribadi', 'Total Assessed', '% Selesai', 'Status']
        st.dataframe(out_r, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Review 360 untuk periode ini.")

# ----------------- 5. OVERVIEW MASTER KARYAWAN -----------------
elif menu == "📈 Overview Master Karyawan":
    st.markdown('<div class="main-header">📈 Overview Master Data Karyawan</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Visualisasi & Struktur Master Data Karyawan Aktif PT Petrokimia Gresik</div>', unsafe_allow_html=True)
    
    df_m = query_df("SELECT * FROM employees_master")
    total_m = len(df_m)
    
    aktif = int((df_m['kategori'] == 'AKTIF').sum())
    pkwt = int((df_m['kategori'] == 'PKWT').sum())
    purna = int((df_m['kategori'] == 'PURNA').sum())
    pi = int((df_m['kategori'] == 'PI').sum())
    
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
        fig_m.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=320)
        st.plotly_chart(fig_m, use_container_width=True)
        
    with col_m2:
        st.subheader("Distribusi Per Kompartemen Teratas")
        komp_df = df_m['kompartemen'].fillna('Lainnya').value_counts().reset_index()
        komp_df.columns = ['Kompartemen', 'Jumlah']
        fig_bar = px.bar(komp_df.head(10), x="Jumlah", y="Kompartemen", orientation='h', color="Jumlah", color_continuous_scale="Viridis")
        fig_bar.update_layout(yaxis=dict(autorange="reversed"), margin=dict(t=10, b=10, l=10, r=10), height=320)
        st.plotly_chart(fig_bar, use_container_width=True)

# ----------------- 6. DATA PERLU REVIEW -----------------
elif menu == "⚠️ Data Perlu Review":
    st.markdown('<div class="main-header">⚠️ Data Perlu Review (Orphan Rows)</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Daftar baris laporan kinerja yang NIK-nya tidak ditemukan pada Master Data Karyawan Aktif</div>', unsafe_allow_html=True)
    
    df_orphans = query_df("""
        SELECT o.id, o.row_number, o.nik, o.nama, o.departemen, u.jenis_file, p.triwulan, p.tahun
        FROM upload_orphan_rows o
        JOIN uploads u ON o.upload_id = u.id
        LEFT JOIN periods p ON u.period_id = p.id
        ORDER BY o.id DESC
    """)
    
    col_f1, col_f2 = st.columns([1, 1])
    with col_f1:
        mod_sel = st.selectbox("Filter Modul", ["Semua Modul", "kpi_planning", "coaching", "appraisal", "review360"])
    with col_f2:
        tw_sel = st.selectbox("Filter TW", ["Semua TW", "1", "2", "3", "4"])
        
    df_f = df_orphans.copy()
    if mod_sel != "Semua Modul":
        df_f = df_f[df_f['jenis_file'] == mod_sel]
    if tw_sel != "Semua TW":
        df_f = df_f[df_f['triwulan'] == int(tw_sel)]
        
    st.metric("Total Data Perlu Review", len(df_f))
    
    if len(df_f) > 0:
        df_out = df_f[['jenis_file', 'triwulan', 'tahun', 'row_number', 'nik', 'nama', 'departemen']].copy()
        df_out.columns = ['Modul', 'TW', 'Tahun', 'Baris Excel', 'NIK Tertera', 'Nama Tertera', 'Departemen Tertera']
        st.dataframe(df_out, use_container_width=True, hide_index=True)
    else:
        st.success("Bagus! Tidak ada data orphan yang perlu direview pada filter ini.")

# ----------------- 7. RIWAYAT AKTIVITAS -----------------
elif menu == "📜 Riwayat Aktivitas":
    st.markdown('<div class="main-header">📜 Riwayat Aktivitas & Sinkronisasi</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Log historis aktivitas unggah, sinkronisasi, dan pengelolaan data kinerja</div>', unsafe_allow_html=True)
    
    df_u = query_df("SELECT * FROM uploads ORDER BY id DESC LIMIT 15")
    
    if len(df_u) > 0:
        df_u_show = df_u[['jenis_file', 'filename', 'uploaded_at', 'uploaded_by', 'row_count', 'orphan_row_count']].copy()
        df_u_show.columns = ['Modul / Jenis', 'Keterangan / Berkas', 'Waktu Aktivitas', 'Operator', 'Baris Valid', 'Orphan (Review)']
        st.dataframe(df_u_show, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada riwayat aktivitas tercatat.")

if isinstance(conn, sqlite3.Connection):
    conn.close()
