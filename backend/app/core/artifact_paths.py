from __future__ import annotations

import os
from pathlib import Path


def get_customer_intelligence_root() -> Path:
    """Return the configured Customer Intelligence source project directory."""
    configured_root = os.getenv("CUSTOMER_INTELLIGENCE_ROOT")
    if not configured_root:
        raise RuntimeError(
            "CUSTOMER_INTELLIGENCE_ROOT must be set in the environment or .env file."
        )
    return Path(configured_root).expanduser()


def get_outputs_dir() -> Path:
    """Return the shared artifact directory, optionally overridden for deployment."""
    configured_dir = os.getenv("CUSTOMER_INTELLIGENCE_OUTPUTS_DIR")
    if not configured_dir:
        return get_customer_intelligence_root() / "outputs"

    outputs_dir = Path(configured_dir).expanduser()
    if not outputs_dir.is_absolute():
        outputs_dir = get_customer_intelligence_root() / outputs_dir
    return outputs_dir


def get_reports_dir() -> Path:
    return get_outputs_dir() / "reports"


def get_models_dir() -> Path:
    return get_outputs_dir() / "models"
