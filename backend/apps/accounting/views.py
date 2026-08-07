import csv

from django.http import HttpResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Account, PettyCashFloat, PettyCashTransaction
from .permissions import CanRequestPettyCash, IsFinanceStaff
from .serializers import (
    AccountSerializer,
    JournalEntryCreateSerializer,
    JournalEntrySerializer,
    PettyCashFloatSerializer,
    PettyCashRejectSerializer,
    PettyCashTransactionCreateSerializer,
    PettyCashTransactionSerializer,
)
from .services import (
    PettyCashError,
    approve_petty_cash_transaction,
    close_petty_cash_float,
    get_outstanding_petty_cash_claims,
    get_petty_cash_daily_summary,
    get_petty_cash_monthly_summary,
    get_petty_cash_reconciliation,
    get_trial_balance,
    pay_petty_cash_transaction,
    reject_petty_cash_transaction,
    reverse_journal_entry,
)


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsFinanceStaff]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        account_type = params.get("account_type")
        is_active = params.get("is_active")
        if account_type:
            qs = qs.filter(account_type=account_type)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs

    def destroy(self, request, *args, **kwargs):
        account = self.get_object()
        if account.is_system:
            return Response(
                {"error": "System accounts cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if account.journal_lines.exists():
            return Response(
                {"error": "Account has posted transactions and cannot be deleted. Deactivate it instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="tree")
    def tree(self, request):
        """Chart of accounts as a nested tree, for a sidebar/picker UI."""
        roots = self.get_queryset().filter(parent__isnull=True)

        def build(node):
            data = AccountSerializer(node).data
            data["children"] = [build(c) for c in node.children.filter(is_active=True).order_by("code")]
            return data

        return Response([build(a) for a in roots.order_by("code")])

    @action(detail=True, methods=["get"], url_path="ledger")
    def ledger(self, request, pk=None):
        """Account statement: every posted line for this account with a running balance."""
        account = self.get_object()
        lines = (
            account.journal_lines
            .select_related("journal_entry")
            .order_by("journal_entry__date", "journal_entry__created_at")
        )
        running = 0
        rows = []
        for line in lines:
            delta = (
                (line.debit - line.credit)
                if account.normal_balance == "debit"
                else (line.credit - line.debit)
            )
            running += delta
            rows.append({
                "date": line.journal_entry.date,
                "reference": line.journal_entry.reference,
                "description": line.description or line.journal_entry.description,
                "debit": str(line.debit),
                "credit": str(line.credit),
                "running_balance": str(running),
            })
        return Response({"account": AccountSerializer(account).data, "entries": rows})


class JournalEntryViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Journal entries are immutable once posted — deliberately no update or
    delete here. To correct a mistake, post a reversing entry instead
    (POST /journal-entries/{id}/reverse/), which keeps the audit trail intact.
    """

    queryset = None  # set in get_queryset
    permission_classes = [IsFinanceStaff]

    def get_serializer_class(self):
        if self.action == "create":
            return JournalEntryCreateSerializer
        return JournalEntrySerializer

    def get_queryset(self):
        from .models import JournalEntry
        qs = JournalEntry.objects.select_related("created_by").prefetch_related("lines__account")

        params = self.request.query_params
        if params.get("date_from"):
            qs = qs.filter(date__gte=params["date_from"])
        if params.get("date_to"):
            qs = qs.filter(date__lte=params["date_to"])
        if params.get("account"):
            qs = qs.filter(lines__account_id=params["account"]).distinct()
        if params.get("source_module"):
            qs = qs.filter(source_module=params["source_module"])
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return Response(JournalEntrySerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="reverse")
    def reverse(self, request, pk=None):
        entry = self.get_object()
        reason = request.data.get("reason", "")
        try:
            reversal = reverse_journal_entry(
                entry, created_by=request.user, reason=reason, request=request
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(JournalEntrySerializer(reversal).data, status=status.HTTP_201_CREATED)


class TrialBalanceView(APIView):
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        as_of = request.query_params.get("as_of")
        return Response(get_trial_balance(as_of=as_of))


# ─────────────────────────────────────────────────────────────────────────
# PETTY CASH
#
# CanRequestPettyCash and IsFinanceStaff currently resolve to the same
# role ("admin") — see permissions.py. They're kept as separate classes
# rather than collapsed into one because they mean different things
# (who may request vs. who may approve/pay), and the moment you add a
# dedicated finance role, only permissions.py needs to change — not
# every view that references one or the other.
# ─────────────────────────────────────────────────────────────────────────


class PettyCashFloatViewSet(viewsets.ModelViewSet):
    queryset = PettyCashFloat.objects.select_related("custodian", "account", "funding_account").all()
    serializer_class = PettyCashFloatSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanRequestPettyCash()]
        return [IsFinanceStaff()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        float_obj = self.get_object()
        try:
            close_petty_cash_float(float_obj, closed_by=request.user, request=request)
        except PettyCashError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PettyCashFloatSerializer(float_obj).data)

    @action(detail=True, methods=["get"])
    def reconciliation(self, request, pk=None):
        float_obj = self.get_object()
        as_of = request.query_params.get("as_of")
        return Response(get_petty_cash_reconciliation(float_obj, as_of=as_of))


class PettyCashTransactionViewSet(viewsets.ModelViewSet):
    queryset = PettyCashTransaction.objects.select_related(
        "float", "contra_account", "requested_by", "approved_by", "paid_by", "journal_entry"
    ).all()
    http_method_names = ["get", "post", "head", "options"]  # no PATCH/PUT/DELETE — lifecycle only, like JournalEntry

    def get_serializer_class(self):
        if self.action == "create":
            return PettyCashTransactionCreateSerializer
        return PettyCashTransactionSerializer

    def get_permissions(self):
        if self.action in ("approve", "reject", "pay"):
            return [IsFinanceStaff()]
        return [CanRequestPettyCash()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def get_queryset(self):
        qs = super().get_queryset()
        float_id = self.request.query_params.get("float")
        status_param = self.request.query_params.get("status")
        if float_id:
            qs = qs.filter(float_id=float_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        txn = serializer.save()
        return Response(PettyCashTransactionSerializer(txn).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        txn = self.get_object()
        try:
            approve_petty_cash_transaction(txn, approved_by=request.user, request=request)
        except PettyCashError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PettyCashTransactionSerializer(txn).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        txn = self.get_object()
        serializer = PettyCashRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reject_petty_cash_transaction(
                txn, rejected_by=request.user,
                reason=serializer.validated_data.get("reason", ""), request=request,
            )
        except PettyCashError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PettyCashTransactionSerializer(txn).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        txn = self.get_object()
        try:
            pay_petty_cash_transaction(txn, paid_by=request.user, request=request)
        except PettyCashError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PettyCashTransactionSerializer(txn).data)


class PettyCashOutstandingClaimsView(APIView):
    permission_classes = [CanRequestPettyCash]

    def get(self, request):
        float_id = request.query_params.get("float")
        petty_cash_float = None
        if float_id:
            petty_cash_float = PettyCashFloat.objects.filter(id=float_id).first()
        return Response(get_outstanding_petty_cash_claims(petty_cash_float=petty_cash_float))


class PettyCashDailySummaryView(APIView):
    permission_classes = [CanRequestPettyCash]

    def get(self, request):
        date = request.query_params.get("date")
        float_id = request.query_params.get("float")
        petty_cash_float = PettyCashFloat.objects.filter(id=float_id).first() if float_id else None

        data = get_petty_cash_daily_summary(date=date, petty_cash_float=petty_cash_float)

        if request.query_params.get("export") == "csv":
            return _csv_response(
                filename=f"petty_cash_daily_{data['date']}.csv",
                headers=["ID", "Type", "Status", "Date", "Amount", "Description"],
                rows=[[t["id"], t["type"], t["status"], t["date"], t["amount"], t["description"]]
                      for t in data["transactions"]],
            )
        return Response(data)


class PettyCashMonthlySummaryView(APIView):
    permission_classes = [CanRequestPettyCash]

    def get(self, request):
        try:
            year = int(request.query_params.get("year"))
            month = int(request.query_params.get("month"))
        except (TypeError, ValueError):
            return Response({"detail": "year and month query params are required."}, status=status.HTTP_400_BAD_REQUEST)

        float_id = request.query_params.get("float")
        petty_cash_float = PettyCashFloat.objects.filter(id=float_id).first() if float_id else None

        data = get_petty_cash_monthly_summary(year, month, petty_cash_float=petty_cash_float)

        if request.query_params.get("export") == "csv":
            return _csv_response(
                filename=f"petty_cash_monthly_{year}_{month:02d}.csv",
                headers=["Category", "Total"],
                rows=[[row["contra_account__name"] or row["contra_account__code"], row["total"]]
                      for row in data["expenses_by_category"]],
            )
        return Response(data)


def _csv_response(filename, headers, rows):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(headers)
    writer.writerows(rows)
    return response