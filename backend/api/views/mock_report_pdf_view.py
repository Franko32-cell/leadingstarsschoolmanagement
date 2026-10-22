"""
mock_report_pdf_view.py
backend/api/views/mock_report_pdf_view.py

PDF output for Basic 9 mock exams, styled to match the term report card
(school logo, school name + motto, student photo, colour-coded grades).

  GET /mock-report/student/<id>/pdf/?mock=mock1&year=2026   individual report
  GET /mock-report/class/<id>/pdf/?mock=mock1&year=2026     class broadsheet

Best six = English, Mathematics, Social Studies, Integrated Science
+ the student's best two other subjects (see mock_scoring.py).

School name and motto come from SCHOOL_NAMES / SCHOOL_MOTTOS in grades.py (the
same source as the term report). If a class level has no entry there, the first
configured entry is used, so no school name is hard-coded in this file.

Both builders are plain functions (no request object) so other views can
reuse them, same pattern as generate_student_report_pdf().
"""

import os
import re
from html import escape
from io import BytesIO
from urllib.parse import quote

from django.conf import settings
from django.http import Http404, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, SimpleDocTemplate, Spacer, Table, TableStyle

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.results.models import MockResult
from apps.students.models import Student

from .grades import SCHOOL_NAMES, SCHOOL_MOTTOS, get_mock_grade_and_remark
from .mock_scoring import (
    CODE_ORDER, CORE_CODES, compute_mock_aggregate, is_core, mock_interp_bands,
    subject_code,
)
from .report_pdf_view import (
    BLUE, BLUE2, DGRAY, DIVIDER, GOLD, GRAY, GREEN, LBLUE, LGRAY, LGREEN,
    LRED, MBLUE, RED, WHITE,
    load_image_flowable, load_logo_flowable, make_para, section_label_row,
)

# grade -> (text colour, background colour)
GRADE_STYLE = {
    "1": ("#15803d", "#dcfce7"),
    "2": ("#047857", "#d1fae5"),
    "3": ("#1d4ed8", "#dbeafe"),
    "4": ("#0e7490", "#cffafe"),
    "5": ("#a16207", "#fef9c3"),
    "6": ("#c2410c", "#ffedd5"),
    "7": ("#dc2626", "#fee2e2"),
    "8": ("#991b1b", "#fecaca"),
    "9": ("#7f1d1d", "#fca5a5"),
}


def _grade_colors(grade):
    fg_hex, bg_hex = GRADE_STYLE.get(str(grade), ("#374151", "#f1f5f9"))
    return colors.HexColor(fg_hex), colors.HexColor(bg_hex), fg_hex


def _mock_label(mock):
    m = re.fullmatch(r"mock(\d+)", str(mock or ""), flags=re.I)
    return f"Mock {m.group(1)}" if m else str(mock)


def _level_for(school_class):
    return getattr(school_class, "level", "basic_7_9") if school_class else "basic_7_9"


def _school_identity(level):
    """(name, motto) for this class level, falling back to the first configured entry."""
    name = SCHOOL_NAMES.get(level) or next(iter(SCHOOL_NAMES.values()), "SCHOOL")
    motto = SCHOOL_MOTTOS.get(level) or next(iter(SCHOOL_MOTTOS.values()), "")
    return name, motto


def _slug(text, fallback="student"):
    slug = re.sub(r"[^A-Za-z0-9_-]+", "_", (text or "").strip()).strip("_")
    return slug or fallback


def _student_photo(student, width, height):
    if not student.photo:
        return None
    try:
        url = student.photo.url
        path = (
            os.path.join(settings.MEDIA_ROOT, str(student.photo))
            if not url.startswith("http") else None
        )
        return load_image_flowable(path or url, width=width, height=height)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Shared building blocks
# ---------------------------------------------------------------------------

def _page_frame(canvas, doc):
    """Thin page border + small footer on every page."""
    canvas.saveState()
    w, h = doc.pagesize
    canvas.setStrokeColor(MBLUE)
    canvas.setLineWidth(0.8)
    canvas.rect(6 * mm, 6 * mm, w - 12 * mm, h - 12 * mm)
    canvas.setFont("Helvetica", 6.5)
    canvas.setFillColor(LGRAY)
    canvas.drawCentredString(
        w / 2, 8.5 * mm,
        f"Generated {timezone.now().strftime('%d %b %Y')}  |  Page {canvas.getPageNumber()}",
    )
    canvas.restoreState()


def _header_block(para, level, title, subtitle, right_cell, full_w):
    """Logo | school name + motto + title | photo, followed by accent bars."""
    school_name, school_motto = _school_identity(level)

    logo = load_logo_flowable(width=22 * mm, height=22 * mm) or para("", 9)
    center = [
        para(school_name, 15, bold=True, color=BLUE, align=TA_CENTER),
        para(school_motto, 8, bold=True, color=GOLD, align=TA_CENTER),
        Spacer(1, 2 * mm),
        para(title, 11, bold=True, color=BLUE2, align=TA_CENTER),
        para(subtitle, 8, color=DGRAY, align=TA_CENTER),
    ]
    side = 25 * mm
    header = Table([[logo, center, right_cell]], colWidths=[side, full_w - 2 * side, side])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (0, 0), 6),
        ("RIGHTPADDING", (2, 0), (2, 0), 6),
    ]))

    def bar(color, height):
        t = Table([[""]], colWidths=[full_w], rowHeights=[height])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), color)]))
        return t

    return [header, bar(BLUE2, 1.2 * mm), Spacer(1, 0.6 * mm), bar(GOLD, 0.5 * mm), Spacer(1, 4 * mm)]


def _stat_tiles(para, full_w, tiles):
    """tiles: [(label, value, colour, caption), ...]"""
    cells = [[
        [
            para(label, 7, bold=True, color=LGRAY, align=TA_CENTER),
            para(value, 18, bold=True, color=color, align=TA_CENTER),
            para(caption, 6, color=LGRAY, align=TA_CENTER),
        ]
        for label, value, color, caption in tiles
    ]]
    t = Table(cells, colWidths=[full_w / len(tiles)] * len(tiles))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GRAY),
        ("BOX", (0, 0), (-1, -1), 0.5, DIVIDER),
        ("LINEAFTER", (0, 0), (-2, -1), 0.5, DIVIDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _interp_strip(para, full_w):
    """Compact colour-coded grade key: one column per grade."""
    bands = mock_interp_bands()
    head, ranges, remarks, cmds = [], [], [], []
    for i, (grade, rng, remark) in enumerate(bands):
        fg, bg, _ = _grade_colors(grade)
        head.append(para(f"<b>{grade}</b>", 9, color=fg, align=TA_CENTER))
        ranges.append(para(rng, 6, color=DGRAY, align=TA_CENTER))
        remarks.append(para(f"<b>{escape(remark)}</b>", 5, color=fg, align=TA_CENTER))
        cmds.append(("BACKGROUND", (i, 0), (i, 0), bg))
    t = Table([head, ranges, remarks], colWidths=[full_w / len(bands)] * len(bands))
    t.setStyle(TableStyle(cmds + [
        ("BOX", (0, 0), (-1, -1), 0.5, DIVIDER),
        ("LINEAFTER", (0, 0), (-2, -1), 0.35, DIVIDER),
        ("LINEBELOW", (0, 0), (-1, 0), 0.35, DIVIDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


def _note_box(para, full_w, text, warn=False):
    t = Table([[para(text, 7, color=RED if warn else DGRAY)]], colWidths=[full_w])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LRED if warn else LBLUE),
        ("BOX", (0, 0), (-1, -1), 0.4, DIVIDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


RULE_TEXT = (
    "<b>Best six:</b> English Language, Mathematics, Social Studies and Integrated Science, "
    "plus the best two other subjects. <b>Aggregate</b> is the sum of the six grades (lower is better)."
)


# ---------------------------------------------------------------------------
# Individual student report
# ---------------------------------------------------------------------------

def generate_mock_student_pdf(student_id, mock, year):
    """Returns (buffer, size, filename). Raises Http404 if nothing to report."""
    student = get_object_or_404(
        Student.objects.select_related("school_class"), id=student_id,
    )
    results = list(
        MockResult.objects
        .filter(student=student, mock=mock, year=year)
        .select_related("subject", "school_class")
    )
    if not results:
        raise Http404("No mock results found for this student.")

    agg = compute_mock_aggregate([{"subject": r.subject.name, "score": r.score} for r in results])
    best = set(agg["best_six_subjects"])

    mock_label = _mock_label(mock)
    result_class = next((r.school_class for r in results if getattr(r, "school_class", None)), None)
    class_name = (
        result_class.name if result_class
        else (student.school_class.name if student.school_class else "-")
    )
    level = _level_for(result_class or student.school_class)

    # Rows: core subjects first (fixed order), then the rest by score
    items = []
    for r in results:
        name = r.subject.name
        score = float(r.score)
        grade, remark = get_mock_grade_and_remark(score)
        code = subject_code(name)
        items.append({
            "subject": name, "score": score, "grade": str(grade), "remark": remark,
            "core": code in CORE_CODES, "order": CODE_ORDER.get(code, 99),
        })
    items.sort(key=lambda i: (0, i["order"]) if i["core"] else (1, -i["score"]))

    buffer = BytesIO()
    pdf = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=12 * mm, rightMargin=12 * mm, topMargin=12 * mm, bottomMargin=14 * mm,
        title=f"{mock_label} Report - {student.full_name}",
        author=_school_identity(level)[0],
    )
    para = make_para(getSampleStyleSheet())
    FULL_W = A4[0] - 24 * mm
    el = []

    photo = _student_photo(student, 20 * mm, 22 * mm) or para("", 9)
    el += _header_block(
        para, level, "MOCK EXAMINATION REPORT", f"{mock_label}  |  {year}", photo, FULL_W,
    )

    # Student details
    info = Table([
        [para(f"<b>NAME:</b> {escape(student.full_name)}", 9),
         para(f"<b>CLASS:</b> {escape(class_name)}", 9)],
        [para(f"<b>ADMISSION NO:</b> {escape(str(student.admission_number))}", 9),
         para(f"<b>EXAMINATION:</b> {mock_label} ({year})", 9)],
    ], colWidths=[93 * mm, 93 * mm])
    info.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.35, DIVIDER),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, GRAY]),
    ]))
    el += [info, Spacer(1, 4 * mm)]

    # Headline numbers
    total_txt = f"{agg['raw_total']:g}"
    aggr_txt = str(agg["aggregate"]) + ("*" if not agg["complete"] else "")
    el.append(_stat_tiles(para, FULL_W, [
        ("BEST-SIX TOTAL", total_txt, BLUE2, "out of 600"),
        ("AGGREGATE", aggr_txt, GREEN if agg["complete"] else RED, "lower is better (6 = best)"),
        ("SUBJECTS SCORED", str(len(items)), BLUE, "subjects with a score"),
    ]))
    el.append(Spacer(1, 4 * mm))

    # Subject table
    el.append(section_label_row(para, "ACADEMIC PERFORMANCE", FULL_W))
    el.append(Spacer(1, 1 * mm))

    head = [
        para(" SUBJECT", 8, bold=True, color=WHITE),
        para("TYPE", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("SCORE\n/100", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("GRADE", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("REMARK", 7, bold=True, color=WHITE, align=TA_CENTER),
        para("IN BEST 6", 7, bold=True, color=WHITE, align=TA_CENTER),
    ]
    data, cmds = [head], []
    for idx, it in enumerate(items, start=1):
        fg, bg, _ = _grade_colors(it["grade"])
        in_best = it["subject"] in best
        data.append([
            para(f" {escape(it['subject'])}", 8, bold=in_best),
            para("CORE" if it["core"] else "OTHER", 7, bold=True,
                 color=BLUE2 if it["core"] else LGRAY, align=TA_CENTER),
            para(f"<b>{it['score']:g}</b>", 9, align=TA_CENTER),
            para(f"<b>{it['grade']}</b>", 9, color=fg, align=TA_CENTER),
            para(escape(it["remark"]), 7, align=TA_CENTER),
            para("YES" if in_best else "-", 7, bold=in_best,
                 color=GREEN if in_best else LGRAY, align=TA_CENTER),
        ])
        cmds.append(("BACKGROUND", (3, idx), (3, idx), bg))
        if in_best:
            cmds.append(("BACKGROUND", (5, idx), (5, idx), LGREEN))

    subj_table = Table(data, colWidths=[62 * mm, 22 * mm, 20 * mm, 20 * mm, 40 * mm, 22 * mm], repeatRows=1)
    subj_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("LINEBELOW", (0, 1), (-1, -1), 0.35, DIVIDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY]),
    ] + cmds))
    el += [subj_table, Spacer(1, 4 * mm)]

    if agg["core_missing"]:
        el.append(_note_box(
            para, FULL_W,
            "<b>* Provisional aggregate.</b> No score recorded for: "
            + ", ".join(agg["core_missing"]) + ". All four core subjects must be scored for a final aggregate.",
            warn=True,
        ))
    else:
        el.append(_note_box(para, FULL_W, RULE_TEXT))
    el.append(Spacer(1, 4 * mm))

    # Interpretation key
    el.append(section_label_row(para, "GRADE INTERPRETATION KEY", FULL_W))
    el.append(Spacer(1, 1 * mm))
    el.append(_interp_strip(para, FULL_W))

    # Signatures
    sig = Table(
        [["", "", ""],
         [para("Class Teacher's Signature", 7, color=LGRAY, align=TA_CENTER), "",
          para("Head Teacher's Signature", 7, color=LGRAY, align=TA_CENTER)]],
        colWidths=[70 * mm, 46 * mm, 70 * mm], rowHeights=[14 * mm, None],
    )
    sig.setStyle(TableStyle([
        ("LINEABOVE", (0, 1), (0, 1), 0.6, LGRAY),
        ("LINEABOVE", (2, 1), (2, 1), 0.6, LGRAY),
    ]))
    el += [Spacer(1, 6 * mm), sig, Spacer(1, 4 * mm), HRFlowable(width="100%", thickness=0.6, color=DIVIDER)]
    el.append(Spacer(1, 2 * mm))
    el.append(para(
        "This report was generated automatically by the School Management System. "
        "Please contact the school for any queries.", 7, color=LGRAY, align=TA_CENTER,
    ))

    pdf.build(el, onFirstPage=_page_frame, onLaterPages=_page_frame)
    size = buffer.tell()
    buffer.seek(0)
    filename = f"mock_report_{_slug(student.full_name, str(student.admission_number))}_{mock}_{year}.pdf"
    return buffer, size, filename


# ---------------------------------------------------------------------------
# Class broadsheet
# ---------------------------------------------------------------------------

def generate_mock_class_pdf(class_id, mock, year):
    """Returns (buffer, size, filename). Raises Http404 if the class has no students."""
    students = list(Student.objects.filter(school_class_id=class_id).select_related("school_class"))
    if not students:
        raise Http404("No students found in this class.")
    students.sort(key=lambda s: (s.full_name or "").lower())

    school_class = students[0].school_class
    class_name = school_class.name if school_class else "-"
    level = _level_for(school_class)
    mock_label = _mock_label(mock)

    results = (
        MockResult.objects
        .filter(student_id__in=[s.id for s in students], mock=mock, year=year)
        .select_related("subject")
    )
    by_student = {}
    subject_names = set()
    for r in results:
        by_student.setdefault(r.student_id, {})[r.subject.name] = float(r.score)
        subject_names.add(r.subject.name)
    if not subject_names:
        raise Http404("No mock results found for this class.")

    columns = sorted(subject_names, key=lambda n: (CODE_ORDER.get(subject_code(n), 99), n))

    rows = []
    for s in students:
        smap = by_student.get(s.id, {})
        agg = compute_mock_aggregate([{"subject": n, "score": sc} for n, sc in smap.items()]) if smap else None
        rows.append({"student": s, "name": s.full_name or "", "scores": smap, "agg": agg})

    def sort_key(d):
        a = d["agg"]
        if a is None:
            return (2, 0, 0, d["name"].lower())
        return (0 if a["complete"] else 1, a["aggregate"], -a["raw_total"], d["name"].lower())

    rows.sort(key=sort_key)

    # Ranking: complete students only, ties share a position
    rank, prev = 0, None
    complete_rows = [d for d in rows if d["agg"] and d["agg"]["complete"]]
    for i, d in enumerate(complete_rows):
        key = (d["agg"]["aggregate"], -d["agg"]["raw_total"])
        if key != prev:
            rank, prev = i + 1, key
        d["rank"] = rank

    page = landscape(A4)
    buffer = BytesIO()
    pdf = SimpleDocTemplate(
        buffer, pagesize=page,
        leftMargin=12 * mm, rightMargin=12 * mm, topMargin=12 * mm, bottomMargin=14 * mm,
        title=f"{mock_label} Broadsheet - {class_name}",
        author=_school_identity(level)[0],
    )
    para = make_para(getSampleStyleSheet())
    FULL_W = page[0] - 24 * mm
    el = []

    el += _header_block(
        para, level, "MOCK RESULTS BROADSHEET",
        f"{class_name}  |  {mock_label}  |  {year}", para("", 9), FULL_W,
    )

    # Table
    fixed = 11 * mm + 52 * mm + 20 * mm + 16 * mm
    sub_w = min((FULL_W - fixed) / max(len(columns), 1), 22 * mm)
    col_widths = [11 * mm, 52 * mm] + [sub_w] * len(columns) + [20 * mm, 16 * mm]

    head = (
        [para("POS", 7, bold=True, color=WHITE, align=TA_CENTER),
         para(" STUDENT", 8, bold=True, color=WHITE)]
        + [para(subject_code(n) or n[:5].upper(), 7, bold=True, color=WHITE, align=TA_CENTER) for n in columns]
        + [para("BEST-6\nTOTAL", 7, bold=True, color=WHITE, align=TA_CENTER),
           para("AGGR.", 7, bold=True, color=WHITE, align=TA_CENTER)]
    )
    data = [head]
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("BACKGROUND", (len(columns) + 2, 0), (-1, 0), BLUE2),
    ]
    # Non-core subject headers get a softer slate so core columns stand out
    for ci, n in enumerate(columns):
        if not is_core(n):
            cmds.append(("BACKGROUND", (ci + 2, 0), (ci + 2, 0), colors.HexColor("#475569")))

    for ri, d in enumerate(rows, start=1):
        agg = d["agg"]
        best = set(agg["best_six_subjects"]) if agg else set()
        line = [
            para(str(d.get("rank", "-")), 8, bold=True, color=BLUE2, align=TA_CENTER),
            para(escape(d["name"]), 8, bold=True),
        ]
        for ci, n in enumerate(columns):
            sc = d["scores"].get(n)
            if sc is None:
                line.append(para("-", 8, color=LGRAY, align=TA_CENTER))
                continue
            grade = str(get_mock_grade_and_remark(sc)[0])
            _, _, fg_hex = _grade_colors(grade)
            line.append(para(
                f"<b>{sc:g}</b> <font size='6' color='{fg_hex}'>({grade})</font>", 8, align=TA_CENTER,
            ))
            if n in best:
                cmds.append(("BACKGROUND", (ci + 2, ri), (ci + 2, ri), LBLUE))
        if agg:
            line.append(para(f"<b>{agg['raw_total']:g}</b>", 8, color=BLUE2, align=TA_CENTER))
            line.append(para(
                f"<b>{agg['aggregate']}{'' if agg['complete'] else '*'}</b>", 9,
                color=GREEN if agg["complete"] else RED, align=TA_CENTER,
            ))
        else:
            line += [para("-", 8, color=LGRAY, align=TA_CENTER)] * 2
        data.append(line)

    table = Table(data, colWidths=col_widths, repeatRows=1, hAlign="CENTER")
    table.setStyle(TableStyle([
        ("LINEBELOW", (0, 1), (-1, -1), 0.35, DIVIDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY]),
    ] + cmds))
    el += [table, Spacer(1, 4 * mm)]

    el.append(_note_box(
        para, FULL_W,
        "Shaded scores are the student's best six; figures in brackets are BECE grades (1 = best). "
        + RULE_TEXT
        + " <b>*</b> = provisional (a core subject has no score); provisional students are not ranked.",
    ))
    el += [Spacer(1, 4 * mm), section_label_row(para, "GRADE INTERPRETATION KEY", FULL_W), Spacer(1, 1 * mm)]
    el.append(_interp_strip(para, FULL_W))

    pdf.build(el, onFirstPage=_page_frame, onLaterPages=_page_frame)
    size = buffer.tell()
    buffer.seek(0)
    return buffer, size, f"mock_results_{_slug(class_name, 'class')}_{mock}_{year}.pdf"


# ---------------------------------------------------------------------------
# HTTP views
# ---------------------------------------------------------------------------

def _parse_params(request):
    mock = request.query_params.get("mock")
    if not mock:
        return None, None, Response({"error": "mock is required"}, status=400)
    raw_year = request.query_params.get("year")
    if raw_year:
        try:
            year = int(raw_year)
        except (TypeError, ValueError):
            return None, None, Response({"error": "year must be a valid integer"}, status=400)
    else:
        year = getattr(settings, "CURRENT_YEAR", timezone.now().year)
    return mock, year, None


def _pdf_response(buffer, size, filename):
    response = StreamingHttpResponse(iter([buffer.getvalue()]), content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="{filename}"; filename*=UTF-8\'\'{quote(filename)}'
    )
    response["Content-Length"] = size
    return response


class MockStudentPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        mock, year, error = _parse_params(request)
        if error:
            return error
        return _pdf_response(*generate_mock_student_pdf(student_id, mock, year))


class MockClassPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        mock, year, error = _parse_params(request)
        if error:
            return error
        return _pdf_response(*generate_mock_class_pdf(class_id, mock, year))
