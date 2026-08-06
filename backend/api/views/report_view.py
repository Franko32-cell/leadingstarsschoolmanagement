"""report_view.py
Drop-in replacement for: backend/api/views/report_view.py

Fixes in this pass (mirrors report_pdf_view.py):
  1. `school_class` in the response now reflects the class the student was
     actually in for this term/year's results, not their current
     (possibly since-promoted) class — see school_class_name below.
  2. `position` / `position_formatted` are still computed and returned
     (kept for any other consumer / for backward compatibility), but the
     Reports.jsx frontend no longer renders the overall-position tile.
     Subject-level `subject_position` is untouched.
  3. `out_of` ("pupils on roll") no longer over-counts a class when a
     student has a stray duplicate Result row left over under a different
     school_class_id — a student is only counted toward a class if that
     class is where the MAJORITY of their own subject rows for the term
     actually sit.
"""

from collections import Counter

from django.conf import settings
from django.db import ProgrammingError, connection
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.results.models import Result, Report
from apps.students.models import Student
from apps.attendance.models import Attendance

from .grades import (
    has_promotion_fields,
    SCHOOL_NAMES,
    TERM_LABELS,
    get_thresholds,
    get_grade_and_remark,
    get_overall_grade,
)
from .result_view import assign_subject_positions
from apps.results.views import format_position

# ---------------------------------------------------------------------------
# Date Parsing Helper
# ---------------------------------------------------------------------------

def parse_date_field(date_value) -> object | None:
    """
    Parse a date value from the frontend into a proper date object.
    Handles: ISO format strings (YYYY-MM-DD), datetime objects, and None.
    Returns None if invalid or empty string.
    """
    if not date_value:
        return None
    import datetime
    try:
        if isinstance(date_value, str):
            return datetime.date.fromisoformat(date_value.strip())
        elif isinstance(date_value, datetime.date):
            return date_value
    except (ValueError, AttributeError):
        pass
    return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_current_year() -> int:
    return getattr(settings, "CURRENT_YEAR", timezone.now().year)


def _parse_year(raw) -> tuple[int | None, str | None]:
    """Returns (year_int, error_string). error_string is None on success."""
    if raw is None or raw == "":
        return get_current_year(), None
    try:
        return int(raw), None
    except (TypeError, ValueError):
        return None, "year must be a valid integer"


def _computed_score(result: Result) -> float:
    """
    Returns the subject total computed live from reopen+ca+exams, rather
    than trusting the persisted `score` column.

    Result.save() is supposed to guarantee score == reopen+ca+exams on
    every write, but a handful of production rows have been found with a
    stale/mismatched `score` (most likely from a raw-SQL data fix, an old
    pre-migration formula, or a duplicate row for the same
    student+subject+term+year under a different school_class — the model's
    unique_together does not include school_class, so that's possible).

    Recomputing here means the report/PDF can never display a total that
    doesn't match the visible reopen/ca/exams breakdown, regardless of what
    ended up in the database. This does NOT fix the underlying bad row —
    run a data-repair pass (iterate Result.objects.all() and call .save()
    on any row where stored score != reopen+ca+exams) to fix those at
    the source.
    """
    return round((result.reopen or 0.0) + (result.ca or 0.0) + (result.exams or 0.0), 1)


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
        return qs.first(), has_promo
    except ProgrammingError as exc:
        if "promotion_status" in str(exc) or "next_class" in str(exc):
            fallback_qs = Report.objects.filter(
                student=student, term=term, year=year
            ).only(*base_fields)
            return fallback_qs.first(), False
        raise


def _insert_minimal_report(student, term: str, year: int):
    """Insert a minimal report using raw SQL to avoid model field issues"""
    table = connection.ops.quote_name(Report._meta.db_table)
    columns = [
        connection.ops.quote_name("student_id"),
        connection.ops.quote_name("term"),
        connection.ops.quote_name("year"),
        connection.ops.quote_name("attendance"),
        connection.ops.quote_name("attendance_total"),
        connection.ops.quote_name("interest"),
        connection.ops.quote_name("conduct"),
        connection.ops.quote_name("teacher_remark"),
        connection.ops.quote_name("vacation_date"),
        connection.ops.quote_name("resumption_date"),
        connection.ops.quote_name("created_at"),
    ]
    values = [
        student.id, term, year, 0, 1, "", "", "", None, None, timezone.now(),
    ]
    placeholders = ", ".join(["%s"] * len(values))
    with connection.cursor() as cursor:
        cursor.execute(
            f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})",
            values,
        )
    return Report.objects.filter(
        student=student, term=term, year=year,
    ).only(
        "id", "student", "term", "year", "attendance", "attendance_total",
        "interest", "conduct", "teacher_remark", "vacation_date", "resumption_date",
    ).first()


def _create_report(student, term: str, year: int, has_promo: bool):
    """Create or get a report, handling promotion fields gracefully"""
    base_fields = [
        "id", "student", "term", "year", "attendance", "attendance_total",
        "interest", "conduct", "teacher_remark", "vacation_date", "resumption_date",
    ]

    if has_promo:
        try:
            return Report.objects.get_or_create(
                student=student, term=term, year=year,
                defaults={"attendance": 0, "attendance_total": 1},
            )
        except ProgrammingError as exc:
            if "promotion_status" in str(exc) or "next_class" in str(exc):
                report = Report.objects.filter(
                    student=student, term=term, year=year,
                ).only(*base_fields).first()
                if not report:
                    report = _insert_minimal_report(student, term, year)
                return report, False
            raise

    report = Report.objects.filter(
        student=student, term=term, year=year,
    ).only(*base_fields).first()
    if not report:
        report = _insert_minimal_report(student, term, year)
    return report, False


# ---------------------------------------------------------------------------
# Serializer
# ---------------------------------------------------------------------------

class SubjectResultSerializer(serializers.Serializer):
    subject = serializers.CharField()
    reopen = serializers.FloatField(allow_null=True)
    ca = serializers.FloatField(allow_null=True)
    exams = serializers.FloatField(allow_null=True)
    score = serializers.IntegerField(allow_null=True)
    grade = serializers.CharField()
    remark = serializers.CharField()
    subject_position = serializers.CharField(allow_null=True)


class ReportResponseSerializer(serializers.Serializer):
    student = serializers.CharField()
    admission_number = serializers.CharField(allow_null=True)
    school_class = serializers.CharField(allow_null=True)
    photo = serializers.CharField(allow_null=True)
    term = serializers.CharField()
    year = serializers.IntegerField()
    level = serializers.CharField()
    school_name = serializers.CharField()
    show_position = serializers.BooleanField()
    position = serializers.IntegerField(allow_null=True)
    position_formatted = serializers.CharField(allow_null=True)
    subjects = SubjectResultSerializer(many=True)
    total_score = serializers.IntegerField()
    average_score = serializers.IntegerField()
    overall_grade = serializers.CharField()
    subjects_passed = serializers.IntegerField()
    subjects_failed = serializers.IntegerField()
    out_of = serializers.IntegerField(allow_null=True)
    attendance = serializers.IntegerField()
    attendance_total = serializers.IntegerField()
    attendance_percent = serializers.IntegerField()
    conduct = serializers.CharField(allow_null=True)
    interest = serializers.CharField(allow_null=True)
    teacher_remark = serializers.CharField(allow_null=True)
    vacation_date = serializers.CharField(allow_null=True)
    resumption_date = serializers.CharField(allow_null=True)
    promotion_status = serializers.CharField(allow_null=True)
    next_class = serializers.IntegerField(allow_null=True)
    next_class_name = serializers.CharField(allow_null=True)


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

        year, err = _parse_year(request.query_params.get("year"))
        if err:
            return Response({"error": err}, status=400)

        student = get_object_or_404(
            Student.objects.select_related("school_class"), id=student_id,
        )

        level = getattr(student.school_class, "level", "basic_7_9") if student.school_class else "basic_7_9"
        thresholds = get_thresholds(level)
        show_position = level != "nursery_kg"

        results = list(
            Result.objects
            .filter(student=student, term=term, year=year)
            .select_related("subject", "school_class")
        )

        report, has_promo = _fetch_report(student, term, year)

        # ── Class shown on the report (school_class) ─────────────────
        # FIX: use the class the student was actually in when these
        # results were recorded, NOT student.school_class, which reflects
        # the student's CURRENT class. After a promotion, an older term's
        # report would otherwise show the student's new class, making it
        # look like the student had been "promoted into the same class".
        # Falls back to the current class only when there are no results
        # at all for this term/year.
        own_class_counts = Counter(
            r.school_class_id for r in results if r.school_class_id is not None
        )
        term_school_class = None
        if own_class_counts:
            target_class_id = own_class_counts.most_common(1)[0][0]
            term_school_class = next(
                (r.school_class for r in results if r.school_class_id == target_class_id),
                None,
            )
        school_class_name = (
            term_school_class.name if term_school_class
            else (student.school_class.name if student.school_class else None)
        )

        class_results = []
        valid_student_ids: set[int] = set()
        position = None
        position_formatted = "N/A" if show_position and student.school_class else None

        if show_position and results:
            # See report_pdf_view.py — group by each result's own
            # school_class_id for this term/year, not the student's
            # current class, so promoted students still get ranked
            # correctly against the class they were actually in.
            result_class_ids = {
                r.school_class_id for r in results if r.school_class_id is not None
            }
            raw_class_results = []
            if result_class_ids:
                raw_class_results = list(
                    Result.objects
                    .filter(
                        school_class_id__in=result_class_ids,
                        term=term,
                        year=year,
                    )
                    .select_related("subject")
                )

            if raw_class_results:
                # FIX: a student can have a handful of stray Result rows
                # tagged to a class they don't really belong to anymore.
                # Simply filtering by school_class_id (above) pulls in
                # EVERY such student, even with only 1-2 rows here, which
                # inflates "pupils on roll" and pollutes subject-position
                # rankings with students who don't really belong. Fetch
                # each candidate's FULL term/year row set and only keep
                # students whose TRUE majority class — across ALL their
                # subjects, not just the ones matching this class_id —
                # really is this class.
                candidate_student_ids = {r.student_id for r in raw_class_results}
                full_candidate_rows = Result.objects.filter(
                    student_id__in=candidate_student_ids, term=term, year=year,
                ).values("student_id", "school_class_id")

                candidate_class_counts: dict[int, Counter] = {}
                for row in full_candidate_rows:
                    candidate_class_counts.setdefault(
                        row["student_id"], Counter()
                    )[row["school_class_id"]] += 1

                target_class_id = own_class_counts.most_common(1)[0][0] if own_class_counts else None
                valid_student_ids = {
                    sid for sid, counts in candidate_class_counts.items()
                    if target_class_id is not None
                    and counts.most_common(1)[0][0] == target_class_id
                }

                class_results = [r for r in raw_class_results if r.student_id in valid_student_ids]

            if class_results:
                assign_subject_positions(class_results)
                positions = {r.id: r.subject_position for r in class_results}
                for r in results:
                    r.subject_position = positions.get(r.id)

                # Overall class position — ranked by each student's average,
                # computed the same way as this student's own `average` below
                # (int(round(_computed_score)) per subject, then averaged),
                # so a student's own report and their class rank never
                # disagree with each other. Uses competition ranking, same
                # tie convention as recompute_subject_positions().
                # NOTE: still computed for API completeness/back-compat, but
                # the frontend no longer displays it — see Reports.jsx.
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

        # ── Subjects ────────────────────────────────────────────────
        subjects = []
        total_score = 0
        passed = 0
        failed = 0
        for r in results:
            # FIX: recompute from components instead of trusting r.score,
            # which has been found to be stale/out-of-sync for some rows
            # (see _computed_score() docstring).
            score = int(round(_computed_score(r)))
            grade, remark = get_grade_and_remark(score, thresholds)
            subjects.append({
                "subject": r.subject.name,
                "reopen": r.reopen,
                "ca": r.ca,
                "exams": r.exams,
                "score": score,
                "grade": grade,
                "remark": remark,
                "subject_position": format_position(r.subject_position) if show_position and r.subject_position is not None else None,
            })
            total_score += score
            if score >= 50:
                passed += 1
            else:
                failed += 1

        subject_count = len(subjects)
        average = round(total_score / subject_count) if subject_count else 0
        overall_grade = get_overall_grade(average, thresholds)

        # ── Attendance — single aggregate query ───────────────────────
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

        # ── Class roll count ("out of N") ──────────────────────────────
        # FIX: this is enrollment headcount, a different question entirely
        # from "how many students have Result rows this term" — Result
        # data is inherently partial mid-term and can be mistagged to the
        # wrong class by data-entry errors unrelated to actual roll size.
        # Use the roster directly instead of deriving it from class_results.
        out_of = (
            Student.objects.filter(school_class=student.school_class).count()
            if show_position and student.school_class else None
        )

        # ── Promotion fields ───────────────────────────────────────
        promotion_status = None
        next_class_id = None
        next_class_name = None
        if has_promo and report:
            promotion_status = report.promotion_status
            next_class_id = report.next_class_id
            next_class_name = report.next_class.name if report.next_class else None

        payload = {
            "student": student.full_name,
            "admission_number": student.admission_number,
            "school_class": school_class_name,
            "photo": student.photo.url if student.photo else None,
            "term": term,
            "year": year,
            "level": level,
            "school_name": SCHOOL_NAMES.get(level, "LEADING STARS ACADEMY"),
            "show_position": show_position,
            "position": position,
            "position_formatted": position_formatted,
            "subjects": subjects,
            "total_score": round(total_score, 1),
            "average_score": average,
            "overall_grade": overall_grade,
            "subjects_passed": passed,
            "subjects_failed": failed,
            "out_of": out_of,
            "attendance": present_days,
            "attendance_total": total_days,
            "attendance_percent": att_percent,
            "conduct": report.conduct if report else None,
            "interest": report.interest if report else None,
            "teacher_remark": report.teacher_remark if report else None,
            "vacation_date": str(report.vacation_date) if report and report.vacation_date else None,
            "resumption_date": str(report.resumption_date) if report and report.resumption_date else None,
            "promotion_status": promotion_status,
            "next_class": next_class_id,
            "next_class_name": next_class_name,
        }
        return Response(ReportResponseSerializer(payload).data)

    # ── PATCH ────────────────────────────────────────────────────────────
    def patch(self, request, student_id):
        term = request.data.get("term")
        if not term:
            return Response({"error": "term is required"}, status=400)

        year, err = _parse_year(request.data.get("year"))
        if err:
            return Response({"error": err}, status=400)

        student = get_object_or_404(
            Student.objects.select_related("school_class"), id=student_id,
        )

        has_promo_flag = has_promotion_fields()
        report, has_promo = _create_report(student, term, year, has_promo_flag)

        NULLABLE_FIELDS = {"vacation_date", "resumption_date", "promotion_status"}
        UPDATABLE = [
            "conduct", "interest", "teacher_remark", "vacation_date", "resumption_date",
        ]
        if has_promo_flag:
            UPDATABLE.append("promotion_status")

        changed = []
        for field in UPDATABLE:
            if field not in request.data:
                continue
            value = request.data[field]
            if field in NULLABLE_FIELDS and value == "":
                value = None
            if field in ("vacation_date", "resumption_date"):
                value = parse_date_field(value)
            setattr(report, field, value)
            changed.append(field)

        if has_promo_flag and "next_class" in request.data:
            nc = request.data["next_class"]
            report.next_class_id = int(nc) if nc else None
            changed.append("next_class_id")

        if changed:
            try:
                report.save(update_fields=changed)
            except ProgrammingError as exc:
                if "promotion_status" in str(exc) or "next_class" in str(exc):
                    changed = [f for f in changed if f not in {"promotion_status", "next_class_id"}]
                    if changed:
                        report.save(update_fields=changed)
                    has_promo = False
                else:
                    raise

        if has_promo:
            report.refresh_from_db()
            next_class_name = report.next_class.name if getattr(report, "next_class", None) else None
        else:
            next_class_name = None

        return Response({
            "detail": "Saved.",
            "conduct": report.conduct,
            "interest": report.interest,
            "teacher_remark": report.teacher_remark,
            "vacation_date": str(report.vacation_date) if report.vacation_date else None,
            "resumption_date": str(report.resumption_date) if report.resumption_date else None,
            # Use the post-save `has_promo`, not the pre-save flag — if the
            # save hit a ProgrammingError and fell back, this avoids
            # reporting promotion data the DB doesn't actually have.
            "promotion_status": report.promotion_status if has_promo else None,
            "next_class": report.next_class_id if has_promo else None,
            "next_class_name": next_class_name,
        })