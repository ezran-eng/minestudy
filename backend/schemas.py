from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ProgresoBase(BaseModel):
    id_materia: int
    id_unidad: int
    porcentaje: int

class ProgresoCreate(ProgresoBase):
    id_usuario: str

class Progreso(ProgresoBase):
    id: int
    id_usuario: str
    fecha: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    id_telegram: str
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    foto_url: Optional[str] = None
    descripcion: Optional[str] = None
    racha: Optional[int] = 0

class UserCreate(UserBase):
    pass

class User(UserBase):
    fecha_registro: datetime
    progresos: List[Progreso] = []

    class Config:
        from_attributes = True

class RankingUser(BaseModel):
    id_telegram: str
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    foto_url: Optional[str] = None
    total_progress: float

    class Config:
        from_attributes = True
