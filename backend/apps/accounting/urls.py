from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AccountViewSet, JournalEntryViewSet, TrialBalanceView

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="accounts")
router.register("journal-entries", JournalEntryViewSet, basename="journal-entries")

urlpatterns = [
    path("", include(router.urls)),
    path("trial-balance/", TrialBalanceView.as_view(), name="trial-balance"),
]
# ─────────────────────────────────────────────────────────────────────────
# PETTY CASH — merge into apps/accounting/urls.py
#
# I don't have your current urls.py, so this is written as a self-contained
# router registration. If you already use a DRF router (`router = DefaultRouter()`
# etc.) in that file, just add these two `.register(...)` lines to it and
# add `petty_cash_report_urlpatterns` into your existing `urlpatterns` list
# instead of duplicating the router setup below.
# ─────────────────────────────────────────────────────────────────────────

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PettyCashFloatViewSet, PettyCashTransactionViewSet,
    PettyCashOutstandingClaimsView, PettyCashDailySummaryView, PettyCashMonthlySummaryView,
)

petty_cash_router = DefaultRouter()
petty_cash_router.register(r"petty-cash/floats", PettyCashFloatViewSet, basename="petty-cash-float")
petty_cash_router.register(r"petty-cash/transactions", PettyCashTransactionViewSet, basename="petty-cash-transaction")

petty_cash_report_urlpatterns = [
    path("petty-cash/reports/outstanding/", PettyCashOutstandingClaimsView.as_view(), name="petty-cash-outstanding"),
    path("petty-cash/reports/daily/", PettyCashDailySummaryView.as_view(), name="petty-cash-daily"),
    path("petty-cash/reports/monthly/", PettyCashMonthlySummaryView.as_view(), name="petty-cash-monthly"),
]

# urlpatterns = [
#     ...your existing patterns...,
#     *petty_cash_router.urls,
#     *petty_cash_report_urlpatterns,
# ]

# Resulting endpoints (assuming this app is mounted at /api/accounting/,
# matching the accountService.jsx calls you already have):
#   GET/POST        /api/accounting/petty-cash/floats/
#   GET              /api/accounting/petty-cash/floats/{id}/
#   POST             /api/accounting/petty-cash/floats/{id}/close/
#   GET              /api/accounting/petty-cash/floats/{id}/reconciliation/?as_of=YYYY-MM-DD
#   GET/POST        /api/accounting/petty-cash/transactions/?float=&status=
#   GET              /api/accounting/petty-cash/transactions/{id}/
#   POST             /api/accounting/petty-cash/transactions/{id}/approve/
#   POST             /api/accounting/petty-cash/transactions/{id}/reject/    body: {"reason": "..."}
#   POST             /api/accounting/petty-cash/transactions/{id}/pay/
#   GET              /api/accounting/petty-cash/reports/outstanding/?float=
#   GET              /api/accounting/petty-cash/reports/daily/?date=YYYY-MM-DD&float=&export=csv
#   GET              /api/accounting/petty-cash/reports/monthly/?year=&month=&float=&export=csv