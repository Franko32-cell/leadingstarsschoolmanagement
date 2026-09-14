# apps/teachers/models.py
from django.db import models
from django.conf import settings
from apps.subjects.models import Subject
from apps.classes.models import SchoolClass


class Teacher(models.Model):
    teacher_id = models.CharField(
        max_length=20,
        unique=True,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    # CHANGE: replaced the old single `subject` ForeignKey with a
    # ManyToManyField so a teacher can be assigned more than one subject
    # (e.g. a teacher who teaches both Math and Physics). related_name
    # keeps the readable reverse lookup: subject.teachers.all().
    subjects = models.ManyToManyField(
        Subject,
        blank=True,
        related_name="teachers",
    )
    phone = models.CharField(max_length=20, blank=True, default="")
    school_class = models.ForeignKey(
        SchoolClass,
        on_delete=models.SET_NULL,
        null=True,
        # IMPROVEMENT: blank=True is required when null=True for form validation
        # to work correctly; omitting it caused ModelForm/API validation errors
        # when trying to save a teacher without a class assignment.
        blank=True,
        related_name="teachers",
    )
    # BUG FIX: hire_date had no default and was not nullable. Any code path that
    # creates a Teacher without explicitly supplying hire_date raised an
    # IntegrityError at the DB level with no clear message. Making it nullable
    # with blank=True lets the field be omitted gracefully while still allowing
    # it to be set when known.
    hire_date = models.DateField(null=True, blank=True)

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    def __str__(self):
        # IMPROVEMENT: returning only teacher_id meant the admin, error messages,
        # and select dropdowns showed opaque codes like "TCH001" instead of the
        # teacher's actual name. This is much more readable.
        return f"{self.full_name} ({self.teacher_id})"
