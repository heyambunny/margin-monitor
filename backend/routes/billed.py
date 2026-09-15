from fastapi import APIRouter, HTTPException, Depends
from backend.db import get_connection, release_connection, get_user_client_ids
from backend.auth.jwt_handler import require_roles

router = APIRouter()

# Billed - Finance (2) only, matching the old app's tab structure.
@router.get("/billed")
async def get_billed_invoices(user: dict = Depends(require_roles(2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        query = """
            SELECT
                b.id,
                b.invoice_no,
                c.client_name,
                p.program_name,
                b.client_billed_amount as amount,
                b.invoice_month,
                b.invoice_date,
                b.status
            FROM billing_entries b
            JOIN clients c ON b.client_id = c.id
            JOIN programs p ON b.program_id = p.id
            WHERE b.invoice_no IS NOT NULL
              AND b.status = 'Billed'
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
                "invoice_no": r[1],
                "client_name": r[2],
                "program_name": r[3],
                "amount": float(r[4]) if r[4] else 0,
                "invoice_month": r[5],
                "invoice_date": r[6].strftime("%Y-%m-%d") if r[6] else None,
                "status": r[7] or "Billed"
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching billed invoices: {e}")
        return []
    finally:
        release_connection(conn)
