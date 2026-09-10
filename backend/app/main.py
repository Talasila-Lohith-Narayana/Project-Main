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
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .config import (
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    VIEWER_USERNAME,
    VIEWER_PASSWORD,
    SECRET,
    ALGO,
    pwd,
)
from .database import engine, get_db
from .models import Base, AppUser

# Import all domain APIRouters
from .routers.auth import router as auth_router
from .routers.dashboard import router as dashboard_router
from .routers.customers import router as customers_router
from .routers.orders import router as orders_router
from .routers.products import router as products_router
from .routers.reviews import router as reviews_router
from .routers.interactions import router as interactions_router
from .routers.audit_logs import router as audit_logs_router


# ------------------------------------------------------------------------------
# Application Lifespan Event (Table Checks, Admin/Analyst Users & Cache Setup)
# ------------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    db = next(get_db())
    
    # Ensure customer zip code column supports 6-digit zip codes
    try:
        db.execute(text("ALTER TABLE customers MODIFY customer_zip_code_prefix VARCHAR(10) NOT NULL"))
        db.commit()
    except SQLAlchemyError:
        db.rollback()

    # 1. Ensure user roles column exists
    try:
        db.execute(
            text(
                "ALTER TABLE ci_users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'viewer'"
            )
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()

    # 2. Initialize customer metrics cache table for fast analytics queries
    try:
        db.execute(
            text(
                """CREATE TABLE IF NOT EXISTS customer_metrics_cache (
                    customer_id CHAR(32) PRIMARY KEY,
                    customer_unique_id CHAR(32),
                    recency_days INT NOT NULL DEFAULT 0,
                    frequency INT NOT NULL DEFAULT 0,
                    monetary_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    avg_review_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
                    segment VARCHAR(30) NOT NULL DEFAULT 'New / Developing',
                    INDEX idx_unique (customer_unique_id),
                    INDEX idx_monetary (monetary_total),
                    INDEX idx_recency (recency_days),
                    INDEX idx_freq (frequency),
                    INDEX idx_score (avg_review_score),
                    INDEX idx_segment (segment)
                ) ENGINE=InnoDB"""
            )
        )
        db.commit()
        cached_count = db.execute(text("SELECT COUNT(*) FROM customer_metrics_cache")).scalar() or 0
        if cached_count == 0:
            db.execute(
                text(
                    """REPLACE INTO customer_metrics_cache (customer_id, customer_unique_id, recency_days, frequency, monetary_total, avg_review_score, segment)
                    SELECT 
                        c.customer_id,
                        c.customer_unique_id,
                        COALESCE(u.recency_days, 0) AS recency_days,
                        COALESCE(u.frequency, 0) AS frequency,
                        COALESCE(u.monetary_total, 0) AS monetary_total,
                        COALESCE(u.avg_review_score, 0) AS avg_review_score,
                        CASE 
                            WHEN COALESCE(u.monetary_total,0)>=1000 AND COALESCE(u.frequency,0)>=3 THEN 'Champions'
                            WHEN COALESCE(u.recency_days,0)<=90 AND COALESCE(u.frequency,0)>=2 THEN 'Engaged'
                            WHEN COALESCE(u.recency_days,0)>180 AND COALESCE(u.monetary_total,0)>=200 THEN 'At Risk'
                            ELSE 'New / Developing' 
                        END AS segment
                    FROM customers c
                    LEFT JOIN (
                        SELECT 
                            c2.customer_unique_id,
                            DATEDIFF((SELECT MAX(order_purchase_timestamp) FROM orders), MAX(o.order_purchase_timestamp)) AS recency_days,
                            COUNT(DISTINCT o.order_id) AS frequency,
                            COALESCE(SUM(oi.price + oi.freight_value), 0) AS monetary_total,
                            COALESCE(AVG(r.review_score), 0) AS avg_review_score
                        FROM customers c2
                        JOIN orders o ON o.customer_id = c2.customer_id
                        LEFT JOIN order_items oi ON oi.order_id = o.order_id
                        LEFT JOIN order_reviews r ON r.order_id = o.order_id
                        GROUP BY c2.customer_unique_id
                    ) u ON u.customer_unique_id = c.customer_unique_id"""
                )
            )
            db.commit()
    except SQLAlchemyError:
        db.rollback()

    # 3. Create default Admin user if not present
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


app = FastAPI(title="Customer Sphere API", version="2.0", lifespan=lifespan)

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
app.include_router(dashboard_router)
app.include_router(customers_router)
app.include_router(orders_router)
app.include_router(products_router)
app.include_router(reviews_router)
app.include_router(interactions_router)
app.include_router(audit_logs_router)
