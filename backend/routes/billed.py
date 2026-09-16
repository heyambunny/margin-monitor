from fastapi import APIRouter, HTTPException, Depends
from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import get_current_user

router = APIRouter()

@router.get("/billed")
async def get_billed_invoices(user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Admin sees every billed invoice. Everyone else only sees invoices
        # for clients they've been granted access to (matches the clients
        # endpoint's access model).
        if user.get("role_id") == 1:
            cursor.execute("""
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
                  AND b.invoice_no != ''
                  AND b.status != 'Deleted'
                ORDER BY b.id DESC
            """)
        else:
            cursor.execute("""
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
                JOIN user_client_access uca ON uca.client_id = c.id
                WHERE b.invoice_no IS NOT NULL
                  AND b.invoice_no != ''
                  AND b.status != 'Deleted'
                  AND uca.user_id = %s
                ORDER BY b.id DESC
            """, (user["user_id"],))

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
