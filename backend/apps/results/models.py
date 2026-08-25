from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone

from apps.students.models import Student
from apps.subjects.models import Subject
from apps.classes.models import SchoolClass


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TERM_CHOICES = (
    ("term1", "Term 1"),
    ("term2", "Term 2"),
    ("term3", "Term 3"),
)


# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------

class ResultManager(models.Manager):
    """
    Prevent callers from using QuerySet.update() on score-component fields.
    update() bypasses model.save(), so `score` would silently drift out of sync.
    Always route writes through Result.save() or the bulk_save API action.
    """
    def update(self, **kwargs):
        score_fields = {"reopen", "ca", "exams"}
        if score_fields.intersection(kwargs):
            raise ValueError(
                "Use Result.save() (or the bulk-save endpoint) to update reopen/ca/exams "
                "so that the computed `score` field stays in sync."
            )
        return super().update(**kwargs)


class Result(models.Model):
    student      = models.ForeignKey(Student,     on_delete=models.CASCADE, related_name="results")
    subject      = models.ForeignKey(Subject,     on_delete=models.CASCADE, related_name="results")
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, null=True, blank=True, related_name="results")
    term         = models.CharField(max_length=10, choices=TERM_CHOICES)

    @staticmethod
    def _get_current_year() -> int:
        return getattr(settings, "CURRENT_YEAR", timezone.now().year)

    year   = models.PositiveIntegerField(default=_get_current_year.__func__)

    reopen = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(20)])
    ca     = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(40)])
    exams  = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(40)])
    score  = models.FloatField(default=0, editable=False)

    subject_position = models.IntegerField(null=True, blank=True, default=None)
    created_at       = models.DateTimeField(auto_now_add=True)

    objects = ResultManager()

    class Meta:
        unique_together = ["student", "subject", "term", "year"]
        ordering        = ["-created_at"]

    def __str__(self):
        return f"{self.student} – {self.subject} – {self.score}"

    def save(self, *args, **kwargs):
        self.score = round(self.reopen + self.ca + self.exams, 1)
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# CharacterAssessment
# ---------------------------------------------------------------------------

class CharacterAssessment(models.Model):
    student      = models.ForeignKey(Student,     on_delete=models.CASCADE, related_name="character_assessments")
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, null=True, blank=True, related_name="character_assessments")
    term         = models.CharField(max_length=10, choices=TERM_CHOICES)
    year         = models.PositiveIntegerField()

    cohort  = models.CharField(max_length=50, blank=True, default="1st")
    areas   = models.JSONField(blank=True, default=dict)
    career  = models.JSONField(blank=True, default=dict)

    teacher_name = models.CharField(max_length=255, blank=True, default="")
    teacher_sig  = models.CharField(max_length=255, blank=True, default="")
    teacher_date = models.CharField(max_length=50,  blank=True, default="")

    trainer_name = models.CharField(max_length=255, blank=True, default="")
    trainer_sig  = models.CharField(max_length=255, blank=True, default="")
    trainer_date = models.CharField(max_length=50,  blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["student", "term", "year"]
        ordering        = ["-created_at"]

    def __str__(self):
        return f"{self.student} — {self.term} {self.year}"

# ---------------------------------------------------------------------------
# MockResult — Basic 9 BECE-style mock exams
# ---------------------------------------------------------------------------

MOCK_CHOICES = tuple((f"mock{i}", f"Mock {i}") for i in range(1, 7))


class MockResultManager(models.Manager):
    def update(self, **kwargs):
        if "score" in kwargs:
            raise ValueError(
                "Use MockResult.save() or the bulk-save endpoint to update score."
            )
        return super().update(**kwargs)


class MockResult(models.Model):
    """
    A single subject score for one BECE-style mock sitting (Basic 9 only).

    Deliberately separate from Result: mocks use a raw /100 score with BECE
    grading (1-9, lower=better; cut points in grades.py:GRADE_THRESHOLDS_MOCK,
    which are NOT the same as the in-term B79 thresholds — the mock sheet
    grades 74-100 as "1", the term report grades 90-100 as "1"), and are
    ranked by a best-six aggregate rather than a reopen/ca/exams breakdown
    or class rank.
    """
    student      = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="mock_results")
    subject      = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="mock_results")
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, null=True, blank=True, related_name="mock_results")
    mock         = models.CharField(max_length=10, choices=MOCK_CHOICES)
    year         = models.PositiveIntegerField(default=Result._get_current_year.__func__)

    score = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])

    created_at = models.DateTimeField(auto_now_add=True)

    objects = MockResultManager()

    class Meta:
        unique_together = ["student", "subject", "mock", "year"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student} – {self.subject} – {self.mock} – {self.score}"


# ---------------------------------------------------------------------------
# PreschoolAssessment — rubric-based termly report (e.g. Little Angels)
# ---------------------------------------------------------------------------

class PreschoolAssessment(models.Model):
    """
    Rubric-based termly assessment for pre-school classes, replacing the
    subject/score report used for older classes entirely. Each row on the
    printed report (Crying, Play, Eating, ...) becomes one entry in
    `ratings`:

        ratings = {
          "crying": {"level": 1, "score": 80},
          "eating":  {"level": 2, "score": None},
          ...
        }

    `level` is which of the three descriptive statements the teacher ticked
    (1 = best .. 3 = needs support). `score` is the optional percentage the
    teacher enters for that row (as seen on the sample: "A= 80%"). The
    canonical list/order/labels of categories lives in grades.py
    (PRESCHOOL_CATEGORIES) so the frontend and any future PDF stay in sync
    with a single source of truth — adding a category there is enough,
    no migration needed since ratings is a JSONField.
    """
    student      = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="preschool_assessments")
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, null=True, blank=True, related_name="preschool_assessments")
    term         = models.CharField(max_length=10, choices=TERM_CHOICES)
    year         = models.PositiveIntegerField(default=Result._get_current_year.__func__)

    ratings = models.JSONField(blank=True, default=dict)

    conduct             = models.CharField(max_length=100, blank=True, default="")
    interest            = models.CharField(max_length=255, blank=True, default="")
    attitude            = models.CharField(max_length=255, blank=True, default="")
    teacher_performance = models.CharField(max_length=255, blank=True, default="")
    remark              = models.TextField(blank=True, default="")

    attendance       = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    attendance_total = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    promotion_status = models.CharField(
        max_length=20, null=True, blank=True, default=None,
        choices=[
            ("promoted", "Promoted"), ("repeated", "Repeated"),
            ("transferred", "Transferred"), ("withdrawn", "Withdrawn"),
        ],
    )
    next_class = models.ForeignKey(
        SchoolClass, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="incoming_preschool_promotions",
    )

    vacation_date   = models.DateField(null=True, blank=True)
    resumption_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["student", "term", "year"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student} — {self.term} {self.year} (preschool)"

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

class Report(models.Model):

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    term = models.CharField(max_length=10, choices=TERM_CHOICES)
    year = models.PositiveIntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
    )

    attendance       = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    attendance_total = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    interest       = models.TextField(blank=True)
    conduct        = models.CharField(max_length=100, blank=True)
    teacher_remark = models.TextField(blank=True)

    vacation_date   = models.DateField(null=True, blank=True)
    resumption_date = models.DateField(null=True, blank=True)

    promotion_status = models.CharField(
        max_length=20,
        choices=[
            ("promoted",    "Promoted"),
            ("repeated",    "Repeated"),
            ("transferred", "Transferred"),
            ("withdrawn",   "Withdrawn"),
        ],
        null=True, blank=True, default=None,
        help_text="End-of-term progression decision for this student.",
    )
    next_class = models.ForeignKey(
        SchoolClass,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="incoming_promotions",
        help_text="Class this student will join next term.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["student", "term", "year"]
        ordering        = ["-year", "term"]

    def __str__(self):
        return f"{self.student} – {self.term} {self.year}"
