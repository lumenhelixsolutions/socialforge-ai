from fastapi import APIRouter, HTTPException
from app.db.database import get_conn, rows_to_dicts
from app.models.schemas import BrandCreate, BrandUpdate

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

@router.patch("/brands/{brand_id}")
def update_brand(brand_id: int, payload: BrandUpdate):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM brands WHERE id = ?", (brand_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Brand not found.")
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not updates:
            return dict(row)
        cols = ", ".join(f"{k} = ?" for k in updates)
        try:
            conn.execute(f"UPDATE brands SET {cols} WHERE id = ?", (*updates.values(), brand_id))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not update brand: {exc}")
        row = conn.execute("SELECT * FROM brands WHERE id = ?", (brand_id,)).fetchone()
        return dict(row)

@router.delete("/brands/{brand_id}")
def delete_brand(brand_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM brands WHERE id = ?", (brand_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Brand not found.")
        conn.execute("UPDATE task_cards SET brand_id = NULL WHERE brand_id = ?", (brand_id,))
        conn.execute("DELETE FROM brands WHERE id = ?", (brand_id,))
        return {"deleted": brand_id}
