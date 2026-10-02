from fastapi import APIRouter, HTTPException, Depends
from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import get_current_user, require_admin
from utils.audit import log_audit
from backend.services.receivables import PAYMENTS_AGG_SQL, CREDIT_NOTES_AGG_SQL, payment_summary

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
            cursor.execute(f"""
                SELECT
                    b.id,
                    b.invoice_no,
                    c.client_name,
                    p.program_name,
                    b.client_billed_amount as amount,
                    b.invoice_month,
                    b.invoice_date,
                    b.status,
                    cn.cn_amount,
                    pay.received,
                    pay.tds,
                    pay.last_payment_date
                FROM billing_entries b
                JOIN clients c ON b.client_id = c.id
                JOIN programs p ON b.program_id = p.id
                LEFT JOIN ({CREDIT_NOTES_AGG_SQL}) cn ON cn.billing_entry_id = b.id
                LEFT JOIN ({PAYMENTS_AGG_SQL}) pay ON pay.billing_entry_id = b.id
                WHERE b.invoice_no IS NOT NULL
                  AND b.invoice_no != ''
                  AND b.status != 'Deleted'
                ORDER BY b.id DESC
            """)
        else:
            cursor.execute(f"""
                SELECT
                    b.id,
                    b.invoice_no,
                    c.client_name,
                    p.program_name,
                    b.client_billed_amount as amount,
                    b.invoice_month,
                    b.invoice_date,
                    b.status,
                    cn.cn_amount,
                    pay.received,
                    pay.tds,
                    pay.last_payment_date
                FROM billing_entries b
                JOIN clients c ON b.client_id = c.id
                JOIN programs p ON b.program_id = p.id
                LEFT JOIN ({CREDIT_NOTES_AGG_SQL}) cn ON cn.billing_entry_id = b.id
                LEFT JOIN ({PAYMENTS_AGG_SQL}) pay ON pay.billing_entry_id = b.id
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
                "status": r[7] or "Billed",
                "credit_notes": float(r[8] or 0),
                "last_payment_date": r[11].isoformat() if r[11] else None,
                **payment_summary(r[4], r[8], r[9], r[10]),
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching billed invoices: {e}")
        return []
    finally:
        release_connection(conn)


# Undo a billing: Admin only. Puts the entry back to projected so it shows
# up in Convert to Billing again, and frees its invoice number. "Billed" is
# recorded in two places - status 'Billed' (Convert to Billing) and expense
# type 'Billed' (older entries) - so both are reset. The billed amount and
# vendor expenses are kept as they are.
@router.post("/billed/{entry_id}/unbill")
async def unbill_invoice(entry_id: int, user: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT status, invoice_no, invoice_date, funnel_number, expense_type_id
            FROM billing_entries
            WHERE id = %s
              AND invoice_no IS NOT NULL
              AND invoice_no != ''
              AND status != 'Deleted'
            FOR UPDATE
        """, (entry_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Billed invoice not found")
        old_status, old_invoice_no, old_invoice_date, old_funnel_number, old_expense_type_id = row

        # Money received must stay attached to an invoice: remove payments first.
        cursor.execute("SELECT COUNT(*) FROM payments WHERE billing_entry_id = %s AND NOT is_deleted", (entry_id,))
        if cursor.fetchone()[0] > 0:
            raise HTTPException(
                status_code=400,
                detail="This invoice has payments recorded against it. Delete them in Receivables before moving it back to projected.",
            )

        cursor.execute("SELECT id FROM expense_types WHERE expense_type_name = 'Projected'")
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=400, detail="Expense type 'Projected' not found")
        projected_type_id = result[0]

        cursor.execute("""
            UPDATE billing_entries
            SET status = 'Active',
                expense_type_id = %s,
                invoice_no = NULL,
                invoice_date = NULL,
                funnel_number = NULL
            WHERE id = %s
        """, (projected_type_id, entry_id))

        if old_status != 'Active':
            log_audit(cursor, "billing_entries", entry_id, "status",
                       old_status, "Active", "UPDATE",
                       user["user_id"], user["role_id"], "billing", "HIGH")
        if old_expense_type_id != projected_type_id:
            log_audit(cursor, "billing_entries", entry_id, "expense_type_id",
                       old_expense_type_id, projected_type_id, "UPDATE",
                       user["user_id"], user["role_id"], "billing", "HIGH")
        log_audit(cursor, "billing_entries", entry_id, "invoice_no",
                   old_invoice_no, None, "UPDATE",
                   user["user_id"], user["role_id"], "billing", "HIGH")
        if old_invoice_date is not None:
            log_audit(cursor, "billing_entries", entry_id, "invoice_date",
                       old_invoice_date, None, "UPDATE",
                       user["user_id"], user["role_id"], "billing", "MEDIUM")
        if old_funnel_number:
            log_audit(cursor, "billing_entries", entry_id, "funnel_number",
                       old_funnel_number, None, "UPDATE",
                       user["user_id"], user["role_id"], "billing", "MEDIUM")

        conn.commit()
        return {"id": entry_id, "message": f"Invoice {old_invoice_no} moved back to projected"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error unbilling entry {entry_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_connection(conn)
