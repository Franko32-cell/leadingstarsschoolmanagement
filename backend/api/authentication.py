"""
JWT authentication that also keeps ``User.last_login`` fresh.

The old ``ActiveUserMiddleware`` read ``request.user`` at the Django
middleware layer, where JWT users are never resolved (only session users
are), so "last active" was never refreshed and the Active Users panel went
stale after the first login. Doing it here — after DRF has actually
authenticated the token — fixes that. Writes are throttled to once per
minute per user to avoid a DB write on every request.
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication

TOUCH_INTERVAL = timedelta(minutes=1)


class ActiveJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user, _token = result
            now = timezone.now()
            last = user.last_login
            if last is None or now - last >= TOUCH_INTERVAL:
                type(user)._default_manager.filter(pk=user.pk).update(last_login=now)
                user.last_login = now
        return result
