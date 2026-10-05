import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env file
load_dotenv()

DB_NAME = os.getenv("DB_NAME", "olist")
ANALYTICS_DB_NAME = os.getenv("ANALYTICS_DB_NAME", "customer_intelligence")

# Build MySQL connection URL from environment variables with safe defaults
DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=DB_NAME,
)

# SQLAlchemy Engine with connection health checks and automatic pool recycling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
)

# Session factory for generating isolated database sessions per request
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy database session per request
    and ensures the session is properly closed once the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
