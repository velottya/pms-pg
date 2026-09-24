import io
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from jinja2 import Template
from typing import List, Dict, Any, Optional

HTML_REPORT_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 landscape;
    margin: 1.5cm;
    @bottom-right {
      content: "Halaman " counter(page) " dari " counter(pages);
      font-size: 8pt;
      color: #64748b;
    }
    @bottom-left {
      content: "Performance Management System — PT Petrokimia Gresik";
      font-size: 8pt;
      color: #64748b;
    }
  }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1e293b;
    margin: 0;
    padding: 0;
    font-size: 9pt;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .company-name {
    font-size: 14pt;
    font-weight: bold;
    color: #0f172a;
  }
  .report-title {
    font-size: 12pt;
    color: #0284c7;
    font-weight: 600;
    margin-top: 2px;
  }
  .period-badge {
    font-size: 9pt;
    font-weight: bold;
    background: #e0f2fe;
    color: #0369a1;
    padding: 4px 10px;
    border-radius: 4px;
    display: inline-block;
  }
  .summary-cards {
    display: table;
    width: 100%;
    margin-bottom: 16px;
  }
  .card-col {
    display: table-cell;
    width: 25%;
    padding: 4px;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
  }
  .card-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 600;
  }
  .card-value {
    font-size: 14pt;
    font-weight: bold;
    color: #0f172a;
    margin-top: 4px;
  }
  .text-success { color: #059669; }
  .text-warning { color: #d97706; }
  .text-danger { color: #dc2626; }
  .text-info { color: #2563eb; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 8.5pt;
  }
  th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #0f172a;
  }
  th.text-center, td.text-center { text-align: center; }
  th.text-right, td.text-right { text-align: right; }
  td {
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
  }
  tr:nth-child(even) {
    background-color: #f8fafc;
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">PT PETROKIMIA GRESIK</div>
      <div class="report-title">{{ title }}</div>
    </div>
    <div>
      <span class="period-badge">Periode: {{ period_label }}</span>
    </div>
  </div>

  <div class="summary-cards">
    <div class="card-col">
      <div class="card">
        <div class="card-label">Total Karyawan</div>
        <div class="card-value">{{ summary.total_employees }}</div>
      </div>
    </div>
    <div class="card-col">
      <div class="card">
        <div class="card-label">Approved / Selesai</div>
        <div class="card-value text-success">{{ summary.approved_pct }}%</div>
      </div>
    </div>
    <div class="card-col">
      <div class="card">
        <div class="card-label">Waiting Approval</div>
        <div class="card-value text-warning">{{ summary.waiting_approval_pct }}%</div>
      </div>
    </div>
    <div class="card-col">
      <div class="card">
        <div class="card-label">Not Yet Submitted</div>
        <div class="card-value text-danger">{{ summary.not_yet_submitted_pct }}%</div>
      </div>
    </div>
  </div>

  <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 10pt;">Ringkasan per Departemen</h4>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;" class="text-center">No</th>
        <th>Departemen</th>
        <th class="text-center" style="width: 50px;">Total</th>
        <th class="text-center" style="width: 60px;">Approved</th>
        <th class="text-center" style="width: 60px;">Wait Apv</th>
        <th class="text-center" style="width: 60px;">Drafted/Lain</th>
        <th class="text-center" style="width: 60px;">NY Submit</th>
        <th class="text-right" style="width: 80px;">Accomplishment</th>
      </tr>
    </thead>
    <tbody>
      {% for row in summary.per_departemen %}
      <tr>
        <td class="text-center">{{ row.no }}</td>
        <td><strong>{{ row.departemen }}</strong></td>
        <td class="text-center">{{ row.total }}</td>
        <td class="text-center text-success font-bold">{{ row.approved }}</td>
        <td class="text-center text-warning">{{ row.wait_apv }}</td>
        <td class="text-center text-info">{{ row.drafted }}</td>
        <td class="text-center text-danger">{{ row.ny_submit }}</td>
        <td class="text-right" style="font-weight: bold;">{{ row.accomplishments_pct }}%</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</body>
</html>
"""

def generate_pdf_report(title: str, period_label: str, summary_data: Dict[str, Any]) -> bytes:
    try:
        from weasyprint import HTML
        template = Template(HTML_REPORT_TEMPLATE)
        html_content = template.render(
            title=title,
            period_label=period_label,
            summary=summary_data
        )
        return HTML(string=html_content).write_pdf()
    except Exception as e:
        # Fallback if WeasyPrint system font/cairo is not configured
        template = Template(HTML_REPORT_TEMPLATE)
        return template.render(title=title, period_label=period_label, summary=summary_data).encode('utf-8')

def generate_excel_report(
    modul_title: str,
    period_label: str,
    summary_dept: List[Dict[str, Any]],
    detail_records: List[Dict[str, Any]]
) -> bytes:
    wb = openpyxl.Workbook()
    
    # --- Sheet 1: Summary Departemen ---
    ws_sum = wb.active
    ws_sum.title = "Ringkasan Departemen"
    
    # Title
    ws_sum["A1"] = "PT PETROKIMIA GRESIK"
    ws_sum["A1"].font = Font(size=14, bold=True, color="0F172A")
    ws_sum["A2"] = f"Laporan {modul_title} — {period_label}"
    ws_sum["A2"].font = Font(size=11, bold=True, color="0284C7")
    
    headers = ["No", "Departemen", "Total Karyawan", "Approved", "Waiting Approval", "Drafted / Lain", "Not Yet Submit", "Accomplishment (%)"]
    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    
    for col_idx, h in enumerate(headers, 1):
        cell = ws_sum.cell(row=4, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    for r_idx, row in enumerate(summary_dept, 5):
        ws_sum.cell(row=r_idx, column=1, value=row.get("no", r_idx-4)).alignment = Alignment(horizontal="center")
        ws_sum.cell(row=r_idx, column=2, value=row.get("departemen"))
        ws_sum.cell(row=r_idx, column=3, value=row.get("total")).alignment = Alignment(horizontal="center")
        ws_sum.cell(row=r_idx, column=4, value=row.get("approved")).alignment = Alignment(horizontal="center")
        ws_sum.cell(row=r_idx, column=5, value=row.get("wait_apv")).alignment = Alignment(horizontal="center")
        ws_sum.cell(row=r_idx, column=6, value=row.get("drafted")).alignment = Alignment(horizontal="center")
        ws_sum.cell(row=r_idx, column=7, value=row.get("ny_submit")).alignment = Alignment(horizontal="center")
        ws_sum.cell(row=r_idx, column=8, value=f"{row.get('accomplishments_pct', 0)}%").alignment = Alignment(horizontal="right")
        
        for c in range(1, 9):
            ws_sum.cell(row=r_idx, column=c).border = thin_border

    # Adjust column widths
    for col in ws_sum.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws_sum.column_dimensions[col_letter].width = max(max_len + 3, 10)

    # --- Sheet 2: Detail Karyawan ---
    ws_det = wb.create_sheet(title="Detail Karyawan")
    ws_det["A1"] = f"Detail Karyawan — {modul_title} ({period_label})"
    ws_det["A1"].font = Font(size=12, bold=True, color="0F172A")
    
    if detail_records:
        det_headers = list(detail_records[0].keys())
        for col_idx, h in enumerate(det_headers, 1):
            cell = ws_det.cell(row=3, column=col_idx, value=h.replace('_', ' ').title())
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            
        for r_idx, item in enumerate(detail_records, 4):
            for c_idx, h in enumerate(det_headers, 1):
                val = item.get(h)
                cell = ws_det.cell(row=r_idx, column=c_idx, value=str(val) if val is not None else "-")
                cell.border = thin_border
                
        for col in ws_det.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_det.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()
