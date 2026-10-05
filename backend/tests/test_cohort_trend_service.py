import pandas as pd
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.cohort_trends import services


def _cohort_rows():
    return pd.DataFrame(
        [
            {
                "cohort": "Feb 2017",
                "relative_month": "M10",
                "retention_rate (%)": 40.0,
                "cohort_size": 20,
                "final_churn_rate (%)": 60.0,
                "cumulative_repeat_purchase_rate (%)": 40.0,
                "cumulative_average_revenue": 120.0,
                "generated_date": "2017-12-31",
            },
            {
                "cohort": "Jan 2017",
                "relative_month": "M3",
                "retention_rate (%)": 70.0,
                "cohort_size": 42,
                "final_churn_rate (%)": 30.0,
                "cumulative_repeat_purchase_rate (%)": 70.0,
                "cumulative_average_revenue": 90.0,
                "generated_date": "2017-12-31",
            },
            {
                "cohort": "Jan 2017",
                "relative_month": "M1",
                "retention_rate (%)": 85.0,
                "cohort_size": 42,
                "final_churn_rate (%)": 30.0,
                "cumulative_repeat_purchase_rate (%)": 50.0,
                "cumulative_average_revenue": 50.0,
                "generated_date": "2017-12-31",
            },
            {
                "cohort": "Jan 2017",
                "relative_month": "M0",
                "retention_rate (%)": 100.0,
                "cohort_size": 42,
                "final_churn_rate (%)": 30.0,
                "cumulative_repeat_purchase_rate (%)": 0.0,
                "cumulative_average_revenue": 0.0,
                "generated_date": "2017-12-31",
            },
        ]
    )


def _normalized_cohort_rows():
    cohorts = _cohort_rows().rename(columns=services.COHORT_RENAME)
    cohorts["cohort"] = cohorts["cohort"].map(
        {"Jan 2017": "2017-01", "Feb 2017": "2017-02"}
    )
    cohorts["label"] = cohorts["cohort"].map(
        {"2017-01": "Jan 2017", "2017-02": "Feb 2017"}
    )
    cohorts["_cohort_start"] = pd.to_datetime(cohorts["cohort"])
    cohorts["_month_no"] = cohorts["relative_month"].str[1:].astype(int)
    cohorts = cohorts.rename(columns={"relative_month": "month"})
    return cohorts.sort_values(["_cohort_start", "_month_no"]).reset_index(drop=True)


def test_load_cohorts_fills_missing_cohort_size_from_first_purchases(monkeypatch):
    def read_sql(_engine, sql, _params=None):
        if "SELECT * FROM" in sql:
            return pd.DataFrame([{
                "cohort": "Jan 2017",
                "relative_month": "M0",
                "retention_rate (%)": 100.0,
            }])
        return pd.DataFrame([{"cohort": "2017-01", "cohort_size": 42}])

    monkeypatch.setattr(services, "_read_sql", read_sql)

    cohorts = services._load_cohorts(object())

    assert cohorts.loc[0, "cohort_size"] == 42
    assert services.cohort_summary(cohorts)[0]["cohort_size"] == 42


def test_load_cohorts_keeps_existing_sizes_without_running_fallback_query(monkeypatch):
    calls = []

    def read_sql(_engine, sql, _params=None):
        calls.append(sql)
        return pd.DataFrame(
            [
                {
                    "cohort": "Jan 2017",
                    "relative_month": "M0",
                    "cohort_size": 42,
                }
            ]
        )

    monkeypatch.setattr(services, "_read_sql", read_sql)

    cohorts = services._load_cohorts(object())

    assert len(calls) == 1
    assert cohorts.loc[0, "cohort_size"] == 42


def test_load_cohorts_fills_only_missing_sizes_and_sorts_cohorts_and_months(monkeypatch):
    def read_sql(_engine, sql, _params=None):
        if "SELECT * FROM" in sql:
            return _cohort_rows().drop(columns=["cohort_size"])
        return pd.DataFrame(
            [
                {"cohort": "2017-01", "cohort_size": 42},
                {"cohort": "2017-02", "cohort_size": 20},
            ]
        )

    monkeypatch.setattr(services, "_read_sql", read_sql)

    cohorts = services._load_cohorts(object())

    assert cohorts["cohort"].tolist() == ["2017-01", "2017-01", "2017-01", "2017-02"]
    assert cohorts["month"].tolist() == ["M0", "M1", "M3", "M10"]
    assert cohorts["cohort_size"].tolist() == [42, 42, 42, 20]


def test_get_cohorts_filters_by_inclusive_cohort_range(monkeypatch):
    services.clear_cache()
    monkeypatch.setattr(
        services, "_load_cohorts", lambda _engine: _normalized_cohort_rows()
    )

    filtered = services.get_cohorts(object(), cohort_from="2017-01", cohort_to="2017-01")

    assert filtered["cohort"].unique().tolist() == ["2017-01"]
    assert len(filtered) == 3


def test_cohort_summary_uses_m1_m3_and_last_values():
    cohorts = _normalized_cohort_rows()

    summary = services.cohort_summary(cohorts)
    jan_summary = next(row for row in summary if row["cohort"] == "2017-01")

    assert jan_summary == {
        "cohort": "2017-01",
        "label": "Jan 2017",
        "cohort_size": 42,
        "months_observed": 3,
        "m1_retention_pct": 85.0,
        "m3_retention_pct": 70.0,
        "final_churn_rate_pct": 30.0,
        "cumulative_repeat_purchase_rate_pct": 70.0,
        "cumulative_average_revenue": 90.0,
    }


def test_cohort_detail_returns_months_and_generated_date():
    cohorts = _normalized_cohort_rows()
    cohorts["generated_date"] = pd.to_datetime(cohorts["generated_date"]).dt.date

    detail = services.cohort_detail(cohorts, "2017-01")

    assert detail["cohort_size"] == 42
    assert detail["generated_date"].isoformat() == "2017-12-31"
    assert [month["month"] for month in detail["months"]] == ["M0", "M1", "M3"]
    assert detail["months"][2]["retention_rate_pct"] == 70.0


def test_cohort_detail_returns_none_for_unknown_cohort():
    cohorts = _normalized_cohort_rows()

    assert services.cohort_detail(cohorts, "2017-99") is None


def test_to_records_converts_missing_values_to_none():
    records = services.to_records(pd.DataFrame([{"value": float("nan")}]))

    assert records == [{"value": None}]


def test_read_sql_reports_database_unavailability(monkeypatch):
    class BrokenConnection:
        def __enter__(self):
            raise SQLAlchemyError("database unavailable")

        def __exit__(self, *_args):
            return False

    class BrokenEngine:
        def connect(self):
            return BrokenConnection()

    monkeypatch.setattr(services, "text", lambda sql: sql)

    with pytest.raises(HTTPException) as error:
        services._read_sql(BrokenEngine(), "SELECT 1")

    assert error.value.status_code == 503
    assert "Analytics data is not available" in error.value.detail
