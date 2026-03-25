"""
Generic OpenAI-compatible LLM client with in-memory TTL cache.

Best practices applied:
- Response cache: same user+action within TTL → no API call, 0 tokens
- Short system prompt: maximizes DeepSeek prefix caching (first call pays, rest is cheap)
- Compact JSON context: ~50% fewer tokens vs prose descriptions
- Timeout: 8s hard limit, won't block the user
"""
import os
import time
import logging
import httpx

logger = logging.getLogger("uvicorn.error")

_CONFIGS = {
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-chat",
        "api_key_env": "DEEPSEEK_API_KEY",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
        "api_key_env": "OPENAI_API_KEY",
    },
}

# ── In-memory TTL cache ──────────────────────────────────────────────────────
_cache: dict[str, tuple[str, float]] = {}
_CACHE_MAX_SIZE = 500  # evict oldest when full

_TTL_BY_ACTION = {
    "app_open": 600,           # 10 min — user doesn't reopen constantly
    "idle": 300,               # 5 min — should vary
    "flashcard_complete": 600, # 10 min
    "enter": 300,              # 5 min
    "drop_materia": 120,       # 2 min — more contextual
}
_DEFAULT_TTL = 300


def cache_get(key: str, accion: str) -> str | None:
    if key not in _cache:
        return None
    resp, ts = _cache[key]
    ttl = _TTL_BY_ACTION.get(accion, _DEFAULT_TTL)
    if time.time() - ts < ttl:
        return resp
    del _cache[key]
    return None


def cache_set(key: str, resp: str):
    if len(_cache) >= _CACHE_MAX_SIZE:
        # evict oldest entry
        oldest_key = min(_cache, key=lambda k: _cache[k][1])
        del _cache[oldest_key]
    _cache[key] = (resp, time.time())


# ── LLM call ─────────────────────────────────────────────────────────────────

async def chat_completion_tracked(messages: list[dict], max_tokens: int = 60, timeout: float = 8.0) -> dict:
    """
    Call LLM and return full usage data.
    Returns: {content, model, tokens_in, tokens_out, tokens_cached, latencia_ms}
    """
    provider = os.getenv("LLM_PROVIDER", "deepseek")
    cfg = _CONFIGS.get(provider, _CONFIGS["deepseek"])
    api_key = os.getenv(cfg["api_key_env"], "")

    if not api_key:
        logger.error("[llm] No API key found for provider '%s' (env: %s)", provider, cfg["api_key_env"])
        raise ValueError(f"Missing API key for {provider}")

    url = f"{cfg['base_url']}/chat/completions"
    logger.info("[llm] calling %s model=%s max_tokens=%d", provider, cfg["model"], max_tokens)

    t0 = time.time()
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": cfg["model"],
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.85,
            },
        )
        resp.raise_for_status()
        latencia_ms = int((time.time() - t0) * 1000)
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()
        usage = data.get("usage", {})
        tokens_in = usage.get("prompt_tokens", 0)
        tokens_out = usage.get("completion_tokens", 0)
        tokens_cached = usage.get("prompt_cache_hit_tokens", 0)
        logger.info(
            "[llm] response OK — tokens in=%d out=%d cached=%d latency=%dms",
            tokens_in, tokens_out, tokens_cached, latencia_ms,
        )
        return {
            "content": content,
            "model": cfg["model"],
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "tokens_cached": tokens_cached,
            "latencia_ms": latencia_ms,
        }


async def chat_completion(messages: list[dict], max_tokens: int = 60, timeout: float = 8.0) -> str:
    """Backward-compatible wrapper — returns only the content string."""
    result = await chat_completion_tracked(messages, max_tokens, timeout)
    return result["content"]
