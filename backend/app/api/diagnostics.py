from fastapi import APIRouter, Query
from app.services.diagnostics_service import run_diagnostics
from app.db.database import get_conn, rows_to_dicts

router = APIRouter()

@router.get("/diagnostics")
async def diagnostics():
    return await run_diagnostics()

@router.get("/audit-log")
def audit_log(limit: int = Query(default=50, ge=1, le=200)):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT ae.*, tc.title AS card_title
            FROM audit_events ae
            LEFT JOIN task_cards tc ON ae.entity_id = tc.id AND ae.entity_type = 'task_card'
            ORDER BY ae.created_at DESC, ae.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return rows_to_dicts(rows)

@router.get("/stats")
def stats():
    with get_conn() as conn:
        card_rows = conn.execute(
            "SELECT workflow_state, COUNT(*) AS count FROM task_cards GROUP BY workflow_state"
        ).fetchall()
        brand_count = conn.execute("SELECT COUNT(*) FROM brands").fetchone()[0]
        campaign_count = conn.execute("SELECT COUNT(*) FROM campaigns").fetchone()[0]
        draft_count = conn.execute("SELECT COUNT(*) FROM drafts WHERE status != 'archived'").fetchone()[0]
        return {
            "cards_by_state": {row["workflow_state"]: row["count"] for row in card_rows},
            "brands": brand_count,
            "campaigns": campaign_count,
            "active_drafts": draft_count,
        }
