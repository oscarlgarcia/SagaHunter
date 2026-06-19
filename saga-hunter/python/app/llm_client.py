"""LLM client for Ollama integration.

Generates enrichments on-demand via LLM.
"""

import httpx
from app.config import settings


class LLMClient:
    def __init__(self):
        self.base_url = settings.OLLAMA_URL
        self.client = httpx.Client(timeout=120)

    def is_available(self) -> bool:
        try:
            r = self.client.get(f"{self.base_url}/api/tags")
            return r.status_code == 200
        except Exception:
            return False

    def generate(self, prompt: str, model: str = "qwen2.5-coder:3b", temperature: float = 0.3) -> str:
        r = self.client.post(f"{self.base_url}/api/generate", json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "temperature": temperature,
        }, timeout=300)
        r.raise_for_status()
        return r.json()["response"]


llm = LLMClient()
