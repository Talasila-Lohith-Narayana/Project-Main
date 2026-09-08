"""
Authentication and System Health Unit Tests.
"""

from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config import ADMIN_USERNAME, ADMIN_PASSWORD, VIEWER_USERNAME, VIEWER_PASSWORD, SECRET, ALGO


def test_health_check(client):
    """Verifies that the /api/health endpoint returns status ok and database connected."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


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
