from rest_framework import viewsets
from apps.subjects.models import Subject
from api.serializers.subject_serializer import SubjectSerializer


class SubjectViewSet(viewsets.ModelViewSet):

    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer