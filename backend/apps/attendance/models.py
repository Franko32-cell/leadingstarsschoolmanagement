# apps/attendance/models.py
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.students.models import Student
from apps.classes.models import SchoolClass


# ---------------------------------------------------------------------------
# Term helpers
# ---------------------------------------------------------------------------

def _get_current_term() -> str:
    """
    Default callable for Attendance.term.

    Reads CURRENT_TERM from Django settings — the single place the school
    updates at the start of each term.

    Set in settings.py:
        CURRENT_TERM = "term1"   # update at the start of each term
        CURRENT_YEAR = 2025
    """
    return getattr(settings, "CURRENT_TERM", "term1")


def _get_current_year() -> int:
    return getattr(settings, "CURRENT_YEAR", timezone.now().year)


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

class Attendance(models.Model):

    class Term(models.TextChoices):
        TERM1 = "term1", "Term 1"
        TERM2 = "term2", "Term 2"
        TERM3 = "term3", "Term 3"

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT  = "absent",  "Absent"
        LATE    = "late",    "Late"
        EXCUSED = "excused", "Excused"

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="attendances",
    )
    school_class = models.ForeignKey(
        SchoolClass,
        on_delete=models.CASCADE,
        related_name="attendances",
    )
    term = models.CharField(
        max_length=10,
        choices=Term.choices,
        default=_get_current_term,
    )
    year = models.PositiveIntegerField(
        default=_get_current_year,
    )
    date   = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PRESENT,
    )
    notes      = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    # Audit trail — who recorded / last changed the record. Nullable so that
    # every pre-existing row stays valid; SET_NULL so deleting a user never
    # deletes attendance history. Full change history lives in AuditLog.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="attendance_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="attendance_updated",
    )

    class Meta:
        verbose_name        = "Attendance"
        verbose_name_plural = "Attendances"
        unique_together     = ["student", "school_class", "date"]
        ordering            = ["-date", "student"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["student", "term"]),
            models.Index(fields=["school_class", "date"]),
            models.Index(fields=["school_class", "term", "date"]),
            # IMPROVEMENT: composite index covering the common summary query
            # (class + term + year + status) avoids a sequential scan when
            # computing per-student attendance rates for a given term.
            models.Index(fields=["school_class", "term", "year", "status"]),
            models.Index(fields=["year", "term", "date"]),
        ]

    def __str__(self):
        return f"{self.student} — {self.date} — {self.get_status_display()}"

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def clean(self):
        super().clean()

        if self.date and self.date > timezone.localdate():
            raise ValidationError(
                {"date": "Attendance cannot be recorded for a future date."}
            )

        # IMPROVEMENT: validate year is a plausible school year so garbage
        # data from imports cannot slip through. Adjust the lower bound as
        # needed for historical data.
        if self.year and (self.year < 2000 or self.year > timezone.localdate().year + 1):
            raise ValidationError(
                {"year": f"'{self.year}' is not a plausible school year."}
            )

        # Non-school days (holidays, closures, weekends) never take attendance.
        # Only checked for new rows so historic records on such dates can
        # still be corrected or deleted by an admin; the API additionally
        # checks whenever the date of an existing record is changed.
        if self.date and self._state.adding:
            from apps.attendance.services import non_school_reason
            reason = non_school_reason(self.date)
            if reason:
                raise ValidationError(
                    {"date": f"Attendance cannot be recorded because this date is a non-school day ({reason})."}
                )

        valid_terms = {choice[0] for choice in self.Term.choices}
        if self.term not in valid_terms:
            raise ValidationError(
                {
                    "term": (
                        f"'{self.term}' is not a valid term. "
                        f"Expected one of: {', '.join(sorted(valid_terms))}."
                    )
                }
            )

    # ------------------------------------------------------------------
    # Save — no-op override removed; super().save() is called implicitly.
    # Keeping a pass-through save() adds maintenance surface for no gain.
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # Convenience properties
    # ------------------------------------------------------------------

    @property
    def is_present(self) -> bool:
        return self.status == self.Status.PRESENT

    @property
    def is_absent(self) -> bool:
        return self.status == self.Status.ABSENT

    @property
    def is_late(self) -> bool:
        return self.status == self.Status.LATE

    # IMPROVEMENT: single helper used by views/serializers that need to check
    # "counts toward attendance rate" logic in one place.
    @property
    def is_excused(self) -> bool:
        return self.status == self.Status.EXCUSED

    @property
    def counts_as_present(self) -> bool:
        """Present *and* late both count as attended. Excused days are
        neither attended nor absent: they are left out of the rate."""
        return self.status in (self.Status.PRESENT, self.Status.LATE)


# ---------------------------------------------------------------------------
# School calendar
# ---------------------------------------------------------------------------

class SchoolCalendar(models.Model):
    """
    A date (or inclusive date range) that changes whether school is in
    session: holidays, breaks, closures — or, with is_school_day=True, a
    special school day that overrides a weekend / holiday (e.g. a Saturday
    make-up class).
    """

    class EventType(models.TextChoices):
        HOLIDAY         = "holiday",         "Holiday"
        MID_TERM_BREAK  = "mid_term_break",  "Mid-Term Break"
        VACATION        = "vacation",        "Vacation"
        PUBLIC_HOLIDAY  = "public_holiday",  "Public Holiday"
        SCHOOL_CLOSURE  = "school_closure",  "School Closure"
        STAFF_TRAINING  = "staff_training",  "Staff Training"
        SPECIAL_EVENT   = "special_event",   "Special Event"
        OTHER           = "other",           "Other"

    name        = models.CharField(max_length=150)
    event_type  = models.CharField(max_length=20, choices=EventType.choices, default=EventType.HOLIDAY)
    start_date  = models.DateField()
    end_date    = models.DateField()
    is_school_day = models.BooleanField(
        default=False,
        help_text="Off (default): non-school day, no attendance. On: a school day that overrides a weekend/holiday.",
    )
    year        = models.PositiveIntegerField(default=_get_current_year, help_text="Academic year (e.g. 2026).")
    term        = models.CharField(max_length=10, choices=Attendance.Term.choices, blank=True, default="")
    description = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="calendar_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="calendar_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "School calendar entry"
        verbose_name_plural = "School calendar entries"
        ordering = ["start_date", "end_date"]
        indexes = [
            models.Index(fields=["start_date", "end_date"]),
            models.Index(fields=["year", "term"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="schoolcalendar_end_not_before_start",
            ),
        ]

    def __str__(self):
        span = str(self.start_date) if self.start_date == self.end_date else f"{self.start_date} → {self.end_date}"
        return f"{self.name} ({span})"

    def clean(self):
        super().clean()
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date cannot be before the start date."})
