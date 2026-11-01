import os
from typing import List, Optional
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.whatsapp import WhatsAppAccount, WhatsAppConversation, WhatsAppMessage
from app.models.crm import Lead
from app.models.clients_projects import Client
from app.models.users import User
from app.api.deps import get_current_user, get_current_admin, get_current_manager_or_higher
from pydantic import BaseModel, Field

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Business Inbox"])


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1)
    message_type: str = Field("text", pattern="^(text|template)$")


class CreateConversationRequest(BaseModel):
    contact_phone: str = Field(..., min_length=7, max_length=20)
    contact_name: str = Field("Unknown", max_length=255)
    lead_id: Optional[int] = None
    client_id: Optional[int] = None


@router.get("/status")
def get_whatsapp_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if official Meta WhatsApp Cloud API credentials are configured.
    """
    token = os.getenv("WHATSAPP_API_TOKEN") or os.getenv("META_WHATSAPP_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    waba_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
    is_configured = bool(token and phone_id)

    conversations_count = db.query(WhatsAppConversation).count()
    messages_count = db.query(WhatsAppMessage).count()

    return {
        "configured": is_configured,
        "phone_number_id_configured": bool(phone_id),
        "business_account_id_configured": bool(waba_id),
        "conversations_count": conversations_count,
        "messages_count": messages_count,
        "status_message": (
            "Meta WhatsApp Cloud API is connected and operational."
            if is_configured
            else "Meta Cloud API credentials (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are not configured. WhatsApp messaging requires Meta Developer credentials."
        )
    }


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List actual WhatsApp conversations stored in PostgreSQL.
    """
    convs = db.query(WhatsAppConversation).order_by(desc(WhatsAppConversation.last_message_at)).all()
    results = []

    for c in convs:
        last_msg = (c.messages[-1].content) if c.messages else None
        results.append({
            "id": c.id,
            "contact_phone": c.contact_phone,
            "contact_name": c.contact_name,
            "lead_id": c.lead_id,
            "lead_company": c.lead.company_name if c.lead else None,
            "client_id": c.client_id,
            "client_name": c.client.business_name if c.client else None,
            "unread_count": c.unread_count,
            "last_message": last_msg,
            "last_message_at": c.last_message_at,
            "created_at": c.created_at
        })

    return results


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: CreateConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start a new WhatsApp conversation thread with a client or lead phone number.
    """
    # Check if conversation already exists for this phone
    existing = db.query(WhatsAppConversation).filter(
        WhatsAppConversation.contact_phone == payload.contact_phone.strip()
    ).first()

    if existing:
        return {
            "id": existing.id,
            "contact_phone": existing.contact_phone,
            "contact_name": existing.contact_name,
            "message": "Existing conversation reopened."
        }

    conv = WhatsAppConversation(
        contact_phone=payload.contact_phone.strip(),
        contact_name=payload.contact_name.strip(),
        lead_id=payload.lead_id,
        client_id=payload.client_id,
        assigned_agent_id=current_user.id
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return {
        "id": conv.id,
        "contact_phone": conv.contact_phone,
        "contact_name": conv.contact_name,
        "message": "Conversation started successfully."
    }


@router.get("/conversations/{conversation_id}")
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full conversation thread and messages.
    """
    conv = db.query(WhatsAppConversation).filter(WhatsAppConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Mark as read
    conv.unread_count = 0
    db.commit()

    messages = [
        {
            "id": m.id,
            "conversation_id": m.conversation_id,
            "meta_message_id": m.meta_message_id,
            "direction": m.direction,
            "message_type": m.message_type,
            "content": m.content,
            "delivery_status": m.delivery_status,
            "timestamp": m.timestamp
        }
        for m in (conv.messages or [])
    ]

    return {
        "id": conv.id,
        "contact_phone": conv.contact_phone,
        "contact_name": conv.contact_name,
        "lead_id": conv.lead_id,
        "client_id": conv.client_id,
        "messages": messages
    }


@router.post("/conversations/{conversation_id}/messages")
async def send_whatsapp_message(
    conversation_id: int,
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send an outbound WhatsApp message via Meta Cloud API if configured.
    """
    conv = db.query(WhatsAppConversation).filter(WhatsAppConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    token = os.getenv("WHATSAPP_API_TOKEN") or os.getenv("META_WHATSAPP_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

    meta_msg_id = None
    delivery_status = "sent"

    if token and phone_id:
        # Call official Meta Cloud API
        url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        body = {
            "messaging_product": "whatsapp",
            "to": conv.contact_phone,
            "type": "text",
            "text": {"body": payload.content.strip()}
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=body, headers=headers, timeout=10.0)
            if resp.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"Meta API error: {resp.text}")
            res_data = resp.json()
            if "messages" in res_data and len(res_data["messages"]) > 0:
                meta_msg_id = res_data["messages"][0]["id"]
    else:
        raise HTTPException(
            status_code=400,
            detail="Meta Cloud API is not configured on this server. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env to dispatch live messages."
        )

    now = datetime.now(timezone.utc)
    msg = WhatsAppMessage(
        conversation_id=conv.id,
        meta_message_id=meta_msg_id,
        direction="outbound",
        message_type=payload.message_type,
        content=payload.content.strip(),
        delivery_status=delivery_status,
        timestamp=now
    )
    db.add(msg)
    conv.last_message_at = now
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "content": msg.content,
        "direction": msg.direction,
        "delivery_status": msg.delivery_status,
        "timestamp": msg.timestamp
    }


# ==========================================
# Webhook Verification & Inbound Ingestion
# ==========================================

@router.get("/webhook")
def verify_webhook(
    request: Request,
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token")
):
    """
    Official Meta webhook handshake endpoint.
    """
    expected_token = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "bodhiwaves_meta_verify_2026")
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        return Response(content=hub_challenge or "", media_type="text/plain")
    raise HTTPException(status_code=403, detail="Webhook verification token mismatch")
