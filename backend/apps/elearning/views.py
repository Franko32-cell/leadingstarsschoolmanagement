from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.students.models import Student
from apps.teachers.models import Teacher

from .models import Assignment, Lesson, Submission
from .serializers import AssignmentSerializer, LessonSerializer, SubmissionSerializer


class ContentPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role != "student" or request.method in {"GET", "HEAD", "OPTIONS"}


class SubmissionPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == "student":
            return request.method in {"GET", "HEAD", "OPTIONS", "POST", "PATCH"}
        return request.user.role in {"teacher", "admin"} or request.user.is_superuser


class ElearningViewSetMixin:
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _role(self):
        return getattr(self.request.user, "role", None)

    def _teacher(self):
        return Teacher.objects.filter(user=self.request.user).select_related("school_class").first()

    def _student(self):
        return Student.objects.filter(user=self.request.user).select_related("school_class").first()

    def _is_admin(self):
        return self._role() == "admin" or self.request.user.is_superuser


class ContentViewSet(ElearningViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [ContentPermission]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if self._role() == "teacher":
            teacher = self._teacher()
            if not teacher or not teacher.school_class_id:
                return Response(
                    {"detail": "Your teacher profile is not assigned to a class."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            data["school_class"] = teacher.school_class_id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = self.queryset.select_related("school_class", "subject", "teacher__user")
        role = self._role()
        if role == "student":
            student = self._student()
            queryset = queryset.filter(school_class_id=student.school_class_id) if student and student.school_class_id else queryset.none()
        elif role == "teacher" and (teacher := self._teacher()):
            queryset = queryset.filter(Q(teacher=teacher) | Q(school_class=teacher.school_class))
        elif not self._is_admin():
            queryset = queryset.none()
        return self._filter_queryset(queryset)

    def _filter_queryset(self, queryset):
        for field in ("school_class", "subject", "term", "year"):
            value = self.request.query_params.get(field)
            if value:
                lookup = f"{field}_id" if field in ("school_class", "subject") else field
                queryset = queryset.filter(**{lookup: value})
        return queryset

    def _assign_context(self, serializer):
        if self._is_admin():
            serializer.save()
            return
        teacher = self._teacher()
        if not teacher or not teacher.school_class_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Your teacher profile is not assigned to a class.")
        serializer.save(teacher=teacher, school_class=teacher.school_class)

    def perform_create(self, serializer):
        self._assign_context(serializer)

    def perform_update(self, serializer):
        self._assign_context(serializer)


class LessonViewSet(ContentViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer


class AssignmentViewSet(ContentViewSet):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer


class SubmissionViewSet(ElearningViewSetMixin, viewsets.ModelViewSet):
    queryset = Submission.objects.select_related("assignment", "student", "student__user")
    serializer_class = SubmissionSerializer
    permission_classes = [SubmissionPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self._role()
        if role == "student":
            student = self._student()
            queryset = queryset.filter(student=student) if student else queryset.none()
        elif role == "teacher":
            teacher = self._teacher()
            queryset = queryset.filter(assignment__teacher=teacher) if teacher else queryset.none()
        elif not self._is_admin():
            queryset = queryset.none()
        assignment = self.request.query_params.get("assignment")
        student = self.request.query_params.get("student")
        if assignment:
            queryset = queryset.filter(assignment_id=assignment)
        if student and self._is_admin():
            queryset = queryset.filter(student_id=student)
        return queryset

    def create(self, request, *args, **kwargs):
        if self._role() != "student" and not self._is_admin():
            return Response({"detail": "Only students can submit assignments."}, status=status.HTTP_403_FORBIDDEN)
        student = self._student()
        if not student:
            return Response({"detail": "Student profile not found."}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data["student"] = student.id
        assignment = Assignment.objects.filter(pk=data.get("assignment")).first()
        if not assignment or assignment.school_class_id != student.school_class_id:
            return Response({"detail": "Assignment is not available to this student."}, status=status.HTTP_400_BAD_REQUEST)
        existing = Submission.objects.filter(assignment=assignment, student=student).first()
        if existing:
            data["assignment"] = existing.assignment_id
            serializer = self.get_serializer(existing, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(student=student)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        if self._role() == "student":
            serializer.save(
                assignment=serializer.instance.assignment,
                student=serializer.instance.student,
                score=serializer.instance.score,
                feedback=serializer.instance.feedback,
            )
        else:
            serializer.save()
