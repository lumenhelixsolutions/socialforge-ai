from app.db.database import get_conn

def get_brand(brand_id: int | None):
    if not brand_id:
        return None
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM brands WHERE id = ?", (brand_id,)).fetchone()
        return dict(row) if row else None

def brand_context(brand: dict | None) -> str:
    if not brand:
        return "No saved brand profile. Use broadly useful, clear, human social media style."

    return f'''
Brand: {brand.get("name")}
Voice: {brand.get("voice")}
Audience: {brand.get("audience")}
Forbidden claims: {brand.get("forbidden_claims")}
Preferred words: {brand.get("preferred_words")}
'''.strip()
