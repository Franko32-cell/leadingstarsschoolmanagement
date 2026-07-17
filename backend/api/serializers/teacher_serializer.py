from rest_framework import serializers
from apps.teachers.models import Teacher
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class TeacherSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    teacher_name = serializers.SerializerMethodField(read_only=True)
    email = serializers.SerializerMethodField(read_only=True)
    account_status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Teacher
        fields = [
            "id",
            "teacher_id",
            "first_name",
            "last_name",
            "teacher_name",
            "email",
            "account_status",
            "subject",
            "school_class",
            "hire_date"
        ]
        read_only_fields = ["teacher_id"]

    def get_teacher_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

    def get_email(self, obj):
        return obj.user.email if obj.user else None

    def create(self, validated_data):
        first_name = validated_data.pop("first_name")
        last_name  = validated_data.pop("last_name")

        teacher_id = f"T-{uuid.uuid4().hex[:6].upper()}"
        username   = teacher_id.lower()

        user = User.objects.create_user(
            username=username,
            first_name=first_name,
            last_name=last_name,
            role="teacher",
            is_active=True,
            password="teacher123",
        )

        if hasattr(user, "is_approved"):
            user.is_approved = True
            user.save(update_fields=["is_approved"])

        teacher = Teacher.objects.create(
            teacher_id=teacher_id,
            user=user,
            **validated_data
        )
        return teacher

    def get_account_status(self, obj):
        return obj.user.account_status if obj.user else None
