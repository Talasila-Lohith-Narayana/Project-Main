"""
================================================================================
EXECUTIVE DASHBOARD ROUTER (routers/dashboard.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
This file is the "business intelligence engine". It aggregates high-level analytics
across the entire dataset, calculating total revenue, average order values, delivery speeds,
customer repeat rates, category popularity, monthly sales trends, and satisfaction scores.

WHAT PART OF THE UI HANDLES THIS:
---------------------------------
1. Dashboard Main Page (/):
   - Top KPI Cards: Total Customers (96k+), Total Orders (99k+), Total Revenue (R$ 16.0M),
     Average Rating (4.1★), Repeat Customer Rate, Average Order Value (AOV), Avg Delivery Speed.
   - Monthly Revenue & Order Volume Area Chart.
   - Customer Segmentation Donut Chart (Champions, Engaged, At Risk, New).
   - Top Product Categories Bar Chart.
   - Regional Revenue by Brazilian State Map / Chart.
   - Payment Methods Breakdown (Credit Card, Boleto, Voucher, Debit).
   - Review Rating Star Distribution (5★ to 1★).
================================================================================
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..auth import auth
from ..database import get_db
from ..utils import rows, ser

router = APIRouter(tags=["dashboard"])

@router.get("/api/dashboard/summary")
def dashboard(
    timeframe: str = "all",
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    _: str = Depends(auth),
):
    """
    Computes all aggregated executive metrics for the primary Dashboard view,
    with optional timeframe horizon filtering ('all', '2018', '2017', '2016', 'l6m', 'l30d', 'custom')
    and custom start_date / end_date range.
    UI Component: `Dashboard.jsx`.
    """
    # Build timeframe WHERE filter clause safely using parameterized bindings
    params = {}
    time_filter_orders = ""
    conds = []

    if timeframe == "custom" and (start_date or end_date):
        if start_date:
            conds.append("o.order_purchase_timestamp >= :start_ts")
            params["start_ts"] = f"{start_date.strip()} 00:00:00"
        if end_date:
            conds.append("o.order_purchase_timestamp <= :end_ts")
            params["end_ts"] = f"{end_date.strip()} 23:59:59"
    elif timeframe == "2018":
        conds.append("o.order_purchase_timestamp >= '2018-01-01 00:00:00' AND o.order_purchase_timestamp <= '2018-12-31 23:59:59'")
    elif timeframe == "2017":
        conds.append("o.order_purchase_timestamp >= '2017-01-01 00:00:00' AND o.order_purchase_timestamp <= '2017-12-31 23:59:59'")
    elif timeframe == "2016":
        conds.append("o.order_purchase_timestamp >= '2016-01-01 00:00:00' AND o.order_purchase_timestamp <= '2016-12-31 23:59:59'")
    elif timeframe == "l6m":
        conds.append("o.order_purchase_timestamp >= '2018-03-01 00:00:00'")
    elif timeframe == "l30d":
        conds.append("o.order_purchase_timestamp >= '2018-08-01 00:00:00'")

    if conds:
        time_filter_orders = f"WHERE {' AND '.join(conds)}"

    # 1. Calculate Average Order Value and Delivery Days
    delivery_filter = "WHERE o.order_delivered_customer_date IS NOT NULL"
    if time_filter_orders:
        delivery_filter += f" AND {time_filter_orders.replace('WHERE ', '')}"

    health_metrics = db.execute(
        text(
            f"""SELECT 
                AVG(p.payment_value) as aov,
                AVG(DATEDIFF(o.order_delivered_customer_date, o.order_purchase_timestamp)) as avg_delivery_days
            FROM orders o
            JOIN order_payments p ON p.order_id = o.order_id
            {delivery_filter}"""
        ),
        params,
    ).fetchone()

    # 2. Compute Top KPI Cards Summary
    if time_filter_orders:
        total_customers = db.execute(
            text(f"SELECT COUNT(DISTINCT c.customer_unique_id) FROM customers c JOIN orders o ON o.customer_id = c.customer_id {time_filter_orders}"),
            params,
        ).scalar() or 0
        total_orders = db.execute(
            text(f"SELECT COUNT(*) FROM orders o {time_filter_orders}"),
            params,
        ).scalar() or 0
        total_rev = db.execute(
            text(f"SELECT COALESCE(SUM(p.payment_value),0) FROM order_payments p JOIN orders o ON o.order_id = p.order_id {time_filter_orders}"),
            params,
        ).scalar() or 0
        total_revs = db.execute(
            text(f"SELECT COUNT(*) FROM order_reviews r JOIN orders o ON o.order_id = r.order_id {time_filter_orders}"),
            params,
        ).scalar() or 0
        avg_score = db.execute(
            text(f"SELECT COALESCE(AVG(r.review_score),0) FROM order_reviews r JOIN orders o ON o.order_id = r.order_id {time_filter_orders}"),
            params,
        ).scalar() or 0
        repeat_custs = db.execute(
            text(f"""SELECT COUNT(*) FROM (
                SELECT c.customer_unique_id, COUNT(o.order_id) cnt 
                FROM customers c JOIN orders o ON o.customer_id = c.customer_id 
                {time_filter_orders} GROUP BY c.customer_unique_id HAVING cnt > 1
            ) t"""),
            params,
        ).scalar() or 0
    else:
        total_customers = db.execute(text("SELECT COUNT(DISTINCT customer_unique_id) FROM customers")).scalar() or 0
        total_orders = db.execute(text("SELECT COUNT(*) FROM orders")).scalar() or 0
        total_rev = db.execute(text("SELECT COALESCE(SUM(payment_value),0) FROM order_payments")).scalar() or 0
        total_revs = db.execute(text("SELECT COUNT(*) FROM order_reviews")).scalar() or 0
        avg_score = db.execute(text("SELECT COALESCE(AVG(review_score),0) FROM order_reviews")).scalar() or 0
        repeat_custs = db.execute(
            text("SELECT COUNT(DISTINCT customer_unique_id) FROM customer_metrics_cache WHERE frequency > 1")
        ).scalar() or 0

    k = {
        "customers": total_customers,
        "orders": total_orders,
        "revenue": total_rev,
        "reviews": total_revs,
        "avg_rating": avg_score,
        "repeat_customers": repeat_custs,
        "avg_order_value": float(health_metrics[0]) if health_metrics and health_metrics[0] is not None else 0.0,
        "avg_delivery_days": float(health_metrics[1]) if health_metrics and health_metrics[1] is not None else 0.0,
    }

    # 3. Customer Segments Breakdown (Filtered by selected timeframe / date range)
    if time_filter_orders:
        seg = db.execute(
            text(
                f"""SELECT c.segment, COUNT(DISTINCT c.customer_unique_id) as count 
                FROM customer_metrics_cache c
                JOIN customers cust ON cust.customer_unique_id = c.customer_unique_id
                JOIN orders o ON o.customer_id = cust.customer_id
                {time_filter_orders}
                GROUP BY c.segment 
                ORDER BY count DESC"""
            ),
            params,
        ).fetchall()
    else:
        seg = db.execute(
            text(
                """SELECT segment, COUNT(*) as count 
                FROM (SELECT customer_unique_id, segment FROM customer_metrics_cache GROUP BY customer_unique_id, segment) t 
                GROUP BY segment 
                ORDER BY count DESC"""
            )
        ).fetchall()

    # 4. Monthly Trend Time-Series
    monthly_where = f"{time_filter_orders} AND o.order_purchase_timestamp IS NOT NULL" if time_filter_orders else "WHERE o.order_purchase_timestamp IS NOT NULL"
    monthly_raw = db.execute(
        text(
            f"""SELECT DATE_FORMAT(o.order_purchase_timestamp,'%Y-%m') month,COUNT(*) orders,COALESCE(SUM(p.payment_value),0) revenue 
            FROM orders o 
            LEFT JOIN order_payments p ON p.order_id=o.order_id 
            {monthly_where} 
            GROUP BY month ORDER BY month"""
        ),
        params,
    ).fetchall()

    monthly_dict = {r[0]: {"orders": int(r[1]), "revenue": float(r[2])} for r in monthly_raw if r[0]}
    all_recorded_months = sorted(list(monthly_dict.keys()))
    monthly_series = []
    if all_recorded_months:
        start_y, start_m = map(int, all_recorded_months[0].split("-"))
        end_y, end_m = map(int, all_recorded_months[-1].split("-"))
        cur_y, cur_m = start_y, start_m
        while (cur_y < end_y) or (cur_y == end_y and cur_m <= end_m):
            m_str = f"{cur_y:04d}-{cur_m:02d}"
            if m_str in monthly_dict:
                monthly_series.append({"month": m_str, **monthly_dict[m_str]})
            else:
                monthly_series.append({"month": m_str, "orders": 0, "revenue": 0.0})
            cur_m += 1
            if cur_m > 12:
                cur_m = 1
                cur_y += 1
    else:
        monthly_series = rows(monthly_raw)

    # 5. Top 8 Product Categories
    cat_order_join = "JOIN orders o ON o.order_id = oi.order_id" if time_filter_orders else ""
    cats = db.execute(
        text(
            f"""SELECT COALESCE(pr.product_category_name,'Unknown') category,COUNT(*) purchases 
            FROM order_items oi 
            {cat_order_join}
            LEFT JOIN products pr ON pr.product_id=oi.product_id 
            {time_filter_orders}
            GROUP BY category ORDER BY purchases DESC LIMIT 8"""
        ),
        params,
    ).fetchall()

    # 6. Top Brazilian States by Revenue
    top_states = db.execute(
        text(
            f"""SELECT c.customer_state as state, COUNT(DISTINCT c.customer_unique_id) as customers, COALESCE(SUM(p.payment_value), 0) as revenue
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            JOIN order_payments p ON p.order_id = o.order_id
            {time_filter_orders}
            GROUP BY c.customer_state
            ORDER BY revenue DESC
            LIMIT 6"""
        ),
        params,
    ).fetchall()

    # 7. Payment Type Distribution
    pay_where = f"WHERE payment_type != 'not_defined' AND {time_filter_orders.replace('WHERE ', '')}" if time_filter_orders else "WHERE payment_type != 'not_defined'"
    payments = db.execute(
        text(
            f"""SELECT p.payment_type as type, COUNT(*) as count, COALESCE(SUM(p.payment_value), 0) as total_value
            FROM order_payments p
            JOIN orders o ON o.order_id = p.order_id
            {pay_where}
            GROUP BY p.payment_type
            ORDER BY count DESC"""
        ),
        params,
    ).fetchall()

    # 8. Star Rating Distribution
    rev_where = f"WHERE r.review_score IS NOT NULL AND {time_filter_orders.replace('WHERE ', '')}" if time_filter_orders else "WHERE r.review_score IS NOT NULL"
    ratings_dist = db.execute(
        text(
            f"""SELECT r.review_score as stars, COUNT(*) as count
            FROM order_reviews r
            JOIN orders o ON o.order_id = r.order_id
            {rev_where}
            GROUP BY r.review_score
            ORDER BY r.review_score DESC"""
        ),
        params,
    ).fetchall()

    return {
        "kpis": {**{k_name: ser(v_val) for k_name, v_val in k.items()}},
        "segments": rows(seg),
        "monthly": monthly_series,
        "categories": rows(cats),
        "top_states": rows(top_states),
        "payments": rows(payments),
        "ratings_dist": rows(ratings_dist),
        "timeframe": timeframe,
    }
