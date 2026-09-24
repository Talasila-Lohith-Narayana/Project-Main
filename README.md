# Customer Sphere — React + FastAPI + Existing MySQL

Built against the existing Olist database schema supplied in the conversation. The backend uses FastAPI, SQLAlchemy and PyMySQL. The frontend is React/Vite with Recharts and Lucide.

## Existing tables used
customers, customer_features, orders, order_items, order_reviews, order_payments, products, sellers, geolocation, olist_customers_dataset, olist_sellers_dataset.

## App-owned tables
Only `ci_users` (authentication) and `consumer_interactions` (manual activity capture) are created in the same existing MySQL schema. The Olist source tables are not replaced.

## Features
- JWT login and protected routes
- Polished responsive dashboard
- Live MySQL KPIs and charts
- Customer search/filter/pagination
- Customer profile using existing customer_features
- RFM/behavior metrics
- Order history
- Category preferences
- Reviews and ratings
- Manual interaction/activity capture
- Strong client and Pydantic validation
- Loading/error/empty states
- FastAPI Swagger docs

## Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
```
Edit `.env` with your existing MySQL Workbench connection details:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=YOUR_EXISTING_DATABASE_NAME
JWT_SECRET_KEY=your-long-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123@qwe#
```
Run:
```bash
uvicorn app.main:app --reload --port 8000
```
Swagger: `http://localhost:8000/docs`

## Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## API endpoints
- POST `/api/auth/login`
- GET `/api/health`
- GET `/api/dashboard/summary`
- GET `/api/customers`
- GET `/api/customers/{customer_id}`
- GET `/api/customers/{customer_id}/orders`
- GET `/api/customers/{customer_id}/products`
- GET `/api/customers/{customer_id}/reviews`
- GET `/api/customers/{customer_id}/interactions`
- POST `/api/customers/{customer_id}/interactions`

The database name was not supplied, so it is intentionally configurable in `.env` instead of being hard-coded.
