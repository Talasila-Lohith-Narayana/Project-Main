"""
================================================================================
ORDERS MANAGEMENT ROUTER (routers/orders.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
This file manages customer purchases and checkout transactions:
1. Fetching the list of all orders made by a customer.
2. Creating new orders with multiple line items, categories, price points, shipping costs,
   and payment methods.
3. Editing existing orders (updating delivery status, purchased timestamps, or payment methods).
4. Deleting orders with automatic recalculation of customer spending totals and review scores.

WHAT PART OF THE UI HANDLES THIS:
---------------------------------
1. Order History Table (`Customer.jsx`):
   - Displays orders with order ID, status badges (Delivered, Shipped), payment type icon,
     purchase date, delivery date, and total order value (R$).
2. "Add Order" Modal Popup (`OrderModal.jsx`):
   - Allows dynamically adding multiple product categories, custom prices, freight values,
     and payment installments.
3. "Edit Order" Modal Popup (`OrderModal.jsx`):
   - Pre-fills previous order line items so administrators can modify them.
4. "Delete Order" Action Button:
   - Removes the order and updates customer lifetime monetary value and frequency in real-time.
================================================================================
"""

import os
from datetime import datetime, timedelta, date, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import bindparam, text
from pydantic import BaseModel, Field
from ..auth import auth, admin_auth
from ..database import get_db
from ..models import AuditLog
from ..schemas import OrderIn
from ..utils import rows

router = APIRouter(tags=["orders"])


class BulkOrderDeleteIn(BaseModel):
    order_ids: list[str] = Field(min_length=1, max_length=100)

# ------------------------------------------------------------------------------
# 1. Fetch Customer Order History
# ------------------------------------------------------------------------------
@router.get("/api/customers/{cid}/orders")
def orders(cid: str, db: Session = Depends(get_db), _: str = Depends(auth)):
    """
    Returns order transaction history for a specific customer.
    UI Component: 'Order history' table on `Customer.jsx`.
    """
    customer = db.execute(
        text(
            """SELECT customer_unique_id
            FROM customers
            WHERE customer_unique_id = :id OR customer_id = :id
            LIMIT 1"""
        ),
        {"id": cid},
    ).mappings().first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    rs = db.execute(
        text(
            """SELECT 
                o.order_id,
                o.order_status,
                o.order_purchase_timestamp,
                o.order_delivered_customer_date,
                o.order_estimated_delivery_date,
                COALESCE(SUM(oi.price+oi.freight_value), 0) AS order_value,
                COALESCE(MIN(oi.price), 0) AS price,
                COALESCE(MIN(oi.freight_value), 0) AS freight_value,
                COALESCE(MIN(p.product_category_name), 'general') AS product_category,
                GROUP_CONCAT(DISTINCT op.payment_type SEPARATOR ', ') AS payment_type,
                MAX(op.payment_installments) AS installments
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON oi.order_id = o.order_id 
            LEFT JOIN products p ON p.product_id = oi.product_id
            LEFT JOIN order_payments op ON op.order_id = o.order_id
            WHERE c.customer_unique_id = :unique_id
            GROUP BY o.order_id, o.order_status, o.order_purchase_timestamp, o.order_delivered_customer_date, o.order_estimated_delivery_date 
            ORDER BY o.order_purchase_timestamp DESC LIMIT 50"""
        ),
        {"unique_id": customer["customer_unique_id"]},
    ).fetchall()
    return {"items": rows(rs)}


# ------------------------------------------------------------------------------
# 2. Place New Order (Admin Only)
# ------------------------------------------------------------------------------
@router.post("/api/customers/{cid}/orders")
def create_order(
    cid: str,
    x: OrderIn,
    db: Session = Depends(get_db),
    u: dict = Depends(admin_auth),
):
    """
    Creates a new multi-item order transaction and recalculates RFM metrics.
    UI Component: 'Add order' button and modal (`OrderModal.jsx`).
    """
    cust = db.execute(
        text("SELECT customer_id, customer_unique_id FROM customers WHERE customer_unique_id=:id OR customer_id=:id LIMIT 1"),
        {"id": cid},
    ).fetchone()
    if not cust:
        raise HTTPException(404, "Customer not found")

    actual_cid = cust._mapping.get("customer_id")
    actual_uid = cust._mapping.get("customer_unique_id")
    new_order_id = os.urandom(16).hex()
    
    # Process multi-item or single-item line payloads
    items_to_insert = []
    if x.items and len(x.items) > 0:
        for idx, itm in enumerate(x.items, start=1):
            items_to_insert.append({
                "item_id": idx,
                "category": itm.product_category.strip().lower(),
                "product_id": itm.product_id.strip() if itm.product_id else None,
                "price": float(itm.price),
                "freight": float(itm.freight_value or 0.0),
            })
    else:
        cat = (x.product_category or "beleza_saude").strip().lower()
        items_to_insert.append({
            "item_id": 1,
            "category": cat,
            "product_id": x.product_id.strip() if x.product_id else None,
            "price": float(x.price or 50.0),
            "freight": float(x.freight_value or 15.0),
        })

    seller_row = db.execute(text("SELECT seller_id FROM sellers LIMIT 1")).fetchone()
    seller_id = seller_row[0] if seller_row else os.urandom(16).hex()

    default_dataset_date = datetime(2018, 6, 15, 12, 0, 0)
    purchase_time = default_dataset_date
    if x.order_purchase_timestamp:
        try:
            purchase_time = datetime.fromisoformat(x.order_purchase_timestamp.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            pass

    est_delivery = purchase_time + timedelta(days=7)
    
    delivered_date = None
    if x.order_delivered_customer_date:
        try:
            delivered_date = datetime.fromisoformat(x.order_delivered_customer_date.replace("Z", "+00:00"))
        except ValueError:
            pass
    elif x.order_status == "delivered":
        delivered_date = purchase_time + timedelta(days=4)

    # Insert order header
    db.execute(
        text(
            """INSERT INTO orders (
                order_id, customer_id, order_status, order_purchase_timestamp,
                order_approved_at, order_delivered_carrier_date, order_delivered_customer_date,
                order_estimated_delivery_date
            ) VALUES (
                :order_id, :customer_id, :order_status, :purchase_time,
                :approved_time, :carrier_time, :delivered_time, :estimated_time
            )"""
        ),
        {
            "order_id": new_order_id,
            "customer_id": actual_cid,
            "order_status": x.order_status,
            "purchase_time": purchase_time,
            "approved_time": purchase_time,
            "carrier_time": purchase_time + timedelta(days=1) if x.order_status in ["delivered", "shipped"] else None,
            "delivered_time": delivered_date,
            "estimated_time": est_delivery,
        },
    )

    # Validate categories and product IDs against catalog
    for item in items_to_insert:
        cat_name = item["category"]
        prod_exists = db.execute(
            text("SELECT 1 FROM products WHERE product_category_name=:cat LIMIT 1"),
            {"cat": cat_name},
        ).fetchone()
        if not prod_exists:
            raise HTTPException(
                status_code=400,
                detail=f"Category '{cat_name}' not found in product catalog. Please select a valid product category from suggestions.",
            )
        if item.get("product_id"):
            specific_prod = db.execute(
                text("SELECT 1 FROM products WHERE product_id = :pid LIMIT 1"),
                {"pid": item["product_id"]},
            ).fetchone()
            if not specific_prod:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product ID '{item['product_id']}' not found in catalog.",
                )

    # Insert order items
    total_order_value = 0.0
    category_names = []
    for item in items_to_insert:
        product_id = item.get("product_id")
        if not product_id:
            prod_row = db.execute(
                text("SELECT product_id FROM products WHERE product_category_name=:cat LIMIT 1"),
                {"cat": item["category"]},
            ).fetchone()
            product_id = prod_row[0]

        db.execute(
            text(
                """INSERT INTO order_items (
                    order_id, order_item_id, product_id, seller_id, shipping_limit_date, price, freight_value
                ) VALUES (
                    :order_id, :order_item_id, :product_id, :seller_id, :shipping_limit, :price, :freight
                )"""
            ),
            {
                "order_id": new_order_id,
                "order_item_id": item["item_id"],
                "product_id": product_id,
                "seller_id": seller_id,
                "shipping_limit": purchase_time + timedelta(days=3),
                "price": item["price"],
                "freight": item["freight"],
            },
        )
        total_order_value += item["price"] + item["freight"]
        category_names.append(item["category"])

    # Insert payment record
    db.execute(
        text(
            """INSERT INTO order_payments (
                order_id, payment_sequential, payment_type, payment_installments, payment_value
            ) VALUES (
                :order_id, 1, :payment_type, :installments, :payment_val
            )"""
        ),
        {
            "order_id": new_order_id,
            "payment_type": x.payment_type.lower().replace(" ", "_"),
            "installments": x.payment_installments,
            "payment_val": total_order_value,
        },
    )

    # Real-time customer RFM aggregate updates
    agg = db.execute(
        text(
            """SELECT 
                COUNT(DISTINCT o.order_id) as freq,
                COALESCE(SUM(oi.price + oi.freight_value), 0) as mon_tot,
                MAX(o.order_purchase_timestamp) as latest_ts
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            WHERE c.customer_unique_id = :uid"""
        ),
        {"uid": actual_uid},
    ).fetchone()

    if agg:
        freq = agg[0] or 1
        mon_tot = float(agg[1] or total_order_value)
        latest_ts = agg[2]
        recency = 0
        if latest_ts:
            recency = max(0, (datetime(2018, 10, 31) - latest_ts).days) if latest_ts <= datetime(2018, 10, 31) else 0

        db.execute(
            text(
                """UPDATE customer_metrics_cache 
                SET frequency=:f, monetary_total=:m, recency_days=:r
                WHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_unique_id = :uid)
                   OR customer_id=:cid OR customer_unique_id=:uid"""
            ),
            {"f": freq, "m": mon_tot, "r": recency, "cid": actual_cid, "uid": actual_uid},
        )

        db.execute(
            text(
                """UPDATE customer_features 
                SET monetary_avg=:m_avg
                WHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_unique_id = :uid)
                   OR customer_id=:cid"""
            ),
            {"m_avg": mon_tot / freq if freq > 0 else 0, "cid": actual_cid, "uid": actual_uid},
        )

    # Log audit entry
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cats_str = ", ".join(list(set(category_names)))
    db.add(
        AuditLog(
            customer_id=actual_uid,
            action="Placed new order",
            performed_by=u.get("sub", "admin"),
            details=f"Created order {new_order_id} ({len(items_to_insert)} items: {cats_str}, Total: R$ {total_order_value:.2f}, Payment: {x.payment_type})",
            created_at=now,
        )
    )

    db.commit()

    return {
        "order_id": new_order_id,
        "customer_id": actual_cid,
        "order_status": x.order_status,
        "order_purchase_timestamp": purchase_time.isoformat(),
        "order_delivered_customer_date": delivered_date.isoformat() if delivered_date else None,
        "order_value": total_order_value,
        "product_category": category_names[0] if category_names else "beleza_saude",
        "payment_type": x.payment_type.lower().replace(" ", "_"),
        "installments": x.payment_installments,
    }


# ------------------------------------------------------------------------------
# 3. Update Existing Order (Admin Only)
# ------------------------------------------------------------------------------
@router.patch("/api/customers/{cid}/orders/{order_id}")
def update_order(
    cid: str,
    order_id: str,
    x: OrderIn,
    db: Session = Depends(get_db),
    u: dict = Depends(admin_auth),
):
    """
    Updates order details (items, prices, status, payment) with automated audit logging.
    UI Component: 'Edit' order modal popup (`OrderModal.jsx`).
    """
    ord_row = db.execute(
        text("SELECT order_id, customer_id, order_status, order_purchase_timestamp, order_delivered_customer_date FROM orders WHERE order_id=:oid LIMIT 1"),
        {"oid": order_id},
    ).fetchone()
    if not ord_row:
        raise HTTPException(404, "Order not found")

    cust = db.execute(
        text("SELECT customer_unique_id FROM customers WHERE customer_unique_id=:id OR customer_id=:id LIMIT 1"),
        {"id": cid},
    ).fetchone()
    uid = cust[0] if cust else cid

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    purchase_time = ord_row[3]
    if x.order_purchase_timestamp:
        try:
            purchase_time = datetime.fromisoformat(x.order_purchase_timestamp.replace("Z", "+00:00"))
        except ValueError:
            pass

    delivered_date = ord_row[4]
    if x.order_delivered_customer_date:
        try:
            delivered_date = datetime.fromisoformat(x.order_delivered_customer_date.replace("Z", "+00:00"))
        except ValueError:
            pass
    elif x.order_status == "delivered" and not delivered_date:
        delivered_date = now
    elif x.order_status != "delivered" and not x.order_delivered_customer_date:
        delivered_date = None

    db.execute(
        text(
            """UPDATE orders SET 
                order_status=:status, 
                order_purchase_timestamp=:purchase_time, 
                order_delivered_customer_date=:delivered_date 
            WHERE order_id=:oid"""
        ),
        {
            "status": x.order_status,
            "purchase_time": purchase_time,
            "delivered_date": delivered_date,
            "oid": order_id,
        },
    )

    items_to_save = []
    if x.items and len(x.items) > 0:
        for idx, itm in enumerate(x.items, start=1):
            items_to_save.append({
                "item_id": idx,
                "category": itm.product_category.strip().lower(),
                "product_id": itm.product_id.strip() if itm.product_id else None,
                "price": float(itm.price),
                "freight": float(itm.freight_value or 0.0),
            })
    else:
        cat = (x.product_category or "beleza_saude").strip().lower()
        items_to_save.append({
            "item_id": 1,
            "category": cat,
            "product_id": x.product_id.strip() if x.product_id else None,
            "price": float(x.price or 50.0),
            "freight": float(x.freight_value or 15.0),
        })

    for item in items_to_save:
        cat_name = item["category"]
        prod_exists = db.execute(
            text("SELECT 1 FROM products WHERE product_category_name=:cat LIMIT 1"),
            {"cat": cat_name},
        ).fetchone()
        if not prod_exists:
            raise HTTPException(
                status_code=400,
                detail=f"Category '{cat_name}' not found in product catalog. Please select a valid product category from suggestions.",
            )
        if item.get("product_id"):
            specific_prod = db.execute(
                text("SELECT 1 FROM products WHERE product_id = :pid LIMIT 1"),
                {"pid": item["product_id"]},
            ).fetchone()
            if not specific_prod:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product ID '{item['product_id']}' not found in catalog.",
                )

    seller_row = db.execute(text("SELECT seller_id FROM sellers LIMIT 1")).fetchone()
    seller_id = seller_row[0] if seller_row else os.urandom(16).hex()

    db.execute(text("DELETE FROM order_items WHERE order_id=:oid"), {"oid": order_id})
    total_val = 0.0
    for item in items_to_save:
        product_id = item.get("product_id")
        if not product_id:
            prod_row = db.execute(
                text("SELECT product_id FROM products WHERE product_category_name=:cat LIMIT 1"),
                {"cat": item["category"]},
            ).fetchone()
            product_id = prod_row[0]

        db.execute(
            text(
                """INSERT INTO order_items (
                    order_id, order_item_id, product_id, seller_id, shipping_limit_date, price, freight_value
                ) VALUES (
                    :order_id, :order_item_id, :product_id, :seller_id, :shipping_limit, :price, :freight
                )"""
            ),
            {
                "order_id": order_id,
                "order_item_id": item["item_id"],
                "product_id": product_id,
                "seller_id": seller_id,
                "shipping_limit": purchase_time + timedelta(days=3),
                "price": item["price"],
                "freight": item["freight"],
            },
        )
        total_val += item["price"] + item["freight"]

    pay_exists = db.execute(text("SELECT 1 FROM order_payments WHERE order_id=:oid LIMIT 1"), {"oid": order_id}).fetchone()
    if pay_exists:
        db.execute(
            text("UPDATE order_payments SET payment_type=:pt, payment_installments=:pi, payment_value=:pv WHERE order_id=:oid"),
            {"pt": x.payment_type.lower().replace(" ", "_"), "pi": x.payment_installments, "pv": total_val, "oid": order_id},
        )
    else:
        db.execute(
            text("INSERT INTO order_payments (order_id, payment_sequential, payment_type, payment_installments, payment_value) VALUES (:oid, 1, :pt, :pi, :pv)"),
            {"oid": order_id, "pt": x.payment_type.lower().replace(" ", "_"), "pi": x.payment_installments, "pv": total_val},
        )

    agg = db.execute(
        text(
            """SELECT 
                COUNT(DISTINCT o.order_id) as freq,
                COALESCE(SUM(oi.price + oi.freight_value), 0) as mon_tot,
                MAX(o.order_purchase_timestamp) as latest_ts
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            WHERE c.customer_unique_id = :uid"""
        ),
        {"uid": uid},
    ).fetchone()

    if agg:
        freq = agg[0] or 1
        mon_tot = float(agg[1] or total_val)
        latest_ts = agg[2]
        recency = 0
        if latest_ts:
            recency = max(0, (datetime(2018, 9, 30) - latest_ts).days) if latest_ts <= datetime(2018, 9, 30) else 0

        db.execute(
            text(
                """UPDATE customer_metrics_cache 
                SET frequency=:f, monetary_total=:m, recency_days=:r
                WHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_unique_id = :uid)
                   OR customer_id=:cid OR customer_unique_id=:uid"""
            ),
            {"f": freq, "m": mon_tot, "r": recency, "cid": ord_row[1], "uid": uid},
        )

        db.execute(
            text(
                """UPDATE customer_features 
                SET monetary_avg=:m_avg
                WHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_unique_id = :uid)
                   OR customer_id=:cid"""
            ),
            {"m_avg": mon_tot / freq if freq > 0 else 0, "cid": ord_row[1], "uid": uid},
        )

    db.add(
        AuditLog(
            customer_id=uid,
            action="Updated order",
            performed_by=u.get("sub", "admin"),
            details=f"Modified order {order_id}: Status={x.order_status}, Category={x.product_category}, Total=R$ {total_val:.2f}, Payment={x.payment_type}",
            created_at=now,
        )
    )

    db.commit()

    return {
        "order_id": order_id,
        "order_status": x.order_status,
        "order_purchase_timestamp": purchase_time.isoformat() if isinstance(purchase_time, (datetime, date)) else purchase_time,
        "order_delivered_customer_date": delivered_date.isoformat() if isinstance(delivered_date, (datetime, date)) else delivered_date,
        "order_value": total_val,
        "price": x.price,
        "freight_value": x.freight_value,
        "product_category": x.product_category,
        "payment_type": x.payment_type.lower().replace(" ", "_"),
        "installments": x.payment_installments,
    }


# ------------------------------------------------------------------------------
# 4. Delete Order (Admin Only)
# ------------------------------------------------------------------------------
@router.post("/api/customers/{cid}/orders/bulk-delete")
def bulk_delete_orders(
    cid: str,
    payload: BulkOrderDeleteIn,
    db: Session = Depends(get_db),
    u: dict = Depends(admin_auth),
):
    """Deletes selected orders for one customer in a single transaction."""
    customer = db.execute(
        text(
            """SELECT customer_id, customer_unique_id
            FROM customers
            WHERE customer_unique_id=:id OR customer_id=:id
            LIMIT 1"""
        ),
        {"id": cid},
    ).mappings().first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    order_ids = list(dict.fromkeys(payload.order_ids))
    owned_ids = db.execute(
        text(
            """SELECT o.order_id
            FROM orders o
            JOIN customers c ON c.customer_id = o.customer_id
            WHERE c.customer_unique_id=:uid AND o.order_id IN :order_ids"""
        ).bindparams(bindparam("order_ids", expanding=True)),
        {"uid": customer["customer_unique_id"], "order_ids": order_ids},
    ).scalars().all()
    if len(owned_ids) != len(order_ids):
        raise HTTPException(400, "One or more selected orders do not belong to this customer")

    db.execute(
        text("DELETE FROM order_reviews WHERE order_id IN :order_ids").bindparams(
            bindparam("order_ids", expanding=True)
        ),
        {"order_ids": order_ids},
    )
    db.execute(
        text("DELETE FROM order_items WHERE order_id IN :order_ids").bindparams(
            bindparam("order_ids", expanding=True)
        ),
        {"order_ids": order_ids},
    )
    db.execute(
        text("DELETE FROM order_payments WHERE order_id IN :order_ids").bindparams(
            bindparam("order_ids", expanding=True)
        ),
        {"order_ids": order_ids},
    )
    db.execute(
        text("DELETE FROM orders WHERE order_id IN :order_ids").bindparams(
            bindparam("order_ids", expanding=True)
        ),
        {"order_ids": order_ids},
    )

    agg = db.execute(
        text(
            """SELECT COUNT(DISTINCT o.order_id) AS freq,
                COALESCE(SUM(oi.price + oi.freight_value), 0) AS mon_tot,
                MAX(o.order_purchase_timestamp) AS latest_ts
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            WHERE c.customer_unique_id=:uid"""
        ),
        {"uid": customer["customer_unique_id"]},
    ).fetchone()
    freq = agg[0] or 0
    monetary_total = float(agg[1] or 0)
    latest_ts = agg[2]
    recency = max(0, (datetime(2018, 9, 30) - latest_ts).days) if latest_ts else 0
    avg_score = db.execute(
        text(
            """SELECT COALESCE(AVG(r.review_score), 0)
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            JOIN order_reviews r ON r.order_id = o.order_id
            WHERE c.customer_unique_id=:uid"""
        ),
        {"uid": customer["customer_unique_id"]},
    ).scalar() or 0.0
    db.execute(
        text(
            """UPDATE customer_metrics_cache
            SET frequency=:f, monetary_total=:m, recency_days=:r, avg_review_score=:score
            WHERE customer_id IN (
                SELECT customer_id FROM customers WHERE customer_unique_id=:uid
            ) OR customer_unique_id=:uid"""
        ),
        {"f": freq, "m": monetary_total, "r": recency, "score": float(avg_score), "uid": customer["customer_unique_id"]},
    )
    db.add(
        AuditLog(
            customer_id=customer["customer_unique_id"],
            action="Deleted orders",
            performed_by=u.get("sub", "admin"),
            details=f"Deleted {len(order_ids)} orders: {', '.join(order_ids)}.",
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    )
    db.commit()
    return {"deleted": True, "order_ids": order_ids, "count": len(order_ids)}


@router.delete("/api/customers/{cid}/orders/{order_id}")
def delete_order(
    cid: str,
    order_id: str,
    db: Session = Depends(get_db),
    u: dict = Depends(admin_auth),
):
    """
    Deletes an order, cascades item/payment/review records, and recalculates customer spend.
    UI Component: 'Delete' order button on `Customer.jsx`.
    """
    ord_row = db.execute(
        text("SELECT order_id, customer_id FROM orders WHERE order_id=:oid LIMIT 1"),
        {"oid": order_id},
    ).fetchone()
    if not ord_row:
        raise HTTPException(404, "Order not found")

    cust = db.execute(
        text("SELECT customer_id, customer_unique_id FROM customers WHERE customer_unique_id=:id OR customer_id=:id LIMIT 1"),
        {"id": cid},
    ).fetchone()
    actual_cid = cust[0] if cust else cid
    actual_uid = cust[1] if cust else cid

    db.execute(text("DELETE FROM order_reviews WHERE order_id=:oid"), {"oid": order_id})
    db.execute(text("DELETE FROM order_items WHERE order_id=:oid"), {"oid": order_id})
    db.execute(text("DELETE FROM order_payments WHERE order_id=:oid"), {"oid": order_id})
    db.execute(text("DELETE FROM orders WHERE order_id=:oid"), {"oid": order_id})

    agg = db.execute(
        text(
            """SELECT 
                COUNT(DISTINCT o.order_id) as freq,
                COALESCE(SUM(oi.price + oi.freight_value), 0) as mon_tot,
                MAX(o.order_purchase_timestamp) as latest_ts
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            WHERE c.customer_unique_id = :uid"""
        ),
        {"uid": actual_uid},
    ).fetchone()

    freq = agg[0] if agg and agg[0] is not None else 0
    mon_tot = float(agg[1]) if agg and agg[1] is not None else 0.0
    latest_ts = agg[2] if agg else None
    recency = 0
    if latest_ts:
        recency = max(0, (datetime(2018, 9, 30) - latest_ts).days) if latest_ts <= datetime(2018, 9, 30) else 0

    avg_score = db.execute(
        text(
            """SELECT COALESCE(AVG(r.review_score), 0)
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            JOIN order_reviews r ON r.order_id = o.order_id
            WHERE c.customer_unique_id = :uid"""
        ),
        {"uid": actual_uid},
    ).scalar() or 0.0

    db.execute(
        text(
            """UPDATE customer_metrics_cache 
            SET frequency=:f, monetary_total=:m, recency_days=:r, avg_review_score=:score
            WHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_unique_id = :uid)
               OR customer_id=:cid OR customer_unique_id=:uid"""
        ),
        {"f": freq, "m": mon_tot, "r": recency, "score": float(avg_score), "cid": actual_cid, "uid": actual_uid},
    )

    db.execute(
        text(
            """UPDATE customer_features 
            SET monetary_avg=:m_avg
            WHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_unique_id = :uid)
               OR customer_id=:cid"""
        ),
        {"m_avg": mon_tot / freq if freq > 0 else 0, "cid": actual_cid, "uid": actual_uid},
    )

    db.add(
        AuditLog(
            customer_id=actual_uid,
            action="Deleted order",
            performed_by=u.get("sub", "admin"),
            details=f"Deleted order {order_id} and associated order reviews.",
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    )

    db.commit()

    return {"deleted": True, "order_id": order_id}
