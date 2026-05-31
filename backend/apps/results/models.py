from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

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

class Result(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="results")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="results")
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, null=True, blank=True, related_name="results")
    term = models.CharField(max_length=10, choices=TERM_CHOICES)

    # ✅ ADD THIS
    year = models.PositiveIntegerField(default=2025)

    reopen = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(20)])
    ca     = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(40)])
    exams  = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(40)])
    score  = models.FloatField(default=0, editable=False)
    subject_position = models.IntegerField(null=True, blank=True, default=None)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # ✅ ADD year here so two terms in different years don't collide
        unique_together = ["student", "subject", "term", "year"]
        ordering = ["-created_at"]
    def __str__(self):
        return f"{self.student} – {self.subject} – {self.score}"

    def save(self, *args, **kwargs):
        self.score = round(self.reopen + self.ca + self.exams, 1)
        super().save(*args, **kwargs)


class CharacterAssessment(models.Model):
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="character_assessments",
    )
    school_class = models.ForeignKey(
        SchoolClass,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="character_assessments",
    )
    term = models.CharField(max_length=10, choices=TERM_CHOICES)
    year = models.PositiveIntegerField()

    cohort = models.CharField(max_length=50, blank=True, default="1st")
    areas = models.JSONField(blank=True, default=dict)
    career = models.JSONField(blank=True, default=dict)

    teacher_name = models.CharField(max_length=255, blank=True, default="")
    teacher_sig = models.CharField(max_length=255, blank=True, default="")
    teacher_date = models.CharField(max_length=50, blank=True, default="")

    trainer_name = models.CharField(max_length=255, blank=True, default="")
    trainer_sig = models.CharField(max_length=255, blank=True, default="")
    trainer_date = models.CharField(max_length=50, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["student", "term", "year"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student} — {self.term} {self.year}"


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

    # Term calendar dates — editable by teachers via the report page
    vacation_date   = models.DateField(null=True, blank=True)
    resumption_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["student", "term", "year"]
        ordering        = ["-year", "term"]

    def __str__(self):
        return f"{self.student} – {self.term} {self.year}"