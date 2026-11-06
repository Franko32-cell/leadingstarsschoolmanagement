# api/serializers/attendance_serializer.py
import logging

from django.utils import timezone
from rest_framework import serializers

from apps.attendance.models import Attendance
from apps.attendance.services import non_school_reason

logger = logging.getLogger(__name__)


def _user_label(user):
    if not user:
        return None
    return user.get_full_name() or user.username


class AttendanceSerializer(serializers.ModelSerializer):
    student_name     = serializers.SerializerMethodField()
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    class_name       = serializers.CharField(source="school_class.name", read_only=True)
    created_by_name  = serializers.SerializerMethodField()
    updated_by_name  = serializers.SerializerMethodField()

    class Meta:
        model  = Attendance
        fields = [
            "id",
            "student",
            "student_name",
            "school_class",
            "term",
            "year",
            "date",
            "status",
            "notes",
            "admission_number",
            "class_name",
            "created_by",
            "created_by_name",
            "updated_by",
            "updated_by_name",
            "created_at",
            "updated_at",
        ]
        # term and year are read-only — perform_create is the sole authority
        # for stamping them. Clients can read these values but cannot supply
        # conflicting ones that would cause validate() to see different values
        # than what actually gets saved.
        read_only_fields = [
            "id", "student_name", "term", "year",
            "created_by", "updated_by", "created_at", "updated_at",
        ]

    # ------------------------------------------------------------------
    # SerializerMethodField
    # ------------------------------------------------------------------

    def get_student_name(self, obj):
        return str(obj.student)

    def get_created_by_name(self, obj):
        return _user_label(obj.created_by)

    def get_updated_by_name(self, obj):
        return _user_label(obj.updated_by)

    # ------------------------------------------------------------------
    # Field-level validation
    # ------------------------------------------------------------------

    def validate_date(self, value):
        """Reject future dates before anything else runs."""
        if value > timezone.localdate():
            raise serializers.ValidationError(
                "Attendance cannot be recorded for a future date."
            )
        return value

    def validate_year(self, value):
        # Only fires when year is writable. Kept as a safeguard in case
        # read_only_fields is changed in future.
        current_year = timezone.localdate().year
        if value < 2000 or value > current_year + 1:
            raise serializers.ValidationError(
                f"'{value}' is not a plausible school year."
            )
        return value

    # ------------------------------------------------------------------
    # Cross-field validation
    # ------------------------------------------------------------------

    def validate(self, data):
        """
        Two checks:

        1. Enrollment guard — the submitted student must belong to the
           submitted school_class. PATCH-safe: falls back to the existing
           instance values for any field not included in the request.

        2. Model-level clean() — builds a temporary instance and calls
           full_clean() so Django's constraints (unique_together, clean()
           hooks) fire BEFORE any DB write.

        Why _state.adding = False matters
        ----------------------------------
        Django's validate_unique() excludes the current row from the
        unique_together scan by checking two things:
          a) instance.pk is not None
          b) instance._state.adding is False

        A freshly constructed Attendance(**{...}) always has _state.adding=True
        even when pk is set manually, because Django sets that flag in
        Model.__init__ based on whether the instance was loaded from the DB.
        With _state.adding=True Django treats the object as a brand-new unsaved
        row and finds the live DB record as a conflict — producing the false
        "already exists" 400 on every PATCH.

        Setting tmp._state.adding = False after construction tells Django
        "this object already exists in the DB; exclude it from the scan."
        """
        # PATCH safety: use current instance values for omitted fields
        student      = data.get("student")      or (self.instance and self.instance.student)
        school_class = data.get("school_class") or (self.instance and self.instance.school_class)

        # 1 — Enrollment check
        if student and school_class and not self._is_enrolled(student, school_class):
            raise serializers.ValidationError(
                {"student": "This student is not enrolled in the selected class."}
            )

        # 1b — Non-school-day guard (holiday / closure / weekend). Enforced
        # for new records and whenever an existing record's date changes, so
        # old data on such dates can still be corrected or removed.
        new_date = data.get("date")
        if new_date and (self.instance is None or new_date != self.instance.date):
            reason = non_school_reason(new_date)
            if reason:
                raise serializers.ValidationError({
                    "date": (
                        "Attendance cannot be recorded because this date is a "
                        f"non-school day ({reason})."
                    )
                })

        # 1c — New records only: no attendance for archived / inactive students.
        if self.instance is None and student is not None:
            acct = getattr(getattr(student, "user", None), "account_status", "active")
            if acct in ("archived", "inactive"):
                raise serializers.ValidationError(
                    {"student": f"Cannot record attendance for a student whose account is {acct}."}
                )

        # 2 — Django model validation (clean, unique_together, etc.)
        if self.instance:
            # PATCH: overlay changed fields onto a copy of the live instance
            # so we don't mutate the cached instance before the save.
            tmp = Attendance(**{
                f.attname: getattr(self.instance, f.attname)
                for f in Attendance._meta.concrete_fields
            })
            for attr, val in data.items():
                setattr(tmp, attr, val)

            # Tell Django this is an existing DB row so validate_unique()
            # excludes it from the unique_together scan. Without this,
            # _state.adding defaults to True and the live row is seen as a
            # duplicate of itself, producing a false 400 on every PATCH.
            tmp.pk = self.instance.pk
            tmp._state.adding = False
        else:
            tmp = Attendance(**data)
            # New record: pk=None, _state.adding=True — Django defaults,
            # no changes needed.

        try:
            # Always exclude "id": the AutoField has its own unique constraint
            # that full_clean() checks independently of unique_together. Even
            # with _state.adding=False, the per-field unique check on id still
            # finds the live row and raises "already exists". Excluding "id" is
            # safe — DRF validates the PK via the URL lookup before the
            # serializer runs.
            tmp.full_clean(exclude=["id"])
        except Exception as exc:
            logger.error(
                "AttendanceSerializer.validate full_clean failed: %s",
                getattr(exc, "message_dict", str(exc)),
            )
            raise serializers.ValidationError(
                getattr(exc, "message_dict", str(exc))
            ) from exc

        return data

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _is_enrolled(student, school_class) -> bool:
        """
        Return True when the student belongs to school_class.

        Handles the two common relationships:

          Case A — ForeignKey:   Student.school_class  → SchoolClass
          Case B — ManyToMany:   Student.school_classes → SchoolClass
        """
        # Case A: direct FK
        if hasattr(student, "school_class_id"):
            return student.school_class_id == school_class.pk

        # Case B: M2M
        if hasattr(student, "school_classes"):
            return student.school_classes.filter(pk=school_class.pk).exists()

        logger.warning(
            "AttendanceSerializer._is_enrolled: could not determine enrollment "
            "relationship for student pk=%s. Falling back to DB constraints.",
            student.pk,
        )
        return True  # let DB constraints be the last line of defence
