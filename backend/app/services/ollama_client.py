import os
import httpx

class OllamaClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL") or "http://localhost:11434").rstrip("/")

    async def health(self) -> dict:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                r.raise_for_status()
                data = r.json()
                return {
                    "ok": True,
                    "base_url": self.base_url,
                    "models": [m.get("name") for m in data.get("models", [])]
                }
        except Exception as exc:
            return {
                "ok": False,
                "base_url": self.base_url,
                "models": [],
                "error": str(exc)
            }

    async def generate(self, model: str, prompt: str) -> str:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(f"{self.base_url}/api/generate", json=payload)
            r.raise_for_status()
            return r.json().get("response", "").strip()
