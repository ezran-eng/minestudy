"""Tests for user endpoints: POST /users, GET /users/{id}."""
from unittest.mock import patch
import models


USER_PAYLOAD = {
    "id_telegram": 111222333,
    "first_name": "Jose",
    "last_name": "Ezran",
    "username": "ezran_eng",
    "foto_url": "https://t.me/photo.jpg",
}


class TestCreateOrUpdateUser:
    def test_create_new_user(self, client):
        with patch("main._get_telegram_bio", return_value=None):
            response = client.post("/users", json=USER_PAYLOAD)
        assert response.status_code == 200
        data = response.json()
        assert data["id_telegram"] == USER_PAYLOAD["id_telegram"]
        assert data["first_name"] == "Jose"
        assert data["username"] == "ezran_eng"

    def test_update_existing_user(self, client):
        with patch("main._get_telegram_bio", return_value=None):
            client.post("/users", json=USER_PAYLOAD)
            updated = {**USER_PAYLOAD, "first_name": "Josefina"}
            response = client.post("/users", json=updated)
        assert response.status_code == 200
        assert response.json()["first_name"] == "Josefina"

    def test_create_user_sets_bio_when_available(self, client):
        with patch("main._get_telegram_bio", return_value="Estudiante de minas"):
            response = client.post("/users", json=USER_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["descripcion"] == "Estudiante de minas"

    def test_create_user_bio_unavailable_keeps_existing(self, client, db):
        """When bio call fails (_BIO_UNAVAILABLE sentinel), descripcion is untouched."""
        from main import _BIO_UNAVAILABLE
        with patch("main._get_telegram_bio", return_value=_BIO_UNAVAILABLE):
            response = client.post("/users", json=USER_PAYLOAD)
        assert response.status_code == 200

    def test_create_user_minimal_fields(self, client):
        payload = {"id_telegram": 999888777, "first_name": "Minimal"}
        with patch("main._get_telegram_bio", return_value=None):
            response = client.post("/users", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["last_name"] is None
        assert data["username"] is None

    def test_racha_defaults_to_zero(self, client):
        with patch("main._get_telegram_bio", return_value=None):
            response = client.post("/users", json=USER_PAYLOAD)
        assert response.json()["racha"] == 0


class TestGetUserProfile:
    def _create_user(self, client):
        with patch("main._get_telegram_bio", return_value=None):
            client.post("/users", json=USER_PAYLOAD)

    def test_get_existing_user(self, client):
        self._create_user(client)
        response = client.get(f"/users/{USER_PAYLOAD['id_telegram']}")
        assert response.status_code == 200
        assert response.json()["id_telegram"] == USER_PAYLOAD["id_telegram"]

    def test_get_nonexistent_user_returns_404(self, client):
        response = client.get("/users/999999999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
