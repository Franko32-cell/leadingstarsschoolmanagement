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
        CURRENT_TERM = "term3"   # update at the start of each term
        CURRENT_YEAR = 2025
    """
    return getattr(settings, "CURRENT_TERM", "term3")


def _get_current_year() -> int:
    return getattr(settings, "CURRENT_YEAR", timezone.now().year)


# ---------------------------------------------------------------------------
# School calendar / non-school-day tracker
# ---------------------------------------------------------------------------

class SchoolCalendar(models.Model):
    """Administrative holiday, break, and school-closure calendar."""

    TERM_CHOICES = [
        ("term1", "Term 1"),
        ("term2", "Term 2"),
        ("term3", "Term 3"),
    ]

    class EventType(models.TextChoices):
        HOLIDAY = "holiday", "Holiday"
        MID_TERM_BREAK = "mid_term_break", "Mid-Term Break"
        VACATION = "vacation", "Vacation"
        PUBLIC_HOLIDAY = "public_holiday", "Public Holiday"
        SCHOOL_CLOSURE = "school_closure", "School Closure"
        STAFF_TRAINING = "staff_training", "Staff Training"
        SPECIAL_EVENT = "special_event", "Special Event"
        OTHER = "other", "Other"

    name = models.CharField(max_length=200)
    event_type = models.CharField(
        max_length=40,
        choices=EventType.choices,
        default=EventType.HOLIDAY,
    )
    year = models.PositiveIntegerField(default=_get_current_year)
    term = models.CharField(
        max_length=10,
        choices=TERM_CHOICES,
        blank=True,
        null=True,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    description = models.TextField(blank=True, default="")
    is_school_day = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "School Calendar"
        verbose_name_plural = "School Calendar"
        ordering = ["start_date", "name"]
        indexes = [
            models.Index(fields=["year", "term", "start_date"]),
            models.Index(fields=["start_date", "end_date"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.start_date} to {self.end_date})"

    @classmethod
    def is_non_school_day_for_date(cls, target_date, *, year=None, term=None):
        """Return True when a date is a weekend or an explicitly marked non-school day."""
        if not target_date:
            return False

        if target_date.weekday() >= 5:
            weekend_override = (
                cls.objects.filter(
                    start_date__lte=target_date,
                    end_date__gte=target_date,
                    is_school_day=True,
                )
            )
            if year is not None:
                weekend_override = weekend_override.filter(year=year)
            if term:
                weekend_override = weekend_override.filter(term=term)
            return not weekend_override.exists()

        queryset = cls.objects.filter(
            start_date__lte=target_date,
            end_date__gte=target_date,
        )
        if year is not None:
            queryset = queryset.filter(year=year)
        if term:
            queryset = queryset.filter(term=term)

        calendar_item = queryset.order_by("-is_school_day").first()
        if calendar_item is None:
            return False
        return not calendar_item.is_school_day


class Attendance(models.Model):

    class Term(models.TextChoices):
        TERM1 = "term1", "Term 1"
        TERM2 = "term2", "Term 2"
        TERM3 = "term3", "Term 3"

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
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

        if self.date and SchoolCalendar.is_non_school_day_for_date(self.date, year=self.year, term=self.term):
            raise ValidationError(
                {"date": "Attendance cannot be recorded because this date is a non-school day."}
            )

        # IMPROVEMENT: validate year is a plausible school year so garbage
        # data from imports cannot slip through. Adjust the lower bound as
        # needed for historical data.
        if self.year and (self.year < 2000 or self.year > timezone.localdate().year + 1):
            raise ValidationError(
                {"year": f"'{self.year}' is not a plausible school year."}
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
    def counts_as_present(self) -> bool:
        """Present, late, and excused entries count toward the attendance total."""
        return self.status in (self.Status.PRESENT, self.Status.LATE, self.Status.EXCUSED)
