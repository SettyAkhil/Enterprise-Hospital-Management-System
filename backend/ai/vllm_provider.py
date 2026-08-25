"""OpenAI/vLLM-compatible provider for AI-assisted ER triage suggestions.

Trimmed from keppler-reference/.../backend/ai/vllm_provider.py -- drops the
OCR/vision provider (not used by ER/Beds). When VLLM_BASE_URL isn't
configured, is_configured()/generate() fail closed so
modules/symptom_ai/routes.py's existing fallback_triage() path takes over
instead of erroring -- the rest of the ER workflow doesn't depend on this.
"""

import os

import requests

VLLM_BASE_URL = (os.getenv("VLLM_BASE_URL") or "").rstrip("/")
VLLM_MODEL = os.getenv("VLLM_MODEL", "gpt-4o-mini")
VLLM_API_KEY = os.getenv("VLLM_API_KEY", "")
VLLM_TIMEOUT_SECONDS = int(os.getenv("VLLM_TIMEOUT_SECONDS", "60"))


def _headers():
    headers = {"Content-Type": "application/json"}
    if VLLM_API_KEY:
        headers["Authorization"] = f"Bearer {VLLM_API_KEY}"
    return headers


class VLLMLLMProvider:
    def is_configured(self) -> bool:
        return bool(VLLM_BASE_URL)

    def generate(self, prompt: str, context: str = "", json_mode: bool = False, max_tokens: int = 2048):
        if not VLLM_BASE_URL:
            return None
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        payload = {
            "model": VLLM_MODEL,
            "messages": [{"role": "user", "content": full_prompt}],
            "temperature": 0.1,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        try:
            response = requests.post(
                f"{VLLM_BASE_URL}/chat/completions",
                json=payload,
                headers=_headers(),
                timeout=VLLM_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            data = response.json()
            return (data["choices"][0]["message"]["content"] or "").strip()
        except Exception:
            return None


llm_provider = VLLMLLMProvider()
