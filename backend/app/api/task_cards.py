from fastapi import APIRouter, HTTPException
from app.models.schemas import TaskCardCreate, TaskCardMove, TaskCardAction, TaskCardUpdate
from app.services.task_card_service import (
    CARD_COLUMNS,
    CARD_SETUP_STEPS,
    CARD_TEMPLATES,
    PLATFORM_PREVIEW_RULES,
    analyze_preview_text,
    create_task_card,
    delete_task_card,
    duplicate_task_card,
    export_task_card,
    explain_card,
    get_card_history,
    get_child_cards,
    get_platform_preview,
    get_task_card,
    list_task_cards,
    move_task_card,
    run_card_action,
    update_task_card,
)

router = APIRouter()

@router.get("/task-cards/meta")
def task_card_meta():
    return {
        "columns": CARD_COLUMNS,
        "setup_steps": CARD_SETUP_STEPS,
        "templates": CARD_TEMPLATES,
        "platform_preview_rules": PLATFORM_PREVIEW_RULES,
        "doctrine": "A card is a visible, inspectable, schedulable, programmable AI work order."
    }

@router.get("/task-cards")
def task_cards():
    return list_task_cards()

@router.post("/task-cards")
def create_card(payload: TaskCardCreate):
    try:
        return create_task_card(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/task-cards/{card_id}")
def read_card(card_id: int):
    card = get_task_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Task card not found.")
    preview_source = card.get("preview") or card.get("source_material") or ""
    return {
        "card": card,
        "children": get_child_cards(card_id),
        "explanation": explain_card(card),
        "history": get_card_history(card_id),
        "platform_preview": analyze_preview_text(preview_source, card.get("platform")),
    }

@router.patch("/task-cards/{card_id}")
def update_card(card_id: int, payload: TaskCardUpdate):
    try:
        return update_task_card(card_id, payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/task-cards/{card_id}/export")
def export_card(card_id: int):
    try:
        return export_task_card(card_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.get("/task-cards/{card_id}/preview")
def platform_preview(card_id: int):
    try:
        return get_platform_preview(card_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.patch("/task-cards/{card_id}/move")
def move_card(card_id: int, payload: TaskCardMove):
    try:
        return move_task_card(card_id, payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.post("/task-cards/{card_id}/action")
async def card_action(card_id: int, payload: TaskCardAction):
    try:
        return await run_card_action(card_id, payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.post("/task-cards/{card_id}/duplicate")
def dup_card(card_id: int):
    try:
        return duplicate_task_card(card_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.delete("/task-cards/{card_id}")
def delete_card(card_id: int):
    try:
        return delete_task_card(card_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
