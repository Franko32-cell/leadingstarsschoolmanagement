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
