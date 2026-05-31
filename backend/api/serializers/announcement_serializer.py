from rest_framework import serializers
from apps.announcements.models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):

    # Human-readable labels for display
    priority_label = serializers.CharField(
        source="get_priority_display", read_only=True
    )
    audience_label = serializers.CharField(
        source="get_audience_display", read_only=True
    )
    # Convenience: has this announcement expired?
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model  = Announcement
        fields = [
            "id",
            "title",
            "message",
            "priority",
            "priority_label",
            "audience",
            "audience_label",
            "is_pinned",
            "expires_at",
            "is_expired",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_is_expired(self, obj):
        if not obj.expires_at:
            return False
        from django.utils import timezone
        return timezone.now() > obj.expires_at