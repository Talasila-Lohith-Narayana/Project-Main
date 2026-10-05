import uuid

from app.schemas import CustomerIn


def test_customer_postal_prefix_preserves_leading_zero_and_accepts_legacy_integer():
    customer_data = {
        "customer_unique_id": "postal_prefix_test",
        "customer_city": "São Paulo",
        "customer_state": "SP",
    }

    prefixed = CustomerIn(**customer_data, customer_zip_code_prefix="01000")
    legacy = CustomerIn(**customer_data, customer_zip_code_prefix=1000)

    assert prefixed.customer_zip_code_prefix == "01000"
    assert legacy.customer_zip_code_prefix == "1000"


def test_list_customers_pagination(client, admin_headers):
    """Verifies pagination and metadata for customers listing."""
    response = client.get("/api/customers?page=1&page_size=5", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert len(data["items"]) <= 5


def test_search_customers(client, admin_headers):
    """Verifies search filtering by location or ID substring."""
    response = client.get("/api/customers?q=sao paulo&page_size=5", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data


def test_filter_customers_by_segment(client, admin_headers):
    """Verifies filtering by the database-backed risk tier."""
    response = client.get("/api/customers?segment=High%20Risk&page_size=5", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    for item in data["items"]:
        assert item.get("segment") == "High Risk"


def test_get_customer_detail_and_not_found(client, admin_headers):
    """Verifies fetching an existing customer's details and 404 on invalid ID."""
    # 1. Fetch a real customer from the list
    list_res = client.get("/api/customers?page=1&page_size=1", headers=admin_headers)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) > 0
    cid = items[0]["customer_id"]

    # 2. Fetch detail
    detail_res = client.get(f"/api/customers/{cid}", headers=admin_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["customer_id"] == cid
    assert "customer_city" in detail
    assert "customer_state" in detail
    assert "avg_delivery_days" in detail

    # 3. 404 for invalid customer
    missing_res = client.get("/api/customers/invalid_customer_id_99999", headers=admin_headers)
    assert missing_res.status_code == 404


def test_customer_crud_lifecycle(client, admin_headers):
    """Full lifecycle: Admin creates, reads, updates, and deletes a customer with no order history."""
    unique_suffix = uuid.uuid4().hex[:8]
    test_unique_id = f"test_uid_{unique_suffix}"

    create_payload = {
        "customer_unique_id": test_unique_id,
        "customer_city": "Campinas",
        "customer_state": "SP",
        "customer_zip_code_prefix": "013010",
    }

    # 1. Create
    create_res = client.post("/api/customers", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 200
    created_cust = create_res.json()
    cid = created_cust["customer_id"]
    assert created_cust["customer_unique_id"] == test_unique_id
    assert created_cust["customer_zip_code_prefix"] == "013010"

    # 2. Read detail
    detail_res = client.get(f"/api/customers/{cid}", headers=admin_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["customer_city"] == "Campinas"

    # 3. Update
    update_payload = {
        "customer_unique_id": test_unique_id,
        "customer_city": "Campinas Updated",
        "customer_state": "SP",
        "customer_zip_code_prefix": "013010",
        "segment": "High Risk",
    }
    update_res = client.patch(f"/api/customers/{cid}", json=update_payload, headers=admin_headers)
    assert update_res.status_code == 200
    assert update_res.json()["customer_city"] == "Campinas Updated"

    # 4. Delete
    delete_res = client.delete(f"/api/customers/{cid}", headers=admin_headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["deleted"] is True

    # 5. Verify deleted customer is now 404
    verify_res = client.get(f"/api/customers/{cid}", headers=admin_headers)
    assert verify_res.status_code == 404


def test_viewer_rbac_restrictions(client, viewer_headers):
    """Verifies role-based access control: viewers (analysts) receive 403 on mutation endpoints."""
    # Attempt create
    create_res = client.post(
        "/api/customers",
        json={
            "customer_unique_id": "forbidden_create",
            "customer_city": "Curitiba",
            "customer_state": "PR",
            "customer_zip_code_prefix": "80000",
        },
        headers=viewer_headers,
    )
    assert create_res.status_code == 403

    # Attempt delete
    delete_res = client.delete("/api/customers/some_customer_id", headers=viewer_headers)
    assert delete_res.status_code == 403


def test_export_customers_csv(client, admin_headers):
    """Verifies that the customer export endpoint streams a valid CSV."""
    response = client.get("/api/customers/export", headers=admin_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "Customer Unique ID" in response.text


def test_customers_reject_invalid_pagination(client, admin_headers):
    response = client.get("/api/customers?page=0&page_size=0", headers=admin_headers)

    assert response.status_code == 422


def test_customer_creation_rejects_invalid_postal_prefix():
    invalid_values = ["", "12A4", "1234567", True]

    for value in invalid_values:
        try:
            CustomerIn(
                customer_unique_id="customer",
                customer_city="São Paulo",
                customer_state="SP",
                customer_zip_code_prefix=value,
            )
        except ValueError:
            continue
        raise AssertionError(f"Expected invalid postal prefix to fail: {value!r}")
