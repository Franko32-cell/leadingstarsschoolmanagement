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
# ─────────────────────────────────────────────────────────────────────────
# PETTY CASH — append everything below to apps/accounting/admin.py
# (adjust `from .models import ...` to include PettyCashFloat, PettyCashTransaction)
# ─────────────────────────────────────────────────────────────────────────

from django.contrib import admin

from .models import PettyCashFloat, PettyCashTransaction


@admin.register(PettyCashFloat)
class PettyCashFloatAdmin(admin.ModelAdmin):
    list_display = ["name", "custodian", "account", "status", "opening_balance", "created_at"]
    list_filter = ["status"]
    search_fields = ["name", "custodian__username", "account__code"]
    readonly_fields = ["created_at", "closed_at"]


@admin.register(PettyCashTransaction)
class PettyCashTransactionAdmin(admin.ModelAdmin):
    list_display = ["id", "float", "transaction_type", "status", "date", "amount", "requested_by"]
    list_filter = ["transaction_type", "status", "float"]
    search_fields = ["description", "float__name"]
    readonly_fields = ["journal_entry", "created_at", "submitted_at", "approved_at", "paid_at"]
    # Lifecycle is state-machine driven via the service layer (approve/reject/pay) —
    # block manual status edits here so nothing bypasses the audit trail or posts
    # an inconsistent journal entry.
    def get_readonly_fields(self, request, obj=None):
        if obj is not None:
            return self.readonly_fields + ["status", "float", "transaction_type", "amount"]
        return self.readonly_fields