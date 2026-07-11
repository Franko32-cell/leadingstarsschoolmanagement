# api/views/teacher_view.py
import secrets
import string

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter

from apps.teachers.models import Teacher
from api.serializers.teacher_serializer import TeacherSerializer


class TeacherFilter(FilterSet):
    school_class = CharFilter(field_name="school_class__id")
    subject      = CharFilter(field_name="subject__id")

    class Meta:
        model  = Teacher
        fields = ["school_class", "subject"]


class TeacherViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherSerializer
    filterset_class  = TeacherFilter
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields  = ["teacher_id", "hire_date"]
    ordering         = ["teacher_id"]

    def get_queryset(self):
        return (
            Teacher.objects
            .select_related("user", "subject", "school_class")
            .all()
        )

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        teacher = self.get_object()  # respects get_queryset + permissions

        alphabet     = string.ascii_letters + string.digits
        new_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        teacher.user.set_password(new_password)
        teacher.user.save(update_fields=["password"])

        return Response({"new_password": new_password})

    @action(detail=False, methods=["post"], url_path="bulk-reset-default")
    def bulk_reset_default(self, request):
        """
        TEMPORARY — one-time fix for teachers whose password no longer
        matches the default 'teacher123' (e.g. after an accidental
        reset-password call). Remove this action once confirmed fixed.
        """
        teacher_ids = request.data.get("teacher_ids", [])
        fixed = []
        for t in self.get_queryset().filter(teacher_id__in=teacher_ids):
            u = t.user
            if not u.check_password("teacher123"):
                u.set_password("teacher123")
                u.save(update_fields=["password"])
                fixed.append(t.teacher_id)
        return Response({"fixed": fixed})