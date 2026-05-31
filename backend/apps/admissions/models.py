from django.db import models
from cloudinary.models import CloudinaryField


class Admission(models.Model):

    first_name   = models.CharField(max_length=150, blank=True, default="")
    last_name    = models.CharField(max_length=150, blank=True, default="")
    student_name = models.CharField(max_length=255, blank=True, default="")

    gender = models.CharField(
        max_length=10,
        choices=[("Male", "Male"), ("Female", "Female")],
        blank=True, default="",
    )
    date_of_birth = models.DateField(null=True, blank=True)
    nationality   = models.CharField(max_length=100, blank=True, default="")
    religion      = models.CharField(
        max_length=50,
        choices=[
            ("Christian", "Christian"), ("Muslim", "Muslim"),
            ("Other", "Other"), ("Prefer not to say", "Prefer not to say"),
        ],
        blank=True, default="",
    )

    # Use resource_type keyword argument, not positional
    photo = CloudinaryField(
        resource_type="image",
        folder="admissions/photos",
        blank=True,
        null=True,
    )

    applied_class = models.ForeignKey(
        "classes.SchoolClass",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="admissions",
    )
    previous_school = models.CharField(max_length=255, blank=True, default="")
    health_notes    = models.TextField(blank=True, default="")

    parent_name   = models.CharField(max_length=255, blank=True, default="")
    parent_gender = models.CharField(
        max_length=10,
        choices=[("Male", "Male"), ("Female", "Female")],
        blank=True, default="",
    )
    relationship = models.CharField(
        max_length=20,
        choices=[
            ("Father", "Father"), ("Mother", "Mother"),
            ("Guardian", "Guardian"), ("Other", "Other"),
        ],
        blank=True, default="",
    )
    email     = models.EmailField(blank=True, default="")
    phone     = models.CharField(max_length=20, blank=True, default="")
    alt_phone = models.CharField(max_length=20, blank=True, default="")
    address   = models.TextField(blank=True, default="")

    admission_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    application_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=50,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="pending",
        db_index=True,
    )

    class Meta:
        ordering = ["-application_date"]

    def save(self, *args, **kwargs):
        self.student_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

    def __str__(self):
        name = self.student_name or "Unknown"
        return f"{name} ({self.admission_number})" if self.admission_number else name