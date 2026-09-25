import os
import io
import datetime
from typing import List, Dict, Any, Optional

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count on footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        page_w, page_h = landscape(A4)

        # Top subtle accent line
        self.setStrokeColor(colors.HexColor("#0284C7"))
        self.setLineWidth(2)
        self.line(36, page_h - 18, page_w - 36, page_h - 18)

        # Bottom footer line
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(36, 32, page_w - 36, 32)

        # Footer Text
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#0F172A"))
        self.drawString(36, 20, "PT PETROKIMIA GRESIK")
        
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(145, 20, "•   Performance Management System (PMS) — Laporan Resmi Operasional SDM")

        page_str = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(page_w - 36, 20, page_str)
        self.restoreState()


def find_logo_path() -> Optional[str]:
    """Find the path to logo-pg.png across common directories."""
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "static", "logo-pg.png"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "logo-pg.png"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "logo-pg.png"),
        "C:\\laragon\\www\\pms-pg\\logo-pg.png",
        "C:\\laragon\\www\\pms-pg\\backend\\app\\static\\logo-pg.png",
        "C:\\laragon\\www\\pms-pg\\frontend\\public\\logo-pg.png",
    ]
    for p in candidates:
        if os.path.exists(p):
            return os.path.abspath(p)
    return None


def generate_pdf_report(title: str, period_label: str, summary_data: Dict[str, Any]) -> bytes:
    """
    Generate professional landscape A4 PDF report with corporate Petrokimia styling,
    KPI summary cards, and clean departmental breakdown table.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=42,
    )

    page_w, page_h = landscape(A4)
    usable_w = page_w - 72  # 841.89 - 72 = 769.89 pt

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CompanyTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=15,
        textColor=colors.HexColor('#0F172A')
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=13,
        textColor=colors.HexColor('#0284C7')
    )
    caption_style = ParagraphStyle(
        'ReportCaption',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#64748B')
    )
    badge_style = ParagraphStyle(
        'PeriodBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#0369A1'),
        alignment=2 # Right
    )
    badge_date_style = ParagraphStyle(
        'PeriodDate',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#64748B'),
        alignment=2
    )

    story = []

    # 1. Header with Logo & Info
    logo_path = find_logo_path()
    logo_cell = ""
    if logo_path:
        try:
            # Maintain aspect ratio for logo
            logo_img = Image(logo_path, width=42, height=42)
            logo_cell = logo_img
        except Exception:
            logo_cell = ""

    header_left = [
        Paragraph("PT PETROKIMIA GRESIK", title_style),
        Spacer(1, 2),
        Paragraph(f"Laporan {title}", subtitle_style),
        Spacer(1, 2),
        Paragraph("Sistem Manajemen Kinerja Karyawan (PMS)", caption_style)
    ]

    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M WIB")
    header_right = [
        Paragraph(f"Periode: {period_label}", badge_style),
        Spacer(1, 3),
        Paragraph(f"Dicetak: {now_str}", badge_date_style)
    ]

    header_data = [[
        logo_cell if logo_cell else "",
        header_left,
        header_right
    ]]

    header_col_widths = [50, usable_w - 230, 180] if logo_cell else [0, usable_w - 180, 180]
    header_table = Table(header_data, colWidths=header_col_widths)
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    # 2. Executive KPI Cards
    total_emp = summary_data.get('total_employees', 0)
    app_cnt = summary_data.get('approved_count', 0)
    app_pct = summary_data.get('approved_pct', 0.0)
    wait_cnt = summary_data.get('waiting_approval_count', 0)
    wait_pct = summary_data.get('waiting_approval_pct', 0.0)
    draft_cnt = summary_data.get('drafted_count', 0)
    draft_pct = summary_data.get('drafted_pct', 0.0)
    ny_cnt = summary_data.get('not_yet_submitted_count', 0)
    ny_pct = summary_data.get('not_yet_submitted_pct', 0.0)

    card_label_style = ParagraphStyle('CardLabel', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#64748B'), alignment=1)
    
    def make_kpi_cell(label: str, val_text: str, sub_text: str, bg_hex: str, border_hex: str, text_hex: str):
        val_style = ParagraphStyle(f'Val_{label}', fontName='Helvetica-Bold', fontSize=12, leading=14, textColor=colors.HexColor(text_hex), alignment=1)
        sub_style = ParagraphStyle(f'Sub_{label}', fontName='Helvetica', fontSize=7, leading=8, textColor=colors.HexColor('#64748B'), alignment=1)
        content = [
            Paragraph(label.upper(), card_label_style),
            Spacer(1, 2),
            Paragraph(val_text, val_style),
            Spacer(1, 1),
            Paragraph(sub_text, sub_style)
        ]
        return content

    kpi_items = [
        make_kpi_cell("Total Karyawan", f"{total_emp:,}".replace(",", "."), f"{len(summary_data.get('per_departemen', []))} Departemen", "#F8FAFC", "#CBD5E1", "#0F172A"),
        make_kpi_cell("Approved", f"{app_cnt:,}".replace(",", "."), f"{app_pct:.1f}% dari Total", "#ECFDF5", "#A7F3D0", "#059669"),
        make_kpi_cell("Waiting Approval", f"{wait_cnt:,}".replace(",", "."), f"{wait_pct:.1f}% dari Total", "#FFFBEB", "#FDE68A", "#D97706"),
        make_kpi_cell("Drafted / Lain", f"{draft_cnt:,}".replace(",", "."), f"{draft_pct:.1f}% dari Total", "#EFF6FF", "#BFDBFE", "#2563EB"),
        make_kpi_cell("Not Yet Submit", f"{ny_cnt:,}".replace(",", "."), f"{ny_pct:.1f}% dari Total", "#FEF2F2", "#FECACA", "#DC2626"),
    ]

    card_w = usable_w / 5.0
    kpi_table = Table([kpi_items], colWidths=[card_w]*5)
    kpi_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        # Individual card styling
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (0, 0), 1, colors.HexColor("#CBD5E1")),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor("#ECFDF5")),
        ('BOX', (1, 0), (1, 0), 1, colors.HexColor("#A7F3D0")),
        ('BACKGROUND', (2, 0), (2, 0), colors.HexColor("#FFFBEB")),
        ('BOX', (2, 0), (2, 0), 1, colors.HexColor("#FDE68A")),
        ('BACKGROUND', (3, 0), (3, 0), colors.HexColor("#EFF6FF")),
        ('BOX', (3, 0), (3, 0), 1, colors.HexColor("#BFDBFE")),
        ('BACKGROUND', (4, 0), (4, 0), colors.HexColor("#FEF2F2")),
        ('BOX', (4, 0), (4, 0), 1, colors.HexColor("#FECACA")),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # 3. Department Breakdown Table Header
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )
    story.append(Paragraph("Rekapitulasi Progress per Departemen", section_style))
    story.append(Spacer(1, 4))

    # Table styles
    th_style = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white, alignment=1)
    th_left = ParagraphStyle('THLeft', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white, alignment=0)
    td_style = ParagraphStyle('TD', fontName='Helvetica', fontSize=7.5, leading=9, textColor=colors.HexColor('#1E293B'), alignment=1)
    td_left = ParagraphStyle('TDLeft', fontName='Helvetica', fontSize=7.5, leading=9, textColor=colors.HexColor('#1E293B'), alignment=0)
    td_acc = ParagraphStyle('TDAcc', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#059669'), alignment=2)

    table_data = [[
        Paragraph("No", th_style),
        Paragraph("Nama Departemen", th_left),
        Paragraph("Total", th_style),
        Paragraph("Approved", th_style),
        Paragraph("Wait Apv", th_style),
        Paragraph("Drafted", th_style),
        Paragraph("NY Submit", th_style),
        Paragraph("Accomplishment", th_style),
    ]]

    dept_list = summary_data.get('per_departemen', [])
    col_w = [26, usable_w - 386, 45, 52, 52, 52, 55, 104]

    tot_d_total = 0
    tot_d_app = 0
    tot_d_wait = 0
    tot_d_draft = 0
    tot_d_ny = 0

    for idx, d in enumerate(dept_list, 1):
        tot_num = d.get('total', 0)
        app_num = d.get('approved', 0)
        wait_num = d.get('wait_apv', 0)
        draft_num = d.get('drafted', 0)
        ny_num = d.get('ny_submit', 0)
        acc_pct = d.get('accomplishments_pct', 0.0)

        tot_d_total += tot_num
        tot_d_app += app_num
        tot_d_wait += wait_num
        tot_d_draft += draft_num
        tot_d_ny += ny_num

        acc_color = "#059669" if acc_pct >= 90 else ("#D97706" if acc_pct >= 70 else "#DC2626")
        acc_cell_style = ParagraphStyle(f'Acc_{idx}', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor(acc_color), alignment=2)

        table_data.append([
            Paragraph(str(d.get('no', idx)), td_style),
            Paragraph(str(d.get('departemen', '-')), td_left),
            Paragraph(str(tot_num), td_style),
            Paragraph(str(app_num), td_style),
            Paragraph(str(wait_num), td_style),
            Paragraph(str(draft_num), td_style),
            Paragraph(str(ny_num), td_style),
            Paragraph(f"{acc_pct:.1f}%", acc_cell_style),
        ])

    # Totals Row
    overall_acc = (tot_d_app / tot_d_total * 100) if tot_d_total > 0 else 0.0
    tot_acc_style = ParagraphStyle('TotAcc', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0F172A'), alignment=2)
    tot_th_style = ParagraphStyle('TotTH', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0F172A'), alignment=1)
    tot_left_style = ParagraphStyle('TotLeft', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0F172A'), alignment=0)

    table_data.append([
        Paragraph("", tot_th_style),
        Paragraph("TOTAL KESELURUHAN", tot_left_style),
        Paragraph(str(tot_d_total), tot_th_style),
        Paragraph(str(tot_d_app), tot_th_style),
        Paragraph(str(tot_d_wait), tot_th_style),
        Paragraph(str(tot_d_draft), tot_th_style),
        Paragraph(str(tot_d_ny), tot_th_style),
        Paragraph(f"{overall_acc:.1f}%", tot_acc_style),
    ])

    dept_table = Table(table_data, colWidths=col_w, repeatRows=1)
    
    table_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        # Total row style
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E2E8F0")),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor("#0F172A")),
    ]

    # Alternating row background
    for r in range(1, len(table_data) - 1):
        bg = colors.HexColor("#F8FAFC") if r % 2 == 0 else colors.white
        table_styles.append(('BACKGROUND', (0, r), (-1, r), bg))

    dept_table.setStyle(TableStyle(table_styles))
    story.append(dept_table)

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()


def generate_excel_report(
    modul_title: str,
    period_label: str,
    summary_dept: List[Dict[str, Any]],
    detail_records: List[Dict[str, Any]]
) -> bytes:
    """
    Generate professional openpyxl Excel spreadsheet with styled Summary & Detail sheets.
    """
    wb = openpyxl.Workbook()
    
    # Common styles
    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    total_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
    total_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
    title_font = Font(name="Calibri", size=14, bold=True, color="0F172A")
    subtitle_font = Font(name="Calibri", size=11, bold=True, color="0284C7")
    regular_font = Font(name="Calibri", size=10, color="1E293B")
    
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # --- Sheet 1: Summary Departemen ---
    ws_sum = wb.active
    ws_sum.title = "Ringkasan Departemen"
    
    ws_sum["A1"] = "PT PETROKIMIA GRESIK"
    ws_sum["A1"].font = title_font
    ws_sum["A2"] = f"Laporan {modul_title} — {period_label}"
    ws_sum["A2"].font = subtitle_font
    ws_sum["A3"] = f"Generated at: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M WIB')}"
    ws_sum["A3"].font = Font(name="Calibri", size=9, italic=True, color="64748B")
    
    headers = [
        "No",
        "Departemen",
        "Total Karyawan",
        "Approved",
        "Waiting Approval",
        "Drafted / Lain",
        "Not Yet Submit",
        "Accomplishment (%)"
    ]
    
    for col_idx, h in enumerate(headers, 1):
        cell = ws_sum.cell(row=5, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
    ws_sum.row_dimensions[5].height = 24

    tot_karyawan = 0
    tot_app = 0
    tot_wait = 0
    tot_draft = 0
    tot_ny = 0

    for r_idx, row in enumerate(summary_dept, 6):
        t = row.get("total", 0)
        a = row.get("approved", 0)
        w = row.get("wait_apv", 0)
        d = row.get("drafted", 0)
        ny = row.get("ny_submit", 0)
        acc = row.get("accomplishments_pct", 0.0)

        tot_karyawan += t
        tot_app += a
        tot_wait += w
        tot_draft += d
        tot_ny += ny

        c1 = ws_sum.cell(row=r_idx, column=1, value=row.get("no", r_idx-5))
        c1.alignment = Alignment(horizontal="center")
        c2 = ws_sum.cell(row=r_idx, column=2, value=row.get("departemen", "-"))
        c3 = ws_sum.cell(row=r_idx, column=3, value=t)
        c3.alignment = Alignment(horizontal="center")
        c4 = ws_sum.cell(row=r_idx, column=4, value=a)
        c4.alignment = Alignment(horizontal="center")
        c5 = ws_sum.cell(row=r_idx, column=5, value=w)
        c5.alignment = Alignment(horizontal="center")
        c6 = ws_sum.cell(row=r_idx, column=6, value=d)
        c6.alignment = Alignment(horizontal="center")
        c7 = ws_sum.cell(row=r_idx, column=7, value=ny)
        c7.alignment = Alignment(horizontal="center")
        c8 = ws_sum.cell(row=r_idx, column=8, value=f"{acc:.1f}%")
        c8.alignment = Alignment(horizontal="right")

        for c in range(1, 9):
            cell = ws_sum.cell(row=r_idx, column=c)
            cell.font = regular_font
            cell.border = thin_border
            if (r_idx % 2 == 1):
                cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    # Total row
    tot_row = len(summary_dept) + 6
    ws_sum.cell(row=tot_row, column=1, value="")
    ws_sum.cell(row=tot_row, column=2, value="TOTAL KESELURUHAN").font = total_font
    ws_sum.cell(row=tot_row, column=3, value=tot_karyawan).alignment = Alignment(horizontal="center")
    ws_sum.cell(row=tot_row, column=4, value=tot_app).alignment = Alignment(horizontal="center")
    ws_sum.cell(row=tot_row, column=5, value=tot_wait).alignment = Alignment(horizontal="center")
    ws_sum.cell(row=tot_row, column=6, value=tot_draft).alignment = Alignment(horizontal="center")
    ws_sum.cell(row=tot_row, column=7, value=tot_ny).alignment = Alignment(horizontal="center")
    overall_pct = (tot_app / tot_karyawan * 100) if tot_karyawan > 0 else 0.0
    ws_sum.cell(row=tot_row, column=8, value=f"{overall_pct:.1f}%").alignment = Alignment(horizontal="right")

    for c in range(1, 9):
        cell = ws_sum.cell(row=tot_row, column=c)
        cell.font = total_font
        cell.fill = total_fill
        cell.border = thin_border

    # Auto column widths
    for col in ws_sum.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws_sum.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # --- Sheet 2: Detail Karyawan ---
    ws_det = wb.create_sheet(title="Detail Karyawan")
    ws_det["A1"] = f"Detail Karyawan — {modul_title} ({period_label})"
    ws_det["A1"].font = title_font
    
    if detail_records:
        det_headers = list(detail_records[0].keys())
        for col_idx, h in enumerate(det_headers, 1):
            cell = ws_det.cell(row=3, column=col_idx, value=h.replace('_', ' ').title())
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border
        ws_det.row_dimensions[3].height = 22
            
        for r_idx, item in enumerate(detail_records, 4):
            for c_idx, h in enumerate(det_headers, 1):
                val = item.get(h)
                cell = ws_det.cell(row=r_idx, column=c_idx, value=str(val) if val is not None else "-")
                cell.font = regular_font
                cell.border = thin_border
                if r_idx % 2 == 1:
                    cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
                
        for col in ws_det.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_det.column_dimensions[col_letter].width = min(max(max_len + 3, 14), 45)

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()
