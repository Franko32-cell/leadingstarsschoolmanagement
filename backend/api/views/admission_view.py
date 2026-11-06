import re
import logging

from django.db import transaction, IntegrityError
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from api.permissions.role_permissions import IsAdmin
from apps.admissions.models import Admission
from api.serializers.admission_serializer import AdmissionSerializer
from apps.students.models import Student
from apps.classes.models import SchoolClass

# ── Audit logging ────────────────────────────────────────────────────────
from apps.audit.models import AuditLog
from apps.audit.services import log_action

User = get_user_model()
logger = logging.getLogger(__name__)

# Initial password given to newly admitted students (they are prompted to
# change it from the portal). Override with the env var if desired.
import os
DEFAULT_STUDENT_PASSWORD = os.environ.get("DEFAULT_STUDENT_PASSWORD", "student123")


class AdmissionViewSet(ModelViewSet):
    queryset         = Admission.objects.select_related("applied_class").all().order_by("-application_date")
    serializer_class = AdmissionSerializer
    permission_classes = [IsAdmin]
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

        log_action(
            request=self.request,
            action=AuditLog.Action.CREATE,
            module=AuditLog.Module.ADMISSIONS,
            resource_type="Admission",
            resource_id=instance.id,
            resource_repr=f"Admission application: {instance.student_name}",
        )

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
        previous_status = self.get_object().status
        admission = serializer.save()
        logger.info(f"Admission updated: id={admission.id} status={admission.status}")

        log_action(
            request=self.request,
            action=AuditLog.Action.UPDATE,
            module=AuditLog.Module.ADMISSIONS,
            resource_type="Admission",
            resource_id=admission.id,
            resource_repr=f"Admission: {admission.student_name}",
            previous_value={"status": previous_status},
            new_value={"status": admission.status},
        )

        if admission.status != "approved":
            return

        # Idempotency: an approved admission that already produced a student
        # carries its admission_number. (Previously this matched on the
        # parent's e-mail, which silently blocked the 2nd+ child of any
        # parent who applied with the same address.)
        if admission.admission_number and Student.objects.filter(
            admission_number=admission.admission_number
        ).exists():
            logger.info(f"Student already exists for admission {admission.id}, skipping.")
            return

        try:
            with transaction.atomic():
                school_class = self._resolve_class(admission)

                first_name = admission.first_name or admission.student_name.split(" ", 1)[0]
                last_name  = (
                    admission.last_name
                    or (admission.student_name.split(" ", 1)[1]
                        if " " in admission.student_name else "")
                )
                photo_value = self._copy_photo(admission)

                student = None
                for _attempt in range(5):
                    student_id = self._generate_student_id()
                    try:
                        with transaction.atomic():
                            user = User.objects.create_user(
                                username=student_id,
                                email=admission.email,
                                password=DEFAULT_STUDENT_PASSWORD,
                                first_name=first_name,
                                last_name=last_name,
                                role="student",
                            )
                            student = Student.objects.create(
                                user=user,
                                admission_number=student_id,
                                student_name=f"{first_name} {last_name}".strip(),
                                first_name=first_name,
                                last_name=last_name,
                                gender=admission.gender,
                                nationality=admission.nationality,
                                religion=admission.religion,
                                health_notes=admission.health_notes,
                                previous_school=admission.previous_school,
                                parent_name=admission.parent_name,
                                # The admission form's contact number is the
                                # parent's — without this, fee SMS / WhatsApp
                                # reports never reach newly admitted students.
                                parent_phone=admission.phone,
                                date_of_birth=admission.date_of_birth,
                                address=admission.address,
                                school_class=school_class,
                                photo=photo_value,
                            )
                        break
                    except IntegrityError:
                        continue   # concurrent approval grabbed this number
                if student is None:
                    raise IntegrityError("Could not allocate a unique student ID")

                admission.admission_number = student_id
                admission.save(update_fields=["admission_number"])

            logger.info(f"Student created: {student.student_name} id={student_id} photo={photo_value}")

            log_action(
                request=self.request,
                action=AuditLog.Action.CREATE,
                module=AuditLog.Module.ADMISSIONS,
                resource_type="Student",
                resource_id=student.id,
                resource_repr=f"Student created from admission: {student.student_name} ({student_id})",
            )

        except Exception as exc:
            logger.error(f"Student creation failed: {exc}")
            log_action(
                request=self.request,
                action=AuditLog.Action.CREATE,
                module=AuditLog.Module.ADMISSIONS,
                status=AuditLog.Status.FAILED,
                resource_type="Student",
                resource_repr=f"Student creation failed for admission: {admission.student_name}",
                description=str(exc),
            )
            raise