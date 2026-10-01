from pathlib import Path

from app.core.artifact_paths import (
    DEFAULT_CUSTOMER_INTELLIGENCE_ROOT,
    get_customer_intelligence_root,
    get_models_dir,
    get_outputs_dir,
    get_reports_dir,
)


def test_artifact_paths_default_to_customer_intelligence_outputs(monkeypatch):
    monkeypatch.delenv("CUSTOMER_INTELLIGENCE_ROOT", raising=False)
    monkeypatch.delenv("CUSTOMER_INTELLIGENCE_OUTPUTS_DIR", raising=False)

    expected_outputs = DEFAULT_CUSTOMER_INTELLIGENCE_ROOT / "outputs"
    assert get_customer_intelligence_root() == DEFAULT_CUSTOMER_INTELLIGENCE_ROOT
    assert get_outputs_dir() == expected_outputs
    assert get_reports_dir() == expected_outputs / "reports"
    assert get_models_dir() == expected_outputs / "models"


def test_artifact_paths_support_configured_root_and_outputs_override(monkeypatch, tmp_path):
    root = tmp_path / "customer-intelligence-platform"
    override = tmp_path / "shared-artifacts"
    monkeypatch.setenv("CUSTOMER_INTELLIGENCE_ROOT", str(root))
    monkeypatch.setenv("CUSTOMER_INTELLIGENCE_OUTPUTS_DIR", str(override))

    assert get_customer_intelligence_root() == root
    assert get_outputs_dir() == override
    assert get_reports_dir() == override / "reports"
    assert get_models_dir() == override / "models"


def test_relative_outputs_override_is_relative_to_project_root(monkeypatch, tmp_path):
    root = tmp_path / "customer-intelligence-platform"
    monkeypatch.setenv("CUSTOMER_INTELLIGENCE_ROOT", str(root))
    monkeypatch.setenv("CUSTOMER_INTELLIGENCE_OUTPUTS_DIR", "artifacts")

    assert get_outputs_dir() == Path(root / "artifacts")
