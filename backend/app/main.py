"""
================================================================================
APPLICATION ENTRY POINT (main.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
This is the "main ignition key" and conductor of the backend application.
1. It launches the FastAPI web server.
2. It sets up CORS (Cross-Origin Resource Sharing) permissions so our React frontend
   can communicate securely with this backend server.
3. It mounts all specialized endpoint routers (Auth, Dashboard, Customers, Orders,
   Products, Reviews, Interactions, Audit Logs).
4. On startup, it verifies database tables, initializes default user accounts (Admin and Analyst),
   and precomputes the customer metrics cache for instant sub-second performance.

WHAT PART OF THE UI HANDLES THIS:
---------------------------------
- Coordinates and powers the entire frontend web application (`http://localhost:5173`).
================================================================================
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .core.config import (
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    VIEWER_USERNAME,
    VIEWER_PASSWORD,
    SECRET,
    ALGO,
    pwd,
)
from .core.database import engine, get_db
from .core.auth import auth
from .models import Base, AppUser

# Import all domain API routers
from .api.auth.router import router as auth_router
from .api.dashboard.router import router as dashboard_router
from .api.customers.router import router as customers_router
from .api.orders.router import router as orders_router
from .api.products.router import router as products_router
from .api.reviews.router import router as reviews_router
from .api.interactions.router import router as interactions_router
from .api.audit_logs.router import router as audit_logs_router
from .api.predictions.router import router as predictions_router
from .api.churn_analytics.router import router as churn_analytics_router

# Analytics routers are mounted beneath a dedicated prefix so their paths do
# not overlap the existing customer/dashboard APIs.
from .api.campaigns_forecast.router import router as campaigns_forecast_router
from .api.cohort_trends.router import router as cohort_trend_router
from .api.clv_delivery_payments.router import router as clv_router
from .api.model_evaluation.router import router as model_evaluation_router


# ------------------------------------------------------------------------------
# Application Lifespan Event (Table Checks, Admin/Analyst Users & Cache Setup)
# ------------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    db = next(get_db())

    # Default users are checked without running table migrations or cache rebuilds.
    # Those operations belong in a separate maintenance task because they can
    # block startup behind long-running database queries.
    user = db.query(AppUser).filter_by(username=ADMIN_USERNAME).first()
    if not user:
        db.add(
            AppUser(
                username=ADMIN_USERNAME, password_hash=pwd.hash(ADMIN_PASSWORD), role="admin"
            )
        )
        db.commit()
    elif user.role != "admin":
        user.role = "admin"
        db.commit()

    # 4. Create default Analyst (Viewer) user if not present
    viewer = db.query(AppUser).filter_by(username=VIEWER_USERNAME).first()
    if not viewer:
        db.add(
            AppUser(
                username=VIEWER_USERNAME,
                password_hash=pwd.hash(VIEWER_PASSWORD),
                role="viewer",
            )
        )
        db.commit()
    elif viewer.role != "viewer":
        viewer.role = "viewer"
        db.commit()
    db.close()
    yield


app = FastAPI(title="Customer Sphere API", lifespan=lifespan)

# Configure structured request logger
logger = logging.getLogger("customer_sphere")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


# ------------------------------------------------------------------------------
# Request Logging Middleware — logs method, path, status, duration, user
# ------------------------------------------------------------------------------
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)

    # Extract username from JWT if present (best-effort, no auth enforcement)
    user = "anonymous"
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload = jwt.decode(auth_header[7:], SECRET, algorithms=[ALGO])
            user = payload.get("sub", "unknown")
        except (JWTError, Exception):
            user = "invalid-token"

    logger.info(
        "%s %s | %s | %sms | user=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        user,
    )
    return response


# Enable CORS for frontend web client (configurable via CORS_ORIGINS env var)
_default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
cors_origins = (
    [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    if _cors_origins_env
    else _default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all modular routers
app.include_router(auth_router)
authenticated_route = [Depends(auth)]
app.include_router(dashboard_router, dependencies=authenticated_route)
app.include_router(customers_router, dependencies=authenticated_route)
app.include_router(orders_router, dependencies=authenticated_route)
app.include_router(products_router, dependencies=authenticated_route)
app.include_router(reviews_router, dependencies=authenticated_route)
app.include_router(interactions_router, dependencies=authenticated_route)
app.include_router(audit_logs_router, dependencies=authenticated_route)
app.include_router(predictions_router, dependencies=authenticated_route)
app.include_router(churn_analytics_router, prefix="/api/analytics", dependencies=authenticated_route)
app.include_router(campaigns_forecast_router, prefix="/api/analytics", dependencies=authenticated_route)
app.include_router(cohort_trend_router, prefix="/api/analytics", dependencies=authenticated_route)
app.include_router(clv_router, prefix="/api/analytics", dependencies=authenticated_route)
app.include_router(model_evaluation_router, prefix="/api/analytics", dependencies=authenticated_route)
