# Analytics API Frontend Integration Plan

## Purpose

This document explains how to expose the integrated analytics APIs through the
Customer Sphere frontend without disrupting the existing customer, dashboard,
product, and AI prediction workflows.

The analytics backend routes are mounted below:

```text
/api/analytics
```

The frontend should consume these endpoints through the shared Axios client in
`frontend/src/services/api.js`.

## Current frontend API usage

The frontend currently defines 30 API operations and actively uses 28 of them.
The newly integrated analytics routes are available in the backend but are not
yet consumed by production frontend pages.

The two currently defined but unused operations are:

- `GET /api/dashboard/geo/state/{stateCode}`
- `GET /api/products/by-category`

## Recommended integration strategy

Integrate the analytics APIs incrementally. Do not call all analytics routes
from the initial dashboard load. Each endpoint should have a visible frontend
use case, loading state, empty state, error state, and focused test.

The recommended sequence is:

1. Add a dedicated `analyticsService` in `frontend/src/services/api.js`.
2. Add segmentation and CLV summaries to the dashboard.
3. Add a dedicated `/analytics` page.
4. Add cohort retention and delivery performance views.
5. Add campaign performance and targeting views.
6. Add model evaluation views for administrators.
7. Add customer-specific analytics only where they improve the customer detail
   workflow.

## Frontend service layer

Add analytics methods beside the existing dashboard, product, customer, and
prediction services:

```js
export const analyticsService = {
  activeCampaigns: (params = {}) =>
    data(api.get("/analytics/campaigns/active", { params })),

  customerSegments: (params = {}) =>
    data(api.get("/analytics/segmentation/summary", { params })),

  cohortTrends: (params = {}) =>
    data(api.get("/analytics/cohorts/trends", { params })),

  deliveryPerformance: (params = {}) =>
    data(api.get("/analytics/delivery/performance", { params })),

  clvDistribution: (params = {}) =>
    data(api.get("/analytics/clv/distribution", { params })),

  modelMetrics: (params = {}) =>
    data(api.get("/analytics/model-evaluation/metrics", { params })),
};
```

Before adding each method, verify the exact route and parameter names against
the backend OpenAPI schema. The method names above describe the recommended
frontend responsibilities.

## Recommended frontend placement

| Frontend location | Recommended analytics |
| --- | --- |
| Dashboard | Segmentation summary, CLV distribution, cohort trends, delivery summary, active campaign count |
| New `/analytics` page | Cohorts, retention, CLV, delivery, campaigns, and model evaluation |
| Customer detail page | Customer CLV, risk history, delivery history, and campaign recommendation |
| Campaigns page | Active campaigns, forecasts, and customer targeting |
| Admin/model page | Model metrics, feature importance, and prediction quality |

## Phase 1: Dashboard integration

The dashboard is the best first integration point because the results are
immediately visible and useful to business users.

Recommended dashboard cards and charts:

- Customer segment distribution
- CLV/value-tier distribution
- Cohort retention trend
- Delivery performance summary
- Active campaign count

Initially load analytics data alongside the existing dashboard request. Compare
the values and response times before replacing any existing dashboard data.
This allows the current dashboard to remain available if an analytics endpoint
is unavailable or returns no data.

## Phase 2: Dedicated analytics page

Add a new route:

```text
/analytics
```

Recommended sections:

1. Executive overview
2. Customer segmentation
3. Customer lifetime value
4. Cohort retention
5. Delivery performance
6. Campaign performance
7. Model evaluation

Each section should be implemented as a separate component rather than putting
all analytics logic into one page component.

## Phase 3: Customer-specific analytics

The customer detail page already loads several independent requests in
parallel. Customer-specific analytics can be added to that same loading
pattern:

```js
const [
  detail,
  orders,
  products,
  reviews,
  interactions,
  auditLogs,
  predictions,
  analytics,
] = await Promise.all([
  customerService.detail(id),
  customerService.orders(id),
  customerService.products(id),
  customerService.reviews(id),
  customerService.interactions(id),
  customerService.auditLogs(id),
  predictionService.get(id),
  analyticsService.customerSummary(id),
]);
```

Only add `customerSummary` after a matching customer-specific backend route is
confirmed. Do not force a global aggregate endpoint to behave like a
customer-specific endpoint.

## API ownership guidelines

- Keep authentication in `authService`.
- Keep executive dashboard data in `dashboardService`.
- Keep customer CRUD and customer activity in `customerService`.
- Keep model prediction and manual rescoring in `predictionService`.
- Keep aggregate analytics and reporting in `analyticsService`.
- Keep request and response handling in the shared Axios client.

Do not move SQL queries into React components. Do not duplicate existing
customer, product, dashboard, or prediction methods in `analyticsService`.

## Reliability requirements

Every analytics view should provide:

- Loading state
- Empty-data state
- Request error state
- Retry action where appropriate
- Clear date/timeframe labels
- Consistent currency and percentage formatting

Analytics failures should not prevent the existing customer directory or AI
rescore workflow from loading. Where practical, request optional analytics
panels independently from core customer data.

## Testing checklist

For each new frontend analytics method:

1. Add an API service unit test.
2. Add a component test for successful data rendering.
3. Add an empty-response test.
4. Add an error-state test.
5. Verify authenticated requests include the existing bearer token.
6. Verify the frontend uses the configured `VITE_API_BASE_URL`.
7. Verify the backend route returns the expected response shape.

## Suggested first three endpoints

Start with these analytics capabilities:

1. Customer segmentation summary
2. CLV distribution
3. Cohort retention trends

They provide the most useful business context with the least risk to the
existing customer workflow.

## What to avoid

- Calling all 55 analytics routes during one page load
- Adding analytics SQL to React components
- Duplicating existing customer or prediction APIs
- Replacing working APIs before comparing response values
- Showing charts without loading, empty, and error states
- Adding backend routes that have no planned frontend consumer

