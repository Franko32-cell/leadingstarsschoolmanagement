"""
Reports & Analytics endpoint for the Admin Settings > Reports tab.

Deliberately does NOT duplicate DashboardView's counts (total_students,
total_teachers, total_classes, total_subjects, total_announcements,
pending/approved_admissions) — the frontend calls both and merges them.
This endpoint only adds analytics DashboardView doesn't already provide:
account-status breakdowns, attendance rate, academic performance, fee
collection, and recent activity.

No "graduated students" stat: there is no graduation concept anywhere in
the current models (Student/User have no such field, and
Report.promotion_status only tracks promoted/repeated/transferred/
withdrawn within the school, not graduation). Omitted rather than invented.

Every section below is built from aggregate queries (Count/Avg/Sum with
conditional Q filters) rather than per-row Python loops, so this stays a
small, fixed number of queries regardless of how many students/results/
attendance records/fees exist — the fees endpoint's earlier N+1 timeout
is exactly the mistake this is written to avoid.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.attendance.models import Attendance
from apps.results.models import Result
from apps.fees.models import Fee
from apps.audit.models import AuditLog
from api.serializers.audit_serializer import AuditLogSerializer

try:
    from api.permissions.role_permissions import IsAdmin
except ImportError:  # pragma: no cover - fallback, should not trigger in practice
    IsAdmin = permissions.IsAdminUser

User = get_user_model()


def _current_term():
    return getattr(settings, "CURRENT_TERM", "term3")


def _current_year():
    return getattr(settings, "CURRENT_YEAR", timezone.now().year)


def _account_status_breakdown(role):
    """
    {"active": N, "inactive": N, "suspended": N, "archived": N} for the
    given role, all zero-filled so the frontend never has to guess at
    missing keys. Single query via values().annotate().
    """
    counts = {"active": 0, "inactive": 0, "suspended": 0, "archived": 0}
    rows = (
        User.objects.filter(role=role)
        .values("account_status")
        .annotate(count=Count("id"))
    )
    for row in rows:
        status = row["account_status"] or "active"
        if status in counts:
            counts[status] = row["count"]
    return counts


class AnalyticsDashboardView(APIView):
    """
    GET /api/analytics/dashboard/?term=term3&year=2026

    term/year default to settings.CURRENT_TERM/CURRENT_YEAR (same
    convention as attendance/results views) if not supplied.
    """

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        term = request.query_params.get("term") or _current_term()
        year = request.query_params.get("year") or _current_year()
        try:
            year = int(year)
        except (TypeError, ValueError):
            year = _current_year()

        # ── Account status breakdowns (new — uses the account_status field
        # added for Student/Teacher management) ────────────────────────────
        student_status = _account_status_breakdown("student")
        teacher_status = _account_status_breakdown("teacher")

        # ── Attendance rate (this term/year) ────────────────────────────────
        att_qs = Attendance.objects.filter(term=term, year=year)
        att_agg = att_qs.aggregate(
            total=Count("id"),
            present_or_late=Count("id", filter=Q(status__in=["present", "late"])),
        )
        attendance_total = att_agg["total"] or 0
        attendance_present = att_agg["present_or_late"] or 0
        attendance_rate = (
            round(attendance_present / attendance_total * 100, 1)
            if attendance_total
            else None
        )

        attendance_by_class = list(
            att_qs.values("school_class__name")
            .annotate(
                total=Count("id"),
                present_or_late=Count("id", filter=Q(status__in=["present", "late"])),
            )
            .order_by("school_class__name")
        )
        for row in attendance_by_class:
            row["class_name"] = row.pop("school_class__name") or "Unassigned"
            row["rate"] = (
                round(row["present_or_late"] / row["total"] * 100, 1)
                if row["total"]
                else None
            )

        # ── Academic performance (this term/year) ───────────────────────────
        result_qs = Result.objects.filter(term=term, year=year)
        academic_agg = result_qs.aggregate(
            average_score=Avg("score"),
            total_results=Count("id"),
            passed=Count("id", filter=Q(score__gte=50)),
        )
        total_results = academic_agg["total_results"] or 0
        passed = academic_agg["passed"] or 0
        pass_rate = round(passed / total_results * 100, 1) if total_results else None

        academic_by_subject = list(
            result_qs.values("subject__name")
            .annotate(average_score=Avg("score"), count=Count("id"))
            .order_by("-average_score")
        )
        for row in academic_by_subject:
            row["subject_name"] = row.pop("subject__name") or "Unknown"
            if row["average_score"] is not None:
                row["average_score"] = round(row["average_score"], 1)

        # ── Fee collection (this term, optionally scoped to `year` via
        # created_at — same convention as fees/views.py delete_preview) ─────
        fee_qs = Fee.objects.filter(term=term, created_at__year=year)
        fee_agg = fee_qs.aggregate(
            total_billed=Sum("amount"),
            total_paid=Sum("paid"),
            total_balance=Sum("balance"),
            fully_paid=Count("id", filter=Q(balance__lte=0)),
            partial=Count("id", filter=Q(paid__gt=0, balance__gt=0)),
            unpaid=Count("id", filter=Q(paid=0)),
        )
        total_billed = fee_agg["total_billed"] or 0
        total_paid = fee_agg["total_paid"] or 0
        collection_rate = (
            round(float(total_paid) / float(total_billed) * 100, 1)
            if total_billed
            else None
        )

        # ── Recent activity (last 10 audit log entries, any module) ────────
        recent_activity = AuditLogSerializer(
            AuditLog.objects.all()[:10], many=True
        ).data

        return Response(
            {
                "term": term,
                "year": year,
                "account_status": {
                    "students": student_status,
                    "teachers": teacher_status,
                },
                "attendance": {
                    "total_records": attendance_total,
                    "rate": attendance_rate,
                    "by_class": attendance_by_class,
                },
                "academic": {
                    "average_score": (
                        round(academic_agg["average_score"], 1)
                        if academic_agg["average_score"] is not None
                        else None
                    ),
                    "total_results": total_results,
                    "pass_rate": pass_rate,
                    "by_subject": academic_by_subject,
                },
                "fees": {
                    "total_billed": total_billed,
                    "total_paid": total_paid,
                    "total_balance": fee_agg["total_balance"] or 0,
                    "collection_rate": collection_rate,
                    "fully_paid": fee_agg["fully_paid"] or 0,
                    "partial": fee_agg["partial"] or 0,
                    "unpaid": fee_agg["unpaid"] or 0,
                },
                "recent_activity": recent_activity,
            }
        )