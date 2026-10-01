import pandas as pd

from app.api.cohort_trend_api import services


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
