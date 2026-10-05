from pathlib import Path

from app.core.artifact_paths import (
    get_customer_intelligence_root,
    get_models_dir,
    get_outputs_dir,
    get_reports_dir,
)


def test_artifact_paths_require_configured_root(monkeypatch):
    monkeypatch.delenv("CUSTOMER_INTELLIGENCE_ROOT", raising=False)
    monkeypatch.delenv("CUSTOMER_INTELLIGENCE_OUTPUTS_DIR", raising=False)

    try:
        get_customer_intelligence_root()
    except RuntimeError as exc:
        assert str(exc) == (
            "CUSTOMER_INTELLIGENCE_ROOT must be set in the environment or .env file."
        )
    else:
        raise AssertionError("Expected missing root configuration to raise RuntimeError")


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


def test_outputs_default_to_root_outputs_when_override_is_missing(monkeypatch, tmp_path):
    root = tmp_path / "customer-intelligence-platform"
    monkeypatch.setenv("CUSTOMER_INTELLIGENCE_ROOT", str(root))
    monkeypatch.delenv("CUSTOMER_INTELLIGENCE_OUTPUTS_DIR", raising=False)

    assert get_outputs_dir() == root / "outputs"
    assert get_reports_dir() == root / "outputs" / "reports"
    assert get_models_dir() == root / "outputs" / "models"
