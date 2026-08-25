from django.utils import timezone
from apps.audit.models import AuditLog
from apps.audit.services import log_action
from axes.utils import reset as axes_reset

# Maps a target account_status to the corresponding AuditLog.Action so
# callers don't have to know this mapping themselves.
_ACTION_FOR_STATUS = {
    "active":    AuditLog.Action.USER_ACTIVATED,
    "inactive":  AuditLog.Action.USER_DEACTIVATED,
    "suspended": AuditLog.Action.USER_SUSPENDED,
    "archived":  AuditLog.Action.ARCHIVE,
}


def set_account_status(user, new_status, *, request=None, module, resource_type, resource_label):
    """
    Transition `user`'s account_status, keep is_active in sync, and write
    a matching audit log entry.
    - "active"    -> is_active=True
    - anything else (inactive/suspended/archived) -> is_active=False,
      since all three should block login the same way is_active=False
      already does for existing code (see LoginView's `if not
      user.is_active` check) — they're just tracked as different reasons.
    - "archived"  -> also stamps archived_at; restoring back to "active"
      clears it.
    module/resource_type/resource_label let the caller (StudentViewSet or
    TeacherViewSet) control how this shows up in the audit log, e.g.
    module=AuditLog.Module.STUDENTS, resource_type="Student",
    resource_label=f"{student.full_name} ({student.admission_number})".
    """
    previous_status = user.account_status
    user.account_status = new_status
    user.is_active = new_status == "active"
    user.archived_at = timezone.now() if new_status == "archived" else None
    user.save(update_fields=["account_status", "is_active", "archived_at"])
    action = _ACTION_FOR_STATUS.get(new_status, AuditLog.Action.UPDATE)
    if previous_status == "archived" and new_status != "archived":
        action = AuditLog.Action.RESTORE
    log_action(
        request=request,
        action=action,
        module=module,
        resource_type=resource_type,
        resource_id=user.id,
        resource_repr=f"{resource_type}: {resource_label}",
        previous_value={"account_status": previous_status},
        new_value={"account_status": new_status},
    )
    return user


def reset_password(user, *, request=None, module, resource_type, resource_label, new_password):
    """Sets a new password and writes the matching audit entry."""
    user.set_password(new_password)
    user.save(update_fields=["password"])
    log_action(
        request=request,
        action=AuditLog.Action.PASSWORD_RESET,
        module=module,
        resource_type=resource_type,
        resource_id=user.id,
        resource_repr=f"{resource_type}: {resource_label}",
        description="Password reset by administrator",
    )


def unlock_login(user, *, request=None, module, resource_type, resource_label):
    """
    Clears any django-axes lockout for `user` after repeated failed login
    attempts. This is independent of `account_status` — a user can be
    "active" in our own accounting and still be axes-locked out, since
    axes tracks failures against username/IP directly (see LoginView's
    AxesProxyHandler.is_locked check). Reinstating/restoring account_status
    does NOT clear this; it must be reset explicitly here.
    """
    axes_reset(username=user.username)
    log_action(
        request=request,
        action=AuditLog.Action.LOGIN_UNLOCKED,
        module=module,
        resource_type=resource_type,
        resource_id=user.id,
        resource_repr=f"{resource_type}: {resource_label}",
        description="Login lockout cleared by administrator after repeated failed attempts",
    )
    return user
