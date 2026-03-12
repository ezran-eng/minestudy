"""
Schemas Pydantic — definen la forma de los datos que entran y salen de la API.
Agregá tus schemas acá a medida que agregás endpoints.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    id_telegram: int
    first_name: str
    last_name:  Optional[str] = None
    username:   Optional[str] = None
    foto_url:   Optional[str] = None


class UserOut(BaseModel):
    id_telegram:    int
    first_name:     str
    last_name:      Optional[str] = None
    username:       Optional[str] = None
    foto_url:       Optional[str] = None
    fecha_registro: Optional[datetime] = None

    model_config = {"from_attributes": True}
