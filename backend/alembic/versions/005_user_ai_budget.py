"""Add user_ai_budget table for per-user AI quotas

Revision ID: 005
Revises: 004
Create Date: 2026-03-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_ai_budget",
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), primary_key=True),
        sa.Column("daily_limit_calls", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("monthly_limit_usd", sa.Float(), nullable=False, server_default="0.1"),
        sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_table("user_ai_budget")
