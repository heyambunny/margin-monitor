from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import require_admin
from backend.services.email_service import (
    get_invoice_email_details,
    generate_email_preview,
    send_invoice_email
)

router = APIRouter()

class PreviewRequest(BaseModel):
    invoice_id: int
    issue_type_id: int
    remarks: str = ""

class SendRequest(BaseModel):
    invoice_id: int
    issue_type_id: int
    remarks: str = ""

@router.get("/email/invoice/{invoice_id}")
async def get_invoice_for_email(invoice_id: int, user: dict = Depends(require_admin)):
    try:
        data = get_invoice_email_details(invoice_id)
        if not data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return data
    except Exception as e:
        print(f"Error fetching invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email/preview")
async def preview_email(data: PreviewRequest, user: dict = Depends(require_admin)):
    try:
        preview = generate_email_preview(
            data.invoice_id,
            data.issue_type_id,
            data.remarks
        )
        if not preview:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return preview
    except Exception as e:
        print(f"Error generating preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email/send")
async def send_email(data: SendRequest, user: dict = Depends(require_admin)):
    try:
        result = send_invoice_email(
            data.invoice_id,
            data.issue_type_id,
            data.remarks
        )
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["message"])
        return result
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/email/logs/{invoice_id}")
async def get_email_logs(invoice_id: int, user: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                id,
                recipient,
                subject,
                status,
                sent_at
            FROM email_logs
            WHERE invoice_id = %s
            ORDER BY sent_at DESC
        """, (invoice_id,))
        
        rows = cursor.fetchall()
        return [
            {
                "id": row[0],
                "recipient": row[1],
                "subject": row[2],
                "status": row[3],
                "sent_at": row[4].isoformat() if row[4] else None
            }
            for row in rows
        ]
    except Exception as e:
        print(f"Error fetching email logs: {e}")
        return []
    finally:
        release_connection(conn)
