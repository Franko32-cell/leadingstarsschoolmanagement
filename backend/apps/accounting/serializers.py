from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import (
    Account,
    JournalEntry,
    JournalLine,
    PettyCashFloat,
    PettyCashTransaction,
    PettyCashTransactionType,
)
from .services import (
    InvalidLineError,
    PettyCashError,
    UnbalancedEntryError,
    create_petty_cash_float,
    post_journal_entry,
    submit_petty_cash_transaction,
)


class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id", "code", "name", "account_type", "account_subtype",
            "parent", "normal_balance", "is_active", "is_system",
            "description", "balance", "created_at", "updated_at",
        ]
        read_only_fields = ["normal_balance"]

    def get_balance(self, obj):
        return str(obj.balance())

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.is_system:
            protected = {"account_type", "code"} & set(attrs.keys())
            if protected:
                raise serializers.ValidationError(
                    "System accounts can't have their code or type changed."
                )
        return attrs


class JournalLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)

    class Meta:
        model = JournalLine
        fields = ["id", "account", "account_code", "account_name", "debit", "credit", "description"]


class JournalLineInputSerializer(serializers.Serializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())
    debit   = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    credit  = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    total_debit  = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_credit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id", "reference", "date", "description", "entry_type", "source_module",
            "is_reversed", "reversal_of", "created_by_name", "created_at",
            "lines", "total_debit", "total_credit",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"


class JournalEntryCreateSerializer(serializers.Serializer):
    """Used for manual entries posted through the API (adjustments etc.)."""

    date = serializers.DateField()
    description = serializers.CharField(max_length=255)
    entry_type = serializers.ChoiceField(
        choices=JournalEntry._meta.get_field("entry_type").choices, required=False
    )
    lines = JournalLineInputSerializer(many=True)

    def validate_lines(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("At least two lines are required.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        try:
            entry = post_journal_entry(
                date=validated_data["date"],
                description=validated_data["description"],
                lines=validated_data["lines"],
                entry_type=validated_data.get("entry_type", "standard"),
                created_by=request.user if request and request.user.is_authenticated else None,
                source_module="manual",
                request=request,
            )
        except (UnbalancedEntryError, InvalidLineError) as e:
            raise serializers.ValidationError(str(e))
        return entry
    # ─────────────────────────────────────────────────────────────────────────
# PETTY CASH — append everything below to apps/accounting/serializers.py
#
# Add to the "from .models import ..." line:
#   PettyCashFloat, PettyCashTransaction, PettyCashTransactionType,
#   PettyCashTransactionStatus
#
# Add to the "from .services import ..." line:
#   PettyCashError, create_petty_cash_float, submit_petty_cash_transaction
#
# Add this new import (separate from DRF's serializers.ValidationError):
#   from django.core.exceptions import ValidationError as DjangoValidationError
# ─────────────────────────────────────────────────────────────────────────


class PettyCashFloatSerializer(serializers.ModelSerializer):
    custodian_name = serializers.SerializerMethodField()
    account_code = serializers.CharField(source="account.code", read_only=True)
    current_balance = serializers.SerializerMethodField()

    class Meta:
        model = PettyCashFloat
        fields = [
            "id", "name", "custodian", "custodian_name", "account", "account_code",
            "funding_account", "opening_balance", "current_balance", "status",
            "description", "created_at", "closed_at",
        ]
        read_only_fields = ["status", "created_at", "closed_at"]

    def get_custodian_name(self, obj):
        return obj.custodian.get_full_name() or obj.custodian.username

    def get_current_balance(self, obj):
        return str(obj.current_balance())

    def create(self, validated_data):
        request = self.context.get("request")
        try:
            return create_petty_cash_float(
                name=validated_data["name"],
                custodian=validated_data["custodian"],
                account=validated_data["account"],
                funding_account=validated_data["funding_account"],
                opening_balance=validated_data.get("opening_balance") or 0,
                description=validated_data.get("description", ""),
                created_by=request.user if request and request.user.is_authenticated else None,
                request=request,
            )
        except (PettyCashError, DjangoValidationError) as e:
            raise serializers.ValidationError(str(e))


class PettyCashTransactionSerializer(serializers.ModelSerializer):
    float_name = serializers.CharField(source="float.name", read_only=True)
    contra_account_code = serializers.CharField(source="contra_account.code", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()
    journal_reference = serializers.CharField(source="journal_entry.reference", read_only=True)

    class Meta:
        model = PettyCashTransaction
        fields = [
            "id", "float", "float_name", "transaction_type", "status",
            "date", "amount", "adjustment_direction", "contra_account", "contra_account_code",
            "description", "receipt",
            "requested_by", "requested_by_name", "approved_by", "approved_by_name",
            "paid_by", "paid_by_name", "rejection_reason",
            "journal_entry", "journal_reference",
            "created_at", "submitted_at", "approved_at", "paid_at",
        ]
        read_only_fields = [
            "status", "requested_by", "approved_by", "paid_by", "rejection_reason",
            "journal_entry", "created_at", "submitted_at", "approved_at", "paid_at",
        ]

    def _name(self, user):
        if not user:
            return None
        return user.get_full_name() or user.username

    def get_requested_by_name(self, obj):
        return self._name(obj.requested_by)

    def get_approved_by_name(self, obj):
        return self._name(obj.approved_by)

    def get_paid_by_name(self, obj):
        return self._name(obj.paid_by)


class PettyCashTransactionCreateSerializer(serializers.Serializer):
    """Used to submit a new expense claim, replenishment, or adjustment."""

    float = serializers.PrimaryKeyRelatedField(queryset=PettyCashFloat.objects.all())
    transaction_type = serializers.ChoiceField(choices=PettyCashTransactionType.choices)
    date = serializers.DateField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField(max_length=255)
    contra_account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False, allow_null=True)
    adjustment_direction = serializers.CharField(required=False, allow_blank=True)
    receipt = serializers.FileField(required=False, allow_null=True)

    def create(self, validated_data):
        request = self.context.get("request")
        try:
            return submit_petty_cash_transaction(
                petty_cash_float=validated_data["float"],
                transaction_type=validated_data["transaction_type"],
                amount=validated_data["amount"],
                description=validated_data["description"],
                date=validated_data.get("date"),
                contra_account=validated_data.get("contra_account"),
                adjustment_direction=validated_data.get("adjustment_direction", ""),
                receipt=validated_data.get("receipt"),
                requested_by=request.user if request and request.user.is_authenticated else None,
                request=request,
            )
        except (PettyCashError, DjangoValidationError) as e:
            raise serializers.ValidationError(str(e))


class PettyCashRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)