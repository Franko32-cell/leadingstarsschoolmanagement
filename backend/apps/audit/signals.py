"""
Wires Django's built-in auth signals to the audit log, so every login,
logout, and failed login is recorded automatically with zero changes
needed in your existing auth_view.py - as long as it authenticates via
django.contrib.auth (authenticate() + login()), which fires these
signals for you.

If your auth_view.py issues JWTs manually without calling
django.contrib.auth.login(), call log_action(...) directly there
instead (see api/views/auth_view.py integration note in the README).
"""

from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver

from .models import AuditLog
from .services import get_client_ip, get_user_role, log_action


@receiver(user_logged_in)
def handle_login(sender, request, user, **kwargs):
    log_action(
        request=request,
        user=user,
        action=AuditLog.Action.LOGIN,
        module=AuditLog.Module.AUTH,
        status=AuditLog.Status.SUCCESS,
        resource_repr=f"Login: {getattr(user, 'username', user)}",
    )


@receiver(user_logged_out)
def handle_logout(sender, request, user, **kwargs):
    log_action(
        request=request,
        user=user,
        action=AuditLog.Action.LOGOUT,
        module=AuditLog.Module.AUTH,
        status=AuditLog.Status.SUCCESS,
        resource_repr=f"Logout: {getattr(user, 'username', user)}",
    )


@receiver(user_login_failed)
def handle_login_failed(sender, credentials, request=None, **kwargs):
    attempted_username = credentials.get("username") or credentials.get("email") or "unknown"
    log_action(
        request=request,
        action=AuditLog.Action.LOGIN_FAILED,
        module=AuditLog.Module.AUTH,
        status=AuditLog.Status.FAILED,
        resource_repr=f"Failed login attempt: {attempted_username}",
        description="Invalid credentials",
        ip_address=get_client_ip(request),
    )