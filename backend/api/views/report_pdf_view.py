"""
report_pdf_view.py
backend/api/views/report_pdf_view.py
"""

import io
import os
import re
import threading
from io import BytesIO
from urllib.parse import quote

import requests
from PIL import Image as PilImage, ImageOps

from django.conf import settings
from django.db import ProgrammingError
from django.db.models import Count, Q
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.students.models import Student
from apps.results.models import Result, Report
from apps.attendance.models import Attendance

from .grades import (
    has_promotion_fields,
    SCHOOL_NAMES,
    SCHOOL_MOTTOS,
    TERM_LABELS,
    get_thresholds,
    get_grade_and_remark,
    get_overall_grade,
    get_interp_rows,
    fmt_date,
)
from .result_view import assign_subject_positions
from apps.results.views import format_position

# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------
BLUE = colors.HexColor("#1e3a5f")
BLUE2 = colors.HexColor("#1d4ed8")
LBLUE = colors.HexColor("#dbeafe")
MBLUE = colors.HexColor("#bfdbfe")
GRAY = colors.HexColor("#f8fafc")
MGRAY = colors.HexColor("#f1f5f9")
DGRAY = colors.HexColor("#374151")
LGRAY = colors.HexColor("#9ca3af")
WHITE = colors.white
GOLD = colors.HexColor("#b45309")
GOLD2 = colors.HexColor("#fef3c7")
GREEN = colors.HexColor("#15803d")
LGREEN = colors.HexColor("#dcfce7")
RED = colors.HexColor("#dc2626")
LRED = colors.HexColor("#fee2e2")
BLACK = colors.HexColor("#111827")
DIVIDER = colors.HexColor("#e2e8f0")
ACCENT = colors.HexColor("#0369a1")

LOGO_PATH = os.path.join(settings.BASE_DIR, "static", "images", "logo.jpeg")

# ---------------------------------------------------------------------------
# Logo cache — loaded once at module level, thread-safe
# ---------------------------------------------------------------------------
_logo_cache: bytes | None = None
_logo_lock = threading.Lock()


def _get_logo_bytes() -> bytes | None:
    """Load logo bytes from file system, caching at module level"""
    global _logo_cache
    if _logo_cache is not None:
        return _logo_cache
    with _logo_lock:
        if _logo_cache is not None:
            return _logo_cache
        if not os.path.exists(LOGO_PATH):
            return None
        try:
            with open(LOGO_PATH, "rb") as f:
                _logo_cache = f.read()
        except OSError:
            return None
        return _logo_cache


# ---------------------------------------------------------------------------
# Image loading — EXIF-corrected, memory-safe resize
# ---------------------------------------------------------------------------

def load_image_flowable(path_or_url: str, width: float, height: float) -> Image | None:
    """
    Loads an image from a local path or URL, corrects EXIF orientation,
    resizes to target dimensions, and returns a ReportLab Image flowable.
    Returns None on any failure so callers can fall back gracefully.
    """
    try:
        if path_or_url.startswith(("http://", "https://")):
            resp = requests.get(path_or_url, timeout=10, stream=True)
            resp.raise_for_status()
            raw = BytesIO()
            for chunk in resp.iter_content(chunk_size=8192):
                raw.write(chunk)
            raw.seek(0)
        elif os.path.exists(path_or_url):
            raw = BytesIO(open(path_or_url, "rb").read())
        else:
            return None

        pil = PilImage.open(raw)
        pil = ImageOps.exif_transpose(pil)
        target_w = int(width * 3.78)
        target_h = int(height * 3.78)
        pil.thumbnail((target_w, target_h), PilImage.LANCZOS)
        if pil.mode in ("RGBA", "P", "CMYK", "LA", "L"):
            pil = pil.convert("RGB")
        out = BytesIO()
        pil.save(out, format="JPEG", quality=75, optimize=True)
        pil.close()
        out.seek(0)
        return Image(out, width=width, height=height)
    except Exception:
        return None


def load_logo_flowable(width: float, height: float) -> Image | None:
    """Uses the module-level cache for the school logo."""
    raw = _get_logo_bytes()
    if raw is None:
        return None
    try:
        pil = PilImage.open(BytesIO(raw))
        pil = ImageOps.exif_transpose(pil)
        target_w = int(width * 3.78)
        target_h = int(height * 3.78)
        pil.thumbnail((target_w, target_h), PilImage.LANCZOS)
        if pil.mode in ("RGBA", "P", "CMYK", "LA", "L"):
            pil = pil.convert("RGB")
        out = BytesIO()
        pil.save(out, format="JPEG", quality=75, optimize=True)
        pil.close()
        out.seek(0)
        return Image(out, width=width, height=height)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# ReportLab helpers
# ---------------------------------------------------------------------------

def make_para(styles):
    """Create a paragraph helper function with given styles"""
    def para(text, size=9, bold=False, color=DGRAY, align=TA_LEFT):
        return Paragraph(str(text), ParagraphStyle(
            "p", parent=styles["Normal"], fontSize=size,
            fontName="Helvetica-Bold" if bold else "Helvetica",
            textColor=color, alignment=align, leading=size + 3,
        ))
    return para


def section_label_row(para, text: str, col_width: float) -> Table:
    """Create a section header row with blue background"""
    tbl = Table([[para(f" {text}", 7, bold=True, color=WHITE)]], colWidths=[col_width])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return tbl


# ---------------------------------------------------------------------------
# Report-fetching helper (mirrors report_view.py logic)
# ---------------------------------------------------------------------------

def _fetch_report(student, term: str, year: int):
    """
    Fetches the Report for (student, term, year).
    Returns (report_instance | None, has_promotion_fields: bool).
    """
    has_promo = has_promotion_fields()

    base_fields = [
        "id", "student", "term", "year", "attendance", "attendance_total",
        "interest", "conduct", "teacher_remark", "vacation_date", "resumption_date",
    ]
    report_fields = base_fields + (["promotion_status", "next_class"] if has_promo else [])

    qs = Report.objects.filter(student=student, term=term, year=year).only(*report_fields)
    if has_promo:
        qs = qs.select_related("next_class").only(*report_fields, "next_class__name")

    try:
        report = qs.first()
        return report, has_promo
    except ProgrammingError as exc:
        if "promotion_status" in str(exc) or "next_class" in str(exc):
            fallback_qs = Report.objects.filter(student=student, term=term, year=year).only(*base_fields)
            return fallback_qs.first(), False
        raise


# ---------------------------------------------------------------------------
# Score helper
# ---------------------------------------------------------------------------

def _computed_score(result: Result) -> float:
    """
    Returns the subject total computed live from reopen+ca+exams, rather
    than trusting the persisted `score` column.

    Result.save() is supposed to guarantee score == reopen+ca+exams on
    every write, but a handful of rows in production have been found with
    a stale/mismatched `score` (most likely written via a raw-SQL data fix,
    an old pre-migration formula, or a duplicate row for the same
    student+subject+term+year under a different school_class — the model's
    unique_together does not include school_class, so that's possible).

    Recomputing here means the report/PDF can never display a total that
    doesn't match the visible reopen/ca/exams breakdown, regardless of what
    ended up in the database. This does NOT fix the underlying bad row —
    see scripts/repair_result_scores.py (or the management command) to find
    and correct those at the source.
    """
    return round((result.reopen or 0.0) + (result.ca or 0.0) + (result.exams or 0.0), 1)


# ---------------------------------------------------------------------------
# PDF View
# ---------------------------------------------------------------------------

class StudentReportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        # ── Parameter validation ───────────────────────────────────────
        term = request.query_params.get("term")
        if not term:
            return Response({"error": "term is required"}, status=400)

        raw_year = request.query_params.get("year")
        if raw_year:
            try:
                year = int(raw_year)
            except (TypeError, ValueError):
                return Response({"error": "year must be a valid integer"}, status=400)
        else:
            year = getattr(settings, "CURRENT_YEAR", timezone.now().year)

        # ── Data fetching ─────────────────────────────────────────────
        student = get_object_or_404(
            Student.objects.select_related("school_class"), id=student_id,
        )

        results = (
            Result.objects
            .filter(student=student, term=term, year=year)
            .select_related("subject")
        )

        report, has_promo = _fetch_report(student, term, year)

        level = getattr(student.school_class, "level", "basic_7_9") if student.school_class else "basic_7_9"
        thresholds = get_thresholds(level)
        show_position = level != "nursery_kg"
        school_name = SCHOOL_NAMES.get(level, "LEADING STARS ACADEMY")
        school_motto = SCHOOL_MOTTOS.get(level, "WHERE LEADERS ARE BORN")
        interp_rows = get_interp_rows(level)

        # ── Attendance — single aggregate ───────────────────────────────
        att = (
            Attendance.objects
            .filter(student=student, term=term, year=year)
            .aggregate(
                total=Count("id"),
                present=Count("id", filter=Q(status__in=["present", "late"])),
            )
        )
        total_days = att["total"] or 0
        present_days = att["present"] or 0
        att_percent = round((present_days / total_days) * 100) if total_days else 0

        # ── Subjects ─────────────────────────────────────────────────
        subjects = []
        total_score = 0.0

        class_results = []
        if show_position and results:
            # Group by the school_class each result was actually recorded
            # under for this term/year — NOT student.school_class, which
            # reflects the student's CURRENT class. After an end-of-term
            # promotion these can differ (e.g. promoted Basic 2 → Basic 3,
            # but their term3 results still belong to Basic 2), and
            # filtering by the current class silently returns zero
            # class_results, dropping subject positions for every
            # promoted student.
            result_class_ids = {
                r.school_class_id for r in results if r.school_class_id is not None
            }
            if result_class_ids:
                class_results = list(
                    Result.objects
                    .filter(
                        school_class_id__in=result_class_ids,
                        term=term,
                        year=year,
                    )
                    .select_related("subject")
                )
            if class_results:
                assign_subject_positions(class_results)
                positions = {r.id: r.subject_position for r in class_results}
                for r in results:
                    r.subject_position = positions.get(r.id)

        for r in results:
            # FIX: recompute from components instead of trusting r.score,
            # which has been found to be stale/out-of-sync for some rows.
            # See _computed_score() docstring for why.
            score = int(round(_computed_score(r)))
            grade, remark = get_grade_and_remark(score, thresholds)
            subjects.append({
                "name": r.subject.name,
                "reopen": r.reopen,
                "ca": r.ca,
                "exams": r.exams,
                "score": score,
                "grade": grade,
                "remark": remark,
                "position": format_position(r.subject_position) if show_position and r.subject_position is not None else None,
            })
            total_score += score

        subject_count = len(subjects)
        average = round(total_score / subject_count) if subject_count else 0
        overall_grade = get_overall_grade(average, thresholds)

        # ── Class roll count + overall position ─────────────────────────
        # Overall class position was previously hardcoded to "removed" here
        # (position=None). Restored below: ranked by each student's average,
        # computed the same way as this student's own `average` above
        # (int(round(_computed_score)) per subject, then averaged), so the
        # PDF's own average and its rank never disagree. Uses competition
        # ranking — same tie convention as recompute_subject_positions()/
        # assign_subject_positions().
        position = None
        position_formatted = "N/A"

        if show_position and student.school_class:
            # Prefer the actual headcount of students who have results in
            # class_results (the class they were in for this term/year) —
            # this can differ from their CURRENT class roster after an
            # end-of-term promotion. Falls back to the current roster only
            # when there are no results to count from.
            if class_results:
                out_of = len({r.student_id for r in class_results})
            else:
                out_of = Student.objects.filter(school_class=student.school_class).count()

            if class_results:
                totals: dict[int, list[int]] = {}
                for r in class_results:
                    totals.setdefault(r.student_id, []).append(int(round(_computed_score(r))))

                averages = [
                    (sid, round(sum(scores) / len(scores)))
                    for sid, scores in totals.items() if scores
                ]
                averages.sort(key=lambda pair: (-pair[1], pair[0]))

                current_rank = 0
                prev_avg = object()
                class_positions = {}
                for i, (sid, avg) in enumerate(averages):
                    if avg != prev_avg:
                        current_rank = i + 1
                        prev_avg = avg
                    class_positions[sid] = current_rank

                position = class_positions.get(student.id)
                if position is not None:
                    position_formatted = format_position(position)
        else:
            out_of = 0

        # ── Promotion fields ──────────────────────────────────────────
        vacation_date = None
        resumption_date = None
        promotion_status = None
        next_class_name = None

        if report:
            vacation_date = report.vacation_date
            resumption_date = report.resumption_date

            if has_promo:
                promotion_status = getattr(report, "promotion_status", None)
                if promotion_status:
                    promotion_status = promotion_status.capitalize()

                next_class = getattr(report, "next_class", None)
                if next_class:
                    next_class_name = next_class.name

        # ── Build PDF ────────────────────────────────────────────────
        buffer, pdf_size = build_pdf(
            student=student,
            subjects=subjects,
            average=average,
            overall_grade=overall_grade,
            total_score=total_score,
            out_of=out_of,
            position_formatted=position_formatted,
            present_days=present_days,
            total_days=total_days,
            att_percent=att_percent,
            report=report,
            term=term,
            year=year,
            level=level,
            show_position=show_position,
            school_name=school_name,
            school_motto=school_motto,
            interp_rows=interp_rows,
            vacation_date=vacation_date,
            resumption_date=resumption_date,
            promotion_status=promotion_status,
            next_class_name=next_class_name,
        )

        name_slug = re.sub(r"[^A-Za-z0-9_-]+", "_", student.full_name.strip()).strip("_")
        if not name_slug:
            name_slug = str(student.admission_number)
        filename = f"report_{name_slug}_{term}_{year}.pdf"

        response = StreamingHttpResponse(
            iter([buffer.getvalue()]), content_type="application/pdf"
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"; filename*=UTF-8\'\'{quote(filename)}'
        )
        response["Content-Length"] = pdf_size
        return response


# ---------------------------------------------------------------------------
# PDF Building Function
# ---------------------------------------------------------------------------

def build_pdf(
    student, subjects, average, overall_grade, total_score, out_of,
    present_days, total_days, att_percent, report, term, year, level,
    show_position, position_formatted, school_name, school_motto, interp_rows,
    vacation_date, resumption_date, promotion_status, next_class_name,
):
    """Build the complete PDF and return (BytesIO buffer, size)"""
    buffer = BytesIO()
    pdf = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=12 * mm, rightMargin=12 * mm,
        topMargin=12 * mm, bottomMargin=12 * mm,
    )
    styles = getSampleStyleSheet()
    elements = []
    para = make_para(styles)
    FULL_W = A4[0] - 24 * mm

    # ── Header ──────────────────────────────────────────────────────
    logo_cell = load_logo_flowable(width=22 * mm, height=22 * mm) or para("", 9)

    photo_img = None
    if student.photo:
        photo_url = student.photo.url
        photo_path = (
            os.path.join(settings.MEDIA_ROOT, str(student.photo))
            if not photo_url.startswith("http") else None
        )
        photo_img = load_image_flowable(photo_path or photo_url, width=20 * mm, height=22 * mm)
    photo_cell = photo_img or para("", 9)

    school_center = [
        para(school_name, 15, bold=True, color=WHITE, align=TA_CENTER),
        para(school_motto, 7, bold=False, color=colors.HexColor("#93c5fd"), align=TA_CENTER),
        Spacer(1, 2 * mm),
        para("TERMINAL REPORT CARD", 11, bold=True, color=GOLD, align=TA_CENTER),
        para(TERM_LABELS.get(term, term), 8, bold=False, color=colors.HexColor("#e0f2fe"), align=TA_CENTER),
    ]

    header_table = Table(
        [[logo_cell, school_center, photo_cell]],
        colWidths=[25 * mm, 136 * mm, 25 * mm],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("BOX", (0, 0), (-1, -1), 0, WHITE),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (0, 0), 6),
        ("RIGHTPADDING", (2, 0), (2, 0), 6),
    ]))
    elements.append(header_table)

    accent = Table([[""]], colWidths=[FULL_W])
    accent.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(accent)
    elements.append(Spacer(1, 4 * mm))

    # ── Student info ────────────────────────────────────────────────
    class_name = student.school_class.name if student.school_class else "-"
    avg_color = GREEN if average >= 60 else (GOLD if average >= 45 else RED)

    promotion_label = promotion_status if promotion_status else "N/A"
    next_class_label = next_class_name if next_class_name else "N/A"

    info_rows = [
        [
            para(f"<b>NAME:</b> {student.full_name}", 9),
            para(f"<b>TOTAL MARKS:</b> {total_score}", 9, color=BLUE2),
        ],
        [
            para(f"<b>STAGE:</b> {class_name}", 9),
            para(f"<b>AVERAGE:</b> {average} | <b>GRADE:</b> {overall_grade}", 9, color=avg_color),
        ],
        [
            para(f"<b>PUPILS ON ROLL:</b> {out_of or '-'}", 9),
            para(f"<b>TERM:</b> {TERM_LABELS.get(term, term)}", 9),
        ],
        [
            para(
                f"<b>POSITION:</b> {position_formatted if show_position else 'N/A'}",
                9, color=BLUE2 if show_position and position_formatted != "N/A" else DGRAY,
            ),
            para("", 9),
        ],
        [
            para(f"<b>ADMISSION NO:</b> {student.admission_number}", 9),
            para("", 9),
        ],
        [
            para(f"<b>PROMOTION STATUS:</b> {promotion_label}", 9, color=GREEN if promotion_status else BLUE2),
            para(f"<b>NEXT CLASS:</b> {next_class_label}", 9, color=BLUE2 if not next_class_name else DGRAY),
        ],
    ]
    info_table = Table(info_rows, colWidths=[93 * mm, 93 * mm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GRAY),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 0.8, DIVIDER),
        ("GRID", (0, 0), (-1, -1), 0.4, DIVIDER),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, GRAY]),
        ("LINEBEFORE", (0, 0), (0, -1), 3, BLUE),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 4 * mm))

    # ── Subject table ───────────────────────────────────────────────
    elements.append(section_label_row(para, "ACADEMIC PERFORMANCE", FULL_W))
    elements.append(Spacer(1, 1 * mm))

    show_subject_position = show_position or any(sub.get("position") is not None for sub in subjects)

    subj_header = [
        para(" SUBJECT", 8, bold=True, color=WHITE),
        para("RE-OPEN\n& RDA 20%", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("CA/MGT\n40%", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("EXAMS\n40%", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("TOTAL\n100%", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("GRADE", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("REMARK", 7, bold=True, color=WHITE, align=TA_CENTER),
    ]
    if show_subject_position:
        subj_header.insert(5, para("POS.", 7, bold=True, color=WHITE, align=TA_CENTER))

    col_widths = (
        [50 * mm, 17 * mm, 17 * mm, 17 * mm, 17 * mm, 13 * mm, 13 * mm, 30 * mm]
        if show_subject_position else
        [54 * mm, 19 * mm, 19 * mm, 19 * mm, 19 * mm, 14 * mm, 36 * mm]
    )

    subj_rows = [subj_header]
    for sub in subjects:
        score_color = GREEN if sub["score"] >= 60 else (GOLD if sub["score"] >= 45 else RED)
        row = [
            para(f" {sub['name']}", 8),
            para(str(sub["reopen"] or "-"), 8, align=TA_CENTER),
            para(str(sub["ca"] or "-"), 8, align=TA_CENTER),
            para(str(sub["exams"] or "-"), 8, align=TA_CENTER),
            para(f'<b>{sub["score"]}</b>', 8, color=score_color, align=TA_CENTER),
            para(f'<b>{sub["grade"]}</b>', 8, color=BLUE2, align=TA_CENTER),
            para(sub["remark"], 7, align=TA_CENTER),
        ]
        if show_subject_position:
            row.insert(5, para(sub["position"] or "-", 8, align=TA_CENTER))
        subj_rows.append(row)

    subj_table = Table(subj_rows, colWidths=col_widths, repeatRows=1)
    subj_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("GRID", (0, 0), (-1, -1), 0.3, DIVIDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, MGRAY]),
        ("BACKGROUND", (4, 1), (4, -1), colors.HexColor("#f0f9ff")),
    ]))
    elements.append(subj_table)

    # ── Attendance + Remarks ───────────────────────────────────────
    att_label = section_label_row(para, "ATTENDANCE & CONDUCT", 90 * mm)
    rem_label = section_label_row(para, "CLASS TEACHER REMARKS", 90 * mm)

    att_rows = []
    if total_days > 0:
        att_rows.append([
            para("Days Present:", 8, bold=True, color=BLUE2),
            para(f"{present_days} / {total_days} ({att_percent}%)", 8),
        ])
        absent = total_days - present_days
        att_rows.append([
            para("Days Absent:", 8, bold=True, color=BLUE2),
            para(str(absent), 8, color=RED if absent > 3 else DGRAY),
        ])
    else:
        att_rows.append([
            para("Attendance:", 8, bold=True, color=BLUE2),
            para("No data recorded.", 8, color=LGRAY),
        ])

    if report:
        if report.conduct:
            att_rows.append([
                para("Attitude:", 8, bold=True, color=BLUE2),
                para(report.conduct, 8),
            ])
        if report.interest:
            att_rows.append([
                para("Interest:", 8, bold=True, color=BLUE2),
                para(report.interest, 8),
            ])
        if vacation_date:
            att_rows.append([
                para("Vacation:", 8, bold=True, color=GREEN),
                para(fmt_date(vacation_date), 8, color=GREEN),
            ])
        if resumption_date:
            att_rows.append([
                para("Resumes:", 8, bold=True, color=GREEN),
                para(fmt_date(resumption_date), 8, color=GREEN),
            ])

    att_inner = Table(att_rows, colWidths=[28 * mm, 58 * mm])
    att_inner.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, DIVIDER),
    ]))

    teacher_remark = report.teacher_remark if report and report.teacher_remark else None
    rem_rows = [[
        para(f'"{teacher_remark}"', 9, color=DGRAY) if teacher_remark
        else para("No remarks recorded.", 9, color=LGRAY)
    ]]
    rem_inner = Table(rem_rows, colWidths=[86 * mm])
    rem_inner.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))

    att_block = Table([[att_label], [att_inner]], colWidths=[90 * mm])
    att_block.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOX", (0, 0), (-1, -1), 0.8, DIVIDER),
        ("BACKGROUND", (0, 1), (-1, -1), GRAY),
    ]))
    rem_block = Table([[rem_label], [rem_inner]], colWidths=[90 * mm])
    rem_block.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOX", (0, 0), (-1, -1), 0.8, DIVIDER),
        ("BACKGROUND", (0, 1), (-1, -1), GRAY),
    ]))

    bottom_table = Table([[att_block, rem_block]], colWidths=[93 * mm, 93 * mm])
    bottom_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(bottom_table)
    elements.append(Spacer(1, 4 * mm))

    # ── Result interpretation ─────────────────────────────────────
    elements.append(section_label_row(para, "RESULT INTERPRETATION KEY", FULL_W))
    elements.append(Spacer(1, 1 * mm))

    interp_data = [
        [
            para(f" {row[0]}", 7, color=DGRAY),
            para(row[1], 7, color=DGRAY, align=TA_CENTER),
            para(row[2], 7, color=DGRAY, align=TA_RIGHT),
        ]
        for row in interp_rows
    ]
    interp_table = Table(interp_data, colWidths=[62 * mm, 62 * mm, 62 * mm])
    interp_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), MGRAY),
        ("BOX", (0, 0), (-1, -1), 0.8, DIVIDER),
        ("GRID", (0, 0), (-1, -1), 0.3, DIVIDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, MGRAY]),
    ]))
    elements.append(interp_table)

    # ── Footer ──────────────────────────────────────────────────────
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.6, color=DIVIDER))
    elements.append(Spacer(1, 2 * mm))
    elements.append(para(
        "This report was generated automatically by the School Management System. "
        "Please contact the school for any queries.",
        7, color=LGRAY, align=TA_CENTER,
    ))

    # ── Build and stream ──────────────────────────────────────────
    pdf.build(elements)
    pdf_size = buffer.tell()
    buffer.seek(0)
    return buffer, pdf_size