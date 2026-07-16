from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "actor_username",
        "actor_role",
        "action",
        "module",
        "resource_repr",
        "status",
    )
    list_filter = ("module", "action", "status", "actor_role")
    search_fields = ("actor_username", "resource_repr", "description", "ip_address")
    date_hierarchy = "created_at"
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        # Audit logs are only ever created programmatically via log_action().
        return False

    def has_change_permission(self, request, obj=None):
        return False