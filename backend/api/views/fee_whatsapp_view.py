from io import BytesIO

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from apps.fees.models import Fee, PaymentTransaction
from apps.results.whatsapp import send_whatsapp_bill, send_whatsapp_receipt

from .bill_pdf_view import StudentFeeBillPDFView
from .receipt_pdf_view import PaymentReceiptPDFView


def _pdf_bytes(response):
    return BytesIO(response.content)


class SendWhatsAppBillView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, fee_id):
        fee = Fee.objects.select_related("student").filter(id=fee_id).first()
        if not fee:
            return Response({"success": False, "reason": "not_found"}, status=404)

        pdf_request = APIRequestFactory().get("/", {"term": fee.term})
        pdf_response = StudentFeeBillPDFView().get(pdf_request, fee.student_id)
        if getattr(pdf_response, "status_code", 200) != 200:
            return Response({"success": False, "reason": "pdf_generation_error"}, status=500)

        result = send_whatsapp_bill(
            fee.student,
            _pdf_bytes(pdf_response),
            fee.total_amount,
            invoice_number=f"FEE-{fee.id:06d}",
        )
        return Response(result, status=200 if result["success"] else 400)


class SendWhatsAppReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, transaction_id):
        transaction = (
            PaymentTransaction.objects
            .select_related("fee", "fee__student")
            .filter(id=transaction_id)
            .first()
        )
        if not transaction:
            return Response({"success": False, "reason": "not_found"}, status=404)

        pdf_request = APIRequestFactory().get("/")
        pdf_response = PaymentReceiptPDFView().get(pdf_request, transaction.id)
        if getattr(pdf_response, "status_code", 200) != 200:
            return Response({"success": False, "reason": "pdf_generation_error"}, status=500)

        result = send_whatsapp_receipt(
            transaction.fee.student,
            _pdf_bytes(pdf_response),
            transaction.amount,
            payment_date=transaction.created_at,
            receipt_number=f"RCP-{transaction.id:06d}",
        )
        return Response(result, status=200 if result["success"] else 400)


class BulkSendWhatsAppBillsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        class_id = request.data.get("school_class") or request.query_params.get("school_class")
        term = request.data.get("term") or request.query_params.get("term")
        if not class_id or not term:
            return Response({"error": "school_class and term are required"}, status=400)

        summary = {"sent": [], "skipped-no-phone": [], "skipped-invalid-phone": [], "failed": []}
        fees = Fee.objects.filter(
            student__school_class_id=class_id, term=term,
        ).select_related("student")
        for fee in fees:
            pdf_request = APIRequestFactory().get("/", {"term": fee.term})
            pdf_response = StudentFeeBillPDFView().get(pdf_request, fee.student_id)
            if getattr(pdf_response, "status_code", 200) != 200:
                summary["failed"].append({"student_id": fee.student_id, "reason": "pdf_generation_error"})
                continue
            result = send_whatsapp_bill(
                fee.student,
                _pdf_bytes(pdf_response),
                fee.total_amount,
                invoice_number=f"FEE-{fee.id:06d}",
            )
            if result["success"]:
                summary["sent"].append({"student_id": fee.student_id, "message_id": result["message_id"]})
            elif result["reason"] == "no_phone":
                summary["skipped-no-phone"].append(fee.student_id)
            elif result["reason"] == "invalid_phone":
                summary["skipped-invalid-phone"].append(fee.student_id)
            else:
                summary["failed"].append({"student_id": fee.student_id, "reason": result["reason"]})
        return Response(summary)