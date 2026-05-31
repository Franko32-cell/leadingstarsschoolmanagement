# api/views/active_users_view.py
from datetime import timedelta
from django.utils.timezone import now
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers

User = get_user_model()

# Users who logged in within this window are considered "active"
ONLINE_THRESHOLD_MINUTES = 480  # 8 hours — covers a full school day


class ActiveUserSerializer(serializers.ModelSerializer):
    role      = serializers.CharField()   # reads the actual role field directly
    is_online = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ["id", "username", "email", "role", "last_login", "is_online"]

    def get_is_online(self, obj):
        if not obj.last_login:
            return False
        threshold = now() - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)
        return obj.last_login >= threshold


class ActiveUsersView(APIView):
    """
    GET /api/accounts/active-users/
    Returns all users who logged in within the threshold window.
    Restricted to admin role only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only admins should see this
        if request.user.role != "admin":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin access required.")

        threshold = now() - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)

        # All users active within threshold — no role filter, no is_staff filter
        other_users = (
            User.objects
            .filter(last_login__gte=threshold)
            .exclude(pk=request.user.pk)
            .order_by("-last_login")
        )

        # Always put the current admin at the top
        queryset = [request.user] + list(other_users)

        serializer = ActiveUserSerializer(queryset, many=True)
        return Response({
            "count":   len(queryset),
            "results": serializer.data,
        })
