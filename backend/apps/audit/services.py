"""
Central helper for writing audit log entries.

Usage from anywhere in the codebase (views, signals, serializers):

    from apps.audit.services import log_action

    log_action(
        request=request,                     # gives us user, IP, user-agent
        action="update",
        module="fees",
        resource_type="Fee",
        resource_id=fee.id,
        resource_repr=f"Fee: {fee.student} - {fee.term}",
        previous_value={"balance": old_balance},
        new_value={"balance": fee.balance},
        description="Payment recorded via receipt #1234",
    )

`request` is optional - if you're logging from a background job or a
signal that has no request (e.g. a management command), pass `user`,
`ip_address`, and `user_agent` directly instead.

This function never raises: a failure to write an audit log must never
break the actual business operation it's describing.
"""

import logging

from .models import AuditLog

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Best-effort client IP extraction, respecting a reverse proxy's
    X-Forwarded-For header (e.g. when deployed behind Render/Nginx)."""
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_user_role(user):
    """
    Resolve a display-friendly role string off the user object.
    Adjust the attribute lookups below to match your actual User model
    (apps/accounts/models.py) - this tries the common patterns so it
    works without edits, but a single `return user.role` is best if
    your User model already has a `role` field/property.
    """
    if user is None or not getattr(user, "is_authenticated", False):
        return "anonymous"
    if hasattr(user, "role") and user.role:
        return str(user.role)
    if getattr(user, "is_superuser", False):
        return "super_admin"
    if getattr(user, "is_staff", False):
        return "admin"
    return "user"


def log_action(
    request=None,
    *,
    user=None,
    action,
    module,
    status="success",
    resource_type="",
    resource_id="",
    resource_repr="",
    previous_value=None,
    new_value=None,
    description="",
    ip_address=None,
    user_agent="",
):
    try:
        actor = user or (getattr(request, "user", None) if request else None)
        if actor is not None and not getattr(actor, "is_authenticated", True):
            actor = None

        AuditLog.objects.create(
            user=actor,
            actor_username=getattr(actor, "username", "") or getattr(actor, "email", ""),
            actor_role=get_user_role(actor),
            action=action,
            module=module,
            status=status,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id != "" else "",
            resource_repr=resource_repr,
            previous_value=previous_value,
            new_value=new_value,
            description=description,
            ip_address=ip_address or get_client_ip(request),
            user_agent=user_agent or (request.META.get("HTTP_USER_AGENT", "")[:255] if request else ""),
        )
    except Exception:  # noqa: BLE001 - audit logging must never break the caller
        logger.exception("Failed to write audit log entry (action=%s, module=%s)", action, module)