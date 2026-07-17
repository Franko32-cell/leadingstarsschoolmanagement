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

    # ── Added for the Admin Settings / Audit Center expansion ────────────────
    # Distinct account lifecycle states for students & teachers. Both roles
    # share this field via their 1:1 `user` relation rather than duplicating
    # status flags on Student and Teacher separately.
    #
    # "suspended" and "archived" both drive is_active=False (so login is
    # blocked the same way a plain deactivation already is) but are tracked
    # separately so admins/audit logs can distinguish "temporarily suspended
    # pending review" from "permanently archived / soft-deleted" from a
    # simple manual deactivation.
    STATUS_CHOICES = (
        ("active",    "Active"),
        ("inactive",  "Inactive"),
        ("suspended", "Suspended"),
        ("archived",  "Archived"),
    )
    account_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        help_text="Drives is_active automatically — see apps/accounts/services.py:set_account_status().",
    )
    archived_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the most recent archive action, for record-keeping.",
    )

    def __str__(self):
        return self.username