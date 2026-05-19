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


# ── Tags ──────────────────────────────────────────────────────────────────────

def test_task_card_tags_create_and_update():
    card = client.post("/api/task-cards", json={
        "title": uid("tagged_"),
        "card_type": "post", "objective": "tag test",
        "output_type": "post", "platform": "x",
        "ai_role": "writer", "model_lane": "safe",
        "tags": "launch, q2",
    }).json()
    assert card["tags"] == "launch, q2"

    updated = client.patch(f"/api/task-cards/{card['id']}", json={"tags": "launch, q2, organic"})
    assert updated.status_code == 200
    assert updated.json()["tags"] == "launch, q2, organic"


# ── Server-side filtering ─────────────────────────────────────────────────────

def test_task_cards_filter_by_state():
    # Move to drafting (valid from idea state)
    card = client.post("/api/task-cards", json={
        "title": uid("filter_state_"),
        "card_type": "post", "objective": "filter test",
        "output_type": "post", "platform": "x",
        "ai_role": "writer", "model_lane": "safe",
    }).json()
    cid = card["id"]
    client.patch(f"/api/task-cards/{cid}/move", json={"target_state": "drafting"})

    res = client.get("/api/task-cards?state=drafting")
    assert res.status_code == 200
    ids = [c["id"] for c in res.json()]
    assert cid in ids


def test_task_cards_filter_by_platform():
    card = client.post("/api/task-cards", json={
        "title": uid("filter_plat_"),
        "card_type": "post", "objective": "filter test",
        "output_type": "post", "platform": "mastodon",
        "ai_role": "writer", "model_lane": "safe",
    }).json()

    res = client.get("/api/task-cards?platform=mastodon")
    assert res.status_code == 200
    platforms = {c["platform"] for c in res.json()}
    assert platforms == {"mastodon"}


def test_task_cards_filter_by_search():
    unique_title = uid("uniquesearch_")
    client.post("/api/task-cards", json={
        "title": unique_title,
        "card_type": "post", "objective": "searchable obj",
        "output_type": "post", "platform": "x",
        "ai_role": "writer", "model_lane": "safe",
    })

    res = client.get(f"/api/task-cards?search={unique_title}")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["title"] == unique_title


# ── Bulk move ─────────────────────────────────────────────────────────────────

def test_bulk_move_cards():
    # Create two cards and bulk-move them both to drafting
    ids = []
    for i in range(2):
        card = client.post("/api/task-cards", json={
            "title": uid(f"bulk_{i}_"),
            "card_type": "post", "objective": "bulk test",
            "output_type": "post", "platform": "x",
            "ai_role": "writer", "model_lane": "safe",
        }).json()
        ids.append(card["id"])

    res = client.post("/api/task-cards/bulk-move", json={"ids": ids, "target_state": "drafting"})
    assert res.status_code == 200
    data = res.json()
    assert data["moved_count"] == 2
    assert data["errors"] == []
    for moved_card in data["moved"]:
        assert moved_card["workflow_state"] == "drafting"


def test_bulk_move_partial_failure():
    card = client.post("/api/task-cards", json={
        "title": uid("bulk_partial_"),
        "card_type": "post", "objective": "bulk partial test",
        "output_type": "post", "platform": "x",
        "ai_role": "writer", "model_lane": "safe",
    }).json()

    # Mix a valid id with a nonexistent one
    res = client.post("/api/task-cards/bulk-move", json={
        "ids": [card["id"], 999999],
        "target_state": "drafting",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["moved_count"] == 1
    assert len(data["errors"]) == 1
    assert data["errors"][0]["id"] == 999999


def test_bulk_move_invalid_state():
    res = client.post("/api/task-cards/bulk-move", json={"ids": [1], "target_state": "invalid_state"})
    assert res.status_code == 422


def test_bulk_move_empty_ids():
    res = client.post("/api/task-cards/bulk-move", json={"ids": [], "target_state": "drafting"})
    assert res.status_code == 422
