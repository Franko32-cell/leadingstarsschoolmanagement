from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    Immutable record of a significant action taken in the system.

    This model is intentionally generic (module/action/resource_* fields)
    so it can log actions from ANY existing app (students, teachers, fees,
    attendance, results, announcements, accounts) without those apps
    needing a foreign key back here or any schema changes of their own.

    Write to it using apps.audit.services.log_action(...) from anywhere
    in the codebase - see that file for usage examples.
    """

    class Action(models.TextChoices):
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        LOGIN_FAILED = "login_failed", "Failed Login"
        CREATE = "create", "Record Created"
        UPDATE = "update", "Record Updated"
        DELETE = "delete", "Record Deleted"
        ARCHIVE = "archive", "Record Archived"
        RESTORE = "restore", "Record Restored"
        ATTENDANCE_UPDATE = "attendance_update", "Attendance Updated"
        RESULT_UPLOAD = "result_upload", "Result Uploaded"
        FEE_UPDATE = "fee_update", "Fee Updated"
        PAYMENT_PROCESSED = "payment_processed", "Payment Processed"
        RECEIPT_GENERATED = "receipt_generated", "Receipt Generated"
        BILL_GENERATED = "bill_generated", "Bill Generated"
        ANNOUNCEMENT_CREATED = "announcement_created", "Announcement Created"
        USER_ACTIVATED = "user_activated", "User Activated"
        USER_DEACTIVATED = "user_deactivated", "User Deactivated"
        USER_SUSPENDED = "user_suspended", "User Suspended"
        USER_REINSTATED = "user_reinstated", "User Reinstated"
        ROLE_CHANGED = "role_changed", "Role Changed"
        PERMISSION_CHANGED = "permission_changed", "Permission Changed"
        PASSWORD_RESET = "password_reset", "Password Reset"
        PIN_RESET = "pin_reset", "PIN Reset"
        API_ACTION = "api_action", "API Action"
        FILE_UPLOAD = "file_upload", "File Uploaded"
        NOTIFICATION_SENT = "notification_sent", "Notification Sent"

    class Module(models.TextChoices):
        AUTH = "auth", "Authentication"
        STUDENTS = "students", "Students"
        TEACHERS = "teachers", "Teachers"
        CLASSES = "classes", "Classes"
        ATTENDANCE = "attendance", "Attendance"
        RESULTS = "results", "Results"
        FEES = "fees", "Fees"
        ADMISSIONS = "admissions", "Admissions"
        ANNOUNCEMENTS = "announcements", "Announcements"
        ACCOUNTS = "accounts", "Accounts"
        ACCOUNTING = "accounting", "Accounting"
        NOTIFICATIONS = "notifications", "Notifications"
        SYSTEM = "system", "System"

    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    # Who. Nullable + SET_NULL so deleting a user never deletes their
    # audit trail - we keep a text snapshot of identity/role alongside
    # the FK so the log stays meaningful even after the user is gone.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    actor_username = models.CharField(max_length=150, blank=True, default="")
    actor_role = models.CharField(max_length=50, blank=True, default="")

    # What.
    action = models.CharField(max_length=32, choices=Action.choices)
    module = models.CharField(max_length=32, choices=Module.choices)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.SUCCESS
    )

    # On what. resource_id is a CharField (not an FK) on purpose: audit
    # logs must survive the deletion of whatever they describe, and the
    # referenced record can come from any app/table.
    resource_type = models.CharField(max_length=100, blank=True, default="")
    resource_id = models.CharField(max_length=100, blank=True, default="")
    resource_repr = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Human-readable label, e.g. 'Student: John Doe (STU-0012)'",
    )

    # Change detail.
    previous_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    description = models.TextField(blank=True, default="")

    # Request context.
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["module", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self):
        who = self.actor_username or "system"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {who} · {self.get_action_display()} · {self.module}"