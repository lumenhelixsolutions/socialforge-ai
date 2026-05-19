from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import brands, drafts, diagnostics, models, campaigns, task_cards
from app.db.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Local Social Agent MVP",
    version="0.2.1",
    description="Draft-first local social media agent command center with visual AI task cards.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "name": "Local Social Agent MVP",
        "version": "0.2.1",
        "mode": "visual-ai-task-cards",
        "publishing_enabled": False,
    }

app.include_router(diagnostics.router, prefix="/api", tags=["diagnostics"])
app.include_router(models.router, prefix="/api", tags=["models"])
app.include_router(brands.router, prefix="/api", tags=["brands"])
app.include_router(drafts.router, prefix="/api", tags=["drafts"])
app.include_router(campaigns.router, prefix="/api", tags=["campaigns"])
app.include_router(task_cards.router, prefix="/api", tags=["task-cards"])
