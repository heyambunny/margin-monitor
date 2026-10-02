from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth.jwt_handler import require_roles
from backend.db import get_connection, release_connection, get_user_client_ids
from backend.services.receivables import PAYMENTS_AGG_SQL, CREDIT_NOTES_AGG_SQL, payment_summary
from utils.audit import log_audit

router = APIRouter()

PAYMENT_MODES = ["NEFT", "RTGS", "IMPS", "Cheque", "UPI", "Other"]

# A billed invoice: has an invoice number and isn't deleted (same rule as /billed).
BILLED_WHERE = "b.invoice_no IS NOT NULL AND b.invoice_no <> '' AND b.status <> 'Deleted'"


class PaymentIn(BaseModel):
    payment_date: date
    amount: float
    tds_amount: float = 0
    payment_mode: str
    reference_no: str
    remarks: Optional[str] = None


def _validate(data: PaymentIn):
    if data.payment_date > date.today():
        raise HTTPException(status_code=400, detail="Payment date can't be in the future")
    if data.amount < 0 or data.tds_amount < 0:
        raise HTTPException(status_code=400, detail="Amounts can't be negative")
    if data.amount + data.tds_amount <= 0:
        raise HTTPException(status_code=400, detail="Enter the amount received (and/or TDS)")
    if data.payment_mode not in PAYMENT_MODES:
        raise HTTPException(status_code=400, detail=f"Payment mode must be one of: {', '.join(PAYMENT_MODES)}")
    if not data.reference_no.strip():
        raise HTTPException(status_code=400, detail="Reference number is required")


def _check_access(cursor, user, client_id):
    if user["role_id"] != 1 and client_id not in get_user_client_ids(cursor, user["user_id"]):
        raise HTTPException(status_code=403, detail="You do not have access to this client")


def _billed_entry(cursor, entry_id):
    cursor.execute(f"SELECT b.id, b.client_id, b.invoice_no FROM billing_entries b WHERE b.id = %s AND {BILLED_WHERE}", (entry_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Billed invoice not found")
    return row


def _payment(cursor, payment_id):
    cursor.execute("""
        SELECT p.id, p.billing_entry_id, b.client_id, p.payment_date, p.amount, p.tds_amount,
               p.payment_mode, p.reference_no, p.remarks
        FROM payments p JOIN billing_entries b ON b.id = p.billing_entry_id
        WHERE p.id = %s AND NOT p.is_deleted
    """, (payment_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")
    return row


# Receivables list - Admin (1) and Finance (2).
@router.get("/receivables")
def list_receivables(user: dict = Depends(require_roles(1, 2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        query = f"""
            SELECT b.id, b.invoice_no, b.invoice_date, b.invoice_month, c.client_name, p.program_name,
                   b.client_billed_amount, cn.cn_amount, pay.received, pay.tds,
                   pay.last_payment_date, COALESCE(pay.payment_count, 0)
            FROM billing_entries b
            JOIN clients c ON c.id = b.client_id
            JOIN programs p ON p.id = b.program_id
            LEFT JOIN ({CREDIT_NOTES_AGG_SQL}) cn ON cn.billing_entry_id = b.id
            LEFT JOIN ({PAYMENTS_AGG_SQL}) pay ON pay.billing_entry_id = b.id
            WHERE {BILLED_WHERE}
        """
        params = []
        if user["role_id"] != 1:
            client_ids = get_user_client_ids(cursor, user["user_id"])
            if not client_ids:
                return []
            query += " AND b.client_id = ANY(%s)"
            params.append(client_ids)
        query += " ORDER BY b.invoice_date DESC NULLS LAST, b.id DESC"
        cursor.execute(query, params or None)

        today = date.today()
        out = []
        for r in cursor.fetchall():
            s = payment_summary(r[6], r[7], r[8], r[9])
            out.append({
                "id": r[0],
                "invoice_no": r[1],
                "invoice_date": r[2].isoformat() if r[2] else None,
                "invoice_month": r[3],
                "client_name": r[4],
                "program_name": r[5],
                "billed_amount": float(r[6] or 0),
                "credit_notes": float(r[7] or 0),
                "last_payment_date": r[10].isoformat() if r[10] else None,
                "payment_count": r[11],
                "days_since_invoice": (today - r[2]).days if r[2] else None,
                **s,
            })
        return out
    finally:
        release_connection(conn)


@router.get("/receivables/{entry_id}/payments")
def list_payments(entry_id: int, user: dict = Depends(require_roles(1, 2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        _, client_id, _ = _billed_entry(cursor, entry_id)
        _check_access(cursor, user, client_id)
        cursor.execute("""
            SELECT p.id, p.payment_date, p.amount, p.tds_amount, p.payment_mode, p.reference_no, p.remarks,
                   u.name, p.created_at, uu.name, p.updated_at
            FROM payments p
            LEFT JOIN users u ON u.id = p.created_by
            LEFT JOIN users uu ON uu.id = p.updated_by
            WHERE p.billing_entry_id = %s AND NOT p.is_deleted
            ORDER BY p.payment_date DESC, p.id DESC
        """, (entry_id,))
        return [
            {
                "id": r[0],
                "payment_date": r[1].isoformat(),
                "amount": float(r[2]),
                "tds_amount": float(r[3]),
                "payment_mode": r[4],
                "reference_no": r[5],
                "remarks": r[6],
                "recorded_by": r[7],
                "recorded_at": r[8].isoformat() if r[8] else None,
                "updated_by": r[9],
                "updated_at": r[10].isoformat() if r[10] else None,
            }
            for r in cursor.fetchall()
        ]
    finally:
        release_connection(conn)


@router.post("/receivables/{entry_id}/payments")
def record_payment(entry_id: int, data: PaymentIn, user: dict = Depends(require_roles(1, 2))):
    _validate(data)
    conn = get_connection()
    try:
        cursor = conn.cursor()
        _, client_id, invoice_no = _billed_entry(cursor, entry_id)
        _check_access(cursor, user, client_id)
        cursor.execute("""
            INSERT INTO payments (billing_entry_id, payment_date, amount, tds_amount, payment_mode, reference_no, remarks, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (entry_id, data.payment_date, data.amount, data.tds_amount, data.payment_mode,
              data.reference_no.strip(), (data.remarks or '').strip() or None, user["user_id"]))
        payment_id = cursor.fetchone()[0]
        log_audit(cursor, "payments", payment_id, "payment",
                  None,
                  f"Invoice {invoice_no} (entry #{entry_id}): {data.amount} received"
                  + (f" + {data.tds_amount} TDS" if data.tds_amount else "")
                  + f" on {data.payment_date} via {data.payment_mode}, ref {data.reference_no.strip()}",
                  "INSERT", user["user_id"], user["role_id"], "receivables", "HIGH")
        conn.commit()
        return {"id": payment_id, "message": "Payment recorded"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error recording payment for entry {entry_id}: {e}")
        raise HTTPException(status_code=500, detail="Couldn't record the payment")
    finally:
        release_connection(conn)


@router.put("/payments/{payment_id}")
def update_payment(payment_id: int, data: PaymentIn, user: dict = Depends(require_roles(1, 2))):
    _validate(data)
    conn = get_connection()
    try:
        cursor = conn.cursor()
        old = _payment(cursor, payment_id)
        _check_access(cursor, user, old[2])
        new = (data.payment_date, data.amount, data.tds_amount, data.payment_mode,
               data.reference_no.strip(), (data.remarks or '').strip() or None)
        cursor.execute("""
            UPDATE payments
            SET payment_date = %s, amount = %s, tds_amount = %s, payment_mode = %s, reference_no = %s, remarks = %s,
                updated_by = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (*new, user["user_id"], payment_id))
        names = ["payment_date", "amount", "tds_amount", "payment_mode", "reference_no", "remarks"]
        for name, before, after in zip(names, old[3:9], new):
            same = (float(before) == float(after)) if name in ("amount", "tds_amount") else (before == after)
            if not same:
                log_audit(cursor, "payments", payment_id, name, before, after, "UPDATE",
                          user["user_id"], user["role_id"], "receivables", "HIGH" if name in ("amount", "tds_amount") else "MEDIUM")
        conn.commit()
        return {"id": payment_id, "message": "Payment updated"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error updating payment {payment_id}: {e}")
        raise HTTPException(status_code=500, detail="Couldn't update the payment")
    finally:
        release_connection(conn)


@router.delete("/payments/{payment_id}")
def delete_payment(payment_id: int, user: dict = Depends(require_roles(1, 2))):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        old = _payment(cursor, payment_id)
        _check_access(cursor, user, old[2])
        cursor.execute(
            "UPDATE payments SET is_deleted = TRUE, updated_by = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (user["user_id"], payment_id),
        )
        log_audit(cursor, "payments", payment_id, "payment",
                  f"{old[4]} received + {old[5]} TDS on {old[3]} via {old[6]}, ref {old[7]} (entry #{old[1]})",
                  None, "DELETE", user["user_id"], user["role_id"], "receivables", "HIGH")
        conn.commit()
        return {"id": payment_id, "message": "Payment deleted"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error deleting payment {payment_id}: {e}")
        raise HTTPException(status_code=500, detail="Couldn't delete the payment")
    finally:
        release_connection(conn)
