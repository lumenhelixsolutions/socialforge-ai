import os
import uuid
from pathlib import Path

os.environ["LOCAL_SOCIAL_AGENT_DB"] = str(Path(__file__).parent / "test_local_social_agent.db")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def uid(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:8]}"


# ── Brands ──────────────────────────────────────────────────────────────────

def test_brand_update():
    name = uid("UpdateMe_")
    brand = client.post("/api/brands", json={"name": name, "voice": "original"})
    assert brand.status_code == 200
    bid = brand.json()["id"]

    updated = client.patch(f"/api/brands/{bid}", json={"voice": "revised", "audience": "devs"})
    assert updated.status_code == 200
    data = updated.json()
    assert data["voice"] == "revised"
    assert data["audience"] == "devs"
    assert data["name"] == name


def test_brand_update_not_found():
    res = client.patch("/api/brands/99999", json={"voice": "x"})
    assert res.status_code == 404


def test_brand_delete():
    brand = client.post("/api/brands", json={"name": uid("DeleteMe_")})
    assert brand.status_code == 200
    bid = brand.json()["id"]

    card = client.post("/api/task-cards", json={
        "title": "Card with brand", "card_type": "post", "objective": "test",
        "output_type": "post", "platform": "x", "ai_role": "writer",
        "model_lane": "safe", "brand_id": bid,
    }).json()

    deleted = client.delete(f"/api/brands/{bid}")
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] == bid

    # card's brand_id should now be null
    detail = client.get(f"/api/task-cards/{card['id']}").json()["card"]
    assert detail["brand_id"] is None

    # brand should be gone
    brands = client.get("/api/brands").json()
    assert not any(b["id"] == bid for b in brands)


def test_brand_delete_not_found():
    res = client.delete("/api/brands/99999")
    assert res.status_code == 404


# ── Campaigns ────────────────────────────────────────────────────────────────

def test_campaign_get_with_cards():
    camp = client.post("/api/campaigns", json={"name": uid("Camp_"), "goal": "test"})
    assert camp.status_code == 200
    cid = camp.json()["id"]

    card = client.post("/api/task-cards", json={
        "title": "Campaign card", "card_type": "post", "objective": "test",
        "output_type": "post", "platform": "x", "ai_role": "writer",
        "model_lane": "safe", "campaign_id": cid,
    }).json()

    detail = client.get(f"/api/campaigns/{cid}")
    assert detail.status_code == 200
    data = detail.json()
    assert data["campaign"]["id"] == cid
    assert any(c["id"] == card["id"] for c in data["cards"])


def test_campaign_get_not_found():
    res = client.get("/api/campaigns/99999")
    assert res.status_code == 404


def test_campaign_update_status():
    camp = client.post("/api/campaigns", json={"name": uid("StatusCamp_")})
    assert camp.status_code == 200
    cid = camp.json()["id"]
    assert camp.json()["status"] == "active"

    updated = client.patch(f"/api/campaigns/{cid}", json={"status": "closed"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "closed"

    reopened = client.patch(f"/api/campaigns/{cid}", json={"status": "active"})
    assert reopened.status_code == 200
    assert reopened.json()["status"] == "active"


def test_campaign_update_name_and_goal():
    old_name = uid("OldName_")
    camp = client.post("/api/campaigns", json={"name": old_name, "goal": "old goal"})
    cid = camp.json()["id"]

    new_name = uid("NewName_")
    updated = client.patch(f"/api/campaigns/{cid}", json={"name": new_name, "goal": "new goal"})
    assert updated.status_code == 200
    assert updated.json()["name"] == new_name
    assert updated.json()["goal"] == "new goal"


# ── Task card export ──────────────────────────────────────────────────────────

def test_task_card_export():
    card = client.post("/api/task-cards", json={
        "title": "Export test card", "card_type": "post",
        "objective": "test export", "output_type": "post",
        "platform": "linkedin", "ai_role": "writer", "model_lane": "safe",
        "constraints": "no hype", "execution_plan": "write once",
    }).json()

    export = client.get(f"/api/task-cards/{card['id']}/export")
    assert export.status_code == 200
    data = export.json()
    assert data["export_version"] == "1"
    assert data["source_card_id"] == card["id"]
    fields = data["exported_fields"]
    assert fields["title"] == "Export test card"
    assert fields["platform"] == "linkedin"
    assert fields["constraints"] == "no hype"


def test_task_card_export_not_found():
    res = client.get("/api/task-cards/99999/export")
    assert res.status_code == 404


# ── Task card delete ──────────────────────────────────────────────────────────

def test_task_card_delete():
    card = client.post("/api/task-cards", json={
        "title": "Delete me", "card_type": "post", "objective": "test delete",
        "output_type": "post", "platform": "x", "ai_role": "writer", "model_lane": "safe",
    }).json()
    cid = card["id"]

    # Archive first (realistic pre-condition)
    client.patch(f"/api/task-cards/{cid}/move", json={"target_state": "archived"})

    deleted = client.delete(f"/api/task-cards/{cid}")
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] == cid

    # Should be gone
    assert client.get(f"/api/task-cards/{cid}").status_code == 404


def test_task_card_delete_not_found():
    res = client.delete("/api/task-cards/99999")
    assert res.status_code == 404


# ── card_type in TaskCardUpdate ───────────────────────────────────────────────

def test_task_card_update_card_type():
    card = client.post("/api/task-cards", json={
        "title": "Type update test", "card_type": "post", "objective": "test",
        "output_type": "post", "platform": "x", "ai_role": "writer", "model_lane": "safe",
    }).json()

    updated = client.patch(f"/api/task-cards/{card['id']}", json={"card_type": "image"})
    assert updated.status_code == 200
    assert updated.json()["card_type"] == "image"
