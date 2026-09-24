import os
import sys
import json
import sqlite3
import datetime
import pandas as pd
import streamlit as st
import plotly.graph_objects as go

# Configure Streamlit page
st.set_page_config(
    page_title="PMS Petrokimia Gresik",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom High-Fidelity CSS matching React UI
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .stApp {
        background-color: #0f172a;
        color: #f8fafc;
    }
    
    /* Top Header */
    .top-header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 1rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .page-title {
        font-size: 1.5rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.025em;
        margin: 0;
    }
    .page-desc {
        font-size: 0.8rem;
        color: #94a3b8;
        margin-top: 0.2rem;
    }
    .period-badge {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #38bdf8;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    /* KPI Summary Cards Grid */
    .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .kpi-card {
        background: #1e293b;
        border-radius: 12px;
        padding: 1rem 1.1rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        position: relative;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .kpi-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.2);
    }
    .kpi-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    .kpi-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .kpi-value {
        font-size: 1.65rem;
        font-weight: 900;
        color: #ffffff;
        letter-spacing: -0.02em;
        line-height: 1.1;
    }
    .kpi-footer {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 0.5rem;
        font-size: 0.75rem;
    }
    .kpi-pct {
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
    }
    
    /* Variant Styles */
    .kpi-default { border-left: 4px solid #64748b; }
    .kpi-success { border-left: 4px solid #10b981; }
    .kpi-success .kpi-value { color: #34d399; }
    .kpi-success .kpi-pct { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    
    .kpi-warning { border-left: 4px solid #f59e0b; }
    .kpi-warning .kpi-value { color: #fbbf24; }
    .kpi-warning .kpi-pct { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    
    .kpi-info { border-left: 4px solid #0ea5e9; }
    .kpi-info .kpi-value { color: #38bdf8; }
    .kpi-info .kpi-pct { background: rgba(14, 165, 233, 0.15); color: #38bdf8; }
    
    .kpi-danger { border-left: 4px solid #f43f5e; }
    .kpi-danger .kpi-value { color: #fb7185; }
    .kpi-danger .kpi-pct { background: rgba(244, 63, 94, 0.15); color: #fb7185; }

    .kpi-purple { border-left: 4px solid #8b5cf6; }
    .kpi-purple .kpi-value { color: #a78bfa; }
    .kpi-purple .kpi-pct { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }

    /* Custom Table Card */
    .custom-card {
        background: #1e293b;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 1.2rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .custom-card-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 0.25rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .custom-card-subtitle {
        font-size: 0.75rem;
        color: #94a3b8;
        margin-bottom: 1rem;
    }

    /* Status Badges */
    .badge-appr { background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 600; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-wait { background: rgba(245, 158, 11, 0.15); color: #fbbf24; font-weight: 600; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-draft { background: rgba(14, 165, 233, 0.15); color: #38bdf8; font-weight: 600; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; border: 1px solid rgba(14, 165, 233, 0.3); }
    .badge-decl { background: rgba(244, 63, 94, 0.15); color: #fb7185; font-weight: 600; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; border: 1px solid rgba(244, 63, 94, 0.3); }
    .badge-ny { background: rgba(239, 68, 68, 0.15); color: #f87171; font-weight: 600; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; border: 1px solid rgba(239, 68, 68, 0.3); }
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
            return create_engine(db_url, pool_pre_ping=True)
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
        return pd.read_sql_query(sql, conn, params=params)
    except Exception as e:
        st.error(f"Error querying database: {e}")
        return pd.DataFrame()

# ----------------- SIDEBAR -----------------
with st.sidebar:
    st.markdown("""
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0;">
            <div style="font-size: 1.6rem;">🏢</div>
            <div>
                <div style="font-weight: 800; font-size: 1rem; color: #ffffff;">PMS Petrokimia</div>
                <div style="font-size: 0.7rem; color: #94a3b8;">PT Petrokimia Gresik Tbk</div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    st.markdown("---")
    
    # Filter Periode
    st.markdown("**Periode Evaluasi**")
    col_yr, col_tw = st.columns(2)
    with col_yr:
        sel_year = st.selectbox("Tahun", [2026, 2027], index=0)
    with col_tw:
        sel_tw = st.selectbox("Triwulan", [1, 2, 3, 4], index=1)
        
    st.markdown("---")
    
    st.markdown("**Modul Kinerja**")
    menu = st.radio(
        "Pilih Modul",
        [
            "Performance Planning",
            "Performance Coaching",
            "Performance Appraisal",
            "Performance Review (360)",
            "Overview Master Karyawan",
            "Data Perlu Review",
            "Riwayat Aktivitas"
        ],
        label_visibility="collapsed"
    )
    
    st.markdown("---")
    st.markdown(f"""
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); padding: 10px; border-radius: 8px; font-size: 0.75rem; color: #94a3b8;">
            <div>Target Aktif: <strong style="color: #38bdf8;">Tahun {sel_year} TW {sel_tw}</strong></div>
            <div style="margin-top: 4px;">Sistem Sinkron: <strong style="color: #34d399;">Online</strong></div>
        </div>
    """, unsafe_allow_html=True)

# Get Period ID
df_period = query_df("SELECT id FROM periods WHERE tahun = ? AND triwulan = ?", (sel_year, sel_tw))
if not df_period.empty:
    period_id = int(df_period.iloc[0]['id'])
else:
    period_id = 2

# Helper for Donut Chart with Center Text
def create_styled_donut(values, labels, colors, center_pct, center_label, center_sub):
    fig = go.Figure(data=[go.Pie(
        labels=labels,
        values=values,
        hole=0.72,
        marker=dict(colors=colors, line=dict(color='#0f172a', width=2)),
        textinfo='none',
        hoverinfo='label+value+percent'
    )])
    
    fig.update_layout(
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="top",
            y=-0.05,
            xanchor="center",
            x=0.5,
            font=dict(size=11, color="#94a3b8")
        ),
        margin=dict(t=10, b=30, l=10, r=10),
        height=320,
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        annotations=[
            dict(
                text=f"<b style='font-size: 24px; color: #ffffff;'>{center_pct}%</b><br><span style='font-size: 11px; font-weight: 700; color: #34d399;'>{center_label}</span><br><span style='font-size: 10px; color: #94a3b8;'>{center_sub}</span>",
                x=0.5, y=0.5,
                font_size=12,
                showarrow=False
            )
        ]
    )
    return fig

# ----------------- 1. PERFORMANCE PLANNING -----------------
if menu == "Performance Planning":
    st.markdown(f"""
        <div class="top-header-container">
            <div>
                <h1 class="page-title">Performance Planning</h1>
                <div class="page-desc">Status perencanaan KPI perorangan & unit kerja (Tahun {sel_year} TW {sel_tw})</div>
            </div>
            <div class="period-badge">
                <span>🗓️</span> Target Sinkron: {sel_year} - TW {sel_tw}
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    df_plan = query_df("SELECT * FROM performance_planning WHERE period_id = ?", (period_id,))
    total = len(df_plan)
    
    if total > 0:
        approved = int((df_plan['status_individu'].str.lower() == 'approved').sum())
        waiting = int(df_plan['status_individu'].str.lower().str.contains('wait').sum())
        drafted = int(df_plan['status_individu'].str.lower().str.contains('draft').sum())
        belum = int(df_plan['status_individu'].str.lower().str.contains('belum|not').sum())
        submitted = approved + waiting + drafted
        submitted_pct = round(submitted / total * 100, 1)
        
        depts_count = df_plan['departemen'].nunique()
    else:
        approved = waiting = drafted = belum = submitted = depts_count = 0
        submitted_pct = 0.0

    # 5 KPI Cards
    st.markdown(f"""
        <div class="kpi-grid">
            <div class="kpi-card kpi-default">
                <div class="kpi-header"><span class="kpi-label">Total Karyawan</span></div>
                <div class="kpi-value">{total:,}</div>
                <div class="kpi-footer"><span style="color: #94a3b8;">{depts_count} Departemen</span></div>
            </div>
            <div class="kpi-card kpi-success">
                <div class="kpi-header"><span class="kpi-label">Approved</span></div>
                <div class="kpi-value">{approved:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(approved/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-warning">
                <div class="kpi-header"><span class="kpi-label">Waiting Approval</span></div>
                <div class="kpi-value">{waiting:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(waiting/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-info">
                <div class="kpi-header"><span class="kpi-label">Drafted</span></div>
                <div class="kpi-value">{drafted:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(drafted/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-danger">
                <div class="kpi-header"><span class="kpi-label">Not Yet Submitted</span></div>
                <div class="kpi-value">{belum:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(belum/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    if total > 0:
        c_chart, c_table = st.columns([1, 2])
        with c_chart:
            st.markdown("""
                <div class="custom-card-title">Overall Planning Status</div>
                <div class="custom-card-subtitle">Distribusi status KPI karyawan</div>
            """, unsafe_allow_html=True)
            fig_plan = create_styled_donut(
                values=[approved, waiting, drafted, belum],
                labels=['Approved', 'Waiting Approval', 'Drafted', 'Not Yet Submitted'],
                colors=['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
                center_pct=f"{submitted_pct}",
                center_label="SUBMITTED",
                center_sub=f"{submitted:,} / {total:,} Karyawan"
            )
            st.plotly_chart(fig_plan, use_container_width=True)
            
        with c_table:
            st.markdown("""
                <div class="custom-card-title">Ringkasan Per Departemen</div>
                <div class="custom-card-subtitle">Performa pengajuan KPI unit kerja</div>
            """, unsafe_allow_html=True)
            df_plan['dept_name'] = df_plan['departemen'].fillna('Tanpa Departemen')
            dept_summary = df_plan.groupby('dept_name').agg(
                Total=('id', 'count'),
                Approved=('status_individu', lambda s: (s.str.lower() == 'approved').sum()),
                Waiting=('status_individu', lambda s: s.str.lower().str.contains('wait').sum()),
                Drafted=('status_individu', lambda s: s.str.lower().str.contains('draft').sum()),
                Belum=('status_individu', lambda s: s.str.lower().str.contains('belum|not').sum())
            ).reset_index()
            dept_summary['% Approved'] = (dept_summary['Approved'] / dept_summary['Total'] * 100).round(1)
            dept_summary = dept_summary.sort_values(by='% Approved', ascending=False)
            st.dataframe(dept_summary, use_container_width=True, hide_index=True)
            
        st.markdown("---")
        st.markdown("""
            <div class="custom-card-title">Daftar Karyawan</div>
            <div class="custom-card-subtitle">Detail status perencanaan KPI per individu</div>
        """, unsafe_allow_html=True)
        search_p = st.text_input("🔍 Cari Karyawan, NIK, atau Departemen", "", placeholder="Ketik nama atau NIK...")
        if search_p:
            df_disp = df_plan[df_plan['nama'].str.contains(search_p, case=False, na=False) | df_plan['employee_nik'].str.contains(search_p, na=False) | df_plan['departemen'].str.contains(search_p, case=False, na=False)]
        else:
            df_disp = df_plan
            
        out_table = df_disp[['employee_nik', 'nama', 'departemen', 'status_individu', 'submitted_date', 'approved_date']].copy()
        out_table.columns = ['NIK', 'Nama Karyawan', 'Departemen', 'Status', 'Tgl Pengajuan', 'Tgl Disetujui']
        st.dataframe(out_table, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Planning untuk periode ini.")

# ----------------- 2. PERFORMANCE COACHING -----------------
elif menu == "Performance Coaching":
    st.markdown(f"""
        <div class="top-header-container">
            <div>
                <h1 class="page-title">Performance Coaching</h1>
                <div class="page-desc">Monitoring bimbingan coaching atasan & bawahan (Tahun {sel_year} TW {sel_tw})</div>
            </div>
            <div class="period-badge">
                <span>🗓️</span> Target Sinkron: {sel_year} - TW {sel_tw}
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    df_coach = query_df("SELECT * FROM performance_coaching WHERE period_id = ?", (period_id,))
    total = len(df_coach)
    
    if total > 0:
        approved = int((df_coach['status'].str.lower() == 'approved').sum())
        drafted = int(df_coach['status'].str.lower().str.contains('draft').sum())
        ny = int(df_coach['status'].str.lower().str.contains('not|belum').sum())
        waiting = total - approved - drafted - ny
        depts_c = df_coach['departemen'].nunique()
    else:
        approved = drafted = ny = waiting = depts_c = 0
        
    st.markdown(f"""
        <div class="kpi-grid">
            <div class="kpi-card kpi-default">
                <div class="kpi-header"><span class="kpi-label">Total Karyawan</span></div>
                <div class="kpi-value">{total:,}</div>
                <div class="kpi-footer"><span style="color: #94a3b8;">{depts_c} Departemen</span></div>
            </div>
            <div class="kpi-card kpi-success">
                <div class="kpi-header"><span class="kpi-label">Approved</span></div>
                <div class="kpi-value">{approved:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(approved/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-info">
                <div class="kpi-header"><span class="kpi-label">Drafted</span></div>
                <div class="kpi-value">{drafted:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(drafted/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-danger">
                <div class="kpi-header"><span class="kpi-label">Not Yet Submitted</span></div>
                <div class="kpi-value">{ny:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(ny/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    if total > 0:
        c_c1, c_c2 = st.columns([1, 2])
        with c_c1:
            st.markdown("""
                <div class="custom-card-title">Distribusi Status Coaching</div>
                <div class="custom-card-subtitle">Persentase persetujuan coaching</div>
            """, unsafe_allow_html=True)
            fig_coach = create_styled_donut(
                values=[approved, drafted, ny],
                labels=['Approved', 'Drafted', 'Not Yet Submitted'],
                colors=['#10b981', '#3b82f6', '#ef4444'],
                center_pct=f"{round(approved/total*100, 1)}",
                center_label="APPROVED",
                center_sub=f"{approved:,} / {total:,} Karyawan"
            )
            st.plotly_chart(fig_coach, use_container_width=True)
            
        with c_c2:
            st.markdown("""
                <div class="custom-card-title">Ringkasan Coaching Per Departemen</div>
                <div class="custom-card-subtitle">Aktivitas coaching unit kerja</div>
            """, unsafe_allow_html=True)
            df_coach['dept_name'] = df_coach['departemen'].fillna('Tanpa Departemen')
            c_dept_summary = df_coach.groupby('dept_name').agg(
                Total=('id', 'count'),
                Approved=('status', lambda s: (s.str.lower() == 'approved').sum()),
                Drafted=('status', lambda s: s.str.lower().str.contains('draft').sum()),
                Not_Submitted=('status', lambda s: s.str.lower().str.contains('not|belum').sum())
            ).reset_index()
            c_dept_summary['% Approved'] = (c_dept_summary['Approved'] / c_dept_summary['Total'] * 100).round(1)
            c_dept_summary = c_dept_summary.sort_values(by='% Approved', ascending=False)
            st.dataframe(c_dept_summary, use_container_width=True, hide_index=True)
            
        st.markdown("---")
        st.markdown("""
            <div class="custom-card-title">Daftar Detail Coaching</div>
            <div class="custom-card-subtitle">Detail bimbingan per karyawan dan atasan langsung</div>
        """, unsafe_allow_html=True)
        search_c = st.text_input("🔍 Cari Karyawan, NIK, atau Atasan", "")
        if search_c:
            df_c_disp = df_coach[df_coach['nama'].str.contains(search_c, case=False, na=False) | df_coach['employee_nik'].str.contains(search_c, na=False) | df_coach['superior_nama'].str.contains(search_c, case=False, na=False)]
        else:
            df_c_disp = df_coach
            
        out_c = df_c_disp[['employee_nik', 'nama', 'departemen', 'superior_nama', 'superior_nik', 'jumlah_coaching', 'status']].copy()
        out_c.columns = ['NIK', 'Nama Karyawan', 'Departemen', 'Nama Atasan', 'NIK Atasan', 'Jml Coaching', 'Status']
        st.dataframe(out_c, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Coaching untuk periode ini.")

# ----------------- 3. PERFORMANCE APPRAISAL -----------------
elif menu == "Performance Appraisal":
    st.markdown(f"""
        <div class="top-header-container">
            <div>
                <h1 class="page-title">Performance Appraisal</h1>
                <div class="page-desc">Evaluasi penilaian kinerja dan distribusi skor karyawan (Tahun {sel_year} TW {sel_tw})</div>
            </div>
            <div class="period-badge">
                <span>🗓️</span> Target Sinkron: {sel_year} - TW {sel_tw}
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    df_app = query_df("SELECT * FROM performance_appraisal WHERE period_id = ?", (period_id,))
    total = len(df_app)
    
    if total > 0:
        approved = int((df_app['status'].str.lower() == 'approved').sum())
        waiting = int(df_app['status'].str.lower().str.contains('wait').sum())
        declined = int(df_app['status'].str.lower().str.contains('decline|tolak').sum())
        belum = int(df_app['status'].str.lower().str.contains('belum|not|ny').sum())
        depts_a = df_app['departemen'].nunique()
    else:
        approved = waiting = declined = belum = depts_a = 0
        
    st.markdown(f"""
        <div class="kpi-grid">
            <div class="kpi-card kpi-default">
                <div class="kpi-header"><span class="kpi-label">Total Karyawan</span></div>
                <div class="kpi-value">{total:,}</div>
                <div class="kpi-footer"><span style="color: #94a3b8;">{depts_a} Departemen</span></div>
            </div>
            <div class="kpi-card kpi-success">
                <div class="kpi-header"><span class="kpi-label">Approved</span></div>
                <div class="kpi-value">{approved:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(approved/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-purple">
                <div class="kpi-header"><span class="kpi-label">Waiting Approval</span></div>
                <div class="kpi-value">{waiting:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(waiting/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-warning">
                <div class="kpi-header"><span class="kpi-label">Declined</span></div>
                <div class="kpi-value">{declined:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(declined/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-danger">
                <div class="kpi-header"><span class="kpi-label">Belum Mengajukan</span></div>
                <div class="kpi-value">{belum:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(belum/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    if total > 0:
        c_a1, c_a2 = st.columns([1, 1])
        with c_a1:
            st.markdown("""
                <div class="custom-card-title">Distribusi Status Appraisal</div>
                <div class="custom-card-subtitle">Komposisi persetujuan penilaian kinerja</div>
            """, unsafe_allow_html=True)
            fig_app = create_styled_donut(
                values=[approved, waiting, declined, belum],
                labels=['Approved', 'Waiting Approval', 'Declined', 'Belum Mengajukan'],
                colors=['#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
                center_pct=f"{round(approved/total*100, 1)}",
                center_label="APPROVED",
                center_sub=f"{approved:,} / {total:,} Karyawan"
            )
            st.plotly_chart(fig_app, use_container_width=True)
            
        with c_a2:
            st.markdown("""
                <div class="custom-card-title">Distribusi Skor Kinerja (Score Buckets)</div>
                <div class="custom-card-subtitle">Sebaran nilai akhir kinerja karyawan</div>
            """, unsafe_allow_html=True)
            scores = pd.to_numeric(df_app['total_score'], errors='coerce').dropna()
            b_u85 = int((scores < 85).sum())
            b_85_95 = int(((scores >= 85) & (scores <= 95)).sum())
            b_96_100 = int(((scores > 95) & (scores <= 100)).sum())
            b_a100 = int((scores > 100).sum())
            
            fig_bar = go.Figure(data=[go.Bar(
                x=['< 85', '85 - 95', '96 - 100', '> 100'],
                y=[b_u85, b_85_95, b_96_100, b_a100],
                marker=dict(color=['#ef4444', '#f59e0b', '#3b82f6', '#10b981'], line=dict(color='#0f172a', width=1)),
                text=[b_u85, b_85_95, b_96_100, b_a100],
                textposition='auto'
            )])
            fig_bar.update_layout(
                margin=dict(t=10, b=30, l=10, r=10),
                height=320,
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)',
                font=dict(color="#94a3b8"),
                yaxis=dict(gridcolor="rgba(255,255,255,0.05)")
            )
            st.plotly_chart(fig_bar, use_container_width=True)
            
        st.markdown("---")
        st.markdown("""
            <div class="custom-card-title">Rata-rata Skor per Departemen</div>
            <div class="custom-card-subtitle">Peringkat pencapaian skor penilaian kinerja unit kerja</div>
        """, unsafe_allow_html=True)
        df_app['score_num'] = pd.to_numeric(df_app['total_score'], errors='coerce')
        dept_app_summary = df_app[df_app['score_num'].notna()].groupby('departemen').agg(
            Jml_Ternilai=('id', 'count'),
            Rata_Rata_Skor=('score_num', 'mean')
        ).reset_index()
        dept_app_summary['Rata_Rata_Skor'] = dept_app_summary['Rata_Rata_Skor'].round(2)
        dept_app_summary = dept_app_summary.sort_values(by='Rata_Rata_Skor', ascending=False)
        st.dataframe(dept_app_summary, use_container_width=True, hide_index=True)
        
        st.markdown("---")
        st.markdown("""
            <div class="custom-card-title">Daftar Detail Penilaian Karyawan</div>
            <div class="custom-card-subtitle">Data nilai evaluasi kinerja per individu</div>
        """, unsafe_allow_html=True)
        search_a = st.text_input("🔍 Cari Karyawan, NIK, atau Departemen", "")
        if search_a:
            df_a_disp = df_app[df_app['nama'].str.contains(search_a, case=False, na=False) | df_app['employee_nik'].str.contains(search_a, na=False) | df_app['departemen'].str.contains(search_a, case=False, na=False)]
        else:
            df_a_disp = df_app
            
        out_a = df_a_disp[['employee_nik', 'nama', 'departemen', 'status', 'submitted_date', 'total_score']].copy()
        out_a.columns = ['NIK', 'Nama Karyawan', 'Departemen', 'Status', 'Tgl Pengajuan', 'Total Skor']
        st.dataframe(out_a, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Performance Appraisal untuk periode ini.")

# ----------------- 4. PERFORMANCE REVIEW 360 -----------------
elif menu == "Performance Review (360)":
    st.markdown(f"""
        <div class="top-header-container">
            <div>
                <h1 class="page-title">Performance Review (360)</h1>
                <div class="page-desc">Monitoring evaluasi umpan balik 360 derajat atasan, rekan, dan bawahan (Tahun {sel_year} TW {sel_tw})</div>
            </div>
            <div class="period-badge">
                <span>🗓️</span> Target Sinkron: {sel_year} - TW {sel_tw}
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    df_rev = query_df("SELECT * FROM performance_review360 WHERE period_id = ?", (period_id,))
    total = len(df_rev)
    
    if total > 0:
        all_done = int((df_rev['status'] == 'All Done').sum())
        almost = int((df_rev['status'] == 'Almost Done').sum())
        ny = total - all_done - almost
    else:
        all_done = almost = ny = 0
        
    st.markdown(f"""
        <div class="kpi-grid">
            <div class="kpi-card kpi-default">
                <div class="kpi-header"><span class="kpi-label">Total Peserta 360</span></div>
                <div class="kpi-value">{total:,}</div>
                <div class="kpi-footer"><span style="color: #94a3b8;">Evaluasi 360</span></div>
            </div>
            <div class="kpi-card kpi-success">
                <div class="kpi-header"><span class="kpi-label">All Done (100% Selesai)</span></div>
                <div class="kpi-value">{all_done:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(all_done/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-info">
                <div class="kpi-header"><span class="kpi-label">Dalam Proses / Sisa</span></div>
                <div class="kpi-value">{ny:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(ny/total*100 if total else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    if total > 0:
        st.markdown("""
            <div class="custom-card-title">Daftar Penilaian 360 Karyawan</div>
            <div class="custom-card-subtitle">Rincian status pengisian penilaian multi-penilai</div>
        """, unsafe_allow_html=True)
        search_r = st.text_input("🔍 Cari Karyawan, NIK, atau Departemen", "")
        if search_r:
            df_r_disp = df_rev[df_rev['nama'].str.contains(search_r, case=False, na=False) | df_rev['employee_nik'].str.contains(search_r, na=False) | df_rev['departemen'].str.contains(search_r, case=False, na=False)]
        else:
            df_r_disp = df_rev
            
        out_r = df_r_disp[['employee_nik', 'nama', 'departemen', 'atasan_assessed', 'rekan_assessed', 'bawahan_assessed', 'pribadi_assessed', 'total_assessed', 'total_pct', 'status']].copy()
        out_r.columns = ['NIK', 'Nama', 'Departemen', 'Atasan', 'Rekan', 'Bawahan', 'Pribadi', 'Total Assessed', '% Selesai', 'Status']
        st.dataframe(out_r, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada data Review 360 untuk periode ini.")

# ----------------- 5. OVERVIEW MASTER KARYAWAN -----------------
elif menu == "Overview Master Karyawan":
    st.markdown("""
        <div class="top-header-container">
            <div>
                <h1 class="page-title">Overview Master Data Karyawan</h1>
                <div class="page-desc">Visualisasi dan struktur demografi seluruh data karyawan aktif PT Petrokimia Gresik</div>
            </div>
            <div class="period-badge">
                <span>🏢</span> Status: Master Bersih
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    df_m = query_df("SELECT * FROM employees_master")
    total_m = len(df_m)
    
    aktif = int((df_m['kategori'] == 'AKTIF').sum())
    pkwt = int((df_m['kategori'] == 'PKWT').sum())
    purna = int((df_m['kategori'] == 'PURNA').sum())
    pi = int((df_m['kategori'] == 'PI').sum())
    
    st.markdown(f"""
        <div class="kpi-grid">
            <div class="kpi-card kpi-default">
                <div class="kpi-header"><span class="kpi-label">Total Master</span></div>
                <div class="kpi-value">{total_m:,}</div>
                <div class="kpi-footer"><span style="color: #94a3b8;">Karyawan</span></div>
            </div>
            <div class="kpi-card kpi-success">
                <div class="kpi-header"><span class="kpi-label">Karyawan Aktif</span></div>
                <div class="kpi-value">{aktif:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(aktif/total_m*100 if total_m else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-info">
                <div class="kpi-header"><span class="kpi-label">PKWT</span></div>
                <div class="kpi-value">{pkwt:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(pkwt/total_m*100 if total_m else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-warning">
                <div class="kpi-header"><span class="kpi-label">Purna Tugas</span></div>
                <div class="kpi-value">{purna:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(purna/total_m*100 if total_m else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
            <div class="kpi-card kpi-purple">
                <div class="kpi-header"><span class="kpi-label">Perbantuan (PI)</span></div>
                <div class="kpi-value">{pi:,}</div>
                <div class="kpi-footer"><span class="kpi-pct">{(pi/total_m*100 if total_m else 0):.1f}%</span> <span style="color: #94a3b8;">of Total</span></div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    col_m1, col_m2 = st.columns([1, 2])
    with col_m1:
        st.markdown("""
            <div class="custom-card-title">Kategori Karyawan</div>
            <div class="custom-card-subtitle">Distribusi status kepegawaian</div>
        """, unsafe_allow_html=True)
        fig_m = create_styled_donut(
            values=[aktif, pkwt, purna, pi],
            labels=['Aktif', 'PKWT', 'Purna Tugas', 'PI'],
            colors=['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6'],
            center_pct=f"{round(aktif/total_m*100, 1)}",
            center_label="AKTIF",
            center_sub=f"{aktif:,} / {total_m:,} Karyawan"
        )
        st.plotly_chart(fig_m, use_container_width=True)
        
    with col_m2:
        st.markdown("""
            <div class="custom-card-title">Distribusi Per Kompartemen Teratas</div>
            <div class="custom-card-subtitle">Jumlah karyawan per unit kompartemen</div>
        """, unsafe_allow_html=True)
        komp_df = df_m['kompartemen'].fillna('Lainnya').value_counts().reset_index()
        komp_df.columns = ['Kompartemen', 'Jumlah']
        fig_bar = go.Figure(data=[go.Bar(
            x=komp_df['Jumlah'].head(8),
            y=komp_df['Kompartemen'].head(8),
            orientation='h',
            marker=dict(color='#38bdf8', line=dict(color='#0f172a', width=1)),
            text=komp_df['Jumlah'].head(8),
            textposition='auto'
        )])
        fig_bar.update_layout(
            yaxis=dict(autorange="reversed"),
            margin=dict(t=10, b=10, l=10, r=10),
            height=320,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color="#94a3b8"),
            xaxis=dict(gridcolor="rgba(255,255,255,0.05)")
        )
        st.plotly_chart(fig_bar, use_container_width=True)

# ----------------- 6. DATA PERLU REVIEW -----------------
elif menu == "Data Perlu Review":
    st.markdown("""
        <div class="top-header-container">
            <div>
                <h1 class="page-title">Data Perlu Review (Orphan Rows)</h1>
                <div class="page-desc">Daftar baris laporan kinerja yang NIK-nya tidak ditemukan pada Master Data Karyawan Aktif</div>
            </div>
            <div class="period-badge">
                <span>⚠️</span> Audit & Rekonsiliasi NIK
            </div>
        </div>
    """, unsafe_allow_html=True)
    
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
elif menu == "Riwayat Aktivitas":
    st.markdown("""
        <div class="top-header-container">
            <div>
                <h1 class="page-title">Riwayat Aktivitas & Sinkronisasi</h1>
                <div class="page-desc">Log historis aktivitas unggah, sinkronisasi, dan pengelolaan data kinerja</div>
            </div>
            <div class="period-badge">
                <span>📜</span> Audit Trail
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    df_u = query_df("SELECT * FROM uploads ORDER BY id DESC LIMIT 15")
    
    if len(df_u) > 0:
        df_u_show = df_u[['jenis_file', 'filename', 'uploaded_at', 'uploaded_by', 'row_count', 'orphan_row_count']].copy()
        df_u_show.columns = ['Modul / Jenis', 'Keterangan / Berkas', 'Waktu Aktivitas', 'Operator', 'Baris Valid', 'Orphan (Review)']
        st.dataframe(df_u_show, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada riwayat aktivitas tercatat.")

if isinstance(conn, sqlite3.Connection):
    conn.close()
