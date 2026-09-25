"""
AI Predictions & Explainability API Router
Integrates ML model outputs (Churn, SHAP, CLV, Segments, Recommendations)
from the Customer Intelligence Platform into Customer Sphere, with on-the-fly scoring
and manual retraining triggers for new customers.
"""
import os
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd
import numpy as np

from ..database import get_db
from ..auth import auth

router = APIRouter(prefix="/api/predictions", tags=["AI Predictions"])
logger = logging.getLogger("customer_sphere")

ML_PROJECT_ROOT = Path(
    os.getenv(
        "CUSTOMER_INTELLIGENCE_ROOT",
        "/Users/teja/Desktop/untitled folder/customer-intelligence-platform",
    )
).expanduser()
_cached_predictor = None


def get_ml_predictor():
    """Load the shared ML inference service once."""
    global _cached_predictor
    if _cached_predictor is not None:
        return _cached_predictor

    if not ML_PROJECT_ROOT.is_dir():
        raise RuntimeError(
            f"Customer Intelligence project was not found at {ML_PROJECT_ROOT}. "
            "Set CUSTOMER_INTELLIGENCE_ROOT to its location."
        )

    project_root = str(ML_PROJECT_ROOT)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    try:
        # The backend itself is also an ``app`` package. Extend that package's
        # search path so the shared ML modules can be imported without loading
        # a second, conflicting ``app`` package.
        import app as backend_app

        ml_app_path = str(ML_PROJECT_ROOT / "app")
        if ml_app_path not in backend_app.__path__:
            backend_app.__path__.append(ml_app_path)

        from app.ml.explainibility_inference.inference.predict import ChurnPredictor

        model_path = Path(
            os.getenv(
                "MODEL_PATH",
                str(ML_PROJECT_ROOT / "outputs/models/lgb_churn_model_calibrated.joblib"),
            )
        ).expanduser()
        if not model_path.is_absolute():
            model_path = ML_PROJECT_ROOT / model_path

        model_version = os.getenv("MODEL_VERSION", "v1")
        _cached_predictor = ChurnPredictor(
            model_path=model_path,
            model_version=model_version,
        )
        logger.info("Loaded ML inference service from %s", model_path)
    except Exception as exc:
        logger.exception("Unable to initialize the ML inference service")
        raise RuntimeError(
            "The AI model could not be initialized. Check the ML project path, "
            "model artifact, and Python dependencies."
        ) from exc

    return _cached_predictor

REASON_CODE_MESSAGES = {
    "RC01": "Customer leaves positive reviews, which lowers churn risk.",
    "RC01B": "Customer leaves negative or lukewarm reviews, which increases churn risk.",
    "RC02": "Customer has left at least one bad review, which increases churn risk.",
    "RC02B": "Customer has no bad reviews on record, which lowers churn risk.",
    "RC03": "Shipping cost makes up a large share of order value, increasing churn risk.",
    "RC03B": "Shipping cost makes up a small share of order value, lowering churn risk.",
    "RC04": "Orders tend to arrive slowly, increasing churn risk.",
    "RC04B": "Orders tend to arrive quickly, lowering churn risk.",
    "RC05": "Orders tend to arrive later than promised, increasing churn risk.",
    "RC05B": "Orders tend to arrive earlier than promised, lowering churn risk.",
    "RC06": "Recent order was delivered late, increasing churn risk.",
    "RC06B": "Recent order was delivered on time, lowering churn risk.",
}


def _compute_realtime_prediction(db: Session, customer_unique_id: str):
    """
    On-demand feature extraction and live model inference for newly added customers
    who haven't been scored in the offline batch yet.
    """
    # 1. Fetch any orders placed by this customer
    order_stats = db.execute(
        text("""
            SELECT 
                COUNT(DISTINCT o.order_id) as total_orders,
                COALESCE(SUM(oi.price), 0) as total_spend,
                COALESCE(SUM(oi.freight_value), 0) as total_freight,
                COALESCE(AVG(op.payment_installments), 1.0) as avg_installments,
                COALESCE(AVG(r.review_score), 4.2) as avg_review_score,
                COALESCE(MIN(r.review_score), 5) as min_review_score,
                COALESCE(AVG(p.product_weight_g), 1200) as avg_product_weight,
                COALESCE(AVG(DATEDIFF(o.order_delivered_customer_date, o.order_purchase_timestamp)), 9.0) as avg_delivery_days,
                COALESCE(AVG(DATEDIFF(o.order_delivered_customer_date, o.order_estimated_delivery_date)), -6.0) as avg_delivery_delay_days,
                COALESCE(MAX(CASE WHEN o.order_delivered_customer_date > o.order_estimated_delivery_date THEN 1 ELSE 0 END), 0) as is_delayed,
                COALESCE(MAX(CASE WHEN op.payment_type = 'debit_card' THEN 1 ELSE 0 END), 0) as used_debit_card
            FROM customers c
            LEFT JOIN orders o ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            LEFT JOIN products p ON p.product_id = oi.product_id
            LEFT JOIN order_payments op ON op.order_id = o.order_id
            LEFT JOIN order_reviews r ON r.order_id = o.order_id
            WHERE c.customer_unique_id = :cuid
            GROUP BY c.customer_unique_id
        """),
        {"cuid": customer_unique_id},
    ).mappings().first()

    has_orders = order_stats and order_stats["total_orders"] > 0
    total_spend = float(order_stats["total_spend"]) if order_stats else 0.0
    total_freight = float(order_stats["total_freight"]) if order_stats else 0.0
    total_val = total_spend + total_freight

    freight_ratio = (total_freight / total_val) if total_val > 0 else 0.15
    log_monetary = float(np.log1p(total_spend)) if total_spend > 0 else 0.0

    churn_prob = 0.25  # baseline for brand new user with 0 orders
    risk_level = "low"
    shap_drivers = []
    reason_codes_list = []

    if has_orders:
        try:
            # Prepare feature vector matching REQUIRED_FEATURES exactly
            features_df = pd.DataFrame([{
                "customer_unique_id": customer_unique_id,
                "monetary_value": log_monetary,
                "avg_payment_installments": float(order_stats["avg_installments"]),
                "avg_review_score": float(order_stats["avg_review_score"]),
                "has_bad_review": 1 if order_stats["min_review_score"] <= 2 else 0,
                "has_review_comment": 1,
                "avg_product_weight_g": float(order_stats["avg_product_weight"]),
                "freight_ratio": float(freight_ratio),
                "avg_delivery_days": float(order_stats["avg_delivery_days"]),
                "avg_delivery_delay_days": float(order_stats["avg_delivery_delay_days"]),
                "is_delayed_delivery": int(order_stats["is_delayed"]),
                "dominant_product_category_frequency": 0.10,
                "customer_city_state_frequency": 0.005,
                "preferred_payment_type_debit_card": int(order_stats["used_debit_card"]),
            }])

            prediction = get_ml_predictor().predict(features_df)[0]
            churn_prob = float(prediction["churn_probability"])
            reason_codes_list = [
                {
                    "code": code,
                    "explanation": REASON_CODE_MESSAGES.get(
                        code, "Significant behavioral indicator observed."
                    ),
                }
                for code in prediction["reason_codes"]
            ]
            shap_drivers = [
                {
                    "feature": feature,
                    "label": feature.replace("_", " ").title(),
                    "impact": round(float(impact), 4),
                    "direction": (
                        "increases_risk" if float(impact) > 0 else "lowers_risk"
                    ),
                }
                for feature, impact in prediction["shap_values"].items()
            ]
            risk_level = (
                "high"
                if churn_prob >= 0.70
                else "medium"
                if churn_prob >= 0.30
                else "low"
            )

        except Exception as e:
            logger.exception("Error in on-the-fly scoring")
            raise RuntimeError(
                "The AI model could not score this customer. Check the ML "
                "inference dependencies and model artifact."
            ) from e
    elif not has_orders:
        reason_codes_list.append({
            "code": "RC_NEW",
            "explanation": "Newly registered customer. Zero order attrition risk currently observed.",
        })

    # ── Fetch real ML-pipeline CLV from customer_intelligence DB ──
    clv_row = db.execute(
        text("""
            SELECT clv, value_tier, purchase_frequency_per_year, customer_lifespan_years
            FROM customer_intelligence.customer_clv
            WHERE customer_unique_id = :cuid
            LIMIT 1
        """),
        {"cuid": customer_unique_id},
    ).mappings().first()

    if clv_row and clv_row["clv"] is not None:
        clv_val = round(float(clv_row["clv"]), 2)
        value_tier = clv_row["value_tier"] or ("High" if clv_val > 500 else ("Medium" if clv_val > 200 else "Low"))
        purchase_freq = round(float(clv_row["purchase_frequency_per_year"]), 2) if clv_row["purchase_frequency_per_year"] else 1.0
        lifespan_yrs = round(float(clv_row["customer_lifespan_years"]), 2) if clv_row["customer_lifespan_years"] else 1.0
    else:
        # Formula fallback only for genuinely new customers not in ML pipeline
        clv_val = round(total_spend * 1.25, 2) if total_spend > 0 else 0.0
        value_tier = "High" if clv_val > 500 else ("Medium" if clv_val > 200 else "Low")
        purchase_freq = 1.0
        lifespan_yrs = 1.0

    # ── Fetch real ML-pipeline segment from customer_intelligence DB ──
    seg_row = db.execute(
        text("""
            SELECT segment_label, risk_tier, cluster_probability
            FROM customer_intelligence.customer_segments
            WHERE customer_unique_id = :cuid
            LIMIT 1
        """),
        {"cuid": customer_unique_id},
    ).mappings().first()

    if seg_row and seg_row["segment_label"]:
        segment_label = seg_row["segment_label"]
        # The segment row is refreshed independently from realtime scoring.
        # Use the fresh churn result rather than displaying a stale risk tier.
        segment_risk_tier = f"{risk_level.title()} Risk"
        cluster_prob = round(float(seg_row["cluster_probability"]), 4) if seg_row["cluster_probability"] else 0.95
    else:
        # Formula fallback only for genuinely new customers
        segment_label = "ML segment unavailable"
        segment_risk_tier = f"{risk_level.title()} Risk"
        cluster_prob = 0.95

    # ── Fetch campaign recommendation from customer_intelligence DB ──
    campaign_row = db.execute(
        text("""
            SELECT campaign_name, campaign_priority, reason_code
            FROM customer_intelligence.customer_campaign_recommendations
            WHERE customer_unique_id = :cuid
            LIMIT 1
        """),
        {"cuid": customer_unique_id},
    ).mappings().first()

    if campaign_row and campaign_row["campaign_name"]:
        campaign_name = campaign_row["campaign_name"]
        campaign_priority = campaign_row["campaign_priority"]
        campaign_reason = campaign_row["reason_code"]
    else:
        campaign_name = "Welcome & First-Purchase Onboarding" if not has_orders else "Repeat Purchase Incentive Program"
        campaign_priority = 1 if not has_orders else 2
        campaign_reason = "RC_NEW" if not has_orders else "RC04"

    return {
        "customer_unique_id": customer_unique_id,
        "has_ml_data": True,
        "is_realtime_score": True,
        "churn": {
            "probability": round(churn_prob, 4),
            "percentage": round(churn_prob * 100, 1),
            "risk_level": risk_level,
            "model_version": os.getenv("MODEL_VERSION", "v1"),
            "scored_at": datetime.now(timezone.utc).isoformat(),
        },
        "explainability": {
            "reason_codes": reason_codes_list,
            "shap_drivers": shap_drivers,
        },
        "clv": {
            "predicted_clv": clv_val,
            "value_tier": value_tier,
            "purchase_frequency_per_year": purchase_freq,
            "customer_lifespan_years": lifespan_yrs,
        },
        "segmentation": {
            "segment_label": segment_label,
            "risk_tier": segment_risk_tier,
            "cluster_probability": cluster_prob,
        },
        "recommendation": {
            "campaign_name": campaign_name,
            "priority": campaign_priority,
            "trigger_reason": campaign_reason,
        },
    }


@router.get("/{customer_id_or_unique_id}")
def get_customer_predictions(
    customer_id_or_unique_id: str,
    db: Session = Depends(get_db),
    _=Depends(auth),
):
    """
    Fetch comprehensive AI intelligence for a customer by customer_id or customer_unique_id.
    If no precomputed offline row is found, automatically scores the customer on-the-fly.
    """
    # 1. Resolve customer_unique_id
    customer_unique_id = customer_id_or_unique_id
    if len(customer_id_or_unique_id) == 32:
        cust_row = db.execute(
            text("SELECT customer_unique_id FROM customers WHERE customer_id = :cid LIMIT 1"),
            {"cid": customer_id_or_unique_id},
        ).mappings().first()
        if cust_row:
            customer_unique_id = cust_row["customer_unique_id"]

    # 2. Query precomputed ML intelligence tables
    query = text("""
        SELECT 
            cp.churn_probability,
            cp.shap_values,
            cp.reason_codes,
            cp.model_version,
            cp.scored_at,
            clv.clv,
            clv.value_tier,
            clv.purchase_frequency_per_year,
            clv.customer_lifespan_years,
            cs.segment_label,
            cs.risk_tier AS segment_risk_tier,
            cs.cluster_probability,
            cr.campaign_name,
            cr.campaign_priority,
            cr.reason_code AS campaign_reason_code
        FROM customer_intelligence.churn_predictions cp
        LEFT JOIN customer_intelligence.customer_clv clv 
            ON clv.customer_unique_id COLLATE utf8mb4_unicode_ci = cp.customer_unique_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN customer_intelligence.customer_segments cs 
            ON cs.customer_unique_id COLLATE utf8mb4_unicode_ci = cp.customer_unique_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN customer_intelligence.customer_campaign_recommendations cr 
            ON cr.customer_unique_id COLLATE utf8mb4_unicode_ci = cp.customer_unique_id COLLATE utf8mb4_unicode_ci
        WHERE cp.customer_unique_id = :cuid
        LIMIT 1
    """)

    row = db.execute(query, {"cuid": customer_unique_id}).mappings().first()

    if not row:
        # Fallback: Compute real-time on-the-fly scoring for new customer!
        return _compute_realtime_prediction(db, customer_unique_id)

    # 3. Parse SHAP values & format top positive/negative drivers
    shap_dict = {}
    if row["shap_values"]:
        try:
            raw_shap = json.loads(row["shap_values"])
            shap_dict = {k: round(float(v), 4) for k, v in raw_shap.items()}
        except Exception:
            shap_dict = {}

    sorted_factors = sorted(
        shap_dict.items(), key=lambda item: abs(item[1]), reverse=True
    )
    shap_drivers = [
        {
            "feature": k,
            "label": k.replace("_", " ").title(),
            "impact": v,
            "direction": "increases_risk" if v > 0 else "lowers_risk",
        }
        for k, v in sorted_factors[:6]
    ]

    # 4. Parse Reason codes
    reason_codes_list = []
    if row["reason_codes"]:
        try:
            codes = json.loads(row["reason_codes"])
            if isinstance(codes, list):
                reason_codes_list = [
                    {
                        "code": c,
                        "explanation": REASON_CODE_MESSAGES.get(c, "Significant behavioral indicator observed."),
                    }
                    for c in codes
                ]
        except Exception:
            reason_codes_list = []

    churn_prob = float(row["churn_probability"]) if row["churn_probability"] is not None else 0.0
    risk_level = "high" if churn_prob >= 0.70 else "medium" if churn_prob >= 0.30 else "low"

    return {
        "customer_unique_id": customer_unique_id,
        "has_ml_data": True,
        "is_realtime_score": False,
        "churn": {
            "probability": round(churn_prob, 4),
            "percentage": round(churn_prob * 100, 1),
            "risk_level": risk_level,
            "model_version": row["model_version"] or "LightGBM Calibrated v1",
            "scored_at": row["scored_at"],
        },
        "explainability": {
            "reason_codes": reason_codes_list,
            "shap_drivers": shap_drivers,
        },
        "clv": {
            "predicted_clv": round(float(row["clv"]), 2) if row["clv"] is not None else None,
            "value_tier": row["value_tier"],
            "purchase_frequency_per_year": round(float(row["purchase_frequency_per_year"]), 2) if row["purchase_frequency_per_year"] is not None else None,
            "customer_lifespan_years": round(float(row["customer_lifespan_years"]), 2) if row["customer_lifespan_years"] is not None else None,
        },
        "segmentation": {
            "segment_label": row["segment_label"],
            "risk_tier": f"{risk_level.title()} Risk",
            "cluster_probability": round(float(row["cluster_probability"]), 4) if row["cluster_probability"] is not None else None,
        },
        "recommendation": {
            "campaign_name": row["campaign_name"],
            "priority": row["campaign_priority"],
            "trigger_reason": row["campaign_reason_code"],
        },
    }


@router.post("/{customer_id_or_unique_id}/rescore")
def rescore_customer_manually(
    customer_id_or_unique_id: str,
    db: Session = Depends(get_db),
    _=Depends(auth),
):
    """
    Manually force re-runs the ML prediction model for a customer and returns the fresh score.
    UI Trigger: 'Run AI Model' button.
    """
    customer_unique_id = customer_id_or_unique_id
    if len(customer_id_or_unique_id) == 32:
        cust_row = db.execute(
            text("SELECT customer_unique_id FROM customers WHERE customer_id = :cid LIMIT 1"),
            {"cid": customer_id_or_unique_id},
        ).mappings().first()
        if cust_row:
            customer_unique_id = cust_row["customer_unique_id"]

    # Compute fresh dynamic score
    fresh_predictions = _compute_realtime_prediction(db, customer_unique_id)
    return fresh_predictions
