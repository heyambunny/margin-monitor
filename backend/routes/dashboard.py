from fastapi import APIRouter, Depends
from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import require_roles

router = APIRouter()

# Main margin/revenue Dashboard - Admin (1) and Supervisor (3) only.
# Finance users get the Finance Dashboard (pending billing) as their home page instead.
@router.get("/dashboard")
def get_dashboard(user: dict = Depends(require_roles(1, 3))):
    user_id = user["user_id"]
    role_id = user["role_id"]

    conn = get_connection()

    try:
        cursor = conn.cursor()

        # Query with vendor_cost calculated from vendor_expenses
        query = """
        SELECT
            b.id,
            b.client_id,
            c.client_name,
            b.client_billed_amount,
            b.invoice_month,
            b.financial_year,
            b.expense_type_id,
            COALESCE(ve.total_vendor, 0) AS vendor_cost,
            COALESCE(ve.vendor_name, '') AS vendor_name,
            COALESCE(cn.cn_amount, 0) AS credit_note,
            b.invoice_description,
            b.status
        FROM billing_entries b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN (
            SELECT
                ve.billing_entry_id,
                SUM(ve.amount) AS total_vendor,
                STRING_AGG(DISTINCT v.vendor_name, ', ') AS vendor_name
            FROM vendor_expenses ve
            LEFT JOIN vendors v
                ON ve.vendor_id = v.id
            GROUP BY ve.billing_entry_id
        ) ve ON b.id = ve.billing_entry_id
        LEFT JOIN credit_notes cn ON b.id = cn.billing_entry_id
        WHERE b.status != 'Deleted'
        """

        params = []

        # Role-based filter
        if role_id != 1:
            cursor.execute(
                "SELECT client_id FROM user_client_access WHERE user_id = %s",
                (user_id,)
            )
            client_ids = [r[0] for r in cursor.fetchall()]

            if not client_ids:
                return []

            query += " AND b.client_id = ANY(%s)"
            params.append(client_ids)

        cursor.execute(query, params if params else None)

        cols = [desc[0] for desc in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        return data

    except Exception as e:
        print(f"Dashboard error: {e}")
        return []
    finally:
        release_connection(conn)
