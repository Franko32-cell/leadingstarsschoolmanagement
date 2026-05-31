# apps/attendance/views.py
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import (
    DjangoFilterBackend,
    FilterSet,
    DateFilter,
    CharFilter,
    NumberFilter,
)

from apps.attendance.models import Attendance
from api.serializers.attendance_serializer import AttendanceSerializer


# ---------------------------------------------------------------------------
# Filter
# ---------------------------------------------------------------------------
class AttendanceFilter(FilterSet):
    """
    Enables filtering via query params:
      ?date=2025-04-01
      ?school_class=3
      ?student=7
      ?term=term3
      ?year=2025
      ?date_after=2025-01-01&date_before=2025-04-30  (date range)

    FIX: term and year filters are intentionally kept so that admin/reporting
    queries can still filter by term, but the frontend's fetchStudents call
    no longer sends them. This means attendance records are found by
    date+class alone, regardless of which term/year value was stamped on
    creation — eliminating the mismatch that caused existingIds to be empty.
    """
    school_class = NumberFilter(field_name="school_class__id")
    student      = NumberFilter(field_name="student__id")

    date        = DateFilter(field_name="date")
    date_after  = DateFilter(field_name="date", lookup_expr="gte")
    date_before = DateFilter(field_name="date", lookup_expr="lte")

    term = CharFilter(field_name="term")
    year = NumberFilter(field_name="year")

    class Meta:
        model  = Attendance
        fields = ["date", "school_class", "student", "term", "year"]


# ---------------------------------------------------------------------------
# ViewSet
# ---------------------------------------------------------------------------
class AttendanceViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoint for Attendance records.

    Key behaviour
    -------------
    - term and year are NEVER accepted from the client. perform_create stamps
      them from settings; perform_update leaves them unchanged so historical
      records keep their original term.
    - The serializer marks term/year as read_only_fields, so any values the
      client sends are silently ignored — no 400 from unexpected fields.
    - unique_together checks in validate() use tmp.pk so Django excludes the
      current row from the scan, preventing false-positive 400s on PATCH.
    """

    serializer_class = AttendanceSerializer
    filterset_class  = AttendanceFilter
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    ordering_fields  = ["date", "student"]
    ordering         = ["-date"]
    search_fields    = ["student__first_name", "student__last_name", "student__admission_number"]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _current_term() -> str:
        """Return the active term string from settings, e.g. 'term3'."""
        return getattr(settings, "CURRENT_TERM", "term3")

    @staticmethod
    def _current_year() -> int:
        """Return the active academic year from settings."""
        return getattr(settings, "CURRENT_YEAR", timezone.localdate().year)

    # ------------------------------------------------------------------
    # Queryset
    # ------------------------------------------------------------------
    def get_queryset(self):
        return (
            Attendance.objects
            .select_related("student", "school_class")
            .all()
        )

    # ------------------------------------------------------------------
    # Writes
    # ------------------------------------------------------------------
    def perform_create(self, serializer):
        """
        Save a new Attendance record.

        FIX: term and year are stamped here — after validation — so they are
        always sourced from settings, never from client input. Because the
        serializer marks term/year as read_only, validate() never sees client
        values for these fields, so there is no longer a mismatch between
        what was validated and what is saved.
        """
        serializer.save(
            term=self._current_term(),
            year=self._current_year(),
        )

    def perform_update(self, serializer):
        """
        Update an existing Attendance record.

        term and year are intentionally NOT overridden so that historical
        records edited later keep their original term/year.
        """
        instance = self.get_object()

        # Optional cross-class guard — uncomment and adapt to your auth model:
        #
        # user_class = getattr(self.request.user, "school_class_id", None)
        # if user_class and instance.school_class_id != user_class:
        #     raise PermissionDenied(
        #         "You do not have permission to edit attendance for another class."
        #     )

        serializer.save()
