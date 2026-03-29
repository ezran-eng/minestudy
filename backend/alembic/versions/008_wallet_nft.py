"""Add wallet + NFT fields to users, create nft_cache table

Revision ID: 008
Revises: 007
Create Date: 2026-03-28

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add wallet columns to users table
    op.add_column("users", sa.Column("wallet_address", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("nft_activo_address", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("mostrar_nft", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # Create nft_cache table
    op.create_table(
        "nft_cache",
        sa.Column("address", sa.String(100), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("coleccion", sa.String(200), nullable=True),
        sa.Column("imagen_url", sa.Text(), nullable=True),
        sa.Column("traits", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("cached_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("nft_cache")
    op.drop_column("users", "mostrar_nft")
    op.drop_column("users", "nft_activo_address")
    op.drop_column("users", "wallet_address")
