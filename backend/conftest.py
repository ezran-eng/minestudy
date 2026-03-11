"""
Pytest configuration and fixtures for MineStudy backend tests.
Uses SQLite in-memory instead of PostgreSQL.
"""
import os

# Must be set before any project imports
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "1234567890:AABBCCDDtest-token")
os.environ.setdefault("ADMIN_SECRET", "test-admin-secret")
os.environ.setdefault("R2_ENDPOINT", "https://fake.r2.test")
os.environ.setdefault("R2_ACCESS_KEY_ID", "fakekey")
os.environ.setdefault("R2_SECRET_ACCESS_KEY", "fakesecret")

import pytest
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Build the test engine before importing main.py
import database as _db_module

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

# Replace the engine in the database module before main.py grabs it
_db_module.engine = _test_engine
_db_module.SessionLocal = _TestingSessionLocal

# Create tables first (before main.py runs its own create_all + DDL)
import models
models.Base.metadata.create_all(bind=_test_engine)

# Import main.py: it will call create_all (no-op) and the ALTER TABLE block.
# We mock engine.connect() so the ALTER TABLE DDL is skipped — those columns
# are already created by SQLAlchemy's create_all above.
_mock_conn = MagicMock()
_ctx = MagicMock()
_ctx.__enter__ = MagicMock(return_value=_mock_conn)
_ctx.__exit__ = MagicMock(return_value=False)

with patch.object(_test_engine, "connect", return_value=_ctx):
    from main import app

from database import get_db
from main import require_init_data, require_admin


def _noop_require_init_data():
    """Dependency override: skip Telegram auth in tests."""
    return None


def _noop_require_admin():
    """Dependency override: skip admin token check in tests."""
    return None


def _override_get_db():
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def clean_db():
    """Wipe all rows after each test to keep tests isolated."""
    yield
    db = _TestingSessionLocal()
    try:
        for table in reversed(models.Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    finally:
        db.close()


@pytest.fixture
def db():
    session = _TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """Test client with no auth (public endpoints)."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def client_with_init_data():
    """Test client with Telegram initData auth bypassed."""
    app.dependency_overrides[require_init_data] = _noop_require_init_data
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.pop(require_init_data, None)


@pytest.fixture
def client_admin():
    """Test client with both initData and admin auth bypassed."""
    app.dependency_overrides[require_init_data] = _noop_require_init_data
    app.dependency_overrides[require_admin] = _noop_require_admin
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.pop(require_init_data, None)
    app.dependency_overrides.pop(require_admin, None)
