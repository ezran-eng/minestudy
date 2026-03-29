"""
TON Connect wallet verification + TonAPI NFT client.

Estado: STUB — funciones definidas pero no implementadas.
Completar cuando TONAPI_KEY esté disponible en variables de entorno.

Ver TON_CONNECT.md para arquitectura completa y checklist de implementación.
"""
import os
import hashlib
import time
import secrets
import httpx

TONAPI_KEY = os.environ.get("TONAPI_KEY")  # ← requerido para activar
TONAPI_BASE = "https://tonapi.io"

# Colecciones/keywords de Telegram gifts para filtrar NFTs del usuario
TELEGRAM_GIFT_KEYWORDS = [
    "telegram", "gift", "titanic", "cupid", "charm",
    "durov", "collectible", "star", "santa",
]

# Nonces activos: { nonce: expiry_timestamp }
# En producción con múltiples workers, migrar a Redis o tabla DB.
_active_nonces: dict[str, float] = {}
_NONCE_TTL = 300  # 5 minutos


def generate_nonce() -> str:
    """Genera un nonce aleatorio de 32 bytes hex. Válido por 5 minutos."""
    nonce = secrets.token_hex(32)
    _active_nonces[nonce] = time.time() + _NONCE_TTL
    _cleanup_nonces()
    return nonce


def consume_nonce(nonce: str) -> bool:
    """
    Verifica que el nonce exista y no haya expirado.
    Lo consume (elimina) para prevenir replay attacks.
    Retorna True si válido, False si inválido o expirado.
    """
    _cleanup_nonces()
    if nonce not in _active_nonces:
        return False
    if time.time() > _active_nonces[nonce]:
        del _active_nonces[nonce]
        return False
    del _active_nonces[nonce]
    return True


def _cleanup_nonces():
    """Elimina nonces expirados del dict en memoria."""
    now = time.time()
    expired = [k for k, exp in _active_nonces.items() if now > exp]
    for k in expired:
        del _active_nonces[k]


async def verify_ton_proof(
    address: str,
    proof: dict,
    state_init: str | None = None,
) -> bool:
    """
    Verifica la firma ton_proof generada por TON Connect.

    Spec oficial: https://docs.ton.org/develop/dapps/ton-connect/sign

    TODO: Implementar cuando TONAPI_KEY esté disponible.
    Pasos:
      1. consume_nonce(proof["payload"]) → False si inválido
      2. Verificar proof["timestamp"] < 5 min atrás
      3. Obtener public_key via get_wallet_public_key(address, state_init)
      4. Construir mensaje y verificar firma ed25519 con PyNaCl
    """
    if not TONAPI_KEY:
        raise RuntimeError("TONAPI_KEY no configurada — TON Connect no disponible")
    # TODO: implementar
    raise NotImplementedError("ton_wallet.verify_ton_proof: pendiente de implementación")


async def get_wallet_public_key(address: str, state_init: str | None = None) -> bytes:
    """
    Obtiene la public key de una wallet TON.
    - Si state_init está presente (wallet nueva/no deployada): parsear del state_init
    - Si no: consultar TonAPI GET /v2/accounts/{address}/publickey

    TODO: Implementar cuando TONAPI_KEY esté disponible.
    """
    # TODO: implementar
    raise NotImplementedError("ton_wallet.get_wallet_public_key: pendiente de implementación")


async def get_nfts_for_wallet(address: str) -> list[dict]:
    """
    Consulta TonAPI para obtener los NFTs de una wallet.
    Filtra solo Telegram gifts por keywords en el nombre de la colección.

    Endpoint: GET https://tonapi.io/v2/accounts/{address}/nfts?limit=100

    Retorna lista de:
    {
        "address": "EQD...",
        "nombre": "Cupid Charm #5.004",
        "coleccion": "Titanic",
        "imagen_url": "https://...",
        "traits": [{"trait_type": "Modelo", "value": "Titanic", "rarity": 1.5}]
    }

    TODO: Implementar cuando TONAPI_KEY esté disponible.
    """
    if not TONAPI_KEY:
        raise RuntimeError("TONAPI_KEY no configurada")
    # TODO: implementar
    raise NotImplementedError("ton_wallet.get_nfts_for_wallet: pendiente de implementación")


async def get_nft_metadata(nft_address: str) -> dict:
    """
    Obtiene metadata de un NFT específico.
    Endpoint: GET https://tonapi.io/v2/nfts/{address}

    TODO: Implementar cuando TONAPI_KEY esté disponible.
    """
    if not TONAPI_KEY:
        raise RuntimeError("TONAPI_KEY no configurada")
    # TODO: implementar
    raise NotImplementedError("ton_wallet.get_nft_metadata: pendiente de implementación")


def is_telegram_gift(nft_item: dict) -> bool:
    """
    Determina si un NFT es un Telegram gift basándose en keywords.
    Usar sobre el resultado raw de TonAPI (campo collection.name o metadata.name).
    """
    text = " ".join([
        (nft_item.get("collection") or {}).get("name", ""),
        (nft_item.get("metadata") or {}).get("name", ""),
    ]).lower()
    return any(kw in text for kw in TELEGRAM_GIFT_KEYWORDS)
