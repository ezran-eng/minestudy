"""
Generic OpenAI-compatible LLM client.
Change LLM_PROVIDER env var to switch between providers — no code changes needed.
"""
import os
import httpx

_CONFIGS = {
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-chat",
        "api_key_env": "DEEPSEEK_API_KEY",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
        "api_key_env": "OPENAI_API_KEY",
    },
}


async def chat_completion(messages: list[dict], max_tokens: int = 80) -> str:
    provider = os.getenv("LLM_PROVIDER", "deepseek")
    cfg = _CONFIGS.get(provider, _CONFIGS["deepseek"])
    api_key = os.getenv(cfg["api_key_env"], "")

    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.post(
            f"{cfg['base_url']}/chat/completions",
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
        return resp.json()["choices"][0]["message"]["content"].strip()
