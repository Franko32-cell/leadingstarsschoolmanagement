from rest_framework import serializers
from apps.fees.models import Fee, PaymentTransaction


class PaymentTransactionSerializer(serializers.ModelSerializer):
    recorded_by_name   = serializers.SerializerMethodField()
    student_name       = serializers.SerializerMethodField()
    admission_number   = serializers.SerializerMethodField()
    created_at_display = serializers.SerializerMethodField()

    class Meta:
        model  = PaymentTransaction
        fields = [
            "id",
            "fee",
            "student_name",
            "admission_number",
            "amount",
            "recorded_by",
            "recorded_by_name",
            "note",
            "created_at",
            "created_at_display",
        ]
        read_only_fields = ["created_at"]

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.get_full_name() or obj.recorded_by.username
        return None

    def get_student_name(self, obj):
        return obj.fee.student.full_name

    def get_admission_number(self, obj):
        return obj.fee.student.admission_number

    def get_created_at_display(self, obj):
        return obj.created_at.strftime("%d %b %Y, %I:%M %p")


class FeeSerializer(serializers.ModelSerializer):
    student_name     = serializers.SerializerMethodField()
    admission_number = serializers.SerializerMethodField()
    is_fully_paid    = serializers.SerializerMethodField()
    total_amount     = serializers.SerializerMethodField()
    transactions     = PaymentTransactionSerializer(many=True, read_only=True)

    class Meta:
        model  = Fee
        fields = [
            "id",
            "student",
            "student_name",
            "admission_number",
            "term",
            "amount",
            "book_user_fee",
            "workbook_fee",
            "arrears",
            "total_amount",
            "paid",
            "balance",
            "is_fully_paid",
            "transactions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["balance", "created_at", "updated_at"]

    def get_student_name(self, obj):
        return obj.student.full_name

    def get_admission_number(self, obj):
        return obj.student.admission_number

    def get_is_fully_paid(self, obj):
        return obj.balance <= 0

    def get_total_amount(self, obj):
        return obj.total_amount
