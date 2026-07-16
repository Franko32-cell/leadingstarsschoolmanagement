from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_login_failed
from django.test import TestCase, RequestFactory

from apps.audit.models import AuditLog
from apps.audit.services import log_action

User = get_user_model()


class AuditLogTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="audituser",
            email="audit@example.com",
            password="testpass123",
            role="admin",
            is_active=True,
            is_approved=True,
        )
        self.factory = RequestFactory()

    def test_log_action_creates_audit_record(self):
        request = self.factory.get("/api/test/")
        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "pytest-agent"

        log_action(
            request=request,
            user=self.user,
            action=AuditLog.Action.CREATE,
            module=AuditLog.Module.SYSTEM,
            status=AuditLog.Status.SUCCESS,
            resource_type="student",
            resource_id="123",
            resource_repr="Test Student",
            description="Test event",
        )

        audit = AuditLog.objects.get(action=AuditLog.Action.CREATE)
        self.assertEqual(audit.user, self.user)
        self.assertEqual(audit.resource_type, "student")
        self.assertEqual(audit.resource_id, "123")
        self.assertEqual(audit.resource_repr, "Test Student")
        self.assertEqual(audit.ip_address, "127.0.0.1")
        self.assertEqual(audit.user_agent, "pytest-agent")
        self.assertEqual(audit.description, "Test event")
        self.assertEqual(audit.actor_username, "audituser")
        self.assertEqual(audit.actor_role, "admin")

    def test_user_login_failed_signal_creates_audit_record(self):
        fake_request = SimpleNamespace(META={
            "REMOTE_ADDR": "10.0.0.5",
            "HTTP_USER_AGENT": "failed-agent",
        })

        user_login_failed.send(
            sender=User,
            credentials={"username": "nonexistent"},
            request=fake_request,
        )

        audit = AuditLog.objects.get(action=AuditLog.Action.LOGIN_FAILED)
        self.assertIsNone(audit.user)
        self.assertEqual(audit.ip_address, "10.0.0.5")
        self.assertEqual(audit.user_agent, "failed-agent")
        self.assertIn("nonexistent", audit.resource_repr)
        self.assertEqual(audit.description, "Invalid credentials")
        self.assertEqual(audit.module, AuditLog.Module.AUTH)
        self.assertEqual(audit.status, AuditLog.Status.FAILED)
