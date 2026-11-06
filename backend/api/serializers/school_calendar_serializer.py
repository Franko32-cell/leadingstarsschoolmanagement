# api/serializers/school_calendar_serializer.py
from rest_framework import serializers

from apps.attendance.models import SchoolCalendar


class SchoolCalendarSerializer(serializers.ModelSerializer):
    event_type_label = serializers.CharField(source="get_event_type_display", read_only=True)
    created_by_name  = serializers.SerializerMethodField()
    updated_by_name  = serializers.SerializerMethodField()
    year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)
    end_date = serializers.DateField(required=False)

    class Meta:
        model = SchoolCalendar
        fields = [
            "id", "name", "event_type", "event_type_label",
            "start_date", "end_date", "is_school_day",
            "year", "term", "description",
            "created_by", "created_by_name", "updated_by", "updated_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "updated_by", "created_at", "updated_at"]

    @staticmethod
    def _label(user):
        return (user.get_full_name() or user.username) if user else None

    def get_created_by_name(self, obj):
        return self._label(obj.created_by)

    def get_updated_by_name(self, obj):
        return self._label(obj.updated_by)

    def validate(self, data):
        inst = self.instance
        start = data.get("start_date") or (inst and inst.start_date)
        end = data.get("end_date") or (inst and inst.end_date) or start
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date cannot be before the start date."})
        if "end_date" not in data and start and (inst is None):
            data["end_date"] = start  # single-day entry
        if "year" not in data and inst is None and start:
            data["year"] = start.year
        return data
