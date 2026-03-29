# TON Connect + NFT Personalization

> **Estado**: Preparado. Pendiente TONAPI_KEY para activar.
> **Prioridad**: Alta (hackathon TON — segunda integración)
> **Para el agente implementador**: Leer este doc completo antes de tocar cualquier archivo.

---

## Visión

Los regalos NFT de Telegram (Cupid Charm, Titanic, etc.) se convierten en la
**identidad visual del estudiante** dentro de DaathApp. Redo los reconoce y los
menciona naturalmente. Es la primera mini app de estudio donde tu colección de
Telegram te da un trato personalizado real.

---

## Concepto: "Tu NFT, tu identidad de estudio"

### Capa visual
- NFT activo aparece como decoración en la tarjeta de perfil pública
- Borde de tarjeta con el color del NFT (basado en traits del metadata)
- Badge de rareza si algún trait tiene < 5% de distribución

### Capa IA (Redo)
- Redo recibe `nft_name` y `nft_collection` en su contexto T1 (~20 tokens extra)
- Puede hacer referencias naturales ocasionales al NFT del usuario
- Las memorias de Redo pueden incluir el NFT como contexto emocional/personal
- **Nunca forzado** — solo cuando sea natural en la conversación

### Capa social
- Toggle `mostrar_nft` en configuración de privacidad (default: `False`)
- Perfil público muestra el NFT solo si el usuario lo activa explícitamente

---

## Arquitectura de seguridad

### Flujo completo

```
[Frontend]
  1. Backend genera nonce aleatorio → lo devuelve al frontend
     GET /wallet/nonce → { nonce: "abc123..." }  (válido 5 minutos, guardado en memoria)

  2. TON Connect abre modal → usuario aprueba en su wallet (Telegram Wallet, TonKeeper, etc.)

  3. Wallet firma y devuelve:
     {
       account: { address, chain, publicKey, walletStateInit },
       proof: { timestamp, domain, signature, payload: "abc123..." }
     }

  4. Frontend envía TODO al backend via POST /wallet/connect
     Headers: X-Telegram-Init-Data (ya verificado por el sistema existente)

[Backend]
  5. require_init_data → identifica id_telegram del usuario autenticado

  6. Verifica ton_proof (en ton_wallet.py):
     a. Chequea que timestamp sea < 5 minutos atrás (anti-replay)
     b. Chequea que payload coincida con el nonce generado en paso 1
     c. Construye el mensaje a verificar:
        msg = sha256(
          "ton-proof-item-v2\0"
          + workchain_bytes           # 4 bytes little-endian
          + address_bytes             # 32 bytes raw
          + timestamp_bytes           # 8 bytes little-endian
          + len(domain)_bytes         # 4 bytes little-endian
          + domain                    # "minestudy.vercel.app"
          + payload                   # el nonce
        )
     d. final = sha256("\xff\xff" + "ton connect\0" + msg)
     e. Verifica firma ed25519(final, signature, public_key)
        → public_key viene de walletStateInit (wallet nueva) o de TonAPI (wallet ya deployada)

  7. Firma válida → guarda wallet_address en DB vinculada al id_telegram del usuario

[Base de datos]
  8. users.wallet_address  — dirección TON en formato user-friendly (EQD...)
  9. users.nft_activo_address — dirección del NFT Item elegido (nullable)
  10. users.mostrar_nft — boolean, default False
  11. nft_cache — tabla separada con metadata cacheada 24h (evita llamadas repetidas a TonAPI)
```

### Reglas de oro
- La `TONAPI_KEY` **nunca** va al frontend — solo en env vars de Railway
- El `ton_proof` se verifica **siempre** en el backend — el frontend no es confiable
- La wallet solo se puede vincular al usuario autenticado por su propio `initData`
- El nonce expira en 5 minutos — los nonces usados se descartan inmediatamente
- El `nft_activo_address` se valida contra TonAPI: confirmar que esa dirección pertenece realmente a la wallet del usuario antes de guardar

---

## Archivos — Estado actual

### Ya preparados (sin necesitar TONAPI_KEY)
```
backend/
  ton_wallet.py                    ✅ Stub con firmas de funciones y TODO
  requirements.txt                 ✅ PyNaCl agregado

frontend/
  public/tonconnect-manifest.json  ✅ Listo para producción
  package.json                     ✅ @tonconnect/ui-react agregado
```

### Pendientes de implementar (necesitan TONAPI_KEY)
```
backend/
  alembic/versions/008_wallet_nft.py  ← Migración DB
  ton_wallet.py                        ← Completar lógica real (TODO → código)
  main.py                              ← 4 endpoints nuevos

frontend/
  src/components/TonConnectButton.jsx  ← Botón conectar + estado
  src/components/NftSelector.jsx       ← Grilla de NFTs
  src/components/NftBadge.jsx          ← Display del NFT en perfil/ranking
  src/screens/Profile.jsx              ← Sección wallet
  src/services/api.js                  ← connectWallet, getNfts, setNftActivo
```

---

## Fase 1 — Backend

### Migración DB (`008_wallet_nft.py`)

Agregar a `models.py`:
```python
class User(Base):
    # ... columnas existentes ...
    wallet_address     = Column(String(100), nullable=True)   # EQD... (user-friendly)
    nft_activo_address = Column(String(100), nullable=True)   # dirección NFT Item
    mostrar_nft        = Column(Boolean, default=False, nullable=False)

class NftCache(Base):
    __tablename__ = "nft_cache"
    address     = Column(String(100), primary_key=True)  # dirección NFT Item
    nombre      = Column(String(200), nullable=False)
    coleccion   = Column(String(200), nullable=True)
    imagen_url  = Column(Text, nullable=True)
    traits      = Column(JSON, nullable=True)             # lista de {trait_type, value, rarity}
    cached_at   = Column(DateTime(timezone=True), server_default=func.now())
```

### Endpoints (`main.py`)

```
GET  /wallet/nonce
     → Genera nonce aleatorio, lo guarda en dict en memoria con TTL 5min
     → { nonce: "abc..." }

POST /wallet/connect
     Auth: require_init_data
     Body: { address, proof: { timestamp, domain, signature, payload, state_init? } }
     → Verifica ton_proof → guarda wallet_address → { ok: true, address }

GET  /usuarios/{id}/nfts
     Auth: require_init_data (solo propio usuario)
     → Consulta TonAPI: GET /v2/accounts/{address}/nfts?limit=100
     → Filtra por Telegram gifts (por keywords en nombre de colección)
     → Cachea en nft_cache por 24h
     → Devuelve lista de { address, nombre, coleccion, imagen_url, traits }

POST /usuarios/{id}/nft-activo
     Auth: require_init_data (solo propio usuario)
     Body: { nft_address: "EQD..." | null }
     → Verifica que nft_address esté en la lista de NFTs del usuario (llama GET /nfts internamente)
     → Guarda en users.nft_activo_address
```

### `ton_wallet.py` (lógica a completar)

```python
# Dependencias:
# - PyNaCl (ed25519 verify) → ya en requirements.txt
# - httpx (llamadas a TonAPI) → ya existe en el proyecto
# - hashlib (SHA256) → stdlib

TONAPI_KEY = os.environ.get("TONAPI_KEY")  # ← necesaria para activar
TONAPI_BASE = "https://tonapi.io"

# Funciones a implementar:
async def verify_ton_proof(address, proof, state_init=None) -> bool: ...
async def get_wallet_public_key(address, state_init=None) -> bytes: ...
async def get_nfts_for_wallet(address) -> list[dict]: ...
async def get_nft_metadata(nft_address) -> dict: ...

TELEGRAM_GIFT_KEYWORDS = [
    "telegram", "gift", "titanic", "cupid", "charm",
    "durov", "collectible", "star", "santa"
]
```

---

## Fase 2 — Frontend

### `tonconnect-manifest.json` (ya creado)
```json
{
  "url": "https://minestudy.vercel.app",
  "name": "DaathApp",
  "iconUrl": "https://minestudy.vercel.app/vite.svg"
}
```

### Setup en `main.jsx`
```jsx
import { TonConnectUIProvider } from '@tonconnect/ui-react';

<TonConnectUIProvider
  manifestUrl="https://minestudy.vercel.app/tonconnect-manifest.json"
  actionsConfiguration={{ twaReturnUrl: 'https://t.me/DaathApp_bot/app' }}
>
  <App />
</TonConnectUIProvider>
```

### Flujo en `Profile.jsx`
1. Sin wallet → botón "Conectar wallet TON"
2. Click → pide nonce al backend → abre TON Connect modal
3. Usuario aprueba en su wallet → proof llega al frontend
4. Frontend envía proof al backend → wallet guardada
5. Con wallet → muestra address truncada + grilla de NFTs
6. Tap en NFT → se guarda como activo (borde iluminado)
7. Toggle `mostrar_nft` en sección de privacidad

---

## Fase 3 — Redo × NFT

**Archivo**: `backend/mascota_ai.py` → en `build_context()`, tier T1

```python
# Agregar en el bloque de contexto T1 (datos del usuario):
if user.nft_activo_address:
    nft = db.query(NftCache).filter_by(address=user.nft_activo_address).first()
    if nft:
        ctx_parts.append(f"NFT activo: {nft.nombre}")
        if nft.coleccion:
            ctx_parts.append(f"colección {nft.coleccion}")
```

**IMPORTANTE**: No modificar las primeras 2 líneas del SYSTEM_PROMPT — están
prefix-cacheadas en DeepSeek. Agregar instrucción NFT al final del prompt existente.

---

## Variables de entorno

### Railway — minestudy service
| Variable | Cómo obtener | Estado |
|---|---|---|
| `TONAPI_KEY` | @tonapi_bot en Telegram → `/get_server_key` | ⏳ Pendiente |

---

## Checklist para cuando llegue la TONAPI_KEY

```
[ ] Agregar TONAPI_KEY en Railway (minestudy → Variables)
[ ] Completar los TODO en backend/ton_wallet.py
[ ] Crear backend/alembic/versions/008_wallet_nft.py
[ ] Agregar wallet_address, nft_activo_address, mostrar_nft a models.py User
[ ] Agregar NftCache a models.py
[ ] Implementar 4 endpoints en main.py
[ ] Implementar TonConnectButton.jsx
[ ] Implementar NftSelector.jsx
[ ] Implementar NftBadge.jsx
[ ] Modificar Profile.jsx
[ ] Modificar main.jsx (TonConnectUIProvider)
[ ] Agregar funciones wallet a api.js
[ ] Modificar mascota_ai.py (tier T1 + system prompt)
[ ] Escribir test_wallet.py (5 tests de seguridad)
[ ] Deploy y probar en Telegram con wallet real
```

---

## Tests de seguridad a escribir

```
backend/test_wallet.py:
  - test_nonce_expires_after_5_minutes
  - test_replayed_nonce_rejected
  - test_invalid_ed25519_signature_rejected
  - test_cannot_link_wallet_of_another_user
  - test_nft_activo_must_belong_to_wallet
  - test_nft_query_requires_linked_wallet
```

---

## Referencias técnicas

- TON Connect proof verification (oficial): https://docs.ton.org/develop/dapps/ton-connect/sign
- TonAPI NFTs endpoint: `GET https://tonapi.io/v2/accounts/{account_id}/nfts`
- @tonconnect/ui-react: https://github.com/ton-connect/sdk/tree/main/packages/ui-react
- Telegram Gift NFTs en blockchain: https://telegram.org/blog/wear-gifts-blockchain-and-more
- TEP-62 (estándar NFT de TON): https://github.com/ton-blockchain/TEPs/blob/master/text/0062-nft-standard.md

---

## Notas críticas para el agente implementador

1. **`mascota_ai.py`**: Leer completo antes de modificar. Tiene sistema de cache y
   tiers de contexto delicado. El prefix-cache de DeepSeek depende de que el
   SYSTEM_PROMPT no cambie entre llamadas.

2. **Patrón de endpoints**: Ver `main.py` alrededor de `/zona-libre/upload` para
   el patrón de autenticación + manejo de errores usado en el proyecto.

3. **Patrón de cliente HTTP**: Ver `backend/ton_storage.py` — usa `httpx.AsyncClient`
   con timeout explícito. Usar el mismo patrón en `ton_wallet.py`.

4. **Privacidad**: El campo `mostrar_nft` sigue el patrón de `mostrar_nombre`,
   `mostrar_progreso`, etc. en `models.py`. Incluirlo en el endpoint de privacidad
   existente (`PUT /usuarios/{id}/privacidad`).

5. **Nunca** guardar `wallet_address` sin verificar el `ton_proof` primero.
   Un usuario malintencionado podría enviar la address de otra persona.
