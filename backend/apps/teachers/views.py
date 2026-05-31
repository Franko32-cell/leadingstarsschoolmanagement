import random
from rest_framework.viewsets import ModelViewSet
from django.contrib.auth import get_user_model

from .models import Teacher
from .serializers import TeacherSerializer

User = get_user_model()


class TeacherViewSet(ModelViewSet):

    queryset = Teacher.objects.all().order_by("-id")
    serializer_class = TeacherSerializer

    def generate_teacher_id(self):

        last_teacher = Teacher.objects.order_by("-id").first()

        if last_teacher and last_teacher.teacher_id:

            try:
                last_number = int(last_teacher.teacher_id.split("-")[-1])
            except:
                last_number = 0

            new_number = last_number + 1

        else:
            new_number = 1

        return f"LSAT-{str(new_number).zfill(4)}"

    def perform_create(self, serializer):

        teacher_id = self.generate_teacher_id()

        password = "teacher123"

        user = User.objects.create_user(
    username=teacher_id,
    password=password,
    role="teacher",
    is_active=True,
    is_approved=True,
)

        serializer.save(
            teacher_id=teacher_id,
            user=user
        )

        print("Teacher Login Credentials")
        print("Teacher ID:", teacher_id)
        print("Password:", password)