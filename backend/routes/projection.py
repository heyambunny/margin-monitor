from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from backend.db import get_connection, release_connection, get_user_client_ids
from backend.auth.jwt_handler import require_roles
from utils.audit import log_audit
import traceback

router = APIRouter()

class VendorItem(BaseModel):
    vendor_id: int
    amount: float

class ProjectionRequest(BaseModel):
    client_id: int
    program_id: int
    category_id: int
    description: str
    amount: float
    invoice_month: str
    financial_year: str
    vendors: List[VendorItem] = []

# Add Projection - Admin (1) and Finance (2).
@router.post("/projection")
async def create_projection(data: ProjectionRequest, user: dict = Depends(require_roles(1, 2))):
    print(f"📥 Received projection request from user: {user}")
    print(f"  client_id: {data.client_id}")
    print(f"  program_id: {data.program_id}")
    print(f"  category_id: {data.category_id}")
    print(f"  description: {data.description}")
    print(f"  amount: {data.amount}")
    print(f"  invoice_month: {data.invoice_month}")
    print(f"  financial_year: {data.financial_year}")
    print(f"  vendors: {data.vendors}")

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Only let the user create projections for clients they're assigned to
        if user["role_id"] != 1:
            allowed_client_ids = get_user_client_ids(cursor, user["user_id"])
            if data.client_id not in allowed_client_ids:
                raise HTTPException(status_code=403, detail="You do not have access to this client")

        cursor.execute("SELECT id FROM expense_types WHERE expense_type_name = 'Projected'")
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=400, detail="Expense type 'Projected' not found")
        expense_type_id = result[0]

        cursor.execute("""
            INSERT INTO billing_entries
            (client_id, program_id, expense_type_id, category_id, invoice_description, client_billed_amount, invoice_month, financial_year, projection_date, status, created_by_user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE, 'Active', %s)
            RETURNING id
        """, (
            data.client_id,
            data.program_id,
            expense_type_id,
            data.category_id,
            data.description,
            data.amount,
            data.invoice_month,
            data.financial_year,
            user["user_id"]
        ))

        billing_id = cursor.fetchone()[0]
        print(f"✅ Created billing entry with ID: {billing_id}")

        for vendor in data.vendors:
            cursor.execute("""
                INSERT INTO vendor_expenses (billing_entry_id, vendor_id, amount)
                VALUES (%s, %s, %s)
            """, (billing_id, vendor.vendor_id, vendor.amount))

        log_audit(cursor, "billing_entries", billing_id, "invoice_description",
                   None, data.description, "INSERT",
                   user["user_id"], user["role_id"], "projection", "MEDIUM")
        log_audit(cursor, "billing_entries", billing_id, "client_billed_amount",
                   None, data.amount, "INSERT",
                   user["user_id"], user["role_id"], "projection", "HIGH")
        if data.vendors:
            vendors_summary = "; ".join(f"vendor {v.vendor_id}: {v.amount}" for v in data.vendors)
            log_audit(cursor, "vendor_expenses", billing_id, "vendors",
                       None, vendors_summary, "INSERT",
                       user["user_id"], user["role_id"], "projection", "MEDIUM")

        conn.commit()
        return {"id": billing_id, "message": "Projection created successfully"}

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_connection(conn)

# Used by the Convert to Billing page - Admin (1) and Finance (2).
@router.get("/projections/pending")
async def get_pending_projections(user: dict = Depends(require_roles(1, 2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        query = """
            SELECT
                b.id,
                c.client_name,
                p.program_name,
                cat.category_name,
                b.invoice_description,
                b.client_billed_amount as amount,
                b.invoice_month
            FROM billing_entries b
            JOIN clients c ON b.client_id = c.id
            JOIN programs p ON b.program_id = p.id
            JOIN categories cat ON b.category_id = cat.id
            WHERE b.invoice_no IS NULL
              AND b.status = 'Active'
              AND b.expense_type_id = 1
        """
        params = []
        if user["role_id"] != 1:
            client_ids = get_user_client_ids(cursor, user["user_id"])
            if not client_ids:
                return []
            query += " AND b.client_id = ANY(%s)"
            params.append(client_ids)
        query += " ORDER BY b.id DESC"

        cursor.execute(query, params if params else None)
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "client_name": r[1],
                "program_name": r[2],
                "category_name": r[3],
                "invoice_description": r[4] or "",
                "amount": float(r[5]) if r[5] else 0,
                "invoice_month": r[6]
            }
            for r in rows
        ]
    except Exception as e:
        print(f"❌ Error fetching pending projections: {e}")
        return []
    finally:
        release_connection(conn)

# Used by the Edit Projection page - Admin (1) and Finance (2).
@router.get("/projections/active")
async def get_active_projections(user: dict = Depends(require_roles(1, 2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        query = """
            SELECT
                b.id,
                c.client_name,
                p.program_name,
                b.client_billed_amount as amount,
                b.invoice_description as description,
                b.status
            FROM billing_entries b
            JOIN clients c ON b.client_id = c.id
            JOIN programs p ON b.program_id = p.id
            WHERE b.expense_type_id = 1
              AND b.status = 'Active'
        """
        params = []
        if user["role_id"] != 1:
            client_ids = get_user_client_ids(cursor, user["user_id"])
            if not client_ids:
                return []
            query += " AND b.client_id = ANY(%s)"
            params.append(client_ids)
        query += " ORDER BY b.id DESC"

        cursor.execute(query, params if params else None)
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "client_name": r[1],
                "program_name": r[2],
                "amount": float(r[3]) if r[3] else 0,
                "description": r[4] or "",
                "status": r[5] or "Active"
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching active projections: {e}")
        return []
    finally:
        release_connection(conn)

# Not currently called by the frontend, but scoped/gated for safety.
@router.get("/projections")
async def get_projections(user: dict = Depends(require_roles(1, 2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        query = """
            SELECT
                b.id,
                c.client_name,
                p.program_name,
                b.client_billed_amount as amount,
                b.status,
                b.invoice_no
            FROM billing_entries b
            JOIN clients c ON b.client_id = c.id
            JOIN programs p ON b.program_id = p.id
            WHERE b.expense_type_id = 1
        """
        params = []
        if user["role_id"] != 1:
            client_ids = get_user_client_ids(cursor, user["user_id"])
            if not client_ids:
                return []
            query += " AND b.client_id = ANY(%s)"
            params.append(client_ids)
        query += " ORDER BY b.id DESC"

        cursor.execute(query, params if params else None)
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "client_name": r[1],
                "program_name": r[2],
                "amount": float(r[3]) if r[3] else 0,
                "status": r[4],
                "invoice_no": r[5]
            }
            for r in rows
        ]
    finally:
        release_connection(conn)
