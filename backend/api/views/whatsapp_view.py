import io
import logging

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from apps.results.models import MockResult, PreschoolAssessment, Report, Result
from apps.results.whatsapp import send_whatsapp_report
from apps.students.models import Student

from .report_pdf_view import StudentReportPDFView

logger = logging.getLogger(__name__)


class SendWhatsAppReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, report_id):
        record_type = request.query_params.get("type", "report")
        record, error = self._get_record(record_type, report_id)
        if error:
            return Response({"success": False, "reason": error}, status=400)

        if record_type not in ("report", "result"):
            return Response({"success": False, "reason": "pdf_unavailable"}, status=400)

        student = record.student
        term = record.term
        year = record.year
        pdf_request = APIRequestFactory().get("/", {"term": term, "year": year})
        pdf_response = StudentReportPDFView().get(pdf_request, student.id)
        if getattr(pdf_response, "status_code", 200) != 200:
            return Response({"success": False, "reason": "pdf_generation_error"}, status=500)

        pdf_file = io.BytesIO(b"".join(pdf_response.streaming_content))
        label = "Terminal report" if record_type == "report" else "Result report"
        result = send_whatsapp_report(student, pdf_file, label, term=term, year=year)
        return Response(result, status=200 if result["success"] else 400)

    @staticmethod
    def _get_record(record_type, record_id):
        models = {
            "report": Report,
            "result": Result,
            "mock": MockResult,
            "preschool": PreschoolAssessment,
        }
        model = models.get(record_type)
        if model is None:
            return None, "invalid_type"
        record = model.objects.select_related("student").filter(id=record_id).first()
        return (record, None) if record else (None, "not_found")


class BulkSendWhatsAppReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        class_id = request.data.get("school_class") or request.query_params.get("school_class")
        term = request.data.get("term") or request.query_params.get("term")
        year = request.data.get("year") or request.query_params.get("year") or timezone.now().year
        if not class_id or not term:
            return Response({"error": "school_class and term are required"}, status=400)
        try:
            year = int(year)
        except (TypeError, ValueError):
            return Response({"error": "year must be a valid integer"}, status=400)

        summaries = {"sent": [], "skipped-no-phone": [], "skipped-invalid-phone": [], "failed": []}
        reports = Report.objects.filter(
            student__school_class_id=class_id, term=term, year=year,
        ).select_related("student")
        for report in reports:
            pdf_request = APIRequestFactory().get("/", {"term": term, "year": year})
            pdf_response = StudentReportPDFView().get(pdf_request, report.student_id)
            if getattr(pdf_response, "status_code", 200) != 200:
                summaries["failed"].append({"student_id": report.student_id, "reason": "pdf_generation_error"})
                continue
            result = send_whatsapp_report(
                report.student,
                io.BytesIO(b"".join(pdf_response.streaming_content)),
                "Terminal report",
                term=term,
                year=year,
            )
            if result["success"]:
                summaries["sent"].append({"student_id": report.student_id, "message_id": result["message_id"]})
            elif result["reason"] == "no_phone":
                summaries["skipped-no-phone"].append(report.student_id)
            elif result["reason"] == "invalid_phone":
                summaries["skipped-invalid-phone"].append(report.student_id)
            else:
                summaries["failed"].append({"student_id": report.student_id, "reason": result["reason"]})
        return Response(summaries)