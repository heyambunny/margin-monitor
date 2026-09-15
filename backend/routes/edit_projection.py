from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from backend.db import get_connection, release_connection, get_user_client_ids
from backend.auth.jwt_handler import require_roles

router = APIRouter()

class VendorItem(BaseModel):
    vendor_id: int
    amount: float

class EditProjectionRequest(BaseModel):
    description: str
    amount: float
    status: str
    vendors: List[VendorItem] = []

# Edit Projection - Finance (2) only, matching the old app's tab structure.
@router.post("/edit-projection/{projection_id}")
async def edit_projection(projection_id: int, data: EditProjectionRequest, user: dict = Depends(require_roles(2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Only let the user edit projections for clients they're assigned to
        if user["role_id"] != 1:
            cursor.execute("SELECT client_id FROM billing_entries WHERE id = %s", (projection_id,))
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Projection not found")
            allowed_client_ids = get_user_client_ids(cursor, user["user_id"])
            if existing[0] not in allowed_client_ids:
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

        if data.vendors:
            cursor.execute("DELETE FROM vendor_expenses WHERE billing_entry_id = %s", (projection_id,))
            
            for vendor in data.vendors:
                cursor.execute("""
                    INSERT INTO vendor_expenses (billing_entry_id, vendor_id, amount)
                    VALUES (%s, %s, %s)
                """, (projection_id, vendor.vendor_id, vendor.amount))
        
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
