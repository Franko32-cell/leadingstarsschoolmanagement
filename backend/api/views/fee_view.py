import hmac
import hashlib
import logging
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum, Count, Q

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action

from apps.fees.models import Fee, PaymentTransaction
from apps.students.models import Student
from api.serializers.fee_serializer import FeeSerializer
from apps.fees.services.termii import TermiiSMSService, TermiiSMSError
from apps.fees.services.templates import fee_payment_received

logger = logging.getLogger(__name__)


def to_decimal(value, default=Decimal("0")):
    try:
        return Decimal(str(value)) if value not in (None, "") else default
    except Exception:
        return default


# ──────────────────────────────────────────────────────────────────────────────
# Paystack Webhook
# ──────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def paystack_webhook(request):
    """
    Paystack POSTs here after every successful charge.
    - Verifies HMAC-SHA512 signature
    - Idempotent: skips if the Paystack reference was already recorded
    - Records payment and sends SMS to parent
    """
    secret    = getattr(settings, "PAYSTACK_SECRET_KEY", "")
    signature = request.headers.get("x-paystack-signature", "")
    body      = request.body

    # ── Signature verification ────────────────────────────────────────────────
    expected = hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(expected, signature):
        logger.warning("Paystack webhook: invalid signature received")
        return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    payload = request.data
    event   = payload.get("event")

    if event != "charge.success":
        return Response({"status": "ignored"})

    data        = payload.get("data", {})
    reference   = data.get("reference", "")
    amount_kobo = data.get("amount", 0)
    amount      = Decimal(str(amount_kobo)) / 100

    # ── Extract fee_id from Paystack metadata ─────────────────────────────────
    meta      = data.get("metadata", {})
    fields    = {f["variable_name"]: f["value"] for f in meta.get("custom_fields", [])}
    fee_id    = fields.get("fee_id")

    if not fee_id:
        logger.error("Paystack webhook: no fee_id in metadata. ref=%s", reference)
        return Response({"status": "no fee_id"})

    # ── Idempotency check ─────────────────────────────────────────────────────
    if PaymentTransaction.objects.filter(note__icontains=reference).exists():
        logger.info("Paystack webhook: duplicate ref=%s — skipping", reference)
        return Response({"status": "duplicate"})

    # ── Load fee ──────────────────────────────────────────────────────────────
    try:
        fee = Fee.objects.select_related(
            "student", "student__school_class"
        ).get(id=fee_id)
    except Fee.DoesNotExist:
        logger.error("Paystack webhook: Fee %s not found", fee_id)
        return Response({"status": "fee not found"})

    # Cap amount at current balance to prevent negative balance
    if amount > fee.balance:
        logger.warning(
            "Paystack webhook: amount %s exceeds balance %s for fee %s — capping",
            amount, fee.balance, fee_id,
        )
        amount = fee.balance

    # ── Record payment ────────────────────────────────────────────────────────
    fee.paid += amount
    fee.save()

    txn = PaymentTransaction.objects.create(
        fee         = fee,
        amount      = amount,
        note        = f"Paystack webhook ref: {reference}",
        recorded_by = None,
    )

    # ── Send SMS ──────────────────────────────────────────────────────────────
    parent_phone = fee.student.parent_phone
    if parent_phone:
        message = fee_payment_received(
            parent_name    = fee.student.parent_name or "Parent/Guardian",
            student_name   = fee.student.full_name,
            student_class  = str(fee.student.school_class) if fee.student.school_class else "N/A",
            amount_paid    = amount,
            balance        = fee.balance,
            term           = fee.get_term_display(),
            transaction_id = txn.id,
        )
        try:
            TermiiSMSService().send(phone=parent_phone, message=message)
            logger.info(
                "Webhook SMS sent for student %s | txn=%s",
                fee.student.full_name, txn.id,
            )
        except TermiiSMSError as e:
            logger.error(
                "Webhook SMS failed for student %s: %s",
                fee.student.full_name, e,
            )
    else:
        logger.warning(
            "Webhook: no parent phone for student %s — SMS skipped",
            fee.student.full_name,
        )

    return Response({"status": "ok"})


# ──────────────────────────────────────────────────────────────────────────────
# FeeViewSet
# ──────────────────────────────────────────────────────────────────────────────

class FeeViewSet(ModelViewSet):

    queryset           = Fee.objects.all().select_related("student")
    serializer_class   = FeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs     = super().get_queryset()
        params = self.request.query_params

        student      = params.get("student")
        term         = params.get("term")
        school_class = params.get("school_class")
        status_param = params.get("status")

        if student:      qs = qs.filter(student_id=student)
        if term:         qs = qs.filter(term=term)
        if school_class: qs = qs.filter(student__school_class_id=school_class)

        if status_param == "paid":
            qs = qs.filter(balance__lte=0)
        elif status_param == "partial":
            qs = qs.filter(paid__gt=0, balance__gt=0)
        elif status_param == "unpaid":
            qs = qs.filter(paid=0)

        return qs

    # ── Record a payment ──────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="pay")
    def pay(self, request, pk=None):
        fee    = self.get_object()
        amount = request.data.get("amount")
        note   = request.data.get("note", "")

        if amount is None:
            return Response(
                {"error": "amount is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount = Decimal(str(amount))
        except (TypeError, ValueError):
            return Response(
                {"error": "amount must be a number"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount <= 0:
            return Response(
                {"error": "amount must be greater than 0"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount > fee.balance:
            return Response(
                {"error": f"Amount exceeds outstanding balance of {fee.balance}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Idempotency: skip if this Paystack reference already recorded ─────
        paystack_ref = None
        if note and "paystack ref:" in note.lower():
            paystack_ref = note.split(":")[-1].strip()
            if PaymentTransaction.objects.filter(note__icontains=paystack_ref).exists():
                logger.info(
                    "pay() action: duplicate Paystack ref=%s — skipping double-record",
                    paystack_ref,
                )
                return Response(FeeSerializer(fee).data)

        fee.paid += amount
        fee.save()

        txn = PaymentTransaction.objects.create(
            fee         = fee,
            amount      = amount,
            note        = note,
            recorded_by = request.user if request.user.is_authenticated else None,
        )

        # ── Send SMS ──────────────────────────────────────────────────────────
        parent_phone = fee.student.parent_phone
        if parent_phone:
            message = fee_payment_received(
                parent_name    = fee.student.parent_name or "Parent/Guardian",
                student_name   = fee.student.full_name,
                student_class  = str(fee.student.school_class) if fee.student.school_class else "N/A",
                amount_paid    = amount,
                balance        = fee.balance,
                term           = fee.get_term_display(),
                transaction_id = txn.id,
            )
            try:
                TermiiSMSService().send(phone=parent_phone, message=message)
                logger.info(
                    "SMS sent for student %s | txn=%s",
                    fee.student.full_name, txn.id,
                )
            except TermiiSMSError as e:
                logger.error(
                    "SMS failed for student %s: %s",
                    fee.student.full_name, e,
                )
        else:
            logger.warning(
                "No parent phone for student %s — SMS skipped",
                fee.student.full_name,
            )

        return Response({
            **FeeSerializer(fee).data,
            "transaction_id": txn.id,
        })

    # ── List payment transactions for a fee record ────────────────────────────

    @action(detail=True, methods=["get"], url_path="transactions")
    def transactions(self, request, pk=None):
        fee          = self.get_object()
        transactions = fee.transactions.select_related("recorded_by").all()

        data = [
            {
                "id":          t.id,
                "amount":      str(t.amount),
                "note":        t.note,
                "recorded_by": (
                    t.recorded_by.get_full_name() or t.recorded_by.username
                    if t.recorded_by else "System"
                ),
                "created_at":  t.created_at.strftime("%d %b %Y, %I:%M %p"),
                "date":        t.created_at.strftime("%d %b %Y"),
                "time":        t.created_at.strftime("%I:%M %p"),
            }
            for t in transactions
        ]

        return Response(data)

    # ── Assign fee to a single student ────────────────────────────────────────

    @action(detail=False, methods=["post"], url_path="assign-student")
    def assign_student(self, request):
        student_id = request.data.get("student")
        term       = request.data.get("term")
        amount     = request.data.get("amount")

        if not all([student_id, term, amount]):
            return Response(
                {"error": "student, term and amount are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {"error": "Student not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        fee, is_new = Fee.objects.get_or_create(
            student=student,
            term=term,
            defaults={
                "amount":        to_decimal(amount),
                "book_user_fee": to_decimal(request.data.get("book_user_fee")),
                "workbook_fee":  to_decimal(request.data.get("workbook_fee")),
                "arrears":       to_decimal(request.data.get("arrears")),
                "paid":          Decimal("0"),
            },
        )

        if not is_new:
            fee.amount        = to_decimal(amount)
            fee.book_user_fee = to_decimal(request.data.get("book_user_fee"), fee.book_user_fee)
            fee.workbook_fee  = to_decimal(request.data.get("workbook_fee"),  fee.workbook_fee)
            fee.arrears       = to_decimal(request.data.get("arrears"),       fee.arrears)
            fee.save()

        return Response(
            FeeSerializer(fee).data,
            status=status.HTTP_201_CREATED if is_new else status.HTTP_200_OK,
        )

    # ── Bulk assign fees to a whole class ─────────────────────────────────────

    @action(detail=False, methods=["post"], url_path="bulk-assign")
    def bulk_assign(self, request):
        school_class = request.data.get("school_class")
        term         = request.data.get("term")
        amount       = request.data.get("amount")

        if not all([school_class, term, amount]):
            return Response(
                {"error": "school_class, term and amount are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount        = Decimal(str(amount))
            book_user_fee = to_decimal(request.data.get("book_user_fee"))
            workbook_fee  = to_decimal(request.data.get("workbook_fee"))
        except (TypeError, ValueError):
            return Response(
                {"error": "Fee values must be numbers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount <= 0:
            return Response(
                {"error": "amount must be greater than 0"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        students = Student.objects.filter(school_class_id=school_class)
        if not students.exists():
            return Response(
                {"error": "No students found for this class"},
                status=status.HTTP_404_NOT_FOUND,
            )

        created = updated = 0

        for student in students:
            fee, is_new = Fee.objects.get_or_create(
                student=student,
                term=term,
                defaults={
                    "amount":        amount,
                    "book_user_fee": book_user_fee,
                    "workbook_fee":  workbook_fee,
                    "paid":          Decimal("0"),
                },
            )
            if not is_new:
                fee.amount        = amount
                fee.book_user_fee = book_user_fee
                fee.workbook_fee  = workbook_fee
                fee.save()
                updated += 1
            else:
                created += 1

        return Response({"created": created, "updated": updated, "total": created + updated})

    # ── Add arrears to a specific student fee record ──────────────────────────

    @action(detail=True, methods=["post"], url_path="add-arrears")
    def add_arrears(self, request, pk=None):
        fee     = self.get_object()
        arrears = request.data.get("arrears")

        if arrears is None:
            return Response(
                {"error": "arrears is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            arrears = Decimal(str(arrears))
        except (TypeError, ValueError):
            return Response(
                {"error": "arrears must be a number"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if arrears < 0:
            return Response(
                {"error": "arrears cannot be negative"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fee.arrears = arrears
        fee.save()
        return Response(FeeSerializer(fee).data)

    # ── Summary stats for a class + term ──────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        school_class = request.query_params.get("school_class")
        term         = request.query_params.get("term")

        if not school_class or not term:
            return Response(
                {"error": "school_class and term are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fees = Fee.objects.filter(
            student__school_class_id=school_class,
            term=term,
        ).select_related("student")

        agg = fees.aggregate(
            total_fees     = Sum("amount"),
            total_books    = Sum("book_user_fee"),
            total_wb       = Sum("workbook_fee"),
            total_arrears  = Sum("arrears"),
            total_paid     = Sum("paid"),
            total_balance  = Sum("balance"),
            total_students = Count("id"),
            fully_paid     = Count("id", filter=Q(balance__lte=0)),
            partial        = Count("id", filter=Q(paid__gt=0, balance__gt=0)),
            unpaid         = Count("id", filter=Q(paid=0)),
        )

        total_expected = (
            (agg["total_fees"]    or 0) +
            (agg["total_books"]   or 0) +
            (agg["total_wb"]      or 0) +
            (agg["total_arrears"] or 0)
        )

        recent_payments = (
            PaymentTransaction.objects
            .filter(fee__in=fees)
            .select_related("fee__student", "recorded_by")
            .order_by("-created_at")[:20]
        )
        recent = [
            {
                "id":           t.id,
                "student_name": t.fee.student.full_name,
                "amount":       str(t.amount),
                "note":         t.note,
                "recorded_by":  (
                    t.recorded_by.get_full_name() or t.recorded_by.username
                    if t.recorded_by else "System"
                ),
                "created_at":   t.created_at.strftime("%d %b %Y, %I:%M %p"),
            }
            for t in recent_payments
        ]

        return Response({
            "total_expected":  total_expected,
            "total_fees":      agg["total_fees"]     or 0,
            "total_books":     agg["total_books"]    or 0,
            "total_workbooks": agg["total_wb"]       or 0,
            "total_arrears":   agg["total_arrears"]  or 0,
            "total_paid":      agg["total_paid"]     or 0,
            "total_balance":   agg["total_balance"]  or 0,
            "total_students":  agg["total_students"] or 0,
            "fully_paid":      agg["fully_paid"]     or 0,
            "partial":         agg["partial"]        or 0,
            "unpaid":          agg["unpaid"]         or 0,
            "recent_payments": recent,
            "records":         FeeSerializer(fees, many=True).data,
        })

    # ── Preview fees to delete for a class + term + year ─────────────────────

    @action(detail=False, methods=["get"], url_path="delete-preview")
    def delete_preview(self, request):
        school_class = request.query_params.get("school_class")
        term         = request.query_params.get("term")
        year         = request.query_params.get("year")

        if not school_class or not term or not year:
            return Response(
                {"error": "school_class, term and year are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fees = Fee.objects.filter(
            student__school_class_id=school_class,
            term=term,
            created_at__year=year,
        ).select_related("student")

        data = [
            {
                "fee_id":           fee.id,
                "student_id":       fee.student.id,
                "admission_number": fee.student.admission_number,
                "student_name":     fee.student.full_name,
                "term":             fee.term,
                "amount":           str(fee.amount),
                "total_amount":     str(fee.total_amount),
                "paid":             str(fee.paid),
                "balance":          str(fee.balance),
                "created_at":       fee.created_at.strftime("%d %b %Y, %I:%M %p"),
            }
            for fee in fees
        ]

        return Response({"count": len(data), "fees": data}, status=status.HTTP_200_OK)

    # ── Delete fees for a class + term + year ─────────────────────────────────

    @action(detail=False, methods=["delete"], url_path="delete-class-fees")
    def delete_class_fees(self, request):
        school_class = request.query_params.get("school_class")
        term         = request.query_params.get("term")
        year         = request.query_params.get("year")

        if not school_class or not term or not year:
            return Response(
                {"error": "school_class, term and year are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count, _ = Fee.objects.filter(
            student__school_class_id=school_class,
            term=term,
            created_at__year=year,
        ).delete()

        return Response(
            {"detail": f"{deleted_count} fee record(s) deleted successfully."},
            status=status.HTTP_200_OK,
        )

    # ── Fetch fees for unassigned students ────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="unassigned-fees")
    def unassigned_fees(self, request):
        fees = Fee.objects.filter(
            student__school_class__isnull=True
        ).select_related("student", "student__user")

        data = [
            {
                "fee_id":           fee.id,
                "term":             fee.term,
                "student_id":       fee.student.id,
                "admission_number": fee.student.admission_number,
                "student_name":     fee.student.full_name,
                "school_class":     None,
                "amount":           str(fee.amount),
                "total_amount":     str(fee.total_amount),
                "paid":             str(fee.paid),
                "balance":          str(fee.balance),
                "created_at":       fee.created_at.strftime("%d %b %Y, %I:%M %p"),
            }
            for fee in fees
        ]

        return Response(data, status=status.HTTP_200_OK)

    # ── Delete wrongly billed fees for unassigned students ────────────────────

    @action(detail=False, methods=["delete"], url_path="unassigned-fees/delete")
    def delete_unassigned_fees(self, request):
        fee_id = request.query_params.get("fee_id")

        if fee_id:
            try:
                fee = Fee.objects.get(id=fee_id, student__school_class__isnull=True)
            except Fee.DoesNotExist:
                return Response(
                    {"error": "Fee not found or student is already assigned to a class."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            fee.delete()
            return Response(
                {"detail": f"Fee {fee_id} deleted successfully."},
                status=status.HTTP_200_OK,
            )

        deleted_count, _ = Fee.objects.filter(
            student__school_class__isnull=True
        ).delete()

        return Response(
            {"detail": f"{deleted_count} fee record(s) deleted for unassigned students."},
            status=status.HTTP_200_OK,
        )
