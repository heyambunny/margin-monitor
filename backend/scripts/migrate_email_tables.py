"""Create the Email Center tables if they're missing. Safe to run repeatedly.

- email_issue_types: the issue templates the Email Center offers. Seeded with
  the standard set only when the table is empty, so edits made later are kept.
- email_logs: one row per recipient of every email the Email Center sends.

Run from the repo root:
    PYTHONPATH=. venv/bin/python backend/scripts/migrate_email_tables.py
"""
from backend.db import get_connection, release_connection

ISSUE_TYPES = [
    ("Billing Pending", "Reminder: Billing Pending",
     "The billing for the below invoice is still pending. Kindly process the billing and share the invoice at the earliest."),
    ("Incorrect Invoice Amount", "Invoice Correction Required",
     "The invoice amount does not match the approved billing. Kindly verify the amount and submit a revised invoice."),
    ("Incorrect Invoice Number", "Invoice Correction Required",
     "The invoice number appears to be incorrect. Kindly verify and share the corrected invoice."),
    ("Incorrect GST Details", "GST Details Correction Required",
     "The GST details mentioned in the invoice require correction. Kindly verify and submit the updated invoice."),
    ("Incorrect Billing Month", "Billing Month Correction Required",
     "The billing month mentioned in the invoice is incorrect. Kindly update it and share the revised invoice."),
    ("Missing Purchase Order", "Purchase Order Required",
     "The Purchase Order is pending. Kindly share the approved PO to proceed further."),
    ("Missing Supporting Documents", "Supporting Documents Required",
     "The supporting documents are missing. Kindly attach and resubmit them."),
    ("Credit Note Required", "Credit Note Required",
     "Kindly issue the required credit note for the invoice mentioned below."),
    ("Payment Follow-up", "Payment Follow-up",
     "This is a reminder regarding the pending payment. Kindly provide an update."),
    ("General Query", "General Query",
     "Please review the details below and provide the requested clarification."),
]


def main():
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS email_issue_types (
                issue_type_id SERIAL PRIMARY KEY,
                issue_name VARCHAR(255) NOT NULL,
                email_subject VARCHAR(255) NOT NULL,
                email_message TEXT NOT NULL,
                display_order INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("SELECT COUNT(*) FROM email_issue_types")
        if cur.fetchone()[0] == 0:
            for order, (name, subject, message) in enumerate(ISSUE_TYPES, start=1):
                cur.execute(
                    "INSERT INTO email_issue_types (issue_name, email_subject, email_message, display_order) VALUES (%s, %s, %s, %s)",
                    (name, subject, message, order),
                )
            print(f"email_issue_types: created and seeded {len(ISSUE_TYPES)} issue types")
        else:
            print("email_issue_types: already has rows, left unchanged")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS email_logs (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER NOT NULL REFERENCES billing_entries(id),
                issue_type_id INTEGER,
                recipient VARCHAR(255) NOT NULL,
                recipient_type VARCHAR(10) NOT NULL DEFAULT 'to',
                subject VARCHAR(255),
                status VARCHAR(20) NOT NULL,
                error TEXT,
                sent_by INTEGER REFERENCES users(id),
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_email_logs_invoice ON email_logs (invoice_id, sent_at DESC)")
        print("email_logs: ready")

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        release_connection(conn)


if __name__ == "__main__":
    main()
