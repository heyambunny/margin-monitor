import os
from dotenv import load_dotenv
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set. Add it to your .env file "
        "(e.g. JWT_SECRET_KEY=$(openssl rand -hex 32))."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        name: str = payload.get("name")
        role_id: int = payload.get("role_id")
        if user_id is None:
            raise credentials_exception
        return {"user_id": user_id, "name": name, "role_id": role_id}
    except JWTError:
        raise credentials_exception


# Role IDs (from the `roles` table): 1 = Admin, 2 = Finance, 3 = Supervisor

def require_roles(*allowed_role_ids: int):
    """Dependency factory: only lets the request through if the caller's
    role_id is one of allowed_role_ids. Use as Depends(require_roles(1, 2))."""
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role_id") not in allowed_role_ids:
            raise HTTPException(status_code=403, detail="You do not have access to this resource")
        return user
    return checker


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Dependency: Admin (role_id 1) only."""
    if user.get("role_id") != 1:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
