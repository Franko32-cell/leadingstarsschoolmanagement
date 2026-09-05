from rest_framework import serializers

from .models import Assignment, Lesson, Submission


class ContentSerializerMixin:
    subject_name = serializers.CharField(source="subject.name", read_only=True, default=None)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True, default=None)

    def validate(self, attrs):
        school_class = attrs.get("school_class", getattr(self.instance, "school_class", None))
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        if subject and school_class and subject.school_class_id != school_class.id:
            raise serializers.ValidationError({"subject": "Subject must belong to the selected class."})
        return attrs


class LessonSerializer(ContentSerializerMixin, serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True, allow_null=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True, allow_null=True)

    class Meta:
        model = Lesson
        fields = [
            "id", "title", "description", "school_class", "subject", "subject_name",
            "teacher", "teacher_name", "term", "year", "video_url", "attachment",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "teacher", "teacher_name", "subject_name", "created_at", "updated_at"]


class AssignmentSerializer(ContentSerializerMixin, serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True, allow_null=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True, allow_null=True)

    class Meta:
        model = Assignment
        fields = [
            "id", "title", "instructions", "school_class", "subject", "subject_name",
            "teacher", "teacher_name", "term", "year", "due_date", "max_score",
            "attachment", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "teacher", "teacher_name", "subject_name", "created_at", "updated_at"]


class SubmissionSerializer(serializers.ModelSerializer):
    is_late = serializers.BooleanField(read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id", "assignment", "student", "text_answer", "file", "submitted_at",
            "score", "feedback", "is_late",
        ]
        read_only_fields = ["id", "student", "submitted_at", "is_late"]

    def validate_score(self, value):
        assignment = self.instance.assignment if self.instance else self.initial_data.get("assignment")
        if assignment and not isinstance(assignment, Assignment):
            assignment = Assignment.objects.filter(pk=assignment).first()
        if assignment and value > assignment.max_score:
            raise serializers.ValidationError("Score cannot exceed the assignment maximum.")
        return value
