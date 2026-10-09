# Customer Sphere — Changes Made Today

**Date:** October 9, 2026

**Scope:** Work completed and tested during today's development session.

## Summary

Today's work focused on consistent shared table behavior, dashboard loading and refresh performance, audit-log filtering, and per-user page access. The Users screen and sidebar also received layout refinements. Existing full dashboard and customer API behavior was retained where possible for compatibility.

## 1. Shared tables and pagination

### Shared table renderer

- Updated the shared `DataTable` implementation to use the installed TanStack Table v9 API.
- Standardized rendered tables on the shared `dataTable` class rather than per-table class names.
- Kept individual sizing and overflow behavior on the surrounding wrappers, so specialized tables can retain their required layout.
- Added consistent sortable-column heading states, including hover, keyboard focus, and dark-theme styling.
- Adjusted cohort summary table sizing so its columns and values are easier to read.

### Shared pagination footer

- Added `TablePagination` as a reusable footer with page count, item total, previous/next controls, and page-jump input.
- Replaced the Products table's different-looking pagination footer with the same footer used by Customers.
- Reused the component for the paginated campaign-audience table, so each table that has pagination now follows the same visual and interaction pattern.
- The component clamps requested pages to valid bounds and resets the page input when the current page changes.

**Relevant files:** `frontend/src/components/DataTable.jsx`, `frontend/src/components/TablePagination.jsx`, `frontend/src/pages/Customers.jsx`, `frontend/src/pages/Products.jsx`, `frontend/src/pages/Campaigns.jsx`, `frontend/src/styles.css`.

## 2. Dashboard loading and refresh

### Deferred dashboard sections

- Added a lightweight `sections=core` mode for the dashboard summary while preserving the existing full summary response for existing callers.
- Added separate endpoints for deferred trend and geography data.
- Added an intersection-observer-based section loader that fetches data as a section approaches the viewport rather than waiting for every dashboard query at initial page load.
- Added visible loading skeletons and error/retry states for KPI and deferred content.
- Deferred map state detail queries until the geography panel has loaded and is displayed.
- Removed dashboard sections below the geographic heatmap at the user's request.

### Automatic refresh and cross-tab updates

- Added periodic dashboard refresh every two minutes while the tab is visible.
- Refreshes already-loaded deferred sections without replacing the whole page with a loading state.
- Added cross-tab data-change notifications using `BroadcastChannel`, with a `localStorage` storage-event fallback.
- Successful customer, order, review, and bulk data changes publish notifications so other open dashboard tabs can refresh promptly.

### Customer directory query optimization

- Added the `include_churn` option to the customer-list API and set it to `false` for the customer directory, which does not display churn columns.
- This lets list and count queries skip the churn-prediction join when that data is not needed. Existing default behavior remains compatible, and churn data is still included when required by churn filtering or sorting.

**Relevant files:** `backend/app/api/dashboard/router.py`, `backend/app/api/customers/router.py`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/components/dashboard/DeferredDashboardSection.jsx`, `frontend/src/components/dashboard/DashboardGeoHeatmap.jsx`, `frontend/src/services/api.js`, `frontend/src/services/dashboardDataEvents.js`, `frontend/src/pages/Customers.jsx`.

## 3. Audit-log filters

- Added filtering by action, free-text search, administrator (`performed_by`), and date range.
- Added backend date-range validation so a start date later than the end date is rejected.
- The end date includes the full selected day by using the following midnight as the exclusive upper bound.
- Reorganized the modal controls into a search/refresh row and a labeled filter row, with responsive and dark-theme styles.
- Updated audit modal and backend activity tests for the additional filter inputs and request parameters.

**Relevant files:** `backend/app/api/audit_logs/router.py`, `backend/tests/test_orders_and_activity.py`, `frontend/src/components/AuditLogModal.jsx`, `frontend/src/components/AuditLogModal.test.jsx`, `frontend/src/styles.css`.

## 4. Per-user page access

### User creation and editing

- Replaced the limited role-only access choice for viewer accounts with checkboxes for individual pages.
- Added the same page-access editing capability to existing viewer accounts.
- Administrators retain full access.
- Updated the Users screen to show page access and to align Username and Temporary password fields. Their labels and inputs share consistent row heights, and the fields stack only at phone-sized widths.

### Backend and frontend enforcement

- Added the `access_pages` user field, schema validation, and startup database migration for `ci_users.access_pages`.
- Added shared backend permission helpers and route-level guards.
- Authenticated requests resolve current permissions from the user record, allowing administrator permission edits to take effect without requiring the user to sign in again.
- Added frontend route guards and hid sidebar links for pages a user cannot access.
- Kept access consistent for endpoints used by more than one page. For example, shared active-campaign data accepts Analytics or Campaigns access, and model-evaluation data accepts Analytics or Model access. Customer-specific drilldowns use Customers access.
- Added coverage for both permitted and denied API access by page, including permission updates.
- Made the access-denial test use an explicitly dashboard-only account, avoiding dependence on permissions that might exist on a persisted test viewer.

Page keys currently supported: `dashboard`, `customers`, `products`, `analytics`, `campaigns`, `model`, and `audit_logs`.

**Relevant files:** `backend/app/core/permissions.py`, `backend/app/core/auth.py`, `backend/app/main.py`, `backend/app/models.py`, `backend/app/schemas.py`, `backend/app/api/auth/router.py`, `frontend/src/accessPages.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/main.jsx`, `frontend/src/components/Shell.jsx`, `frontend/src/pages/Users.jsx`.

## 5. Additional UI refinements

- Added a confirmation dialog before signing out; cancellation leaves the active session untouched.
- Refined collapsed-sidebar icon alignment and spacing, the sidebar toggle position, and profile-switcher styling.
- Adjusted spacing between sidebar tabs to reduce hover overlap.
- Moved the Customers search button next to its search field and enabled Enter-key submission for audit search.
- Adjusted the dashboard trend/segment layout so the two panels sit side by side.
