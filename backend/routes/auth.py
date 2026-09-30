from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordBearer

from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import create_access_token, get_current_user, APP_TOKEN_EXPIRE_DAYS, SECRET_KEY, ALGORITHM
from datetime import timedelta
from jose import jwt, JWTError

import bcrypt
import traceback

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

class LoginRequest(BaseModel):
    email: str
    password: str
    # True when signing in from the installed app (PWA): long-lived token.
    app: bool = False


def issue_token(user_id: int, name: str, role_id: int, app: bool) -> str:
    claims = {"user_id": user_id, "name": name, "role_id": role_id}
    if app:
        claims["app"] = True
        return create_access_token(claims, timedelta(days=APP_TOKEN_EXPIRE_DAYS))
    return create_access_token(claims)

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
        token = issue_token(user_id, name, role_id, data.app)
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

# Swap a still-valid token for a fresh one of the same kind (web or app).
# Re-reads the user so deactivated users or role changes take effect.
@router.post("/refresh")
def refresh(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, role_id FROM users WHERE id = %s AND is_active = TRUE", (user_id,))
        row = cursor.fetchone()
    finally:
        release_connection(conn)
    if not row:
        raise HTTPException(status_code=401, detail="Account is no longer active")

    uid, name, role_id = row
    return {
        "access_token": issue_token(uid, name, role_id, bool(payload.get("app"))),
        "user": {"id": uid, "name": name, "role_id": role_id},
    }

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
