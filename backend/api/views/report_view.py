from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.results.models import Result, Report
from apps.students.models import Student
from apps.attendance.models import Attendance


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

GRADE_THRESHOLDS_NKG = GRADE_THRESHOLDS_B16

SCHOOL_NAMES = {
    "nursery_kg": "LEADING STARS MONTESSORI",
    "basic_1_6":  "LEADING STARS ACADEMY",
    "basic_7_9":  "LEADING STARS ACADEMY",
}


def get_grade_and_remark(score: float, thresholds: list) -> tuple:
    for threshold, grade, remark in thresholds:
        if score >= threshold:
            return grade, remark
    return thresholds[-1][1], thresholds[-1][2]


def get_overall_grade(avg: float, thresholds: list) -> str:
    return get_grade_and_remark(avg, thresholds)[0]


def get_thresholds(level: str) -> list:
    if level == "basic_1_6":
        return GRADE_THRESHOLDS_B16
    if level == "nursery_kg":
        return GRADE_THRESHOLDS_NKG
    return GRADE_THRESHOLDS_B79


def format_position(n):
    if n is None:
        return None
    suffix = (
        "th" if 10 <= n % 100 <= 20
        else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    )
    return f"{n}{suffix}"


# ---------------------------------------------------------------------------
# View
# ---------------------------------------------------------------------------

class StudentReportView(APIView):

    permission_classes = [IsAuthenticated]

    # ── GET ──────────────────────────────────────────────────────────────

    def get(self, request, student_id):
        term = request.query_params.get("term")
        if not term:
            return Response({"error": "term is required"}, status=400)

        student    = get_object_or_404(Student, id=student_id)
        level      = getattr(student.school_class, "level", "basic_7_9") if student.school_class else "basic_7_9"
        thresholds = get_thresholds(level)
        show_position = level != "nursery_kg"

        results = (
            Result.objects
            .filter(student=student, term=term)
            .select_related("subject")
        )

        report = Report.objects.filter(student=student, term=term).first()

        subjects    = []
        total_score = 0
        passed      = 0
        failed      = 0

        for r in results:
            score         = r.score or 0
            grade, remark = get_grade_and_remark(score, thresholds)

            subjects.append({
                "subject":          r.subject.name,
                "reopen":           r.reopen,
                "ca":               r.ca,
                "exams":            r.exams,
                "score":            r.score,
                "grade":            grade,
                "remark":           remark,
                "subject_position": r.subject_position if show_position else None,
            })

            total_score += score
            if score >= 50:
                passed += 1
            else:
                failed += 1

        subject_count = len(subjects)
        average       = round(total_score / subject_count, 1) if subject_count else 0
        overall_grade = get_overall_grade(average, thresholds)

        # Attendance
        term_attendance = Attendance.objects.filter(student=student, term=term)
        total_days      = term_attendance.count()
        present_days    = term_attendance.filter(status__in=["present", "late"]).count()

        # Class ranking
        class_students = Student.objects.filter(school_class=student.school_class)
        student_totals = []

        for s in class_students:
            s_results = Result.objects.filter(student=s, term=term)
            student_totals.append({
                "student_id": s.id,
                "total":      sum(r.score or 0 for r in s_results),
            })

        ranked   = sorted(student_totals, key=lambda x: x["total"], reverse=True)
        position = next(
            (i + 1 for i, item in enumerate(ranked) if item["student_id"] == student.id),
            None,
        ) if show_position else None

        return Response({
            "student":            student.full_name,
            "admission_number":   student.admission_number,
            "class":              student.school_class.name if student.school_class else None,
            "photo":              student.photo.url if student.photo else None,
            "term":               term,
            "level":              level,
            "school_name":        SCHOOL_NAMES.get(level, "LEADING STARS ACADEMY"),
            "show_position":      show_position,

            "subjects":           subjects,
            "total_score":        round(total_score, 1),
            "average_score":      average,
            "overall_grade":      overall_grade,
            "subjects_passed":    passed,
            "subjects_failed":    failed,

            "position":           position,
            "position_formatted": format_position(position),
            "out_of":             len(ranked) if show_position else None,

            "attendance":         present_days,
            "attendance_total":   total_days,
            "attendance_percent": round((present_days / total_days) * 100) if total_days else 0,

            # Remarks
            "conduct":          report.conduct          if report else None,
            "interest":         report.interest         if report else None,
            "teacher_remark":   report.teacher_remark   if report else None,

            # Dates
            "vacation_date":    str(report.vacation_date)   if report and report.vacation_date   else None,
            "resumption_date":  str(report.resumption_date) if report and report.resumption_date else None,
        })

    # ── PATCH ─────────────────────────────────────────────────────────────

    def patch(self, request, student_id):
        term = request.data.get("term")
        if not term:
            return Response({"error": "term is required"}, status=400)

        student = get_object_or_404(Student, id=student_id)

        # year is part of unique_together — must be in the lookup, not just defaults
        report, _ = Report.objects.get_or_create(
            student=student,
            term=term,
            year=timezone.now().year,
            defaults={
                "attendance":       0,
                "attendance_total": 1,  # must be >= 1 per model validator
            },
        )

        updatable = [
            "conduct",
            "interest",
            "teacher_remark",
            "vacation_date",
            "resumption_date",
        ]
        changed = []

        for field in updatable:
            if field in request.data:
                value = request.data[field]
                if field in ("vacation_date", "resumption_date") and value == "":
                    value = None
                setattr(report, field, value)
                changed.append(field)

        if changed:
            report.save(update_fields=changed)

        return Response({
            "detail":           "Saved.",
            "conduct":          report.conduct,
            "interest":         report.interest,
            "teacher_remark":   report.teacher_remark,
            "vacation_date":    str(report.vacation_date)   if report.vacation_date   else None,
            "resumption_date":  str(report.resumption_date) if report.resumption_date else None,
        })