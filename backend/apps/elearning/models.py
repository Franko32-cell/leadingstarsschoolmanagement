from django.db import models
from django.utils import timezone

from apps.classes.models import SchoolClass
from apps.students.models import Student
from apps.subjects.models import Subject
from apps.teachers.models import Teacher


TERM_CHOICES = [
    ("term1", "Term 1"),
    ("term2", "Term 2"),
    ("term3", "Term 3"),
]


class LearningContentBase(models.Model):
    title = models.CharField(max_length=255)
    school_class = models.ForeignKey(
        SchoolClass, on_delete=models.CASCADE, related_name="%(class)s_content"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="%(class)s_content",
    )
    teacher = models.ForeignKey(
        Teacher, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="%(class)s_content",
    )
    term = models.CharField(max_length=10, choices=TERM_CHOICES, default="term1")
    year = models.PositiveIntegerField(default=timezone.now().year)
    attachment = models.FileField(upload_to="elearning/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Lesson(LearningContentBase):
    description = models.TextField(blank=True, default="")
    video_url = models.URLField(blank=True, default="")

    def __str__(self):
        return self.title


class Assignment(LearningContentBase):
    instructions = models.TextField(blank=True, default="")
    due_date = models.DateTimeField()
    max_score = models.PositiveIntegerField(default=100)

    def __str__(self):
        return self.title


class Submission(models.Model):
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name="submissions"
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="elearning_submissions"
    )
    text_answer = models.TextField(blank=True, default="")
    file = models.FileField(upload_to="elearning/submissions/", blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now=True)
    score = models.PositiveIntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["assignment", "student"], name="unique_assignment_student_submission"
            )
        ]

    @property
    def is_late(self):
        return self.submitted_at > self.assignment.due_date
