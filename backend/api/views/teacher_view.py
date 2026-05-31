# api/views/teacher_view.py
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter
from apps.teachers.models import Teacher
from api.serializers.teacher_serializer import TeacherSerializer


class TeacherFilter(FilterSet):
    """
    Enables filtering via query params:
      ?school_class=3
      ?subject=7
    """
    school_class = CharFilter(field_name="school_class__id")
    subject      = CharFilter(field_name="subject__id")

    class Meta:
        model  = Teacher
        fields = ["school_class", "subject"]


class TeacherViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoint for Teacher records.

    Fixes applied
    -------------
    BUG 1 — No filtering: the original viewset returned every teacher in the
            database regardless of query params. TeacherFilter wires up
            ?school_class= and ?subject= so callers can scope the list.

    BUG 2 — N+1 queries: without select_related, accessing teacher.user,
            teacher.subject, or teacher.school_class inside the serializer
            fired an extra DB query per row. select_related collapses those
            into a single JOIN.

    Note: authentication and pagination are provided globally via settings.py
    (DEFAULT_PERMISSION_CLASSES and DEFAULT_PAGINATION_CLASS).
    """

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
