"""Add zona_libre_archivos and zona_libre_reportes tables

Revision ID: 003
Revises: 002
Create Date: 2026-03-18

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "zona_libre_archivos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("bag_id", sa.String(255), unique=True, nullable=False),
        sa.Column("nombre", sa.String(500), nullable=False),
        sa.Column("tamanio", sa.BigInteger(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.create_index("ix_zona_libre_archivos_bag_id", "zona_libre_archivos", ["bag_id"])
    op.create_index("ix_zona_libre_archivos_user_id", "zona_libre_archivos", ["user_id"])

    op.create_table(
        "zona_libre_reportes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("archivo_id", sa.Integer(), sa.ForeignKey("zona_libre_archivos.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False),
        sa.Column("motivo", sa.String(100), nullable=True),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_zona_libre_reportes_archivo", "zona_libre_reportes", ["archivo_id"])


def downgrade() -> None:
    op.drop_index("ix_zona_libre_reportes_archivo", "zona_libre_reportes")
    op.drop_table("zona_libre_reportes")
    op.drop_index("ix_zona_libre_archivos_user_id", "zona_libre_archivos")
    op.drop_index("ix_zona_libre_archivos_bag_id", "zona_libre_archivos")
    op.drop_table("zona_libre_archivos")
