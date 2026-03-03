from sqlalchemy import Column, Integer, BigInteger, Float, String, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    # Note: Telegram IDs can be large, BigInteger is safer for Postgres
    id_telegram = Column(BigInteger, primary_key=True, index=True, autoincrement=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    username = Column(String, nullable=True)
    foto_url = Column(String, nullable=True)
    descripcion = Column(String, nullable=True)
    racha = Column(Integer, default=0)
    ultima_actividad = Column(DateTime(timezone=True), nullable=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

    progresos = relationship("Progreso", back_populates="usuario")
    card_reviews = relationship("CardReview", back_populates="usuario")

class Materia(Base):
    __tablename__ = "materias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    emoji = Column(String, nullable=True)
    color = Column(String, nullable=True)
    orden = Column(Integer, nullable=True)

    unidades = relationship("Unidad", back_populates="materia", cascade="all, delete-orphan")
    progresos = relationship("Progreso", back_populates="materia")

class Unidad(Base):
    __tablename__ = "unidades"

    id = Column(Integer, primary_key=True, index=True)
    id_materia = Column(Integer, ForeignKey("materias.id"), nullable=False)
    nombre = Column(String, nullable=False)
    orden = Column(Integer, nullable=True)
    estado_default = Column(String, default="pend")

    materia = relationship("Materia", back_populates="unidades")
    temas = relationship("Tema", back_populates="unidad", cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="unidad", cascade="all, delete-orphan")
    quiz_preguntas = relationship("QuizPregunta", back_populates="unidad", cascade="all, delete-orphan")
    progresos = relationship("Progreso", back_populates="unidad")
    infografias = relationship("Infografia", back_populates="unidad", cascade="all, delete-orphan")

    @property
    def flashcard_count(self):
        return len(self.flashcards)

    @property
    def quiz_count(self):
        return len(self.quiz_preguntas)

class Tema(Base):
    __tablename__ = "temas"

    id = Column(Integer, primary_key=True, index=True)
    id_unidad = Column(Integer, ForeignKey("unidades.id"), nullable=False)
    nombre = Column(String, nullable=False)

    unidad = relationship("Unidad", back_populates="temas")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    id_unidad = Column(Integer, ForeignKey("unidades.id"), nullable=False)
    pregunta = Column(String, nullable=False)
    respuesta = Column(String, nullable=False)

    unidad = relationship("Unidad", back_populates="flashcards")
    reviews = relationship("CardReview", back_populates="flashcard", cascade="all, delete-orphan")

class QuizPregunta(Base):
    __tablename__ = "quiz_preguntas"

    id = Column(Integer, primary_key=True, index=True)
    id_unidad = Column(Integer, ForeignKey("unidades.id"), nullable=False)
    pregunta = Column(String, nullable=False)
    opcion_a = Column(String, nullable=False)
    opcion_b = Column(String, nullable=False)
    opcion_c = Column(String, nullable=False)
    opcion_d = Column(String, nullable=False)
    respuesta_correcta = Column(String, nullable=False)

    unidad = relationship("Unidad", back_populates="quiz_preguntas")

class Progreso(Base):
    __tablename__ = "progreso"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(BigInteger, ForeignKey("users.id_telegram"), nullable=False)
    id_materia = Column(Integer, ForeignKey("materias.id"), nullable=False)
    id_unidad = Column(Integer, ForeignKey("unidades.id"), nullable=False)
    porcentaje = Column(Integer, nullable=False, default=0)
    fecha = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    usuario = relationship("User", back_populates="progresos")
    materia = relationship("Materia", back_populates="progresos")
    unidad = relationship("Unidad", back_populates="progresos")

    __table_args__ = (
        UniqueConstraint('id_usuario', 'id_materia', 'id_unidad', name='uix_progreso_usuario_materia_unidad'),
    )

class Infografia(Base):
    __tablename__ = "infografias"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_unidad = Column(Integer, ForeignKey("unidades.id"), nullable=False)
    titulo = Column(String, nullable=False)
    url = Column(String, nullable=False)
    orden = Column(Integer, default=0, nullable=False)

    unidad = relationship("Unidad", back_populates="infografias")

class CardReview(Base):
    __tablename__ = "card_reviews"

    id_usuario = Column(BigInteger, ForeignKey("users.id_telegram"), nullable=False, primary_key=True)
    id_flashcard = Column(Integer, ForeignKey("flashcards.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    interval = Column(Integer, default=1, nullable=False)
    ease_factor = Column(Float, default=2.5, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    last_reviewed = Column(DateTime(timezone=True), nullable=False)
    repeticiones = Column(Integer, default=0, nullable=False)

    usuario = relationship("User", back_populates="card_reviews")
    flashcard = relationship("Flashcard", back_populates="reviews")
