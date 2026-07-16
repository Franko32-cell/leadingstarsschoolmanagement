from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.audit"

    def ready(self):
        # Import signal handlers so they are registered when Django starts.
        import apps.audit.signals  # noqa: F401
