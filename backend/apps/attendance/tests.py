from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.accounts.models import User
from apps.attendance.models import Attendance, SchoolCalendar
from apps.classes.models import SchoolClass
from apps.students.models import Student
from api.serializers.attendance_serializer import AttendanceSerializer


class AttendanceHolidayValidationTests(TestCase):
    def setUp(self):
        self.school_class = SchoolClass.objects.create(name="JHS 2", section="A")
        self.user = User.objects.create_user(
            username="student1",
            email="student1@example.com",
            password="pass12345",
            role="student",
        )
        self.student = Student.objects.create(
            user=self.user,
            admission_number="ADM-001",
            student_name="John Doe",
            first_name="John",
            last_name="Doe",
            school_class=self.school_class,
        )
        self.calendar = SchoolCalendar.objects.create(
            name="Mid-Term Break",
            event_type="holiday",
            year=2026,
            term="term1",
            start_date=date(2026, 9, 15),
            end_date=date(2026, 9, 16),
            description="School closed for mid-term break.",
            is_school_day=False,
        )

    def test_serializer_rejects_attendance_on_non_school_day(self):
        serializer = AttendanceSerializer(
            data={
                "student": self.student.id,
                "school_class": self.school_class.id,
                "date": "2026-09-15",
                "status": "present",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non-school day", str(serializer.errors).lower())

    def test_model_clean_rejects_non_school_day_date(self):
        record = Attendance(
            student=self.student,
            school_class=self.school_class,
            date=date(2026, 9, 15),
            status="present",
            term="term1",
            year=2026,
        )

        with self.assertRaises(ValidationError):
            record.full_clean()
