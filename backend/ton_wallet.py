"""
TON Connect wallet verification + TonAPI NFT client.
"""
import os
import hashlib
import time
import secrets
import struct
import base64
import logging
import httpx
from urllib.parse import quote

logger = logging.getLogger(__name__)

_raw_key = os.environ.get("TONAPI_KEY", "")
TONAPI_KEY = _raw_key.strip().strip('"').strip("'")  # remove accidental quotes/whitespace
TONAPI_BASE = "https://tonapi.io"

if TONAPI_KEY:
    logger.info("[ton_wallet] TONAPI_KEY loaded (%d chars, starts with %s...)", len(TONAPI_KEY), TONAPI_KEY[:8])


def _tonapi_headers() -> dict:
    """Auth headers for TonAPI. Returns empty dict if no key configured."""
    if TONAPI_KEY:
        return {"Authorization": f"Bearer {TONAPI_KEY}"}
    return {}


async def _tonapi_get(client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response:
    """GET with auth. If 401, retry without auth (public endpoint fallback)."""
    headers = kwargs.pop("headers", {})
    headers.update(_tonapi_headers())
    r = await client.get(url, headers=headers, **kwargs)
    if r.status_code == 401 and TONAPI_KEY:
        logger.warning("[tonapi] 401 with key, retrying without auth: %s", url.split("?")[0][-60:])
        headers.pop("Authorization", None)
        r = await client.get(url, headers=headers, **kwargs)
    return r


# Expected domain — must match tonconnect-manifest.json
_EXPECTED_DOMAIN = "minestudy.vercel.app"

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


def _extract_pubkey_from_state_init(state_init_b64: str) -> bytes:
    """
    Minimal BOC parser to extract the 32-byte ed25519 public key from a
    wallet state_init. Supports WalletV3+ where data cell layout is:
    seqno(4 bytes) + subwallet_id(4 bytes) + public_key(32 bytes).
    """
    padded = state_init_b64 + "=" * (-len(state_init_b64) % 4)
    try:
        data = base64.b64decode(padded)
    except Exception:
        data = base64.urlsafe_b64decode(padded)

    MAGIC = 0xB5EE9C72
    if len(data) < 10 or struct.unpack_from(">I", data, 0)[0] != MAGIC:
        raise ValueError("Invalid BOC magic")

    flags = data[4]
    has_idx = (flags >> 7) & 1
    size_bytes = flags & 7   # bytes per cell index / ref
    off_bytes = data[5]      # bytes per offset

    pos = 6
    cells_count = int.from_bytes(data[pos:pos + size_bytes], "big"); pos += size_bytes
    roots_count = int.from_bytes(data[pos:pos + size_bytes], "big"); pos += size_bytes
    pos += size_bytes  # absent_count
    pos += off_bytes   # cells_size

    roots = [
        int.from_bytes(data[pos + i * size_bytes:pos + (i + 1) * size_bytes], "big")
        for i in range(roots_count)
    ]
    pos += roots_count * size_bytes

    if has_idx:
        pos += off_bytes * cells_count

    cells_data = data[pos:]
    cells = []
    cp = 0
    for _ in range(cells_count):
        if cp + 2 > len(cells_data):
            break
        d1 = cells_data[cp]
        d2 = cells_data[cp + 1]
        cp += 2

        ref_count = d1 & 7
        data_len = (d2 >> 1) + (d2 & 1)  # full bytes + optional partial byte

        cell_bytes = bytes(cells_data[cp:cp + data_len])
        cp += data_len

        refs = []
        for _ in range(ref_count):
            ref_idx = int.from_bytes(cells_data[cp:cp + size_bytes], "big")
            cp += size_bytes
            refs.append(ref_idx)

        cells.append({"data": cell_bytes, "refs": refs})

    if not cells:
        raise ValueError("No cells parsed from BOC")

    root_cell = cells[roots[0]]

    # state_init root cell has refs: [code_cell, data_cell]
    if len(root_cell["refs"]) < 2:
        raise ValueError("state_init root cell has fewer than 2 refs")

    data_cell = cells[root_cell["refs"][1]]
    raw = data_cell["data"]

    # WalletV3+: seqno(4) + subwallet_id(4) + public_key(32)
    if len(raw) < 40:
        raise ValueError(f"Data cell too short ({len(raw)} bytes)")

    return raw[8:40]


async def verify_ton_proof(
    address: str,
    proof: dict,
    state_init: str | None = None,
) -> bool:
    """
    Verifies a ton_proof signature from TON Connect.

    address:    raw format "workchain:hash_hex" (e.g. "0:abcdef...")
    proof:      { timestamp, domain: {lengthBytes, value}, signature, payload }
    state_init: optional base64 wallet state init (for undeployed wallets)

    Spec: https://docs.ton.org/develop/dapps/ton-connect/sign
    """
    # 1. Consume nonce — anti-replay
    payload = proof.get("payload", "")
    if not consume_nonce(payload):
        logger.warning("[ton_proof] FAIL step 1: nonce inválido o expirado (payload=%s...)", payload[:16])
        return False

    # 2. Check timestamp (max 5 minutes old)
    ts = int(proof.get("timestamp", 0))
    if time.time() - ts > 300:
        logger.warning("[ton_proof] FAIL step 2: timestamp expirado (ts=%s, age=%ss)", ts, int(time.time() - ts))
        return False

    # 3. Verify domain matches our app
    domain_val = (proof.get("domain") or {}).get("value", "")
    if domain_val != _EXPECTED_DOMAIN:
        logger.warning("[ton_proof] FAIL step 3: domain mismatch (got=%s, expected=%s)", domain_val, _EXPECTED_DOMAIN)
        return False

    # 4. Get public key (TonAPI → state_init fallback)
    try:
        public_key_bytes = await get_wallet_public_key(address, state_init)
        logger.info("[ton_proof] step 4 OK: pubkey=%s...", public_key_bytes.hex()[:16])
    except Exception as e:
        logger.warning("[ton_proof] FAIL step 4: get_wallet_public_key: %s", e)
        return False

    # 5. Parse address "workchain:hash_hex"
    try:
        wc_str, hash_hex = address.split(":", 1)
        workchain = int(wc_str)
        address_hash = bytes.fromhex(hash_hex)
        if len(address_hash) != 32:
            logger.warning("[ton_proof] FAIL step 5: address hash len=%d", len(address_hash))
            return False
    except Exception as e:
        logger.warning("[ton_proof] FAIL step 5: address parse: %s (address=%s)", e, address[:20])
        return False

    # 6. Build message per TON Connect spec:
    #    "ton-proof-item-v2/" || wc(4B BE) || addr(32B) || domain_len(4B LE) || domain || ts(8B LE) || payload
    domain_bytes = domain_val.encode("utf-8")
    message = (
        b"ton-proof-item-v2/" +
        struct.pack(">i", workchain) +          # 4 bytes big-endian signed int
        address_hash +                           # 32 bytes
        struct.pack("<I", len(domain_bytes)) +   # 4 bytes little-endian uint
        domain_bytes +
        struct.pack("<Q", ts) +                  # 8 bytes little-endian uint64
        payload.encode("utf-8")
    )

    msg_hash = hashlib.sha256(message).digest()
    full_message = b"\xff\xff" + b"ton-connect" + msg_hash
    result_hash = hashlib.sha256(full_message).digest()

    # 7. Verify ed25519 signature with PyNaCl
    try:
        sig = base64.b64decode(proof.get("signature", ""))
    except Exception:
        return False

    try:
        from nacl.signing import VerifyKey
        vk = VerifyKey(public_key_bytes)
        vk.verify(result_hash, sig)
        logger.info("[ton_proof] OK: signature verified for %s", address[:20])
        return True
    except Exception as e:
        logger.warning("[ton_proof] FAIL step 7: ed25519 verify: %s", e)
        return False


async def get_wallet_public_key(address: str, state_init: str | None = None) -> bytes:
    """
    Obtiene la public key de una wallet TON.
    Intenta TonAPI primero (wallets deployadas),
    cae en parseo de state_init para wallets nuevas.
    """
    encoded = quote(address, safe="")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await _tonapi_get(client, f"{TONAPI_BASE}/v2/accounts/{encoded}/publickey")
            if r.status_code == 200:
                pk_hex = r.json().get("public_key", "")
                if pk_hex:
                    return bytes.fromhex(pk_hex)
            else:
                logger.warning("[tonapi] publickey %d: %s", r.status_code, r.text[:200])
        except Exception as e:
            logger.warning("[tonapi] publickey exception: %s", e)

    if state_init:
        return _extract_pubkey_from_state_init(state_init)

    raise ValueError(f"No se pudo obtener la clave pública para {address}")


async def get_nfts_for_wallet(address: str) -> list[dict]:
    """
    Consulta TonAPI para obtener TODOS los NFTs de una wallet.
    Pagina si hay más de 256 NFTs. Detecta Telegram gifts sin API calls extra.
    """
    encoded = quote(address, safe="")
    items: list[dict] = []
    PAGE_SIZE = 256

    # Fetch all NFTs with pagination
    async with httpx.AsyncClient(timeout=20.0) as client:
        offset = 0
        while True:
            r = await _tonapi_get(
                client,
                f"{TONAPI_BASE}/v2/accounts/{encoded}/nfts",
                params={"limit": PAGE_SIZE, "offset": offset, "indirect_ownership": "false"},
            )
            if r.status_code != 200:
                logger.error("[tonapi] nfts %d: %s", r.status_code, r.text[:300])
                r.raise_for_status()
            page = r.json().get("nft_items", [])
            items.extend(page)
            if len(page) < PAGE_SIZE:
                break
            offset += PAGE_SIZE

    logger.info("[nfts] fetched %d total NFTs for %s", len(items), address[:20])

    result = []
    for item in items:
        meta = item.get("metadata") or {}
        collection = item.get("collection") or {}
        # Use preview image (500x500) if available, fallback to metadata image
        previews = item.get("previews") or []
        imagen = ""
        for p in previews:
            if p.get("resolution") == "500x500":
                imagen = p.get("url", "")
                break
        if not imagen:
            imagen = meta.get("image", "")
        traits = [
            {
                "trait_type": attr.get("trait_type", ""),
                "value": attr.get("value", ""),
                "rarity": attr.get("rarity"),
            }
            for attr in meta.get("attributes", [])
        ]
        is_gift = _is_telegram_gift_fast(item)
        result.append({
            "address": item.get("address", ""),
            "nombre": meta.get("name", "") or collection.get("name", ""),
            "coleccion": collection.get("name", ""),
            "imagen_url": imagen,
            "traits": traits,
            "is_telegram_gift": is_gift,
        })

    gift_count = sum(1 for r in result if r["is_telegram_gift"])
    logger.info("[nfts] result: %d total, %d gifts, %d other", len(result), gift_count, len(result) - gift_count)
    return result


async def get_nft_metadata(nft_address: str) -> dict:
    """
    Obtiene metadata de un NFT específico vía TonAPI.
    Endpoint: GET https://tonapi.io/v2/nfts/{address}
    """
    encoded = quote(nft_address, safe="")
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await _tonapi_get(
            client,
            f"{TONAPI_BASE}/v2/nfts/{encoded}",
        )
        r.raise_for_status()
        item = r.json()

    meta = item.get("metadata") or {}
    collection = item.get("collection") or {}
    traits = [
        {
            "trait_type": attr.get("trait_type", ""),
            "value": attr.get("value", ""),
            "rarity": attr.get("rarity"),
        }
        for attr in meta.get("attributes", [])
    ]
    return {
        "address": item.get("address", ""),
        "nombre": meta.get("name", ""),
        "coleccion": collection.get("name", ""),
        "imagen_url": meta.get("image", ""),
        "traits": traits,
    }


def _is_telegram_gift_fast(nft_item: dict) -> bool:
    """
    Detects Telegram gifts using data already in the NFT item response.
    No extra API calls needed. Checks:
    1. metadata.image contains nft.fragment.com (most reliable)
    2. metadata.external_url/external_link contains fragment.com/gifts/
    3. Collection description mentions Telegram gifts
    """
    meta = nft_item.get("metadata") or {}
    collection = nft_item.get("collection") or {}

    # Check NFT image URL — all Telegram gifts use nft.fragment.com
    image = (meta.get("image") or "").lower()
    if "nft.fragment.com" in image:
        return True

    # Check external links
    for field in ("external_url", "external_link"):
        link = (meta.get(field) or "").lower()
        if "fragment.com" in link:
            return True

    # Check collection description (sometimes embedded in NFT item)
    col_desc = (collection.get("description") or "").lower()
    if "telegram" in col_desc and "nft collection" in col_desc:
        return True

    return False
