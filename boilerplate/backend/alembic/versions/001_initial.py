"""initial schema — tabla users

Revision ID: 001
Revises:
Create Date: 2026-01-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id_telegram",    sa.BigInteger(), primary_key=True, autoincrement=False),
        sa.Column("first_name",     sa.String(),     nullable=False),
        sa.Column("last_name",      sa.String(),     nullable=True),
        sa.Column("username",       sa.String(),     nullable=True),
        sa.Column("foto_url",       sa.String(),     nullable=True),
        sa.Column("fecha_registro", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_id_telegram", "users", ["id_telegram"])


def downgrade() -> None:
    op.drop_index("ix_users_id_telegram", "users")
    op.drop_table("users")
