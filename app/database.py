import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Connection string: same 5 facts as Phase 4's psycopg2.connect(...),
# just expressed as one URL string instead of separate keyword arguments.
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")
# Engine: knows HOW to connect to PostgreSQL, manages a pool of
# reusable connections. Does NOT connect immediately — it's lazy.
engine = create_engine(DATABASE_URL)

# SessionLocal: a factory for producing new Session objects.
# We call SessionLocal() each time we need a fresh "workspace"
# for talking to the database (see Step 8).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: the parent class every ORM model (e.g., Task) will inherit
# from, so SQLAlchemy knows that class maps to a real database table.
Base = declarative_base()


def get_db():
    """
    Provides one fresh Session per request, and guarantees it gets
    closed afterward, even if the request raises an error.
    Used with FastAPI's Depends() in our endpoints.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()