import re
from collections import Counter, defaultdict
from html import escape
from io import BytesIO
from urllib.parse import quote

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions.role_permissions import IsAdmin
from api.views.grades import get_grade_and_remark, get_thresholds
from api.views.result_view import _computed_score
from apps.results.models import Result
from apps.students.models import Student


TERM_LABELS = {
    "term1": "Term 1",
    "term2": "Term 2",
    "term3": "Term 3",
}
TERM_ORDER = {"term1": 1, "term2": 2, "term3": 3}


def build_student_transcript_pdf(student):
    results = list(
        Result.objects.filter(student=student)
        .select_related("subject", "school_class")
        .order_by("year", "term", "subject__name")
    )
    if not results:
        return None

    grouped_results = defaultdict(list)
    for result in results:
        grouped_results[(result.year, result.term)].append(result)

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Academic Transcript - {student.full_name}",
        author="Leading Stars Academy",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TranscriptTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1e3a5f"),
        fontSize=18,
        spaceAfter=5 * mm,
    )
    section_style = ParagraphStyle(
        "TermHeading",
        parent=styles["Heading2"],
        textColor=colors.HexColor("#1e3a5f"),
        fontSize=11,
        spaceBefore=5 * mm,
        spaceAfter=2 * mm,
    )
    body_style = styles["BodyText"]
    elements = [
        Paragraph("ACADEMIC TRANSCRIPT", title_style),
        Paragraph(f"<b>Student:</b> {escape(student.full_name)}", body_style),
        Paragraph(f"<b>Admission number:</b> {escape(student.admission_number)}", body_style),
        Paragraph(
            f"<b>Current class:</b> {escape(student.school_class.name) if student.school_class else '—'}",
            body_style,
        ),
        Spacer(1, 4 * mm),
    ]

    for year, term in sorted(
        grouped_results,
        key=lambda item: (item[0], TERM_ORDER.get(item[1], 99), item[1]),
    ):
        term_results = grouped_results[(year, term)]
        class_counts = Counter(
            result.school_class.name
            for result in term_results
            if result.school_class
        )
        class_name = class_counts.most_common(1)[0][0] if class_counts else "—"
        elements.append(
            Paragraph(
                f"{year} · {escape(TERM_LABELS.get(term, term))} · {escape(class_name)}",
                section_style,
            )
        )

        rows = [["Subject", "Score", "Grade"]]
        scores = []
        for result in term_results:
            score = round(_computed_score(result), 1)
            level = (
                result.school_class.level
                if result.school_class
                else (
                    student.school_class.level
                    if student.school_class
                    else "basic_7_9"
                )
            )
            grade, _remark = get_grade_and_remark(score, get_thresholds(level))
            rows.append([escape(result.subject.name), f"{score:.1f}", grade])
            scores.append(score)

        table = Table(rows, colWidths=[110 * mm, 30 * mm, 30 * mm], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                colors.white,
                colors.HexColor("#f8fafc"),
            ]),
            ("ALIGN", (1, 1), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.extend([
            table,
            Paragraph(
                f"<b>Term average:</b> {sum(scores) / len(scores):.1f}",
                body_style,
            ),
            Spacer(1, 2 * mm),
        ])

    document.build(elements)
    buffer.seek(0)
    filename_slug = re.sub(
        r"[^A-Za-z0-9_-]+",
        "_",
        student.full_name.strip(),
    ).strip("_") or str(student.admission_number)
    return buffer, f"transcript_{filename_slug}.pdf"


class StudentTranscriptPDFView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, student_id):
        student = get_object_or_404(
            Student.objects.select_related("school_class"),
            id=student_id,
        )
        generated = build_student_transcript_pdf(student)
        if generated is None:
            return Response(
                {"error": "No academic results found for this student."},
                status=status.HTTP_404_NOT_FOUND,
            )

        buffer, filename = generated
        response = StreamingHttpResponse(
            iter([buffer.getvalue()]),
            content_type="application/pdf",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"; filename*=UTF-8\'\'{quote(filename)}'
        )
        response["Content-Length"] = len(buffer.getvalue())
        return response
