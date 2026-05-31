import re
import logging

from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.admissions.models import Admission
from api.serializers.admission_serializer import AdmissionSerializer
from apps.students.models import Student
from apps.classes.models import SchoolClass

User = get_user_model()
logger = logging.getLogger(__name__)


class AdmissionViewSet(ModelViewSet):
    queryset         = Admission.objects.select_related("applied_class").all().order_by("-application_date")
    serializer_class = AdmissionSerializer
    parser_classes   = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        """Log incoming files to confirm photo is arriving."""
        logger.info(f"[ADMISSION CREATE] FILES: {list(self.request.FILES.keys())}")
        instance = serializer.save()
        logger.info(f"[ADMISSION CREATE] Saved photo value: {instance.photo}")
        try:
            logger.info(f"[ADMISSION CREATE] Photo URL: {instance.photo.url if instance.photo else 'none'}")
        except Exception as e:
            logger.info(f"[ADMISSION CREATE] Photo URL error: {e}")

    # ── Helpers ───────────────────────────────────────────────

    def _generate_student_id(self):
        year     = timezone.now().year
        existing = User.objects.filter(
            username__startswith=f"LSA-{year}-"
        ).values_list("username", flat=True)
        max_number = 0
        for username in existing:
            numbers = re.findall(r"\d+$", username)
            if numbers:
                max_number = max(max_number, int(numbers[-1]))
        return f"LSA-{year}-{str(max_number + 1).zfill(4)}"

    def _resolve_class(self, admission):
        if not admission.applied_class_id:
            return None
        try:
            return SchoolClass.objects.get(id=admission.applied_class_id)
        except SchoolClass.DoesNotExist:
            return None

    def _copy_photo(self, admission):
        """
        Get the raw string value stored by CloudinaryField.
        CloudinaryField stores the public_id as a plain string in the DB.
        We assign this string directly to the student's CloudinaryField.
        """
        try:
            admission.refresh_from_db()
            # Get the raw DB value — the public_id string
            raw = Admission.objects.filter(pk=admission.pk).values_list("photo", flat=True).first()
            logger.info(f"[PHOTO COPY] Raw DB photo value: {raw}")
            return raw if raw else None
        except Exception as e:
            logger.error(f"[PHOTO COPY] Error: {e}")
            return None

    # ── Write hooks ───────────────────────────────────────────

    def perform_update(self, serializer):
        admission = serializer.save()
        logger.info(f"Admission updated: id={admission.id} status={admission.status}")

        if admission.status != "approved":
            return

        if Student.objects.filter(user__email=admission.email).exists():
            logger.info(f"Student already exists for {admission.email}, skipping.")
            return

        try:
            student_id   = self._generate_student_id()
            school_class = self._resolve_class(admission)

            first_name = admission.first_name or admission.student_name.split(" ", 1)[0]
            last_name  = (
                admission.last_name
                or (admission.student_name.split(" ", 1)[1]
                    if " " in admission.student_name else "")
            )

            user = User.objects.create_user(
                username=student_id,
                email=admission.email,
                password="student123",
                first_name=first_name,
                last_name=last_name,
                role="student",
            )

            # Get raw public_id string from DB
            photo_value = self._copy_photo(admission)
            logger.info(f"Photo value to assign to student: {photo_value}")

            student = Student.objects.create(
                user=user,
                admission_number=student_id,
                student_name=f"{first_name} {last_name}".strip(),
                parent_name=admission.parent_name,
                date_of_birth=admission.date_of_birth,
                address=admission.address,
                school_class=school_class,
                photo=photo_value,
            )

            admission.admission_number = student_id
            admission.save(update_fields=["admission_number"])

            logger.info(f"Student created: {student.student_name} id={student_id} photo={photo_value}")

        except Exception as exc:
            logger.error(f"Student creation failed: {exc}")
            raise
