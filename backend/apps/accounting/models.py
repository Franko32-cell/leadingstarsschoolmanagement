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
# ─────────────────────────────────────────────────────────────────────────
# PETTY CASH — append everything below to apps/accounting/models.py
# (it uses Account, JournalEntry already defined above in that file, plus
# settings/models/timezone/ValidationError/Decimal already imported there)
# ─────────────────────────────────────────────────────────────────────────


class PettyCashFloatStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    CLOSED = "closed", "Closed"


class PettyCashFloat(models.Model):
    """
    A cash float held by a custodian (front-desk officer, bursar's
    assistant, ...) that small expenses are paid out of.

    Each float is backed by its own GL account (a child of your "Petty
    Cash" asset account in the Chart of Accounts) so its balance is
    always read straight off the ledger via `account.balance()` rather
    than maintained as a separate running number that can drift out of
    sync with the books.
    """

    name = models.CharField(max_length=100)
    custodian = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="petty_cash_floats",
        help_text="The staff member accountable for this float's cash on hand.",
    )
    account = models.OneToOneField(
        Account, on_delete=models.PROTECT, related_name="petty_cash_float",
        help_text="The GL account this float posts to. Must be an asset account.",
    )
    funding_account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="funded_petty_cash_floats",
        help_text="Bank/cash account the float is drawn from and replenished from.",
    )

    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    status = models.CharField(max_length=10, choices=PettyCashFloatStatus.choices, default=PettyCashFloatStatus.ACTIVE)
    description = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(default=timezone.now)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.custodian})"

    def clean(self):
        if self.account_id and self.account.account_type != AccountType.ASSET:
            raise ValidationError("A petty cash float's account must be an asset account.")
        if self.funding_account_id and self.funding_account.account_type != AccountType.ASSET:
            raise ValidationError("A petty cash float's funding account must be an asset account.")
        if self.account_id and self.funding_account_id and self.account_id == self.funding_account_id:
            raise ValidationError("The float account and its funding account cannot be the same account.")

    def current_balance(self, as_of=None):
        return self.account.balance(as_of=as_of)


class PettyCashTransactionType(models.TextChoices):
    REPLENISHMENT = "replenishment", "Replenishment"
    ADJUSTMENT     = "adjustment",    "Adjustment"
    EXPENSE        = "expense",       "Expense"


class PettyCashTransactionStatus(models.TextChoices):
    DRAFT     = "draft",     "Draft"
    SUBMITTED = "submitted", "Submitted"
    APPROVED  = "approved",  "Approved"
    REJECTED  = "rejected",  "Rejected"
    PAID      = "paid",      "Paid"


class AdjustmentDirection(models.TextChoices):
    INCREASE = "increase", "Increase (cash over)"
    DECREASE = "decrease", "Decrease (cash short)"


class PettyCashTransaction(models.Model):
    """
    A single movement against a float: an expense claim, a replenishment
    (topping the float back up from the funding account), or a
    reconciliation adjustment (cash found over/short during a count).

    Lifecycle: draft/submitted -> approved -> paid (posts the journal
    entry), or submitted -> rejected. Nothing is edited or deleted after
    it's paid — like JournalEntry, corrections happen going forward, not
    by mutating history.
    """

    float = models.ForeignKey(PettyCashFloat, on_delete=models.PROTECT, related_name="transactions")
    transaction_type = models.CharField(max_length=15, choices=PettyCashTransactionType.choices)
    status = models.CharField(
        max_length=10, choices=PettyCashTransactionStatus.choices,
        default=PettyCashTransactionStatus.SUBMITTED,
    )

    date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    adjustment_direction = models.CharField(
        max_length=8, choices=AdjustmentDirection.choices, blank=True,
        help_text="Required, and only used, when transaction_type=adjustment.",
    )

    contra_account = models.ForeignKey(
        Account, on_delete=models.PROTECT, null=True, blank=True,
        related_name="petty_cash_transactions",
        help_text=(
            "The other side of the journal entry: an expense account for "
            "expense claims, or a 'Cash Over/Short' style account for "
            "adjustments. Not used for replenishments, which always post "
            "against the float's funding_account."
        ),
    )

    description = models.CharField(max_length=255)
    receipt = models.FileField(upload_to="petty_cash/receipts/%Y/%m/", null=True, blank=True)

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="petty_cash_requested",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="petty_cash_approved",
    )
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="petty_cash_paid",
    )
    rejection_reason = models.CharField(max_length=255, blank=True)

    journal_entry = models.OneToOneField(
        JournalEntry, on_delete=models.PROTECT, null=True, blank=True,
        related_name="petty_cash_transaction",
    )

    created_at = models.DateTimeField(default=timezone.now)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["float", "status"]),
            models.Index(fields=["date"]),
            models.Index(fields=["transaction_type"]),
        ]

    def __str__(self):
        return f"{self.get_transaction_type_display()} · {self.float.name} · {self.amount}"

    def clean(self):
        if self.amount is not None and self.amount <= 0:
            raise ValidationError("Amount must be greater than zero.")
        if self.transaction_type == PettyCashTransactionType.EXPENSE and not self.contra_account_id:
            raise ValidationError("An expense claim requires a contra_account (the expense GL account).")
        if self.transaction_type == PettyCashTransactionType.ADJUSTMENT:
            if not self.contra_account_id:
                raise ValidationError("An adjustment requires a contra_account (e.g. Cash Over/Short).")
            if not self.adjustment_direction:
                raise ValidationError("An adjustment requires adjustment_direction.")
        if self.transaction_type == PettyCashTransactionType.REPLENISHMENT and self.contra_account_id:
            raise ValidationError("Replenishments post against the float's funding_account, not a contra_account.")