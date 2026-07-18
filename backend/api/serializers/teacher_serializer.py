from rest_framework import serializers
from apps.teachers.models import Teacher
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class TeacherSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    teacher_name = serializers.SerializerMethodField(read_only=True)

    # ── Added for Admin Settings: identity + account status, sourced from
    # the related User row. All read-only — the write-side create() flow
    # below is completely unchanged.
    username       = serializers.SerializerMethodField(read_only=True)
    email          = serializers.SerializerMethodField(read_only=True)
    account_status = serializers.SerializerMethodField(read_only=True)
    is_active      = serializers.SerializerMethodField(read_only=True)
    last_login     = serializers.SerializerMethodField(read_only=True)
    date_joined    = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Teacher
        fields = [
            "id",
            "teacher_id",
            "first_name",
            "last_name",
            "teacher_name",
            "username",
            "email",
            "subject",
            "school_class",
            "hire_date",
            "account_status",
            "is_active",
            "last_login",
            "date_joined",
        ]
        read_only_fields = ["teacher_id"]

    def get_teacher_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

    def get_username(self, obj):
        return obj.user.username if obj.user_id else None

    def get_email(self, obj):
        return obj.user.email if obj.user_id else None

    def get_account_status(self, obj):
        return getattr(obj.user, "account_status", None) if obj.user_id else None

    def get_is_active(self, obj):
        return obj.user.is_active if obj.user_id else None

    def get_last_login(self, obj):
        return obj.user.last_login.isoformat() if obj.user_id and obj.user.last_login else None

    def get_date_joined(self, obj):
        return obj.user.date_joined.isoformat() if obj.user_id and obj.user.date_joined else None

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