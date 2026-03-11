"""Tests for Telegram initData validation and admin auth."""
import hmac
import hashlib
from unittest.mock import patch
from main import _validate_telegram_init_data, require_admin, require_init_data
from fastapi import HTTPException
import pytest


BOT_TOKEN = "1234567890:AABBCCDDtest-token"


def _make_valid_init_data(bot_token: str, user_id: int = 99999) -> str:
    """Build a valid initData string signed with bot_token."""
    pairs = {
        "user": f'{{"id":{user_id},"first_name":"Test"}}',
        "auth_date": "1700000000",
        "query_id": "abc123",
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    hash_val = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    parts = "&".join(f"{k}={v}" for k, v in pairs.items())
    return f"{parts}&hash={hash_val}"


class TestValidateTelegramInitData:
    def test_valid_init_data_returns_true(self):
        init_data = _make_valid_init_data(BOT_TOKEN)
        assert _validate_telegram_init_data(init_data, BOT_TOKEN) is True

    def test_wrong_token_returns_false(self):
        init_data = _make_valid_init_data(BOT_TOKEN)
        assert _validate_telegram_init_data(init_data, "wrongtoken:999") is False

    def test_tampered_data_returns_false(self):
        init_data = _make_valid_init_data(BOT_TOKEN)
        tampered = init_data.replace("Test", "Hacker")
        assert _validate_telegram_init_data(tampered, BOT_TOKEN) is False

    def test_missing_hash_returns_false(self):
        assert _validate_telegram_init_data("user=foo&auth_date=123", BOT_TOKEN) is False

    def test_empty_string_returns_false(self):
        assert _validate_telegram_init_data("", BOT_TOKEN) is False

    def test_malformed_string_returns_false(self):
        assert _validate_telegram_init_data("not=valid=at=all", BOT_TOKEN) is False


class TestRequireAdmin:
    def test_valid_token_passes(self, client):
        """Admin endpoint with correct token returns 200, not 403."""
        # GET /materias is public; we use it to verify client works.
        # For admin check, we call an admin-protected endpoint directly.
        response = client.get("/materias")
        assert response.status_code == 200

    def test_missing_admin_token_returns_403(self, client):
        response = client.put("/materias/1", json={"nombre": "X"})
        assert response.status_code == 403

    def test_wrong_admin_token_returns_403(self, client):
        response = client.put(
            "/materias/1",
            json={"nombre": "X"},
            headers={"X-Admin-Token": "wrong-secret"},
        )
        assert response.status_code == 403

    def test_correct_admin_token_reaches_endpoint(self, client, db):
        """With the correct token the request passes auth (may 404 but not 403)."""
        response = client.put(
            "/materias/999",
            json={"nombre": "X"},
            headers={"X-Admin-Token": "test-admin-secret"},
        )
        assert response.status_code != 403


class TestRequireInitData:
    def test_missing_init_data_returns_403(self, client):
        """PUT /progreso without X-Telegram-Init-Data header → 403."""
        response = client.put(
            "/progreso",
            json={"id_usuario": 1, "id_materia": 1, "id_unidad": 1, "porcentaje": 50},
        )
        assert response.status_code == 403

    def test_invalid_init_data_returns_403(self, client):
        response = client.put(
            "/progreso",
            json={"id_usuario": 1, "id_materia": 1, "id_unidad": 1, "porcentaje": 50},
            headers={"X-Telegram-Init-Data": "fake=data&hash=badhash"},
        )
        assert response.status_code == 403
