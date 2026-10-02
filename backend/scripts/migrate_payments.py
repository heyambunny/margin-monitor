"""Create the payments table used by Receivables. Safe to run repeatedly.

One row per payment received against a billed invoice (billing_entries row).
An invoice can have several (partial) payments. Deleting a payment only marks
it is_deleted so the history and audit trail stay intact.

Run from the repo root:
    PYTHONPATH=. venv/bin/python backend/scripts/migrate_payments.py
"""
from backend.db import get_connection, release_connection


def main():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                billing_entry_id INTEGER NOT NULL REFERENCES billing_entries(id),
                payment_date DATE NOT NULL,
                amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
                tds_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tds_amount >= 0),
                payment_mode VARCHAR(20) NOT NULL,
                reference_no VARCHAR(100) NOT NULL,
                remarks TEXT,
                is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_by INTEGER REFERENCES users(id),
                updated_at TIMESTAMP,
                CHECK (amount + tds_amount > 0)
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_payments_entry ON payments (billing_entry_id) WHERE NOT is_deleted")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (payment_date) WHERE NOT is_deleted")
        conn.commit()
        print("payments: ready")
    except Exception:
        conn.rollback()
        raise
    finally:
        release_connection(conn)


if __name__ == "__main__":
    main()
