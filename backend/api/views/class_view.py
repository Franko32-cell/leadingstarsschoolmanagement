from rest_framework import viewsets
from apps.classes.models import SchoolClass
from api.serializers.class_serializer import ClassSerializer


class ClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all()
    serializer_class = ClassSerializer