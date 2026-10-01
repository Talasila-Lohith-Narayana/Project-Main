# Backend layout

The backend is organized by responsibility:

- `app/core/` contains shared configuration, database setup, authentication dependencies,
  artifact paths, and data serialization helpers.
- `app/api/` contains the endpoint routers, grouped by feature. Each feature's
  `router.py` defines its HTTP routes; complex features may also have repositories,
  services, schemas, or a local README.
- `app/models.py` and `app/schemas.py` hold shared SQLAlchemy models and request
  schemas used across API features.
- `app/segmentation/` contains segmentation and campaign domain logic.
- `app/main.py` configures the FastAPI application and mounts the feature routers.
- `tests/` contains the backend test suite.

Run the backend from this directory with:

```bash
uvicorn app.main:app --reload --port 8000
```

Run its tests with:

```bash
pytest
```
