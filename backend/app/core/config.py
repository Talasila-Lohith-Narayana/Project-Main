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
