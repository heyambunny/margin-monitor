from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordBearer

from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import create_access_token, get_current_user

import bcrypt
import traceback

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(data: LoginRequest):
    email = data.email.strip()
    password = data.password.strip()

    print(f"🔵 Login attempt for email: {email}")

    if not email or not password:
        print("❌ Missing credentials")
        raise HTTPException(status_code=400, detail="Missing credentials")

    conn = None
    try:
        print("🔄 Getting database connection...")
        conn = get_connection()
        print("✅ Database connection acquired")

        cursor = conn.cursor()

        print(f"🔄 Querying user: {email}")
        cursor.execute("""
            SELECT id, name, password_hash, role_id
            FROM users
            WHERE email = %s AND is_active = TRUE
        """, (email,))

        user = cursor.fetchone()
        print(f"📊 User found: {user is not None}")

        if not user:
            print("❌ User not found")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id, name, db_password, role_id = user
        print(f"👤 User ID: {user_id}, Name: {name}, Role: {role_id}")

        if not db_password:
            print("❌ No password hash in database")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        print(f"🔄 Verifying password...")
        # Check password
        if db_password.startswith("$2b$") or db_password.startswith("$2a$"):
            print("🔄 Using bcrypt verification")
            try:
                valid = bcrypt.checkpw(password.encode(), db_password.encode())
                print(f"✅ Password valid: {valid}")
            except Exception as e:
                print(f"❌ bcrypt error: {e}")
                raise HTTPException(status_code=500, detail="Password verification error")
        else:
            print("🔄 Using plain text verification")
            valid = password == db_password
            print(f"✅ Password valid: {valid}")

        if not valid:
            print("❌ Invalid password")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Create token
        print("🔄 Creating access token...")
        token = create_access_token({
            "user_id": user_id,
            "name": name,
            "role_id": role_id
        })
        print("✅ Token created successfully")

        return {
            "access_token": token,
            "user": {
                "id": user_id,
                "name": name,
                "role_id": role_id
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

    finally:
        if conn:
            print("🔄 Releasing database connection...")
            release_connection(conn)
            print("✅ Database connection released")

@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme)):
    try:
        user = get_current_user(token)
        return {
            "id": user["user_id"],
            "name": user["name"],
            "role_id": user["role_id"]
        }
    except Exception as e:
        print(f"❌ Get me error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
