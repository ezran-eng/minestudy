"""Assign existing materias to admin user

Revision ID: 007
Revises: 006
Create Date: 2026-03-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ADMIN_ID = 1063772095


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE materias SET creador_id = :admin_id WHERE creador_id IS NULL"
        ).bindparams(admin_id=ADMIN_ID)
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE materias SET creador_id = NULL WHERE creador_id = :admin_id"
        ).bindparams(admin_id=ADMIN_ID)
    )
