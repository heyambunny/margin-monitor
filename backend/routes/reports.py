from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import get_current_user
from backend.services.receivables import PAYMENTS_AGG_SQL, payment_summary

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

@router.get("/reports")
def get_reports(token: str = Depends(oauth2_scheme)):

    user = get_current_user(token)
    user_id = user["user_id"]
    role_id = user["role_id"]

    conn = get_connection()

    try:
        cursor = conn.cursor()

        # ---------------- QUERY ----------------
        query = f"""
        SELECT
            b.id,
            c.client_name,
            p.program_name,
            et.expense_type_name,
            b.invoice_month,
            b.financial_year,
            b.funnel_number,
            b.invoice_no,
            b.invoice_date,
            cat.category_name,
            b.invoice_description,
            b.client_billed_amount,
            b.projection_date,
            u.name AS created_by,

            MAX(CASE WHEN ve.row_num = 1 THEN v.vendor_name END) AS vendor1name,
            MAX(CASE WHEN ve.row_num = 1 THEN ve.amount END) AS vendor1amount,

            MAX(CASE WHEN ve.row_num = 2 THEN v.vendor_name END) AS vendor2name,
            MAX(CASE WHEN ve.row_num = 2 THEN ve.amount END) AS vendor2amount,

            MAX(CASE WHEN ve.row_num = 3 THEN v.vendor_name END) AS vendor3name,
            MAX(CASE WHEN ve.row_num = 3 THEN ve.amount END) AS vendor3amount,

            MAX(CASE WHEN ve.row_num = 4 THEN v.vendor_name END) AS vendor4name,
            MAX(CASE WHEN ve.row_num = 4 THEN ve.amount END) AS vendor4amount,

            MAX(CASE WHEN ve.row_num = 5 THEN v.vendor_name END) AS vendor5name,
            MAX(CASE WHEN ve.row_num = 5 THEN ve.amount END) AS vendor5amount,

            COALESCE(v_total.total_vendor,0) AS total_vendor,
            COALESCE(cn_total.total_cn,0) AS total_credit_note,

            (
                b.client_billed_amount
                - COALESCE(v_total.total_vendor,0)
                - COALESCE(cn_total.total_cn,0)
            ) AS gross_margin,

            b.status,
            b.reason,
            (b.invoice_no IS NOT NULL AND b.invoice_no <> '') AS is_billed,
            pay.received AS received,
            pay.tds AS tds_received,
            pay.last_payment_date

        FROM billing_entries b

        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN programs p ON b.program_id = p.id
        LEFT JOIN categories cat ON b.category_id = cat.id
        LEFT JOIN expense_types et ON b.expense_type_id = et.id
        LEFT JOIN users u ON b.created_by_user_id = u.id

        LEFT JOIN (
            SELECT
                billing_entry_id,
                vendor_id,
                amount,
                ROW_NUMBER() OVER (
                    PARTITION BY billing_entry_id
                    ORDER BY id
                ) AS row_num
            FROM vendor_expenses
        ) ve ON b.id = ve.billing_entry_id

        LEFT JOIN vendors v ON ve.vendor_id = v.id

        LEFT JOIN (
            SELECT billing_entry_id, SUM(amount) AS total_vendor
            FROM vendor_expenses
            GROUP BY billing_entry_id
        ) v_total ON b.id = v_total.billing_entry_id

        LEFT JOIN ({PAYMENTS_AGG_SQL}) pay ON pay.billing_entry_id = b.id
        LEFT JOIN (
            SELECT billing_entry_id, SUM(cn_amount) AS total_cn
            FROM credit_notes
            GROUP BY billing_entry_id
        ) cn_total ON b.id = cn_total.billing_entry_id
        """

        params = []

        # Exclude soft-deleted entries - matches /api/dashboard, /api/billed, etc.
        query += " WHERE b.status != 'Deleted'"

        # ---------------- ACCESS CONTROL ----------------
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

        query += """
        GROUP BY
            b.id,
            c.client_name,
            p.program_name,
            et.expense_type_name,
            cat.category_name,
            u.name,
            v_total.total_vendor,
            cn_total.total_cn,
            pay.received,
            pay.tds,
            pay.last_payment_date
        ORDER BY b.id DESC
        """

        cursor.execute(query, params if params else None)

        columns = [desc[0] for desc in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        for row in data:
            if row["is_billed"]:
                summary = payment_summary(row["client_billed_amount"], row["total_credit_note"], row["received"], row["tds_received"])
                row.update(received=summary["received"], tds_received=summary["tds"],
                           outstanding=summary["outstanding"], payment_status=summary["payment_status"])
            else:
                row.update(received=None, tds_received=None, outstanding=None, payment_status=None)

        return data

    finally:
        release_connection(conn)