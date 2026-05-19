from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_task_card_create_and_read():
    response = client.post("/api/task-cards", json={
        "title": "Test OIQ post",
        "card_type": "post",
        "objective": "Explain local-first AI social media workflow",
        "output_type": "post",
        "platform": "x",
        "ai_role": "writer",
        "model_lane": "safe",
        "constraints": "No hype",
        "execution_plan": "Generate a concise post"
    })
    assert response.status_code == 200
    card = response.json()
    assert card["title"] == "Test OIQ post"
    assert card["workflow_state"] == "idea"
    detail = client.get(f"/api/task-cards/{card['id']}")
    assert detail.status_code == 200
    assert "explanation" in detail.json()

def test_raw_card_cannot_schedule_directly():
    created = client.post("/api/task-cards", json={
        "title": "Raw card",
        "card_type": "post",
        "objective": "Raw creative material",
        "output_type": "post",
        "platform": "x",
        "ai_role": "writer",
        "model_lane": "raw"
    }).json()
    response = client.patch(f"/api/task-cards/{created['id']}/move", json={
        "target_state": "scheduled",
        "scheduled_at": "2026-05-20T14:00:00"
    })
    assert response.status_code == 400

def test_bulk_card_split_creates_children():
    created = client.post("/api/task-cards", json={
        "title": "Launch week",
        "card_type": "bulk",
        "objective": "Create a launch week content set",
        "output_type": "campaign",
        "platform": "x",
        "ai_role": "strategist",
        "model_lane": "safe"
    }).json()
    response = client.post(f"/api/task-cards/{created['id']}/action", json={"action": "split_bulk"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["children"]) == 3


def test_task_card_history_is_returned():
    created = client.post("/api/task-cards", json={
        "title": "History test",
        "card_type": "post",
        "objective": "Test audit history",
        "output_type": "post",
        "platform": "x",
        "ai_role": "writer",
        "model_lane": "safe"
    }).json()

    detail = client.get(f"/api/task-cards/{created['id']}")
    assert detail.status_code == 200
    data = detail.json()
    assert "history" in data
    assert len(data["history"]) >= 1


def test_task_card_update_preview_and_platform_analysis():
    created = client.post("/api/task-cards", json={
        "title": "Preview update test",
        "card_type": "post",
        "objective": "Test editable preview",
        "output_type": "post",
        "platform": "x",
        "ai_role": "writer",
        "model_lane": "safe"
    }).json()

    updated = client.patch(f"/api/task-cards/{created['id']}", json={
        "preview": "This is a test preview with #localAI https://example.com",
        "platform": "x"
    })
    assert updated.status_code == 200
    assert "#localAI" in updated.json()["preview"]

    detail = client.get(f"/api/task-cards/{created['id']}")
    assert detail.status_code == 200
    data = detail.json()
    assert "platform_preview" in data
    assert data["platform_preview"]["platform"] == "x"
    assert data["platform_preview"]["char_count"] > 0
    assert "#localAI" in data["platform_preview"]["hashtags"]

def test_task_card_meta_includes_templates_and_platform_rules():
    meta = client.get("/api/task-cards/meta")
    assert meta.status_code == 200
    data = meta.json()
    assert "templates" in data
    assert "platform_preview_rules" in data
    assert "x" in data["platform_preview_rules"]
