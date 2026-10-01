"""
================================================================================
CUSTOMER REVIEWS & FEEDBACK ROUTER (routers/reviews.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
This file manages customer feedback and star ratings:
1. Viewing all historical reviews written by a customer.
2. Submitting new star ratings (1 to 5 stars) and comments linked to an order.
3. Editing existing reviews (title, message, score).
4. Automatically recalculating the customer's average review score in real-time.

WHAT PART OF THE UI HANDLES THIS:
---------------------------------
1. Reviews List Table (`Customer.jsx`):
   - Displays star ratings (e.g. ★★★★★), feedback title, comment text, and creation timestamp.
2. "Add Review" Modal Popup (`ReviewModal.jsx`):
   - Interactive star rating picker (1 to 5 stars), headline input, and review message text area.
3. "Edit Review" Modal Popup (`ReviewModal.jsx`):
   - Allows administrators to adjust feedback rating or text and updates customer average score.
================================================================================
"""

import os
from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.auth import auth, admin_auth
from app.core.database import get_db
from app.core.serialization import rows
from app.models import AuditLog
from app.schemas import ReviewIn

router = APIRouter(tags=["reviews"])

# ------------------------------------------------------------------------------
# 1. Fetch Customer Reviews
# ------------------------------------------------------------------------------
@router.get("/api/customers/{cid}/reviews")
def reviews(cid: str, db: Session = Depends(get_db), _: str = Depends(auth)):
    """
    Returns all reviews written by a specific customer.
    UI Component: 'Reviews' section on `Customer.jsx`.
    """
    rs = db.execute(
        text(
            """SELECT r.review_id,r.order_id,r.review_score,r.review_comment_title,r.review_comment_message,r.review_creation_date,r.review_answer_timestamp 
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            JOIN order_reviews r ON r.order_id=o.order_id 
            WHERE c.customer_unique_id=:id OR c.customer_id=:id 
            ORDER BY r.review_creation_date DESC LIMIT 30"""
        ),
        {"id": cid},
    ).fetchall()
    return {"items": rows(rs)}


# ------------------------------------------------------------------------------
# 2. Add New Order Review (Admin Only)
# ------------------------------------------------------------------------------
@router.post("/api/customers/{cid}/reviews")
def create_review(
    cid: str,
    x: ReviewIn,
    db: Session = Depends(get_db),
    u: dict = Depends(admin_auth),
):
    """
    Submits a review for an order and updates the customer's average rating in the metrics cache.
    UI Component: 'Add review' button and modal (`ReviewModal.jsx`).
    """
    cust = db.execute(
        text("SELECT customer_id, customer_unique_id FROM customers WHERE customer_unique_id=:id OR customer_id=:id LIMIT 1"),
        {"id": cid},
    ).fetchone()
    if not cust:
        raise HTTPException(404, "Customer not found")

    actual_cid = cust._mapping.get("customer_id")
    actual_uid = cust._mapping.get("customer_unique_id")

    # Match or find an eligible unreviewed order
    order_id = x.order_id
    if not order_id:
        unreviewed_ord = db.execute(
            text("""SELECT o.order_id 
                    FROM orders o 
                    JOIN customers c ON c.customer_id = o.customer_id 
                    LEFT JOIN order_reviews r ON r.order_id = o.order_id
                    WHERE c.customer_unique_id = :uid AND r.review_id IS NULL
                    ORDER BY o.order_purchase_timestamp DESC LIMIT 1"""),
            {"uid": actual_uid},
        ).fetchone()

        if unreviewed_ord:
            order_id = unreviewed_ord[0]
        else:
            ord_row = db.execute(
                text("SELECT o.order_id FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE c.customer_unique_id=:uid ORDER BY o.order_purchase_timestamp DESC LIMIT 1"),
                {"uid": actual_uid},
            ).fetchone()
            if ord_row:
                order_id = ord_row[0]
            else:
                raise HTTPException(400, "Customer must have at least one order to attach a review.")

    # Enforce 1 review per order rule
    existing_rev = db.execute(
        text("SELECT review_id FROM order_reviews WHERE order_id = :oid LIMIT 1"),
        {"oid": order_id},
    ).fetchone()
    if existing_rev:
        raise HTTPException(
            400,
            f"A review has already been submitted for this order (#{order_id[:8]}…). Each order can only have 1 review.",
        )

    new_review_id = os.urandom(16).hex()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    review_date = now
    if x.review_creation_date:
        try:
            review_date = datetime.fromisoformat(x.review_creation_date.replace("Z", "+00:00"))
        except ValueError:
            pass

    # Insert review
    db.execute(
        text(
            """INSERT INTO order_reviews (
                review_id, order_id, review_score, review_comment_title,
                review_comment_message, review_creation_date, review_answer_timestamp
            ) VALUES (
                :review_id, :order_id, :score, :title,
                :message, :creation_date, :answer_date
            )"""
        ),
        {
            "review_id": new_review_id,
            "order_id": order_id,
            "score": x.review_score,
            "title": x.review_comment_title or "",
            "message": x.review_comment_message or "",
            "creation_date": review_date,
            "answer_date": review_date,
        },
    )

    # Recalculate customer's average rating in cache
    avg_score = db.execute(
        text(
            """SELECT COALESCE(AVG(r.review_score), 0)
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            JOIN order_reviews r ON r.order_id = o.order_id
            WHERE c.customer_unique_id = :uid"""
        ),
        {"uid": actual_uid},
    ).scalar() or float(x.review_score)

    db.execute(
        text(
            """UPDATE customer_metrics_cache 
            SET avg_review_score=:score 
            WHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_unique_id = :uid)
               OR customer_id=:cid OR customer_unique_id=:uid"""
        ),
        {"score": float(avg_score), "cid": actual_cid, "uid": actual_uid},
    )

    # Audit log
    db.add(
        AuditLog(
            customer_id=actual_uid,
            action="Added order review",
            performed_by=u.get("sub", "admin"),
            details=f"Added {x.review_score}-star review for order {order_id[:10]}…: '{x.review_comment_title or 'Review'}'",
            created_at=now,
        )
    )

    db.commit()

    return {
        "review_id": new_review_id,
        "order_id": order_id,
        "review_score": x.review_score,
        "review_comment_title": x.review_comment_title,
        "review_comment_message": x.review_comment_message,
        "review_creation_date": review_date.isoformat(),
    }


# ------------------------------------------------------------------------------
# 3. Update Existing Review (Admin Only)
# ------------------------------------------------------------------------------
@router.patch("/api/customers/{cid}/reviews/{review_id}")
def update_review(
    cid: str,
    review_id: str,
    x: ReviewIn,
    db: Session = Depends(get_db),
    u: dict = Depends(admin_auth),
):
    """
    Modifies a review score or comment and recalculates average customer rating.
    UI Component: 'Edit' review modal (`ReviewModal.jsx`).
    """
    rev_row = db.execute(
        text("SELECT review_id, order_id, review_creation_date FROM order_reviews WHERE review_id=:rid LIMIT 1"),
        {"rid": review_id},
    ).fetchone()
    if not rev_row:
        raise HTTPException(404, "Review not found")

    cust = db.execute(
        text("SELECT customer_id, customer_unique_id FROM customers WHERE customer_unique_id=:id OR customer_id=:id LIMIT 1"),
        {"id": cid},
    ).fetchone()
    actual_cid = cust[0] if cust else cid
    actual_uid = cust[1] if cust else cid

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    review_date = rev_row[2]
    if x.review_creation_date:
        try:
            review_date = datetime.fromisoformat(x.review_creation_date.replace("Z", "+00:00"))
        except ValueError:
            pass

    order_id = x.order_id if x.order_id else rev_row[1]

    db.execute(
        text(
            """UPDATE order_reviews 
            SET review_score=:score, 
                review_comment_title=:title, 
                review_comment_message=:message, 
                order_id=:order_id,
                review_creation_date=:creation_date 
            WHERE review_id=:rid"""
        ),
        {
            "score": x.review_score,
            "title": x.review_comment_title or "",
            "message": x.review_comment_message or "",
            "order_id": order_id,
            "creation_date": review_date,
            "rid": review_id,
        },
    )

    avg_score = db.execute(
        text(
            """SELECT COALESCE(AVG(r.review_score), 0)
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            JOIN order_reviews r ON r.order_id = o.order_id
            WHERE c.customer_unique_id = :uid"""
        ),
        {"uid": actual_uid},
    ).scalar() or float(x.review_score)

    db.execute(
        text(
            """UPDATE customer_metrics_cache 
            SET avg_review_score=:score 
            WHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_unique_id = :uid)
               OR customer_id=:cid OR customer_unique_id=:uid"""
        ),
        {"score": float(avg_score), "cid": actual_cid, "uid": actual_uid},
    )

    db.add(
        AuditLog(
            customer_id=actual_uid,
            action="Updated review",
            performed_by=u.get("sub", "admin"),
            details=f"Modified review {review_id[:10]}…: Score={x.review_score}★, Title='{x.review_comment_title or 'Review'}'",
            created_at=now,
        )
    )

    db.commit()

    return {
        "review_id": review_id,
        "order_id": order_id,
        "review_score": x.review_score,
        "review_comment_title": x.review_comment_title,
        "review_comment_message": x.review_comment_message,
        "review_creation_date": review_date.isoformat() if isinstance(review_date, (datetime, date)) else review_date,
    }
