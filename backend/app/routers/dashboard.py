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


# ------------------------------------------------------------------------------
# Helper: Build timeframe WHERE clause from a timeframe key
# ------------------------------------------------------------------------------
def _build_time_filter(tf, sd=None, ed=None, param_prefix=""):
    """Returns (where_clause_str, params_dict) for a given timeframe."""
    params = {}
    conds = []
    p = param_prefix  # prefix avoids param name collisions in comparison queries

    if tf == "custom" and (sd or ed):
        if sd:
            conds.append(f"o.order_purchase_timestamp >= :{p}start_ts")
            params[f"{p}start_ts"] = f"{sd.strip()} 00:00:00"
        if ed:
            conds.append(f"o.order_purchase_timestamp <= :{p}end_ts")
            params[f"{p}end_ts"] = f"{ed.strip()} 23:59:59"
    elif tf == "2018":
        conds.append("o.order_purchase_timestamp >= '2018-01-01 00:00:00' AND o.order_purchase_timestamp <= '2018-12-31 23:59:59'")
    elif tf == "2017":
        conds.append("o.order_purchase_timestamp >= '2017-01-01 00:00:00' AND o.order_purchase_timestamp <= '2017-12-31 23:59:59'")
    elif tf == "2016":
        conds.append("o.order_purchase_timestamp >= '2016-01-01 00:00:00' AND o.order_purchase_timestamp <= '2016-12-31 23:59:59'")
    elif tf == "l6m":
        conds.append("o.order_purchase_timestamp >= '2018-03-01 00:00:00'")
    elif tf == "l30d":
        conds.append("o.order_purchase_timestamp >= '2018-08-01 00:00:00'")

    where = f"WHERE {' AND '.join(conds)}" if conds else ""
    return where, params


# ------------------------------------------------------------------------------
# Helper: Compute core KPI numbers for a given time filter
# ------------------------------------------------------------------------------
def _compute_kpis(db, time_filter_orders, params):
    """Runs the aggregation queries and returns a KPI dict."""
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

    return {
        "customers": total_customers,
        "orders": total_orders,
        "revenue": total_rev,
        "reviews": total_revs,
        "avg_rating": avg_score,
        "repeat_customers": repeat_custs,
        "avg_order_value": float(health_metrics[0]) if health_metrics and health_metrics[0] is not None else 0.0,
        "avg_delivery_days": float(health_metrics[1]) if health_metrics and health_metrics[1] is not None else 0.0,
    }


# ------------------------------------------------------------------------------
# Helper: Compute comparison deltas between two KPI dicts
# ------------------------------------------------------------------------------
def _compute_comparison(current_kpis, previous_kpis):
    """Returns a dict with absolute and percentage deltas for each KPI."""
    comparison = {}
    for key in current_kpis:
        cur = float(ser(current_kpis[key]) or 0)
        prev = float(ser(previous_kpis[key]) or 0)
        delta = cur - prev
        pct = ((delta / prev) * 100) if prev != 0 else (100.0 if delta > 0 else 0.0)
        comparison[key] = {
            "current": cur,
            "previous": prev,
            "delta": round(delta, 2),
            "pct_change": round(pct, 1),
        }
    return comparison


@router.get("/api/dashboard/summary")
def dashboard(
    timeframe: str = "all",
    start_date: str = None,
    end_date: str = None,
    compare_to: str = None,
    compare_start_date: str = None,
    compare_end_date: str = None,
    db: Session = Depends(get_db),
    _: str = Depends(auth),
):
    """
    Computes all aggregated executive metrics for the primary Dashboard view,
    with optional timeframe horizon filtering ('all', '2018', '2017', '2016', 'l6m', 'l30d', 'custom')
    and custom start_date / end_date range.
    Supports period-over-period comparison via the 'compare_to' parameter.
    UI Component: `Dashboard.jsx`.
    """
    # Build primary timeframe filter
    time_filter_orders, params = _build_time_filter(timeframe, start_date, end_date)

    # 1-2. Compute primary KPIs
    k = _compute_kpis(db, time_filter_orders, params)

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

    # 9. Churn Risk Summary (computed from customer_metrics_cache)
    churn_risk_rows = db.execute(
        text(
            """SELECT
                SUM(CASE WHEN churn_score >= 51 THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN churn_score BETWEEN 21 AND 50 THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN churn_score <= 20 THEN 1 ELSE 0 END) as low
            FROM (
                SELECT customer_unique_id,
                    (CASE WHEN recency_days > 180 THEN 30 WHEN recency_days > 120 THEN 15 ELSE 0 END)
                    + (CASE WHEN frequency = 1 THEN 25 ELSE 0 END)
                    + (CASE WHEN avg_review_score > 0 AND avg_review_score < 3.0 THEN 20 ELSE 0 END)
                    + (CASE WHEN monetary_total < 50 THEN 10 ELSE 0 END)
                    + (CASE WHEN segment = 'At Risk' THEN 20 ELSE 0 END)
                    AS churn_score
                FROM customer_metrics_cache
                GROUP BY customer_unique_id, recency_days, frequency, avg_review_score, monetary_total, segment
            ) scored"""
        )
    ).fetchone()
    churn_risk_summary = {
        "high": int(churn_risk_rows[0] or 0) if churn_risk_rows else 0,
        "medium": int(churn_risk_rows[1] or 0) if churn_risk_rows else 0,
        "low": int(churn_risk_rows[2] or 0) if churn_risk_rows else 0,
    }

    # 10. Period-over-Period Comparison (optional)
    comparison = None
    if compare_to:
        comp_filter, comp_params = _build_time_filter(
            compare_to, compare_start_date, compare_end_date, param_prefix="cmp_"
        )
        comp_kpis = _compute_kpis(db, comp_filter, comp_params)
        comparison = _compute_comparison(k, comp_kpis)
        comparison["compare_to"] = compare_to

    result = {
        "kpis": {**{k_name: ser(v_val) for k_name, v_val in k.items()}},
        "segments": rows(seg),
        "monthly": monthly_series,
        "categories": rows(cats),
        "top_states": rows(top_states),
        "payments": rows(payments),
        "ratings_dist": rows(ratings_dist),
        "churn_risk_summary": churn_risk_summary,
        "timeframe": timeframe,
    }
    if comparison is not None:
        result["comparison"] = comparison

    return result
