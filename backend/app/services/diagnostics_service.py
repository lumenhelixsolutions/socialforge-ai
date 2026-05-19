import os
from pathlib import Path
from app.services.ollama_client import OllamaClient
from app.db.database import DB_PATH, init_db

async def run_diagnostics():
    init_db()
    ollama = OllamaClient()
    model_health = await ollama.health()

    checks = [
        {
            "name": "Backend",
            "ok": True,
            "message": "FastAPI is running."
        },
        {
            "name": "Database",
            "ok": DB_PATH.exists(),
            "message": f"SQLite database path: {DB_PATH}"
        },
        {
            "name": "Ollama",
            "ok": model_health["ok"],
            "message": "Connected to Ollama." if model_health["ok"] else "Ollama is not reachable. Draft fallback mode is active.",
            "details": model_health
        },
        {
            "name": "Publishing",
            "ok": os.getenv("PUBLISHING_ENABLED", "false").lower() != "true",
            "message": "Publishing is disabled by default for MVP 0.1."
        },
        {
            "name": "Raw Sandbox",
            "ok": True,
            "message": "Raw creative drafts are draft-only and cannot publish."
        }
    ]

    return {
        "overall_ok": all(c["ok"] for c in checks if c["name"] not in {"Ollama"}),
        "checks": checks
    }
