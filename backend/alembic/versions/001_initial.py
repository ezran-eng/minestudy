"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-11

"""
from typing import Sequence, Union
import datetime
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id_telegram", sa.BigInteger(), primary_key=True, autoincrement=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("foto_url", sa.String(), nullable=True),
        sa.Column("descripcion", sa.String(), nullable=True),
        sa.Column("racha", sa.Integer(), nullable=True, default=0),
        sa.Column("ultima_actividad", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fecha_registro", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("onboarding_completado", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("mostrar_foto", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("mostrar_nombre", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("mostrar_username", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("mostrar_progreso", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("mostrar_cursos", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_users_id_telegram", "users", ["id_telegram"])

    op.create_table(
        "materias",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.Column("emoji", sa.String(), nullable=True),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("orden", sa.Integer(), nullable=True),
    )
    op.create_index("ix_materias_id", "materias", ["id"])

    op.create_table(
        "unidades",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_materia", sa.Integer(), sa.ForeignKey("materias.id"), nullable=False),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=True),
        sa.Column("estado_default", sa.String(), nullable=True, default="pend"),
    )
    op.create_index("ix_unidades_id", "unidades", ["id"])

    op.create_table(
        "temas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_unidad", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("nombre", sa.String(), nullable=False),
    )
    op.create_index("ix_temas_id", "temas", ["id"])

    op.create_table(
        "flashcards",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_unidad", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("pregunta", sa.String(), nullable=False),
        sa.Column("respuesta", sa.String(), nullable=False),
    )
    op.create_index("ix_flashcards_id", "flashcards", ["id"])

    op.create_table(
        "quiz_preguntas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_unidad", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("pregunta", sa.String(), nullable=False),
        sa.Column("opcion_a", sa.String(), nullable=False),
        sa.Column("opcion_b", sa.String(), nullable=False),
        sa.Column("opcion_c", sa.String(), nullable=False),
        sa.Column("opcion_d", sa.String(), nullable=False),
        sa.Column("respuesta_correcta", sa.String(), nullable=False),
        sa.Column("justificacion", sa.String(), nullable=True),
    )
    op.create_index("ix_quiz_preguntas_id", "quiz_preguntas", ["id"])

    op.create_table(
        "progreso",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False),
        sa.Column("id_materia", sa.Integer(), sa.ForeignKey("materias.id"), nullable=False),
        sa.Column("id_unidad", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("porcentaje", sa.Integer(), nullable=False, default=0),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("id_usuario", "id_materia", "id_unidad", name="uix_progreso_usuario_materia_unidad"),
    )
    op.create_index("ix_progreso_id", "progreso", ["id"])

    op.create_table(
        "infografias",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_unidad", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("titulo", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False, default=0),
    )
    op.create_index("ix_infografias_id", "infografias", ["id"])

    op.create_table(
        "pdfs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_unidad", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("titulo", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False, default=0),
    )
    op.create_index("ix_pdfs_id", "pdfs", ["id"])

    op.create_table(
        "pdf_visto",
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False, primary_key=True),
        sa.Column("id_pdf", sa.Integer(), sa.ForeignKey("pdfs.id", ondelete="CASCADE"), nullable=False, primary_key=True),
        sa.Column("visto_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "infografia_vista",
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False, primary_key=True),
        sa.Column("id_infografia", sa.Integer(), sa.ForeignKey("infografias.id", ondelete="CASCADE"), nullable=False, primary_key=True),
        sa.Column("visto_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "quiz_resultado",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False),
        sa.Column("id_unidad", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("correctas", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_quiz_resultado_id", "quiz_resultado", ["id"])
    op.create_index("ix_quiz_resultado_usuario_unidad", "quiz_resultado", ["id_usuario", "id_unidad"])

    op.create_table(
        "card_reviews",
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False, primary_key=True),
        sa.Column("id_flashcard", sa.Integer(), sa.ForeignKey("flashcards.id", ondelete="CASCADE"), nullable=False, primary_key=True),
        sa.Column("interval", sa.Integer(), nullable=False, default=1),
        sa.Column("ease_factor", sa.Float(), nullable=False, default=2.5),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_reviewed", sa.DateTime(timezone=True), nullable=False),
        sa.Column("repeticiones", sa.Integer(), nullable=False, default=0),
    )
    op.create_index("ix_card_reviews_usuario_repeticiones", "card_reviews", ["id_usuario", "repeticiones"])

    op.create_table(
        "vistas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False),
        sa.Column("id_unidad", sa.Integer(), sa.ForeignKey("unidades.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_vistas_id", "vistas", ["id"])
    op.create_index("ix_vistas_usuario_unidad_fecha", "vistas", ["id_usuario", "id_unidad", "fecha"])

    op.create_table(
        "materia_seguida",
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), nullable=False, primary_key=True),
        sa.Column("id_materia", sa.Integer(), sa.ForeignKey("materias.id", ondelete="CASCADE"), nullable=False, primary_key=True),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "notificaciones_config",
        sa.Column("id_usuario", sa.BigInteger(), sa.ForeignKey("users.id_telegram"), primary_key=True),
        sa.Column("racha_activa", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("recordatorio_activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("flashcards_activa", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("hora_recordatorio", sa.Time(), nullable=False, server_default="08:00:00"),
    )


def downgrade() -> None:
    op.drop_table("notificaciones_config")
    op.drop_table("materia_seguida")
    op.drop_index("ix_vistas_usuario_unidad_fecha", "vistas")
    op.drop_index("ix_vistas_id", "vistas")
    op.drop_table("vistas")
    op.drop_index("ix_card_reviews_usuario_repeticiones", "card_reviews")
    op.drop_table("card_reviews")
    op.drop_index("ix_quiz_resultado_usuario_unidad", "quiz_resultado")
    op.drop_index("ix_quiz_resultado_id", "quiz_resultado")
    op.drop_table("quiz_resultado")
    op.drop_table("infografia_vista")
    op.drop_table("pdf_visto")
    op.drop_index("ix_pdfs_id", "pdfs")
    op.drop_table("pdfs")
    op.drop_index("ix_infografias_id", "infografias")
    op.drop_table("infografias")
    op.drop_index("ix_progreso_id", "progreso")
    op.drop_table("progreso")
    op.drop_index("ix_quiz_preguntas_id", "quiz_preguntas")
    op.drop_table("quiz_preguntas")
    op.drop_index("ix_flashcards_id", "flashcards")
    op.drop_table("flashcards")
    op.drop_index("ix_temas_id", "temas")
    op.drop_table("temas")
    op.drop_index("ix_unidades_id", "unidades")
    op.drop_table("unidades")
    op.drop_index("ix_materias_id", "materias")
    op.drop_table("materias")
    op.drop_index("ix_users_id_telegram", "users")
    op.drop_table("users")
