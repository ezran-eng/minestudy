import httpx
import os

TONUTILS_URL = os.environ.get("TONUTILS_URL", "http://localhost:8090")
_LOGIN = os.environ.get("TONUTILS_LOGIN")
_PASSWORD = os.environ.get("TONUTILS_PASSWORD")
_AUTH = (_LOGIN, _PASSWORD) if _LOGIN and _PASSWORD else None


async def upload_to_ton(file_bytes: bytes, filename: str) -> str:
    """Sube un archivo a TON Storage y retorna el Bag ID."""
    async with httpx.AsyncClient(timeout=60.0, auth=_AUTH) as client:
        response = await client.post(
            f"{TONUTILS_URL}/api/v1/add",
            files={"file": (filename, file_bytes)},
        )
        response.raise_for_status()
        return response.json()["bag_id"]


async def get_download_url(bag_id: str) -> str:
    """Retorna la URL de descarga para un Bag ID."""
    return f"{TONUTILS_URL}/api/v1/download/{bag_id}"
