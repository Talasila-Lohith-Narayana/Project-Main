from __future__ import annotations

from typing import Any

from sqlalchemy import inspect, text

from app.database import engine

ANALYTICS_SCHEMA = "customer_intelligence"
PREDICTIONS_TABLE = f"{ANALYTICS_SCHEMA}.churn_predictions"
RISK_TABLE = f"{ANALYTICS_SCHEMA}.customer_risk_tiers"

PIPELINE_TABLES = (
    "customers",
    "sellers",
    "products",
    "geolocation",
    "orders",
    "order_items",
    "order_payments",
    "order_reviews",
    "customer_churn_labels",
    "customer_features_with_labels",
    "features_encoded",
    "customer_features",
    "churn_predictions",
    "customer_cohort_analysis",
    "historical_revenue_trend",
    "historical_churn_trend",
    "historical_trend_combined",
    "customer_intelligence_base",
    "customer_segments",
    "customer_risk_tiers",
    "customer_clv",
    "customer_campaign_recommendations",
    "forecast_revenue_trend",
    "forecast_churn_trend",
)
CORE_TABLES = {
    "customers",
    "sellers",
    "products",
    "geolocation",
    "orders",
    "order_items",
    "order_payments",
    "order_reviews",
}


def _qualified_table(table_name: str) -> str:
    schema = engine.url.database if table_name in CORE_TABLES else ANALYTICS_SCHEMA
    return f"`{schema}`.`{table_name}`"


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


def table_statuses() -> list[dict[str, Any]]:
    inspector = inspect(engine)
    available_by_schema = {
        engine.url.database: set(inspector.get_table_names()),
        ANALYTICS_SCHEMA: set(inspector.get_table_names(schema=ANALYTICS_SCHEMA)),
    }
    statuses = []
    for table_name in PIPELINE_TABLES:
        schema = engine.url.database if table_name in CORE_TABLES else ANALYTICS_SCHEMA
        if table_name not in available_by_schema[schema]:
            statuses.append({"table_name": table_name, "row_count": None, "status": "missing"})
            continue
        row = fetch_one(f"SELECT COUNT(*) AS row_count FROM {_qualified_table(table_name)}")
        statuses.append(
            {
                "table_name": table_name,
                "row_count": int(row["row_count"]) if row else 0,
                "status": "available",
            }
        )
    return statuses
