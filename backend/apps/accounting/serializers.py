from rest_framework import serializers

from .models import Account, JournalEntry, JournalLine
from .services import InvalidLineError, UnbalancedEntryError, post_journal_entry


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