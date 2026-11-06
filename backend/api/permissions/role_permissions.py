from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsTeacher(BasePermission):

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "teacher"


class IsStudent(BasePermission):

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "student"
"""
Petty cash permissions.

The entire Accounting feature (this app) is admin-only — no other role
gets any access, submit or otherwise. Your User model currently only has
three roles: admin / teacher / student (apps/accounts/models.py). The
spec calls for dedicated Accountant, Bursar, and Finance Manager roles,
which don't exist yet — so for now, everything here checks for `admin`.

When those finance-specific roles exist and you want to open up, say,
expense-claim submission to more than admin, this is the only file that
needs to change: edit the tuples below. Every petty cash view imports
from here rather than role-checking inline.
"""

from rest_framework.permissions import BasePermission

# Roles allowed to approve, reject, and pay petty cash claims, and to
# create/close floats.
FINANCE_ROLES = ("admin",)

# Roles allowed to submit expense claims / replenishment requests.
# Currently identical to FINANCE_ROLES — accounting is admin-only, full
# stop. Kept as a separate constant (rather than reusing FINANCE_ROLES
# directly) so that if you later want teachers to submit claims for
# admin approval without touching anything else, this is still the only
# line to change.
REQUESTER_ROLES = ("admin",)


class IsFinanceStaff(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in FINANCE_ROLES)


class CanRequestPettyCash(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in REQUESTER_ROLES)