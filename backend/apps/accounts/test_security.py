from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.classes.models import SchoolClass
from apps.fees.models import Fee, PaymentTransaction
from apps.students.models import Student

User = get_user_model()


class RoleAccessTests(TestCase):
    """Guards the access rules introduced in the security pass."""

    def setUp(self):
        self.cls = SchoolClass.objects.create(name="Basic 1", level="basic_1_6")
        self.admin = User.objects.create_user("adm", password="x", role="admin")
        self.teacher = User.objects.create_user("tch", password="x", role="teacher")
        self.u1 = User.objects.create_user("s1", password="x", role="student")
        self.u2 = User.objects.create_user("s2", password="x", role="student")
        self.s1 = Student.objects.create(user=self.u1, admission_number="A1", first_name="A", last_name="One", school_class=self.cls)
        self.s2 = Student.objects.create(user=self.u2, admission_number="A2", first_name="B", last_name="Two", school_class=self.cls)
        self.fee1 = Fee.objects.create(student=self.s1, term="term1", amount=Decimal("100"))
        self.fee2 = Fee.objects.create(student=self.s2, term="term1", amount=Decimal("100"))

    def client_for(self, user=None):
        c = APIClient()
        if user:
            c.force_authenticate(user)
        return c

    def test_anonymous_is_blocked_everywhere(self):
        c = self.client_for()
        for url in ["/api/students/", "/api/teachers/", "/api/classes/", "/api/subjects/",
                    "/api/announcements/", "/api/admissions/", "/api/fees/", "/api/dashboard/"]:
            self.assertEqual(c.get(url).status_code, 401, url)

    def test_student_sees_only_self_and_own_fees(self):
        c = self.client_for(self.u1)
        data = c.get("/api/students/").data
        data = data["results"] if isinstance(data, dict) else data
        ids = [r["id"] for r in data]
        self.assertEqual(ids, [self.s1.id])
        fees = c.get("/api/fees/").data
        fees = fees["results"] if isinstance(fees, dict) else fees
        self.assertEqual([f["id"] for f in fees], [self.fee1.id])
        self.assertEqual(c.get(f"/api/fees/{self.fee2.id}/").status_code, 404)

    def test_student_cannot_write_or_read_admin_areas(self):
        c = self.client_for(self.u1)
        self.assertEqual(c.delete(f"/api/students/{self.s2.id}/").status_code, 403)
        self.assertEqual(c.post("/api/classes/", {"name": "X"}).status_code, 403)
        self.assertEqual(c.get("/api/dashboard/").status_code, 403)
        self.assertEqual(c.get("/api/accounts/dashboard/").status_code, 403)
        self.assertEqual(c.get(f"/api/report/student/{self.s2.id}/?term=term1").status_code, 403)
        self.assertEqual(c.get(f"/api/fees/bill/student/{self.s2.id}/?term=term1").status_code, 403)

    def test_student_can_read_classes(self):
        self.assertEqual(self.client_for(self.u1).get("/api/classes/").status_code, 200)

    def test_student_pay_requires_paystack_reference(self):
        c = self.client_for(self.u1)
        r = c.post(f"/api/fees/{self.fee1.id}/pay/", {"amount": "50", "note": "free money"}, format="json")
        self.assertEqual(r.status_code, 403)
        self.fee1.refresh_from_db()
        self.assertEqual(self.fee1.paid, 0)

    @override_settings(PAYSTACK_SECRET_KEY="sk_test")
    @patch("api.views.fee_view.verify_paystack_reference")
    def test_student_pay_credits_only_verified_amount_once(self, verify):
        verify.return_value = (Decimal("30"), None)
        c = self.client_for(self.u1)
        body = {"amount": "50", "note": "Paystack ref: REF123"}
        self.assertEqual(c.post(f"/api/fees/{self.fee1.id}/pay/", body, format="json").status_code, 200)
        self.fee1.refresh_from_db()
        self.assertEqual(self.fee1.paid, Decimal("30"))
        c.post(f"/api/fees/{self.fee1.id}/pay/", body, format="json")  # replay
        self.assertEqual(PaymentTransaction.objects.filter(fee=self.fee1).count(), 1)

    def test_student_cannot_pay_someone_elses_fee(self):
        c = self.client_for(self.u1)
        r = c.post(f"/api/fees/{self.fee2.id}/pay/", {"amount": "5", "note": "Paystack ref: Z"}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_teacher_cannot_see_fees(self):
        self.assertEqual(self.client_for(self.teacher).get("/api/fees/").status_code, 403)

    def test_webhook_rejected_without_secret(self):
        with override_settings(PAYSTACK_SECRET_KEY=""):
            r = APIClient().post("/api/webhooks/paystack/", {"event": "charge.success"}, format="json")
        self.assertEqual(r.status_code, 503)
        r = APIClient().post("/api/api/webhooks/paystack/", {"event": "charge.success"}, format="json")
        self.assertIn(r.status_code, (503, 400))

    def test_admin_can_pay_and_overpay_is_blocked(self):
        c = self.client_for(self.admin)
        self.assertEqual(c.post(f"/api/fees/{self.fee1.id}/pay/", {"amount": "40"}, format="json").status_code, 200)
        self.assertEqual(c.post(f"/api/fees/{self.fee1.id}/pay/", {"amount": "500"}, format="json").status_code, 400)
        self.fee1.refresh_from_db()
        self.assertEqual(self.fee1.paid, Decimal("40"))
