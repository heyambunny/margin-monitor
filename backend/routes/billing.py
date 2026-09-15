from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.db import get_connection, release_connection, get_user_client_ids
from backend.auth.jwt_handler import require_roles
from datetime import datetime

router = APIRouter()

class ConvertBillingRequest(BaseModel):
    projection_id: int
    amount: float
    status: str = "Active"
    delete_reason: Optional[str] = None
    funnel_number: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_date: str
    vendors: List[dict] = []

# Convert to Billing - Finance (2) only, matching the old app's tab structure.
@router.post("/billing/convert/{projection_id}")
async def convert_to_billing(projection_id: int, data: ConvertBillingRequest, user: dict = Depends(require_roles(2))):
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

        # Only let the user convert projections for clients they're assigned to
        if user["role_id"] != 1:
            allowed_client_ids = get_user_client_ids(cursor, user["user_id"])
            if result[2] not in allowed_client_ids:
                raise HTTPException(status_code=403, detail="You do not have access to this client")

        # Update the projection to Billed status
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
        
        updated_id = cursor.fetchone()
        if not updated_id:
            raise HTTPException(status_code=400, detail="Failed to update projection")
        
        # Update vendors if provided
        if data.vendors:
            # Delete existing vendors
            cursor.execute("DELETE FROM vendor_expenses WHERE billing_entry_id = %s", (projection_id,))
            
            # Insert new vendors
            for vendor in data.vendors:
                cursor.execute("""
                    INSERT INTO vendor_expenses (billing_entry_id, vendor_id, amount)
                    VALUES (%s, %s, %s)
                """, (projection_id, vendor.get("vendor_id"), vendor.get("amount")))
        
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
