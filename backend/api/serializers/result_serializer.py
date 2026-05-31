from rest_framework import serializers
from apps.results.models import Result


class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    class_name   = serializers.SerializerMethodField()

    class Meta:
        model = Result
        fields = [
            "id",
            "student",
            "student_name",
            "subject",
            "subject_name",
            "school_class",
            "class_name",
            "term",
            "year",          # ← added; required for year-aware upserts
            "reopen",
            "ca",
            "exams",
            "score",           # computed on model.save(), read-only
            "subject_position",
            "created_at",
        ]
        read_only_fields = ["score", "subject_position", "created_at"]
        # NOTE: grade and remark are intentionally excluded — they depend on the
        # student's school level (B79 / B16 / NKG) and are computed at query
        # time in the view (ResultViewSet / StudentReportView), never stored.

    def get_student_name(self, obj):
        return obj.student.full_name if obj.student else "-"

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else "-"

    def get_class_name(self, obj):
        return obj.school_class.name if obj.school_class else "-"
