# api/middleware.py
from django.utils.timezone import now
from django.contrib.auth import get_user_model

User = get_user_model()


class ActiveUserMiddleware:
    """
    Updates last_login on every authenticated request.
    This powers the "active users" monitoring panel in the sidebar.
    Users active within the last 5 minutes are considered online.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Bulk update to avoid triggering save() signals unnecessarily
            User.objects.filter(pk=request.user.pk).update(last_login=now())
        return self.get_response(request)
