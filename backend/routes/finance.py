from fastapi import APIRouter, Depends

from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import require_roles

router = APIRouter()


# Finance Dashboard (pending billing) - Admin (1) and Finance (2) only.
# Supervisors don't have this page in the old app; they use the main Dashboard instead.
@router.get("/finance-dashboard")
def finance_dashboard(user: dict = Depends(require_roles(1, 2))):

    user_id = user["user_id"]
    role_id = user["role_id"]

    conn = get_connection()

    try:
        cursor = conn.cursor()

        query = """
        SELECT
            b.id,
            c.client_name,
            p.program_name,
            cat.category_name,
            b.client_billed_amount,
            b.invoice_month,
            b.financial_year,
            b.status,
            b.expense_type_id
        FROM billing_entries b
        JOIN clients c ON b.client_id = c.id
        JOIN programs p ON b.program_id = p.id
        JOIN categories cat ON b.category_id = cat.id
        WHERE b.status = 'Active'
        """

        params = []

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

    finally:
        release_connection(conn)