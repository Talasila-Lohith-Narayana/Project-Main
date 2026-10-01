import pandas as pd

from app.api.model_evaluation import services


def test_imbalance_experiments_calculates_churn_precision(monkeypatch, tmp_path):
    report = tmp_path / "imbalance_experiments_lightgbm.csv"
    pd.DataFrame([{
        "Strategy": "weighted",
        "Tuned Thresh": 0.4,
        "Balanced Acc": 0.8,
        "Churn Recall (TP%)": "75.0%",
        "ROC-AUC": 0.9,
        "PR-AUC": 0.5,
        "TN": 80,
        "FP": 10,
        "FN": 5,
        "TP": 15,
    }]).to_csv(report, index=False)
    monkeypatch.setattr(services, "REPORTS_DIR", tmp_path)

    result = services.get_imbalance_experiments()

    assert result["strategies"][0]["churn_precision"] == 0.6


def test_imbalance_experiments_returns_none_when_precision_is_undefined(monkeypatch, tmp_path):
    report = tmp_path / "imbalance_experiments_lightgbm.csv"
    pd.DataFrame([{
        "Strategy": "weighted",
        "Tuned Thresh": 0.4,
        "Balanced Acc": 0.8,
        "Churn Recall (TP%)": "0.0%",
        "ROC-AUC": 0.9,
        "PR-AUC": 0.5,
        "TN": 80,
        "FP": 0,
        "FN": 20,
        "TP": 0,
    }]).to_csv(report, index=False)
    monkeypatch.setattr(services, "REPORTS_DIR", tmp_path)

    result = services.get_imbalance_experiments()

    assert result["strategies"][0]["churn_precision"] is None
