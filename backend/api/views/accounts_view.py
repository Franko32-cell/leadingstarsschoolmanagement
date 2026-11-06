# api/views/accounts_view.py

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db.models import Sum, Count, Q

from apps.fees.models import Fee, PaymentTransaction

TERM_LABELS = {
    "term1": "Term 1",
    "term2": "Term 2",
    "term3": "Term 3",
}


class AccountsDashboardView(APIView):
    """Overall financial summary across all classes and terms."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        term         = request.query_params.get("term")
        school_class = request.query_params.get("school_class")

        fees = Fee.objects.all()
        if term:         fees = fees.filter(term=term)
        if school_class: fees = fees.filter(student__school_class_id=school_class)

        agg = fees.aggregate(
            total_expected = Sum("amount"),
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

        total_billed = (
            (agg["total_expected"] or 0) +
            (agg["total_books"]    or 0) +
            (agg["total_wb"]       or 0) +
            (agg["total_arrears"]  or 0)
        )

        # Per-term breakdown
        term_breakdown = []
        for t in ["term1", "term2", "term3"]:
            t_fees = fees.filter(term=t)
            t_agg  = t_fees.aggregate(
                billed = Sum("amount"),
                paid   = Sum("paid"),
                bal    = Sum("balance"),
            )
            term_breakdown.append({
                "term":    t,
                "label":   TERM_LABELS[t],
                "billed":  float(t_agg["billed"] or 0),
                "paid":    float(t_agg["paid"]   or 0),
                "balance": float(t_agg["bal"]    or 0),
            })

        # Recent transactions — flat fields, no serializer
        recent_qs = (
            PaymentTransaction.objects
            .select_related("fee__student", "fee__student__school_class", "recorded_by")
            .order_by("-created_at")[:10]
        )
        recent_transactions = [
            {
                "id":               t.id,
                "student_name":     t.fee.student.full_name,
                "admission_number": t.fee.student.admission_number,
                "class":            t.fee.student.school_class.name if t.fee.student.school_class else "-",
                "term":             TERM_LABELS.get(t.fee.term, t.fee.term),
                "amount":           float(t.amount),
                "note":             t.note,
                "recorded_by":      (
                    t.recorded_by.get_full_name() or t.recorded_by.username
                    if t.recorded_by else "System"
                ),
                "created_at":       t.created_at.strftime("%d %b %Y, %I:%M %p"),
            }
            for t in recent_qs
        ]

        return Response({
            "total_billed":        float(total_billed),
            "total_paid":          float(agg["total_paid"]    or 0),
            "total_balance":       float(agg["total_balance"] or 0),
            "total_students":      agg["total_students"]      or 0,
            "fully_paid":          agg["fully_paid"]          or 0,
            "partial":             agg["partial"]             or 0,
            "unpaid":              agg["unpaid"]              or 0,
            "collection_rate":     round(
                float(agg["total_paid"] or 0) / float(total_billed) * 100, 1
            ) if total_billed else 0,
            "term_breakdown":      term_breakdown,
            "recent_transactions": recent_transactions,
        })


class IncomeLedgerView(APIView):
    """Full transaction log with filtering."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        term         = request.query_params.get("term")
        school_class = request.query_params.get("school_class")
        student      = request.query_params.get("student")

        transactions = PaymentTransaction.objects.select_related(
            "fee__student",
            "fee__student__school_class",
            "recorded_by",
        ).order_by("-created_at")

        if term:         transactions = transactions.filter(fee__term=term)
        if school_class: transactions = transactions.filter(fee__student__school_class_id=school_class)
        if student:      transactions = transactions.filter(fee__student_id=student)

        agg = transactions.aggregate(total=Sum("amount"))

        data = [
            {
                "id":               t.id,
                "student_name":     t.fee.student.full_name,
                "admission_number": t.fee.student.admission_number,
                "class":            t.fee.student.school_class.name if t.fee.student.school_class else "-",
                "term":             TERM_LABELS.get(t.fee.term, t.fee.term),
                "amount":           float(t.amount),
                "note":             t.note,
                "recorded_by":      (
                    t.recorded_by.get_full_name() or t.recorded_by.username
                    if t.recorded_by else "-"
                ),
                "created_at":       t.created_at.strftime("%d %b %Y, %I:%M %p"),
            }
            for t in transactions
        ]

        return Response({
            "total_collected": float(agg["total"] or 0),
            "count":           transactions.count(),
            "transactions":    data,
        })


class FeeCollectionReportView(APIView):
    """Per-class fee collection breakdown."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        term = request.query_params.get("term")

        fees = Fee.objects.select_related("student__school_class")
        if term:
            fees = fees.filter(term=term)

        from django.db.models import F
        class_data = (
            fees
            .values(
                class_id   = F("student__school_class__id"),
                class_name = F("student__school_class__name"),
            )
            .annotate(
                total_billed   = Sum("amount"),
                total_paid     = Sum("paid"),
                total_balance  = Sum("balance"),
                total_students = Count("id"),
                fully_paid     = Count("id", filter=Q(balance__lte=0)),
                unpaid         = Count("id", filter=Q(paid=0)),
            )
            .order_by("class_name")
        )

        rows = []
        for row in class_data:
            billed = float(row["total_billed"] or 0)
            paid   = float(row["total_paid"]   or 0)
            rows.append({
                "class_id":        row["class_id"],
                "class_name":      row["class_name"] or "Unassigned",
                "total_students":  row["total_students"],
                "total_billed":    billed,
                "total_paid":      paid,
                "total_balance":   float(row["total_balance"] or 0),
                "fully_paid":      row["fully_paid"],
                "unpaid":          row["unpaid"],
                "collection_rate": round(paid / billed * 100, 1) if billed else 0,
            })

        return Response(rows)


class DefaultersListView(APIView):
    """Students with outstanding fee balances."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        term         = request.query_params.get("term")
        school_class = request.query_params.get("school_class")

        fees = (
            Fee.objects
            .filter(balance__gt=0)
            .select_related("student", "student__school_class")
            .order_by("-balance")
        )

        if term:         fees = fees.filter(term=term)
        if school_class: fees = fees.filter(student__school_class_id=school_class)

        data = [
            {
                "student_id":       fee.student.id,
                "student_name":     fee.student.full_name,
                "admission_number": fee.student.admission_number,
                "class":            fee.student.school_class.name if fee.student.school_class else "-",
                "term":             TERM_LABELS.get(fee.term, fee.term),
                "total_amount":     float(fee.total_amount),
                "paid":             float(fee.paid),
                "balance":          float(fee.balance),
                "arrears":          float(fee.arrears),
            }
            for fee in fees
        ]

        agg = fees.aggregate(total_outstanding=Sum("balance"))

        return Response({
            "total_outstanding": float(agg["total_outstanding"] or 0),
            "count":             len(data),
            "defaulters":        data,
        })
