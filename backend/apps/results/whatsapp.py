import logging
import re
import uuid

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)

TERMII_WHATSAPP_TEMPLATE_URL = "https://api.ng.termii.com/api/send/template/media"

# Maps a logical document type to the Django settings attribute holding its
# approved Termii WhatsApp template ID. Each document type gets its own
# template because the wording differs (a report isn't phrased like a bill
# or a receipt) — add an entry here (and the matching setting/env var)
# whenever a new kind of document needs to go out over WhatsApp.
DOCUMENT_TEMPLATE_SETTINGS = {
    "report": "TERMII_WHATSAPP_REPORT_TEMPLATE_ID",
    "bill": "TERMII_WHATSAPP_BILL_TEMPLATE_ID",
    "receipt": "TERMII_WHATSAPP_RECEIPT_TEMPLATE_ID",
}


def normalize_gh_phone(raw_phone: str) -> str | None:
    """Return a Termii-compatible international phone number."""
    if not raw_phone or not isinstance(raw_phone, str):
        return None

    value = re.sub(r"[\s().-]", "", raw_phone.strip())
    if not value:
        return None

    had_plus = value.startswith("+")
    if had_plus:
        value = value[1:]
    if not value.isdigit():
        return None

    if not had_plus and value.startswith("0"):
        if len(value) != 10:
            return None
        value = "233" + value[1:]
    elif not had_plus and len(value) == 9 and value.startswith(("2", "5")):
        value = "233" + value

    if not 8 <= len(value) <= 15:
        return None
    if value.startswith("233"):
        if len(value) != 12 or not re.match(r"^233(?:20|23|24|25|26|27|50|53|54|55|59)\d{7}$", value):
            return None
    return value


def _upload_pdf(pdf_file, *, folder="reports") -> str:
    """Upload a PDF through the configured Django storage backend."""
    filename = f"whatsapp/{folder}/{uuid.uuid4().hex}.pdf"
    if hasattr(pdf_file, "seek"):
        pdf_file.seek(0)
    stored_name = default_storage.save(filename, ContentFile(pdf_file.read()))
    url = default_storage.url(stored_name)
    if url.startswith("http://"):
        url = "https://" + url[len("http://"):]
    if not url.startswith("https://"):
        raise ValueError("Storage backend did not return a public HTTPS URL")
    return url


def send_whatsapp_document(student, pdf_file, *, doc_type, caption, template_data):
    """
    Upload a PDF and send it to a student's parent over WhatsApp via Termii.

    doc_type: one of DOCUMENT_TEMPLATE_SETTINGS's keys ("report", "bill", "receipt").
    caption: short text shown alongside the attachment in WhatsApp.
    template_data: dict of placeholder values for the approved template, e.g.
        {"1": parent_name, "2": "Term 1 2026"} for a report, or
        {"1": parent_name, "2": "GHS 450.00", "3": "15 Sep 2026"} for a bill.
        Must match the placeholder count/order the template was approved with.
    """
    result = {"success": False, "reason": None, "message_id": None}

    if doc_type not in DOCUMENT_TEMPLATE_SETTINGS:
        logger.error("Unknown WhatsApp doc_type: %s", doc_type)
        result["reason"] = "invalid_doc_type"
        return result

    template_id = getattr(settings, DOCUMENT_TEMPLATE_SETTINGS[doc_type], None)
    if not template_id:
        logger.error("No Termii template configured for doc_type=%s", doc_type)
        result["reason"] = "missing_template_config"
        return result

    raw_phone = getattr(student, "parent_phone", "")
    if not raw_phone:
        result["reason"] = "no_phone"
        return result
    phone = normalize_gh_phone(raw_phone)
    if phone is None:
        result["reason"] = "invalid_phone"
        return result

    try:
        pdf_url = _upload_pdf(pdf_file, folder=doc_type)
        payload = {
            "phone_number": phone,
            "device_id": settings.TERMII_WHATSAPP_DEVICE_ID,
            "template_id": template_id,
            "api_key": settings.TERMII_API_KEY,
            "data": template_data,
            "media": {
                "caption": caption,
                "url": pdf_url,
            },
        }
        response = requests.post(
            TERMII_WHATSAPP_TEMPLATE_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        logger.info("Termii WhatsApp response (%s): %s %s", doc_type, response.status_code, response.text)
        if not (200 <= response.status_code < 300):
            logger.error("Termii WhatsApp rejected %s (%s): %s", phone, doc_type, response.text)
            result["reason"] = "termii_error"
            return result
        response_data = response.json()
        message_id = response_data.get("message_id") or response_data.get("messageId")
        if not message_id:
            logger.error("Termii WhatsApp response missing message_id (%s): %s", doc_type, response_data)
            result["reason"] = "termii_error"
            return result
        return {"success": True, "reason": None, "message_id": message_id}
    except requests.RequestException as exc:
        logger.exception("Termii WhatsApp request failed for %s (%s): %s", phone, doc_type, exc)
        result["reason"] = "termii_error"
    except Exception as exc:
        logger.exception("WhatsApp document send failed for %s (%s): %s", phone, doc_type, exc)
        result["reason"] = "upload_error"
    return result


def send_whatsapp_report(student, pdf_file, report_label, term=None, year=None):
    """Send a report-card style PDF to a student's parent over WhatsApp."""
    template_data = {
        "1": getattr(student, "parent_name", "") or student.full_name,
        "2": report_label,
    }
    if term is not None or year is not None:
        template_data["3"] = f"{term or ''} {year or ''}".strip()
    return send_whatsapp_document(
        student,
        pdf_file,
        doc_type="report",
        caption=f"{report_label} \u2014 {student.full_name}",
        template_data=template_data,
    )


def send_whatsapp_bill(student, pdf_file, amount, due_date=None, invoice_number=None):
    """Send a fee bill/invoice PDF to a student's parent over WhatsApp."""
    template_data = {
        "1": getattr(student, "parent_name", "") or student.full_name,
        "2": str(amount),
    }
    if due_date is not None:
        template_data["3"] = str(due_date)
    caption = f"Fee Bill \u2014 {student.full_name}"
    if invoice_number:
        caption += f" (#{invoice_number})"
    return send_whatsapp_document(
        student,
        pdf_file,
        doc_type="bill",
        caption=caption,
        template_data=template_data,
    )


def send_whatsapp_receipt(student, pdf_file, amount_paid, payment_date=None, receipt_number=None):
    """Send a payment receipt PDF to a student's parent over WhatsApp."""
    template_data = {
        "1": getattr(student, "parent_name", "") or student.full_name,
        "2": str(amount_paid),
    }
    if payment_date is not None:
        template_data["3"] = str(payment_date)
    caption = f"Payment Receipt \u2014 {student.full_name}"
    if receipt_number:
        caption += f" (#{receipt_number})"
    return send_whatsapp_document(
        student,
        pdf_file,
        doc_type="receipt",
        caption=caption,
        template_data=template_data,
    )