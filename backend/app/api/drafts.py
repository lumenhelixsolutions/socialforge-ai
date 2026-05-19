from fastapi import APIRouter, HTTPException
from app.db.database import get_conn, rows_to_dicts
from app.models.schemas import DraftGenerateRequest, DraftStatusUpdate
from app.services.draft_service import generate_drafts
from app.services.reviewer_service import review_content
from app.services.brand_voice_service import get_brand

router = APIRouter()

@router.get("/drafts")
def list_drafts():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM drafts ORDER BY created_at DESC").fetchall()
        return rows_to_dicts(rows)

@router.post("/drafts/generate")
async def generate(payload: DraftGenerateRequest):
    drafts = await generate_drafts(payload)
    saved = []
    with get_conn() as conn:
        for d in drafts:
            cur = conn.execute(
                '''
                INSERT INTO drafts
                (brand_id, platform, topic, lane, content, hook, hashtags, score,
                 clarity_score, tone_score, platform_fit_score, claim_risk_score,
                 legal_risk_score, spam_risk_score, brand_match_score,
                 risk_notes, raw_sandbox)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    payload.brand_id, payload.platform, payload.topic, payload.lane,
                    d["content"], d["hook"], d["hashtags"], d["score"],
                    d["clarity_score"], d["tone_score"], d["platform_fit_score"],
                    d["claim_risk_score"], d["legal_risk_score"], d["spam_risk_score"],
                    d["brand_match_score"], d["risk_notes"], d["raw_sandbox"]
                )
            )
            draft_id = cur.lastrowid
            conn.execute(
                "INSERT INTO audit_events (entity_type, entity_id, action, after_state) VALUES (?, ?, ?, ?)",
                ("draft", draft_id, "created", payload.lane)
            )
            row = conn.execute("SELECT * FROM drafts WHERE id = ?", (draft_id,)).fetchone()
            saved.append(dict(row))
    return {"drafts": saved}

@router.patch("/drafts/{draft_id}/status")
def update_status(draft_id: int, payload: DraftStatusUpdate):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM drafts WHERE id = ?", (draft_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found.")
        before = row["status"]

        if row["raw_sandbox"] and payload.status == "scheduled":
            raise HTTPException(status_code=400, detail="Raw sandbox drafts must be promoted into a reviewed safe draft before scheduling.")

        conn.execute(
            "UPDATE drafts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (payload.status, draft_id)
        )
        conn.execute(
            "INSERT INTO audit_events (entity_type, entity_id, action, before_state, after_state) VALUES (?, ?, ?, ?, ?)",
            ("draft", draft_id, "status_changed", before, payload.status)
        )
        updated = conn.execute("SELECT * FROM drafts WHERE id = ?", (draft_id,)).fetchone()
        return dict(updated)

@router.post("/drafts/{draft_id}/promote-safe")
def promote_raw_to_safe(draft_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM drafts WHERE id = ?", (draft_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found.")
        source = dict(row)
        if not source["raw_sandbox"]:
            raise HTTPException(status_code=400, detail="Only raw sandbox drafts need promotion.")

        brand = get_brand(source.get("brand_id"))
        review = review_content(source["content"], source["platform"], brand)
        cur = conn.execute(
            '''
            INSERT INTO drafts
            (brand_id, platform, topic, lane, content, hook, hashtags, score,
             clarity_score, tone_score, platform_fit_score, claim_risk_score,
             legal_risk_score, spam_risk_score, brand_match_score, risk_notes,
             status, raw_sandbox, promoted_from_draft_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                source["brand_id"], source["platform"], source["topic"], "safe",
                source["content"], source["hook"], source["hashtags"], review["score"],
                review["clarity_score"], review["tone_score"], review["platform_fit_score"],
                review["claim_risk_score"], review["legal_risk_score"], review["spam_risk_score"],
                review["brand_match_score"], review["risk_notes"], "needs_edit", 0, draft_id
            )
        )
        new_id = cur.lastrowid
        conn.execute("UPDATE drafts SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (draft_id,))
        conn.execute(
            "INSERT INTO audit_events (entity_type, entity_id, action, before_state, after_state) VALUES (?, ?, ?, ?, ?)",
            ("draft", draft_id, "promoted_to_safe", "raw_sandbox", str(new_id))
        )
        conn.execute(
            "INSERT INTO audit_events (entity_type, entity_id, action, before_state, after_state) VALUES (?, ?, ?, ?, ?)",
            ("draft", new_id, "created_from_raw_promotion", str(draft_id), "needs_edit")
        )
        created = conn.execute("SELECT * FROM drafts WHERE id = ?", (new_id,)).fetchone()
        return dict(created)
