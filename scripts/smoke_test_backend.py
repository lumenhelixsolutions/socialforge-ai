import requests

BASE = "http://localhost:8787"

print("Diagnostics")
print(requests.get(f"{BASE}/api/diagnostics", timeout=10).json())

brand = requests.post(f"{BASE}/api/brands", json={
    "name": "OIQ",
    "voice": "clear, bold, local-first, practical",
    "audience": "builders, creators, independent researchers",
    "forbidden_claims": "no guaranteed results, no legal claims without evidence",
    "preferred_words": "local, reversible, useful, proof"
}, timeout=10).json()
print("Brand:", brand)

drafts = requests.post(f"{BASE}/api/drafts/generate", json={
    "brand_id": brand["id"],
    "platform": "x",
    "topic": "testing a local social media agent that drafts before it posts",
    "goal": "explain the value",
    "tone": "confident but careful",
    "lane": "safe",
    "count": 5
}, timeout=30).json()
print("Draft count:", len(drafts["drafts"]))
print(drafts["drafts"][0])
