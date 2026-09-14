from rest_framework import serializers
from apps.teachers.models import Teacher
from apps.subjects.models import Subject
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class TeacherSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=False, source="user.first_name")
    last_name = serializers.CharField(write_only=False, source="user.last_name")
    teacher_name = serializers.SerializerMethodField(read_only=True)

    # Writable now — editing a teacher can update their email directly on
    # the related User row (see update() below). Not required, since some
    # teachers may not have one on file yet.
    email = serializers.EmailField(source="user.email", required=False, allow_blank=True)

    # CHANGE: a teacher can now be assigned multiple subjects. `subjects`
    # is the writable list of subject IDs; `subject_names` is a read-only
    # convenience list for display (avoids the frontend having to join
    # against the subjects list itself).
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Subject.objects.all(), required=False
    )
    subject_names = serializers.SerializerMethodField(read_only=True)

    # BUG FIX: the frontend table has always referenced `class_name` for
    # display, but this field was never actually returned by the API — only
    # the raw `school_class` id was. That meant the Class column silently
    # rendered blank. Adding it here fixes that display bug as well.
    class_name = serializers.CharField(
        source="school_class.name", read_only=True, allow_null=True, default=None
    )

    # ── Added for Admin Settings: identity + account status, sourced from
    # the related User row.
    username       = serializers.SerializerMethodField(read_only=True)
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
            "phone",
            "subjects",
            "subject_names",
            "school_class",
            "class_name",
            "hire_date",
            "account_status",
            "is_active",
            "last_login",
            "date_joined",
        ]
        read_only_fields = ["teacher_id"]

    def get_teacher_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

    def get_subject_names(self, obj):
        return [s.name for s in obj.subjects.all()]

    def get_username(self, obj):
        return obj.user.username if obj.user_id else None

    def get_account_status(self, obj):
        return getattr(obj.user, "account_status", None) if obj.user_id else None

    def get_is_active(self, obj):
        return obj.user.is_active if obj.user_id else None

    def get_last_login(self, obj):
        return obj.user.last_login.isoformat() if obj.user_id and obj.user.last_login else None

    def get_date_joined(self, obj):
        return obj.user.date_joined.isoformat() if obj.user_id and obj.user.date_joined else None

    def create(self, validated_data):
        # `first_name`/`last_name`/`email` all use dotted sources onto the
        # related User, so DRF nests them under a single "user" key here.
        user_data  = validated_data.pop("user", {})
        first_name = user_data.get("first_name", "")
        last_name  = user_data.get("last_name", "")
        email      = user_data.get("email", "")
        subjects   = validated_data.pop("subjects", [])

        teacher_id = f"T-{uuid.uuid4().hex[:6].upper()}"
        username   = teacher_id.lower()

        user = User.objects.create_user(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
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
        # M2M fields can only be set once the instance has a primary key.
        if subjects:
            teacher.subjects.set(subjects)
        return teacher

    def update(self, instance, validated_data):
        # BUG FIX: previously there was no update() override at all, so DRF's
        # default ModelSerializer.update() ran — which tried `setattr(instance,
        # "first_name", value)` for the write-only first_name/last_name fields.
        # Since those aren't actual Teacher model attributes, the assignment
        # was a silent no-op and name/email edits never persisted. This
        # override routes user-related fields to the User row and everything
        # else (phone, subjects, school_class, hire_date) to the Teacher row.
        user_data = validated_data.pop("user", None)
        subjects  = validated_data.pop("subjects", None)

        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save(update_fields=list(user_data.keys()))

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if subjects is not None:
            instance.subjects.set(subjects)

        return instance