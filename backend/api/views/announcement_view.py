from django.db import models as django_models
from django.utils import timezone

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.announcements.models import Announcement
from api.serializers.announcement_serializer import AnnouncementSerializer

# ── Audit logging ────────────────────────────────────────────────────────
from apps.audit.models import AuditLog
from apps.audit.services import log_action


class AnnouncementViewSet(viewsets.ModelViewSet):

    # Required for DRF router basename auto-detection when get_queryset() is overridden
    queryset         = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ["title", "message"]
    ordering_fields  = ["created_at", "priority", "is_pinned"]

    def get_queryset(self):
        qs = Announcement.objects.all()

        # Filter by audience
        audience = self.request.query_params.get("audience")
        if audience:
            qs = qs.filter(audience__in=[audience, "all"])

        # Filter by priority
        priority = self.request.query_params.get("priority")
        if priority:
            qs = qs.filter(priority=priority)

        # Exclude expired announcements unless explicitly requested
        include_expired = self.request.query_params.get("include_expired", "false")
        if include_expired.lower() != "true":
            qs = qs.filter(
                django_models.Q(expires_at__isnull=True) |
                django_models.Q(expires_at__gt=timezone.now())
            )

        return qs.order_by("-is_pinned", "-created_at")

    # ── Write hooks (added purely for audit logging — behaviour unchanged) ────

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(
            request=self.request,
            action=AuditLog.Action.ANNOUNCEMENT_CREATED,
            module=AuditLog.Module.ANNOUNCEMENTS,
            resource_type="Announcement",
            resource_id=instance.id,
            resource_repr=f"Announcement: {instance.title}",
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            request=self.request,
            action=AuditLog.Action.UPDATE,
            module=AuditLog.Module.ANNOUNCEMENTS,
            resource_type="Announcement",
            resource_id=instance.id,
            resource_repr=f"Announcement updated: {instance.title}",
        )

    def perform_destroy(self, instance):
        title = instance.title
        announcement_id = instance.id
        instance.delete()
        log_action(
            request=self.request,
            action=AuditLog.Action.DELETE,
            module=AuditLog.Module.ANNOUNCEMENTS,
            resource_type="Announcement",
            resource_id=announcement_id,
            resource_repr=f"Announcement deleted: {title}",
        )

    @action(detail=True, methods=["patch"], url_path="pin")
    def toggle_pin(self, request, pk=None):
        """Toggle the is_pinned flag on a single announcement."""
        announcement = self.get_object()
        announcement.is_pinned = not announcement.is_pinned
        announcement.save(update_fields=["is_pinned"])

        log_action(
            request=request,
            action=AuditLog.Action.UPDATE,
            module=AuditLog.Module.ANNOUNCEMENTS,
            resource_type="Announcement",
            resource_id=announcement.id,
            resource_repr=f"Announcement pin toggled: {announcement.title}",
            new_value={"is_pinned": announcement.is_pinned},
        )

        return Response(AnnouncementSerializer(announcement).data)