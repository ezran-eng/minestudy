"""Add ai_call_log table for AI token tracking

Revision ID: 004
Revises: 003
Create Date: 2026-03-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_call_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_usuario", sa.BigInteger(), nullable=True),
        sa.Column("modulo", sa.String(30), nullable=False),
        sa.Column("accion", sa.String(50), nullable=True),
        sa.Column("modelo", sa.String(50), nullable=False),
        sa.Column("tokens_in", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tokens_out", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tokens_cached", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("costo_usd", sa.Float(), nullable=False, server_default="0"),
        sa.Column("latencia_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cache_hit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("error", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_call_log_usuario_created", "ai_call_log", ["id_usuario", "created_at"])
    op.create_index("ix_ai_call_log_modulo_created", "ai_call_log", ["modulo", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_call_log_modulo_created", "ai_call_log")
    op.drop_index("ix_ai_call_log_usuario_created", "ai_call_log")
    op.drop_table("ai_call_log")
