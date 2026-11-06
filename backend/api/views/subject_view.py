from rest_framework import viewsets
from api.permissions.role_permissions import IsAdminOrReadOnly
from apps.subjects.models import Subject
from api.serializers.subject_serializer import SubjectSerializer


class SubjectViewSet(viewsets.ModelViewSet):

    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    pagination_class = None
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        school_class = self.request.query_params.get("school_class")
        if school_class:
            queryset = queryset.filter(school_class_id=school_class)
        return queryset
