from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.classes.models import SchoolClass

from .models import Subject


class SubjectClassFilterApiTests(APITestCase):
    def test_subjects_can_be_filtered_by_school_class(self):
        user = get_user_model().objects.create_user(
            username="subject-filter-test", password="test-password", role="admin"
        )
        first_class = SchoolClass.objects.create(name="Basic 4", level="basic_1_6")
        second_class = SchoolClass.objects.create(name="Basic 5", level="basic_1_6")
        first_subject = Subject.objects.create(name="Mathematics", school_class=first_class)
        Subject.objects.create(name="English", school_class=second_class)
        self.client.force_authenticate(user)

        response = self.client.get(reverse("subject-list"), {"school_class": first_class.id})

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [first_subject.id])
