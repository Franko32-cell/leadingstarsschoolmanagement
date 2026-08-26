from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.classes.models import SchoolClass
from apps.students.models import Student
from apps.subjects.models import Subject
from apps.results.models import Result
from apps.attendance.models import Attendance
from apps.results.whatsapp import normalize_gh_phone, send_whatsapp_report
from unittest.mock import patch
from io import BytesIO


class ResultsApiTests(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user(username="tester", password="pass")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.school_class = SchoolClass.objects.create(name="JSS 1", level="basic_7_9")
        self.subject = Subject.objects.create(name="Mathematics", school_class=self.school_class)
        self.student = Student.objects.create(
            user=self.user,
            admission_number="AD001",
            first_name="Jane",
            last_name="Doe",
            school_class=self.school_class,
        )

    def test_normalize_gh_phone(self):
        self.assertEqual(normalize_gh_phone("0241234567"), "233241234567")
        self.assertEqual(normalize_gh_phone("+233241234567"), "233241234567")
        self.assertEqual(normalize_gh_phone("233241234567"), "233241234567")
        self.assertIsNone(normalize_gh_phone("024123"))

    def test_send_whatsapp_report_skips_missing_or_invalid_phone(self):
        self.assertEqual(send_whatsapp_report(self.student, BytesIO(b"pdf"), "Report")["reason"], "no_phone")
        self.student.parent_phone = "not-a-phone"
        self.student.save(update_fields=["parent_phone"])
        self.assertEqual(send_whatsapp_report(self.student, BytesIO(b"pdf"), "Report")["reason"], "invalid_phone")

    @patch("apps.results.whatsapp._upload_pdf", return_value="https://res.cloudinary.com/test/report.pdf")
    @patch("apps.results.whatsapp.requests.post")
    def test_send_whatsapp_report_success_and_termii_error(self, post, _upload):
        self.student.parent_phone = "0241234567"
        self.student.save(update_fields=["parent_phone"])
        response = post.return_value
        response.status_code = 200
        response.text = "{}"
        response.json.return_value = {"message_id": "msg-1"}
        self.assertEqual(send_whatsapp_report(self.student, BytesIO(b"pdf"), "Report")["message_id"], "msg-1")
        response.status_code = 500
        self.assertEqual(send_whatsapp_report(self.student, BytesIO(b"pdf"), "Report")["reason"], "termii_error")

    def test_bulk_save_preserves_school_class_and_year(self):
        result = Result.objects.create(
            student=self.student,
            subject=self.subject,
            school_class=self.school_class,
            term="term3",
            year=settings.CURRENT_YEAR,
            reopen=5,
            ca=10,
            exams=15,
        )

        payload = [{
            "student": self.student.id,
            "subject": self.subject.id,
            "term": "term3",
            "reopen": 7,
        }]

        response = self.client.post("/api/results/bulk/", payload, format="json")
        self.assertEqual(response.status_code, 200)

        result.refresh_from_db()
        self.assertEqual(result.school_class_id, self.school_class.id)
        self.assertEqual(result.reopen, 7.0)
        self.assertEqual(result.ca, 10.0)
        self.assertEqual(result.exams, 15.0)
        self.assertEqual(result.year, settings.CURRENT_YEAR)

    def test_report_endpoint_filters_by_year(self):
        Result.objects.create(
            student=self.student,
            subject=self.subject,
            school_class=self.school_class,
            term="term3",
            year=settings.CURRENT_YEAR - 1,
            reopen=1,
            ca=1,
            exams=1,
        )
        Result.objects.create(
            student=self.student,
            subject=self.subject,
            school_class=self.school_class,
            term="term3",
            year=settings.CURRENT_YEAR,
            reopen=7,
            ca=8,
            exams=9,
        )
        Attendance.objects.create(
            student=self.student,
            school_class=self.school_class,
            term="term3",
            year=settings.CURRENT_YEAR,
            date="2026-05-20",
            status="present",
        )

        response = self.client.get(
            f"/api/report/student/{self.student.id}/",
            {"term": "term3", "year": settings.CURRENT_YEAR},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["year"], settings.CURRENT_YEAR)
        self.assertEqual(response.data["attendance_total"], 1)
        self.assertEqual(response.data["attendance"], 1)
        self.assertEqual(response.data["total_score"], 24.0)

    def test_report_endpoint_returns_position_and_summary(self):
        student2 = Student.objects.create(
            user=get_user_model().objects.create_user(username="tester2", password="pass"),
            admission_number="AD002",
            first_name="John",
            last_name="Smith",
            school_class=self.school_class,
        )
        Result.objects.create(
            student=self.student,
            subject=self.subject,
            school_class=self.school_class,
            term="term3",
            year=settings.CURRENT_YEAR,
            reopen=10,
            ca=10,
            exams=10,
        )
        Result.objects.create(
            student=student2,
            subject=self.subject,
            school_class=self.school_class,
            term="term3",
            year=settings.CURRENT_YEAR,
            reopen=5,
            ca=5,
            exams=5,
        )

        response = self.client.get(
            f"/api/report/student/{self.student.id}/",
            {"term": "term3", "year": settings.CURRENT_YEAR},
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["show_position"])
        self.assertIsNone(response.data["position"])
        self.assertEqual(response.data["position_formatted"], "N/A")
        self.assertEqual(response.data["subjects"][0]["subject_position"], "1st")
        self.assertEqual(response.data["out_of"], 2)
        self.assertEqual(response.data["average_score"], 30)
        self.assertEqual(response.data["overall_grade"], "9")
