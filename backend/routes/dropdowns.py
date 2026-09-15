from fastapi import APIRouter, Depends, HTTPException
from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import get_current_user

router = APIRouter()

# NOTE: GET /clients here is shadowed by the identical route in client_access.py
# (registered earlier in main.py), which applies role-based client scoping.
# Kept authenticated for defense-in-depth in case that ordering ever changes.
@router.get("/clients")
async def get_clients(user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, client_name FROM clients ORDER BY client_name")
        clients = cursor.fetchall()
        return [{"id": c[0], "client_name": c[1]} for c in clients]
    finally:
        release_connection(conn)

@router.get("/programs")
async def get_programs(user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, program_name, client_id FROM programs ORDER BY program_name")
        programs = cursor.fetchall()
        return [{"id": p[0], "program_name": p[1], "client_id": p[2]} for p in programs]
    finally:
        release_connection(conn)

@router.get("/categories")
async def get_categories(user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, category_name FROM categories ORDER BY category_name")
        categories = cursor.fetchall()
        return [{"id": c[0], "category_name": c[1]} for c in categories]
    finally:
        release_connection(conn)

@router.get("/vendors")
async def get_vendors(user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, vendor_name FROM vendors ORDER BY vendor_name")
        vendors = cursor.fetchall()
        return [{"id": v[0], "vendor_name": v[1]} for v in vendors]
    finally:
        release_connection(conn)
