from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.results.models import Result, Report
from apps.students.models import Student
from api.serializers.result_serializer import ResultSerializer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def recompute_subject_positions(subject_id, term, school_class_id):
    """Recompute ranked positions for all results in a subject/term/class."""
    results = list(
        Result.objects.filter(
            subject_id=subject_id,
            term=term,
            school_class_id=school_class_id,
        ).order_by("-score", "id")
    )

    current_rank = 0
    prev_score   = object()

    for i, r in enumerate(results):
        if r.score != prev_score:
            current_rank = i + 1
            prev_score   = r.score
        r.subject_position = current_rank

    Result.objects.bulk_update(results, ["subject_position"])


def compute_overall_grade(avg: float) -> str:
    if avg >= 90:   return "1"
    elif avg >= 80: return "2"
    elif avg >= 60: return "3"
    elif avg >= 55: return "4"
    elif avg >= 50: return "5"
    elif avg >= 45: return "6"
    elif avg >= 40: return "7"
    elif avg >= 35: return "8"
    else:           return "9"


def format_position(n):
    if n is None:
        return "-"
    if 10 <= n % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


# ---------------------------------------------------------------------------
# ViewSet
# ---------------------------------------------------------------------------

class ResultViewSet(ModelViewSet):

    queryset           = Result.objects.all().order_by("-created_at")
    serializer_class   = ResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs     = super().get_queryset()
        params = self.request.query_params

        student      = params.get("student")
        school_class = params.get("school_class")
        term         = params.get("term")
        subject      = params.get("subject")

        if student:      qs = qs.filter(student_id=student)
        if school_class: qs = qs.filter(school_class_id=school_class)
        if term:         qs = qs.filter(term=term)
        if subject:      qs = qs.filter(subject_id=subject)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        recompute_subject_positions(
            instance.subject_id, instance.term, instance.school_class_id
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        recompute_subject_positions(
            instance.subject_id, instance.term, instance.school_class_id
        )

    # ------------------------------------------------------------------
    # Bulk upsert
    # ------------------------------------------------------------------

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_save(self, request):
        records = request.data if isinstance(request.data, list) else [request.data]
        saved   = []
        errors  = []

        for record in records:
            missing = [k for k in ("student", "subject", "term") if k not in record]
            if missing:
                errors.append({"record": record, "error": f"Missing fields: {missing}"})
                continue

            try:
                instance, _ = Result.objects.update_or_create(
                    student_id=record["student"],
                    subject_id=record["subject"],
                    term=record["term"],
                    defaults={
                        "school_class_id": record.get("school_class"),
                        "reopen": float(record.get("reopen") or 0),
                        "ca":     float(record.get("ca")     or 0),
                        "exams":  float(record.get("exams")  or 0),
                    },
                )
                saved.append(instance.id)
            except Exception as exc:
                errors.append({"record": record, "error": str(exc)})

        combos = {
            (r["subject"], r["term"], r.get("school_class"))
            for r in records
            if "subject" in r and "term" in r
        }
        for subject_id, term, class_id in combos:
            recompute_subject_positions(subject_id, term, class_id)

        response_status = (
            status.HTTP_400_BAD_REQUEST  if not saved and errors else
            status.HTTP_207_MULTI_STATUS if errors               else
            status.HTTP_200_OK
        )
        return Response({"saved": len(saved), "errors": errors}, status=response_status)

    # ------------------------------------------------------------------
    # Class summary
    # ------------------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        school_class = request.query_params.get("school_class")
        term         = request.query_params.get("term")

        if not school_class or not term:
            return Response(
                {"error": "school_class and term are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = (
            Result.objects
            .filter(school_class_id=school_class, term=term)
            .select_related("student", "student__user", "subject")
        )

        student_map = {}

        for r in results:
            sid   = r.student.id
            score = r.score or 0

            if sid not in student_map:
                student_map[sid] = {
                    "student_id":       sid,
                    "student_name":     r.student.full_name,
                    "admission_number": r.student.admission_number,
                    "subjects":         [],
                    "total_score":      0,
                    "count":            0,
                }

            student_map[sid]["subjects"].append({
                "subject_id":       r.subject.id,
                "subject_name":     r.subject.name,
                "reopen":           r.reopen,
                "ca":               r.ca,
                "exams":            r.exams,
                "score":            r.score,
                "grade":            r.grade,
                "remark":           r.remark,
                "subject_position": r.subject_position,
            })

            if r.score is not None:
                student_map[sid]["total_score"] += score
                student_map[sid]["count"]        += 1

        rows = []
        for data in student_map.values():
            count = data["count"]
            total = round(data["total_score"], 1)
            avg   = round(total / count, 1) if count else 0

            rows.append({
                "student_id":       data["student_id"],
                "student_name":     data["student_name"],
                "admission_number": data["admission_number"],
                "subjects":         data["subjects"],
                "total_score":      total,
                "average_score":    avg,
                "overall_grade":    compute_overall_grade(avg),
                "subject_count":    count,
            })

        rows.sort(key=lambda x: x["total_score"], reverse=True)

        current_rank = 0
        prev_total   = object()
        for i, row in enumerate(rows):
            if row["total_score"] != prev_total:
                current_rank = i + 1
                prev_total   = row["total_score"]
            row["rank"] = current_rank

        return Response(rows)


# ---------------------------------------------------------------------------
# Per-student report card
# ---------------------------------------------------------------------------

class StudentReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        term = request.query_params.get("term")
        if not term:
            return Response(
                {"error": "term is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student = Student.objects.get(id=student_id)

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
            score = r.score or 0

            subjects.append({
                "subject":          r.subject.name,
                "reopen":           r.reopen,
                "ca":               r.ca,
                "exams":            r.exams,
                "score":            r.score,
                "grade":            r.grade,
                "remark":           r.remark,
                "subject_position": r.subject_position,
            })

            total_score += score

            if score >= 50:
                passed += 1
            else:
                failed += 1

        subject_count = len(subjects)
        average       = round(total_score / subject_count, 1) if subject_count else 0

        # Class ranking
        class_students = Student.objects.filter(school_class=student.school_class)
        student_totals = []

        for s in class_students:
            s_results = Result.objects.filter(student=s, term=term)
            student_totals.append({
                "student_id": s.id,
                "total":      sum(r.score or 0 for r in s_results),
            })

        ranked = sorted(student_totals, key=lambda x: x["total"], reverse=True)

        position = next(
            (i + 1 for i, item in enumerate(ranked) if item["student_id"] == student.id),
            None,
        )

        return Response({
            "student":            student.full_name,
            "admission_number":   student.admission_number,
            "class":              student.school_class.name if student.school_class else None,
            "photo":              student.photo.url if student.photo else None,
            "term":               term,
            "subjects":           subjects,
            "total_score":        round(total_score, 1),
            "average_score":      average,
            "overall_grade":      compute_overall_grade(average),
            "subjects_passed":    passed,
            "subjects_failed":    failed,
            "position":           position,
            "position_formatted": format_position(position),
            "out_of":             len(ranked),
            "attendance":         report.attendance       if report else None,
            "attendance_total":   report.attendance_total if report else None,
            "interest":           report.interest         if report else None,
            "conduct":            report.conduct          if report else None,
            "teacher_remark":     report.teacher_remark   if report else None,
        })