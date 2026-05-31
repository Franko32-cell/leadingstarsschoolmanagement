from django.db import models


class Announcement(models.Model):

    PRIORITY_CHOICES = [
        ("normal",  "Normal"),
        ("urgent",  "Urgent"),
        ("critical","Critical"),
    ]

    AUDIENCE_CHOICES = [
        ("all",      "Everyone"),
        ("students", "Students Only"),
        ("teachers", "Teachers Only"),
        ("parents",  "Parents Only"),
    ]

    title     = models.CharField(max_length=255)
    message   = models.TextField()
    priority  = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default="normal",
        db_index=True,
    )
    audience  = models.CharField(
        max_length=10,
        choices=AUDIENCE_CHOICES,
        default="all",
        db_index=True,
    )
    # Optional: pin important announcements to the top
    is_pinned = models.BooleanField(default=False, db_index=True)

    # Optional: auto-expire announcements after a date
    expires_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title}"