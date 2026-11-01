import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("whatsapp_service")


class WhatsAppService:
    """
    Official Meta WhatsApp Business Cloud API Integration Service.
    Supports real Meta Cloud API when credentials are provided,
    and simulated Mock mode for robust local testing without external API calls.
    """

    @classmethod
    def is_configured(cls) -> bool:
        """Checks whether official Meta credentials have been provided."""
        return bool(
            settings.WHATSAPP_ACCESS_TOKEN and
            settings.WHATSAPP_PHONE_NUMBER_ID and
            not settings.WHATSAPP_MOCK_MODE
        )

    @classmethod
    def verify_webhook_token(cls, mode: str, token: str) -> bool:
        """Verifies the webhook subscription challenge from Meta."""
        return mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN

    @classmethod
    async def send_text_message(
        cls,
        to_phone: str,
        message_text: str
    ) -> Dict[str, Any]:
        """
        Sends an outbound WhatsApp text message via Meta Cloud API or mock provider.
        """
        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")

        # If in Mock Mode (default for local development)
        if settings.WHATSAPP_MOCK_MODE or not cls.is_configured():
            mock_id = f"wamid.mock_{abs(hash(clean_phone + message_text)) % 10000000}"
            logger.info(
                f"[MOCK WHATSAPP] Outbound message to {clean_phone}: '{message_text}' (ID: {mock_id})"
            )
            return {
                "success": True,
                "mock": True,
                "message_id": mock_id,
                "recipient": clean_phone,
                "status": "delivered",
                "details": "Simulated local WhatsApp dispatch."
            }

        # Real Meta WhatsApp Cloud API Request
        url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {"preview_url": False, "body": message_text}
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                data = response.json()
                if response.status_code in [200, 201]:
                    meta_msg_id = data.get("messages", [{}])[0].get("id", "wamid.success")
                    return {
                        "success": True,
                        "mock": False,
                        "message_id": meta_msg_id,
                        "recipient": clean_phone,
                        "status": "sent"
                    }
                else:
                    logger.error(f"Meta WhatsApp API Error: {data}")
                    return {
                        "success": False,
                        "mock": False,
                        "error": data.get("error", {}).get("message", "API Error"),
                        "code": response.status_code
                    }
            except Exception as e:
                logger.error(f"WhatsApp request failed: {e}")
                return {"success": False, "mock": False, "error": str(e)}

    @classmethod
    def generate_wa_me_link(cls, phone_number: str, prefilled_message: str = "") -> str:
        """Generates an official click-to-chat wa.me link with optional pre-filled text."""
        import urllib.parse
        clean_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
        encoded_text = urllib.parse.quote(prefilled_message) if prefilled_message else ""
        if encoded_text:
            return f"https://wa.me/{clean_phone}?text={encoded_text}"
        return f"https://wa.me/{clean_phone}"
