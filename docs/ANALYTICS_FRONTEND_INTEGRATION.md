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

The frontend originally defined 30 API operations and actively used 28. The
analytics integration now defines 33 operations across the dashboard, Analytics
page, customer profiles, Campaigns page, and Model diagnostics. Several
operations are reused across pages. The frontend therefore defines 63 API
operations, of which 61 are currently used.

The two currently defined but unused operations are:

- `GET /api/dashboard/geo/state/{stateCode}`
- `GET /api/products/by-category`

## Recommended integration strategy

Integrate the analytics APIs incrementally. Do not call all analytics routes
from the initial dashboard load. Each endpoint should have a visible frontend
use case, loading state, empty state, error state, and focused test.

The dashboard, analytics pages, customer-specific analytics, campaign
drill-down, and model diagnostics are implemented.

The completed implementation:

1. Adds a dedicated `analyticsService` in `frontend/src/services/api.js`.
2. Adds CLV by segment, CLV distribution, cohort retention, delivery performance,
   and active campaign summaries to the dashboard.
3. Adds a dedicated `/analytics` page with value, retention, delivery,
   campaign, and model diagnostics sections.
4. Adds `/campaigns` with active campaign allocation and paginated audience
   drill-down, including navigation to targeted customer profiles.
5. Adds `/model` diagnostics for available evaluation reports, thresholds,
   experiments, feature summaries, distributions, and observed churn buckets.
6. Exposes the pages through the main application router and sidebar.
7. Adds customer CLV, campaign recommendation, and delivery analytics panels to
   each customer profile's Overview tab.
8. Gives each data panel independent loading, empty, error, and retry states.

## Frontend service layer

Add analytics methods beside the existing dashboard, product, customer, and
prediction services:

```js
export const analyticsService = {
  valueBySegment: () => data(api.get("/analytics/clv/by-segment")),
  clvDistribution: (params = {}) =>
    data(api.get("/analytics/clv/distribution", { params })),
  clvSummary: () => data(api.get("/analytics/clv/summary")),
  valueTiers: () => data(api.get("/analytics/customers/byvaluetier")),
  cohortRetention: (params = {}) =>
    data(api.get("/analytics/customers/cohort-retention", { params })),
  cohortSummary: (params = {}) =>
    data(api.get("/analytics/cohort/summary", { params })),
  activeCampaigns: () => data(api.get("/analytics/campaigns/active")),
  campaignsBySegment: () => data(api.get("/analytics/campaigns/by-segment")),
  deliveryPerformance: () => data(api.get("/analytics/delivery/performance")),
  modelVersion: () => data(api.get("/analytics/model/version")),
  modelCalibration: () => data(api.get("/analytics/model/calibration")),
  churnDefinition: () => data(api.get("/analytics/churn/definition")),
  customerClv: (customerUniqueId) =>
    data(api.get(`/analytics/customers/${customerUniqueId}/clv`)),
  customerCampaign: (customerUniqueId) =>
    data(api.post("/analytics/campaigns/evaluate", {
      customer_unique_id: customerUniqueId,
    })),
};
```

The service also exposes customer delivery, paginated campaign audiences, model
performance/comparison/threshold and experiment reports, and feature
summary/distribution/churn analysis through the same Axios client.

These paths are verified against the registered backend routers. Verify route
parameters against the backend OpenAPI schema whenever adding another method.

## Recommended frontend placement

| Frontend location | Recommended analytics |
| --- | --- |
| Dashboard | CLV by segment, CLV distribution, and cohort retention |
| `/analytics` page | CLV/value tiers, cohort summary, delivery, campaigns, model calibration, and churn definition |
| Customer detail page | Customer-specific CLV, segment/value tier, purchase frequency, lifespan, churn risk, and campaign recommendation |
| `/campaigns` page | Active campaigns, segment allocation, and targeted-customer drill-down |
| `/model` page | Available model evaluation, threshold, experiment, and feature diagnostics |

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

### Initial implementation status

The dashboard loads these five analytics independently from its existing
summary request:

- CLV by customer segment from `GET /api/analytics/clv/by-segment`
- CLV histogram from `GET /api/analytics/clv/distribution`
- Cohort retention matrix from `GET /api/analytics/customers/cohort-retention`
- Delivery performance from `GET /api/analytics/delivery/performance`
- Active campaign summary from `GET /api/analytics/campaigns/active`

Each panel has its own loading, empty, error, and retry states. Failure of an
analytics request does not block the existing dashboard.

The segmentation profile route is not used here because it depends on the
`customer_intelligence.customer_intelligence_base` table, which is absent from
the current database. The working CLV-by-segment endpoint provides the first
segment/value breakdown instead.

## Phase 2: Dedicated analytics page

The route is implemented and available in the sidebar:

```text
/analytics
```

The page includes:

1. Customer lifetime value and value-tier summaries
2. Acquisition cohort retention and repeat purchasing
3. Delivery speed and on-time performance
4. Active campaigns and campaign allocation by segment
5. Active model metadata and calibration diagnostics
6. Churn definition and retained/churned/censored customer counts

Each endpoint is loaded independently so a failed analytics source does not
hide working panels.

The dedicated `/campaigns` page allows users to select an active campaign,
page through its targeted customers, inspect risk/value/priority/reason fields,
and open a customer profile. The `/model` page reads optional report artifacts
and displays an explicit unavailable/empty state when a report is absent or
contains no metrics; it does not treat missing metrics as zero.

## Phase 3: Customer-specific analytics

The customer Overview tab now loads:

- `GET /api/analytics/customers/{customer_unique_id}/clv`
- `POST /api/analytics/campaigns/evaluate`
- `GET /api/analytics/customers/{customer_unique_id}/delivery`

The CLV endpoint uses `customer_unique_id`, not the order-level `customer_id`
in the page route. The customer detail API supplies that unique identifier.
Each analytics panel has its own loading, error, and retry states, so analytics
failures do not block the core customer profile.

The delivery endpoint reports delivered-order count, average delivery duration,
on-time/late percentages, and the ten most recent delivered orders. Customers
with no delivered orders receive an empty result; unknown analytics customer
IDs return a not-found response. Analytics loading remains isolated from the
profile's core request.

## Phase 4: Campaign operations

The Campaigns page uses active campaign totals, segment allocation, and the
paginated campaign customer endpoint. Audience rows include customer ID, risk,
segment, value tier, priority, reason code, and churn probability. Customer
links use the `customer_unique_id` accepted by the profile route. Audience
requests are not sent until a campaign is explicitly selected.

## Phase 5: Model diagnostics

The Model diagnostics page uses the verified performance-summary, comparison,
threshold, experiment, imbalance-experiment, and feature-analysis endpoints.
Feature options are populated from the backend feature-summary response.
File-backed reports that are absent or contain null/empty values are labeled
unavailable rather than displayed as zero performance.

It also surfaces stored churn-prediction summaries, SHAP feature rankings,
probability distribution, reason-code counts, latest prediction refresh,
pipeline table status, and an on-demand single-customer prediction.
Customer profiles show persisted risk and stored prediction explanations.

The backend reads model metadata, reports, and the default calibrated prediction
model from the same outputs directory. Set `CUSTOMER_INTELLIGENCE_ROOT` to the
Customer Intelligence project directory; by default, its `outputs` folder is
used. For a separately mounted artifact volume, set
`CUSTOMER_INTELLIGENCE_OUTPUTS_DIR` to that directory. `MODEL_PATH` can override
the prediction model file. These generated artifacts stay outside the
repository and are not copied into the backend.

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

## Integrated endpoint groups

The dashboard, Analytics page, customer profile, Campaigns page, and Model
diagnostics page now use these backend routes:

- `/analytics/clv/by-segment`
- `/analytics/clv/distribution`
- `/analytics/clv/summary`
- `/analytics/customers/byvaluetier`
- `/analytics/customers/cohort-retention`
- `/analytics/cohort/summary`
- `/analytics/campaigns/active`
- `/analytics/campaigns/by-segment`
- `/analytics/campaigns/{campaign_name}/customers`
- `/analytics/delivery/performance`
- `/analytics/customers/{customer_unique_id}/delivery`
- `/analytics/model/version`
- `/analytics/model/performance-summary`
- `/analytics/model/comparison`
- `/analytics/model/threshold-analysis`
- `/analytics/model/experiments`
- `/analytics/model/imbalance-experiments`
- `/analytics/model/calibration`
- `/analytics/features/summary`
- `/analytics/features/distribution`
- `/analytics/features/churn-by-feature`
- `/analytics/churn/definition`
- `/analytics/churn/summary`
- `/analytics/churn/top-features`
- `/analytics/churn/feature-importance-global`
- `/analytics/predict`
- `/analytics/members/{customer_unique_id}/risk`
- `/analytics/data/last-refresh`
- `/analytics/churn/probability-distribution`
- `/analytics/churn/reason-codes/summary`
- `/analytics/customers/{customer_unique_id}/explanation`
- `/analytics/data/tables`
- `/analytics/customers/{customer_unique_id}/clv`
- `/analytics/campaigns/evaluate` (customer profile recommendation)

## What to avoid

- Calling all 55 analytics routes during one page load
- Adding analytics SQL to React components
- Duplicating existing customer or prediction APIs
- Replacing working APIs before comparing response values
- Showing charts without loading, empty, and error states
- Adding backend routes that have no planned frontend consumer
