import pytest
import datetime
import pandas as pd
from app.services.master_pipeline import MasterDataPipeline

def test_master_pipeline_cleaning_and_classification():
    # 1. Sample synthetic DataFrame (12 rows covering all business test cases)
    sample_data = [
        # 1. Normal Aktif
        {
            "nik": "2135796", "nik_sap": "2135796", "nama": "Ahmad Subarjo",
            "eselon": "Eselon V", "statuspegawai": "TETAP", "nm_jabatan": "Specialist",
            "direktorat": "Direktorat Operasi dan Produksi", "kompartemen": "Komp. Pemeliharaan",
            "departemen": "Dep. Pemeliharaan Mekanik I", "bagian": "Bag. Mekanik IA",
            "status": "K", "tgl_pen": None
        },
        # 2. Delegasi Case (Same NIK, 2 different roles/dept)
        {
            "nik": "2145786", "nik_sap": "2145786", "nama": "Ilham Darmawan",
            "eselon": "Eselon IV", "statuspegawai": "TETAP", "nm_jabatan": "AVP Logistik",
            "direktorat": "Direktorat Keuangan dan Umum", "kompartemen": "Komp. Manajemen Logistik",
            "departemen": "Departemen Pengelolaan Persediaan", "bagian": "Bag. Can Log",
            "status": "K", "tgl_pen": None
        },
        {
            "nik": "2145786", "nik_sap": "2145786", "nama": "Ilham Darmawan",
            "eselon": "Eselon IV", "statuspegawai": "TETAP", "nm_jabatan": "Plt. GM Logistik",
            "direktorat": "Direktorat Keuangan dan Umum", "kompartemen": "Kompartemen Mitra Bisnis",
            "departemen": "Departemen Pengadaan", "bagian": "Bag. Tender",
            "status": "K", "tgl_pen": None
        },
        # 3. PURNA via tgl_pen
        {
            "nik": "1994112", "nik_sap": "1994112", "nama": "Bambang Purnomo",
            "eselon": "Eselon III", "statuspegawai": "TETAP", "nm_jabatan": "Senior Manager",
            "direktorat": "Direktorat Utama", "kompartemen": "Kompartemen Sekretaris Perusahaan",
            "departemen": "Departemen Tata Kelola", "bagian": "-",
            "status": "TK", "tgl_pen": "2026-04-30"
        },
        # 4. PURNA via status == 'TK' (Tidak Kerja)
        {
            "nik": "1995113", "nik_sap": "1995113", "nama": "Sugeng Haryanto",
            "eselon": "Eselon V", "statuspegawai": "TETAP", "nm_jabatan": "Staff",
            "direktorat": "Direktorat SDM", "kompartemen": "Kompartemen SDM",
            "departemen": "Departemen Diklat", "bagian": "-",
            "status": "TK", "tgl_pen": None
        },
        # 5. PKWT
        {
            "nik": "3200101", "nik_sap": "3200101", "nama": "Rizky Ramadhan",
            "eselon": "Non-Eselon", "statuspegawai": "PKWT", "nm_jabatan": "Operator Lapangan",
            "direktorat": "Direktorat Operasi dan Produksi", "kompartemen": "Komp. Operasi I",
            "departemen": "Dep. Operasi Pabrik I A", "bagian": "-",
            "status": "K", "tgl_pen": None
        },
        # 6. PRO_HIRE (mapped to PKWT)
        {
            "nik": "3200102", "nik_sap": "3200102", "nama": "Siti Nurhaliza",
            "eselon": "Non-Eselon", "statuspegawai": "PRO_HIRE", "nm_jabatan": "Specialist QA",
            "direktorat": "Direktorat Teknologi", "kompartemen": "Komp Teknologi",
            "departemen": "Departemen Riset", "bagian": "-",
            "status": "K", "tgl_pen": None
        },
        # 7. PI (Proyek Infrastruktur)
        {
            "nik": "2115257", "nik_sap": "2115257", "nama": "Wira Ekha Permana",
            "eselon": "Eselon III", "statuspegawai": "TETAP", "nm_jabatan": "PM Proyek Dermaga A",
            "direktorat": "Direktorat Operasi dan Produksi", "kompartemen": "Proyek Infrastruktur",
            "departemen": "Departemen Proyek Dermaga", "bagian": "-",
            "status": "K", "tgl_pen": None
        },
        # 8. PI (Penugasan)
        {
            "nik": "2115258", "nik_sap": "2115258", "nama": "Doni Setiawan",
            "eselon": "Eselon IV", "statuspegawai": "TETAP", "nm_jabatan": "Engineer Proyek",
            "direktorat": "Direktorat Operasi dan Produksi", "kompartemen": "Karyawan Penugasan",
            "departemen": "Proyek Revitalisasi Pabrik", "bagian": "-",
            "status": "K", "tgl_pen": None
        },
        # 9. Normal Aktif 2
        {
            "nik": "2135798", "nik_sap": "2135798", "nama": "Sony Tri Dirgantara",
            "eselon": "Eselon V", "statuspegawai": "TETAP", "nm_jabatan": "Senior Administrator",
            "direktorat": "Direktorat Utama", "kompartemen": "Komp. Sekretaris Perusahaan",
            "departemen": "Dep. Tanggung Jawab Sosial & Lingkungan", "bagian": "Bag. CSR",
            "status": "K", "tgl_pen": None
        }
    ]

    df = pd.DataFrame(sample_data)
    pipeline = MasterDataPipeline(db=None)

    result = pipeline.process_dataframe(df, snapshot_date=datetime.date(2026, 6, 30))

    # Assertions
    assert result["total_rows"] == 10
    assert result["aktif_count"] == 4     # Ahmad, Ilham (2 roles), Sony
    assert result["pkwt_count"] == 2      # Rizky, Siti
    assert result["purna_count"] == 2     # Bambang (tgl_pen), Sugeng (TK)
    assert result["pi_count"] == 2        # Wira, Doni
    assert result["delegasi_count"] == 2  # Ilham (appears in 2 rows with is_delegasi=True)

    # Check normalization
    records = result["records"]
    ahmad = next(r for r in records if r["nama"] == "Ahmad Subarjo")
    assert ahmad["kompartemen"] == "Kompartemen Pemeliharaan"
    assert ahmad["departemen"] == "Departemen Pemeliharaan Mekanik I"
    assert ahmad["kategori"] == "AKTIF"
    assert not ahmad["is_delegasi"]

    # Check delegasi record
    ilham_rows = [r for r in records if r["nama"] == "Ilham Darmawan"]
    assert len(ilham_rows) == 2
    assert all(r["is_delegasi"] for r in ilham_rows)
    assert all(r["delegasi_posisi_lain"] is not None for r in ilham_rows)

    # Check Rekap output
    assert len(result["rekap"]) > 0
