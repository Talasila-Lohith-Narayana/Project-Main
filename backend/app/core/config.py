"""
================================================================================
CONFIGURATION & ENVIRONMENT MODULE (config.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
This file is the "settings vault" of the application. It loads secret passwords,
cryptographic keys, security algorithms, and default usernames from the environment
(or .env file). 

WHAT PART OF THE UI USES THIS:
------------------------------
1. Login Page (/login):
   - Validates user credentials against configured administrative and analyst passwords.
2. User Authentication & Session Persistence:
   - Signs and validates secure JWT session cookies/tokens so the user stays logged in.
3. Role Switcher in Sidebar:
   - Verifies the 'admin' and 'analyst' (viewer) roles.
================================================================================
"""

import os
from dotenv import load_dotenv
from pwdlib import PasswordHash

# Load settings from .env file if available
load_dotenv()

# JWT Encryption Configuration for user logins
SECRET = os.getenv("JWT_SECRET_KEY", "change-me")
ALGO = "HS256"

# Default Admin User Credentials
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# Default Analyst / Viewer User Credentials (Read-only access)
VIEWER_USERNAME = os.getenv("VIEWER_USERNAME", "analyst")
VIEWER_PASSWORD = os.getenv("VIEWER_PASSWORD")

if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD must be set in the environment or .env file.")
if not VIEWER_PASSWORD:
    raise RuntimeError("VIEWER_PASSWORD must be set in the environment or .env file.")

# Password hasher helper
pwd = PasswordHash.recommended()
