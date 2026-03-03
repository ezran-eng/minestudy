from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TemaBase(BaseModel):
    id: int
    id_unidad: int
    nombre: str

    model_config = {"from_attributes": True}

class UnidadBase(BaseModel):
    id: int
    id_materia: int
    nombre: str
    orden: Optional[int] = None
    estado_default: str
    temas: List[TemaBase] = []
    flashcard_count: int = 0
    quiz_count: int = 0

    model_config = {"from_attributes": True}

class MateriaBase(BaseModel):
    id: int
    nombre: str
    emoji: Optional[str] = None
    color: Optional[str] = None
    orden: Optional[int] = None
    unidades: List[UnidadBase] = []

    model_config = {"from_attributes": True}

class MateriaUpdate(BaseModel):
    nombre: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    orden: Optional[int] = None

class UnidadUpdate(BaseModel):
    nombre: Optional[str] = None
    orden: Optional[int] = None
    estado_default: Optional[str] = None

class FlashcardBase(BaseModel):
    id: int
    id_unidad: int
    pregunta: str
    respuesta: str

    model_config = {"from_attributes": True}

class QuizPreguntaBase(BaseModel):
    id: int
    id_unidad: int
    pregunta: str
    opcion_a: str
    opcion_b: str
    opcion_c: str
    opcion_d: str
    respuesta_correcta: str

    model_config = {"from_attributes": True}

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

class ReviewRequest(BaseModel):
    id_usuario: int
    knew: bool

class CardReviewOut(BaseModel):
    id_usuario: int
    id_flashcard: int
    interval: int
    ease_factor: float
    due_date: datetime
    last_reviewed: datetime
    repeticiones: int

    model_config = {"from_attributes": True}
