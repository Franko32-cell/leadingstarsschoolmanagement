# apps/attendance/views.py  (or wherever AttendanceViewSet lives)

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.attendance.models import Attendance
from api.serializers.attendance_serializer import AttendanceSerializer


class AttendanceViewSet(ModelViewSet):

    queryset           = Attendance.objects.all().order_by("-date")
    serializer_class   = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        student      = params.get("student")
        school_class = params.get("school_class")
        term         = params.get("term")
        date         = params.get("date")

        if student:      qs = qs.filter(student_id=student)
        if school_class: qs = qs.filter(school_class_id=school_class)
        if term:         qs = qs.filter(term=term)
        if date:         qs = qs.filter(date=date)

        return qs

    def create(self, request, *args, **kwargs):
        student      = request.data.get("student")
        date         = request.data.get("date")
        term         = request.data.get("term")
        school_class = request.data.get("school_class")
        status_val   = request.data.get("status")

        if not all([student, date, term, school_class, status_val]):
            return Response(
                {"error": "student, date, term, school_class and status are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attendance, created = Attendance.objects.get_or_create(
            student_id=student,
            date=date,
            defaults={
                "school_class_id": school_class,
                "term":            term,
                "status":          status_val,
            },
        )

        if not created:
            attendance.status        = status_val
            attendance.school_class_id = school_class
            attendance.term          = term
            attendance.save()

        serializer = self.get_serializer(attendance)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )