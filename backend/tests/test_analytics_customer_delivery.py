import pandas as pd
import pytest
from fastapi import HTTPException

from app.api.clv_delivery_payments import router as delivery_api


def test_customer_delivery_returns_summary_and_recent_orders(monkeypatch):
    orders = pd.DataFrame([
        {
            "order_id": "order_1",
            "purchased_at": pd.Timestamp("2018-01-01"),
            "delivered_at": pd.Timestamp("2018-01-10"),
            "estimated_delivery_at": pd.Timestamp("2018-01-12"),
            "delivery_days": 9,
            "delivery_status": "On time",
        },
        {
            "order_id": "order_2",
            "purchased_at": pd.Timestamp("2018-02-01"),
            "delivered_at": pd.Timestamp("2018-02-20"),
            "estimated_delivery_at": pd.Timestamp("2018-02-15"),
            "delivery_days": 19,
            "delivery_status": "Late",
        },
    ])
    monkeypatch.setattr(delivery_api, "q", lambda *_args, **_kwargs: orders)

    result = delivery_api.customer_delivery_performance("unique_123")

    assert result["customer_unique_id"] == "unique_123"
    assert result["summary"] == {
        "delivered_orders": 2,
        "avg_delivery_days": 14.0,
        "on_time_pct": 50.0,
        "late_pct": 50.0,
    }
    assert [order["order_id"] for order in result["deliveries"]] == ["order_1", "order_2"]


def test_customer_delivery_returns_empty_for_existing_customer_without_deliveries(monkeypatch):
    results = iter([pd.DataFrame(), pd.DataFrame([{"found": 1}])])
    monkeypatch.setattr(delivery_api, "q", lambda *_args, **_kwargs: next(results))

    result = delivery_api.customer_delivery_performance("unique_123")

    assert result["summary"] == {
        "delivered_orders": 0,
        "avg_delivery_days": None,
        "on_time_pct": None,
        "late_pct": None,
    }
    assert result["deliveries"] == []


def test_customer_delivery_returns_404_for_unknown_customer(monkeypatch):
    results = iter([pd.DataFrame(), pd.DataFrame()])
    monkeypatch.setattr(delivery_api, "q", lambda *_args, **_kwargs: next(results))

    with pytest.raises(HTTPException) as error:
        delivery_api.customer_delivery_performance("unknown")

    assert error.value.status_code == 404


def test_customer_delivery_reports_all_orders_as_on_time(monkeypatch):
    orders = pd.DataFrame([{
        "order_id": "order_1",
        "purchased_at": pd.Timestamp("2018-01-01"),
        "delivered_at": pd.Timestamp("2018-01-05"),
        "estimated_delivery_at": pd.Timestamp("2018-01-05"),
        "delivery_days": 4,
        "delivery_status": "On time",
    }])
    monkeypatch.setattr(delivery_api, "q", lambda *_args, **_kwargs: orders)

    result = delivery_api.customer_delivery_performance("unique_123")

    assert result["summary"]["on_time_pct"] == 100.0
    assert result["summary"]["late_pct"] == 0.0
