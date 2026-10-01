from __future__ import annotations

from typing import Any

from sqlalchemy import text

from app.core.database import engine

ANALYTICS_SCHEMA = "customer_intelligence"
PREDICTIONS_TABLE = f"{ANALYTICS_SCHEMA}.churn_predictions"
RISK_TABLE = f"{ANALYTICS_SCHEMA}.customer_risk_tiers"

def fetch_all(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    with engine.connect() as connection:
        rows = connection.execute(text(sql), params or {}).mappings().all()
    return [dict(row) for row in rows]


def fetch_one(sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def churn_summary(threshold: float) -> dict[str, Any]:
    return fetch_one(
        f"""
        SELECT COUNT(*) AS total_customers,
               AVG(churn_probability) AS avg_churn_probability,
               SUM(CASE WHEN churn_probability >= :threshold THEN 1 ELSE 0 END)
                   AS predicted_churn_customers,
               MAX(scored_at) AS refreshed_at
        FROM {PREDICTIONS_TABLE}
        """,
        {"threshold": threshold},
    ) or {}


def prediction_values() -> list[dict[str, Any]]:
    return fetch_all(
        f"SELECT churn_probability, shap_values, reason_codes FROM {PREDICTIONS_TABLE}"
    )


def prediction_for_customer(customer_unique_id: str) -> dict[str, Any] | None:
    return fetch_one(
        f"""
        SELECT customer_unique_id, churn_probability, shap_values, reason_codes,
               model_version, scored_at
        FROM {PREDICTIONS_TABLE}
        WHERE customer_unique_id = :customer_unique_id
        ORDER BY scored_at DESC
        LIMIT 1
        """,
        {"customer_unique_id": customer_unique_id},
    )


def risk_for_customer(customer_unique_id: str) -> dict[str, Any] | None:
    return fetch_one(
        f"""
        SELECT r.customer_unique_id, r.risk_tier, p.churn_probability
        FROM {RISK_TABLE} r
        LEFT JOIN {PREDICTIONS_TABLE} p
               ON p.customer_unique_id = r.customer_unique_id
        WHERE r.customer_unique_id = :customer_unique_id
        ORDER BY p.scored_at DESC
        LIMIT 1
        """,
        {"customer_unique_id": customer_unique_id},
    )


def last_refresh() -> dict[str, Any] | None:
    return fetch_one(f"SELECT MAX(scored_at) AS last_refreshed_at FROM {PREDICTIONS_TABLE}")
