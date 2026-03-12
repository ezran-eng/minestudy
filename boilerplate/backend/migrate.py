"""
Corre las migraciones de Alembic de forma inteligente:
- DB nueva → corre todas las migraciones desde cero
- DB existente sin alembic_version → la stampea (no corre DDL, evita romper datos)
- DB con alembic_version → aplica solo las migraciones pendientes
"""
import os
import sys
from sqlalchemy import create_engine, inspect
from alembic.config import Config
from alembic import command

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[migrate] ERROR: DATABASE_URL no está configurada.")
    sys.exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    tables = inspect(engine).get_table_names()
    has_alembic = "alembic_version" in tables
    has_data    = "users" in tables

cfg = Config("alembic.ini")

if has_data and not has_alembic:
    print("[migrate] DB existente detectada sin control de versiones.")
    print("[migrate] Stampeando a revision 001 sin correr DDL...")
    command.stamp(cfg, "001")
    print("[migrate] Stamp OK.")
else:
    print("[migrate] Corriendo migraciones pendientes...")
    command.upgrade(cfg, "head")
    print("[migrate] OK.")
