from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import TestCase
from rest_framework.test import APIClient

from apps.classes.models import SchoolClass
from apps.fees.models import Fee, PaymentTransaction
from apps.students.models import Student


class FeeWhatsAppEndpointTests(TestCase):

	def setUp(self):
		user = get_user_model().objects.create_user(username="fee-test", password="pass")
		self.client = APIClient()
		self.client.force_authenticate(user=user)
		school_class = SchoolClass.objects.create(name="JSS 1", level="basic_7_9")
		self.student = Student.objects.create(
			user=user,
			admission_number="FEE001",
			first_name="Jane",
			last_name="Doe",
			parent_phone="0241234567",
			school_class=school_class,
		)
		self.fee = Fee.objects.create(
			student=self.student,
			term="term1",
			amount=Decimal("500.00"),
		)
		self.transaction = PaymentTransaction.objects.create(
			fee=self.fee,
			amount=Decimal("100.00"),
		)

	@patch("api.views.fee_whatsapp_view.send_whatsapp_bill")
	@patch("api.views.fee_whatsapp_view.StudentFeeBillPDFView.get")
	def test_send_bill_endpoint(self, build_pdf, send_bill):
		build_pdf.return_value = HttpResponse(b"pdf", content_type="application/pdf")
		send_bill.return_value = {"success": True, "reason": None, "message_id": "bill-1"}

		response = self.client.post(f"/api/fees/{self.fee.id}/send-whatsapp/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()["message_id"], "bill-1")
		self.assertEqual(send_bill.call_args.args[2], self.fee.total_amount)

	@patch("api.views.fee_whatsapp_view.send_whatsapp_receipt")
	@patch("api.views.fee_whatsapp_view.PaymentReceiptPDFView.get")
	def test_send_receipt_endpoint(self, build_pdf, send_receipt):
		build_pdf.return_value = HttpResponse(b"pdf", content_type="application/pdf")
		send_receipt.return_value = {"success": True, "reason": None, "message_id": "receipt-1"}

		response = self.client.post(
			f"/api/fees/receipts/{self.transaction.id}/send-whatsapp/"
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()["message_id"], "receipt-1")
		self.assertEqual(send_receipt.call_args.args[2], self.transaction.amount)
