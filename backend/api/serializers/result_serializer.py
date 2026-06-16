from rest_framework import serializers

from apps.results.models import Result
from api.views.result_views import get_grade_and_remark, get_thresholds


class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    class_name   = serializers.SerializerMethodField()

    # Grade and remark are computed from score + the student's class level.
    # Exposing them here removes the duplicated grading logic in the frontend.
    grade  = serializers.SerializerMethodField()
    remark = serializers.SerializerMethodField()

    class Meta:
        model  = Result
        fields = [
            "id",
            "student",
            "student_name",
            "subject",
            "subject_name",
            "school_class",
            "class_name",
            "term",
            "year",
            "reopen",
            "ca",
            "exams",
            "score",            # computed in model.save(), read-only
            "grade",            # computed here from score + level
            "remark",           # computed here from score + level
            "subject_position",
            "created_at",
        ]
        read_only_fields = ["score", "subject_position", "created_at", "grade", "remark"]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _thresholds(self, obj):
        level = (
            getattr(obj.student.school_class, "level", "basic_7_9")
            if obj.student and obj.student.school_class
            else "basic_7_9"
        )
        return get_thresholds(level)

    # ------------------------------------------------------------------
    # Field methods
    # ------------------------------------------------------------------

    def get_student_name(self, obj):
        return obj.student.full_name if obj.student else "-"

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else "-"

    def get_class_name(self, obj):
        # FIX: was returning "-." (with a stray period)
        return obj.school_class.name if obj.school_class else "-"

    def get_grade(self, obj):
        grade, _ = get_grade_and_remark(obj.score or 0, self._thresholds(obj))
        return grade

    def get_remark(self, obj):
        _, remark = get_grade_and_remark(obj.score or 0, self._thresholds(obj))
        return remark
