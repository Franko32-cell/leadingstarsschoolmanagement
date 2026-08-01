from django.contrib import admin

from .models import Account, JournalEntry, JournalLine


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "account_type", "normal_balance", "is_active", "is_system", "parent")
    list_filter  = ("account_type", "is_active", "is_system")
    search_fields = ("code", "name")
    ordering = ("code",)


class JournalLineInline(admin.TabularInline):
    model = JournalLine
    extra = 0
    readonly_fields = ("account", "debit", "credit", "description")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "date", "description", "entry_type", "source_module",
        "total_debit_display", "total_credit_display", "is_reversed", "created_by",
    )
    list_filter  = ("entry_type", "source_module", "is_reversed", "date")
    search_fields = ("reference", "description")
    readonly_fields = ("reference", "created_at")
    inlines = [JournalLineInline]

    def total_debit_display(self, obj):
        return obj.total_debit
    total_debit_display.short_description = "Debit"

    def total_credit_display(self, obj):
        return obj.total_credit
    total_credit_display.short_description = "Credit"

    def has_change_permission(self, request, obj=None):
        # Entries are immutable by design — admin can view but not edit.
        return False

    def has_delete_permission(self, request, obj=None):
        return False
