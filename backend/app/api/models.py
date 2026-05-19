from fastapi import APIRouter
from app.services.ollama_client import OllamaClient

router = APIRouter()

@router.get("/models")
async def models():
    client = OllamaClient()
    return await client.health()
