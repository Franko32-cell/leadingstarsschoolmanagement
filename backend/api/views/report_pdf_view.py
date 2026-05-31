from io import BytesIO
from urllib.parse import quote
import re
import os

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.conf import settings

from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, HRFlowable, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from PIL import Image as PilImage, ImageOps

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

import requests

from apps.students.models import Student
from apps.results.models import Result, Report
from apps.attendance.models import Attendance


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TERM_LABELS = {"term1": "Term 1", "term2": "Term 2", "term3": "Term 3"}

BLUE    = colors.HexColor("#1e3a5f")
BLUE2   = colors.HexColor("#1d4ed8")
LBLUE   = colors.HexColor("#dbeafe")
MBLUE   = colors.HexColor("#bfdbfe")
GRAY    = colors.HexColor("#f8fafc")
MGRAY   = colors.HexColor("#f1f5f9")
DGRAY   = colors.HexColor("#374151")
LGRAY   = colors.HexColor("#9ca3af")
WHITE   = colors.white
GOLD    = colors.HexColor("#b45309")
GOLD2   = colors.HexColor("#fef3c7")
GREEN   = colors.HexColor("#15803d")
LGREEN  = colors.HexColor("#dcfce7")
RED     = colors.HexColor("#dc2626")
LRED    = colors.HexColor("#fee2e2")
BLACK   = colors.HexColor("#111827")
DIVIDER = colors.HexColor("#e2e8f0")
ACCENT  = colors.HexColor("#0369a1")

LOGO_PATH = os.path.join(settings.BASE_DIR, "static", "images", "logo.jpeg")

SCHOOL_NAMES = {
    "nursery_kg": "LEADING STARS MONTESSORI",
    "basic_1_6":  "LEADING STARS ACADEMY",
    "basic_7_9":  "LEADING STARS ACADEMY",
}

SCHOOL_MOTTOS = {
    "nursery_kg": "GLOBAL LEADERS",
    "basic_1_6":  "WHERE LEADERS ARE BORN",
    "basic_7_9":  "WHERE LEADERS ARE BORN",
}

# ---------------------------------------------------------------------------
# Grading systems
# ---------------------------------------------------------------------------

GRADE_THRESHOLDS_B79 = [
    (90, "1", "HIGHEST"),
    (80, "2", "HIGHER"),
    (60, "3", "HIGH"),
    (55, "4", "HIGH AVERAGE"),
    (50, "5", "AVERAGE"),
    (45, "6", "LOW AVERAGE"),
    (40, "7", "LOW"),
    (35, "8", "LOWER"),
    (0,  "9", "LOWEST"),
]

GRADE_THRESHOLDS_B16 = [
    (90, "A",  "EXCELLENT"),
    (80, "B",  "VERY GOOD"),
    (60, "C",  "GOOD"),
    (55, "D",  "HIGH AVERAGE"),
    (45, "E2", "BELOW AVERAGE"),
    (40, "E3", "LOW"),
    (35, "E4", "LOWER"),
    (0,  "E5", "LOWEST"),
]

INTERP_ROWS_B79 = [
    ("90-100: 1 – HIGHEST",   "55-59: 4 – HIGH AVERAGE", "40-44: 7 – LOW"   ),
    ("80-89: 2 – HIGHER",     "50-54: 5 – AVERAGE",      "35-39: 8 – LOWER" ),
    ("60-79: 3 – HIGH",       "45-49: 6 – LOW AVERAGE",  "0-34: 9 – LOWEST" ),
]

INTERP_ROWS_B16 = [
    ("90-100: A – EXCELLENT", "55-59: D – HIGH AVERAGE", "40-44: E3 – LOW"   ),
    ("80-89: B – VERY GOOD",  "50-54: E – AVERAGE",      "35-39: E4 – LOWER" ),
    ("60-79: C – GOOD",       "45-49: E2 – BELOW AVG",   "0-34: E5 – LOWEST" ),
]


def get_thresholds(level: str) -> list:
    if level in ("basic_1_6", "nursery_kg"):
        return GRADE_THRESHOLDS_B16
    return GRADE_THRESHOLDS_B79


def get_grade_and_remark(score: float, thresholds: list) -> tuple:
    for threshold, grade, remark in thresholds:
        if score >= threshold:
            return grade, remark
    return thresholds[-1][1], thresholds[-1][2]


def get_overall_grade(avg: float, thresholds: list) -> str:
    return get_grade_and_remark(avg, thresholds)[0]


def fmt_pos(n):
    if n is None:
        return "-"
    suffix = (
        "th" if 10 <= n % 100 <= 20
        else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    )
    return f"{n}{suffix}"


def fmt_date(date_val):
    if not date_val:
        return "-"
    try:
        from datetime import date as date_type
        import datetime
        if isinstance(date_val, str):
            date_val = datetime.date.fromisoformat(date_val)
        day = date_val.day
        suffix = (
            "th" if 10 <= day % 100 <= 20
            else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        )
        return f"{date_val.strftime('%A')}, {day}{suffix} {date_val.strftime('%B')} {date_val.year}"
    except Exception:
        return str(date_val)


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
        target_w = int(width * 3.78)  # mm to pixels approx
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


# ---------------------------------------------------------------------------
# Paragraph helper
# ---------------------------------------------------------------------------

def make_para(styles):
    def para(text, size=9, bold=False, color=DGRAY, align=TA_LEFT):
        return Paragraph(str(text), ParagraphStyle(
            "p", parent=styles["Normal"],
            fontSize=size,
            fontName="Helvetica-Bold" if bold else "Helvetica",
            textColor=color,
            alignment=align,
            leading=size + 3,
        ))
    return para


# ---------------------------------------------------------------------------
# Section label helper
# ---------------------------------------------------------------------------

def section_label_row(para, text, col_width):
    tbl = Table([[para(f"  {text}", 7, bold=True, color=WHITE)]], colWidths=[col_width])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), BLUE),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return tbl


# ---------------------------------------------------------------------------
# PDF View
# ---------------------------------------------------------------------------

class StudentReportPDFView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        term = request.query_params.get("term")
        if not term:
            from rest_framework.response import Response
            return Response({"error": "term is required"}, status=400)

        student = get_object_or_404(Student, id=student_id)
        results = Result.objects.filter(student=student, term=term).select_related("subject")
        report  = Report.objects.filter(student=student, term=term).first()

        level         = getattr(student.school_class, "level", "basic_7_9") if student.school_class else "basic_7_9"
        thresholds    = get_thresholds(level)
        show_position = level != "nursery_kg"
        school_name   = SCHOOL_NAMES.get(level, "LEADING STARS ACADEMY")
        school_motto  = SCHOOL_MOTTOS.get(level, "WHERE LEADERS ARE BORN")
        interp_rows   = INTERP_ROWS_B79 if level == "basic_7_9" else INTERP_ROWS_B16

        term_attendance = Attendance.objects.filter(student=student, term=term)
        total_days      = term_attendance.count()
        present_days    = term_attendance.filter(status__in=["present", "late"]).count()
        att_percent     = round((present_days / total_days) * 100) if total_days else 0

        subjects    = []
        total_score = 0

        for r in results:
            score         = r.score or 0
            grade, remark = get_grade_and_remark(score, thresholds)
            subjects.append({
                "name":     r.subject.name,
                "reopen":   r.reopen,
                "ca":       r.ca,
                "exams":    r.exams,
                "score":    score,
                "grade":    grade,
                "remark":   remark,
                "position": r.subject_position if show_position else None,
            })
            total_score += score

        subject_count = len(subjects)
        average       = round(total_score / subject_count, 1) if subject_count else 0
        overall_grade = get_overall_grade(average, thresholds)

        class_students = Student.objects.filter(school_class=student.school_class)
        student_totals = []
        for s in class_students:
            s_res = Result.objects.filter(student=s, term=term)
            student_totals.append({
                "student_id": s.id,
                "total":      sum(r.score or 0 for r in s_res),
            })
        ranked   = sorted(student_totals, key=lambda x: x["total"], reverse=True)
        position = next(
            (i + 1 for i, item in enumerate(ranked) if item["student_id"] == student.id),
            None,
        ) if show_position else None

        vacation_date   = getattr(report, "vacation_date",   None) if report else None
        resumption_date = getattr(report, "resumption_date", None) if report else None

        # ── Build PDF ──────────────────────────────────────────────────────
        buffer = BytesIO()
        pdf    = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=12*mm, rightMargin=12*mm,
            topMargin=12*mm, bottomMargin=12*mm,
        )
        styles   = getSampleStyleSheet()
        elements = []
        para     = make_para(styles)

        FULL_W = A4[0] - 24*mm

        # ── Header ────────────────────────────────────────────────────────
        logo_img  = load_image_flowable(LOGO_PATH, width=22*mm, height=22*mm)
        logo_cell = logo_img if logo_img else para("", 9)

        photo_img = None
        if student.photo:
            photo_url = student.photo.url
            if not photo_url.startswith("http"):
                photo_path = os.path.join(settings.MEDIA_ROOT, str(student.photo))
                photo_img  = load_image_flowable(photo_path, width=20*mm, height=22*mm)
            else:
                photo_img = load_image_flowable(photo_url, width=20*mm, height=22*mm)
        photo_cell = photo_img if photo_img else para("", 9)

        school_center = [
            para(school_name,                 15, bold=True,  color=WHITE, align=TA_CENTER),
            para(school_motto,                  7, bold=False, color=colors.HexColor("#93c5fd"), align=TA_CENTER),
            Spacer(1, 2*mm),
            para("TERMINAL REPORT CARD",       11, bold=True,  color=GOLD, align=TA_CENTER),
            para(TERM_LABELS.get(term, term),   8, bold=False, color=colors.HexColor("#e0f2fe"), align=TA_CENTER),
        ]

        header_table = Table([[logo_cell, school_center, photo_cell]], colWidths=[25*mm, 136*mm, 25*mm])
        header_table.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN",         (0, 0), (0,  0),  "LEFT"),
            ("ALIGN",         (2, 0), (2,  0),  "RIGHT"),
            ("BACKGROUND",    (0, 0), (-1, -1), BLUE),
            ("BOX",           (0, 0), (-1, -1), 0, WHITE),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (0,  0),  6),
            ("RIGHTPADDING",  (2, 0), (2,  0),  6),
        ]))
        elements.append(header_table)

        accent = Table([[""]],  colWidths=[FULL_W])
        accent.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), GOLD),
            ("TOPPADDING",    (0, 0), (-1, -1), 1.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))
        elements.append(accent)
        elements.append(Spacer(1, 4*mm))

        # ── Student Info ──────────────────────────────────────────────────
        class_name    = student.school_class.name if student.school_class else "-"
        position_text = (
            f"<b>POSITION:</b>  {fmt_pos(position)} out of {len(ranked)}"
            if show_position else "<b>POSITION:</b>  N/A"
        )

        avg_color = GREEN if average >= 60 else (GOLD if average >= 45 else RED)

        info_rows = [
            [
                para(f"<b>NAME:</b>  {student.full_name}", 9),
                para(f"<b>TOTAL MARKS:</b>  {round(total_score, 1)}", 9, color=BLUE2),
            ],
            [
                para(f"<b>STAGE:</b>  {class_name}", 9),
                para(f"<b>AVERAGE:</b>  {average}  |  <b>GRADE:</b>  {overall_grade}", 9, color=avg_color),
            ],
            [
                para(f"<b>PUPILS ON ROLL:</b>  {len(ranked)}", 9),
                para(f"<b>TERM:</b>  {TERM_LABELS.get(term, term)}", 9),
            ],
            [
                para(f"<b>ADMISSION NO:</b>  {student.admission_number}", 9),
                para(position_text, 9, color=BLUE2),
            ],
        ]
        info_table = Table(info_rows, colWidths=[93*mm, 93*mm])
        info_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), GRAY),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("BOX",           (0, 0), (-1, -1), 0.8, DIVIDER),
            ("GRID",          (0, 0), (-1, -1), 0.4, DIVIDER),
            ("ROWBACKGROUNDS",(0, 0), (-1, -1), [WHITE, GRAY]),
            ("LINEBEFORE",    (0, 0), (0, -1),  3, BLUE),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 4*mm))

        # ── Subject Table ─────────────────────────────────────────────────
        elements.append(section_label_row(para, "ACADEMIC PERFORMANCE", FULL_W))
        elements.append(Spacer(1, 1*mm))

        subj_header = [
            para("  SUBJECT",        8, bold=True, color=WHITE),
            para("RE-OPEN\n& RDA 20%", 7, bold=True, color=WHITE, align=TA_CENTER),
            para("CA/MGT\n40%",        7, bold=True, color=WHITE, align=TA_CENTER),
            para("EXAMS\n40%",         7, bold=True, color=WHITE, align=TA_CENTER),
            para("TOTAL\n100%",        7, bold=True, color=WHITE, align=TA_CENTER),
            para("GRADE",              7, bold=True, color=WHITE, align=TA_CENTER),
            para("REMARK",             7, bold=True, color=WHITE, align=TA_CENTER),
        ]
        if show_position:
            subj_header.insert(5, para("POS.", 7, bold=True, color=WHITE, align=TA_CENTER))

        col_widths = (
            [50*mm, 17*mm, 17*mm, 17*mm, 17*mm, 13*mm, 13*mm, 30*mm]
            if show_position else
            [54*mm, 19*mm, 19*mm, 19*mm, 19*mm, 14*mm, 36*mm]
        )

        subj_rows = [subj_header]
        for i, sub in enumerate(subjects):
            score_color = GREEN if sub["score"] >= 60 else (GOLD if sub["score"] >= 45 else RED)
            row = [
                para(f"  {sub['name']}",              8),
                para(str(sub["reopen"]),               8, align=TA_CENTER),
                para(str(sub["ca"]),                   8, align=TA_CENTER),
                para(str(sub["exams"]),                8, align=TA_CENTER),
                para(f'<b>{sub["score"]}</b>',         8, color=score_color, align=TA_CENTER),
                para(f'<b>{sub["grade"]}</b>',         8, color=BLUE2, align=TA_CENTER),
                para(sub["remark"],                    7, align=TA_CENTER),
            ]
            if show_position:
                row.insert(5, para(str(sub["position"] or "-"), 8, align=TA_CENTER))
            subj_rows.append(row)

        subj_table = Table(subj_rows, colWidths=col_widths)
        subj_table.setStyle(TableStyle([
            ("BACKGROUND",     (0, 0),  (-1, 0),  BLUE),
            ("TOPPADDING",     (0, 0),  (-1, 0),  6),
            ("BOTTOMPADDING",  (0, 0),  (-1, 0),  6),
            ("GRID",           (0, 0),  (-1, -1), 0.4, DIVIDER),
            ("BOX",            (0, 0),  (-1, -1), 0.8, DIVIDER),
            ("TOPPADDING",     (0, 1),  (-1, -1), 5),
            ("BOTTOMPADDING",  (0, 1),  (-1, -1), 5),
            ("LEFTPADDING",    (0, 0),  (-1, -1), 4),
            ("VALIGN",         (0, 0),  (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1),  (-1, -1), [WHITE, MGRAY]),
            ("BACKGROUND",     (4, 1),  (4, -1),  colors.HexColor("#f0f9ff")),
        ]))
        elements.append(subj_table)
        elements.append(Spacer(1, 4*mm))

        # ── Attendance + Remarks ──────────────────────────────────────────
        att_label = section_label_row(para, "ATTENDANCE & CONDUCT", 90*mm)
        rem_label = section_label_row(para, "CLASS TEACHER REMARKS", 90*mm)

        att_rows = []
        if total_days > 0:
            att_rows.append([para(f"Days Present:", 8, bold=True, color=BLUE2),
                             para(f"{present_days} / {total_days}  ({att_percent}%)", 8)])
            att_rows.append([para("Days Absent:", 8, bold=True, color=BLUE2),
                             para(f"{total_days - present_days}", 8, color=RED if (total_days - present_days) > 3 else DGRAY)])
        else:
            att_rows.append([para("Attendance:", 8, bold=True, color=BLUE2),
                             para("No data recorded.", 8, color=LGRAY)])

        if report:
            if report.conduct:
                att_rows.append([para("Attitude:", 8, bold=True, color=BLUE2),
                                 para(report.conduct, 8)])
            if report.interest:
                att_rows.append([para("Interest:", 8, bold=True, color=BLUE2),
                                 para(report.interest, 8)])

        if vacation_date:
            att_rows.append([para("Vacation:", 8, bold=True, color=GREEN),
                             para(fmt_date(vacation_date), 8, color=GREEN)])
        if resumption_date:
            att_rows.append([para("Resumes:", 8, bold=True, color=GREEN),
                             para(fmt_date(resumption_date), 8, color=GREEN)])

        att_inner = Table(att_rows, colWidths=[28*mm, 58*mm])
        att_inner.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("LINEBELOW",     (0, 0), (-1, -2), 0.3, DIVIDER),
        ]))

        rem_rows = []
        if report and report.teacher_remark:
            rem_rows.append([para(f'"{report.teacher_remark}"', 9, color=DGRAY)])
        else:
            rem_rows.append([para("No remarks recorded.", 9, color=LGRAY)])

        rem_inner = Table(rem_rows, colWidths=[86*mm])
        rem_inner.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ]))

        att_block = Table([[att_label], [att_inner]], colWidths=[90*mm])
        att_block.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
            ("BOX",           (0, 0), (-1, -1), 0.8, DIVIDER),
            ("BACKGROUND",    (0, 1), (-1, -1), GRAY),
        ]))

        rem_block = Table([[rem_label], [rem_inner]], colWidths=[90*mm])
        rem_block.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
            ("BOX",           (0, 0), (-1, -1), 0.8, DIVIDER),
            ("BACKGROUND",    (0, 1), (-1, -1), GRAY),
        ]))

        bottom_table = Table([[att_block, rem_block]], colWidths=[93*mm, 93*mm])
        bottom_table.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(bottom_table)
        elements.append(Spacer(1, 4*mm))

        # ── Result Interpretation ─────────────────────────────────────────
        elements.append(section_label_row(para, "RESULT INTERPRETATION KEY", FULL_W))
        elements.append(Spacer(1, 1*mm))

        interp_data = []
        for row in interp_rows:
            interp_data.append([
                para(f"  {row[0]}", 7, color=DGRAY),
                para(row[1],        7, color=DGRAY, align=TA_CENTER),
                para(row[2],        7, color=DGRAY, align=TA_RIGHT),
            ])

        interp_table = Table(interp_data, colWidths=[62*mm, 62*mm, 62*mm])
        interp_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), MGRAY),
            ("BOX",           (0, 0), (-1, -1), 0.8, DIVIDER),
            ("GRID",          (0, 0), (-1, -1), 0.3, DIVIDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS",(0, 0), (-1, -1), [WHITE, MGRAY]),
        ]))
        elements.append(interp_table)

        # ── Footer ────────────────────────────────────────────────────────
        elements.append(Spacer(1, 4*mm))
        elements.append(HRFlowable(width="100%", thickness=0.6, color=DIVIDER))
        elements.append(Spacer(1, 2*mm))
        elements.append(para(
            "This report was generated automatically by the School Management System.  "
            "Please contact the school for any queries.",
            7, color=LGRAY, align=TA_CENTER,
        ))

        pdf.build(elements)
        pdf_data = buffer.getvalue()
        buffer.close()  # ← free memory immediately

        name_slug = student.student_name.strip().replace(" ", "_")
        if not name_slug:
            name_slug = student.admission_number

        safe_name = re.sub(r'[^A-Za-z0-9_-]+', '_', name_slug).strip("_")
        filename  = f"report_{safe_name}_{term}.pdf"

        response = HttpResponse(pdf_data, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"; filename*=UTF-8\'\'{quote(filename)}'
        )
        return response
