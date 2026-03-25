"""
AI quota system — per-user daily call limits and monthly cost caps.

Default limits:
  - 50 AI calls per day
  - $0.10 USD per month
  - Admin can override per user via UserAIBudget table
"""
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

import models

logger = logging.getLogger("uvicorn.error")

DEFAULT_DAILY_CALLS = 50
DEFAULT_MONTHLY_USD = 0.10


def check_quota(user_id: int, db: Session) -> tuple[bool, str | None]:
    """
    Check if user is within their AI budget.
    Returns (allowed: bool, reason: str | None).
    If not allowed, reason explains why.
    """
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Load custom budget or use defaults
    budget = db.query(models.UserAIBudget).filter(
        models.UserAIBudget.id_usuario == user_id
    ).first()

    if budget and budget.is_blocked:
        return False, "blocked"

    daily_limit = budget.daily_limit_calls if budget else DEFAULT_DAILY_CALLS
    monthly_limit = budget.monthly_limit_usd if budget else DEFAULT_MONTHLY_USD

    # Count today's calls (exclude cache hits — they cost nothing)
    today_calls = (
        db.query(func.count(models.AICallLog.id))
        .filter(
            models.AICallLog.id_usuario == user_id,
            models.AICallLog.created_at >= today,
            models.AICallLog.cache_hit == False,
        )
        .scalar()
    ) or 0

    if today_calls >= daily_limit:
        logger.info("[quota] user %s hit daily limit (%d/%d)", user_id, today_calls, daily_limit)
        return False, "daily_limit"

    # Sum this month's cost
    month_cost = (
        db.query(func.coalesce(func.sum(models.AICallLog.costo_usd), 0))
        .filter(
            models.AICallLog.id_usuario == user_id,
            models.AICallLog.created_at >= month_start,
        )
        .scalar()
    ) or 0

    if month_cost >= monthly_limit:
        logger.info("[quota] user %s hit monthly limit ($%.4f/$%.2f)", user_id, month_cost, monthly_limit)
        return False, "monthly_limit"

    return True, None


def get_quota_status(user_id: int, db: Session) -> dict:
    """Get current quota usage for a user."""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    budget = db.query(models.UserAIBudget).filter(
        models.UserAIBudget.id_usuario == user_id
    ).first()

    daily_limit = budget.daily_limit_calls if budget else DEFAULT_DAILY_CALLS
    monthly_limit = budget.monthly_limit_usd if budget else DEFAULT_MONTHLY_USD

    today_calls = (
        db.query(func.count(models.AICallLog.id))
        .filter(
            models.AICallLog.id_usuario == user_id,
            models.AICallLog.created_at >= today,
            models.AICallLog.cache_hit == False,
        )
        .scalar()
    ) or 0

    month_cost = (
        db.query(func.coalesce(func.sum(models.AICallLog.costo_usd), 0))
        .filter(
            models.AICallLog.id_usuario == user_id,
            models.AICallLog.created_at >= month_start,
        )
        .scalar()
    ) or 0

    return {
        "daily_calls": today_calls,
        "daily_limit": daily_limit,
        "monthly_cost_usd": round(float(month_cost), 6),
        "monthly_limit_usd": monthly_limit,
        "is_blocked": budget.is_blocked if budget else False,
    }
