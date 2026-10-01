import os
import io
import datetime
from typing import List, Dict, Any, Optional

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import PieChart, BarChart, Reference, Series
from openpyxl.chart.label import DataLabelList

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Group, Circle, Line
from reportlab.graphics.charts.piecharts import Pie


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
        self.line(36, 30, page_w - 36, 30)

        # Footer Text
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#0F172A"))
        self.drawString(36, 18, "PT PETROKIMIA GRESIK")
        
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(145, 18, "•   Performance Management System (PMS) — Laporan Resmi Kinerja Karyawan")

        page_str = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(page_w - 36, 18, page_str)
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


def create_status_pie_drawing(summary_data: Dict[str, Any], width: float = 375, height: float = 110) -> Drawing:
    """
    Create a clean executive vector Donut/Pie chart for Status distribution in ReportLab.
    """
    d = Drawing(width, height)
    # Background card
    d.add(Rect(0, 0, width, height, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#E2E8F0"), strokeWidth=1, rx=6, ry=6))
    d.add(String(12, height - 16, "DISTRIBUSI STATUS KINERJA", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#0F172A")))

    total = summary_data.get("total_employees", 0)
    app = summary_data.get("approved_count", 0)
    wait = summary_data.get("waiting_approval_count", 0)
    draft = summary_data.get("drafted_count", 0) or summary_data.get("declined_count", 0) or summary_data.get("ny_done_count", 0)
    ny = summary_data.get("not_yet_submitted_count", 0)

    # Values for pie (ensure non-zero slice representation if total > 0)
    data = [app, wait, draft, ny]
    if sum(data) == 0:
        data = [1]
        colors_list = [colors.HexColor("#E2E8F0")]
    else:
        # replace zeros with 0
        data = [max(0, x) for x in data]
        colors_list = [
            colors.HexColor("#059669"), # Emerald
            colors.HexColor("#D97706"), # Amber
            colors.HexColor("#2563EB"), # Blue
            colors.HexColor("#DC2626"), # Rose
        ]

    pie = Pie()
    pie.x = 10
    pie.y = 8
    pie.width = 85
    pie.height = 85
    pie.data = data
    for idx, c in enumerate(colors_list):
        if idx < len(pie.slices):
            pie.slices[idx].fillColor = c
            pie.slices[idx].strokeColor = colors.white
            pie.slices[idx].strokeWidth = 1
    d.add(pie)

    # Legend table on the right
    labels = [
        ("Approved / Selesai", app, summary_data.get("approved_pct", 0.0), "#059669"),
        ("Waiting Approval", wait, summary_data.get("waiting_approval_pct", 0.0), "#D97706"),
        ("Drafted / Lainnya", draft, summary_data.get("drafted_pct", 0.0) or summary_data.get("declined_pct", 0.0) or summary_data.get("ny_done_pct", 0.0), "#2563EB"),
        ("Not Yet Submitted", ny, summary_data.get("not_yet_submitted_pct", 0.0), "#DC2626"),
    ]

    y_pos = height - 34
    for lbl, cnt, pct, col in labels:
        d.add(Circle(112, y_pos + 3, 3.5, fillColor=colors.HexColor(col), strokeColor=None))
        d.add(String(122, y_pos, f"{lbl}:", fontName="Helvetica-Bold", fontSize=7.5, fillColor=colors.HexColor("#1E293B")))
        d.add(String(230, y_pos, f"{cnt:,} peg".replace(",", "."), fontName="Helvetica", fontSize=7.5, fillColor=colors.HexColor("#475569")))
        d.add(String(295, y_pos, f"({pct:.1f}%)", fontName="Helvetica-Bold", fontSize=7.5, fillColor=colors.HexColor(col)))
        y_pos -= 17

    return d


def create_progress_bar_drawing(summary_data: Dict[str, Any], score_dist: Optional[Dict[str, Any]] = None, width: float = 380, height: float = 110) -> Drawing:
    """
    Create a secondary visual chart: Score Distribution (for Appraisal/360) or Top Accomplishment Units.
    """
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#E2E8F0"), strokeWidth=1, rx=6, ry=6))

    if score_dist and "counts" in score_dist:
        d.add(String(12, height - 16, "DISTRIBUSI NILAI KINERJA", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#0F172A")))
        counts = score_dist.get("counts", {})
        total_sc = sum(counts.values()) or 1
        
        items = [
            ("Nilai > 100", counts.get("above_100", 0), "#059669"),
            ("Nilai 96 - 100", counts.get("96_to_100", 0), "#0284C7"),
            ("Nilai 85 - 95", counts.get("85_to_95", 0), "#D97706"),
            ("Nilai < 85", counts.get("under_85", 0), "#DC2626"),
        ]

        y_pos = height - 34
        max_bar_w = 160
        for lbl, cnt, col in items:
            pct = (cnt / total_sc) * 100.0 if total_sc > 0 else 0.0
            d.add(String(14, y_pos, lbl, fontName="Helvetica-Bold", fontSize=7.5, fillColor=colors.HexColor("#1E293B")))
            # Background track
            d.add(Rect(110, y_pos - 1, max_bar_w, 7, fillColor=colors.HexColor("#E2E8F0"), strokeColor=None, rx=2, ry=2))
            # Fill bar
            fill_w = max_bar_w * (pct / 100.0) if pct > 0 else 0
            if fill_w > 0:
                d.add(Rect(110, y_pos - 1, max(fill_w, 2), 7, fillColor=colors.HexColor(col), strokeColor=None, rx=2, ry=2))
            d.add(String(280, y_pos, f"{cnt:,} peg".replace(",", "."), fontName="Helvetica", fontSize=7.5, fillColor=colors.HexColor("#475569")))
            d.add(String(335, y_pos, f"({pct:.1f}%)", fontName="Helvetica-Bold", fontSize=7.5, fillColor=colors.HexColor(col)))
            y_pos -= 17
    else:
        d.add(String(12, height - 16, "TOP PENCAPAIAN PROGRESS DEPARTEMEN", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#0F172A")))
        dept_list = sorted(summary_data.get("per_departemen", []), key=lambda x: x.get("accomplishments_pct", 0), reverse=True)[:4]
        
        y_pos = height - 34
        max_bar_w = 145
        if not dept_list:
            d.add(String(14, y_pos, "Tidak ada data departemen", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#64748B")))
        else:
            for d_item in dept_list:
                dept_name = str(d_item.get("departemen", "-"))
                if len(dept_name) > 18:
                    dept_name = dept_name[:17] + "..."
                acc_pct = float(d_item.get("accomplishments_pct", 0.0))
                tot = d_item.get("total", 0)

                col = "#059669" if acc_pct >= 90 else ("#D97706" if acc_pct >= 70 else "#DC2626")
                d.add(String(14, y_pos, dept_name, fontName="Helvetica-Bold", fontSize=7, fillColor=colors.HexColor("#1E293B")))
                # Track
                d.add(Rect(125, y_pos - 1, max_bar_w, 7, fillColor=colors.HexColor("#E2E8F0"), strokeColor=None, rx=2, ry=2))
                # Fill
                fill_w = max_bar_w * (min(acc_pct, 100.0) / 100.0)
                if fill_w > 0:
                    d.add(Rect(125, y_pos - 1, max(fill_w, 2), 7, fillColor=colors.HexColor(col), strokeColor=None, rx=2, ry=2))
                d.add(String(280, y_pos, f"{tot} peg", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#475569")))
                d.add(String(325, y_pos, f"{acc_pct:.1f}%", fontName="Helvetica-Bold", fontSize=7.5, fillColor=colors.HexColor(col)))
                y_pos -= 17

    return d


def generate_pdf_report(
    title: str,
    period_label: str,
    summary_data: Dict[str, Any],
    score_distribution: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Generate professional landscape A4 PDF report with corporate Petrokimia styling,
    KPI summary cards, visual Donut & Bar charts, and departmental breakdown table.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=28,
        bottomMargin=38,
    )

    page_w, page_h = landscape(A4)
    usable_w = page_w - 72  # 841.89 - 72 = 769.89 pt

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CompanyTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#0F172A')
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=12,
        textColor=colors.HexColor('#0284C7')
    )
    caption_style = ParagraphStyle(
        'ReportCaption',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#64748B')
    )
    badge_style = ParagraphStyle(
        'PeriodBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=10,
        textColor=colors.HexColor('#0369A1'),
        alignment=2 # Right
    )
    badge_date_style = ParagraphStyle(
        'PeriodDate',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=8,
        textColor=colors.HexColor('#64748B'),
        alignment=2
    )

    story = []

    # 1. Header with Logo & Info
    logo_path = find_logo_path()
    logo_cell = ""
    if logo_path:
        try:
            logo_img = Image(logo_path, width=38, height=38)
            logo_cell = logo_img
        except Exception:
            logo_cell = ""

    header_left = [
        Paragraph("PT PETROKIMIA GRESIK", title_style),
        Spacer(1, 1),
        Paragraph(f"Laporan Eksekutif: {title}", subtitle_style),
        Spacer(1, 1),
        Paragraph("Sistem Manajemen Kinerja Karyawan (PMS)", caption_style)
    ]

    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M WIB")
    header_right = [
        Paragraph(f"Periode: {period_label}", badge_style),
        Spacer(1, 2),
        Paragraph(f"Dicetak: {now_str}", badge_date_style)
    ]

    header_data = [[
        logo_cell if logo_cell else "",
        header_left,
        header_right
    ]]

    header_col_widths = [45, usable_w - 225, 180] if logo_cell else [0, usable_w - 180, 180]
    header_table = Table(header_data, colWidths=header_col_widths)
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # 2. Executive KPI Cards
    total_emp = summary_data.get('total_employees', 0)
    app_cnt = summary_data.get('approved_count', 0)
    app_pct = summary_data.get('approved_pct', 0.0)
    wait_cnt = summary_data.get('waiting_approval_count', 0)
    wait_pct = summary_data.get('waiting_approval_pct', 0.0)
    draft_cnt = summary_data.get('drafted_count', 0) or summary_data.get('declined_count', 0) or summary_data.get('ny_done_count', 0)
    draft_pct = summary_data.get('drafted_pct', 0.0) or summary_data.get('declined_pct', 0.0) or summary_data.get('ny_done_pct', 0.0)
    ny_cnt = summary_data.get('not_yet_submitted_count', 0)
    ny_pct = summary_data.get('not_yet_submitted_pct', 0.0)

    card_label_style = ParagraphStyle('CardLabel', fontName='Helvetica-Bold', fontSize=7, leading=8, textColor=colors.HexColor('#64748B'), alignment=1)
    
    def make_kpi_cell(label: str, val_text: str, sub_text: str, bg_hex: str, border_hex: str, text_hex: str):
        val_style = ParagraphStyle(f'Val_{label}', fontName='Helvetica-Bold', fontSize=11, leading=13, textColor=colors.HexColor(text_hex), alignment=1)
        sub_style = ParagraphStyle(f'Sub_{label}', fontName='Helvetica', fontSize=6.5, leading=7.5, textColor=colors.HexColor('#64748B'), alignment=1)
        return [
            Paragraph(label.upper(), card_label_style),
            Spacer(1, 1),
            Paragraph(val_text, val_style),
            Spacer(1, 1),
            Paragraph(sub_text, sub_style)
        ]

    kpi_items = [
        make_kpi_cell("Total Karyawan", f"{total_emp:,}".replace(",", "."), f"{len(summary_data.get('per_departemen', []))} Departemen", "#F8FAFC", "#CBD5E1", "#0F172A"),
        make_kpi_cell("Approved / Done", f"{app_cnt:,}".replace(",", "."), f"{app_pct:.1f}% dari Total", "#ECFDF5", "#A7F3D0", "#059669"),
        make_kpi_cell("Waiting Approval", f"{wait_cnt:,}".replace(",", "."), f"{wait_pct:.1f}% dari Total", "#FFFBEB", "#FDE68A", "#D97706"),
        make_kpi_cell("Drafted / Lain", f"{draft_cnt:,}".replace(",", "."), f"{draft_pct:.1f}% dari Total", "#EFF6FF", "#BFDBFE", "#2563EB"),
        make_kpi_cell("Not Yet Submit", f"{ny_cnt:,}".replace(",", "."), f"{ny_pct:.1f}% dari Total", "#FEF2F2", "#FECACA", "#DC2626"),
    ]

    card_w = usable_w / 5.0
    kpi_table = Table([kpi_items], colWidths=[card_w]*5)
    kpi_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
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
    story.append(Spacer(1, 6))

    # 3. Visual Charts (Pie + Secondary Chart) Side-by-Side
    half_w = (usable_w - 10) / 2.0
    pie_drawing = create_status_pie_drawing(summary_data, width=half_w, height=105)
    secondary_drawing = create_progress_bar_drawing(summary_data, score_dist=score_distribution, width=half_w, height=105)

    charts_table = Table([[pie_drawing, secondary_drawing]], colWidths=[half_w, half_w])
    charts_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(charts_table)
    story.append(Spacer(1, 8))

    # 4. Department Breakdown Table Header
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )
    story.append(Paragraph("Rekapitulasi Progress per Departemen", section_style))
    story.append(Spacer(1, 4))

    # Table styles
    th_style = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.white, alignment=1)
    th_left = ParagraphStyle('THLeft', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.white, alignment=0)
    td_style = ParagraphStyle('TD', fontName='Helvetica', fontSize=7, leading=8.5, textColor=colors.HexColor('#1E293B'), alignment=1)
    td_left = ParagraphStyle('TDLeft', fontName='Helvetica', fontSize=7, leading=8.5, textColor=colors.HexColor('#1E293B'), alignment=0)

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
    col_w = [24, usable_w - 364, 42, 50, 50, 50, 52, 96]

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
        acc_cell_style = ParagraphStyle(f'Acc_{idx}', fontName='Helvetica-Bold', fontSize=7, leading=8.5, textColor=colors.HexColor(acc_color), alignment=2)

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
    tot_acc_style = ParagraphStyle('TotAcc', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#0F172A'), alignment=2)
    tot_th_style = ParagraphStyle('TotTH', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#0F172A'), alignment=1)
    tot_left_style = ParagraphStyle('TotLeft', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#0F172A'), alignment=0)

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
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E2E8F0")),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor("#0F172A")),
    ]

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
    detail_records: List[Dict[str, Any]],
    summary_data: Optional[Dict[str, Any]] = None,
    score_distribution: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Generate professional openpyxl Excel spreadsheet with styled Summary, Native Charts & Detail sheets.
    """
    wb = openpyxl.Workbook()
    
    # Common styles
    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    total_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
    total_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
    title_font = Font(name="Calibri", size=13, bold=True, color="0F172A")
    subtitle_font = Font(name="Calibri", size=11, bold=True, color="0284C7")
    section_font = Font(name="Calibri", size=11, bold=True, color="0F172A")
    regular_font = Font(name="Calibri", size=9.5, color="1E293B")
    
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # --- Sheet 1: Summary & Dashboard ---
    ws_sum = wb.active
    ws_sum.title = "Ringkasan & Visualisasi"
    
    ws_sum["A1"] = "PT PETROKIMIA GRESIK"
    ws_sum["A1"].font = title_font
    ws_sum["A2"] = f"Laporan Eksekutif: {modul_title} — {period_label}"
    ws_sum["A2"].font = subtitle_font
    ws_sum["A3"] = f"Generated at: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M WIB')} | Sistem Manajemen Kinerja Karyawan (PMS)"
    ws_sum["A3"].font = Font(name="Calibri", size=9, italic=True, color="64748B")

    # Status Breakdown KPI Summary Table (Columns A-C)
    ws_sum["A5"] = "Status Kinerja"
    ws_sum["B5"] = "Jumlah Pegawai"
    ws_sum["C5"] = "Persentase (%)"
    for col_idx, col_name in enumerate(["A5", "B5", "C5"], 1):
        cell = ws_sum[col_name]
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
    ws_sum.row_dimensions[5].height = 20

    app_val = summary_data.get('approved_count', 0) if summary_data else sum(r.get('approved', 0) for r in summary_dept)
    wait_val = summary_data.get('waiting_approval_count', 0) if summary_data else sum(r.get('wait_apv', 0) for r in summary_dept)
    draft_val = (summary_data.get('drafted_count', 0) or summary_data.get('declined_count', 0) or summary_data.get('ny_done_count', 0)) if summary_data else sum(r.get('drafted', 0) for r in summary_dept)
    ny_val = summary_data.get('not_yet_submitted_count', 0) if summary_data else sum(r.get('ny_submit', 0) for r in summary_dept)
    tot_val = summary_data.get('total_employees', 0) if summary_data else sum(r.get('total', 0) for r in summary_dept)

    status_rows = [
        ("Approved / Selesai", app_val),
        ("Waiting Approval", wait_val),
        ("Drafted / Lainnya", draft_val),
        ("Not Yet Submitted", ny_val),
    ]

    for s_idx, (st_name, st_cnt) in enumerate(status_rows, 6):
        pct = (st_cnt / tot_val * 100) if tot_val > 0 else 0.0
        c1 = ws_sum.cell(row=s_idx, column=1, value=st_name)
        c2 = ws_sum.cell(row=s_idx, column=2, value=st_cnt)
        c3 = ws_sum.cell(row=s_idx, column=3, value=f"{pct:.1f}%")
        c1.font = regular_font
        c2.font = regular_font
        c3.font = regular_font
        c1.border = thin_border
        c2.border = thin_border
        c3.border = thin_border
        c2.alignment = Alignment(horizontal="center")
        c3.alignment = Alignment(horizontal="right")
        ws_sum.row_dimensions[s_idx].height = 18

    # Add Native Excel Pie Chart for Status
    try:
        pie = PieChart()
        pie.title = "Distribusi Status Kinerja"
        pie.width = 14
        pie.height = 7.5
        labels_ref = Reference(ws_sum, min_col=1, min_row=6, max_row=9)
        data_ref = Reference(ws_sum, min_col=2, min_row=5, max_row=9)
        pie.add_data(data_ref, titles_from_data=True)
        pie.set_categories(labels_ref)
        pie.dataLabels = DataLabelList()
        pie.dataLabels.showPercent = True
        pie.dataLabels.showVal = False
        ws_sum.add_chart(pie, "E5")
    except Exception as e:
        print(f"Excel chart warning: {e}")

    # Add Score Distribution table if available
    start_dept_row = 15
    if score_distribution and "counts" in score_distribution:
        ws_sum["A11"] = "Kategori Nilai"
        ws_sum["B11"] = "Jumlah Pegawai"
        ws_sum["C11"] = "Persentase (%)"
        for col_name in ["A11", "B11", "C11"]:
            c = ws_sum[col_name]
            c.fill = header_fill
            c.font = header_font
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = thin_border

        sc_counts = score_distribution.get("counts", {})
        sc_tot = sum(sc_counts.values()) or 1
        sc_rows = [
            ("Nilai > 100", sc_counts.get("above_100", 0)),
            ("Nilai 96 - 100", sc_counts.get("96_to_100", 0)),
            ("Nilai 85 - 95", sc_counts.get("85_to_95", 0)),
            ("Nilai < 85", sc_counts.get("under_85", 0)),
        ]
        for sc_idx, (sc_label, sc_val) in enumerate(sc_rows, 12):
            sc_pct = (sc_val / sc_tot * 100) if sc_tot > 0 else 0.0
            c1 = ws_sum.cell(row=sc_idx, column=1, value=sc_label)
            c2 = ws_sum.cell(row=sc_idx, column=2, value=sc_val)
            c3 = ws_sum.cell(row=sc_idx, column=3, value=f"{sc_pct:.1f}%")
            c1.font = regular_font
            c2.font = regular_font
            c3.font = regular_font
            c1.border = thin_border
            c2.border = thin_border
            c3.border = thin_border
            c2.alignment = Alignment(horizontal="center")
            c3.alignment = Alignment(horizontal="right")
        start_dept_row = 18

    # Department Breakdown Table
    ws_sum.cell(row=start_dept_row, column=1, value="Rekapitulasi Progress per Departemen").font = section_font
    
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
    
    th_row = start_dept_row + 1
    for col_idx, h in enumerate(headers, 1):
        cell = ws_sum.cell(row=th_row, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
    ws_sum.row_dimensions[th_row].height = 24

    tot_karyawan = 0
    tot_app = 0
    tot_wait = 0
    tot_draft = 0
    tot_ny = 0

    for r_offset, row in enumerate(summary_dept, 1):
        r_idx = th_row + r_offset
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

        c1 = ws_sum.cell(row=r_idx, column=1, value=row.get("no", r_offset))
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
            if (r_offset % 2 == 1):
                cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    # Total row
    tot_row = th_row + len(summary_dept) + 1
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

    # Auto column widths for summary
    for col in ws_sum.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws_sum.column_dimensions[col_letter].width = max(max_len + 3, 13)

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
