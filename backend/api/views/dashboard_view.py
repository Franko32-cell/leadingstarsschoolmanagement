from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.students.models import Student
from apps.teachers.models import Teacher
from apps.classes.models import SchoolClass
from apps.subjects.models import Subject
from apps.announcements.models import Announcement
from apps.admissions.models import Admission


class DashboardView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        data = {
            "total_students": Student.objects.count(),
            "total_teachers": Teacher.objects.count(),
            "total_classes": SchoolClass.objects.count(),
            "total_subjects": Subject.objects.count(),
            "total_announcements": Announcement.objects.count(),

            # Admissions stats
            "pending_admissions": Admission.objects.filter(status="pending").count(),
            "approved_admissions": Admission.objects.filter(status="approved").count(),
        }

        return Response(data)