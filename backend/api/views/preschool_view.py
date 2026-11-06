"""preschool_view.py
Termly rubric assessment for pre-school classes (e.g. Little Angels) — replaces
the subject-score report (report_view.py) for these classes entirely.
"""

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.results.models import PreschoolAssessment
from apps.students.models import Student

from .grades import PRESCHOOL_CATEGORIES, get_preschool_letter, SCHOOL_NAMES


def get_current_year() -> int:
    return getattr(settings, "CURRENT_YEAR", timezone.now().year)


class PreschoolAssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        term = request.query_params.get("term")
        if not term:
            return Response({"error": "term is required"}, status=400)
        year = request.query_params.get("year") or get_current_year()
        try:
            year = int(year)
        except (TypeError, ValueError):
            return Response({"error": "year must be a valid integer"}, status=400)

        student = get_object_or_404(Student.objects.select_related("school_class"), id=student_id)
        assessment = PreschoolAssessment.objects.filter(student=student, term=term, year=year).first()
        ratings = assessment.ratings if assessment else {}

        # Always return the FULL category list (single source of truth in
        # grades.py) merged with any saved ratings, so the frontend renders
        # every row even before the first save.
        categories = []
        for cat in PRESCHOOL_CATEGORIES:
            saved = ratings.get(cat["key"], {})
            categories.append({
                **cat,
                "level":  saved.get("level"),
                "score":  saved.get("score"),
                "letter": get_preschool_letter(saved.get("score")),
            })

        return Response({
            "student":             student.full_name,
            "admission_number":    student.admission_number,
            "photo":               student.photo.url if student.photo else None,
            "school_class":        student.school_class.name if student.school_class else None,
            "school_name":         SCHOOL_NAMES.get("nursery_kg", "LEADING STARS MONTESSORI"),
            "term":                term,
            "year":                year,
            "categories":          categories,
            "conduct":             assessment.conduct if assessment else "",
            "interest":            assessment.interest if assessment else "",
            "attitude":            assessment.attitude if assessment else "",
            "teacher_performance": assessment.teacher_performance if assessment else "",
            "remark":              assessment.remark if assessment else "",
            "attendance":          assessment.attendance if assessment else 0,
            "attendance_total":    assessment.attendance_total if assessment else 1,
            "promotion_status":    assessment.promotion_status if assessment else None,
            "next_class":          assessment.next_class_id if assessment else None,
            "next_class_name":     assessment.next_class.name if assessment and assessment.next_class else None,
            "vacation_date":       str(assessment.vacation_date) if assessment and assessment.vacation_date else None,
            "resumption_date":     str(assessment.resumption_date) if assessment and assessment.resumption_date else None,
        })

    def patch(self, request, student_id):
        term = request.data.get("term")
        if not term:
            return Response({"error": "term is required"}, status=400)
        year = request.data.get("year") or get_current_year()
        try:
            year = int(year)
        except (TypeError, ValueError):
            return Response({"error": "year must be a valid integer"}, status=400)

        student = get_object_or_404(Student, id=student_id)
        assessment, _ = PreschoolAssessment.objects.get_or_create(
            student=student, term=term, year=year,
            defaults={"attendance": 0, "attendance_total": 1},
        )

        # Merge incoming ticks/scores into ratings rather than replacing the
        # whole dict, so a partial save (e.g. one category at a time) doesn't
        # wipe out rows already saved.
        valid_keys = {c["key"] for c in PRESCHOOL_CATEGORIES}
        incoming   = request.data.get("ratings") or {}
        ratings    = dict(assessment.ratings or {})

        for key, val in incoming.items():
            if key not in valid_keys:
                continue
            level = val.get("level")
            score = val.get("score")
            if level not in (1, 2, 3, None):
                return Response({"error": f"Invalid level for '{key}'"}, status=400)
            if score is not None:
                try:
                    score = float(score)
                except (TypeError, ValueError):
                    return Response({"error": f"Invalid score for '{key}'"}, status=400)
                if score < 0 or score > 100:
                    return Response({"error": f"Score for '{key}' must be 0-100"}, status=400)
            ratings[key] = {"level": level, "score": score}
        assessment.ratings = ratings

        for field in ["conduct", "interest", "attitude", "teacher_performance", "remark", "promotion_status"]:
            if field in request.data:
                setattr(assessment, field, request.data[field] or None if field == "promotion_status" else request.data[field] or "")
        if "attendance" in request.data:
            assessment.attendance = int(request.data["attendance"] or 0)
        if "attendance_total" in request.data:
            assessment.attendance_total = int(request.data["attendance_total"] or 1)
        if "next_class" in request.data:
            nc = request.data["next_class"]
            assessment.next_class_id = int(nc) if nc else None
        if "vacation_date" in request.data:
            assessment.vacation_date = request.data["vacation_date"] or None
        if "resumption_date" in request.data:
            assessment.resumption_date = request.data["resumption_date"] or None

        assessment.save()
        return Response({"detail": "Saved.", "ratings": assessment.ratings})