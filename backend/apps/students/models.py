from django.db import models
from django.conf import settings
from cloudinary.models import CloudinaryField
from apps.classes.models import SchoolClass


class Student(models.Model):

    GENDER_CHOICES = [
        ("Male",   "Male"),
        ("Female", "Female"),
        ("Other",  "Other"),
    ]

    RELIGION_CHOICES = [
        ("Christian",        "Christian"),
        ("Muslim",           "Muslim"),
        ("Other",            "Other"),
        ("Prefer not to say","Prefer not to say"),
    ]

    # ── Core identity ──────────────────────────────────────────
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    admission_number = models.CharField(max_length=50, unique=True)

    # ── Name fields ────────────────────────────────────────────
    student_name = models.CharField(max_length=255, blank=True, default="")
    first_name   = models.CharField(max_length=100, blank=True, default="")
    last_name    = models.CharField(max_length=100, blank=True, default="")

    # ── Class & photo ──────────────────────────────────────────
    school_class = models.ForeignKey(
        SchoolClass,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="students",
    )
    photo = CloudinaryField(
        resource_type="image",
        folder="students",
        blank=True,
        null=True,
    )

    # ── Personal details ───────────────────────────────────────
    gender        = models.CharField(max_length=10,  blank=True, default="", choices=GENDER_CHOICES)
    date_of_birth = models.DateField(null=True, blank=True)
    phone         = models.CharField(max_length=20,  blank=True, default="")
    address       = models.TextField(blank=True, default="")
    nationality   = models.CharField(max_length=100, blank=True, default="")
    religion      = models.CharField(max_length=50,  blank=True, default="", choices=RELIGION_CHOICES)
    health_notes  = models.TextField(blank=True, default="")

    # ── Parent / guardian ──────────────────────────────────────
    parent_name  = models.CharField(max_length=100, blank=True, default="")
    parent_phone = models.CharField(max_length=20,  blank=True, default="")

    # ── Academic history ───────────────────────────────────────
    previous_school = models.CharField(max_length=255, blank=True, default="")
    admission_date  = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name", "user__username"]

    # ── Helpers ────────────────────────────────────────────────
    @property
    def full_name(self):
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return (
            self.student_name
            or self.user.get_full_name()
            or self.user.username
        )

    def __str__(self):
        return f"{self.full_name} ({self.admission_number})"
