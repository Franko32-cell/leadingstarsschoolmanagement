from rest_framework import serializers

from apps.results.models import CharacterAssessment


class CharacterAssessmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = CharacterAssessment
        fields = [
            "id",
            "student",
            "student_name",
            "school_class",
            "term",
            "year",
            "cohort",
            "areas",
            "career",
            "teacher_name",
            "teacher_sig",
            "teacher_date",
            "trainer_name",
            "trainer_sig",
            "trainer_date",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_student_name(self, obj):
        return obj.student.full_name if obj.student else "-"
