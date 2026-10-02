"""Shared payment maths for Receivables, Billed, Dashboard and Reports, so every
page agrees on what's been received and what's outstanding.

    due         = billed amount - credit notes
    settled     = payments received + TDS deducted
    outstanding = due - settled
"""

# LEFT JOIN this as `pay` on b.id = pay.billing_entry_id
PAYMENTS_AGG_SQL = """
    SELECT billing_entry_id,
           SUM(amount) AS received,
           SUM(tds_amount) AS tds,
           MAX(payment_date) AS last_payment_date,
           COUNT(*) AS payment_count
    FROM payments
    WHERE NOT is_deleted
    GROUP BY billing_entry_id
"""

# LEFT JOIN this as `cn` on b.id = cn.billing_entry_id
CREDIT_NOTES_AGG_SQL = """
    SELECT billing_entry_id, SUM(cn_amount) AS cn_amount
    FROM credit_notes
    GROUP BY billing_entry_id
"""

TOLERANCE = 0.5  # rupees; absorbs paise rounding


def payment_summary(billed, credit_notes, received, tds):
    billed = float(billed or 0)
    credit_notes = float(credit_notes or 0)
    received = float(received or 0)
    tds = float(tds or 0)
    due = billed - credit_notes
    settled = received + tds
    outstanding = due - settled

    if due <= TOLERANCE and settled <= 0:
        status = "No Dues"
    elif settled <= 0:
        status = "Unpaid"
    elif outstanding > TOLERANCE:
        status = "Partially Paid"
    elif outstanding < -TOLERANCE:
        status = "Overpaid"
    else:
        status = "Paid"

    return {
        "due": round(due, 2),
        "received": round(received, 2),
        "tds": round(tds, 2),
        "outstanding": round(max(outstanding, 0), 2),
        "excess": round(max(-outstanding, 0), 2),
        "payment_status": status,
    }
