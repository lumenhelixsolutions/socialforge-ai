from fastapi import APIRouter, HTTPException
from app.db.database import get_conn, rows_to_dicts
from app.models.schemas import BrandCreate

router = APIRouter()

@router.get("/brands")
def list_brands():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM brands ORDER BY name").fetchall()
        return rows_to_dicts(rows)

@router.post("/brands")
def create_brand(payload: BrandCreate):
    with get_conn() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO brands (name, voice, audience, forbidden_claims, preferred_words) VALUES (?, ?, ?, ?, ?)",
                (payload.name, payload.voice, payload.audience, payload.forbidden_claims, payload.preferred_words)
            )
            brand_id = cur.lastrowid
            row = conn.execute("SELECT * FROM brands WHERE id = ?", (brand_id,)).fetchone()
            return dict(row)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not create brand: {exc}")
