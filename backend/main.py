from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

import models
import schemas
from database import engine, get_db

# Create the database tables
models.Base.metadata.create_all(bind=engine)

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

from datetime import datetime, date

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
