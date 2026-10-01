"""
Authentication and System Health Unit Tests.
"""

from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config import ADMIN_USERNAME, ADMIN_PASSWORD, VIEWER_USERNAME, VIEWER_PASSWORD, SECRET, ALGO


def test_login_admin_success(client):
    """Verifies that the admin user can authenticate and receives a valid token."""
    response = client.post(
        "/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["username"] == ADMIN_USERNAME

    # Verify the JWT token can be decoded with our secret
    payload = jwt.decode(data["access_token"], SECRET, algorithms=[ALGO])
    assert payload["sub"] == ADMIN_USERNAME
    assert payload["role"] == "admin"


def test_login_viewer_success(client):
    """Verifies that the analyst/viewer user can authenticate and receives a viewer token."""
    response = client.post(
        "/api/auth/login",
        json={"username": VIEWER_USERNAME, "password": VIEWER_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "viewer"
    assert data["username"] == VIEWER_USERNAME


def test_login_wrong_password(client):
    """Verifies that login fails with 401 if the password is incorrect."""
    response = client.post(
        "/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": "wrong_password_123"},
    )
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


def test_login_nonexistent_user(client):
    """Verifies that login fails with 401 for an unregistered username."""
    response = client.post(
        "/api/auth/login",
        json={"username": "ghost_user_9999", "password": "password"},
    )
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


def test_protected_route_unauthorized(client):
    """Verifies that calling a protected route without authorization returns 401."""
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 401


def test_protected_route_invalid_token(client):
    """Verifies that calling a protected route with a malformed token returns 401."""
    response = client.get(
        "/api/dashboard/summary",
        headers={"Authorization": "Bearer not_a_valid_token"},
    )
    assert response.status_code == 401


def test_protected_route_expired_token(client):
    """Verifies that calling a protected route with an expired token returns 401."""
    expired_payload = {
        "sub": ADMIN_USERNAME,
        "role": "admin",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired_token = jwt.encode(expired_payload, SECRET, algorithm=ALGO)

    response = client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


def test_all_api_operations_except_login_require_authentication(client):
    """Every documented API operation except login declares bearer auth and rejects anonymous calls."""
    from app.main import app

    operations = [
        (method, path, operation)
        for path, path_item in app.openapi()["paths"].items()
        for method, operation in path_item.items()
        if method in {"get", "post", "put", "patch", "delete", "options", "head"}
    ]
    login = ("post", "/api/auth/login")

    assert len(operations) == 54
    removed_paths = {
        "/api/health",
        "/api/analytics/clv/by-segment",
        "/api/analytics/clv/distribution",
        "/api/analytics/customers/cohort-retention",
        "/api/analytics/customers/single-vs-repeat",
        "/api/analytics/model/threshold-analysis",
        "/api/analytics/features/summary",
        "/api/analytics/features/distribution",
        "/api/analytics/features/churn-by-feature",
        "/api/analytics/predict",
        "/api/analytics/data/tables",
    }
    assert removed_paths.isdisjoint(app.openapi()["paths"])
    for method, path, operation in operations:
        if (method, path) == login:
            assert not operation.get("security")
        else:
            assert operation.get("security")

    response = client.get("/api/analytics/churn/summary")
    assert response.status_code == 401
