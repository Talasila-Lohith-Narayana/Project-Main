def test_customer_orders_and_products(client, admin_headers):
    """Verifies retrieval of a customer's linked orders and products."""
    # 1. Fetch real customer
    list_res = client.get("/api/customers?page=1&page_size=1", headers=admin_headers)
    assert list_res.status_code == 200
    cid = list_res.json()["items"][0]["customer_id"]

    # 2. Get customer orders
    orders_res = client.get(f"/api/customers/{cid}/orders", headers=admin_headers)
    assert orders_res.status_code == 200
    orders_data = orders_res.json()
    assert "items" in orders_data

    # 3. Get customer products
    products_res = client.get(f"/api/customers/{cid}/products", headers=admin_headers)
    assert products_res.status_code == 200
    products_data = products_res.json()
    assert "items" in products_data


def test_customer_reviews_and_interactions(client, admin_headers):
    """Verifies retrieval of a customer's reviews and logged CRM interactions."""
    list_res = client.get("/api/customers?page=1&page_size=1", headers=admin_headers)
    cid = list_res.json()["items"][0]["customer_id"]

    # Reviews
    rev_res = client.get(f"/api/customers/{cid}/reviews", headers=admin_headers)
    assert rev_res.status_code == 200
    assert "items" in rev_res.json()

    # Interactions
    int_res = client.get(f"/api/customers/{cid}/interactions", headers=admin_headers)
    assert int_res.status_code == 200
    assert isinstance(int_res.json(), list)


def test_add_interaction_and_rbac(client, admin_headers, viewer_headers):
    """Verifies adding a customer interaction as admin and 403 restriction for viewer."""
    list_res = client.get("/api/customers?page=1&page_size=1", headers=admin_headers)
    cid = list_res.json()["items"][0]["customer_id"]

    payload = {
        "interaction_type": "Call",
        "title": "Quarterly Check-in Call",
        "description": "Discussed ongoing shipment deliveries and customer satisfaction score.",
    }

    # Admin can add interaction
    add_res = client.post(f"/api/customers/{cid}/interactions", json=payload, headers=admin_headers)
    assert add_res.status_code == 200
    created = add_res.json()
    assert created["title"] == "Quarterly Check-in Call"

    # Viewer receives 403 Forbidden
    forbidden_res = client.post(f"/api/customers/{cid}/interactions", json=payload, headers=viewer_headers)
    assert forbidden_res.status_code == 403


def test_audit_logs(client, admin_headers):
    """Verifies customer-specific and global audit trail endpoints."""
    # Global audit logs
    global_logs_res = client.get("/api/audit-logs", headers=admin_headers)
    assert global_logs_res.status_code == 200
    assert "items" in global_logs_res.json()

    # Customer-specific audit logs
    list_res = client.get("/api/customers?page=1&page_size=1", headers=admin_headers)
    cid = list_res.json()["items"][0]["customer_id"]
    customer_logs_res = client.get(f"/api/customers/{cid}/audit-logs", headers=admin_headers)
    assert customer_logs_res.status_code == 200
    assert "items" in customer_logs_res.json()
