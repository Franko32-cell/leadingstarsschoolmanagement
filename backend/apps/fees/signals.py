import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class TermiiSMSService:
    BASE_URL = "https://v3.api.termii.com/api"
    ENDPOINT = "/sms/send"

    def __init__(self):
        self.api_key   = settings.TERMII_API_KEY
        self.sender_id = settings.TERMII_SENDER_ID

    def send(self, phone: str, message: str) -> dict:
        phone = self._normalize_phone(phone)
        payload = {
            "api_key": self.api_key,
            "to":      phone,
            "from":    self.sender_id,
            "sms":     message,
            "type":    "plain",
            "channel": "dnd",          # ← fixed from "generic"
        }
        try:
            response = requests.post(
                f"{self.BASE_URL}{self.ENDPOINT}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            logger.info("Termii response: %s %s", response.status_code, response.text)
            response.raise_for_status()
        except requests.Timeout:
            logger.error("Termii SMS timeout for %s", phone)
            raise TermiiSMSError("Request to Termii timed out.")
        except requests.RequestException as exc:
            logger.error("Termii HTTP error for %s: %s", phone, exc)
            raise TermiiSMSError(f"HTTP error: {exc}") from exc

        data = response.json()
        if data.get("code") != "ok":
            logger.error("Termii rejected SMS to %s: %s", phone, data)
            raise TermiiSMSError(f"Termii error: {data.get('message', data)}")

        logger.info("SMS sent to %s | message_id=%s", phone, data.get("message_id"))
        return data

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        phone = phone.strip().replace(" ", "").replace("-", "")
        if phone.startswith("0"):
            phone = "233" + phone[1:]
        elif phone.startswith("+"):
            phone = phone[1:]
        return phone


class TermiiSMSError(Exception):
    pass
