from fastapi import APIRouter, HTTPException
from app.db.database import get_conn, rows_to_dicts
from app.models.schemas import CampaignCreate, CampaignUpdate

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

@router.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Campaign not found.")
        cards = conn.execute(
            "SELECT * FROM task_cards WHERE campaign_id = ? ORDER BY created_at DESC",
            (campaign_id,)
        ).fetchall()
        return {"campaign": dict(row), "cards": rows_to_dicts(cards)}

@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Campaign not found.")
        conn.execute("UPDATE task_cards SET campaign_id = NULL WHERE campaign_id = ?", (campaign_id,))
        conn.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
        return {"deleted": campaign_id}

@router.patch("/campaigns/{campaign_id}")
def update_campaign(campaign_id: int, payload: CampaignUpdate):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Campaign not found.")
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not updates:
            return dict(row)
        cols = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(f"UPDATE campaigns SET {cols} WHERE id = ?", (*updates.values(), campaign_id))
        row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
        return dict(row)
