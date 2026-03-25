"""
Token tracking — pricing + fire-and-forget DB logging.

DeepSeek pricing (as of 2025):
  Input:  $0.27 / 1M tokens
  Output: $0.35 / 1M tokens
  Cached: $0.028 / 1M tokens (prefix cache hits — 90% savings)
"""
import logging
from sqlalchemy.orm import Session
import models

logger = logging.getLogger("uvicorn.error")

# ── Pricing per million tokens ────────────────────────────────────────────────
PRICING = {
    "deepseek-chat": {"input": 0.27, "output": 0.35, "cached": 0.028},
    "gpt-4o-mini":   {"input": 0.15, "output": 0.60, "cached": 0.075},
}
_DEFAULT_PRICING = {"input": 0.30, "output": 0.40, "cached": 0.03}


def calc_cost(model: str, tokens_in: int, tokens_out: int, tokens_cached: int = 0) -> float:
    """Calculate USD cost for a single LLM call."""
    p = PRICING.get(model, _DEFAULT_PRICING)
    # Cached tokens are part of tokens_in but charged at cached rate
    billable_input = max(0, tokens_in - tokens_cached)
    cost = (
        billable_input * p["input"] / 1_000_000
        + tokens_out * p["output"] / 1_000_000
        + tokens_cached * p["cached"] / 1_000_000
    )
    return round(cost, 8)


def log_ai_call(
    db: Session,
    user_id: int | None,
    modulo: str,
    accion: str | None,
    modelo: str,
    tokens_in: int,
    tokens_out: int,
    tokens_cached: int,
    latencia_ms: int,
    cache_hit: bool = False,
    error: str | None = None,
):
    """Insert a row into ai_call_log. Fire-and-forget, never raises."""
    try:
        costo = calc_cost(modelo, tokens_in, tokens_out, tokens_cached) if not cache_hit else 0.0
        entry = models.AICallLog(
            id_usuario=user_id,
            modulo=modulo,
            accion=accion,
            modelo=modelo,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            tokens_cached=tokens_cached,
            costo_usd=costo,
            latencia_ms=latencia_ms,
            cache_hit=cache_hit,
            error=error[:200] if error else None,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.warning("[tracker] failed to log: %s", e)
        try:
            db.rollback()
        except Exception:
            pass
