import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_and_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

def test_summary_endpoints_empty():
    res_plan = client.get("/api/planning/summary?tahun=2026&triwulan=1")
    assert res_plan.status_code == 200
    assert res_plan.json()["total_employees"] == 0

    res_coach = client.get("/api/coaching/summary?tahun=2026&triwulan=1")
    assert res_coach.status_code == 200
    assert res_coach.json()["total_employees"] == 0

    res_appr = client.get("/api/appraisal/summary?tahun=2026&triwulan=1")
    assert res_appr.status_code == 200
    assert res_appr.json()["total_employees"] == 0

    res_rev = client.get("/api/review360/summary?tahun=2026&triwulan=1")
    assert res_rev.status_code == 200
    assert res_rev.json()["total_employees"] == 0

def test_export_pdf_and_excel():
    res_pdf = client.get("/api/export/planning/pdf?tahun=2026&triwulan=1")
    assert res_pdf.status_code == 200
    assert len(res_pdf.content) > 0

    res_excel = client.get("/api/export/planning/excel?tahun=2026&triwulan=1")
    assert res_excel.status_code == 200
    assert len(res_excel.content) > 0
