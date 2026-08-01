from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.classes.models import SchoolClass
from apps.students.models import Student


class StudentAdminSearchTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="admin", password="pass")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.school_class = SchoolClass.objects.create(name="JSS 1", level="basic_7_9")
        self.student1 = Student.objects.create(
            user=get_user_model().objects.create_user(username="student1", password="pass"),
            admission_number="AD001",
            first_name="Jane",
            last_name="Doe",
            school_class=self.school_class,
        )
        self.student2 = Student.objects.create(
            user=get_user_model().objects.create_user(username="student2", password="pass"),
            admission_number="AD002",
            first_name="John",
            last_name="Smith",
            school_class=self.school_class,
        )

    def _get_results(self, response):
        data = response.data
        if isinstance(data, dict):
            return data.get("results", data.get("data", []))
        return data

    def test_search_by_name(self):
        response = self.client.get("/api/students/", {"search": "Jane"})
        self.assertEqual(response.status_code, 200)
        results = self._get_results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["admission_number"], "AD001")

    def test_search_by_admission_number(self):
        response = self.client.get("/api/students/", {"search": "AD002"})
        self.assertEqual(response.status_code, 200)
        results = self._get_results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["first_name"], "John")
