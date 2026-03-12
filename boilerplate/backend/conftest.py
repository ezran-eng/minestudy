"""
Configuración de pytest — usa SQLite en memoria en vez de PostgreSQL.
Esto permite correr tests sin una DB real.
"""
import os

# Deben estar antes de cualquier import del proyecto
os.environ.setdefault("DATABASE_URL",         "sqlite:///:memory:")
os.environ.setdefault("TELEGRAM_BOT_TOKEN",   "1234567890:AABBCCDDtest-token")
os.environ.setdefault("ADMIN_SECRET",         "test-admin-secret")
os.environ.setdefault("ADMIN_ID",             "999")
os.environ.setdefault("MINI_APP_URL",         "https://example.com")

import pytest
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import database as _db_module

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

# Reemplazar engine ANTES de importar main.py
_db_module.engine = _test_engine
_db_module.SessionLocal = _TestingSessionLocal

import models
models.Base.metadata.create_all(bind=_test_engine)

from main import app, require_init_data, require_admin
from database import get_db


def _noop():
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
    """Limpia todas las filas después de cada test."""
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
    """Cliente sin auth (endpoints públicos)."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def client_auth():
    """Cliente con Telegram initData bypassed."""
    app.dependency_overrides[require_init_data] = _noop
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.pop(require_init_data, None)


@pytest.fixture
def client_admin():
    """Cliente con initData y admin auth bypassed."""
    app.dependency_overrides[require_init_data] = _noop
    app.dependency_overrides[require_admin]      = _noop
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.pop(require_init_data, None)
    app.dependency_overrides.pop(require_admin,      None)
