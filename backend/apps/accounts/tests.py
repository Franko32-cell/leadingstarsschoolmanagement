from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.accounts.services import set_account_status, reset_password as reset_user_password
from apps.classes.models import SchoolClass
from apps.subjects.models import Subject
from apps.teachers.models import Teacher


@override_settings(SECURE_SSL_REDIRECT=False)
class LoginViewTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.teacher_user = self.user_model.objects.create_user(
            username="teacher-user",
            password="teacher123",
            role="teacher",
            is_active=True,
        )
        self.teacher_user.is_approved = True
        self.teacher_user.save(update_fields=["is_approved"])

        self.school_class = SchoolClass.objects.create(name="JSS 1")
        self.subject = Subject.objects.create(name="Mathematics", school_class=self.school_class)
        self.teacher = Teacher.objects.create(
            teacher_id="LSAT-0001",
            user=self.teacher_user,
            school_class=self.school_class,
            subject=self.subject,
        )

    def test_teacher_can_login_with_teacher_id_and_whitespace(self):
        response = self.client.post(
            reverse("login"),
            {"username": " LSAT-0001 ", "password": "teacher123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], "teacher")
        self.assertEqual(response.data["user"]["teacher_id"], "LSAT-0001")


class AccountStatusServiceTests(TestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.admin_user = self.user_model.objects.create_user(
            username="adminuser",
            password="testpass123",
            role="admin",
            is_active=True,
            is_approved=True,
        )
        self.target_user = self.user_model.objects.create_user(
            username="targetuser",
            password="oldpass123",
            role="student",
            is_active=True,
        )
        self.factory = RequestFactory()

    def test_set_account_status_updates_user_and_creates_audit_log(self):
        request = self.factory.get("/api/test/")
        request.user = self.admin_user

        set_account_status(
            self.target_user,
            "suspended",
            request=request,
            module=AuditLog.Module.ACCOUNTS,
            resource_type="User",
            resource_label=self.target_user.username,
        )

        self.target_user.refresh_from_db()
        self.assertEqual(self.target_user.account_status, "suspended")
        self.assertFalse(self.target_user.is_active)

        audit = AuditLog.objects.get(action=AuditLog.Action.USER_SUSPENDED)
        self.assertEqual(audit.user, self.admin_user)
        self.assertEqual(audit.resource_type, "User")
        self.assertEqual(audit.resource_repr, f"User: {self.target_user.username}")
        self.assertEqual(audit.previous_value, {"account_status": "active"})
        self.assertEqual(audit.new_value, {"account_status": "suspended"})

    def test_reset_password_changes_password_and_creates_audit_log(self):
        request = self.factory.get("/api/reset/")
        request.user = self.admin_user

        reset_user_password(
            self.target_user,
            request=request,
            module=AuditLog.Module.ACCOUNTS,
            resource_type="User",
            resource_label=self.target_user.username,
            new_password="newpass123",
        )

        self.target_user.refresh_from_db()
        self.assertTrue(self.target_user.check_password("newpass123"))

        audit = AuditLog.objects.get(action=AuditLog.Action.PASSWORD_RESET)
        self.assertEqual(audit.user, self.admin_user)
        self.assertEqual(audit.resource_type, "User")
        self.assertEqual(audit.resource_repr, f"User: {self.target_user.username}")
