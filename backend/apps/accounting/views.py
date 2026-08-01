from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Account
from .serializers import AccountSerializer, JournalEntryCreateSerializer, JournalEntrySerializer
from .services import get_trial_balance, reverse_journal_entry


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        as_of = request.query_params.get("as_of")
        return Response(get_trial_balance(as_of=as_of))
