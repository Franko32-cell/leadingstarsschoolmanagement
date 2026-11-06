from io import BytesIO
import os
from urllib.parse import quote
import re
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone

from PIL import Image as PilImage, ImageOps

from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

import requests

from apps.fees.models import Fee
from apps.students.models import Student

# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------

BLUE    = colors.HexColor("#1e3a5f")
BLUE2   = colors.HexColor("#1e40af")
LBLUE   = colors.HexColor("#dbeafe")
MBLUE   = colors.HexColor("#bfdbfe")
GRAY    = colors.HexColor("#f9fafb")
MGRAY   = colors.HexColor("#f3f4f6")
DGRAY   = colors.HexColor("#374151")
LGRAY   = colors.HexColor("#9ca3af")
WHITE   = colors.white
GOLD    = colors.HexColor("#b45309")
GOLD2   = colors.HexColor("#fef3c7")
RED     = colors.HexColor("#dc2626")
LRED    = colors.HexColor("#fee2e2")
GREEN   = colors.HexColor("#15803d")
LGREEN  = colors.HexColor("#dcfce7")
BLACK   = colors.HexColor("#111827")
DIVIDER = colors.HexColor("#e2e8f0")
ACCENT  = colors.HexColor("#0ea5e9")

TERM_LABELS = {"term1": "Term 1", "term2": "Term 2", "term3": "Term 3"}
LOGO_PATH   = os.path.join(settings.BASE_DIR, "static", "images", "logo.jpeg")

W = A4[0] - 40*mm


# ---------------------------------------------------------------------------
# Image loading — with EXIF orientation fix + memory-safe resize
# ---------------------------------------------------------------------------

def load_image_flowable(path_or_url, width, height):
    try:
        if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
            resp = requests.get(path_or_url, timeout=10, stream=True)
            resp.raise_for_status()
            img_bytes = BytesIO()
            for chunk in resp.iter_content(chunk_size=8192):
                img_bytes.write(chunk)
            img_bytes.seek(0)
        elif os.path.exists(path_or_url):
            with open(path_or_url, "rb") as f:
                img_bytes = BytesIO(f.read())
        else:
            return None

        pil_img = PilImage.open(img_bytes)
        pil_img = ImageOps.exif_transpose(pil_img)

        # Resize to target dimensions before saving — major memory saving
        target_w = int(width * 3.78)   # mm to pixels approx
        target_h = int(height * 3.78)
        pil_img.thumbnail((target_w, target_h), PilImage.LANCZOS)

        if pil_img.mode in ("RGBA", "P", "CMYK", "LA", "L"):
            pil_img = pil_img.convert("RGB")

        corrected = BytesIO()
        pil_img.save(corrected, format="JPEG", quality=75, optimize=True)
        corrected.seek(0)
        pil_img.close()  # free Pillow memory immediately

        return Image(corrected, width=width, height=height)

    except Exception:
        pass
    return None


def load_logo():
    return load_image_flowable(LOGO_PATH, width=20*mm, height=20*mm)


def load_student_photo(student, width=26*mm, height=28*mm):
    try:
        if not student.photo:
            return None
        photo_url = student.photo.url
        if not photo_url.startswith("http"):
            photo_path = os.path.join(settings.MEDIA_ROOT, str(student.photo))
            return load_image_flowable(photo_path, width=width, height=height)
        return load_image_flowable(photo_url, width=width, height=height)
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Paragraph helper
# ---------------------------------------------------------------------------

def para(text, size=9, bold=False, color=DGRAY, align=TA_LEFT):
    return Paragraph(str(text), ParagraphStyle(
        "p",
        parent=getSampleStyleSheet()["Normal"],
        fontSize=size,
        fontName="Helvetica-Bold" if bold else "Helvetica",
        textColor=color,
        alignment=align,
        leading=size + 4,
        spaceAfter=0,
    ))


# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------

def build_header(term, year):
    logo_cell = load_logo() or para("", 9)
    year_str  = str(year) if year else str(timezone.now().year)
    term_str  = TERM_LABELS.get(term, term)

    school_block = [
        para("LEADING STARS ACADEMY", 14, bold=True, color=WHITE, align=TA_CENTER),
        para("WHERE LEADERS ARE BORN",  7, color=colors.HexColor("#93c5fd"), align=TA_CENTER),
        Spacer(1, 2*mm),
        para("FEE STATEMENT",          11, bold=True, color=GOLD, align=TA_CENTER),
        para(f"{term_str}  ·  {year_str}", 8, color=colors.HexColor("#e0f2fe"), align=TA_CENTER),
    ]

    right_block = [
        para("OFFICIAL", 6, bold=True, color=colors.HexColor("#93c5fd"), align=TA_CENTER),
        para("DOCUMENT", 6, bold=True, color=colors.HexColor("#93c5fd"), align=TA_CENTER),
    ]

    tbl = Table(
        [[logo_cell, school_block, right_block]],
        colWidths=[24*mm, 138*mm, 24*mm],
    )
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), BLUE),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",         (2, 0), (2,  0),  "CENTER"),
        ("TOPPADDING",    (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING",   (0, 0), (0,  0),  8),
        ("RIGHTPADDING",  (2, 0), (2,  0),  8),
    ]))

    accent = Table([[""]],  colWidths=[W + 40*mm])
    accent.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GOLD),
        ("TOPPADDING",    (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))

    return [tbl, accent]


# ---------------------------------------------------------------------------
# Student info card
# ---------------------------------------------------------------------------

def build_student_card(student, term, year):
    class_name = student.school_class.name if student.school_class else "—"
    year_str   = str(year) if year else str(timezone.now().year)

    photo      = load_student_photo(student)
    photo_cell = photo if photo else para("No Photo", 7, color=LGRAY, align=TA_CENTER)

    def lbl(text):
        return para(text, 7, bold=True, color=LGRAY)

    def val(text):
        return para(str(text), 9, bold=False, color=BLACK)

    info_data = [
        [lbl("STUDENT NAME"),   val(student.full_name)],
        [lbl("ADMISSION NO"),   val(student.admission_number)],
        [lbl("CLASS"),          val(class_name)],
        [lbl("TERM"),           val(TERM_LABELS.get(term, term))],
        [lbl("ACADEMIC YEAR"),  val(year_str)],
    ]

    info = Table(info_data, colWidths=[30*mm, 96*mm])
    info.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.4, DIVIDER),
    ]))

    photo_wrapper = Table([[photo_cell]], colWidths=[32*mm])
    photo_wrapper.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 2, BLUE),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND",    (0, 0), (-1, -1), LBLUE),
    ]))

    outer = Table([[info, photo_wrapper]], colWidths=[132*mm, 36*mm])
    outer.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 1, DIVIDER),
        ("BACKGROUND",    (0, 0), (-1, -1), WHITE),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("LINEAFTER",     (0, 0), (0, -1), 3, BLUE),
    ]))
    return outer


# ---------------------------------------------------------------------------
# Section label
# ---------------------------------------------------------------------------

def section_label(text):
    tbl = Table([[para(f"  {text}", 8, bold=True, color=WHITE)]], colWidths=[W])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), BLUE2),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
    ]))
    return tbl


# ---------------------------------------------------------------------------
# Fee breakdown table
# ---------------------------------------------------------------------------

def build_fee_table(fee):
    def row(label, value, highlight=False, value_color=None, bg=None):
        vc  = value_color or (BLUE2 if highlight else DGRAY)
        fs  = 10 if highlight else 9
        row = [
            para(label, fs, bold=highlight, color=BLUE if highlight else DGRAY),
            para(f"GHS {float(value):,.2f}", fs, bold=highlight, color=vc, align=TA_RIGHT),
        ]
        return row

    rows     = []
    alt_rows = []

    rows.append(row("School Fees", fee.amount))
    alt_rows.append(len(rows) - 1)

    if fee.book_user_fee and float(fee.book_user_fee) > 0:
        rows.append(row("Book User Fee", fee.book_user_fee))
        alt_rows.append(len(rows) - 1)

    if fee.workbook_fee and float(fee.workbook_fee) > 0:
        rows.append(row("Workbook Fee", fee.workbook_fee))
        alt_rows.append(len(rows) - 1)

    if fee.arrears and float(fee.arrears) > 0:
        rows.append(row("Arrears Carried Forward", fee.arrears, value_color=RED))
        alt_rows.append(len(rows) - 1)

    rows.append([para("", 2), para("", 2)])
    divider_idx = len(rows) - 1

    rows.append(row("TOTAL DUE",    fee.total_amount, highlight=True))
    rows.append(row("Amount Paid",  fee.paid, value_color=GREEN))

    balance   = float(fee.balance)
    bal_color = GREEN if balance <= 0 else RED
    bal_bg    = LGREEN if balance <= 0 else LRED
    rows.append([
        para("OUTSTANDING BALANCE", 10, bold=True, color=BLACK),
        para(f"GHS {balance:,.2f}", 10, bold=True, color=bal_color, align=TA_RIGHT),
    ])

    tbl   = Table(rows, colWidths=[120*mm, 48*mm])
    style = [
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("BOX",           (0, 0), (-1, -1), 1, DIVIDER),
        ("LINEBELOW",     (0, 0), (-1, divider_idx - 1), 0.4, DIVIDER),
        ("BACKGROUND",    (0, divider_idx + 1), (-1, divider_idx + 1), LBLUE),
        ("LINEABOVE",     (0, divider_idx + 1), (-1, divider_idx + 1), 1.5, BLUE),
        ("BACKGROUND",    (0, -1), (-1, -1), bal_bg),
        ("LINEABOVE",     (0, -1), (-1, -1), 1, bal_color),
        ("LINEBELOW",     (0, -1), (-1, -1), 1, bal_color),
    ]
    for i in range(divider_idx):
        if i % 2 == 1:
            style.append(("BACKGROUND", (0, i), (-1, i), MGRAY))
    tbl.setStyle(TableStyle(style))
    return tbl


# ---------------------------------------------------------------------------
# Status badge
# ---------------------------------------------------------------------------

def build_status_badge(fee):
    balance    = float(fee.balance)
    paid       = balance <= 0
    badge_text = "✓   FULLY PAID — Thank you!" if paid else f"⚠   OUTSTANDING BALANCE:  GHS {balance:,.2f}"
    badge_bg   = LGREEN if paid else LRED
    badge_col  = GREEN  if paid else RED

    badge = Table(
        [[para(badge_text, 11, bold=True, color=badge_col, align=TA_CENTER)]],
        colWidths=[W],
    )
    badge.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), badge_bg),
        ("BOX",           (0, 0), (-1, -1), 1.5, badge_col),
        ("TOPPADDING",    (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    return badge


# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------

def build_footer():
    return [
        HRFlowable(width="100%", thickness=0.6, color=DIVIDER),
        Spacer(1, 2*mm),
        para(
            "Please ensure all fees are settled before the end of term.  "
            "Thank you for choosing Leading Stars Academy.",
            8, color=LGRAY, align=TA_CENTER,
        ),
        Spacer(1, 1*mm),
        para(
            "For enquiries, contact the school bursar.",
            7, color=LGRAY, align=TA_CENTER,
        ),
    ]


# ---------------------------------------------------------------------------
# Single-student bill
# ---------------------------------------------------------------------------

class StudentFeeBillPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        term = request.query_params.get("term")
        if not term:
            from rest_framework.response import Response
            return Response({"error": "term is required"}, status=400)

        student = get_object_or_404(Student, id=student_id)
        fee = Fee.objects.filter(student=student, term=term).first()

        if not fee:
            from rest_framework.response import Response
            return Response(
                {"error": "No fee record found for this student and term."},
                status=404
            )

        year = getattr(fee, "year", None) or timezone.now().year

        buffer = BytesIO()
        pdf = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=20*mm,
            rightMargin=20*mm,
            topMargin=15*mm,
            bottomMargin=15*mm,
        )

        elements = []
        for item in build_header(term, year):
            elements.append(item)
        elements.append(Spacer(1, 5*mm))
        elements.append(build_student_card(student, term, year))
        elements.append(Spacer(1, 5*mm))
        elements.append(section_label("FEE BREAKDOWN"))
        elements.append(Spacer(1, 1*mm))
        elements.append(build_fee_table(fee))
        elements.append(Spacer(1, 5*mm))
        elements.append(build_status_badge(fee))
        elements.append(Spacer(1, 6*mm))
        for item in build_footer():
            elements.append(item)

        pdf.build(elements)
        pdf_data = buffer.getvalue()
        buffer.close()  # ← free memory immediately

        name_slug = student.student_name.strip().replace(" ", "_")
        if not name_slug:
            name_slug = student.admission_number

        safe_name = re.sub(r'[^A-Za-z0-9_-]+', '_', name_slug).strip("_")
        filename  = f"bill_{safe_name}_{term}.pdf"

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = (
            f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename)}"
        )
        return response


# ---------------------------------------------------------------------------
# Class-wide bill
# ---------------------------------------------------------------------------

class ClassFeeBillPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        term         = request.query_params.get("term")
        school_class = request.query_params.get("school_class")

        if not term or not school_class:
            from rest_framework.response import Response
            return Response({"error": "term and school_class are required"}, status=400)

        fees = (
            Fee.objects
            .filter(student__school_class_id=school_class, term=term)
            .select_related("student", "student__school_class")
            .order_by("student__admission_number")
        )
        if not fees.exists():
            from rest_framework.response import Response
            return Response({"error": "No fee records found."}, status=404)

        year       = getattr(fees.first(), "year", None) or timezone.now().year
        class_name = fees.first().student.school_class.name if fees.first().student.school_class else "—"

        buffer = BytesIO()
        pdf    = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=12*mm, rightMargin=12*mm,
            topMargin=12*mm, bottomMargin=12*mm,
        )

        elements = []
        for item in build_header(term, year):
            elements.append(item)
        elements.append(Spacer(1, 4*mm))

        sub = Table([[
            para(f"  CLASS:  {class_name}", 10, bold=True, color=BLUE),
            para(f"ACADEMIC YEAR:  {year}  ", 10, bold=True, color=DGRAY, align=TA_RIGHT),
        ]], colWidths=[93*mm, 81*mm])
        sub.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), MGRAY),
            ("BOX",           (0, 0), (-1, -1), 0.8, DIVIDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(sub)
        elements.append(Spacer(1, 3*mm))

        CW = [44*mm, 20*mm, 20*mm, 20*mm, 16*mm, 22*mm, 20*mm, 16*mm]

        def hdr(text):
            return para(text, 7, bold=True, color=WHITE, align=TA_CENTER)

        header_row = [
            para("  STUDENT", 8, bold=True, color=WHITE),
            hdr("FEES"), hdr("BOOKS"), hdr("WORKBOOK"),
            hdr("ARREARS"), hdr("TOTAL"), hdr("PAID"), hdr("BALANCE"),
        ]

        rows = [header_row]
        total_expected = total_paid = total_balance = 0

        for fee in fees:
            bal       = float(fee.balance)
            bal_color = GREEN if bal <= 0 else RED
            rows.append([
                para(f"  {fee.student.full_name}",           8),
                para(f"{float(fee.amount):,.0f}",            8, align=TA_CENTER),
                para(f"{float(fee.book_user_fee):,.0f}",     8, align=TA_CENTER),
                para(f"{float(fee.workbook_fee):,.0f}",      8, align=TA_CENTER),
                para(f"{float(fee.arrears):,.0f}",           8, align=TA_CENTER),
                para(f"{float(fee.total_amount):,.0f}",      8, bold=True, color=BLUE2,     align=TA_CENTER),
                para(f"{float(fee.paid):,.0f}",              8, color=GREEN,                align=TA_CENTER),
                para(f"{bal:,.0f}",                          8, bold=True, color=bal_color,  align=TA_CENTER),
            ])
            total_expected += float(fee.total_amount)
            total_paid     += float(fee.paid)
            total_balance  += float(fee.balance)

        rows.append([
            para("  TOTALS", 8, bold=True, color=WHITE),
            para("", 8), para("", 8), para("", 8), para("", 8),
            para(f"{total_expected:,.0f}", 8, bold=True, color=WHITE, align=TA_CENTER),
            para(f"{total_paid:,.0f}",     8, bold=True, color=WHITE, align=TA_CENTER),
            para(f"{total_balance:,.0f}",  8, bold=True,
                 color=colors.HexColor("#fca5a5") if total_balance > 0 else colors.HexColor("#86efac"),
                 align=TA_CENTER),
        ])

        tbl = Table(rows, colWidths=CW)
        tbl.setStyle(TableStyle([
            ("BACKGROUND",     (0, 0),  (-1, 0),  BLUE),
            ("TOPPADDING",     (0, 0),  (-1, 0),  7),
            ("BOTTOMPADDING",  (0, 0),  (-1, 0),  7),
            ("BACKGROUND",     (0, -1), (-1, -1), DGRAY),
            ("LINEABOVE",      (0, -1), (-1, -1), 1.5, BLUE),
            ("ROWBACKGROUNDS", (0, 1),  (-1, -2), [WHITE, MGRAY]),
            ("GRID",           (0, 0),  (-1, -1), 0.3, DIVIDER),
            ("BOX",            (0, 0),  (-1, -1), 1,   DIVIDER),
            ("TOPPADDING",     (0, 1),  (-1, -1), 5),
            ("BOTTOMPADDING",  (0, 1),  (-1, -1), 5),
            ("LEFTPADDING",    (0, 0),  (-1, -1), 4),
            ("VALIGN",         (0, 0),  (-1, -1), "MIDDLE"),
            ("BACKGROUND",     (5, 1),  (5, -2),  LBLUE),
        ]))
        elements.append(tbl)
        elements.append(Spacer(1, 5*mm))

        out_color = RED if total_balance > 0 else GREEN
        out_bg    = LRED if total_balance > 0 else LGREEN
        summary = Table([[
            para(f"  Students Billed: {len(fees)}", 9, bold=True, color=DGRAY),
            para(f"Expected: GHS {total_expected:,.2f}", 9, bold=True, color=BLUE2, align=TA_CENTER),
            para(f"Collected: GHS {total_paid:,.2f}",   9, bold=True, color=GREEN,  align=TA_CENTER),
            para(f"Outstanding: GHS {total_balance:,.2f}  ", 9, bold=True, color=out_color, align=TA_RIGHT),
        ]], colWidths=[46*mm, 52*mm, 52*mm, 50*mm - 0.01*mm])
        summary.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), MGRAY),
            ("BACKGROUND",    (3, 0), (3,  0),  out_bg),
            ("BOX",           (0, 0), (-1, -1), 1, DIVIDER),
            ("LINEAFTER",     (0, 0), (2,  0),  0.4, DIVIDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(summary)
        elements.append(Spacer(1, 5*mm))

        for item in build_footer():
            elements.append(item)

        pdf.build(elements)
        pdf_data = buffer.getvalue()
        buffer.close()  # ← free memory immediately

        safe_class = class_name.strip().replace(" ", "_")
        filename   = f"class_bill_{safe_class}_{term}.pdf"

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = (
            f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename)}"
        )
        return response
