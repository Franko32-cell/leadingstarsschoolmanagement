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
