from django.apps import AppConfig


class FeesConfig(AppConfig):
    name = "apps.fees"

    def ready(self):
        import apps.fees.signals  # noqa