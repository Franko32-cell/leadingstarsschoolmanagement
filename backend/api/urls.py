from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# View Imports
from api.views.student_view import StudentViewSet
from api.views.teacher_view import TeacherViewSet
from api.views.class_view import ClassViewSet
from api.views.subject_view import SubjectViewSet
from api.views.attendance_view import AttendanceViewSet
from api.views.result_view import ResultViewSet
from api.views.fee_view import FeeViewSet, paystack_webhook
from api.views.character_assessment_view import CharacterAssessmentViewSet
from api.views.announcement_view import AnnouncementViewSet
from api.views.admission_view import AdmissionViewSet
from api.views.dashboard_view import DashboardView
from api.views.auth_view import (
    RegisterView,
    MeView,
    LoginView,
    AdminApprovalViewSet,
    ChangePasswordView,
)
from api.views.report_view import StudentReportView
from api.views.report_pdf_view import StudentReportPDFView
from api.views.bill_pdf_view import StudentFeeBillPDFView, ClassFeeBillPDFView
from api.views.receipt_pdf_view import PaymentReceiptPDFView
from api.views.admission_form_pdf_view import AdmissionFormPDFView
from api.views.accounts_view import (
    AccountsDashboardView,
    IncomeLedgerView,
    FeeCollectionReportView,
    DefaultersListView,
)
from api.views.active_users_view import ActiveUsersView

# --- Router Setup ---
router = DefaultRouter()
router.register("students", StudentViewSet)
router.register("teachers", TeacherViewSet, basename="teacher")
router.register("classes", ClassViewSet)
router.register("subjects", SubjectViewSet)
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("results", ResultViewSet)
router.register("character-assessment", CharacterAssessmentViewSet, basename="character-assessment")
router.register(r"fees", FeeViewSet, basename="fees")
router.register("announcements", AnnouncementViewSet)
router.register("admissions", AdmissionViewSet)
router.register("admin-approvals", AdminApprovalViewSet, basename="admin-approvals")

# --- URL Patterns ---
urlpatterns = [
    # 1. Custom ViewSet Actions (Must be defined BEFORE router.urls)
    path("results/bulk/", ResultViewSet.as_view({"post": "bulk_save"}), name="results-bulk"),

    # 2. PDF & Document Views
    path("admissions/<int:admission_id>/form/", AdmissionFormPDFView.as_view(), name="admission-form-pdf"),
    path("fees/bill/student/<int:student_id>/", StudentFeeBillPDFView.as_view(), name="student-bill-pdf"),
    path("fees/bill/class/", ClassFeeBillPDFView.as_view(), name="class-bill-pdf"),
    path("fees/receipt/<int:transaction_id>/", PaymentReceiptPDFView.as_view(), name="payment-receipt-pdf"),
    path("report/student/<int:student_id>/", StudentReportView.as_view(), name="student-report"),
    path("report/student/<int:student_id>/pdf/", StudentReportPDFView.as_view(), name="student-report-pdf"),

    # 3. Webhooks
    path("api/webhooks/paystack/", paystack_webhook, name="paystack-webhook"),

    # 4. Authentication
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/me/", MeView.as_view(), name="user-me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),

    # 5. Dashboards & Reports
    path("dashboard/", DashboardView.as_view(), name="main-dashboard"),
    path("accounts/dashboard/", AccountsDashboardView.as_view(), name="accounts-dashboard"),
    path("accounts/ledger/", IncomeLedgerView.as_view(), name="income-ledger"),
    path("accounts/collection/", FeeCollectionReportView.as_view(), name="fee-collection"),
    path("accounts/defaulters/", DefaultersListView.as_view(), name="fee-defaulters"),
    path("accounts/active-users/", ActiveUsersView.as_view(), name="active-users"),

    # 6. Router-generated URLs
    path("", include(router.urls)),
]
