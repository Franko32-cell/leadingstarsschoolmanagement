import csv

import django_filters
from django.http import HttpResponse
from rest_framework import generics, permissions
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.audit.models import AuditLog
from api.serializers.audit_serializer import AuditLogSerializer

# Reuses your existing role-based permission (request.user.role == "admin").
# Falls back to DRF's IsAdminUser only if role_permissions.py can't be
# imported for some reason, so this file never hard-crashes on import.
try:
    from api.permissions.role_permissions import IsAdmin
except ImportError:  # pragma: no cover - fallback, should not trigger in practice
    IsAdmin = permissions.IsAdminUser


class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 200


class AuditLogFilter(django_filters.FilterSet):
    date_from = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    user = django_filters.NumberFilter(field_name="user_id")
    role = django_filters.CharFilter(field_name="actor_role", lookup_expr="iexact")

    class Meta:
        model = AuditLog
        fields = ["action", "module", "status", "user", "role", "date_from", "date_to"]


class AuditLogListView(generics.ListAPIView):
    """
    GET /api/audit-logs/

    Supports:
      ?action=login              filter by exact action
      ?module=fees               filter by module
      ?status=failed              filter by status
      ?user=14                    filter by user id
      ?role=teacher                filter by actor role
      ?date_from=2026-07-01T00:00 &date_to=2026-07-15T23:59   date range
      ?search=John                free-text over resource_repr/description/actor_username
      ?ordering=-created_at        sort (default: -created_at)
      ?page=2&page_size=50         pagination

    Query is a single indexed table scan by design (see model Meta.indexes),
    so this stays fast without select_related/prefetch_related since there's
    only one FK (user) and we don't serialize nested user data here -
    actor_username/actor_role are denormalized onto the log row at write
    time specifically to avoid needing a join for the list view.
    """

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    pagination_class = AuditLogPagination
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AuditLogFilter
    search_fields = ["resource_repr", "description", "actor_username"]
    ordering_fields = ["created_at", "action", "module", "status"]
    ordering = ["-created_at"]


class AuditLogExportCSVView(APIView):
    """
    GET /api/audit-logs/export/  (accepts the same filter query params as the
    list view above)

    Streams a CSV of every matching row (ignores pagination - this is meant
    for the "Export" button, not the paginated table).
    """

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        filtered = AuditLogFilter(
            request.query_params, queryset=AuditLog.objects.all()
        ).qs
        search = request.query_params.get("search")
        if search:
            filtered = filtered.filter(
                resource_repr__icontains=search
            ) | filtered.filter(description__icontains=search) | filtered.filter(
                actor_username__icontains=search
            )

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="audit_logs.csv"'
        writer = csv.writer(response)
        writer.writerow(
            ["Timestamp", "User", "Role", "Action", "Module", "Resource",
             "Status", "IP Address", "Description"]
        )
        for log in filtered.iterator():
            writer.writerow([
                log.created_at.isoformat(),
                log.actor_username,
                log.actor_role,
                log.get_action_display(),
                log.get_module_display(),
                log.resource_repr,
                log.get_status_display(),
                log.ip_address or "",
                log.description,
            ])
        return response