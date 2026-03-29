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
    creador_id: Optional[int] = None
    es_publica: bool = True
    creador_nombre: Optional[str] = None
    unidades: List[UnidadBase] = []

    model_config = {"from_attributes": True}

class MateriaUpdate(BaseModel):
    nombre: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    orden: Optional[int] = None
    es_publica: Optional[bool] = None

class MateriaCreate(BaseModel):
    nombre: str
    emoji: Optional[str] = None
    color: Optional[str] = None

class UnidadCreate(BaseModel):
    nombre: str
    orden: Optional[int] = None

class UnidadUpdate(BaseModel):
    nombre: Optional[str] = None
    orden: Optional[int] = None
    estado_default: Optional[str] = None

class TemaCreate(BaseModel):
    nombre: str

class TemaUpdate(BaseModel):
    nombre: Optional[str] = None

class QuizPreguntaCreate(BaseModel):
    pregunta: str
    opcion_a: str
    opcion_b: str
    opcion_c: str
    opcion_d: str
    respuesta_correcta: str
    justificacion: Optional[str] = None

class QuizPreguntaUpdate(BaseModel):
    pregunta: Optional[str] = None
    opcion_a: Optional[str] = None
    opcion_b: Optional[str] = None
    opcion_c: Optional[str] = None
    opcion_d: Optional[str] = None
    respuesta_correcta: Optional[str] = None
    justificacion: Optional[str] = None

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
    justificacion: Optional[str] = None

    model_config = {"from_attributes": True}

class InfografiaBase(BaseModel):
    id: int
    id_unidad: int
    titulo: str
    url: str
    orden: int

    model_config = {"from_attributes": True}

class PdfBase(BaseModel):
    id: int
    id_unidad: int
    titulo: str
    url: str
    orden: int

    model_config = {"from_attributes": True}

class VistaCreate(BaseModel):
    id_usuario: int

class SeguirCreate(BaseModel):
    id_usuario: int
    siguiendo: Optional[bool] = None  # True=follow, False=unfollow, None=legacy toggle

class SeguidorUser(BaseModel):
    id_telegram: int
    first_name: str
    foto_url: Optional[str] = None

    model_config = {"from_attributes": True}

class SeguirResponse(BaseModel):
    siguiendo: bool
    total_seguidores: int

class MateriaPorcentaje(BaseModel):
    id: int
    nombre: str
    emoji: Optional[str] = None
    color: Optional[str] = None
    porcentaje: float

class UserPerfil(BaseModel):
    id_telegram: int
    first_name: str
    last_name: Optional[str] = None
    foto_url: Optional[str] = None
    descripcion: Optional[str] = None
    racha: int
    materias_cursando: List[MateriaPorcentaje]
    materias_completadas: List[MateriaPorcentaje]
    wallet_address: Optional[str] = None
    nft_activo_address: Optional[str] = None
    mostrar_nft: bool = False

class PdfVistoCreate(BaseModel):
    id_usuario: int

class InfografiaVistaCreate(BaseModel):
    id_usuario: int

class QuizResultadoCreate(BaseModel):
    id_usuario: int
    id_unidad: int
    correctas: int
    total: int

class ProgresoUnidad(BaseModel):
    porcentaje_total: float
    flashcards: dict
    cuestionario: dict
    pdfs: dict
    infografias: dict

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
    wallet_address: Optional[str] = None
    nft_activo_address: Optional[str] = None
    mostrar_nft: Optional[bool] = False

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

class PrivacidadUpdate(BaseModel):
    mostrar_foto: Optional[bool] = None
    mostrar_nombre: Optional[bool] = None
    mostrar_username: Optional[bool] = None
    mostrar_progreso: Optional[bool] = None
    mostrar_cursos: Optional[bool] = None
    mostrar_nft: Optional[bool] = None

class PrivacidadOut(BaseModel):
    mostrar_foto: bool
    mostrar_nombre: bool
    mostrar_username: bool
    mostrar_progreso: bool
    mostrar_cursos: bool
    mostrar_nft: bool
    onboarding_completado: bool

    model_config = {"from_attributes": True}


class WalletConnectBody(BaseModel):
    address: str               # "workchain:hash_hex"
    proof: dict                # { timestamp, domain, signature, payload }
    state_init: Optional[str] = None  # base64 state init for undeployed wallets


class NftActivoBody(BaseModel):
    nft_address: Optional[str] = None  # None to deselect

class ActividadCreate(BaseModel):
    id_telegram: int
    tipo: str
    fecha_local: str

class ActividadResponse(BaseModel):
    racha: int
    nueva_racha: bool
    primer_dia: bool

class DeleteProgresoBody(BaseModel):
    id_usuario: int


class NotificacionesConfigOut(BaseModel):
    racha_activa: bool
    recordatorio_activo: bool
    flashcards_activa: bool
    hora_recordatorio: str  # "HH:MM"

class NotificacionesConfigUpdate(BaseModel):
    racha_activa: Optional[bool] = None
    recordatorio_activo: Optional[bool] = None
    flashcards_activa: Optional[bool] = None
    hora_recordatorio: Optional[str] = None  # "HH:MM"


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


class MascotaChatRequest(BaseModel):
    user_id: int
    accion: str
    datos: dict = {}
    pantalla: str = "home"


class MascotaChatResponse(BaseModel):
    mensaje: str
    accion: dict | None = None


class TutorMessage(BaseModel):
    role: str
    content: str

class TutorChatRequest(BaseModel):
    user_id: int
    unidad_id: int | None = None
    messages: list[TutorMessage] = []
    question: str

class TutorChatResponse(BaseModel):
    respuesta: str

class AIGenerateRequest(BaseModel):
    unidad_id: int
    count: int = 10


class TutorAccionRequest(BaseModel):
    user_id: int
    unidad_id: int | None = None
    accion: str  # "concepto_clave" | "punto_debil" | "practica" | "explicar_tema"
    tema_nombre: str | None = None
