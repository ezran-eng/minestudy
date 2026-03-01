from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ProgresoBase(BaseModel):
    id_materia: int
    id_unidad: int
    porcentaje: int

class ProgresoCreate(ProgresoBase):
    id_usuario: int

class Progreso(ProgresoBase):
    id: int
    id_usuario: int
    fecha: datetime

    model_config = {"from_attributes": True}

class UserBase(BaseModel):
    id_telegram: int
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

    model_config = {"from_attributes": True}

class RankingUser(BaseModel):
    id_telegram: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    foto_url: Optional[str] = None
    total_progress: float

    model_config = {"from_attributes": True}

class ActividadCreate(BaseModel):
    id_telegram: int
    tipo: str
    fecha_local: str

class ActividadResponse(BaseModel):
    racha: int
    nueva_racha: bool
    primer_dia: bool
