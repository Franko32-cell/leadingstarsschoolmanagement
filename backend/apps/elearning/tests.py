from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.classes.models import SchoolClass
from apps.teachers.models import Teacher


class ElearningAppTests(SimpleTestCase):
    def test_app_is_loaded(self):
        from django.apps import apps

        self.assertTrue(apps.is_installed("apps.elearning"))


class TeacherElearningApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="teacher-elearning-test", password="test-password", role="teacher"
        )
        self.school_class = SchoolClass.objects.create(name="Basic 5", level="basic_1_6")
        self.teacher = Teacher.objects.create(
            user=self.user, teacher_id="EL-TEST-001", school_class=self.school_class
        )
        self.client.force_authenticate(self.user)

    def test_teacher_can_create_assignment_without_school_class(self):
        response = self.client.post(reverse("assignment-list"), {
            "title": "Fractions worksheet",
            "instructions": "Complete questions 1 to 10.",
            "due_date": (timezone.now() + timedelta(days=2)).isoformat(),
            "max_score": 20,
            "term": "term1",
            "year": 2026,
        }, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["school_class"], self.school_class.id)
        self.assertEqual(response.data["teacher"], self.teacher.id)