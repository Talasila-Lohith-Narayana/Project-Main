"""
================================================================================
AUDIT LOGS & COMPLIANCE ROUTER (routers/audit_logs.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
This file acts as the "black box flight recorder" for the application:
1. Recording every single administrative action (who changed what, when, and why).
2. Fetching the change history specifically for a single customer.
3. Fetching the global system audit log with full-text search across all admins,
   actions, and details.

WHAT PART OF THE UI HANDLES THIS:
---------------------------------
1. Global System Audit Log Modal (`AuditLogModal.jsx`):
   - Accessible via the "Audit Trail" / "Activity Logs" button on the top navigation bar.
   - Search filter for searching actions (e.g. "Placed new order", "Updated customer", "Bulk Deleted").
   - Detailed event cards showing timestamp, operator username, action tag, and full details.
2. Single Customer Audit Trail (`Customer.jsx`):
   - "Audit Logs" tab inside the customer profile showing historical edits made specifically to that customer.
================================================================================
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..auth import auth
from ..database import get_db
from ..models import AuditLog

router = APIRouter(tags=["audit-logs"])

# ------------------------------------------------------------------------------
# 1. Customer-Specific Audit Logs
# ------------------------------------------------------------------------------
@router.get("/api/customers/{cid}/audit-logs")
def get_audit_logs(cid: str, db: Session = Depends(get_db), _: str = Depends(auth)):
    """
    Fetches compliance audit history specifically for one customer.
    UI Component: Audit trail tab on `Customer.jsx`.
    """
    cust = db.execute(
        text("SELECT customer_id, customer_unique_id FROM customers WHERE customer_unique_id=:id OR customer_id=:id LIMIT 1"),
        {"id": cid}
    ).fetchone()
    ids = [cid]
    if cust:
        ids.extend([cust._mapping.get("customer_id"), cust._mapping.get("customer_unique_id")])
    ids = list(set([i for i in ids if i]))

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.customer_id.in_(ids))
        .order_by(AuditLog.created_at.desc())
        .limit(50)
        .all()
    )
    return {"items": logs}


# ------------------------------------------------------------------------------
# 2. Global Platform Audit Log (All Admins & Operations)
# ------------------------------------------------------------------------------
@router.get("/api/audit-logs")
def get_global_audit_logs(
    limit: int = 100,
    action: str = None,
    q: str = None,
    db: Session = Depends(get_db),
    _: str = Depends(auth),
):
    """
    Fetches all administrative activity and data change history across the entire platform.
    UI Component: `AuditLogModal.jsx` popup dialog.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if q:
        query = query.filter(
            (AuditLog.customer_id.ilike(f"%{q}%"))
            | (AuditLog.details.ilike(f"%{q}%"))
            | (AuditLog.action.ilike(f"%{q}%"))
        )
    logs = query.order_by(AuditLog.created_at.desc()).limit(min(limit, 200)).all()
    return {"items": logs, "total": len(logs)}
