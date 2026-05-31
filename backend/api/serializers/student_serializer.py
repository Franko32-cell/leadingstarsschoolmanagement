from rest_framework import serializers
from apps.students.models import Student


class StudentSerializer(serializers.ModelSerializer):
    # ── Read-only computed fields ──────────────────────────────
    username     = serializers.SerializerMethodField()
    email        = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    class_name   = serializers.CharField(
        source="school_class.name", read_only=True, allow_null=True
    )
    photo_url    = serializers.SerializerMethodField()

    class Meta:
        model  = Student
        fields = [
            "id", "username", "email",
            "admission_number", "admission_date",
            "student_name", "first_name", "last_name",
            "school_class", "class_name",
            "photo", "photo_url",
            "gender", "date_of_birth", "phone", "address",
            "nationality", "religion", "health_notes",
            "parent_name", "parent_phone",
            "previous_school",
        ]
        extra_kwargs = {
            "photo":           {"required": False, "allow_null": True},
            "school_class":    {"required": False, "allow_null": True},
            "first_name":      {"required": False},
            "last_name":       {"required": False},
            "gender":          {"required": False},
            "date_of_birth":   {"required": False, "allow_null": True},
            "phone":           {"required": False},
            "address":         {"required": False},
            "nationality":     {"required": False},
            "religion":        {"required": False},
            "health_notes":    {"required": False},
            "parent_name":     {"required": False},
            "parent_phone":    {"required": False},
            "previous_school": {"required": False},
        }

    def _get_user(self, obj):
        """Safely return the related user, or None if missing/broken."""
        if not obj.user_id:          # check the raw FK column — no DB query
            return None
        try:
            return obj.user          # hits cache if select_related was used
        except Exception:
            return None

    def get_username(self, obj):
        user = self._get_user(obj)
        return user.username if user else None

    def get_email(self, obj):
        user = self._get_user(obj)
        return user.email if user else None

    def get_student_name(self, obj):
        return obj.full_name

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        try:
            return obj.photo.url
        except Exception:
            return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["photo"] = self.get_photo_url(instance)
        return data
