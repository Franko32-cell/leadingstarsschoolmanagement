from django.test import SimpleTestCase


class ElearningAppTests(SimpleTestCase):
    def test_app_is_loaded(self):
        from django.apps import apps

        self.assertTrue(apps.is_installed("apps.elearning"))