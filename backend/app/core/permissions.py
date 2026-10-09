import json

from fastapi import Depends, HTTPException, Request

ACCESS_PAGES = (
    "dashboard",
    "customers",
    "products",
    "analytics",
    "campaigns",
    "model",
    "audit_logs",
)

# Preserve the areas the original read-only viewer account could access.
DEFAULT_VIEWER_ACCESS = ("dashboard", "customers", "products", "audit_logs")


def get_user_access_pages(user):
    if user.role == "admin":
        return list(ACCESS_PAGES)
    if user.access_pages is None:
        return list(DEFAULT_VIEWER_ACCESS)
    try:
        pages = json.loads(user.access_pages)
    except json.JSONDecodeError as exc:
        raise HTTPException(500, "The user's access settings are invalid.") from exc
    if not isinstance(pages, list) or any(page not in ACCESS_PAGES for page in pages):
        raise HTTPException(500, "The user's access settings are invalid.")
    return pages


def require_page_access(page):
    return require_any_page_access(page)


def require_any_page_access(*pages):
    from app.core.auth import auth

    def check_access(user=Depends(auth)):
        if user["role"] != "admin" and not any(
            page in user["access_pages"] for page in pages
        ):
            page_labels = " or ".join(page.replace("_", " ") for page in pages)
            raise HTTPException(
                403,
                f"Access to the {page_labels} area is not permitted.",
            )
        return user

    return check_access


def require_products_area_access():
    from app.core.auth import auth

    def check_access(request: Request, user=Depends(auth)):
        # Customer profiles include related products; they use customer access.
        page = (
            "customers"
            if request.url.path.startswith("/api/customers/")
            and request.url.path.endswith("/products")
            else "products"
        )
        if user["role"] != "admin" and page not in user["access_pages"]:
            raise HTTPException(
                403,
                f"Access to the {page.replace('_', ' ')} area is not permitted.",
            )
        return user

    return check_access


def require_customer_analytics_access():
    from app.core.auth import auth

    def check_access(request: Request, user=Depends(auth)):
        customer_detail = (
            request.url.path.startswith("/api/analytics/customers/")
            and not request.url.path.endswith("/byvaluetier")
        )
        customer_risk = request.url.path.startswith("/api/analytics/members/")
        allowed_pages = (
            ("customers",)
            if customer_detail or customer_risk
            else ("model",)
        )
        if user["role"] != "admin" and not any(
            page in user["access_pages"] for page in allowed_pages
        ):
            raise HTTPException(
                403,
                f"Access to the {allowed_pages[0].replace('_', ' ')} area is not permitted.",
            )
        return user

    return check_access


def require_clv_delivery_access():
    from app.core.auth import auth

    def check_access(request: Request, user=Depends(auth)):
        customer_detail = (
            request.url.path.startswith("/api/analytics/customers/")
            and not request.url.path.endswith("/byvaluetier")
        )
        page = "customers" if customer_detail else "analytics"
        if user["role"] != "admin" and page not in user["access_pages"]:
            raise HTTPException(
                403,
                f"Access to the {page} area is not permitted.",
            )
        return user

    return check_access


def require_audit_access():
    from app.core.auth import auth

    def check_access(request: Request, user=Depends(auth)):
        page = (
            "customers"
            if request.url.path.startswith("/api/customers/")
            else "audit_logs"
        )
        if user["role"] != "admin" and page not in user["access_pages"]:
            raise HTTPException(
                403,
                f"Access to the {page.replace('_', ' ')} area is not permitted.",
            )
        return user

    return check_access


def require_campaign_data_access():
    from app.core.auth import auth

    def check_access(request: Request, user=Depends(auth)):
        path = request.url.path
        allowed_pages = (
            ("customers",)
            if path.endswith("/campaigns/evaluate")
            else ("campaigns",)
            if "/campaigns/" in path and path.endswith("/customers")
            else ("analytics", "campaigns")
        )
        if user["role"] != "admin" and not any(
            page in user["access_pages"] for page in allowed_pages
        ):
            page_labels = " or ".join(page.replace("_", " ") for page in allowed_pages)
            raise HTTPException(
                403,
                f"Access to the {page_labels} area is not permitted.",
            )
        return user

    return check_access
