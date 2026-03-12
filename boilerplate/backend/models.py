"""
Models — agregá tus modelos SQLAlchemy acá.

Cada vez que agregás o modificás un modelo:
  1. alembic revision --autogenerate -m "describe_el_cambio"
  2. Revisá el archivo generado en alembic/versions/
  3. alembic upgrade head   (localmente)
  4. git add alembic/versions/ && git commit && git push
     Railway aplica la migración automáticamente en el próximo deploy.
"""
from sqlalchemy import Column, BigInteger, String, DateTime, func
from database import Base


class User(Base):
    __tablename__ = "users"

    # Los IDs de Telegram pueden superar el rango de 32-bit — siempre usar BigInteger
    id_telegram    = Column(BigInteger, primary_key=True, index=True, autoincrement=False)
    first_name     = Column(String, nullable=False)
    last_name      = Column(String, nullable=True)
    username       = Column(String, nullable=True)
    foto_url       = Column(String, nullable=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

    # Agregá tus columnas acá, luego generá una migración con alembic
