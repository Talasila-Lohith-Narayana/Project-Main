"""
Dashboard Analytics & Metrics Unit Tests.
"""

def test_dashboard_summary_default(client, admin_headers):
    """Verifies that the default dashboard summary endpoint returns 200 and all analytical segments."""
    response = client.get("/api/dashboard/summary", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()

    # Core sections
    assert "kpis" in data
    assert "segments" in data
    assert "monthly" in data
    assert "categories" in data
    assert "top_states" in data
    assert "payments" in data
    assert "ratings_dist" in data
    assert data["timeframe"] == "all"

    # KPI structure
    kpis = data["kpis"]
    for expected_field in [
        "customers",
        "orders",
        "revenue",
        "reviews",
        "avg_rating",
        "repeat_customers",
        "avg_order_value",
        "avg_delivery_days",
    ]:
        assert expected_field in kpis
        assert kpis[expected_field] is not None


def test_dashboard_summary_viewer_access(client, viewer_headers):
    """Verifies that analyst/viewer users have read permission on the dashboard."""
    response = client.get("/api/dashboard/summary", headers=viewer_headers)
    assert response.status_code == 200
    assert "kpis" in response.json()


def test_dashboard_summary_presets(client, admin_headers):
    """Verifies dashboard time presets (2018, 2017, l6m, l30d)."""
    for preset in ["2018", "2017", "l6m", "l30d"]:
        response = client.get(f"/api/dashboard/summary?timeframe={preset}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["timeframe"] == preset
        assert "kpis" in data


def test_dashboard_summary_custom_range(client, admin_headers):
    """Verifies parameterized custom date range filtering."""
    response = client.get(
        "/api/dashboard/summary?timeframe=custom&start_date=2017-01-01&end_date=2017-06-30",
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["timeframe"] == "custom"
    assert "kpis" in data
