"""
================================================================================
AUTHENTICATION ROUTER (routers/auth.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
Handles logging into the application and performing quick system health checks.
When you enter your username and password on the login screen and click "Sign In",
this file checks if your credentials match and issues a secure 8-hour access pass (JWT token).

WHAT PART OF THE UI HANDLES THIS:
---------------------------------
1. Login Screen (/login):
   - The "Sign In" button sends data to `/api/auth/login`.
   - On success, saves your role (Administrator or Analyst) and takes you to the Dashboard.
2. Status Indicator:
   - `/api/health` checks that the server and database are running smoothly.
================================================================================
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..config import SECRET, ALGO, pwd
from ..database import get_db
from ..models import AppUser
from ..schemas import Login

router = APIRouter(tags=["auth"])

@router.get("/api/health")
def health(db: Session = Depends(get_db)):
    """
    Checks database connection health.
    UI Connection status tag: '● Connected'.
    """
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}

@router.post("/api/auth/login")
def login(x: Login, db: Session = Depends(get_db)):
    """
    Authenticates username and password.
    Returns: JWT token, username, and role (admin or viewer/analyst).
    UI Component: Login page (`Login.jsx`).
    """
    u = db.query(AppUser).filter_by(username=x.username).first()
    if not u or not pwd.verify(x.password, u.password_hash):
        raise HTTPException(401, "Invalid username or password")
    token = jwt.encode(
        {
            "sub": u.username,
            "role": u.role,
            "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        },
        SECRET,
        algorithm=ALGO,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": u.username,
        "role": u.role,
    }
