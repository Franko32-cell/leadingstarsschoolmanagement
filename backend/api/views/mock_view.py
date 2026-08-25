"""mock_view.py
Basic 9 BECE-style mock exam results — deliberately separate from
Result/result_view.py. See MockResult / GRADE_THRESHOLDS_MOCK docstrings for why.
"""

import logging

from django.conf import settings
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.results.models import MockResult
from apps.students.models import Student
from api.serializers.mock_result_serializer import MockResultSerializer

from .grades import get_mock_grade_and_remark, compute_mock_aggregate, MOCK_INTERP_ROWS

logger = logging.getLogger(__name__)


def get_current_year() -> int:
    return getattr(settings, "CURRENT_YEAR", timezone.now().year)


class MockResultViewSet(ModelViewSet):
    queryset           = MockResult.objects.all().order_by("-created_at")
    serializer_class   = MockResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("student"):      qs = qs.filter(student_id=p["student"])
        if p.get("school_class"): qs = qs.filter(student__school_class_id=p["school_class"])
        if p.get("mock"):         qs = qs.filter(mock=p["mock"])
        if p.get("subject"):      qs = qs.filter(subject_id=p["subject"])
        if p.get("year"):         qs = qs.filter(year=p["year"])
        return qs

    @action(detail=False, methods=["post"], url_path="bulk-save")
    def bulk_save(self, request):
        """
        Same partial-save-safe pattern as ResultViewSet.bulk_save. Each record:
        {student, subject, mock, year?, school_class?, score}. A blank/missing
        score is skipped rather than saved as 0, so entering some subjects for
        a mock doesn't wipe others not yet touched in this request.
        """
        records = request.data if isinstance(request.data, list) else [request.data]
        saved, errors = [], []

        for record in records:
            missing = [k for k in ("student", "subject", "mock") if k not in record]
            if missing:
                errors.append({"record": record, "error": f"Missing fields: {missing}"})
                continue
            try:
                year = int(record.get("year") or get_current_year())
            except (TypeError, ValueError):
                errors.append({"record": record, "error": "year must be a valid integer"})
                continue

            score = record.get("score")
            if score is None or score == "":
                continue
            try:
                score = float(score)
            except (TypeError, ValueError):
                errors.append({"record": record, "error": "score must be a number"})
                continue
            if score < 0 or score > 100:
                errors.append({"record": record, "error": f"score must be between 0 and 100 (got {score})"})
                continue

            defaults = {"score": score}
            if "school_class" in record:
                defaults["school_class_id"] = record.get("school_class")

            try:
                instance, _ = MockResult.objects.update_or_create(
                    student_id=record["student"],
                    subject_id=record["subject"],
                    mock=record["mock"],
                    year=year,
                    defaults=defaults,
                )
                saved.append(instance.id)
            except Exception as exc:
                logger.exception("Unexpected error in mock bulk_save for record %s", record)
                errors.append({"record": record, "error": str(exc)})

        response_status = (
            status.HTTP_400_BAD_REQUEST  if not saved and errors else
            status.HTTP_207_MULTI_STATUS if errors               else
            status.HTTP_200_OK
        )
        return Response({"saved": len(saved), "errors": errors}, status=response_status)


class MockReportView(APIView):
    """
    GET /mock-report/student/<id>/?year=YYYY

    Every mock the student has scores for, graded on the BECE scale, plus the
    best-six raw total and aggregate per mock — mirrors the sample sheet
    layout (one column-group per mock).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        year = request.query_params.get("year") or get_current_year()
        try:
            year = int(year)
        except (TypeError, ValueError):
            return Response({"error": "year must be a valid integer"}, status=400)

        student = Student.objects.select_related("school_class").filter(id=student_id).first()
        if not student:
            return Response({"error": "Student not found"}, status=404)

        results = (
            MockResult.objects
            .filter(student_id=student_id, year=year)
            .select_related("subject")
        )

        by_mock: dict[str, list[dict]] = {}
        for r in results:
            by_mock.setdefault(r.mock, []).append({"subject": r.subject.name, "score": r.score})

        mocks_payload = []
        for mock_key in sorted(by_mock.keys()):
            rows = by_mock[mock_key]
            agg = compute_mock_aggregate(rows)
            subjects = [
                {
                    "subject": row["subject"],
                    "score":   row["score"],
                    "grade":   get_mock_grade_and_remark(row["score"])[0],
                    "remark":  get_mock_grade_and_remark(row["score"])[1],
                }
                for row in rows
            ]
            mocks_payload.append({
                "mock":                mock_key,
                "subjects":            subjects,
                "raw_total_best_six":  agg["raw_total"],
                "aggregate":           agg["aggregate"],
                "best_six_subjects":   agg["best_six_subjects"],
            })

        return Response({
            "student":           student.full_name,
            "admission_number":  student.admission_number,
            "photo":             student.photo.url if student.photo else None,
            "school_class":      student.school_class.name if student.school_class else None,
            "year":              year,
            "mocks":             mocks_payload,
            "interp_rows":       MOCK_INTERP_ROWS,
        })