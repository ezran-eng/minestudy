"""Tests for materias, unidades and ranking endpoints."""
from unittest.mock import patch
import models


def _seed_materia(db, nombre="Geología", orden=1):
    materia = models.Materia(nombre=nombre, emoji="⛏️", color="#FF5500", orden=orden)
    db.add(materia)
    db.commit()
    db.refresh(materia)
    return materia


def _seed_user(db, id_telegram=111222333, first_name="Jose"):
    user = models.User(id_telegram=id_telegram, first_name=first_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestGetMaterias:
    def test_returns_empty_list_when_no_materias(self, client):
        response = client.get("/materias")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_materias_sorted_by_orden(self, client, db):
        _seed_materia(db, "Física", orden=2)
        _seed_materia(db, "Geología", orden=1)
        response = client.get("/materias")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["nombre"] == "Geología"
        assert data[1]["nombre"] == "Física"

    def test_materia_includes_unidades_list(self, client, db):
        materia = _seed_materia(db)
        db.add(models.Unidad(id_materia=materia.id, nombre="Unidad 1", orden=1))
        db.commit()
        response = client.get("/materias")
        assert response.status_code == 200
        unidades = response.json()[0]["unidades"]
        assert len(unidades) == 1
        assert unidades[0]["nombre"] == "Unidad 1"


class TestAdminMateriaEndpoints:
    def test_put_materia_without_admin_token_returns_403(self, client, db):
        materia = _seed_materia(db)
        response = client.put(f"/materias/{materia.id}", json={"nombre": "Nueva"})
        assert response.status_code == 403

    def test_put_materia_with_admin_token_updates(self, client_admin, db):
        materia = _seed_materia(db)
        response = client_admin.put(f"/materias/{materia.id}", json={"nombre": "Actualizada"})
        assert response.status_code == 200
        assert response.json()["nombre"] == "Actualizada"

    def test_put_materia_not_found_returns_404(self, client_admin):
        response = client_admin.put("/materias/99999", json={"nombre": "X"})
        assert response.status_code == 404

    def test_delete_materia_without_admin_token_returns_403(self, client, db):
        materia = _seed_materia(db)
        response = client.delete(f"/materias/{materia.id}")
        assert response.status_code == 403

    def test_delete_materia_with_admin_token(self, client_admin, db):
        materia = _seed_materia(db)
        response = client_admin.delete(f"/materias/{materia.id}")
        assert response.status_code == 204

    def test_delete_materia_not_found_returns_404(self, client_admin):
        response = client_admin.delete("/materias/99999")
        assert response.status_code == 404


class TestRanking:
    def test_ranking_empty_when_no_users(self, client):
        response = client.get("/ranking")
        assert response.status_code == 200
        assert response.json() == []

    def test_ranking_returns_users(self, client, db):
        _seed_user(db, id_telegram=111, first_name="Alice")
        _seed_user(db, id_telegram=222, first_name="Bob")
        response = client.get("/ranking")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        names = {u["first_name"] for u in data}
        assert names == {"Alice", "Bob"}

    def test_ranking_ordered_by_progress_desc(self, client, db):
        alice = _seed_user(db, id_telegram=111, first_name="Alice")
        bob = _seed_user(db, id_telegram=222, first_name="Bob")
        materia = _seed_materia(db)
        unidad = models.Unidad(id_materia=materia.id, nombre="U1", orden=1)
        db.add(unidad)
        db.commit()
        db.refresh(unidad)

        db.add(models.Progreso(id_usuario=alice.id_telegram, id_materia=materia.id, id_unidad=unidad.id, porcentaje=80))
        db.add(models.Progreso(id_usuario=bob.id_telegram, id_materia=materia.id, id_unidad=unidad.id, porcentaje=30))
        db.commit()

        response = client.get("/ranking")
        assert response.status_code == 200
        data = response.json()
        assert data[0]["first_name"] == "Alice"
        assert data[1]["first_name"] == "Bob"


class TestProgreso:
    def test_update_progress_requires_init_data(self, client):
        response = client.put(
            "/progreso",
            json={"id_usuario": 111, "id_materia": 1, "id_unidad": 1, "porcentaje": 50},
        )
        assert response.status_code == 403

    def test_update_progress_creates_record(self, client_with_init_data, db):
        user = _seed_user(db, id_telegram=111)
        materia = _seed_materia(db)
        unidad = models.Unidad(id_materia=materia.id, nombre="U1", orden=1)
        db.add(unidad)
        db.commit()
        db.refresh(unidad)

        response = client_with_init_data.put(
            "/progreso",
            json={
                "id_usuario": user.id_telegram,
                "id_materia": materia.id,
                "id_unidad": unidad.id,
                "porcentaje": 75,
            },
        )
        assert response.status_code == 200
        assert response.json()["porcentaje"] == 75

    def test_update_progress_updates_existing(self, client_with_init_data, db):
        user = _seed_user(db, id_telegram=111)
        materia = _seed_materia(db)
        unidad = models.Unidad(id_materia=materia.id, nombre="U1", orden=1)
        db.add(unidad)
        db.commit()
        db.refresh(unidad)

        payload = {
            "id_usuario": user.id_telegram,
            "id_materia": materia.id,
            "id_unidad": unidad.id,
            "porcentaje": 50,
        }
        client_with_init_data.put("/progreso", json=payload)
        payload["porcentaje"] = 100
        response = client_with_init_data.put("/progreso", json=payload)
        assert response.status_code == 200
        assert response.json()["porcentaje"] == 100

    def test_update_progress_user_not_found_returns_404(self, client_with_init_data):
        response = client_with_init_data.put(
            "/progreso",
            json={"id_usuario": 999999, "id_materia": 1, "id_unidad": 1, "porcentaje": 50},
        )
        assert response.status_code == 404
