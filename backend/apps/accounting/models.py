from decimal import Decimal

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone


class AccountType(models.TextChoices):
    ASSET     = "asset",     "Asset"
    LIABILITY = "liability", "Liability"
    EQUITY    = "equity",    "Equity"
    INCOME    = "income",    "Income"
    EXPENSE   = "expense",   "Expense"


class NormalBalance(models.TextChoices):
    DEBIT  = "debit",  "Debit"
    CREDIT = "credit", "Credit"


# Which account types normally carry a debit balance vs. a credit balance.
# Used to auto-derive Account.normal_balance and to sign balances correctly
# everywhere (trial balance, ledger views, statements).
DEBIT_NORMAL_TYPES  = {AccountType.ASSET, AccountType.EXPENSE}
CREDIT_NORMAL_TYPES = {AccountType.LIABILITY, AccountType.EQUITY, AccountType.INCOME}


class Account(models.Model):
    """
    A single node in the Chart of Accounts.

    `parent` lets you group related accounts (e.g. "Cash and Bank" >
    "Cash in Hand", "Bank - GCB") while still posting transactions to the
    specific leaf account. `account_type` determines which financial
    statement the account appears on and its normal balance side.
    """

    code = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    account_type = models.CharField(max_length=10, choices=AccountType.choices)
    # Free-text grouping for statement presentation, e.g. "current_asset",
    # "fixed_asset", "current_liability". Not enforced — just for reports.
    account_subtype = models.CharField(max_length=50, blank=True)

    parent = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True,
        related_name="children",
    )

    normal_balance = models.CharField(
        max_length=6, choices=NormalBalance.choices, editable=False
    )

    is_active = models.BooleanField(default=True)
    # System accounts are wired into other modules (fee posting, payroll,
    # depreciation, ...). They can't be deleted or retyped from the API/admin
    # so a stray edit can't silently break postings elsewhere.
    is_system = models.BooleanField(default=False)

    description = models.TextField(blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"

    def save(self, *args, **kwargs):
        self.normal_balance = (
            NormalBalance.DEBIT
            if self.account_type in DEBIT_NORMAL_TYPES
            else NormalBalance.CREDIT
        )
        super().save(*args, **kwargs)

    def clean(self):
        if self.parent_id and self.parent_id == self.id:
            raise ValidationError("An account cannot be its own parent.")
        if self.parent_id and self.parent.account_type != self.account_type:
            raise ValidationError(
                "A sub-account must have the same account type as its parent."
            )

    def balance(self, as_of=None, include_children=False):
        from .services import get_account_balance
        return get_account_balance(self, as_of=as_of, include_children=include_children)


class JournalEntryType(models.TextChoices):
    STANDARD  = "standard",  "Standard"
    ADJUSTING = "adjusting", "Adjusting"
    CLOSING   = "closing",   "Closing"
    OPENING   = "opening",   "Opening balance"
    REVERSAL  = "reversal",  "Reversal"


class JournalEntry(models.Model):
    """
    A balanced set of debit/credit lines. Once created, an entry is
    immutable — the only supported way to undo one is to post a reversing
    entry (see services.reverse_journal_entry). That keeps the ledger
    auditable: nothing is ever silently edited or deleted after posting.
    """

    reference   = models.CharField(max_length=30, unique=True, db_index=True)
    date        = models.DateField(default=timezone.now)
    description = models.CharField(max_length=255)
    entry_type  = models.CharField(
        max_length=10, choices=JournalEntryType.choices, default=JournalEntryType.STANDARD
    )

    # Which app/feature posted this entry (e.g. "fees", "payroll", "assets",
    # "manual"), plus an optional generic link back to the record that caused
    # it (a PaymentTransaction, a payslip, a depreciation run...) so every
    # ledger line is traceable to its source.
    source_module = models.CharField(max_length=30, default="manual")
    content_type  = models.ForeignKey(
        ContentType, on_delete=models.SET_NULL, null=True, blank=True
    )
    object_id     = models.PositiveIntegerField(null=True, blank=True)
    source_object = GenericForeignKey("content_type", "object_id")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="journal_entries",
    )
    created_at = models.DateTimeField(default=timezone.now)

    is_reversed = models.BooleanField(default=False)
    reversal_of = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True,
        related_name="reversed_by",
    )

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["source_module"]),
        ]

    def __str__(self):
        return f"{self.reference} — {self.description}"

    @property
    def total_debit(self):
        return self.lines.aggregate(t=Sum("debit"))["t"] or Decimal("0")

    @property
    def total_credit(self):
        return self.lines.aggregate(t=Sum("credit"))["t"] or Decimal("0")

    @property
    def is_balanced(self):
        return self.total_debit == self.total_credit


class JournalLine(models.Model):
    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.CASCADE, related_name="lines"
    )
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="journal_lines"
    )

    debit  = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                # Django >= 5.1 renamed this kwarg from `check` to `condition`.
                # If your project is on an older Django, change both of these
                # back to `check=`.
                condition=Q(debit__gte=0) & Q(credit__gte=0),
                name="journalline_no_negative_amounts",
            ),
            models.CheckConstraint(
                condition=(Q(debit__gt=0) & Q(credit=0)) | (Q(credit__gt=0) & Q(debit=0)),
                name="journalline_exactly_one_side",
            ),
        ]

    def __str__(self):
        side = f"Dr {self.debit}" if self.debit else f"Cr {self.credit}"
        return f"{self.account.code} {side}"
