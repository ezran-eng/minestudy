# TON Connect + NFT Personalization — Plan completo

> **Estado**: Planificado. No implementado aún.
> **Prioridad**: Alta (hackathon TON)
> **Agente responsable**: Leer este doc completo antes de tocar cualquier archivo.

---

## Visión

Los regalos NFT de Telegram (Cupid Charm, Titanic, etc.) se convierten en la **identidad visual del estudiante** dentro de DaathApp. Redo, la IA, los reconoce y los menciona naturalmente en sus mensajes. Es la primera mini app de estudio donde tu colección de Telegram te da un trato personalizado real.

---

## Concepto innovador: "Tu NFT, tu identidad de estudio"

### Capa visual
- El NFT del usuario aparece como **decoración de su tarjeta de perfil pública**
- En el ranking, en vez de solo el avatar de Telegram, se ve el NFT al lado
- Borde de tarjeta con el color dominante del NFT (extraído del metadata de traits)
- Badge especial si el NFT tiene rareza < 5% en algún trait

### Capa IA (Redo)
- Redo recibe en su contexto: `nft_name`, `nft_collection`, `nft_rarity` del NFT activo del usuario
- Redo puede hacer referencias naturales: *"para alguien con un Cupid Charm Titanic, la precisión importa"*
- Redo celebra milestones con referencia al NFT: *"tu 🔑 Cupid Charm ya se ganó el 100% en Geología"*
- Las observaciones de memoria de Redo pueden incluir el NFT como contexto emocional

### Capa social
- Perfil público muestra el NFT si el usuario lo activa
- Respeta el toggle de privacidad existente (`mostrar_nombre`, etc.) — agregar `mostrar_nft`

---

## Arquitectura de seguridad

```
[Frontend]
  1. Usuario toca "Conectar wallet"
  2. TON Connect abre modal → usuario aprueba en su wallet
  3. Wallet devuelve: { address, proof: { timestamp, domain, signature, payload } }
  4. Frontend envía proof al backend (junto con initData ya verificado)

[Backend]
  5. Verifica initData (Telegram) → identifica id_telegram
  6. Verifica ton_proof:
     a. Construye el mensaje: "ton-proof-item-v2/" + domain + timestamp + address + payload
     b. Hashea con SHA256
     c. Prefija con 0xffff + "ton connect" + hash → segundo SHA256
     d. Verifica firma ed25519 con la public_key de la wallet (obtenida de TonAPI)
  7. Si válido → guarda wallet_address en DB vinculada al id_telegram
  8. Consulta TonAPI con esa address → devuelve NFTs

[Base de datos]
  9. wallet_address almacenada en tabla users
  10. nft_activo_address (dirección del NFT seleccionado) en tabla users
  11. Cache de metadata NFT en tabla separada (para no consultar TonAPI en cada request)
```

**Reglas de oro:**
- La API key de TonAPI NUNCA va al frontend — solo en env var de Railway
- El ton_proof se verifica SIEMPRE en el backend — nunca confiar en el frontend
- La wallet solo se puede vincular al usuario autenticado por initData (no a otro)

---

## Implementación — Fases

### Fase 1: Backend — Wallet + NFTs
**Archivos a modificar/crear:**

```
backend/
  alembic/versions/004_wallet_nft.py   ← NUEVO: migración DB
  ton_wallet.py                         ← NUEVO: verificación ton_proof + TonAPI client
  main.py                               ← MODIFICAR: 3 endpoints nuevos
```

**Migración DB (004_wallet_nft.py):**
```sql
ALTER TABLE users ADD COLUMN wallet_address VARCHAR(66);
ALTER TABLE users ADD COLUMN nft_activo_address VARCHAR(66);
ALTER TABLE users ADD COLUMN mostrar_nft BOOLEAN DEFAULT FALSE;

CREATE TABLE nft_cache (
  address VARCHAR(66) PRIMARY KEY,
  nombre VARCHAR(200),
  coleccion VARCHAR(200),
  imagen_url TEXT,
  traits JSONB,
  cached_at TIMESTAMP DEFAULT NOW()
);
```

**Endpoints nuevos en main.py:**

```
POST /wallet/connect
  Body: { ton_proof: { address, proof: {...} } }
  Auth: require_init_data
  → Verifica proof → guarda wallet_address → devuelve { ok, address }

GET /usuarios/{id}/nfts
  Auth: require_init_data (solo el propio usuario)
  → Consulta TonAPI con wallet_address guardada
  → Filtra por colecciones de Telegram gifts
  → Devuelve lista de NFTs con imagen y traits

POST /usuarios/{id}/nft-activo
  Body: { nft_address: "EQD..." | null }
  Auth: require_init_data (solo el propio usuario)
  → Guarda el NFT elegido como activo
  → Verifica que la address pertenezca realmente a la wallet del usuario
```

**ton_wallet.py:**
```python
# Verificación ton_proof (ed25519 + SHA256)
# Cliente TonAPI para consultar NFTs
# Filtro de colecciones Telegram gifts conocidas
# Cache de metadata en tabla nft_cache (TTL 24h)
```

**Variables de entorno a agregar en Railway (minestudy):**
```
TONAPI_KEY=...       # obtenida gratis via @tonapi_bot en Telegram
```

---

### Fase 2: Frontend — Conectar wallet + elegir NFT
**Archivos a modificar/crear:**

```
frontend/
  src/
    components/
      TonConnectButton.jsx    ← NUEVO: botón conectar + estado
      NftSelector.jsx         ← NUEVO: grilla de NFTs para elegir
      NftBadge.jsx            ← NUEVO: display del NFT activo (perfil/ranking)
    screens/
      Profile.jsx             ← MODIFICAR: sección wallet + NFT activo
    services/
      api.js                  ← MODIFICAR: connectWallet, getNfts, setNftActivo
  public/
    tonconnect-manifest.json  ← NUEVO (obligatorio para TON Connect)
```

**tonconnect-manifest.json:**
```json
{
  "url": "https://minestudy.vercel.app",
  "name": "DaathApp",
  "iconUrl": "https://minestudy.vercel.app/icon-192.png"
}
```

**Packages a instalar:**
```bash
npm install @tonconnect/ui-react
```

**Flujo en Profile.jsx:**
1. Si no tiene wallet → botón "Conectar wallet TON"
2. Al conectar → TON Connect modal → proof va al backend → se guarda
3. Si tiene wallet → muestra "chainoracle.ton" (o address truncada) + sus NFTs
4. Grilla de NFTs → toca uno → queda como activo con borde iluminado
5. Toggle "Mostrar en mi perfil" (respeta sistema de privacidad existente)

---

### Fase 3: IA — Redo conoce tu NFT
**Archivos a modificar:**

```
backend/
  mascota_ai.py    ← MODIFICAR: agregar nft al context tier T1
  main.py          ← MODIFICAR: pasar nft_data al build_context
```

**Cambio en mascota_ai.py — Context Tier T1:**
```python
# Si el usuario tiene nft_activo, agregar al contexto:
if nft_data:
    ctx += f"NFT activo: {nft_data['nombre']} ({nft_data['coleccion']})"
    if nft_data.get('rarity_score'):
        ctx += f" rareza {nft_data['rarity_score']}%"
```

**Cambio en SYSTEM_PROMPT:**
```
Añadir: "Si el usuario tiene NFT activo, podés mencionarlo con naturalidad
una vez cada tanto. Nunca forzarlo."
```

**Token cost estimado:** ~20 tokens extra por llamada cuando hay NFT activo. Prefixcacheable.

---

## Colecciones de Telegram Gifts conocidas

Para filtrar solo NFTs de Telegram (no cualquier NFT del usuario):

```python
TELEGRAM_GIFT_COLLECTIONS = [
    # Agregar addresses de colecciones a medida que se descubren via TonAPI
    # Filtrar por: collection.name contiene keywords conocidos
]

TELEGRAM_GIFT_KEYWORDS = [
    "telegram", "gift", "titanic", "cupid", "charm",
    "durov", "collectible", "star"
]
```

TonAPI devuelve el nombre de la colección — filtrar por keywords es más robusto
que hardcodear addresses (nuevas colecciones aparecen seguido).

---

## Orden de implementación sugerido

```
1. Fase 1 completa (backend) → testear endpoints con curl
2. tonconnect-manifest.json → deployar a Vercel
3. Fase 2 completa (frontend) → testear en Telegram
4. Fase 3 (Redo × NFT) → testear mensajes de Redo
```

No implementar las 3 fases en paralelo — la 2 depende de la 1, la 3 depende de la 1.

---

## Tests a escribir

```
backend/test_wallet.py:
  - test_valid_ton_proof_accepted
  - test_invalid_signature_rejected
  - test_cannot_link_wallet_to_another_user
  - test_nft_list_requires_linked_wallet
  - test_nft_activo_must_belong_to_wallet
```

---

## Referencias

- TON Connect SDK: https://github.com/ton-connect/sdk
- ton_proof verification: https://docs.ton.org/develop/dapps/ton-connect/sign
- TonAPI NFTs: https://tonapi.io/api-v2#operations-NFT-getNftItemsByOwner
- Telegram Gift NFTs: https://telegram.org/blog/wear-gifts-blockchain-and-more
- Colecciones en GetGems: https://getgems.io/gifts-collection

---

## Notas para el agente implementador

1. **Leer** `backend/mascota_ai.py` completo antes de modificarlo — tiene un sistema
   de cache y context tiers delicado, no romper el prefix-cache de DeepSeek.
2. **Leer** `backend/main.py` líneas 2160-2300 para entender el patrón de endpoints.
3. **Leer** `backend/ton_storage.py` para ver el patrón de cliente HTTP usado.
4. El sistema de privacidad existente está en `models.User` — agregar `mostrar_nft`
   siguiendo el mismo patrón que `mostrar_nombre`, `mostrar_progreso`, etc.
5. Los tests de seguridad existentes están en `backend/test_security.py` — seguir
   el mismo patrón con HMAC-signed initData real.
6. **NO** modificar el SYSTEM_PROMPT de Redo en las primeras 2 líneas — están
   prefix-cacheadas en DeepSeek y cambiarlas invalida el cache.
