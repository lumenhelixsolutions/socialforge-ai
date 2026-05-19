from __future__ import annotations

from typing import Any

from app.db.database import get_conn, rows_to_dicts
from app.models.schemas import DraftGenerateRequest
from app.services.draft_service import fallback_drafts, generate_drafts
from app.services.reviewer_service import review_content

CARD_COLUMNS = ["inbox", "idea", "drafting", "needs_review", "needs_edit", "approved", "scheduled", "archived"]

PLATFORM_PREVIEW_RULES = {
    "x": {
        "label": "X / Twitter",
        "max_chars": 280,
        "supports_threads": True,
        "fields": ["post_text", "thread_split", "link_preview", "media_placeholder"],
        "wysiwyg_note": "Show compact post body, character count, and optional thread split."
    },
    "linkedin": {
        "label": "LinkedIn",
        "max_chars": 3000,
        "supports_threads": False,
        "fields": ["headline", "body", "cta", "link_preview"],
        "wysiwyg_note": "Show long-form professional paragraphs and CTA."
    },
    "instagram": {
        "label": "Instagram",
        "max_chars": 2200,
        "supports_threads": False,
        "fields": ["caption", "hashtags", "media_placeholder", "alt_text"],
        "wysiwyg_note": "Show caption, hashtag block, media placeholder, and alt text reminder."
    },
    "mastodon": {
        "label": "Mastodon",
        "max_chars": 500,
        "supports_threads": False,
        "fields": ["post_text", "content_warning", "instance_note"],
        "wysiwyg_note": "Show content warning option and instance/account assumptions."
    },
    "youtube": {
        "label": "YouTube",
        "max_chars": 5000,
        "supports_threads": False,
        "fields": ["title", "description", "shorts_script", "thumbnail_prompt"],
        "wysiwyg_note": "Show title, description, and short-form script/thumbnail prompt."
    },
    "tiktok": {
        "label": "TikTok",
        "max_chars": 2200,
        "supports_threads": False,
        "fields": ["caption", "short_script", "hook", "visual_beats"],
        "wysiwyg_note": "Show caption, hook, and short video beats."
    }
}

CARD_TEMPLATES = [
    {
        "id": "thought_leader_post",
        "label": "Thought Leader Post",
        "card_type": "post",
        "output_type": "post",
        "ai_role": "writer",
        "model_lane": "safe",
        "platform": "x",
        "constraints": "Clear, useful, confident. Avoid hype and unsupported claims.",
        "execution_plan": "Create 3 concise post variants, then select the clearest one."
    },
    {
        "id": "launch_week_bulk",
        "label": "Launch Week Bulk Plan",
        "card_type": "bulk",
        "output_type": "campaign",
        "ai_role": "strategist",
        "model_lane": "safe",
        "platform": "x",
        "constraints": "Distribute ideas across multiple days. Each child job requires review.",
        "execution_plan": "Create a one-week campaign plan and split it into child post jobs."
    },
    {
        "id": "raw_creative_sandbox",
        "label": "Raw Creative Sandbox",
        "card_type": "post",
        "output_type": "post",
        "ai_role": "writer",
        "model_lane": "raw",
        "platform": "x",
        "constraints": "Generate edgy creative angles only. Draft-only. Must be promoted before approval.",
        "execution_plan": "Generate raw variants for inspiration, then promote one to a safe reviewed card."
    },
    {
        "id": "image_prompt_job",
        "label": "Image Prompt Job",
        "card_type": "image",
        "output_type": "image",
        "ai_role": "designer",
        "model_lane": "image",
        "platform": "instagram",
        "constraints": "Create image prompt, alt text, and caption. Do not publish directly.",
        "execution_plan": "Generate one image concept, one prompt, one alt-text draft, and one caption."
    },
    {
        "id": "short_video_script",
        "label": "Short Video Script",
        "card_type": "video",
        "output_type": "video_script",
        "ai_role": "editor",
        "model_lane": "safe",
        "platform": "tiktok",
        "constraints": "Hook in first 2 seconds. Keep script under 45 seconds.",
        "execution_plan": "Create hook, scene beats, spoken script, caption, and visual notes."
    }
]

def analyze_preview_text(text: str | None, platform: str | None) -> dict[str, Any]:
    text = text or ""
    platform_key = platform or "x"
    rules = PLATFORM_PREVIEW_RULES.get(platform_key, PLATFORM_PREVIEW_RULES["x"])
    char_count = len(text)
    max_chars = int(rules.get("max_chars", 280))
    over_limit = char_count > max_chars
    remaining = max_chars - char_count

    hashtags = [token for token in text.split() if token.startswith("#") and len(token) > 1]
    links = [token for token in text.split() if token.startswith("http://") or token.startswith("https://")]
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]

    thread_parts = []
    if platform_key == "x" and char_count > max_chars:
        words = text.split()
        current = ""
        for word in words:
            if len(current) + len(word) + 1 > max_chars:
                thread_parts.append(current.strip())
                current = word
            else:
                current = (current + " " + word).strip()
        if current:
            thread_parts.append(current.strip())

    return {
        "platform": platform_key,
        "label": rules["label"],
        "char_count": char_count,
        "max_chars": max_chars,
        "remaining": remaining,
        "over_limit": over_limit,
        "hashtags": hashtags,
        "links": links,
        "paragraph_count": len(paragraphs),
        "thread_parts": thread_parts,
        "field_hints": rules["fields"],
        "wysiwyg_note": rules["wysiwyg_note"],
    }

CARD_SETUP_STEPS = [
    "Objective", "Output Type", "Brand / Project", "Platform / Destination",
    "Source Material", "AI Role", "Model Lane", "Constraints", "Workflow Rule",
    "Execution Plan", "Preview", "History"
]
TRANSITION_RULES = {
    "inbox": {"idea", "drafting", "archived"},
    "idea": {"drafting", "needs_review", "archived"},
    "drafting": {"needs_review", "needs_edit", "archived"},
    "needs_review": {"needs_edit", "approved", "archived"},
    "needs_edit": {"drafting", "needs_review", "archived"},
    "approved": {"scheduled", "needs_edit", "archived"},
    "scheduled": {"approved", "needs_edit", "archived"},
    "archived": {"idea"},
}

def _audit(conn, entity_id: int, action: str, before: str | None = None, after: str | None = None):
    conn.execute(
        "INSERT INTO audit_events (entity_type, entity_id, action, before_state, after_state) VALUES (?, ?, ?, ?, ?)",
        ("task_card", entity_id, action, before, after),
    )

def create_task_card(payload) -> dict[str, Any]:
    title = payload.title.strip()
    if not title:
        raise ValueError("Card title is required.")
    workflow_state = "drafting" if payload.model_lane == "raw" else "idea"
    approval_state = "raw_draft_only" if payload.model_lane == "raw" else "not_reviewed"
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO task_cards (
                title, card_type, objective, output_type, brand_id, campaign_id,
                platform, source_material, ai_role, model_lane, constraints,
                workflow_rule, execution_plan, preview, workflow_state,
                approval_state, parent_card_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (title, payload.card_type, payload.objective, payload.output_type, payload.brand_id,
             payload.campaign_id, payload.platform, payload.source_material, payload.ai_role,
             payload.model_lane, payload.constraints, payload.workflow_rule, payload.execution_plan,
             payload.preview, workflow_state, approval_state, payload.parent_card_id),
        )
        card_id = cur.lastrowid
        _audit(conn, card_id, "created", None, workflow_state)
        row = conn.execute("SELECT * FROM task_cards WHERE id = ?", (card_id,)).fetchone()
        return dict(row)

def list_task_cards() -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM task_cards ORDER BY updated_at DESC, created_at DESC").fetchall()
        return rows_to_dicts(rows)

def get_task_card(card_id: int) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM task_cards WHERE id = ?", (card_id,)).fetchone()
        return dict(row) if row else None

def get_child_cards(card_id: int) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM task_cards WHERE parent_card_id = ? ORDER BY created_at", (card_id,)).fetchall()
        return rows_to_dicts(rows)

def card_allowed_actions(card: dict[str, Any]) -> list[str]:
    actions = ["inspect", "duplicate", "archive"]
    state = card["workflow_state"]
    if state in {"idea", "drafting", "needs_edit"}:
        actions.extend(["generate", "review"])
    if state == "needs_review":
        actions.extend(["review", "approve", "needs_edit"])
    if card["model_lane"] == "raw":
        actions.append("promote_raw")
    if state == "approved":
        actions.append("schedule")
    if card["card_type"] in {"bulk", "campaign"}:
        actions.append("split_bulk")
    return sorted(set(actions))

def next_action_hint(card: dict[str, Any]) -> str:
    if card["model_lane"] == "raw":
        return "Promote raw draft into a safe reviewed job before scheduling."
    state = card["workflow_state"]
    if state == "idea": return "Generate or attach draft content."
    if state == "drafting": return "Send to reviewer."
    if state == "needs_review": return "Review score and approve or send back for edits."
    if state == "approved": return "Schedule this card on the calendar."
    if state == "scheduled": return "Wait for future publisher service or reschedule."
    return "Inspect, duplicate, or archive."

def explain_card(card: dict[str, Any]) -> dict[str, Any]:
    return {
        "summary": f"{card['card_type'].title()} card for {card['platform']} in {card['workflow_state'].replace('_', ' ')}.",
        "what_it_does": card["objective"] or "No objective set yet.",
        "what_happens_next": next_action_hint(card),
        "allowed_actions": card_allowed_actions(card),
        "trust_questions": {
            "what_is_this": card["card_type"],
            "where_will_it_go": card["platform"],
            "when_will_it_happen": card["scheduled_at"] or "Not scheduled",
            "is_it_approved": card["approval_state"],
            "risk": f"{card['risk_score']} / 100",
            "can_it_publish": False,
        }
    }

def validate_move(card: dict[str, Any], target_state: str, scheduled_at: str | None = None) -> tuple[bool, str]:
    if target_state not in CARD_COLUMNS:
        return False, f"Unknown target state: {target_state}."
    current = card["workflow_state"]
    if target_state == current:
        return True, "Card is already in that state."
    if target_state not in TRANSITION_RULES.get(current, set()):
        return False, f"Cards cannot move directly from {current} to {target_state}."
    if card["model_lane"] == "raw" and target_state in {"approved", "scheduled"}:
        return False, "Raw creative cards must be promoted to a safe card before approval or scheduling."
    if target_state == "approved" and card["risk_score"] and card["risk_score"] < 70:
        return False, "Risk score is below approval threshold. Send to edit or manually override in a future workflow."
    if target_state == "scheduled":
        if card["approval_state"] != "approved": return False, "Only approved cards can be scheduled."
        if not scheduled_at: return False, "Scheduling requires a date/time."
    return True, "Move allowed."

def move_task_card(card_id: int, payload) -> dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM task_cards WHERE id = ?", (card_id,)).fetchone()
        if not row: raise ValueError("Task card not found.")
        card = dict(row)
        ok, reason = validate_move(card, payload.target_state, payload.scheduled_at)
        if not ok: raise ValueError(reason)
        before = card["workflow_state"]
        schedule_state = card["schedule_state"]
        approval_state = card["approval_state"]
        scheduled_at = card["scheduled_at"]
        risk_score = card["risk_score"]
        reviewer_notes = card["reviewer_notes"]
        if payload.target_state == "needs_review":
            review = review_content(card["preview"] or card["source_material"] or card["objective"], card["platform"])
            risk_score = review["score"]
            reviewer_notes = review["risk_notes"]
            approval_state = "reviewed"
        elif payload.target_state == "approved":
            approval_state = "approved"
        elif payload.target_state == "scheduled":
            schedule_state = "scheduled"
            scheduled_at = payload.scheduled_at
        conn.execute(
            """
            UPDATE task_cards SET workflow_state = ?, approval_state = ?, schedule_state = ?, scheduled_at = ?,
                timezone = ?, risk_score = ?, reviewer_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (payload.target_state, approval_state, schedule_state, scheduled_at, payload.timezone,
             risk_score, reviewer_notes, card_id),
        )
        _audit(conn, card_id, "moved", before, payload.target_state)
        updated = conn.execute("SELECT * FROM task_cards WHERE id = ?", (card_id,)).fetchone()
        return dict(updated)

async def run_card_action(card_id: int, payload) -> dict[str, Any]:
    card = get_task_card(card_id)
    if not card: raise ValueError("Task card not found.")
    if payload.action == "review":
        review = review_content(card["preview"] or card["source_material"] or card["objective"], card["platform"])
        with get_conn() as conn:
            conn.execute(
                "UPDATE task_cards SET workflow_state = ?, approval_state = ?, risk_score = ?, reviewer_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                ("needs_review", "reviewed", review["score"], review["risk_notes"], card_id),
            )
            _audit(conn, card_id, "reviewed", card["workflow_state"], "needs_review")
        return get_task_card(card_id)
    if payload.action == "generate":
        req = DraftGenerateRequest(
            brand_id=card["brand_id"], platform=card["platform"], topic=card["objective"] or card["title"],
            goal=card["execution_plan"] or "create useful social content",
            tone=card["constraints"] or "clear, useful, human",
            lane="raw" if card["model_lane"] == "raw" else "safe", count=1, model=payload.model,
        )
        generated = await generate_drafts(req)
        preview = generated[0]["content"] if generated else fallback_drafts(card["title"], card["platform"], "", 1, card["model_lane"])[0]
        review = review_content(preview, card["platform"])
        with get_conn() as conn:
            conn.execute(
                """
                UPDATE task_cards SET preview = ?, risk_score = ?, reviewer_notes = ?, workflow_state = ?, approval_state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                """,
                (preview, review["score"], review["risk_notes"], "drafting", "raw_draft_only" if card["model_lane"] == "raw" else "draft_created", card_id),
            )
            _audit(conn, card_id, "generated", card["workflow_state"], "drafting")
        return get_task_card(card_id)
    if payload.action == "promote_raw":
        if card["model_lane"] != "raw": raise ValueError("Only raw cards can be promoted.")
        with get_conn() as conn:
            cur = conn.execute(
                """
                INSERT INTO task_cards (title, card_type, objective, output_type, brand_id, campaign_id, platform, source_material,
                    ai_role, model_lane, constraints, workflow_rule, execution_plan, preview, workflow_state, approval_state,
                    parent_card_id, risk_score, reviewer_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'polisher', 'safe', ?, 'approval_required', ?, ?, 'needs_review', 'reviewed', ?, ?, ?)
                """,
                (f"Safe version: {card['title']}", card["card_type"], card["objective"], card["output_type"], card["brand_id"], card["campaign_id"],
                 card["platform"], card["preview"] or card["source_material"], card["constraints"] + "\nPromoted from raw creative source; make platform-safe.",
                 "Rewrite raw creative material into a safe, reviewable version.", card["preview"], card_id, card["risk_score"],
                 "Promoted from raw creative card. Requires human review."),
            )
            new_id = cur.lastrowid
            conn.execute("UPDATE task_cards SET child_count = child_count + 1 WHERE id = ?", (card_id,))
            _audit(conn, card_id, "promoted_raw_source", card["workflow_state"], "child_created")
            _audit(conn, new_id, "created_from_raw", None, "needs_review")
        return get_task_card(new_id)
    if payload.action == "split_bulk":
        if card["card_type"] not in {"campaign", "bulk"}: raise ValueError("Only campaign or bulk cards can be split into child jobs.")
        children = []
        with get_conn() as conn:
            for i in range(1, 4):
                cur = conn.execute(
                    """
                    INSERT INTO task_cards (title, card_type, objective, output_type, brand_id, campaign_id, platform,
                        source_material, ai_role, model_lane, constraints, workflow_rule, execution_plan, preview,
                        workflow_state, approval_state, parent_card_id)
                    VALUES (?, 'post', ?, 'post', ?, ?, ?, ?, 'writer', 'safe', ?, 'approval_required', ?, '', 'idea', 'not_reviewed', ?)
                    """,
                    (f"{card['title']} — Post {i}", card["objective"], card["brand_id"], card["campaign_id"], card["platform"],
                     card["source_material"], card["constraints"], "Create a child post job from the parent campaign/bulk card.", card_id),
                )
                child_id = cur.lastrowid
                _audit(conn, child_id, "created_from_bulk", None, "idea")
                children.append(dict(conn.execute("SELECT * FROM task_cards WHERE id = ?", (child_id,)).fetchone()))
            conn.execute("UPDATE task_cards SET child_count = child_count + ? WHERE id = ?", (len(children), card_id))
            _audit(conn, card_id, "split_bulk", card["workflow_state"], "children_created")
        return {"parent": get_task_card(card_id), "children": children}
    if payload.action == "archive":
        class P: pass
        p = P(); p.target_state = "archived"; p.scheduled_at = None; p.timezone = "America/New_York"
        return move_task_card(card_id, p)
    raise ValueError(f"Unsupported card action: {payload.action}")


def get_card_history(card_id: int) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, action, before_state, after_state, created_at
            FROM audit_events
            WHERE entity_type = 'task_card' AND entity_id = ?
            ORDER BY created_at DESC, id DESC
            """,
            (card_id,),
        ).fetchall()
        return rows_to_dicts(rows)


def update_task_card(card_id: int, payload) -> dict[str, Any]:
    allowed = [
        "title", "objective", "output_type", "platform", "source_material",
        "ai_role", "model_lane", "constraints", "workflow_rule",
        "execution_plan", "preview"
    ]
    updates = {}
    for field in allowed:
        if hasattr(payload, field):
            value = getattr(payload, field)
            if value is not None:
                updates[field] = value

    if not updates:
        card = get_task_card(card_id)
        if not card:
            raise ValueError("Task card not found.")
        return card

    assignments = ", ".join([f"{field} = ?" for field in updates.keys()])
    values = list(updates.values())

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM task_cards WHERE id = ?", (card_id,)).fetchone()
        if not row:
            raise ValueError("Task card not found.")
        before = dict(row)
        conn.execute(
            f"UPDATE task_cards SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            values + [card_id],
        )
        changed = ", ".join(sorted(updates.keys()))
        _audit(conn, card_id, "updated_fields", before.get("workflow_state"), changed)
        updated = conn.execute("SELECT * FROM task_cards WHERE id = ?", (card_id,)).fetchone()
        return dict(updated)

def get_platform_preview(card_id: int) -> dict[str, Any]:
    card = get_task_card(card_id)
    if not card:
        raise ValueError("Task card not found.")
    analysis = analyze_preview_text(card.get("preview") or card.get("source_material") or "", card.get("platform"))
    return {
        "card_id": card_id,
        "card_title": card.get("title"),
        "platform_analysis": analysis,
    }
