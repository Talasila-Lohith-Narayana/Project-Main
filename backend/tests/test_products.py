def test_list_products_pagination(client, admin_headers):
    """Verifies products directory listing, pagination, and category filters."""
    response = client.get("/api/products?page=1&limit=10", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["limit"] == 10
    assert "categories" in data
    assert len(data["items"]) <= 10


def test_filter_products_by_category_and_search(client, admin_headers):
    """Verifies filtering products by category and searching by text."""
    # Filter by category
    cat_res = client.get("/api/products?category=beleza_saude&limit=5", headers=admin_headers)
    assert cat_res.status_code == 200
    cat_items = cat_res.json()["items"]
    for item in cat_items:
        assert item.get("category_name") == "beleza_saude"


def test_products_by_category_dropdown(client, admin_headers):
    """Verifies products by category endpoint used for order creation dropdowns."""
    response = client.get("/api/products/by-category?category=beleza_saude&limit=10", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    items = data["items"]
    assert len(items) > 0
    first_item = items[0]
    assert "product_id" in first_item
    assert first_item["category"] == "beleza_saude"
    assert "avg_price" in first_item


def test_export_products_csv(client, admin_headers):
    """Verifies streaming CSV export of products catalog."""
    response = client.get("/api/products/export", headers=admin_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "product_id" in response.text
