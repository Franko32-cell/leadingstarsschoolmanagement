from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

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
