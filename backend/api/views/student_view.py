from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.students.models import Student
from api.serializers.student_serializer import StudentSerializer


class StudentViewSet(ModelViewSet):
    queryset         = Student.objects.select_related("user", "school_class").all()
    serializer_class = StudentSerializer
    parser_classes   = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        school_class     = self.request.query_params.get("school_class")
        admission_number = self.request.query_params.get("admission_number")
        if school_class:
            queryset = queryset.filter(school_class_id=school_class)
        if admission_number:
            queryset = queryset.filter(admission_number__iexact=admission_number)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
