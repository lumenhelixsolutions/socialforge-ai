import os
from pathlib import Path

os.environ["LOCAL_SOCIAL_AGENT_DB"] = str(Path(__file__).parent / "test_local_social_agent.db")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_diagnostics_endpoint():
    res = client.get("/api/diagnostics")
    assert res.status_code == 200
    data = res.json()
    assert "checks" in data
    assert any(check["name"] == "Publishing" for check in data["checks"])


def test_safe_draft_golden_path():
    brand = client.post("/api/brands", json={
        "name": "Test Brand",
        "voice": "clear, practical, local-first",
        "audience": "builders",
        "forbidden_claims": "guaranteed",
        "preferred_words": "local, useful, proof"
    })
    assert brand.status_code in (200, 400)

    brands = client.get("/api/brands").json()
    brand_id = next(b["id"] for b in brands if b["name"] == "Test Brand")

    drafts = client.post("/api/drafts/generate", json={
        "brand_id": brand_id,
        "platform": "x",
        "topic": "a local agent that drafts before it posts",
        "goal": "explain value",
        "tone": "confident but careful",
        "lane": "safe",
        "count": 5
    })
    assert drafts.status_code == 200
    payload = drafts.json()
    assert len(payload["drafts"]) == 5
    first = payload["drafts"][0]
    assert first["raw_sandbox"] == 0
    assert "clarity_score" in first

    approved = client.patch(f"/api/drafts/{first['id']}/status", json={"status": "approved"})
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"


def test_raw_draft_requires_promotion_before_scheduling():
    drafts = client.post("/api/drafts/generate", json={
        "platform": "x",
        "topic": "raw creative sandbox should not publish directly",
        "goal": "test safety",
        "tone": "edgy",
        "lane": "raw",
        "count": 1
    })
    assert drafts.status_code == 200
    raw = drafts.json()["drafts"][0]
    assert raw["raw_sandbox"] == 1

    blocked = client.patch(f"/api/drafts/{raw['id']}/status", json={"status": "scheduled"})
    assert blocked.status_code == 400

    promoted = client.post(f"/api/drafts/{raw['id']}/promote-safe")
    assert promoted.status_code == 200
    safe = promoted.json()
    assert safe["raw_sandbox"] == 0
    assert safe["lane"] == "safe"
    assert safe["status"] == "needs_edit"

    scheduled = client.patch(f"/api/drafts/{safe['id']}/status", json={"status": "scheduled"})
    assert scheduled.status_code == 200
    assert scheduled.json()["status"] == "scheduled"
