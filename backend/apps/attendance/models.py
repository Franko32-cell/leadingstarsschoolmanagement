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
        """Present *and* late both count toward the attendance rate."""
        return self.status in (self.Status.PRESENT, self.Status.LATE)
