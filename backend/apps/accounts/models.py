from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    ROLE_CHOICES = (
        ("admin",   "Admin"),
        ("teacher", "Teacher"),
        ("student", "Student"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")

    # Admin approval workflow:
    # - Non-admin users: is_approved=True always (irrelevant for them)
    # - New admin registrations: is_approved=False, is_active=False
    # - Approved admins: is_approved=True, is_active=True
    # - Rejected admins: is_approved=False, is_active=False (stays inactive)
    is_approved = models.BooleanField(
        default=True,
        help_text="Admin accounts require approval by an existing admin before they can log in.",
    )

    def __str__(self):
        return self.username