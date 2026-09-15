from backend.db import get_connection, release_connection
from backend.services.template_service import render_invoice_email
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_NAME = os.getenv("SMTP_NAME", "Billing Team")

def get_invoice_email_details(invoice_id: int):
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute("""
            SELECT
                b.id,
                b.invoice_no,
                b.invoice_date,
                b.invoice_month,
                b.client_billed_amount,
                b.invoice_description,
                b.status,
                b.client_id,
                b.program_id,
                c.client_name,
                p.program_name
            FROM billing_entries b
            INNER JOIN clients c ON c.id = b.client_id
            INNER JOIN programs p ON p.id = b.program_id
            WHERE b.id = %s
        """, (invoice_id,))

        invoice = cur.fetchone()
        if not invoice:
            return None

        (
            billing_id,
            invoice_no,
            invoice_date,
            invoice_month,
            invoice_amount,
            invoice_description,
            invoice_status,
            client_id,
            program_id,
            client_name,
            program_name
        ) = invoice

        # TO Recipients (Role ID = 2)
        cur.execute("""
            SELECT u.id, u.name, u.email
            FROM user_client_access uca
            INNER JOIN users u ON u.id = uca.user_id
            WHERE uca.client_id = %s AND u.role_id = 2 AND u.is_active = TRUE
            ORDER BY u.name
        """, (client_id,))

        to_users = []
        for row in cur.fetchall():
            to_users.append({"id": row[0], "name": row[1], "email": row[2]})

        # CC Users (Role ID = 3 - Supervisors)
        cur.execute("""
            SELECT u.id, u.name, u.email
            FROM user_client_access uca
            INNER JOIN users u ON u.id = uca.user_id
            WHERE uca.client_id = %s AND u.role_id = 3 AND u.is_active = TRUE
            ORDER BY u.name
        """, (client_id,))

        cc_users = []
        for row in cur.fetchall():
            cc_users.append({"id": row[0], "name": row[1], "email": row[2]})

        # Default CC
        default_cc = {"id": -1, "name": "Abhishek Sharma", "email": "abhisheks@evolvebrands.com"}
        if not any(user["email"] == default_cc["email"] for user in cc_users):
            cc_users.append(default_cc)

        # Issue Types
        cur.execute("""
            SELECT issue_type_id, issue_name, email_subject, email_message
            FROM email_issue_types
            WHERE is_active = TRUE
            ORDER BY display_order
        """)

        issue_types = []
        for row in cur.fetchall():
            issue_types.append({
                "id": row[0],
                "name": row[1],
                "subject": row[2],
                "message": row[3]
            })

        return {
            "invoice": {
                "id": billing_id,
                "invoice_no": invoice_no,
                "invoice_date": str(invoice_date),
                "invoice_month": invoice_month,
                "invoice_amount": float(invoice_amount),
                "invoice_description": invoice_description,
                "status": invoice_status
            },
            "client": {"id": client_id, "name": client_name},
            "program": {"id": program_id, "name": program_name},
            "to": to_users,
            "cc": cc_users,
            "issue_types": issue_types
        }

    except Exception as e:
        raise e
    finally:
        cur.close()
        release_connection(conn)

def generate_email_preview(invoice_id: int, issue_type_id: int, remarks: str):
    data = get_invoice_email_details(invoice_id)
    if not data:
        return None

    selected_issue = None
    for issue in data["issue_types"]:
        if issue["id"] == issue_type_id:
            selected_issue = issue
            break

    if not selected_issue:
        raise Exception("Invalid issue type.")

    context = {
        "subject": selected_issue["subject"],
        "recipient_name": "Team",
        "message": selected_issue["message"],
        "client_name": data["client"]["name"],
        "program_name": data["program"]["name"],
        "invoice_no": data["invoice"]["invoice_no"],
        "invoice_date": data["invoice"]["invoice_date"],
        "invoice_amount": "{:,.2f}".format(data["invoice"]["invoice_amount"]),
        "invoice_month": data["invoice"]["invoice_month"],
        "remarks": remarks
    }

    html = render_invoice_email("invoice_email.html", context)

    return {
        "subject": selected_issue["subject"],
        "html": html,
        "to": data["to"],
        "cc": data["cc"]
    }

def send_invoice_email(invoice_id: int, issue_type_id: int, remarks: str):
    preview = generate_email_preview(invoice_id, issue_type_id, remarks)
    if not preview:
        return {"success": False, "message": "Invoice not found."}

    to_emails = [user["email"] for user in preview["to"]]
    cc_emails = [user["email"] for user in preview["cc"]]

    message = MIMEMultipart("alternative")
    message["Subject"] = preview["subject"]
    message["From"] = f"{SMTP_NAME} <{SMTP_EMAIL}>"
    message["To"] = ", ".join(to_emails)
    if cc_emails:
        message["Cc"] = ", ".join(cc_emails)

    message.attach(MIMEText(preview["html"], "html"))
    recipients = to_emails + cc_emails

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, recipients, message.as_string())

        return {"success": True, "message": "Email sent successfully."}
    except Exception as e:
        return {"success": False, "message": str(e)}
