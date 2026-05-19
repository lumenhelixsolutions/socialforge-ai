#!/usr/bin/env python3
from __future__ import annotations
import json, urllib.request
BASE='http://localhost:8787'
def post(path,payload):
    req=urllib.request.Request(BASE+path,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(req, timeout=10) as r: return json.loads(r.read().decode())
def main():
    cards=[
        {"title":"OIQ local-first launch post","card_type":"post","objective":"Explain why local-first social media agents matter","output_type":"post","platform":"x","ai_role":"writer","model_lane":"safe","constraints":"Clear, useful, no hype.","execution_plan":"Create a concise thought-leader post.","preview":"Local AI tools should not hide the workflow. Every AI task should become visible, inspectable, and reversible. #LocalAI"},
        {"title":"Raw creative sandbox angle","card_type":"post","objective":"Create bold launch angles for Local Social Agent","output_type":"post","platform":"x","ai_role":"writer","model_lane":"raw","constraints":"Draft-only. Must be promoted before approval.","execution_plan":"Generate creative directions only."},
        {"title":"Launch week campaign","card_type":"bulk","objective":"Create a week of launch content","output_type":"campaign","platform":"linkedin","ai_role":"strategist","model_lane":"safe","constraints":"Professional, clear, no unsupported claims.","execution_plan":"Split into child post jobs."},
    ]
    for c in cards:
        r=post('/api/task-cards', c); print(f"Created card {r['id']}: {r['title']}")
if __name__=='__main__': main()
