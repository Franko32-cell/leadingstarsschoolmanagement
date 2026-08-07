from decimal import Decimal
from uuid import uuid4

from django.db import models, transaction
from django.utils import timezone

from .models import Account, JournalEntry, JournalLine


class InvalidLineError(ValueError):
    pass


class UnbalancedEntryError(ValueError):
    pass


def _normalize_decimal(value):
    if value is None:
        return Decimal("0")
    return Decimal(value)


def get_account_balance(account: Account, as_of=None, include_children=False):
    lines = JournalLine.objects.filter(account=account)
    if as_of is not None:
        lines = lines.filter(journal_entry__date__lte=as_of)

    if include_children:
        child_ids = list(account.children.values_list("id", flat=True))
        if child_ids:
            lines = lines | JournalLine.objects.filter(account_id__in=child_ids)

    total_debit = lines.aggregate(total=models.Sum("debit"))["total"] or Decimal("0")
    total_credit = lines.aggregate(total=models.Sum("credit"))["total"] or Decimal("0")

    return total_debit - total_credit if account.normal_balance == "debit" else total_credit - total_debit


def post_journal_entry(date, description, lines, entry_type="standard", created_by=None, source_module="manual", request=None):
    if len(lines) < 2:
        raise InvalidLineError("At least two lines are required.")

    journal_lines = []
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    for line in lines:
        account = line["account"]
        debit = _normalize_decimal(line.get("debit"))
        credit = _normalize_decimal(line.get("credit"))
        description_text = line.get("description", "")

        if debit < 0 or credit < 0:
            raise InvalidLineError("Debit and credit values must be non-negative.")
        if (debit > 0 and credit > 0) or (debit == 0 and credit == 0):
            raise InvalidLineError("Each line must have exactly one non-zero debit or credit amount.")

        total_debit += debit
        total_credit += credit
        journal_lines.append((account, debit, credit, description_text))

    if total_debit != total_credit:
        raise UnbalancedEntryError("Journal entry must be balanced. Debit and credit totals must match.")

    with transaction.atomic():
        reference = f"JE-{timezone.now().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:6].upper()}"
        entry = JournalEntry.objects.create(
            reference=reference,
            date=date,
            description=description,
            entry_type=entry_type,
            source_module=source_module,
            created_by=created_by,
            created_at=timezone.now(),
        )

        for account, debit, credit, description_text in journal_lines:
            JournalLine.objects.create(
                journal_entry=entry,
                account=account,
                debit=debit,
                credit=credit,
                description=description_text,
            )

    return entry


def reverse_journal_entry(entry: JournalEntry, created_by=None, reason="", request=None):
    if entry.is_reversed:
        raise ValueError("This entry has already been reversed.")
    if entry.reversal_of is not None:
        raise ValueError("A reversal entry cannot be reversed.")

    with transaction.atomic():
        reference = f"REV-{entry.reference}-{uuid4().hex[:4].upper()}"
        reversal = JournalEntry.objects.create(
            reference=reference,
            date=timezone.now().date(),
            description=f"Reversal of {entry.reference}" + (f": {reason}" if reason else ""),
            entry_type="reversal",
            source_module=entry.source_module,
            created_by=created_by,
            created_at=timezone.now(),
            reversal_of=entry,
        )

        for line in entry.lines.all():
            JournalLine.objects.create(
                journal_entry=reversal,
                account=line.account,
                debit=line.credit,
                credit=line.debit,
                description=line.description,
            )

        entry.is_reversed = True
        entry.save(update_fields=["is_reversed"])

    return reversal


def get_trial_balance(as_of=None):
    accounts = Account.objects.order_by("code")

    balances = []
    for account in accounts:
        balances.append({
            "id": account.id,
            "code": account.code,
            "name": account.name,
            "account_type": account.account_type,
            "account_subtype": account.account_subtype,
            "normal_balance": account.normal_balance,
            "balance": str(account.balance(as_of=as_of, include_children=False)),
            "is_active": account.is_active,
        })

    totals = {
        "asset": sum(Decimal(item["balance"]) for item in balances if item["account_type"] == "asset"),
        "liability": sum(Decimal(item["balance"]) for item in balances if item["account_type"] == "liability"),
        "equity": sum(Decimal(item["balance"]) for item in balances if item["account_type"] == "equity"),
        "income": sum(Decimal(item["balance"]) for item in balances if item["account_type"] == "income"),
        "expense": sum(Decimal(item["balance"]) for item in balances if item["account_type"] == "expense"),
    }

    return {
        "as_of": as_of,
        "accounts": balances,
        "totals": {k: str(v) for k, v in totals.items()},
    }
# ─────────────────────────────────────────────────────────────────────────
# PETTY CASH — append everything below to apps/accounting/services.py
#
# Add these two imports to the top of that file alongside the existing ones:
#
#   from django.contrib.contenttypes.models import ContentType
#   from apps.audit.services import log_action
#
# and these two to the "from .models import ..." line:
#
#   from .models import (
#       Account, JournalEntry, JournalLine,
#       PettyCashFloat, PettyCashFloatStatus,
#       PettyCashTransaction, PettyCashTransactionType, PettyCashTransactionStatus,
#       AdjustmentDirection,
#   )
# ─────────────────────────────────────────────────────────────────────────


class PettyCashError(ValueError):
    pass


# ---------------------------------------------------------------- floats --

def create_petty_cash_float(*, name, custodian, account, funding_account,
                             opening_balance=None, description="", created_by=None, request=None):
    """
    Register a float against an existing Chart-of-Accounts `account`
    (create that account first via the normal Accounts endpoint/admin —
    this function only wires a custodian and funding source to it and,
    if an opening balance is given, posts the funding entry).
    """
    opening_balance = _normalize_decimal(opening_balance)

    with transaction.atomic():
        float_obj = PettyCashFloat(
            name=name, custodian=custodian, account=account,
            funding_account=funding_account, opening_balance=opening_balance,
            description=description, created_by=created_by,
        )
        float_obj.full_clean()
        float_obj.save()

        if opening_balance > 0:
            post_journal_entry(
                date=timezone.now().date(),
                description=f"Petty cash float opened — {name}",
                lines=[
                    {"account": account, "debit": opening_balance, "credit": 0,
                     "description": f"Open float: {name}"},
                    {"account": funding_account, "debit": 0, "credit": opening_balance,
                     "description": f"Fund float: {name}"},
                ],
                entry_type="opening",
                created_by=created_by,
                source_module="petty_cash",
            )

    log_action(
        request=request, user=created_by, action="create", module="accounting",
        resource_type="PettyCashFloat", resource_id=float_obj.id,
        resource_repr=str(float_obj),
        new_value={"opening_balance": str(opening_balance), "custodian": str(custodian)},
        description=f"Petty cash float '{name}' opened for {custodian}.",
    )
    return float_obj


def close_petty_cash_float(petty_cash_float, *, closed_by, request=None):
    if petty_cash_float.status == PettyCashFloatStatus.CLOSED:
        raise PettyCashError("This float is already closed.")
    outstanding = petty_cash_float.transactions.filter(
        status__in=[PettyCashTransactionStatus.SUBMITTED, PettyCashTransactionStatus.APPROVED]
    )
    if outstanding.exists():
        raise PettyCashError("Resolve or reject outstanding claims before closing this float.")

    petty_cash_float.status = PettyCashFloatStatus.CLOSED
    petty_cash_float.closed_at = timezone.now()
    petty_cash_float.save(update_fields=["status", "closed_at"])

    log_action(
        request=request, user=closed_by, action="update", module="accounting",
        resource_type="PettyCashFloat", resource_id=petty_cash_float.id,
        resource_repr=str(petty_cash_float), new_value={"status": "closed"},
        description=f"Petty cash float '{petty_cash_float.name}' closed.",
    )
    return petty_cash_float


# ----------------------------------------------------------- transactions --

def submit_petty_cash_transaction(*, petty_cash_float, transaction_type, amount, description,
                                   requested_by, date=None, contra_account=None,
                                   adjustment_direction="", receipt=None, request=None):
    if petty_cash_float.status != PettyCashFloatStatus.ACTIVE:
        raise PettyCashError("Cannot post against a closed float.")

    txn = PettyCashTransaction(
        float=petty_cash_float,
        transaction_type=transaction_type,
        amount=_normalize_decimal(amount),
        description=description,
        date=date or timezone.now().date(),
        contra_account=contra_account,
        adjustment_direction=adjustment_direction,
        receipt=receipt,
        requested_by=requested_by,
        status=PettyCashTransactionStatus.SUBMITTED,
        submitted_at=timezone.now(),
    )
    txn.full_clean()
    txn.save()

    log_action(
        request=request, user=requested_by, action="create", module="accounting",
        resource_type="PettyCashTransaction", resource_id=txn.id, resource_repr=str(txn),
        new_value={"amount": str(txn.amount), "type": transaction_type, "status": "submitted"},
        description=f"Petty cash {transaction_type} submitted for {petty_cash_float.name}.",
    )
    return txn


def approve_petty_cash_transaction(txn, *, approved_by, request=None):
    if txn.status != PettyCashTransactionStatus.SUBMITTED:
        raise PettyCashError("Only submitted transactions can be approved.")

    txn.status = PettyCashTransactionStatus.APPROVED
    txn.approved_by = approved_by
    txn.approved_at = timezone.now()
    txn.save(update_fields=["status", "approved_by", "approved_at"])

    log_action(
        request=request, user=approved_by, action="update", module="accounting",
        resource_type="PettyCashTransaction", resource_id=txn.id, resource_repr=str(txn),
        new_value={"status": "approved"},
        description=f"Petty cash transaction #{txn.id} approved.",
    )
    return txn


def reject_petty_cash_transaction(txn, *, rejected_by, reason="", request=None):
    if txn.status != PettyCashTransactionStatus.SUBMITTED:
        raise PettyCashError("Only submitted transactions can be rejected.")

    txn.status = PettyCashTransactionStatus.REJECTED
    txn.approved_by = rejected_by
    txn.approved_at = timezone.now()
    txn.rejection_reason = reason
    txn.save(update_fields=["status", "approved_by", "approved_at", "rejection_reason"])

    log_action(
        request=request, user=rejected_by, action="update", module="accounting",
        resource_type="PettyCashTransaction", resource_id=txn.id, resource_repr=str(txn),
        new_value={"status": "rejected", "reason": reason},
        description=f"Petty cash transaction #{txn.id} rejected.",
    )
    return txn


def pay_petty_cash_transaction(txn, *, paid_by, request=None):
    """Posts the journal entry and marks the claim paid. This is the only
    step that touches the ledger — draft/submitted/approved states never do."""
    if txn.status != PettyCashTransactionStatus.APPROVED:
        raise PettyCashError("Only approved transactions can be paid.")

    float_account = txn.float.account

    if txn.transaction_type == PettyCashTransactionType.REPLENISHMENT:
        lines = [
            {"account": float_account, "debit": txn.amount, "credit": 0,
             "description": f"Replenish {txn.float.name}"},
            {"account": txn.float.funding_account, "debit": 0, "credit": txn.amount,
             "description": f"Replenish {txn.float.name}"},
        ]
    elif txn.transaction_type == PettyCashTransactionType.EXPENSE:
        lines = [
            {"account": txn.contra_account, "debit": txn.amount, "credit": 0,
             "description": txn.description},
            {"account": float_account, "debit": 0, "credit": txn.amount,
             "description": txn.description},
        ]
    elif txn.transaction_type == PettyCashTransactionType.ADJUSTMENT:
        if txn.adjustment_direction == AdjustmentDirection.INCREASE:
            lines = [
                {"account": float_account, "debit": txn.amount, "credit": 0,
                 "description": "Petty cash adjustment (cash over)"},
                {"account": txn.contra_account, "debit": 0, "credit": txn.amount,
                 "description": "Petty cash adjustment (cash over)"},
            ]
        else:
            lines = [
                {"account": txn.contra_account, "debit": txn.amount, "credit": 0,
                 "description": "Petty cash adjustment (cash short)"},
                {"account": float_account, "debit": 0, "credit": txn.amount,
                 "description": "Petty cash adjustment (cash short)"},
            ]
    else:
        raise PettyCashError(f"Unknown transaction_type: {txn.transaction_type}")

    with transaction.atomic():
        entry = post_journal_entry(
            date=txn.date,
            description=f"Petty cash — {txn.get_transaction_type_display()} — {txn.float.name}",
            lines=lines,
            entry_type="standard",
            created_by=paid_by,
            source_module="petty_cash",
        )
        entry.content_type = ContentType.objects.get_for_model(PettyCashTransaction)
        entry.object_id = txn.id
        entry.save(update_fields=["content_type", "object_id"])

        txn.journal_entry = entry
        txn.status = PettyCashTransactionStatus.PAID
        txn.paid_by = paid_by
        txn.paid_at = timezone.now()
        txn.save(update_fields=["journal_entry", "status", "paid_by", "paid_at"])

    log_action(
        request=request, user=paid_by, action="payment_processed", module="accounting",
        resource_type="PettyCashTransaction", resource_id=txn.id, resource_repr=str(txn),
        new_value={"status": "paid", "journal_entry": entry.reference},
        description=f"Petty cash transaction #{txn.id} paid, {entry.reference}.",
    )
    return txn


# ------------------------------------------------------------------ reports --

def _txn_summary(txn):
    return {
        "id": txn.id,
        "type": txn.transaction_type,
        "status": txn.status,
        "date": str(txn.date),
        "amount": str(txn.amount),
        "description": txn.description,
        "contra_account": txn.contra_account.code if txn.contra_account_id else None,
        "requested_by": getattr(txn.requested_by, "username", None),
        "approved_by": getattr(txn.approved_by, "username", None),
        "paid_by": getattr(txn.paid_by, "username", None),
    }


def get_petty_cash_daily_summary(date=None, petty_cash_float=None):
    date = date or timezone.now().date()
    qs = PettyCashTransaction.objects.filter(date=date, status=PettyCashTransactionStatus.PAID)
    if petty_cash_float is not None:
        qs = qs.filter(float=petty_cash_float)

    replenishments = qs.filter(transaction_type=PettyCashTransactionType.REPLENISHMENT).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    expenses = qs.filter(transaction_type=PettyCashTransactionType.EXPENSE).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    adj_in = qs.filter(transaction_type=PettyCashTransactionType.ADJUSTMENT, adjustment_direction=AdjustmentDirection.INCREASE).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    adj_out = qs.filter(transaction_type=PettyCashTransactionType.ADJUSTMENT, adjustment_direction=AdjustmentDirection.DECREASE).aggregate(t=Sum("amount"))["t"] or Decimal("0")

    return {
        "date": str(date),
        "replenishments": str(replenishments),
        "expenses": str(expenses),
        "adjustments_in": str(adj_in),
        "adjustments_out": str(adj_out),
        "net_movement": str(replenishments + adj_in - expenses - adj_out),
        "transactions": [_txn_summary(t) for t in qs.order_by("float__name", "id")],
    }


def get_petty_cash_monthly_summary(year, month, petty_cash_float=None):
    qs = PettyCashTransaction.objects.filter(
        date__year=year, date__month=month, status=PettyCashTransactionStatus.PAID,
    )
    if petty_cash_float is not None:
        qs = qs.filter(float=petty_cash_float)

    replenishments = qs.filter(transaction_type=PettyCashTransactionType.REPLENISHMENT).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    expenses = qs.filter(transaction_type=PettyCashTransactionType.EXPENSE).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    adj_in = qs.filter(transaction_type=PettyCashTransactionType.ADJUSTMENT, adjustment_direction=AdjustmentDirection.INCREASE).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    adj_out = qs.filter(transaction_type=PettyCashTransactionType.ADJUSTMENT, adjustment_direction=AdjustmentDirection.DECREASE).aggregate(t=Sum("amount"))["t"] or Decimal("0")

    by_category = list(
        qs.filter(transaction_type=PettyCashTransactionType.EXPENSE)
        .values("contra_account__code", "contra_account__name")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )
    for row in by_category:
        row["total"] = str(row["total"])

    return {
        "year": year, "month": month,
        "replenishments": str(replenishments),
        "expenses": str(expenses),
        "adjustments_in": str(adj_in),
        "adjustments_out": str(adj_out),
        "net_movement": str(replenishments + adj_in - expenses - adj_out),
        "expenses_by_category": by_category,
    }


def get_petty_cash_reconciliation(petty_cash_float, as_of=None):
    """
    Compares the ledger balance (source of truth, via the float's linked
    Account) against the sum of recorded PAID movements. These should
    always match exactly since every paid transaction posts a journal
    entry — a mismatch here means something bypassed the service layer.
    """
    ledger_balance = petty_cash_float.current_balance(as_of=as_of)

    qs = petty_cash_float.transactions.filter(status=PettyCashTransactionStatus.PAID)
    if as_of is not None:
        qs = qs.filter(date__lte=as_of)

    replenishments = qs.filter(transaction_type=PettyCashTransactionType.REPLENISHMENT).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    expenses = qs.filter(transaction_type=PettyCashTransactionType.EXPENSE).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    adj_in = qs.filter(transaction_type=PettyCashTransactionType.ADJUSTMENT, adjustment_direction=AdjustmentDirection.INCREASE).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    adj_out = qs.filter(transaction_type=PettyCashTransactionType.ADJUSTMENT, adjustment_direction=AdjustmentDirection.DECREASE).aggregate(t=Sum("amount"))["t"] or Decimal("0")

    computed_balance = petty_cash_float.opening_balance + replenishments + adj_in - expenses - adj_out

    return {
        "float": petty_cash_float.name,
        "as_of": str(as_of) if as_of else None,
        "opening_balance": str(petty_cash_float.opening_balance),
        "replenishments": str(replenishments),
        "expenses": str(expenses),
        "adjustments_in": str(adj_in),
        "adjustments_out": str(adj_out),
        "computed_balance": str(computed_balance),
        "ledger_balance": str(ledger_balance),
        "is_reconciled": computed_balance == ledger_balance,
    }


def get_outstanding_petty_cash_claims(petty_cash_float=None):
    qs = PettyCashTransaction.objects.filter(
        status__in=[PettyCashTransactionStatus.SUBMITTED, PettyCashTransactionStatus.APPROVED]
    ).select_related("float", "contra_account", "requested_by", "approved_by")
    if petty_cash_float is not None:
        qs = qs.filter(float=petty_cash_float)
    return [_txn_summary(t) | {"float": t.float.name} for t in qs]