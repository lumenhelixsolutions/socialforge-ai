from fastapi import APIRouter
from app.services.diagnostics_service import run_diagnostics

router = APIRouter()

@router.get("/diagnostics")
async def diagnostics():
    return await run_diagnostics()
