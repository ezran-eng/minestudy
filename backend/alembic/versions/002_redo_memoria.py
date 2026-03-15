"""Add redo_memoria table for Redo's per-user memory

Revision ID: 002
Revises: 001
Create Date: 2026-03-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "redo_memoria",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False),
        sa.Column("contenido", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_redo_memoria_usuario", "redo_memoria", ["id_usuario"])


def downgrade() -> None:
    op.drop_index("ix_redo_memoria_usuario", "redo_memoria")
    op.drop_table("redo_memoria")
