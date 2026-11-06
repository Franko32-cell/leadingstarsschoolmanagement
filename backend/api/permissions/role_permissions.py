from rest_framework.permissions import BasePermission, SAFE_METHODS


def _role(request):
    user = request.user
    return getattr(user, "role", None) if user and user.is_authenticated else None


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == "admin"


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == "teacher"


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == "student"


class IsAdminOrTeacher(BasePermission):
    """Staff only (admin or teacher)."""

    def has_permission(self, request, view):
        return _role(request) in ("admin", "teacher")


class IsAdminOrReadOnly(BasePermission):
    """Any logged-in user may read; only admins may write."""

    def has_permission(self, request, view):
        role = _role(request)
        if role is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        return role == "admin"


class StaffWriteStudentRead(BasePermission):
    """
    Admin/teacher: full access. Student: read-only. Row-level scoping of what
    a student can see is done in the view's get_queryset (see ScopedToOwnStudent).
    """

    def has_permission(self, request, view):
        role = _role(request)
        if role in ("admin", "teacher"):
            return True
        return role == "student" and request.method in SAFE_METHODS


class AdminWriteTeacherStudentRead(BasePermission):
    """Admin: full. Teacher/Student: read-only (scoped by the view)."""

    def has_permission(self, request, view):
        role = _role(request)
        if role == "admin":
            return True
        return role in ("teacher", "student") and request.method in SAFE_METHODS


class IsAdminOrOwnStudent(BasePermission):
    """
    For endpoints addressed by ``student_id`` in the URL: staff may access
    any student; a student may only access their own record.
    Staff-only methods (non-safe) must be restricted separately.
    """

    staff_roles = ("admin", "teacher")
    kwarg = "student_id"

    def has_permission(self, request, view):
        role = _role(request)
        if role in self.staff_roles:
            return True
        if role != "student":
            return False
        from apps.students.models import Student
        sid = view.kwargs.get(self.kwarg)
        return Student.objects.filter(pk=sid, user=request.user).exists()


class AdminOrOwnStudentReadOnly(IsAdminOrOwnStudent):
    """Teachers are NOT included (e.g. fee bills)."""

    staff_roles = ("admin",)


class IsAdminOrOwnReceipt(BasePermission):
    def has_permission(self, request, view):
        role = _role(request)
        if role == "admin":
            return True
        if role != "student":
            return False
        from apps.fees.models import PaymentTransaction
        return PaymentTransaction.objects.filter(
            pk=view.kwargs.get("transaction_id"), fee__student__user=request.user
        ).exists()


class ScopedToOwnStudent:
    """
    Mixin for ViewSets: a student only ever sees rows belonging to their own
    Student profile, whatever filters the client sends. Set
    ``student_lookup`` to the ORM path of the Student on the model.
    """

    student_lookup = "student"

    def scope_queryset_for_user(self, qs):
        role = _role(self.request)
        if role == "student":
            return qs.filter(**{f"{self.student_lookup}__user": self.request.user})
        if role in ("admin", "teacher"):
            return qs
        return qs.none()


class StaffOrOwnStudentRead(IsAdminOrOwnStudent):
    """Staff: any method. Student: read-only access to their own record."""

    def has_permission(self, request, view):
        if _role(request) == "student" and request.method not in SAFE_METHODS:
            return False
        return super().has_permission(request, view)


# ─────────────────────────────────────────────────────────────────────────
# Petty cash permissions (imported by apps/accounting/permissions.py)
#
# The entire Accounting feature is admin-only. When dedicated Accountant /
# Bursar / Finance Manager roles exist, edit the tuples below — every petty
# cash view imports from here rather than role-checking inline.
# ─────────────────────────────────────────────────────────────────────────

# Roles allowed to approve, reject, and pay petty cash claims, and to
# create/close floats.
FINANCE_ROLES = ("admin",)

# Roles allowed to submit expense claims / replenishment requests.
REQUESTER_ROLES = ("admin",)


class IsFinanceStaff(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in FINANCE_ROLES)


class CanRequestPettyCash(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in REQUESTER_ROLES)
