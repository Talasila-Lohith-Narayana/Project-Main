from __future__ import annotations

import json
import logging
from collections import Counter
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.api.churn_analytics import repository as repo
from app.database import engine
from app.routers.predictions import REASON_CODE_MESSAGES, get_ml_predictor

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Churn Analytics"])


class PredictRequest(BaseModel):
    customer_unique_id: str


def _db(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except (OperationalError, ProgrammingError) as exc:
        logger.exception("Database error in %s", getattr(fn, "__name__", fn))
        raise HTTPException(status_code=503, detail="A required pipeline table is unavailable.") from exc


def _decode_json(value: Any, expected_type: type):
    if isinstance(value, expected_type):
        return value
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8")
    if isinstance(value, str):
        try:
            decoded = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return expected_type()
        return decoded if isinstance(decoded, expected_type) else expected_type()
    return expected_type()


def _shap_records() -> list[dict[str, float]]:
    records = []
    for row in _db(repo.prediction_values):
        values = _decode_json(row.get("shap_values"), dict)
        records.append({str(name): float(value) for name, value in values.items()})
    return records


@router.get("/churn/summary")
def churn_summary(threshold: float = Query(0.5, ge=0, le=1)) -> dict[str, Any]:
    result = _db(repo.churn_summary, threshold)
    total = int(result.get("total_customers") or 0)
    predicted = int(result.get("predicted_churn_customers") or 0)
    return {
        "total_customers": total,
        "avg_churn_probability": (
            float(result["avg_churn_probability"])
            if result.get("avg_churn_probability") is not None
            else None
        ),
        "predicted_churn_customers": predicted,
        "predicted_churn_rate": predicted / total if total else 0.0,
        "threshold": threshold,
        "refreshed_at": result.get("refreshed_at"),
    }


@router.get("/churn/top-features")
def churn_top_features(limit: int = Query(10, ge=1, le=100)) -> dict[str, Any]:
    records = _shap_records()
    totals: Counter[str] = Counter()
    counts: Counter[str] = Counter()
    for record in records:
        for feature, value in record.items():
            if value > 0:
                totals[feature] += value
                counts[feature] += 1
    features = [
        {
            "feature": feature,
            "avg_positive_shap": totals[feature] / len(records),
            "customers_impacted": counts[feature],
        }
        for feature in totals
    ]
    features.sort(key=lambda item: item["avg_positive_shap"], reverse=True)
    return {"scored_customers": len(records), "features": features[:limit]}


@router.get("/churn/feature-importance-global")
def global_feature_importance(limit: int = Query(100, ge=1, le=500)) -> dict[str, Any]:
    records = _shap_records()
    totals: Counter[str] = Counter()
    counts: Counter[str] = Counter()
    for record in records:
        for feature, value in record.items():
            totals[feature] += abs(value)
            counts[feature] += 1
    features = [
        {
            "feature": feature,
            "mean_abs_shap": totals[feature] / len(records),
            "customers_present": counts[feature],
        }
        for feature in totals
    ]
    features.sort(key=lambda item: item["mean_abs_shap"], reverse=True)
    return {"scored_customers": len(records), "features": features[:limit]}


@router.post("/predict")
def predict_customer(
    payload: PredictRequest,
    predictor=Depends(get_ml_predictor),
):
    try:
        with engine.connect() as connection:
            features = pd.read_sql(
                text(
                    "SELECT * FROM `customer_intelligence`.`features_encoded` "
                    "WHERE customer_unique_id = :customer_unique_id"
                ),
                connection,
                params={"customer_unique_id": payload.customer_unique_id},
            )
    except (OperationalError, ProgrammingError) as exc:
        logger.exception("Could not load customer features for churn prediction")
        raise HTTPException(status_code=503, detail="Customer feature data is unavailable.") from exc
    if features.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown customer_unique_id: {payload.customer_unique_id}",
        )
    return predictor.predict(features)[0]


@router.get("/members/{customer_unique_id}/risk")
def member_risk(customer_unique_id: str) -> dict[str, Any]:
    result = _db(repo.risk_for_customer, customer_unique_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No risk record found for customer: {customer_unique_id}",
        )
    return result


@router.get("/data/last-refresh")
def data_last_refresh() -> dict[str, Any]:
    result = _db(repo.last_refresh) or {}
    return {"last_refreshed_at": result.get("last_refreshed_at")}


@router.get("/churn/probability-distribution")
def probability_distribution() -> dict[str, Any]:
    rows = _db(
        repo.fetch_all,
        f"SELECT churn_probability FROM {repo.PREDICTIONS_TABLE}",
    )
    bins = [
        {
            "range": f"{start / 10:.1f}-{(start + 1) / 10:.1f}",
            "min": start / 10,
            "max": (start + 1) / 10,
            "count": 0,
        }
        for start in range(10)
    ]
    for row in rows:
        value = row.get("churn_probability")
        if value is None:
            continue
        probability = float(value)
        if 0 <= probability <= 1:
            index = min(int(probability * 10), 9)
            bins[index]["count"] += 1
    return {"total_customers": len(rows), "bins": bins}


@router.get("/churn/reason-codes/summary")
def reason_codes_summary() -> dict[str, Any]:
    counts: Counter[str] = Counter()
    for row in _db(repo.prediction_values):
        counts.update(_decode_json(row.get("reason_codes"), list))
    summary = [
        {
            "reason_code": code,
            "message": message,
            "count": counts[code],
        }
        for code, message in REASON_CODE_MESSAGES.items()
    ]
    summary.extend(
        {"reason_code": code, "message": "", "count": count}
        for code, count in counts.items()
        if code not in REASON_CODE_MESSAGES
    )
    summary.sort(key=lambda item: (-item["count"], item["reason_code"]))
    return {"total_reason_codes": sum(counts.values()), "reason_codes": summary}


@router.get("/customers/{customer_unique_id}/explanation")
def customer_explanation(customer_unique_id: str) -> dict[str, Any]:
    row = _db(repo.prediction_for_customer, customer_unique_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No stored prediction found for customer: {customer_unique_id}",
        )
    codes = _decode_json(row.get("reason_codes"), list)
    return {
        "customer_unique_id": row["customer_unique_id"],
        "churn_probability": float(row["churn_probability"]),
        "shap_values": _decode_json(row.get("shap_values"), dict),
        "reason_codes": [
            {"code": code, "message": REASON_CODE_MESSAGES.get(code, "")}
            for code in codes
        ],
        "model_version": row.get("model_version"),
        "scored_at": row.get("scored_at"),
    }


@router.get("/data/tables")
def data_tables() -> dict[str, Any]:
    tables = _db(repo.table_statuses)
    return {"table_count": len(tables), "tables": tables}
