from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id_telegram = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    username = Column(String, nullable=True)
    foto_url = Column(String, nullable=True)
    descripcion = Column(String, nullable=True)
    racha = Column(Integer, default=0)
    ultima_actividad = Column(DateTime(timezone=True), nullable=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

    progresos = relationship("Progreso", back_populates="usuario")

class Materia(Base):
    __tablename__ = "materias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    emoji = Column(String, nullable=True)
    color = Column(String, nullable=True)

    progresos = relationship("Progreso", back_populates="materia")

class Progreso(Base):
    __tablename__ = "progreso"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("users.id_telegram"), nullable=False)
    id_materia = Column(Integer, ForeignKey("materias.id"), nullable=False)
    id_unidad = Column(Integer, nullable=False)
    porcentaje = Column(Integer, nullable=False, default=0)
    fecha = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    usuario = relationship("User", back_populates="progresos")
    materia = relationship("Materia", back_populates="progresos")

    __table_args__ = (
        UniqueConstraint('id_usuario', 'id_materia', 'id_unidad', name='uix_progreso_usuario_materia_unidad'),
    )
