import httpx
import os
import uuid

TONUTILS_URL = os.environ.get("TONUTILS_URL", "http://localhost:8192")
_LOGIN = os.environ.get("TONUTILS_LOGIN")
_PASSWORD = os.environ.get("TONUTILS_PASSWORD")
_AUTH = (_LOGIN, _PASSWORD) if _LOGIN and _PASSWORD else None

TON_FILES_DIR = "/tmp/ton-files"


async def upload_to_ton(file_bytes: bytes, filename: str) -> str:
    """Saves file to local disk and creates a TON Storage bag. Returns Bag ID."""
    os.makedirs(TON_FILES_DIR, exist_ok=True)

    # tonutils /api/v1/create expects a directory path on the local filesystem
    temp_dir = os.path.join(TON_FILES_DIR, f"tmp_{uuid.uuid4()}")
    os.makedirs(temp_dir)

    with open(os.path.join(temp_dir, filename), "wb") as f:
        f.write(file_bytes)

    async with httpx.AsyncClient(timeout=60.0, auth=_AUTH) as client:
        response = await client.post(
            f"{TONUTILS_URL}/api/v1/create",
            json={"path": temp_dir, "description": filename},
        )
        response.raise_for_status()
        bag_id = response.json()["bag_id"]

    # Rename temp dir to bag_id for retrieval on download
    final_dir = os.path.join(TON_FILES_DIR, bag_id)
    os.rename(temp_dir, final_dir)

    return bag_id


def get_local_file_path(bag_id: str) -> str | None:
    """Returns the local file path for a bag_id if the file is still on disk."""
    bag_dir = os.path.join(TON_FILES_DIR, bag_id)
    if os.path.isdir(bag_dir):
        files = [f for f in os.listdir(bag_dir) if os.path.isfile(os.path.join(bag_dir, f))]
        if files:
            return os.path.join(bag_dir, files[0])
    return None
