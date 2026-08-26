import logging
import re
import uuid

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)

TERMII_WHATSAPP_TEMPLATE_URL = "https://api.ng.termii.com/api/send/template/media"


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


def _upload_pdf(pdf_file) -> str:
    """Upload a PDF through the configured Django storage backend."""
    filename = f"reports/whatsapp/{uuid.uuid4().hex}.pdf"
    if hasattr(pdf_file, "seek"):
        pdf_file.seek(0)
    stored_name = default_storage.save(filename, ContentFile(pdf_file.read()))
    url = default_storage.url(stored_name)
    if url.startswith("http://"):
        url = "https://" + url[len("http://"):]
    if not url.startswith("https://"):
        raise ValueError("Cloudinary did not return a public HTTPS URL")
    return url


def send_whatsapp_report(student, pdf_file, report_label, term=None, year=None):
    """Upload and send a student's report PDF through Termii WhatsApp."""
    result = {"success": False, "reason": None, "message_id": None}
    phone = normalize_gh_phone(getattr(student, "parent_phone", ""))
    if not getattr(student, "parent_phone", ""):
        result["reason"] = "no_phone"
        return result
    if phone is None:
        result["reason"] = "invalid_phone"
        return result

    try:
        pdf_url = _upload_pdf(pdf_file)
        data = {
            "1": getattr(student, "parent_name", "") or student.full_name,
            "2": report_label,
        }
        if term is not None or year is not None:
            data["3"] = f"{term or ''} {year or ''}".strip()
        payload = {
            "phone_number": phone,
            "device_id": settings.TERMII_WHATSAPP_DEVICE_ID,
            "template_id": settings.TERMII_WHATSAPP_REPORT_TEMPLATE_ID,
            "api_key": settings.TERMII_API_KEY,
            "data": data,
            "media": {
                "caption": f"{report_label} \u2014 {student.full_name}",
                "url": pdf_url,
            },
        }
        response = requests.post(
            TERMII_WHATSAPP_TEMPLATE_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        logger.info("Termii WhatsApp response: %s %s", response.status_code, response.text)
        if response.status_code < 200 or response.status_code >= 300:
            logger.error("Termii WhatsApp rejected %s: %s", phone, response.text)
            result["reason"] = "termii_error"
            return result
        response_data = response.json()
        message_id = response_data.get("message_id") or response_data.get("messageId")
        if not message_id:
            logger.error("Termii WhatsApp response missing message_id: %s", response_data)
            result["reason"] = "termii_error"
            return result
        return {"success": True, "reason": None, "message_id": message_id}
    except requests.RequestException as exc:
        logger.exception("Termii WhatsApp request failed for %s: %s", phone, exc)
        result["reason"] = "termii_error"
    except Exception as exc:
        logger.exception("WhatsApp report send failed for %s: %s", phone, exc)
        result["reason"] = "upload_error"
    return result
