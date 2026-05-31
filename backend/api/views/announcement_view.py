from django.db import models as django_models
from django.utils import timezone

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.announcements.models import Announcement
from api.serializers.announcement_serializer import AnnouncementSerializer


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

    @action(detail=True, methods=["patch"], url_path="pin")
    def toggle_pin(self, request, pk=None):
        """Toggle the is_pinned flag on a single announcement."""
        announcement = self.get_object()
        announcement.is_pinned = not announcement.is_pinned
        announcement.save(update_fields=["is_pinned"])
        return Response(AnnouncementSerializer(announcement).data)