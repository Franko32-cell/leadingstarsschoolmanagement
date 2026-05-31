from rest_framework import serializers
from apps.admissions.models import Admission


class AdmissionSerializer(serializers.ModelSerializer):
    applied_class_name = serializers.SerializerMethodField()
    photo_url          = serializers.SerializerMethodField()

    class Meta:
        model  = Admission
        fields = [
            "id", "admission_number", "application_date", "status",
            "first_name", "last_name", "student_name", "gender",
            "date_of_birth", "nationality", "religion",
            "photo",
            "photo_url",
            "applied_class", "applied_class_name",
            "previous_school", "health_notes",
            "parent_name", "parent_gender", "relationship",
            "email", "phone", "alt_phone", "address",
        ]
        read_only_fields = ["id", "admission_number", "application_date", "student_name"]
        extra_kwargs = {
            "photo": {"required": False},
        }

    def get_applied_class_name(self, obj):
        if not obj.applied_class_id:
            return ""
        try:
            return obj.applied_class.name
        except Exception:
            return ""

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        try:
            return obj.photo.url
        except Exception:
            return None
