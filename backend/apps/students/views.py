from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status

from .models import Student
from .serializers import StudentSerializer
from django.db import models

class StudentViewSet(ModelViewSet):
    serializer_class   = StudentSerializer
    permission_classes = [IsAuthenticated]
    parsers            = [MultiPartParser, FormParser, JSONParser]

    queryset = Student.objects.select_related("user", "school_class").all()

    # ── Filtering ──────────────────────────────────────────────
    def get_queryset(self):
        queryset = super().get_queryset()

        school_class = self.request.query_params.get("school_class")
        gender       = self.request.query_params.get("gender")
        search       = self.request.query_params.get("search")

        if school_class:
            try:
                queryset = queryset.filter(school_class_id=int(school_class))
            except ValueError:
                pass

        if gender:
            queryset = queryset.filter(gender=gender)

        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search)     |
                models.Q(last_name__icontains=search)      |
                models.Q(student_name__icontains=search)   |
                models.Q(admission_number__icontains=search)|
                models.Q(parent_name__icontains=search)
            )

        return queryset

    # ── PATCH — always partial ─────────────────────────────────
    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    # ── PUT — full update ──────────────────────────────────────
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()
