from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import os
import uuid
import boto3
from botocore.client import Config

import models
import schemas
from database import engine, get_db

R2_PUBLIC_URL = "https://pub-d070e7bf4b014f54acc4915474377809.r2.dev"

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT"],
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

# Create the database tables
models.Base.metadata.create_all(bind=engine)

# Manual migrations for columns added after initial table creation
# (create_all does not ALTER existing tables)
with engine.connect() as conn:
    conn.execute(__import__('sqlalchemy').text(
        "ALTER TABLE quiz_preguntas ADD COLUMN IF NOT EXISTS justificacion VARCHAR"
    ))
    conn.commit()

app = FastAPI(title="MineStudy Hub API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/users", response_model=schemas.User)
def create_or_update_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id_telegram == user.id_telegram).first()
    if db_user:
        # Update user
        for key, value in user.model_dump(exclude_unset=True).items():
            setattr(db_user, key, value)
    else:
        # Create user
        db_user = models.User(**user.model_dump())
        db.add(db_user)

    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/{id_telegram}", response_model=schemas.User)
def get_user_profile(id_telegram: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id_telegram == id_telegram).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

@app.put("/progreso", response_model=schemas.Progreso)
def update_progress(progreso: schemas.ProgresoCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.id_telegram == progreso.id_usuario).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # The materia needs to exist too, assuming it will be prepopulated.
    # We check if a progress record exists
    db_progreso = db.query(models.Progreso).filter(
        models.Progreso.id_usuario == progreso.id_usuario,
        models.Progreso.id_materia == progreso.id_materia,
        models.Progreso.id_unidad == progreso.id_unidad
    ).first()

    if db_progreso:
        # Update existing
        db_progreso.porcentaje = progreso.porcentaje
    else:
        # Create new
        db_progreso = models.Progreso(**progreso.model_dump())
        db.add(db_progreso)

    db.commit()
    db.refresh(db_progreso)
    return db_progreso

@app.get("/materias", response_model=List[schemas.MateriaBase])
def get_materias(db: Session = Depends(get_db)):
    db_materias = db.query(models.Materia).order_by(models.Materia.orden).all()
    # Unidades and temas will be fetched automatically due to relationship setup
    # Make sure to sort them correctly before returning
    for materia in db_materias:
        materia.unidades.sort(key=lambda u: (u.orden is None, u.orden))
        for unidad in materia.unidades:
            unidad.temas.sort(key=lambda t: t.id) # Sort by id for temas as they don't have orden
    return db_materias

@app.put("/materias/{id}", response_model=schemas.MateriaBase)
def update_materia(id: int, materia: schemas.MateriaUpdate, db: Session = Depends(get_db)):
    db_materia = db.query(models.Materia).filter(models.Materia.id == id).first()
    if not db_materia:
        raise HTTPException(status_code=404, detail="Materia not found")

    update_data = materia.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_materia, key, value)

    db.commit()
    db.refresh(db_materia)
    return db_materia

@app.delete("/materias/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_materia(id: int, db: Session = Depends(get_db)):
    db_materia = db.query(models.Materia).filter(models.Materia.id == id).first()
    if not db_materia:
        raise HTTPException(status_code=404, detail="Materia not found")
    # Due to cascade="all, delete-orphan", this will also delete unidades, temas, etc.
    db.delete(db_materia)
    db.commit()
    return

@app.get("/materias/{id}/unidades", response_model=List[schemas.UnidadBase])
def get_unidades(id: int, db: Session = Depends(get_db)):
    db_unidades = db.query(models.Unidad).filter(models.Unidad.id_materia == id).all()
    if not db_unidades:
        return []
    return db_unidades

@app.put("/unidades/{id}", response_model=schemas.UnidadBase)
def update_unidad(id: int, unidad: schemas.UnidadUpdate, db: Session = Depends(get_db)):
    db_unidad = db.query(models.Unidad).filter(models.Unidad.id == id).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")

    update_data = unidad.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_unidad, key, value)

    db.commit()
    db.refresh(db_unidad)
    return db_unidad

@app.delete("/unidades/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unidad(id: int, db: Session = Depends(get_db)):
    db_unidad = db.query(models.Unidad).filter(models.Unidad.id == id).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")
    db.delete(db_unidad)
    db.commit()
    return

@app.delete("/temas/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tema(id: int, db: Session = Depends(get_db)):
    db_tema = db.query(models.Tema).filter(models.Tema.id == id).first()
    if not db_tema:
        raise HTTPException(status_code=404, detail="Tema not found")
    db.delete(db_tema)
    db.commit()
    return

@app.get("/unidades/{id_unidad}/flashcards", response_model=List[schemas.FlashcardBase])
def get_flashcards(id_unidad: int, db: Session = Depends(get_db)):
    db_flashcards = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id_unidad).all()
    if not db_flashcards:
        return []
    return db_flashcards

@app.get("/unidades/{id_unidad}/quiz", response_model=List[schemas.QuizPreguntaBase])
def get_quiz(id_unidad: int, db: Session = Depends(get_db)):
    db_quiz = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == id_unidad).all()
    if not db_quiz:
        return []
    return db_quiz

@app.get("/ranking", response_model=List[schemas.RankingUser])
def get_ranking(db: Session = Depends(get_db)):
    # Query to calculate average percentage for each user across all their progress records
    ranking_data = db.query(
        models.User,
        func.coalesce(func.avg(models.Progreso.porcentaje), 0).label('total_progress')
    ).outerjoin(models.Progreso).group_by(models.User.id_telegram).order_by(
        func.coalesce(func.avg(models.Progreso.porcentaje), 0).desc()
    ).all()

    result = []
    for user, total_progress in ranking_data:
        result.append({
            "id_telegram": user.id_telegram,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "foto_url": user.foto_url,
            "total_progress": total_progress
        })
    return result

from datetime import datetime, date, timedelta, timezone

@app.post("/flashcards/{id}/review", response_model=schemas.CardReviewOut)
def review_flashcard(id: int, body: schemas.ReviewRequest, db: Session = Depends(get_db)):
    flashcard = db.query(models.Flashcard).filter(models.Flashcard.id == id).first()
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    review = db.query(models.CardReview).filter(
        models.CardReview.id_usuario == body.id_usuario,
        models.CardReview.id_flashcard == id
    ).first()

    now = datetime.now(timezone.utc)

    if review is None:
        review = models.CardReview(
            id_usuario=body.id_usuario,
            id_flashcard=id,
            interval=1,
            ease_factor=2.5,
            due_date=now,
            last_reviewed=now,
            repeticiones=0,
        )
        db.add(review)

    if body.knew:
        new_interval = max(1, round(review.interval * review.ease_factor))
        new_ease = review.ease_factor + 0.1
        new_repeticiones = review.repeticiones + 1
    else:
        new_interval = 1
        new_ease = max(1.3, review.ease_factor - 0.2)
        new_repeticiones = 0

    review.interval = new_interval
    review.ease_factor = new_ease
    review.repeticiones = new_repeticiones
    review.last_reviewed = now
    review.due_date = now + timedelta(days=new_interval)

    db.commit()
    db.refresh(review)
    return review


@app.get("/flashcards/due", response_model=List[schemas.FlashcardBase])
def get_due_flashcards(id_unidad: int, id_usuario: int, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)

    all_cards = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id_unidad).all()
    if not all_cards:
        return []

    card_ids = [c.id for c in all_cards]
    reviews = db.query(models.CardReview).filter(
        models.CardReview.id_usuario == id_usuario,
        models.CardReview.id_flashcard.in_(card_ids)
    ).all()
    review_map = {r.id_flashcard: r for r in reviews}

    due, not_due, never = [], [], []
    for card in all_cards:
        r = review_map.get(card.id)
        if r is None:
            never.append(card)
        elif r.due_date <= now:
            due.append((r.due_date, card))
        else:
            not_due.append((r.due_date, card))

    due.sort(key=lambda x: x[0])
    not_due.sort(key=lambda x: x[0])

    return [c for _, c in due] + never + [c for _, c in not_due]


@app.post("/actividad", response_model=schemas.ActividadResponse)
def registrar_actividad(actividad: schemas.ActividadCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id_telegram == actividad.id_telegram).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    try:
        fecha_actividad = datetime.strptime(actividad.fecha_local, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, should be YYYY-MM-DD")

    nueva_racha = False
    primer_dia = False

    if db_user.ultima_actividad:
        ultima_fecha = db_user.ultima_actividad.date()
        delta = (fecha_actividad - ultima_fecha).days

        if delta == 0:
            # Already completed an activity today
            pass
        elif delta == 1:
            # Completed yesterday, increment streak
            db_user.racha += 1
            nueva_racha = True
        elif delta > 1:
            # Streak broken
            db_user.racha = 1
            nueva_racha = True
            primer_dia = True
        else:
            # In case the activity date is older than last activity (should not happen)
            pass
    else:
        # First activity ever
        db_user.racha = 1
        nueva_racha = True
        primer_dia = True

    # Only update the timestamp if it's the current date being processed (delta >= 0)
    # Actually, we should always update it to the latest activity date
    if not db_user.ultima_actividad or (fecha_actividad - db_user.ultima_actividad.date()).days >= 0:
        db_user.ultima_actividad = datetime.combine(fecha_actividad, datetime.min.time())

    db.commit()

    return schemas.ActividadResponse(
        racha=db_user.racha,
        nueva_racha=nueva_racha,
        primer_dia=primer_dia
    )


@app.post("/pdfs/{id}/visto")
def registrar_pdf_visto(id: int, body: schemas.PdfVistoCreate, db: Session = Depends(get_db)):
    existing = db.query(models.PdfVisto).filter(
        models.PdfVisto.id_usuario == body.id_usuario,
        models.PdfVisto.id_pdf == id
    ).first()
    if not existing:
        db.add(models.PdfVisto(id_usuario=body.id_usuario, id_pdf=id))
        db.commit()
    return {"ok": True}


@app.post("/infografias/{id}/vista")
def registrar_infografia_vista(id: int, body: schemas.InfografiaVistaCreate, db: Session = Depends(get_db)):
    existing = db.query(models.InfografiaVista).filter(
        models.InfografiaVista.id_usuario == body.id_usuario,
        models.InfografiaVista.id_infografia == id
    ).first()
    if not existing:
        db.add(models.InfografiaVista(id_usuario=body.id_usuario, id_infografia=id))
        db.commit()
    return {"ok": True}


@app.post("/quiz/resultado")
def guardar_quiz_resultado(body: schemas.QuizResultadoCreate, db: Session = Depends(get_db)):
    resultado = models.QuizResultado(
        id_usuario=body.id_usuario,
        id_unidad=body.id_unidad,
        correctas=body.correctas,
        total=body.total,
    )
    db.add(resultado)
    db.commit()
    return {"ok": True}


@app.get("/unidades/{id}/progreso")
def get_progreso_unidad(id: int, id_usuario: int, db: Session = Depends(get_db)):
    # Flashcards
    all_flashcards = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id).all()
    total_fc = len(all_flashcards)
    dominadas = 0
    if total_fc > 0:
        fc_ids = [f.id for f in all_flashcards]
        dominadas = db.query(models.CardReview).filter(
            models.CardReview.id_usuario == id_usuario,
            models.CardReview.id_flashcard.in_(fc_ids),
            models.CardReview.repeticiones > 0
        ).count()
    fc_pct = (dominadas / total_fc * 100) if total_fc > 0 else 0

    # Cuestionario — último resultado
    total_quiz = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == id).count()
    correctas = 0
    if total_quiz > 0:
        ultimo = (
            db.query(models.QuizResultado)
            .filter(models.QuizResultado.id_usuario == id_usuario, models.QuizResultado.id_unidad == id)
            .order_by(models.QuizResultado.fecha.desc())
            .first()
        )
        if ultimo:
            correctas = ultimo.correctas
    qz_pct = (correctas / total_quiz * 100) if total_quiz > 0 else 0

    # PDFs
    all_pdfs = db.query(models.Pdf).filter(models.Pdf.id_unidad == id).all()
    total_pdfs = len(all_pdfs)
    pdfs_vistos = 0
    ids_pdfs_vistos = []
    if total_pdfs > 0:
        pdf_ids = [p.id for p in all_pdfs]
        vistos = db.query(models.PdfVisto).filter(
            models.PdfVisto.id_usuario == id_usuario,
            models.PdfVisto.id_pdf.in_(pdf_ids)
        ).all()
        pdfs_vistos = len(vistos)
        ids_pdfs_vistos = [v.id_pdf for v in vistos]
    pdf_pct = (pdfs_vistos / total_pdfs * 100) if total_pdfs > 0 else 0

    # Infografías
    all_inf = db.query(models.Infografia).filter(models.Infografia.id_unidad == id).all()
    total_inf = len(all_inf)
    inf_vistas = 0
    ids_inf_vistas = []
    if total_inf > 0:
        inf_ids = [i.id for i in all_inf]
        vistas = db.query(models.InfografiaVista).filter(
            models.InfografiaVista.id_usuario == id_usuario,
            models.InfografiaVista.id_infografia.in_(inf_ids)
        ).all()
        inf_vistas = len(vistas)
        ids_inf_vistas = [v.id_infografia for v in vistas]

    # Porcentaje total con redistribución de pesos
    components = {}
    if total_fc > 0:
        components['fc'] = (fc_pct, 0.50)
    if total_quiz > 0:
        components['qz'] = (qz_pct, 0.35)
    if total_pdfs > 0:
        components['pdf'] = (pdf_pct, 0.15)

    if components:
        total_weight = sum(w for _, w in components.values())
        porcentaje_total = sum(score * (w / total_weight) for score, w in components.values())
    else:
        porcentaje_total = 0

    return {
        "porcentaje_total": round(porcentaje_total, 1),
        "flashcards": {"dominadas": dominadas, "total": total_fc, "porcentaje": round(fc_pct, 1)},
        "cuestionario": {"correctas": correctas, "total": total_quiz, "porcentaje": round(qz_pct, 1)},
        "pdfs": {"vistos": pdfs_vistos, "total": total_pdfs, "ids_vistos": ids_pdfs_vistos},
        "infografias": {"vistas": inf_vistas, "total": total_inf, "ids_vistas": ids_inf_vistas},
    }


@app.get("/infografias", response_model=List[schemas.InfografiaBase])
def get_infografias(id_unidad: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Infografia)
        .filter(models.Infografia.id_unidad == id_unidad)
        .order_by(models.Infografia.orden)
        .all()
    )


@app.post("/admin/infografias/upload", response_model=schemas.InfografiaBase)
async def upload_infografia(
    file: UploadFile = File(...),
    id_unidad: int = Form(...),
    titulo: str = Form(...),
    db: Session = Depends(get_db),
):
    db_unidad = db.query(models.Unidad).filter(models.Unidad.id == id_unidad).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{id_unidad}/{uuid.uuid4()}.{ext}"

    content = await file.read()
    r2 = get_r2_client()
    r2.put_object(
        Bucket=os.environ["R2_BUCKET"],
        Key=filename,
        Body=content,
        ContentType=file.content_type or "image/jpeg",
    )

    max_orden = (
        db.query(func.max(models.Infografia.orden))
        .filter(models.Infografia.id_unidad == id_unidad)
        .scalar()
    ) or 0

    infografia = models.Infografia(
        id_unidad=id_unidad,
        titulo=titulo,
        url=f"{R2_PUBLIC_URL}/{filename}",
        orden=max_orden + 1,
    )
    db.add(infografia)
    db.commit()
    db.refresh(infografia)
    return infografia


@app.get("/pdfs", response_model=List[schemas.PdfBase])
def get_pdfs(id_unidad: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Pdf)
        .filter(models.Pdf.id_unidad == id_unidad)
        .order_by(models.Pdf.orden)
        .all()
    )


@app.post("/admin/pdfs/upload", response_model=schemas.PdfBase)
async def upload_pdf(
    file: UploadFile = File(...),
    id_unidad: int = Form(...),
    titulo: str = Form(...),
    db: Session = Depends(get_db),
):
    db_unidad = db.query(models.Unidad).filter(models.Unidad.id == id_unidad).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "pdf"
    filename = f"pdfs/{id_unidad}/{uuid.uuid4()}.{ext}"

    content = await file.read()
    r2 = get_r2_client()
    r2.put_object(
        Bucket=os.environ["R2_BUCKET"],
        Key=filename,
        Body=content,
        ContentType=file.content_type or "application/pdf",
    )

    max_orden = (
        db.query(func.max(models.Pdf.orden))
        .filter(models.Pdf.id_unidad == id_unidad)
        .scalar()
    ) or 0

    pdf = models.Pdf(
        id_unidad=id_unidad,
        titulo=titulo,
        url=f"{R2_PUBLIC_URL}/{filename}",
        orden=max_orden + 1,
    )
    db.add(pdf)
    db.commit()
    db.refresh(pdf)
    return pdf


@app.delete("/admin/pdfs/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pdf(id: int, db: Session = Depends(get_db)):
    pdf = db.query(models.Pdf).filter(models.Pdf.id == id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="Pdf not found")

    stored_url = pdf.url
    key = stored_url.removeprefix(f"{R2_PUBLIC_URL}/")
    bucket = os.environ["R2_BUCKET"]
    try:
        r2 = get_r2_client()
        r2.delete_object(Bucket=bucket, Key=key)
    except Exception as e:
        print(f"[R2 delete pdf] ERROR type={type(e).__name__} msg={e}")

    db.delete(pdf)
    db.commit()
    return


@app.post("/materias/{id}/seguir", response_model=schemas.SeguirResponse)
def toggle_seguir_materia(id: int, body: schemas.SeguirCreate, db: Session = Depends(get_db)):
    existing = db.query(models.MateriaSeguida).filter(
        models.MateriaSeguida.id_usuario == body.id_usuario,
        models.MateriaSeguida.id_materia == id,
    ).first()
    if existing:
        db.delete(existing)
        siguiendo = False
    else:
        db.add(models.MateriaSeguida(id_usuario=body.id_usuario, id_materia=id))
        siguiendo = True
    db.commit()
    total = db.query(models.MateriaSeguida).filter(models.MateriaSeguida.id_materia == id).count()
    return {"siguiendo": siguiendo, "total_seguidores": total}


@app.get("/materias/{id}/seguidores")
def get_seguidores_materia(id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(models.User)
        .join(models.MateriaSeguida, models.MateriaSeguida.id_usuario == models.User.id_telegram)
        .filter(models.MateriaSeguida.id_materia == id)
        .order_by(models.MateriaSeguida.fecha.desc())
        .all()
    )
    return [{"id_telegram": u.id_telegram, "first_name": u.first_name, "foto_url": u.foto_url} for u in rows]


@app.get("/usuarios/{id}/materias-seguidas")
def get_materias_seguidas(id: int, db: Session = Depends(get_db)):
    rows = db.query(models.MateriaSeguida.id_materia).filter(
        models.MateriaSeguida.id_usuario == id
    ).all()
    return {"materia_ids": [r[0] for r in rows]}


@app.get("/usuarios/{id}/perfil", response_model=schemas.UserPerfil)
def get_user_perfil(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    seguidas = (
        db.query(models.Materia)
        .join(models.MateriaSeguida, models.MateriaSeguida.id_materia == models.Materia.id)
        .filter(models.MateriaSeguida.id_usuario == id)
        .order_by(models.MateriaSeguida.fecha.desc())
        .all()
    )
    materias_con_pct = []
    for materia in seguidas:
        unidades = sorted(materia.unidades, key=lambda u: (u.orden is None, u.orden))
        if unidades:
            pct = sum(_compute_progreso_unidad(u.id, id, db) for u in unidades) / len(unidades)
        else:
            pct = 0.0
        materias_con_pct.append({
            "id": materia.id, "nombre": materia.nombre,
            "emoji": materia.emoji, "color": materia.color,
            "porcentaje": round(pct, 1),
        })
    return {
        "id_telegram": user.id_telegram,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "foto_url": user.foto_url,
        "racha": user.racha or 0,
        "materias_seguidas": materias_con_pct,
    }


@app.post("/unidades/{id}/vista")
def registrar_vista(id: int, body: schemas.VistaCreate, db: Session = Depends(get_db)):
    cooldown = datetime.now(timezone.utc) - timedelta(minutes=30)
    existing = db.query(models.Vista).filter(
        models.Vista.id_usuario == body.id_usuario,
        models.Vista.id_unidad == id,
        models.Vista.fecha >= cooldown,
    ).first()
    if not existing:
        db.add(models.Vista(id_usuario=body.id_usuario, id_unidad=id))
        db.commit()
    return {"ok": True}


@app.get("/unidades/{id}/vistas")
def get_vistas_unidad(id: int, db: Session = Depends(get_db)):
    total = db.query(models.Vista).filter(models.Vista.id_unidad == id).count()
    return {"total": total}


@app.get("/materias/{id}/vistas")
def get_vistas_materia(id: int, db: Session = Depends(get_db)):
    total = (
        db.query(models.Vista)
        .join(models.Unidad, models.Vista.id_unidad == models.Unidad.id)
        .filter(models.Unidad.id_materia == id)
        .count()
    )
    return {"total": total}


def _compute_progreso_unidad(id_unidad: int, id_usuario: int, db: Session) -> float:
    """Computes porcentaje_total for a unit (reused by stats endpoint)."""
    all_flashcards = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id_unidad).all()
    total_fc = len(all_flashcards)
    dominadas = 0
    if total_fc > 0:
        fc_ids = [f.id for f in all_flashcards]
        dominadas = db.query(models.CardReview).filter(
            models.CardReview.id_usuario == id_usuario,
            models.CardReview.id_flashcard.in_(fc_ids),
            models.CardReview.repeticiones > 0,
        ).count()
    fc_pct = (dominadas / total_fc * 100) if total_fc > 0 else 0

    total_quiz = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == id_unidad).count()
    correctas = 0
    if total_quiz > 0:
        ultimo = (
            db.query(models.QuizResultado)
            .filter(models.QuizResultado.id_usuario == id_usuario, models.QuizResultado.id_unidad == id_unidad)
            .order_by(models.QuizResultado.fecha.desc())
            .first()
        )
        if ultimo:
            correctas = ultimo.correctas
    qz_pct = (correctas / total_quiz * 100) if total_quiz > 0 else 0

    all_pdfs = db.query(models.Pdf).filter(models.Pdf.id_unidad == id_unidad).all()
    total_pdfs = len(all_pdfs)
    pdf_pct = 0
    if total_pdfs > 0:
        pdf_ids = [p.id for p in all_pdfs]
        pdfs_vistos = db.query(models.PdfVisto).filter(
            models.PdfVisto.id_usuario == id_usuario,
            models.PdfVisto.id_pdf.in_(pdf_ids),
        ).count()
        pdf_pct = pdfs_vistos / total_pdfs * 100

    components = {}
    if total_fc > 0: components['fc'] = (fc_pct, 0.50)
    if total_quiz > 0: components['qz'] = (qz_pct, 0.35)
    if total_pdfs > 0: components['pdf'] = (pdf_pct, 0.15)
    if not components:
        return 0.0
    total_weight = sum(w for _, w in components.values())
    return sum(score * (w / total_weight) for score, w in components.values())


@app.get("/usuarios/{id}/stats")
def get_user_stats(id: int, db: Session = Depends(get_db)):
    # 1. Flashcards dominadas
    flashcards_dominadas = db.query(models.CardReview).filter(
        models.CardReview.id_usuario == id,
        models.CardReview.repeticiones > 0,
    ).count()

    # 2. Cuestionarios completados
    cuestionarios_completados = db.query(models.QuizResultado).filter(
        models.QuizResultado.id_usuario == id,
    ).count()

    # 3. Progreso general & foco del día (unit with lowest pct excluding 100%)
    materias = db.query(models.Materia).order_by(models.Materia.orden).all()
    all_pcts = []
    foco = None
    foco_pct = 101.0
    for materia in materias:
        unidades_sorted = sorted(materia.unidades, key=lambda u: (u.orden is None, u.orden))
        for unidad in unidades_sorted:
            pct = _compute_progreso_unidad(unidad.id, id, db)
            all_pcts.append(pct)
            if pct < 100.0 and pct < foco_pct:
                foco_pct = pct
                foco = {
                    "materia_id": materia.id,
                    "materia_nombre": materia.nombre,
                    "unidad_id": unidad.id,
                    "unidad_nombre": unidad.nombre,
                    "porcentaje": round(pct, 1),
                }
    progreso_general = round(sum(all_pcts) / len(all_pcts), 1) if all_pcts else 0.0

    # 4. Materias activas — at least 1 action in any unit of the materia
    active_unidad_ids: set[int] = set()

    fc_ids = [r[0] for r in db.query(models.CardReview.id_flashcard).filter(
        models.CardReview.id_usuario == id).all()]
    if fc_ids:
        rows = db.query(models.Flashcard.id_unidad).filter(models.Flashcard.id.in_(fc_ids)).distinct().all()
        active_unidad_ids.update(r[0] for r in rows)

    rows = db.query(models.QuizResultado.id_unidad).filter(
        models.QuizResultado.id_usuario == id).distinct().all()
    active_unidad_ids.update(r[0] for r in rows)

    rows = db.query(models.Pdf.id_unidad).join(
        models.PdfVisto, (models.PdfVisto.id_pdf == models.Pdf.id) & (models.PdfVisto.id_usuario == id)
    ).distinct().all()
    active_unidad_ids.update(r[0] for r in rows)

    rows = db.query(models.Infografia.id_unidad).join(
        models.InfografiaVista,
        (models.InfografiaVista.id_infografia == models.Infografia.id) & (models.InfografiaVista.id_usuario == id),
    ).distinct().all()
    active_unidad_ids.update(r[0] for r in rows)

    materias_activas = 0
    if active_unidad_ids:
        materias_activas = db.query(models.Unidad.id_materia).filter(
            models.Unidad.id.in_(active_unidad_ids)
        ).distinct().count()

    return {
        "flashcards_dominadas": flashcards_dominadas,
        "cuestionarios_completados": cuestionarios_completados,
        "progreso_general": progreso_general,
        "materias_activas": materias_activas,
        "foco": foco,
    }


@app.get("/usuarios/{id}/actividad-reciente")
def get_actividad_reciente(id: int, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)

    def _hace(dt):
        if dt is None:
            return ""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        secs = int((now - dt).total_seconds())
        if secs < 3600:
            return f"hace {max(1, secs // 60)} min"
        if secs < 86400:
            h = secs // 3600
            return f"hace {h} {'hora' if h == 1 else 'horas'}"
        if secs < 172800:
            return "ayer"
        return f"hace {secs // 86400} días"

    events = []

    # Quiz resultados
    quizzes = (
        db.query(models.QuizResultado, models.Unidad.nombre.label("u_nombre"))
        .join(models.Unidad, models.QuizResultado.id_unidad == models.Unidad.id)
        .filter(models.QuizResultado.id_usuario == id)
        .order_by(models.QuizResultado.fecha.desc())
        .limit(5)
        .all()
    )
    for q, u_nombre in quizzes:
        events.append({
            "tipo": "quiz",
            "titulo": "Cuestionario completado",
            "detalle": f"{q.correctas}/{q.total} correctas · {u_nombre}",
            "ts": q.fecha,
        })

    # PDFs vistos
    pdfs_v = (
        db.query(models.PdfVisto, models.Pdf.titulo.label("pdf_titulo"))
        .join(models.Pdf, models.PdfVisto.id_pdf == models.Pdf.id)
        .filter(models.PdfVisto.id_usuario == id)
        .order_by(models.PdfVisto.visto_at.desc())
        .limit(5)
        .all()
    )
    for pv, titulo in pdfs_v:
        events.append({
            "tipo": "pdf",
            "titulo": "PDF visto",
            "detalle": titulo,
            "ts": pv.visto_at,
        })

    # Infografías vistas
    infs_v = (
        db.query(models.InfografiaVista, models.Infografia.titulo.label("inf_titulo"))
        .join(models.Infografia, models.InfografiaVista.id_infografia == models.Infografia.id)
        .filter(models.InfografiaVista.id_usuario == id)
        .order_by(models.InfografiaVista.visto_at.desc())
        .limit(5)
        .all()
    )
    for iv, titulo in infs_v:
        events.append({
            "tipo": "infografia",
            "titulo": "Infografía vista",
            "detalle": titulo,
            "ts": iv.visto_at,
        })

    # Flashcards: group reviews by calendar date
    reviews_by_day = (
        db.query(
            func.date(models.CardReview.last_reviewed).label("review_date"),
            func.count(models.CardReview.id_flashcard).label("cnt"),
            func.max(models.CardReview.last_reviewed).label("last_ts"),
        )
        .filter(models.CardReview.id_usuario == id)
        .group_by(func.date(models.CardReview.last_reviewed))
        .order_by(func.date(models.CardReview.last_reviewed).desc())
        .limit(5)
        .all()
    )
    for row in reviews_by_day:
        events.append({
            "tipo": "flashcard",
            "titulo": "Flashcards repasadas",
            "detalle": f"{row.cnt} tarjetas",
            "ts": row.last_ts,
        })

    # Sort by timestamp desc, take top 5, add "hace"
    def sort_key(e):
        ts = e["ts"]
        if ts is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)

    events.sort(key=sort_key, reverse=True)
    return [
        {"tipo": e["tipo"], "titulo": e["titulo"], "detalle": e["detalle"], "hace": _hace(e["ts"])}
        for e in events[:5]
    ]


@app.delete("/admin/infografias/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_infografia(id: int, db: Session = Depends(get_db)):
    infografia = db.query(models.Infografia).filter(models.Infografia.id == id).first()
    if not infografia:
        raise HTTPException(status_code=404, detail="Infografia not found")

    # Extract R2 key from public URL: everything after the domain
    stored_url = infografia.url
    key = stored_url.removeprefix(f"{R2_PUBLIC_URL}/")
    bucket = os.environ["R2_BUCKET"]
    print(f"[R2 delete] stored_url='{stored_url}'")
    print(f"[R2 delete] R2_PUBLIC_URL='{R2_PUBLIC_URL}'")
    print(f"[R2 delete] extracted key='{key}'")
    print(f"[R2 delete] bucket='{bucket}'")
    try:
        r2 = get_r2_client()
        response = r2.delete_object(Bucket=bucket, Key=key)
        print(f"[R2 delete] response={response}")
    except Exception as e:
        print(f"[R2 delete] ERROR type={type(e).__name__} msg={e}")

    db.delete(infografia)
    db.commit()
    return
