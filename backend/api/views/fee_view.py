import hmac
import hashlib
import logging
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import Sum, Count, Q, Prefetch

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action

from apps.fees.models import Fee, PaymentTransaction
from apps.students.models import Student
from api.serializers.fee_serializer import FeeSerializer
from apps.fees.services.termii import TermiiSMSService, TermiiSMSError
from apps.fees.services.templates import fee_payment_received

# ── Audit logging ────────────────────────────────────────────────────────
from apps.audit.models import AuditLog
from apps.audit.services import log_action

logger = logging.getLogger(__name__)


def to_decimal(value, default=Decimal("0")):
    try:
        return Decimal(str(value)) if value not in (None, "") else default
    except Exception:
        return default


class FeePermission(BasePermission):
    """
    Admin: everything. Student: read their own fees (queryset-scoped) and
    pay them via the `pay` action. Teachers / anonymous: no access.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        role = getattr(user, "role", None)
        if role == "admin":
            return True
        if role == "student":
            return request.method in SAFE_METHODS or getattr(view, "action", None) == "pay"
        return False


def _extract_reference(note):
    """Pull the Paystack reference out of a 'Paystack ref: XXXX' style note."""
    if not note or "ref:" not in note.lower():
        return ""
    return note.split(":")[-1].strip()


def verify_paystack_reference(reference):
    """
    Confirm a Paystack reference server-side.
    Returns (verified_amount_in_cedis | None, error_message | None).
    If PAYSTACK_SECRET_KEY is not configured we cannot verify; callers decide
    what to do (returns (None, "unconfigured")).
    """
    secret = getattr(settings, "PAYSTACK_SECRET_KEY", "")
    if not secret:
        return None, "unconfigured"
    try:
        resp = requests.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {secret}"},
            timeout=15,
        )
        body = resp.json()
    except (requests.RequestException, ValueError) as exc:
        logger.error("Paystack verify failed for %s: %s", reference, exc)
        return None, "We could not confirm this payment with Paystack just now. If you were charged, it will be recorded automatically within a few minutes — please keep your payment reference."
    data = body.get("data") or {}
    if not body.get("status") or data.get("status") != "success":
        return None, "Paystack has not confirmed this payment."
    return Decimal(str(data.get("amount", 0))) / 100, None


def apply_payment(fee_id, amount, note, recorded_by=None, reference="", cap=False):
    """
    Atomically record a payment against a fee.

    The fee row is locked for the duration so two simultaneous requests
    (e.g. Paystack webhook + the student's browser callback, or two admins)
    cannot both read the same balance and overwrite each other's `paid`.
    Returns (fee, txn, state) where state is "ok", "duplicate" or "over_balance".
    """
    with transaction.atomic():
        fee = Fee.objects.select_for_update().select_related(
            "student", "student__school_class"
        ).get(pk=fee_id)

        if reference and PaymentTransaction.objects.filter(note__icontains=reference).exists():
            return fee, None, "duplicate"

        if amount > fee.balance:
            if not cap:
                return fee, None, "over_balance"
            amount = fee.balance
        if amount <= 0:
            return fee, None, "over_balance"

        old_balance = fee.balance
        fee.paid += amount
        fee.save()
        txn = PaymentTransaction.objects.create(
            fee=fee, amount=amount, note=note, recorded_by=recorded_by,
        )
    fee._old_balance = old_balance
    fee._applied_amount = amount
    return fee, txn, "ok"


# ──────────────────────────────────────────────────────────────────────────────
# Paystack Webhook
# ──────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([])
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
    # With no secret configured the HMAC key would be empty and anyone could
    # forge a valid signature — refuse outright instead.
    if not secret:
        logger.error("Paystack webhook rejected: PAYSTACK_SECRET_KEY is not configured")
        return Response({"error": "Webhook not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

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

    # ── Record payment (locked, idempotent, capped at balance) ────────────────
    try:
        fee, txn, state = apply_payment(
            fee_id, amount, f"Paystack webhook ref: {reference}",
            recorded_by=None, reference=reference, cap=True,
        )
    except Fee.DoesNotExist:
        logger.error("Paystack webhook: Fee %s not found", fee_id)
        return Response({"status": "fee not found"})

    if state == "duplicate":
        logger.info("Paystack webhook: duplicate ref=%s — skipping", reference)
        return Response({"status": "duplicate"})
    if state != "ok":
        logger.info("Paystack webhook: nothing to apply for fee %s (already settled)", fee_id)
        return Response({"status": "already_settled"})

    amount = fee._applied_amount
    log_action(
        request=request,
        action=AuditLog.Action.PAYMENT_PROCESSED,
        module=AuditLog.Module.FEES,
        resource_type="PaymentTransaction",
        resource_id=txn.id,
        resource_repr=f"Payment: {fee.student.full_name} — {fee.get_term_display()} (Paystack)",
        previous_value={"balance": str(fee._old_balance)},
        new_value={"balance": str(fee.balance), "amount_paid": str(amount)},
        description=f"Paystack webhook ref: {reference}",
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
    permission_classes = [FeePermission]

    def get_queryset(self):
        # PERF FIX: FeeSerializer nests PaymentTransactionSerializer(many=True)
        # for every fee, and PaymentTransactionSerializer.get_student_name()/
        # get_admission_number() read obj.fee.student for every transaction.
        # Without prefetch_related here, that was 1 query per fee for its
        # transactions PLUS 2 extra queries per transaction (.fee, then
        # .fee.student) — an N+1 cascade severe enough to time out the /fees/
        # list endpoint entirely once there was enough payment history.
        #
        # select_related("recorded_by") on the inner queryset avoids the same
        # problem for get_recorded_by_name(). We don't need to additionally
        # select_related("fee__student") inside the Prefetch — Django's
        # prefetch_related machinery reuses the exact same Fee instance object
        # for `.fee` on each prefetched transaction, and that instance already
        # has `.student` cached from the outer .select_related("student")
        # below, so `.fee.student` resolves from memory with zero extra query.
        qs = (
            super()
            .get_queryset()
            .select_related("student")
            .prefetch_related(
                Prefetch(
                    "transactions",
                    queryset=PaymentTransaction.objects
                        .select_related("recorded_by")
                        .order_by("-created_at"),
                )
            )
        )
        if getattr(self.request.user, "role", None) == "student":
            qs = qs.filter(student__user=self.request.user)
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
        except (TypeError, ValueError, ArithmeticError):
            return Response(
                {"error": "amount must be a number"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount <= 0:
            return Response(
                {"error": "amount must be greater than 0"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Paystack-confirmed online payments ────────────────────────────────
        reference = _extract_reference(note)
        is_student = getattr(request.user, "role", None) == "student"

        if is_student and not reference:
            return Response(
                {"error": "Online payments need a Paystack reference."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if reference and is_student:
            verified, err = verify_paystack_reference(reference)
            if err == "unconfigured":
                if is_student:
                    # Cannot verify without the secret key. Behaviour is kept
                    # (so live payments keep working) but loudly logged —
                    # set PAYSTACK_SECRET_KEY to close this gap.
                    logger.warning(
                        "PAYSTACK_SECRET_KEY not set: accepting unverified Paystack ref %s from student %s",
                        reference, request.user.pk,
                    )
            elif err:
                return Response({"error": err}, status=status.HTTP_402_PAYMENT_REQUIRED)
            elif amount > verified:
                amount = verified   # never credit more than Paystack actually collected

        fee, txn, state = apply_payment(
            fee.pk, amount, note,
            recorded_by=request.user if request.user.is_authenticated else None,
            reference=reference,
        )
        if state == "duplicate":
            logger.info("pay(): duplicate Paystack ref=%s — skipping double-record", reference)
            return Response(FeeSerializer(fee).data)
        if state == "over_balance":
            return Response(
                {"error": f"Amount exceeds outstanding balance of {fee.balance}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_balance = fee._old_balance
        amount = fee._applied_amount

        log_action(
            request=request,
            action=AuditLog.Action.PAYMENT_PROCESSED,
            module=AuditLog.Module.FEES,
            resource_type="PaymentTransaction",
            resource_id=txn.id,
            resource_repr=f"Payment: {fee.student.full_name} — {fee.get_term_display()}",
            previous_value={"balance": str(old_balance)},
            new_value={"balance": str(fee.balance), "amount_paid": str(amount)},
            description=note or "",
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

    # ── List all payment transactions for a given date ────────────────────────
    # Powers the "Receipts by Date" tab / bulk end-of-day receipt printing.
    # NOTE: this is a separate action from the detail=True `transactions`
    # action above. DRF routes them differently (/fees/<pk>/transactions/
    # vs /fees/transactions/) based on detail=True/False, so reusing the
    # same url_path is fine — they do not collide.

    @action(detail=False, methods=["get"], url_path="transactions")
    def transactions_by_date(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date is required (YYYY-MM-DD)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            PaymentTransaction.objects
            .filter(created_at__date=date_str)
            .select_related("fee__student", "fee__student__school_class", "recorded_by")
            .order_by("created_at")
        )

        data = []
        for t in qs:
            fee          = t.fee
            total_amount = fee.total_amount

            # Balance as of THIS payment, not the fee's current (possibly
            # later) balance — sum everything paid on this fee up to and
            # including this transaction's timestamp. This keeps a reprinted
            # receipt from a previous day accurate even if more payments
            # have been recorded on the fee since.
            paid_to_date = (
                fee.transactions
                .filter(created_at__lte=t.created_at)
                .aggregate(total=Sum("amount"))["total"]
                or Decimal("0")
            )
            balance_after   = total_amount - paid_to_date
            is_full_payment = balance_after <= 0

            data.append({
                "id":                t.id,
                "student_name":      fee.student.full_name,
                "admission_number":  fee.student.admission_number,
                "school_class_name": str(fee.student.school_class) if fee.student.school_class else None,
                "amount":            str(t.amount),
                "note":              t.note,
                "recorded_by": (
                    t.recorded_by.get_full_name() or t.recorded_by.username
                    if t.recorded_by else "System"
                ),
                "term":              fee.term,
                "year":              t.created_at.year,
                "date":              t.created_at.strftime("%d %b %Y"),
                "time":              t.created_at.strftime("%I:%M %p"),
                "total_amount":      str(total_amount),
                "paid_to_date":      str(paid_to_date),
                "balance":           str(balance_after),
                "is_full_payment":   is_full_payment,
            })

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

        log_action(
            request=request,
            action=AuditLog.Action.CREATE if is_new else AuditLog.Action.FEE_UPDATE,
            module=AuditLog.Module.FEES,
            resource_type="Fee",
            resource_id=fee.id,
            resource_repr=f"Fee: {student.full_name} — {fee.get_term_display()}",
            new_value={"amount": str(fee.amount), "arrears": str(fee.arrears)},
        )

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

        log_action(
            request=request,
            action=AuditLog.Action.FEE_UPDATE,
            module=AuditLog.Module.FEES,
            resource_type="Fee",
            resource_repr=f"Bulk fee assignment: class {school_class}, {term}",
            new_value={"amount": str(amount), "created": created, "updated": updated},
            description=f"{created} created, {updated} updated",
        )

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

        old_arrears = fee.arrears
        fee.arrears = arrears
        fee.save()

        log_action(
            request=request,
            action=AuditLog.Action.FEE_UPDATE,
            module=AuditLog.Module.FEES,
            resource_type="Fee",
            resource_id=fee.id,
            resource_repr=f"Arrears updated: {fee.student.full_name} — {fee.get_term_display()}",
            previous_value={"arrears": str(old_arrears)},
            new_value={"arrears": str(arrears)},
        )

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

        log_action(
            request=request,
            action=AuditLog.Action.DELETE,
            module=AuditLog.Module.FEES,
            resource_type="Fee",
            resource_repr=f"Bulk delete: class {school_class}, {term}, {year}",
            description=f"{deleted_count} fee record(s) deleted",
        )

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
            student_name = fee.student.full_name
            fee.delete()
            log_action(
                request=request,
                action=AuditLog.Action.DELETE,
                module=AuditLog.Module.FEES,
                resource_type="Fee",
                resource_id=fee_id,
                resource_repr=f"Unassigned fee deleted: {student_name}",
            )
            return Response(
                {"detail": f"Fee {fee_id} deleted successfully."},
                status=status.HTTP_200_OK,
            )

        deleted_count, _ = Fee.objects.filter(
            student__school_class__isnull=True
        ).delete()

        log_action(
            request=request,
            action=AuditLog.Action.DELETE,
            module=AuditLog.Module.FEES,
            resource_type="Fee",
            resource_repr="Bulk delete: unassigned-student fees",
            description=f"{deleted_count} fee record(s) deleted",
        )

        return Response(
            {"detail": f"{deleted_count} fee record(s) deleted for unassigned students."},
            status=status.HTTP_200_OK,
        )