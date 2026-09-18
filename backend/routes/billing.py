from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.db import get_connection, release_connection, get_user_client_ids
from backend.auth.jwt_handler import require_roles
from utils.audit import log_audit
from datetime import datetime
import psycopg2
import random

router = APIRouter()

CULPRIT_TAGLINES = [
    "Case cracked!",
    "Mystery solved!",
    "Gotcha!",
    "Busted!",
    "We found the culprit!",
]

def duplicate_invoice_message(cursor, invoice_no: str) -> str:
    """A given invoice number is unique across all billing entries. When a
    conversion collides with one already in use, name and shame whoever got
    there first instead of surfacing the raw Postgres constraint error."""
    cursor.execute("""
        SELECT c.client_name, p.program_name, u.name
        FROM billing_entries b
        JOIN clients c ON b.client_id = c.id
        JOIN programs p ON b.program_id = p.id
        LEFT JOIN users u ON b.created_by_user_id = u.id
        WHERE b.invoice_no = %s
        LIMIT 1
    """, (invoice_no,))
    row = cursor.fetchone()
    tagline = random.choice(CULPRIT_TAGLINES)

    if not row:
        return f'Invoice number "{invoice_no}" is already taken. Pick a different one.'

    client_name, program_name, user_name = row
    if user_name:
        return (
            f'{tagline} {user_name} already billed invoice "{invoice_no}" '
            f'on the {program_name} program for {client_name}. Pick a different invoice number.'
        )
    return (
        f'{tagline} Invoice "{invoice_no}" is already billed on the {program_name} '
        f'program for {client_name}. Pick a different invoice number.'
    )

class ConvertBillingRequest(BaseModel):
    projection_id: int
    amount: float
    status: str = "Active"
    delete_reason: Optional[str] = None
    funnel_number: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_date: str
    vendors: List[dict] = []

# Convert to Billing - Admin (1) and Finance (2).
@router.post("/billing/convert/{projection_id}")
async def convert_to_billing(projection_id: int, data: ConvertBillingRequest, user: dict = Depends(require_roles(1, 2))):
    print(f"📥 Converting projection {projection_id} to billing")
    print(f"  user: {user}")
    print(f"  data: {data}")

    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Check if projection exists and is Active
        cursor.execute("""
            SELECT id, client_billed_amount, client_id FROM billing_entries
            WHERE id = %s AND status = 'Active'
        """, (projection_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Projection not found or already processed")
        old_amount = result[1]

        # Only let the user convert projections for clients they're assigned to
        if user["role_id"] != 1:
            allowed_client_ids = get_user_client_ids(cursor, user["user_id"])
            if result[2] not in allowed_client_ids:
                raise HTTPException(status_code=403, detail="You do not have access to this client")

        # Update the projection to Billed status
        try:
            cursor.execute("""
                UPDATE billing_entries
                SET
                    status = 'Billed',
                    funnel_number = %s,
                    invoice_no = %s,
                    invoice_date = %s,
                    client_billed_amount = %s
                WHERE id = %s
                RETURNING id
            """, (
                data.funnel_number,
                data.invoice_no,
                data.invoice_date,
                data.amount,
                projection_id
            ))
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            cursor = conn.cursor()
            raise HTTPException(status_code=400, detail=duplicate_invoice_message(cursor, data.invoice_no))

        updated_id = cursor.fetchone()
        if not updated_id:
            raise HTTPException(status_code=400, detail="Failed to update projection")

        log_audit(cursor, "billing_entries", projection_id, "status",
                   "Active", "Billed", "UPDATE",
                   user["user_id"], user["role_id"], "billing", "HIGH")
        if old_amount is None or float(old_amount) != data.amount:
            log_audit(cursor, "billing_entries", projection_id, "client_billed_amount",
                       old_amount, data.amount, "UPDATE",
                       user["user_id"], user["role_id"], "billing", "HIGH")
        log_audit(cursor, "billing_entries", projection_id, "invoice_no",
                   None, data.invoice_no, "UPDATE",
                   user["user_id"], user["role_id"], "billing", "MEDIUM")

        # Update vendors if provided
        if data.vendors:
            # Delete existing vendors
            cursor.execute("SELECT vendor_id, amount FROM vendor_expenses WHERE billing_entry_id = %s", (projection_id,))
            old_vendors = cursor.fetchall()
            old_vendors_summary = "; ".join(f"vendor {v}: {a}" for v, a in old_vendors) or "none"

            cursor.execute("DELETE FROM vendor_expenses WHERE billing_entry_id = %s", (projection_id,))

            # Insert new vendors
            for vendor in data.vendors:
                cursor.execute("""
                    INSERT INTO vendor_expenses (billing_entry_id, vendor_id, amount)
                    VALUES (%s, %s, %s)
                """, (projection_id, vendor.get("vendor_id"), vendor.get("amount")))

            new_vendors_summary = "; ".join(
                f"vendor {v.get('vendor_id')}: {v.get('amount')}" for v in data.vendors
            ) or "none"
            log_audit(cursor, "vendor_expenses", projection_id, "vendors",
                       old_vendors_summary, new_vendors_summary, "UPDATE",
                       user["user_id"], user["role_id"], "billing", "MEDIUM")

        conn.commit()
        return {"id": projection_id, "message": "Projection converted to billing successfully"}
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_connection(conn)
