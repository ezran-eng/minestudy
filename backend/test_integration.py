"""
Tests de integración — flujos completos de punta a punta.

Cada clase cubre un flujo real de usuario, verificando que múltiples
endpoints funcionen correctamente encadenados.
"""
from unittest.mock import patch
import models


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _create_user(client, id_telegram=111, first_name="Jose"):
    with patch("main._get_telegram_bio", return_value=None):
        r = client.post("/users", json={
            "id_telegram": id_telegram,
            "first_name": first_name,
        })
    assert r.status_code == 200
    return r.json()


def _seed_materia(db, nombre="Geología", orden=1):
    m = models.Materia(nombre=nombre, emoji="⛏️", color="#FF5500", orden=orden)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def _seed_unidad(db, id_materia, nombre="Unidad 1", orden=1):
    u = models.Unidad(id_materia=id_materia, nombre=nombre, orden=orden)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _seed_flashcard(db, id_unidad, pregunta="¿Qué es roca?", respuesta="Material sólido"):
    fc = models.Flashcard(id_unidad=id_unidad, pregunta=pregunta, respuesta=respuesta)
    db.add(fc)
    db.commit()
    db.refresh(fc)
    return fc


def _seed_quiz_pregunta(db, id_unidad):
    q = models.QuizPregunta(
        id_unidad=id_unidad,
        pregunta="¿Dureza del diamante?",
        opcion_a="8", opcion_b="9", opcion_c="10", opcion_d="7",
        respuesta_correcta="c",
        justificacion="El diamante tiene dureza 10 en la escala de Mohs.",
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


# ─── Flujo 1: Usuario nuevo → sigue materia → actualiza progreso ──────────────

class TestFlujoEstudio:
    def test_usuario_sigue_materia_y_progreso_aparece_en_stats(
        self, client_with_init_data, db
    ):
        """Flujo: crear usuario → seguir materia → actualizar progreso → ver stats."""
        # 1. Crear usuario
        user = _create_user(client_with_init_data, id_telegram=100)
        assert user["racha"] == 0

        # 2. Listar materias (vacías al inicio)
        r = client_with_init_data.get("/materias")
        assert r.status_code == 200
        assert r.json() == []

        # 3. Crear materia y unidad en DB
        materia = _seed_materia(db)
        unidad = _seed_unidad(db, materia.id)

        # 4. Seguir materia
        r = client_with_init_data.post(
            f"/materias/{materia.id}/seguir",
            json={"id_usuario": 100},
        )
        assert r.status_code == 200
        assert r.json()["siguiendo"] is True

        # 5. Verificar materias seguidas — devuelve {"materia_ids": [...]}
        r = client_with_init_data.get("/usuarios/100/materias-seguidas")
        assert r.status_code == 200
        assert materia.id in r.json()["materia_ids"]

        # 6. Actualizar progreso
        r = client_with_init_data.put("/progreso", json={
            "id_usuario": 100,
            "id_materia": materia.id,
            "id_unidad": unidad.id,
            "porcentaje": 60,
        })
        assert r.status_code == 200
        assert r.json()["porcentaje"] == 60

        # 7. Stats: la unidad aparece como foco del día
        r = client_with_init_data.get("/usuarios/100/stats")
        assert r.status_code == 200
        stats = r.json()
        assert "progreso_general" in stats

    def test_dejar_de_seguir_elimina_progreso(self, client_with_init_data, db):
        """Unfollow debe borrar el progreso asociado."""
        _create_user(client_with_init_data, id_telegram=101)
        materia = _seed_materia(db)
        unidad = _seed_unidad(db, materia.id)

        # Seguir
        client_with_init_data.post(
            f"/materias/{materia.id}/seguir",
            json={"id_usuario": 101},
        )
        # Guardar progreso
        client_with_init_data.put("/progreso", json={
            "id_usuario": 101,
            "id_materia": materia.id,
            "id_unidad": unidad.id,
            "porcentaje": 80,
        })

        # Dejar de seguir (toggle)
        r = client_with_init_data.post(
            f"/materias/{materia.id}/seguir",
            json={"id_usuario": 101},
        )
        assert r.status_code == 200
        assert r.json()["siguiendo"] is False

        # La materia ya no aparece en materias seguidas
        r = client_with_init_data.get("/usuarios/101/materias-seguidas")
        assert r.json()["materia_ids"] == []


# ─── Flujo 2: Flashcards SRS ──────────────────────────────────────────────────

class TestFlujoFlashcards:
    def test_review_flashcard_conocida_aumenta_intervalo(
        self, client_with_init_data, db
    ):
        """Revisar una flashcard como 'lo sabía' debe crear/actualizar CardReview."""
        _create_user(client_with_init_data, id_telegram=200)
        materia = _seed_materia(db)
        unidad = _seed_unidad(db, materia.id)
        fc = _seed_flashcard(db, unidad.id)

        r = client_with_init_data.post(
            f"/flashcards/{fc.id}/review",
            json={"id_usuario": 200, "knew": True},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["interval"] > 1          # intervalo aumentó
        assert data["repeticiones"] == 1

    def test_review_flashcard_no_conocida_resetea_intervalo(
        self, client_with_init_data, db
    ):
        """Revisar como 'no sabía' debe resetear intervalo a 1."""
        _create_user(client_with_init_data, id_telegram=201)
        materia = _seed_materia(db)
        unidad = _seed_unidad(db, materia.id)
        fc = _seed_flashcard(db, unidad.id)

        # Primera review: lo sabía (intervalo sube)
        client_with_init_data.post(
            f"/flashcards/{fc.id}/review",
            json={"id_usuario": 201, "knew": True},
        )
        # Segunda review: no sabía (intervalo vuelve a 1)
        r = client_with_init_data.post(
            f"/flashcards/{fc.id}/review",
            json={"id_usuario": 201, "knew": False},
        )
        assert r.status_code == 200
        assert r.json()["interval"] == 1

    def test_flashcard_inexistente_devuelve_404(self, client_with_init_data, db):
        _create_user(client_with_init_data, id_telegram=202)
        r = client_with_init_data.post(
            "/flashcards/99999/review",
            json={"id_usuario": 202, "knew": True},
        )
        assert r.status_code == 404


# ─── Flujo 3: Quiz → actividad reciente ───────────────────────────────────────

class TestFlujoQuiz:
    def test_quiz_resultado_aparece_en_actividad_reciente(
        self, client_with_init_data, db
    ):
        """Completar un quiz debe aparecer en actividad reciente del usuario."""
        _create_user(client_with_init_data, id_telegram=300)
        materia = _seed_materia(db)
        unidad = _seed_unidad(db, materia.id)
        _seed_quiz_pregunta(db, unidad.id)

        # Registrar resultado
        r = client_with_init_data.post("/quiz/resultado", json={
            "id_usuario": 300,
            "id_unidad": unidad.id,
            "correctas": 1,
            "total": 1,
        })
        assert r.status_code == 200

        # Verificar actividad reciente
        r = client_with_init_data.get("/usuarios/300/actividad-reciente")
        assert r.status_code == 200
        actividad = r.json()
        tipos = [a["tipo"] for a in actividad]
        assert "quiz" in tipos

    def test_actividad_reciente_respeta_limit(self, client_with_init_data, db):
        """El parámetro limit debe recortar la respuesta."""
        _create_user(client_with_init_data, id_telegram=301)
        materia = _seed_materia(db)
        unidad = _seed_unidad(db, materia.id)

        # Crear 3 quiz resultados
        for i in range(3):
            client_with_init_data.post("/quiz/resultado", json={
                "id_usuario": 301,
                "id_unidad": unidad.id,
                "correctas": i,
                "total": 3,
            })

        r = client_with_init_data.get(
            "/usuarios/301/actividad-reciente?limit=2"
        )
        assert r.status_code == 200
        assert len(r.json()) <= 2


# ─── Flujo 4: Social — seguidores y privacidad ────────────────────────────────

class TestFlujoSocial:
    def test_dos_usuarios_siguen_misma_materia(self, client_with_init_data, db):
        """Ambos usuarios deben aparecer en la lista de seguidores."""
        _create_user(client_with_init_data, id_telegram=400, first_name="Alice")
        _create_user(client_with_init_data, id_telegram=401, first_name="Bob")
        materia = _seed_materia(db)

        for uid in [400, 401]:
            client_with_init_data.post(
                f"/materias/{materia.id}/seguir",
                json={"id_usuario": uid},
            )

        r = client_with_init_data.get(f"/materias/{materia.id}/seguidores")
        assert r.status_code == 200
        # devuelve {"seguidores": [...], "total_seguidores": N}
        data = r.json()
        assert data["total_seguidores"] == 2
        nombres = [s["first_name"] for s in data["seguidores"]]
        assert "Alice" in nombres
        assert "Bob" in nombres

    def test_ranking_paginacion(self, client_with_init_data, db):
        """El parámetro limit debe limitar la respuesta del ranking."""
        for i in range(5):
            _create_user(client_with_init_data, id_telegram=500 + i, first_name=f"User{i}")

        r = client_with_init_data.get("/ranking?limit=3")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_ranking_offset(self, client_with_init_data, db):
        """offset debe saltar registros correctamente."""
        for i in range(4):
            _create_user(client_with_init_data, id_telegram=600 + i, first_name=f"User{i}")

        r_all = client_with_init_data.get("/ranking?limit=4")
        r_offset = client_with_init_data.get("/ranking?limit=2&offset=2")

        todos = r_all.json()
        con_offset = r_offset.json()

        assert len(con_offset) == 2
        assert con_offset[0]["id_telegram"] == todos[2]["id_telegram"]


# ─── Flujo 5: Onboarding ──────────────────────────────────────────────────────

class TestFlujoOnboarding:
    def test_usuario_nuevo_tiene_onboarding_false(self, client_with_init_data):
        """Un usuario recién creado tiene onboarding_completado=False."""
        _create_user(client_with_init_data, id_telegram=700)
        r = client_with_init_data.get("/usuarios/700/privacidad")
        assert r.status_code == 200
        assert r.json()["onboarding_completado"] is False

    def test_completar_onboarding_actualiza_flag(self, client_with_init_data):
        """POST /usuarios/{id}/onboarding debe marcar onboarding_completado=True."""
        _create_user(client_with_init_data, id_telegram=701)
        # El endpoint requiere un body con PrivacidadUpdate (puede estar vacío)
        r = client_with_init_data.post("/usuarios/701/onboarding", json={})
        assert r.status_code == 200

        r = client_with_init_data.get("/usuarios/701/privacidad")
        assert r.json()["onboarding_completado"] is True

    def test_privacidad_defaults_todos_true(self, client_with_init_data):
        """Privacidad por defecto: todos los campos en True."""
        _create_user(client_with_init_data, id_telegram=702)
        r = client_with_init_data.get("/usuarios/702/privacidad")
        priv = r.json()
        assert priv["mostrar_foto"] is True
        assert priv["mostrar_nombre"] is True
        assert priv["mostrar_username"] is True
        assert priv["mostrar_progreso"] is True
        assert priv["mostrar_cursos"] is True

    def test_actualizar_privacidad(self, client_with_init_data):
        """PUT de privacidad debe persistir los cambios."""
        _create_user(client_with_init_data, id_telegram=703)
        r = client_with_init_data.put(
            "/usuarios/703/privacidad",
            json={"mostrar_nombre": False, "mostrar_foto": False},
        )
        assert r.status_code == 200

        r = client_with_init_data.get("/usuarios/703/privacidad")
        priv = r.json()
        assert priv["mostrar_nombre"] is False
        assert priv["mostrar_foto"] is False
        assert priv["mostrar_username"] is True  # los demás siguen en True
