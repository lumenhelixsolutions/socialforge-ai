from fastapi import APIRouter, HTTPException
from app.db.database import get_conn, rows_to_dicts
from app.models.schemas import CampaignCreate

router = APIRouter()

@router.get("/campaigns")
def list_campaigns():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM campaigns ORDER BY created_at DESC").fetchall()
        return rows_to_dicts(rows)

@router.post("/campaigns")
def create_campaign(payload: CampaignCreate):
    try:
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO campaigns (name, goal, brand_id) VALUES (?, ?, ?)",
                (payload.name, payload.goal, payload.brand_id)
            )
            row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (cur.lastrowid,)).fetchone()
            return dict(row)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not create campaign: {exc}")
