from rest_framework.viewsets import ModelViewSet
from .models import Subject
from .serializers import SubjectSerializer


class SubjectViewSet(ModelViewSet):

    queryset = Subject.objects.all().order_by("name")
    serializer_class = SubjectSerializer