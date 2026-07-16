from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Read-only serializer - audit logs are never created or edited through
    the API, only through apps.audit.services.log_action() server-side.
    """

    action_display = serializers.CharField(source="get_action_display", read_only=True)
    module_display = serializers.CharField(source="get_module_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "actor_username",
            "actor_role",
            "action",
            "action_display",
            "module",
            "module_display",
            "status",
            "status_display",
            "resource_type",
            "resource_id",
            "resource_repr",
            "previous_value",
            "new_value",
            "description",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = fields