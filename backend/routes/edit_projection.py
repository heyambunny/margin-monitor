from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import re
from backend.db import get_connection, release_connection, get_user_client_ids
from backend.auth.jwt_handler import require_roles
from utils.audit import log_audit

router = APIRouter()

class VendorItem(BaseModel):
    vendor_id: int
    amount: float

class EditProjectionRequest(BaseModel):
    description: str
    amount: float
    status: str
    # "Mmm-YY", e.g. "Mar-27". Optional; unchanged when omitted.
    invoice_month: Optional[str] = None
    vendors: List[VendorItem] = []

MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


def financial_year_for(invoice_month: str) -> str:
    """FY runs Apr-Mar: Apr-26..Mar-27 -> "FY 2026-2027" (the format Add
    Projection and Bulk Upload write)."""
    month, yy = invoice_month.split('-')
    year = 2000 + int(yy)
    start = year if MONTHS.index(month) >= 3 else year - 1
    return f"FY {start}-{start + 1}"

# Edit Projection - Admin (1) and Finance (2).
@router.post("/edit-projection/{projection_id}")
async def edit_projection(projection_id: int, data: EditProjectionRequest, user: dict = Depends(require_roles(1, 2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT client_id, invoice_description, client_billed_amount, status, invoice_month, financial_year FROM billing_entries WHERE id = %s",
            (projection_id,)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Projection not found")
        old_client_id, old_description, old_amount, old_status, old_invoice_month, old_financial_year = existing

        # Invoice month is optional in the request; leave it unchanged when omitted.
        new_invoice_month = old_invoice_month
        new_financial_year = old_financial_year
        if data.invoice_month and data.invoice_month != old_invoice_month:
            if not re.fullmatch(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2}", data.invoice_month):
                raise HTTPException(status_code=400, detail="Invoice month must look like Mar-27")
            new_invoice_month = data.invoice_month
            new_financial_year = financial_year_for(data.invoice_month)

        # Only let the user edit projections for clients they're assigned to
        if user["role_id"] != 1:
            allowed_client_ids = get_user_client_ids(cursor, user["user_id"])
            if old_client_id not in allowed_client_ids:
                raise HTTPException(status_code=403, detail="You do not have access to this client")

        cursor.execute("""
            UPDATE billing_entries
            SET
                invoice_description = %s,
                client_billed_amount = %s,
                status = %s,
                invoice_month = %s,
                financial_year = %s
            WHERE id = %s
            RETURNING id
        """, (
            data.description,
            data.amount,
            data.status,
            new_invoice_month,
            new_financial_year,
            projection_id
        ))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Projection not found")

        if data.description != old_description:
            log_audit(cursor, "billing_entries", projection_id, "invoice_description",
                       old_description, data.description, "UPDATE",
                       user["user_id"], user["role_id"], "projection", "LOW")
        if old_amount is None or float(old_amount) != data.amount:
            log_audit(cursor, "billing_entries", projection_id, "client_billed_amount",
                       old_amount, data.amount, "UPDATE",
                       user["user_id"], user["role_id"], "projection", "HIGH")
        if new_invoice_month != old_invoice_month:
            log_audit(cursor, "billing_entries", projection_id, "invoice_month",
                       old_invoice_month, new_invoice_month, "UPDATE",
                       user["user_id"], user["role_id"], "projection", "MEDIUM")
        if new_financial_year != old_financial_year:
            log_audit(cursor, "billing_entries", projection_id, "financial_year",
                       old_financial_year, new_financial_year, "UPDATE",
                       user["user_id"], user["role_id"], "projection", "MEDIUM")
        if data.status != old_status:
            log_audit(cursor, "billing_entries", projection_id, "status",
                       old_status, data.status, "UPDATE",
                       user["user_id"], user["role_id"], "projection", "MEDIUM")

        if data.vendors:
            cursor.execute("SELECT vendor_id, amount FROM vendor_expenses WHERE billing_entry_id = %s", (projection_id,))
            old_vendors = cursor.fetchall()
            old_vendors_summary = "; ".join(f"vendor {v}: {a}" for v, a in old_vendors) or "none"

            cursor.execute("DELETE FROM vendor_expenses WHERE billing_entry_id = %s", (projection_id,))

            for vendor in data.vendors:
                cursor.execute("""
                    INSERT INTO vendor_expenses (billing_entry_id, vendor_id, amount)
                    VALUES (%s, %s, %s)
                """, (projection_id, vendor.vendor_id, vendor.amount))

            new_vendors_summary = "; ".join(f"vendor {v.vendor_id}: {v.amount}" for v in data.vendors) or "none"
            log_audit(cursor, "vendor_expenses", projection_id, "vendors",
                       old_vendors_summary, new_vendors_summary, "UPDATE",
                       user["user_id"], user["role_id"], "projection", "MEDIUM")

        conn.commit()
        return {"id": projection_id, "message": "Projection updated successfully"}
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error updating projection: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_connection(conn)

# NOTE: GET /projections/active used to be duplicated here, but it's shadowed
# by the identical route in projection.py (registered earlier in main.py) and
# was therefore dead code. See projection.py for the live implementation.
