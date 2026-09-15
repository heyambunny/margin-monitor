from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import get_current_user, require_admin
from utils.audit import log_audit
from datetime import datetime
import bcrypt

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str

@router.get("/users")
async def get_users(user: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                u.id,
                u.name,
                u.email,
                r.role_name as role,
                u.is_active,
                u.created_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id
        """)
        
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "role": r[3] or "user",
                "is_active": r[4],
                "created_at": r[5].strftime("%Y-%m-%d %H:%M:%S") if r[5] else None
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching users: {e}")
        return []
    finally:
        release_connection(conn)

@router.post("/users")
async def create_user(data: UserCreate, user: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Get role_id
        cursor.execute("SELECT id FROM roles WHERE role_name = %s", (data.role,))
        role_result = cursor.fetchone()
        if not role_result:
            # Default to 'user' role if not found
            cursor.execute("SELECT id FROM roles WHERE role_name = 'user'")
            role_result = cursor.fetchone()
            if not role_result:
                # If no roles exist, create default 'user' role
                cursor.execute("INSERT INTO roles (role_name) VALUES ('user') RETURNING id")
                role_result = cursor.fetchone()
        
        role_id = role_result[0]
        
        # Hash password
        hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
        
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, role_id, created_at, is_active)
            VALUES (%s, %s, %s, %s, NOW(), TRUE)
            RETURNING id
        """, (data.name, data.email, hashed, role_id))
        
        user_id = cursor.fetchone()[0]

        log_audit(cursor, "users", user_id, "user",
                   None, f"{data.name} ({data.email}, role={data.role})", "INSERT",
                   user["user_id"], user["role_id"], "user_management", "HIGH")

        conn.commit()

        return {
            "id": user_id,
            "name": data.name,
            "email": data.email,
            "role": data.role,
            "is_active": True,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_connection(conn)

@router.get("/clients")
async def get_clients(user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Admin sees every client. Everyone else only sees clients they've
        # been granted access to (matches the old app's Add Projection logic).
        if user.get("role_id") == 1:
            cursor.execute("""
                SELECT id, client_name
                FROM clients
                ORDER BY client_name
            """)
        else:
            cursor.execute("""
                SELECT c.id, c.client_name
                FROM clients c
                JOIN user_client_access uca ON c.id = uca.client_id
                WHERE uca.user_id = %s
                ORDER BY c.client_name
            """, (user["user_id"],))

        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "client_name": r[1]
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching clients: {e}")
        return []
    finally:
        release_connection(conn)

@router.get("/user-clients/{user_id}")
async def get_user_clients(user_id: int, current_user: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                c.id,
                c.client_name
            FROM user_client_access uca
            JOIN clients c ON uca.client_id = c.id
            WHERE uca.user_id = %s
            ORDER BY c.client_name
        """, (user_id,))
        
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "name": r[1]
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching user clients: {e}")
        return []
    finally:
        release_connection(conn)

@router.post("/assign-client")
async def assign_client(data: dict, user: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO user_client_access (user_id, client_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id, client_id) DO NOTHING
        """, (data["user_id"], data["client_id"]))

        log_audit(cursor, "user_client_access", data["client_id"], "client_access",
                   None, f"user {data['user_id']} assigned to client {data['client_id']}", "INSERT",
                   user["user_id"], user["role_id"], "user_management", "MEDIUM")

        conn.commit()
        return {"message": "Client assigned successfully"}
        
    except Exception as e:
        conn.rollback()
        print(f"Error assigning client: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_connection(conn)

@router.post("/remove-client")
async def remove_client(data: dict, user: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM user_client_access
            WHERE user_id = %s AND client_id = %s
        """, (data["user_id"], data["client_id"]))

        log_audit(cursor, "user_client_access", data["client_id"], "client_access",
                   f"user {data['user_id']} assigned to client {data['client_id']}", None, "DELETE",
                   user["user_id"], user["role_id"], "user_management", "MEDIUM")

        conn.commit()
        return {"message": "Client removed successfully"}
        
    except Exception as e:
        conn.rollback()
        print(f"Error removing client: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_connection(conn)
