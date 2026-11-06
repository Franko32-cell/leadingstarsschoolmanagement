from datetime import date

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from api.serializers.attendance_serializer import AttendanceSerializer
from api.serializers.school_calendar_serializer import SchoolCalendarSerializer
from apps.attendance import services
from apps.attendance.models import Attendance, SchoolCalendar
from apps.audit.models import AuditLog
from apps.audit.services import log_action
from apps.students.models import Student
from apps.teachers.models import Teacher


def _parse_date(value, field):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a valid date (YYYY-MM-DD).")


class AttendancePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, "role", None)
        if request.method in permissions.SAFE_METHODS:
            return role in ("admin", "teacher", "student")
        return role in ("admin", "teacher")


class SchoolCalendarPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.method in permissions.SAFE_METHODS or request.user.role == "admin"


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated, AttendancePermission]
    queryset = Attendance.objects.all()

    def get_queryset(self):
        user = self.request.user
        queryset = Attendance.objects.select_related(
            "student", "school_class", "created_by", "updated_by"
        )
        if user.role == "admin":
            return queryset
        if user.role == "teacher":
            class_ids = Teacher.objects.filter(user=user).values_list("school_class_id", flat=True)
            return queryset.filter(school_class_id__in=class_ids)
        if user.role == "student":
            return queryset.filter(student__user=user)
        return queryset.none()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        params = request.query_params
        try:
            exact_date = params.get("date")
            if exact_date:
                queryset = queryset.filter(date=_parse_date(exact_date, "date"))

            start = params.get("date_after") or params.get("start_date")
            end = params.get("date_before") or params.get("end_date")
            if start:
                queryset = queryset.filter(date__gte=_parse_date(start, "date_after"))
            if end:
                queryset = queryset.filter(date__lte=_parse_date(end, "date_before"))
            if start and end and _parse_date(start, "date_after") > _parse_date(end, "date_before"):
                return Response({"detail": "Start date cannot be after end date."}, status=400)

            school_class = params.get("school_class") or params.get("class")
            if school_class:
                queryset = queryset.filter(school_class_id=int(school_class))
            student = params.get("student")
            if student:
                queryset = queryset.filter(student_id=int(student))
            teacher = params.get("teacher")
            if teacher:
                queryset = queryset.filter(school_class__teachers__id=int(teacher))
            if params.get("term"):
                valid_terms = {value for value, _ in Attendance.Term.choices}
                if params["term"] not in valid_terms:
                    return Response({"term": "Invalid attendance term."}, status=400)
                queryset = queryset.filter(term=params["term"])
            year = params.get("year")
            academic_year = params.get("academic_year")
            if academic_year:
                parts = academic_year.split("/")
                if len(parts) != 2 or not all(part.isdigit() for part in parts):
                    return Response({"academic_year": "Invalid academic year."}, status=400)
                year = parts[0]
            if year:
                queryset = queryset.filter(year=int(year))
            if params.get("status"):
                statuses = [value.strip() for value in params["status"].split(",")]
                valid_statuses = {value for value, _ in Attendance.Status.choices}
                if not statuses or any(value not in valid_statuses for value in statuses):
                    return Response({"status": "Invalid attendance status."}, status=400)
                queryset = queryset.filter(status__in=statuses)
            search = params.get("search")
            if search:
                queryset = queryset.filter(
                    Q(student__first_name__icontains=search)
                    | Q(student__last_name__icontains=search)
                    | Q(student__admission_number__icontains=search)
                )
        except (TypeError, ValueError):
            return Response({"detail": "Invalid attendance filter."}, status=400)

        ordering = params.get("ordering", "-date")
        if ordering.lstrip("-") in ("date", "student"):
            field = "student__last_name" if ordering.lstrip("-") == "student" else "date"
            queryset = queryset.order_by(("-" if ordering.startswith("-") else "") + field)
        else:
            queryset = queryset.order_by("-date", "student__last_name")
        queryset = queryset.distinct()

        if "page" not in params:
            return Response(self.get_serializer(queryset, many=True).data)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        paginator.page_size_query_param = "page_size"
        paginator.max_page_size = 100
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(self.get_serializer(page, many=True).data)

    def perform_create(self, serializer):
        user = self.request.user
        school_class = serializer.validated_data["school_class"]
        if user.role == "teacher" and not Teacher.objects.filter(
            user=user, school_class=school_class
        ).exists():
            raise PermissionDenied("You can only mark attendance for your assigned class.")

        record = serializer.save(
            term=getattr(settings, "CURRENT_TERM", "term1"),
            year=getattr(settings, "CURRENT_YEAR", timezone.localdate().year),
            created_by=user,
            updated_by=user,
        )
        log_action(
            request=self.request,
            action=AuditLog.Action.CREATE,
            module=AuditLog.Module.ATTENDANCE,
            resource_type="Attendance",
            resource_id=record.id,
            resource_repr=str(record),
        )

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        school_class = serializer.validated_data.get("school_class", instance.school_class)
        if user.role == "teacher" and not Teacher.objects.filter(
            user=user, school_class=school_class
        ).exists():
            raise PermissionDenied("You can only edit attendance for your assigned class.")

        previous = {"status": instance.status, "date": instance.date.isoformat()}
        record = serializer.save(updated_by=user)
        log_action(
            request=self.request,
            action=AuditLog.Action.ATTENDANCE_UPDATE,
            module=AuditLog.Module.ATTENDANCE,
            resource_type="Attendance",
            resource_id=record.id,
            resource_repr=str(record),
            previous_value=previous,
            new_value={"status": record.status, "date": record.date.isoformat()},
        )

    def perform_destroy(self, instance):
        if self.request.user.role != "admin":
            raise PermissionDenied("Only administrators can delete attendance records.")
        record_id = instance.id
        record_repr = str(instance)
        instance.delete()
        log_action(
            request=self.request,
            action=AuditLog.Action.DELETE,
            module=AuditLog.Module.ATTENDANCE,
            resource_type="Attendance",
            resource_id=record_id,
            resource_repr=record_repr,
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        try:
            if request.query_params.get("date"):
                start = end = _parse_date(request.query_params["date"], "date")
            else:
                start = _parse_date(request.query_params["start_date"], "start_date") if request.query_params.get("start_date") else timezone.localdate()
                end = _parse_date(request.query_params["end_date"], "end_date") if request.query_params.get("end_date") else start
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        if end < start:
            return Response({"detail": "Start date cannot be after end date."}, status=400)

        records = self.get_queryset().filter(date__range=(start, end))
        school_class = request.query_params.get("school_class") or request.query_params.get("class")
        if school_class:
            records = records.filter(school_class_id=school_class)
        student_ids = records.values_list("student_id", flat=True).distinct()
        count_rows = {
            row["student_id"]: row
            for row in services.attendance_counts_by(records, "student_id")
        }
        students = Student.objects.filter(id__in=student_ids).order_by("admission_number")

        rows = []
        totals = {key: 0 for key in ("present", "late", "absent", "excused", "attended", "counted_days")}
        for student in students:
            counts = count_rows.get(student.id, {})
            row = {
                "student": student.id,
                "student_name": student.full_name,
                "admission_number": student.admission_number,
                **{key: counts.get(key, 0) for key in totals},
                "percentage": counts.get("percentage"),
            }
            rows.append(row)
            for key in totals:
                totals[key] += row[key]
        totals["percentage"] = (
            round(totals["attended"] / totals["counted_days"] * 100, 2)
            if totals["counted_days"] else None
        )
        school_days = services.count_school_days(start, end)
        totals["school_days"] = school_days
        holidays = [
            {"date": item["date"], "name": item["name"]}
            for item in services.non_school_days(start, end)
            if item["type"] != "weekend"
        ]
        return Response({
            "period": {"start": start.isoformat(), "end": end.isoformat()},
            "school_days": school_days,
            "holidays": holidays,
            "students": rows,
            "totals": totals,
        })


class SchoolCalendarViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolCalendarSerializer
    permission_classes = [permissions.IsAuthenticated, SchoolCalendarPermission]
    pagination_class = None
    queryset = SchoolCalendar.objects.all()

    def get_queryset(self):
        queryset = SchoolCalendar.objects.all()
        params = self.request.query_params
        if params.get("year"):
            queryset = queryset.filter(year=params["year"])
        if params.get("term"):
            queryset = queryset.filter(term=params["term"])
        if params.get("date_after"):
            try:
                queryset = queryset.filter(end_date__gte=_parse_date(params["date_after"], "date_after"))
            except ValueError:
                return queryset.none()
        if params.get("date_before"):
            try:
                queryset = queryset.filter(start_date__lte=_parse_date(params["date_before"], "date_before"))
            except ValueError:
                return queryset.none()
        return queryset

    def list(self, request, *args, **kwargs):
        params = request.query_params
        try:
            if params.get("year"):
                int(params["year"])
            if params.get("term") and params["term"] not in {
                value for value, _ in Attendance.Term.choices
            }:
                return Response({"term": "Invalid attendance term."}, status=400)
            start = _parse_date(params["date_after"], "date_after") if params.get("date_after") else None
            end = _parse_date(params["date_before"], "date_before") if params.get("date_before") else None
        except ValueError:
            return Response({"detail": "Invalid school calendar filter."}, status=400)
        if start and end and start > end:
            return Response({"detail": "Start date cannot be after end date."}, status=400)
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        entry = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        log_action(
            request=self.request,
            action=AuditLog.Action.CREATE,
            module=AuditLog.Module.ATTENDANCE,
            resource_type="SchoolCalendar",
            resource_id=entry.id,
            resource_repr=entry.name,
        )

    def perform_update(self, serializer):
        entry = serializer.save(updated_by=self.request.user)
        log_action(
            request=self.request,
            action=AuditLog.Action.UPDATE,
            module=AuditLog.Module.ATTENDANCE,
            resource_type="SchoolCalendar",
            resource_id=entry.id,
            resource_repr=entry.name,
        )

    def perform_destroy(self, instance):
        entry_id, name = instance.id, instance.name
        instance.delete()
        log_action(
            request=self.request,
            action=AuditLog.Action.DELETE,
            module=AuditLog.Module.ATTENDANCE,
            resource_type="SchoolCalendar",
            resource_id=entry_id,
            resource_repr=name,
        )

    @action(detail=False, methods=["get"])
    def check(self, request):
        try:
            target = _parse_date(request.query_params.get("date"), "date")
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(services.day_status(target))

    @action(detail=False, methods=["get"])
    def days(self, request):
        try:
            start = _parse_date(request.query_params.get("start"), "start")
            end = _parse_date(request.query_params.get("end"), "end")
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        if end < start:
            return Response({"detail": "Start date cannot be after end date."}, status=400)
        return Response({
            "start": start.isoformat(),
            "end": end.isoformat(),
            "school_days": services.count_school_days(start, end),
            "non_school_days": services.non_school_days(start, end),
        })
