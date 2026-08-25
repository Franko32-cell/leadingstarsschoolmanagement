# api/views/teacher_view.py
import secrets
import string

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter

from apps.teachers.models import Teacher
from api.serializers.teacher_serializer import TeacherSerializer

# ── Account status + audit logging ──────────────────────────────────────
from apps.accounts.services import (
    set_account_status,
    reset_password as reset_user_password,
    unlock_login as clear_login_lockout,
)
from apps.audit.models import AuditLog
from api.permissions.role_permissions import IsAdmin


class TeacherFilter(FilterSet):
    school_class = CharFilter(field_name="school_class__id")
    subject      = CharFilter(field_name="subject__id")

    class Meta:
        model  = Teacher
        fields = ["school_class", "subject"]


class TeacherViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherSerializer
    filterset_class  = TeacherFilter
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields  = ["teacher_id", "hire_date"]
    ordering         = ["teacher_id"]

    def get_queryset(self):
        qs = (
            Teacher.objects
            .select_related("user", "subject", "school_class")
            .all()
        )
        # Archived teachers are hidden from normal listings by default —
        # pass ?include_archived=true to see them (e.g. a "Restore" view).
        include_archived = self.request.query_params.get("include_archived", "false")
        if include_archived.lower() != "true":
            qs = qs.exclude(user__account_status="archived")
        return qs

    # ── Admin account-management actions ──────────────────────────────────
    # Scoped to admins only via get_permissions(), without changing the
    # permission behaviour of the rest of this viewset's existing actions.

    def get_permissions(self):
        if self.action in {
            "activate", "deactivate", "suspend", "reinstate",
            "archive", "restore", "reset_password", "unlock_login",
        }:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def _label(self, teacher):
        return f"{teacher.full_name} ({teacher.teacher_id})"

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        teacher = self.get_object()  # respects get_queryset + permissions

        alphabet     = string.ascii_letters + string.digits
        new_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        reset_user_password(
            teacher.user, request=request, new_password=new_password,
            module=AuditLog.Module.TEACHERS, resource_type="Teacher",
            resource_label=self._label(teacher),
        )

        return Response({"new_password": new_password})

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        teacher = self.get_object()
        set_account_status(
            teacher.user, "active", request=request,
            module=AuditLog.Module.TEACHERS, resource_type="Teacher",
            resource_label=self._label(teacher),
        )
        return Response({"detail": f"{teacher.full_name} has been activated."})

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        teacher = self.get_object()
        set_account_status(
            teacher.user, "inactive", request=request,
            module=AuditLog.Module.TEACHERS, resource_type="Teacher",
            resource_label=self._label(teacher),
        )
        return Response({"detail": f"{teacher.full_name} has been deactivated."})

    @action(detail=True, methods=["post"], url_path="suspend")
    def suspend(self, request, pk=None):
        teacher = self.get_object()
        set_account_status(
            teacher.user, "suspended", request=request,
            module=AuditLog.Module.TEACHERS, resource_type="Teacher",
            resource_label=self._label(teacher),
        )
        return Response({"detail": f"{teacher.full_name} has been suspended."})

    @action(detail=True, methods=["post"], url_path="reinstate")
    def reinstate(self, request, pk=None):
        teacher = self.get_object()
        set_account_status(
            teacher.user, "active", request=request,
            module=AuditLog.Module.TEACHERS, resource_type="Teacher",
            resource_label=self._label(teacher),
        )
        return Response({"detail": f"{teacher.full_name} has been reinstated."})

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        teacher = self.get_object()
        set_account_status(
            teacher.user, "archived", request=request,
            module=AuditLog.Module.TEACHERS, resource_type="Teacher",
            resource_label=self._label(teacher),
        )
        return Response({"detail": f"{teacher.full_name} has been archived."})

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        teacher = self.get_object()
        set_account_status(
            teacher.user, "active", request=request,
            module=AuditLog.Module.TEACHERS, resource_type="Teacher",
            resource_label=self._label(teacher),
        )
        return Response({"detail": f"{teacher.full_name} has been restored."})

    @action(detail=True, methods=["post"], url_path="unlock-login")
    def unlock_login(self, request, pk=None):
        teacher = self.get_object()
        clear_login_lockout(
            teacher.user, request=request,
            module=AuditLog.Module.TEACHERS, resource_type="Teacher",
            resource_label=self._label(teacher),
        )
        return Response({"detail": f"{teacher.full_name}'s login lockout has been cleared."})