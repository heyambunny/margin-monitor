from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import require_admin
import pandas as pd
import io
import json

router = APIRouter()

def clean_nan(value):
    """Convert NaN to None for JSON serialization"""
    if pd.isna(value):
        return None
    return value

@router.post("/bulk-upload-preview")
async def bulk_upload_preview(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        validation = []
        
        for idx, row in df.iterrows():
            errors = []
            
            # Clean data - replace NaN with None for display
            clean_row = {}
            for col in df.columns:
                clean_row[col] = clean_nan(row.get(col))
            
            # Validate Client
            client_val = clean_row.get('Client')
            if not client_val:
                errors.append("Client is required")
            else:
                cursor.execute("SELECT id FROM clients WHERE client_name = %s", (client_val,))
                if not cursor.fetchone():
                    errors.append(f"Client '{client_val}' not found")
            
            # Validate Program
            program_val = clean_row.get('Program')
            if not program_val:
                errors.append("Program is required")
            else:
                cursor.execute("SELECT id FROM programs WHERE program_name = %s", (program_val,))
                if not cursor.fetchone():
                    errors.append(f"Program '{program_val}' not found")
            
            # Validate Category
            category_val = clean_row.get('Category')
            if not category_val:
                errors.append("Category is required")
            else:
                cursor.execute("SELECT id FROM categories WHERE category_name = %s", (category_val,))
                if not cursor.fetchone():
                    errors.append(f"Category '{category_val}' not found")
            
            # Validate InvoiceMonth
            month_val = clean_row.get('InvoiceMonth')
            if not month_val:
                errors.append("InvoiceMonth is required")
            
            # Validate ClientBilledAmount
            amount_val = clean_row.get('ClientBilledAmount')
            if amount_val is None:
                errors.append("ClientBilledAmount is required")
            else:
                try:
                    float(amount_val)
                except:
                    errors.append(f"Invalid amount '{amount_val}'")
            
            # Validate Projection Added By
            user_val = clean_row.get('Projection Added By')
            if not user_val:
                errors.append("Projection Added By is required")
            else:
                cursor.execute("SELECT id FROM users WHERE name = %s", (user_val,))
                if not cursor.fetchone():
                    errors.append(f"User '{user_val}' not found")
            
            validation.append({
                "row": idx + 1,
                "data": {
                    "Client": clean_row.get('Client', ''),
                    "Program": clean_row.get('Program', ''),
                    "Category": clean_row.get('Category', ''),
                    "InvoiceMonth": clean_row.get('InvoiceMonth', ''),
                    "ClientBilledAmount": clean_row.get('ClientBilledAmount', ''),
                    "Projection Added By": clean_row.get('Projection Added By', '')
                },
                "status": "error" if errors else "valid",
                "error": errors[0] if errors else ""
            })
        
        release_connection(conn)
        
        # Convert data to clean dicts
        clean_data = []
        for idx, row in df.iterrows():
            clean_row = {}
            for col in df.columns:
                clean_row[col] = clean_nan(row.get(col))
            clean_data.append(clean_row)
        
        return {
            "data": clean_data,
            "validation": validation
        }
        
    except Exception as e:
        print(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-upload")
async def bulk_upload(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        inserted = 0
        failed = 0
        errors = []
        
        cursor.execute("SELECT id FROM expense_types WHERE expense_type_name = 'Projected'")
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=400, detail="Expense type 'Projected' not found")
        expense_type_id = result[0]
        
        for idx, row in df.iterrows():
            try:
                # Clean NaN values
                client = clean_nan(row.get('Client'))
                program = clean_nan(row.get('Program'))
                category = clean_nan(row.get('Category'))
                invoice_month = clean_nan(row.get('InvoiceMonth'))
                amount = clean_nan(row.get('ClientBilledAmount'))
                user_name = clean_nan(row.get('Projection Added By'))
                description = clean_nan(row.get('InvoiceDescription'))
                
                if not client or not program or not category or not invoice_month or amount is None or not user_name:
                    errors.append(f"Row {idx+2}: Missing required fields")
                    failed += 1
                    continue
                
                # Get client
                cursor.execute("SELECT id FROM clients WHERE client_name = %s", (client,))
                client_result = cursor.fetchone()
                if not client_result:
                    errors.append(f"Row {idx+2}: Client '{client}' not found")
                    failed += 1
                    continue
                client_id = client_result[0]
                
                # Get program
                cursor.execute("SELECT id FROM programs WHERE program_name = %s", (program,))
                program_result = cursor.fetchone()
                if not program_result:
                    errors.append(f"Row {idx+2}: Program '{program}' not found")
                    failed += 1
                    continue
                program_id = program_result[0]
                
                # Get category
                cursor.execute("SELECT id FROM categories WHERE category_name = %s", (category,))
                category_result = cursor.fetchone()
                if not category_result:
                    errors.append(f"Row {idx+2}: Category '{category}' not found")
                    failed += 1
                    continue
                category_id = category_result[0]
                
                # Get user
                cursor.execute("SELECT id FROM users WHERE name = %s", (user_name,))
                user_result = cursor.fetchone()
                if not user_result:
                    errors.append(f"Row {idx+2}: User '{user_name}' not found")
                    failed += 1
                    continue
                
                try:
                    amount_float = float(amount)
                except:
                    errors.append(f"Row {idx+2}: Invalid amount '{amount}'")
                    failed += 1
                    continue
                
                # Calculate financial year
                try:
                    month_part = invoice_month.split('-')[0]
                    year_part = invoice_month.split('-')[1]
                    year = int('20' + year_part)
                    
                    if month_part in ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']:
                        financial_year = f"FY {year}-{year + 1}"
                    else:
                        financial_year = f"FY {year - 1}-{year}"
                except:
                    financial_year = "FY 2025-26"
                
                cursor.execute("""
                    INSERT INTO billing_entries
                    (client_id, program_id, expense_type_id, category_id, invoice_description, client_billed_amount, invoice_month, financial_year, projection_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE, 'Active')
                    RETURNING id
                """, (
                    client_id,
                    program_id,
                    expense_type_id,
                    category_id,
                    description or '',
                    amount_float,
                    invoice_month,
                    financial_year
                ))
                
                billing_id = cursor.fetchone()[0]
                
                # Insert vendors
                for v in range(1, 6):
                    vendor_col = f'Vendor{v}Name'
                    amount_col = f'Vendor{v}Amount'
                    
                    vendor_name = clean_nan(row.get(vendor_col)) if vendor_col in df.columns else None
                    vendor_amount = clean_nan(row.get(amount_col)) if amount_col in df.columns else None
                    
                    if vendor_name and vendor_amount:
                        try:
                            vendor_amount_float = float(vendor_amount)
                            if vendor_amount_float > 0:
                                cursor.execute("SELECT id FROM vendors WHERE vendor_name = %s", (vendor_name,))
                                vendor_result = cursor.fetchone()
                                if vendor_result:
                                    cursor.execute("""
                                        INSERT INTO vendor_expenses (billing_entry_id, vendor_id, amount)
                                        VALUES (%s, %s, %s)
                                    """, (billing_id, vendor_result[0], vendor_amount_float))
                                else:
                                    errors.append(f"Row {idx+2}: Vendor '{vendor_name}' not found")
                        except:
                            pass
                
                conn.commit()
                inserted += 1
                
            except Exception as e:
                conn.rollback()
                errors.append(f"Row {idx+2}: {str(e)}")
                failed += 1
        
        release_connection(conn)
        
        return {
            "inserted": inserted,
            "failed": failed,
            "errors": errors
        }
        
    except Exception as e:
        print(f"Bulk upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
