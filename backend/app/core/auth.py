"""
================================================================================
AUTHENTICATION & PERMISSION SECURITY MODULE (auth.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
This file acts as the "security guard" of the application. Every time a user clicks 
a button or opens a page in the web app, this file checks:
1. Is the user properly logged in with a valid session token?
2. Does the user have permission (e.g. Administrator) to make edits or delete items?

WHAT PART OF THE UI USES THIS:
------------------------------
1. Entire Authenticated Workspace:
   - Guards every page (Dashboard, Customers, Customer Profile, Products, Audit Logs).
   - If a token is expired or missing, it kicks the user to the Login screen.
2. Admin-Only Action Buttons:
   - "Add Customer", "Edit Customer", "Delete Customer"
   - "Add Order", "Edit Order", "Delete Order"
   - "Add Review", "Edit Review"
   - "Edit Interaction"
   - "Bulk Segment Change" & "Bulk Delete"
   - If an Analyst tries to trigger these, this module rejects the request with HTTP 403.
================================================================================
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from .config import SECRET, ALGO

# Extract bearer token from HTTP request header
security = HTTPBearer()

def auth(c: HTTPAuthorizationCredentials = Depends(security)):
    """
    Standard Login Check:
    Verifies that the user has a valid active login token.
    Used by ALL read and write endpoints across the app.
    """
    try:
        return jwt.decode(c.credentials, SECRET, algorithms=[ALGO])
    except (JWTError, KeyError):
        raise HTTPException(401, "Invalid or expired token. Please log in again.")

def admin_auth(c: HTTPAuthorizationCredentials = Depends(security)):
    """
    Administrator Privilege Check:
    Verifies that the logged-in user has the 'admin' role.
    Used by ALL mutation buttons (Create, Edit, Delete, Bulk actions).
    """
    user = auth(c)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin authorization required to modify data.")
    return user
