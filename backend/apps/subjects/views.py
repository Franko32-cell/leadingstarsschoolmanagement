from rest_framework.viewsets import ModelViewSet
from .models import Subject
from .serializers import SubjectSerializer


class SubjectViewSet(ModelViewSet):

    queryset = Subject.objects.all().order_by("name")
    serializer_class = SubjectSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        school_class = self.request.query_params.get("school_class")
        if school_class:
            queryset = queryset.filter(school_class_id=school_class)
        return queryset