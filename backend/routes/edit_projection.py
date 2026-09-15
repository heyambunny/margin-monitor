from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
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
    vendors: List[VendorItem] = []

# Edit Projection - Admin (1) and Finance (2).
@router.post("/edit-projection/{projection_id}")
async def edit_projection(projection_id: int, data: EditProjectionRequest, user: dict = Depends(require_roles(1, 2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT client_id, invoice_description, client_billed_amount, status FROM billing_entries WHERE id = %s",
            (projection_id,)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Projection not found")
        old_client_id, old_description, old_amount, old_status = existing

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
                status = %s
            WHERE id = %s
            RETURNING id
        """, (
            data.description,
            data.amount,
            data.status,
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
