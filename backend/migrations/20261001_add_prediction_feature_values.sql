ALTER TABLE customer_intelligence.churn_predictions
    ADD COLUMN feature_values JSON NULL AFTER shap_values;
