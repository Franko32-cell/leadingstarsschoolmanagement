import secrets
import string

from django.db import models
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from apps.students.models import Student
from api.serializers.student_serializer import StudentSerializer

# ── Account status + audit logging ──────────────────────────────────────
from apps.accounts.services import set_account_status, reset_password as reset_user_password
from apps.audit.models import AuditLog
from api.permissions.role_permissions import IsAdmin


class StudentViewSet(ModelViewSet):
    queryset         = Student.objects.select_related("user", "school_class").all()
    serializer_class = StudentSerializer
    parser_classes   = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        school_class     = self.request.query_params.get("school_class")
        admission_number = self.request.query_params.get("admission_number")
        search           = self.request.query_params.get("search")

        if school_class:
            queryset = queryset.filter(school_class_id=school_class)
        if admission_number:
            queryset = queryset.filter(admission_number__iexact=admission_number)
        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(student_name__icontains=search) |
                models.Q(admission_number__icontains=search)
            )

        # Archived students are hidden from normal listings by default —
        # pass ?include_archived=true to see them (e.g. the "Restore" view
        # in Admin Settings).
        include_archived = self.request.query_params.get("include_archived", "false")
        if include_archived.lower() != "true":
            queryset = queryset.exclude(user__account_status="archived")

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    # ── Admin account-management actions ──────────────────────────────────
    # All state-changing, so restricted to admins only regardless of
    # whatever permission (or lack thereof) applies to the rest of this
    # viewset — get_permissions() below scopes this precisely to just
    # these action names without touching existing CRUD access.

    def get_permissions(self):
        if self.action in {
            "activate", "deactivate", "suspend", "reinstate",
            "archive", "restore", "reset_password",
        }:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def _label(self, student):
        return f"{student.full_name} ({student.admission_number})"

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        student = self.get_object()
        set_account_status(
            student.user, "active", request=request,
            module=AuditLog.Module.STUDENTS, resource_type="Student",
            resource_label=self._label(student),
        )
        return Response({"detail": f"{student.full_name} has been activated."})

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        student = self.get_object()
        set_account_status(
            student.user, "inactive", request=request,
            module=AuditLog.Module.STUDENTS, resource_type="Student",
            resource_label=self._label(student),
        )
        return Response({"detail": f"{student.full_name} has been deactivated."})

    @action(detail=True, methods=["post"], url_path="suspend")
    def suspend(self, request, pk=None):
        student = self.get_object()
        set_account_status(
            student.user, "suspended", request=request,
            module=AuditLog.Module.STUDENTS, resource_type="Student",
            resource_label=self._label(student),
        )
        return Response({"detail": f"{student.full_name} has been suspended."})

    @action(detail=True, methods=["post"], url_path="reinstate")
    def reinstate(self, request, pk=None):
        student = self.get_object()
        set_account_status(
            student.user, "active", request=request,
            module=AuditLog.Module.STUDENTS, resource_type="Student",
            resource_label=self._label(student),
        )
        return Response({"detail": f"{student.full_name} has been reinstated."})

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        student = self.get_object()
        set_account_status(
            student.user, "archived", request=request,
            module=AuditLog.Module.STUDENTS, resource_type="Student",
            resource_label=self._label(student),
        )
        return Response({"detail": f"{student.full_name} has been archived."})

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        student = self.get_object()
        set_account_status(
            student.user, "active", request=request,
            module=AuditLog.Module.STUDENTS, resource_type="Student",
            resource_label=self._label(student),
        )
        return Response({"detail": f"{student.full_name} has been restored."})

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        student = self.get_object()
        alphabet = string.ascii_letters + string.digits
        new_password = "".join(secrets.choice(alphabet) for _ in range(12))
        reset_user_password(
            student.user, request=request, new_password=new_password,
            module=AuditLog.Module.STUDENTS, resource_type="Student",
            resource_label=self._label(student),
        )
        return Response({"new_password": new_password})