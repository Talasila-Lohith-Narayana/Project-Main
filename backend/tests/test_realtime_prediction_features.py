import math

from app.routers.predictions import _build_realtime_feature_row, _build_shap_drivers


def test_realtime_feature_row_matches_training_transformations():
    feature_row = _build_realtime_feature_row(
        "narayana",
        {
            "total_spend": 2670.0,
            "total_freight": 100.68,
            "avg_product_weight": 400.0,
        },
        {
            "avg_installments": 1.0,
            "used_debit_card": 0,
        },
        {
            "avg_review_score": 5.0,
            "has_bad_review": 0,
            "has_review_comment": 1,
        },
        {
            "avg_delivery_days": 4.0,
            "avg_delivery_delay_days": -3.0,
            "is_delayed": 0,
        },
        {
            "category_frequency": 0.042,
            "city_state_frequency": 0.156,
        },
    )

    assert set(feature_row) == {
        "customer_unique_id",
        "monetary_value",
        "avg_payment_installments",
        "avg_review_score",
        "has_bad_review",
        "has_review_comment",
        "avg_product_weight_g",
        "freight_ratio",
        "avg_delivery_days",
        "avg_delivery_delay_days",
        "is_delayed_delivery",
        "dominant_product_category_frequency",
        "customer_city_state_frequency",
        "preferred_payment_type_debit_card",
    }
    assert feature_row["monetary_value"] == math.log1p(2770.68)
    assert feature_row["freight_ratio"] == 100.68 / 2770.68
    assert feature_row["preferred_payment_type_debit_card"] == 0
    assert feature_row["has_review_comment"] == 1
    assert feature_row["dominant_product_category_frequency"] == 0.042
    assert feature_row["customer_city_state_frequency"] == 0.156


def test_realtime_feature_row_marks_missing_review_comment_as_zero():
    feature_row = _build_realtime_feature_row(
        "customer-without-comment",
        {
            "total_spend": 100.0,
            "total_freight": 10.0,
            "avg_product_weight": 500.0,
        },
        {"avg_installments": 1.0, "used_debit_card": 0},
        {
            "avg_review_score": 4.2,
            "has_bad_review": 0,
            "has_review_comment": 0,
        },
        {
            "avg_delivery_days": 4.0,
            "avg_delivery_delay_days": -2.0,
            "is_delayed": 0,
        },
        {"category_frequency": 0.0, "city_state_frequency": 0.0},
    )

    assert feature_row["has_review_comment"] == 0


def test_shap_drivers_include_all_features_and_their_model_inputs():
    shap_values = {f"feature_{index}": index / 10 for index in range(13)}
    feature_values = {feature: index for index, feature in enumerate(shap_values)}

    drivers = _build_shap_drivers(shap_values, feature_values)

    assert len(drivers) == 13
    assert drivers[0]["feature"] == "feature_12"
    assert drivers[0]["feature_value"] == 12
    assert {driver["feature"] for driver in drivers} == set(shap_values)
