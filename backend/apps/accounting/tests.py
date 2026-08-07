from django.test import SimpleTestCase

from .permissions import CanRequestPettyCash, IsFinanceStaff


class AccountingPermissionsImportTests(SimpleTestCase):
    def test_permissions_classes_are_available(self):
        self.assertTrue(callable(CanRequestPettyCash))
        self.assertTrue(callable(IsFinanceStaff))
