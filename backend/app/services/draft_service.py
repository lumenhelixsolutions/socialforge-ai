import os
from app.services.ollama_client import OllamaClient
from app.services.brand_voice_service import get_brand, brand_context
from app.services.reviewer_service import review_content

def fallback_drafts(topic: str, platform: str, tone: str, count: int, lane: str) -> list[str]:
    raw_note = " Raw creative angle:" if lane == "raw" else ""
    templates = [
        f"{raw_note} {topic} — here is the practical truth people keep missing. Make it useful, not noisy.",
        f"{topic}: one clear idea, one human takeaway, and one reason it matters right now.",
        f"If you are thinking about {topic}, start here: simplify the goal, remove the noise, and build the next small proof.",
        f"The best content about {topic} does not shout. It clarifies the problem and gives people a next step.",
        f"Here is the angle on {topic}: make the system easier, safer, and more useful before making it bigger."
    ]
    return templates[:count]

def build_prompt(brand_text: str, topic: str, platform: str, goal: str, tone: str, count: int, lane: str) -> str:
    lane_instruction = (
        "Use bold creative ideation, but output only drafts. Do not include instructions for evasion, harassment, or harm."
        if lane == "raw"
        else "Use clear, platform-safe, useful social media language."
    )
    return f'''
You are a social media draft writer.

{brand_text}

Platform: {platform}
Topic: {topic}
Goal: {goal}
Tone: {tone}
Draft count: {count}
Lane: {lane}

Instruction: {lane_instruction}

Return {count} numbered drafts. Each should be concise and ready for review.
'''.strip()

def split_numbered_response(text: str, count: int) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    drafts = []
    current = []
    for line in lines:
        if line[:2].isdigit() or line.startswith(("- ", "* ")):
            if current:
                drafts.append(" ".join(current).strip())
                current = []
            current.append(line.lstrip("-* 0123456789.").strip())
        else:
            current.append(line)
    if current:
        drafts.append(" ".join(current).strip())
    drafts = [d for d in drafts if d]
    return drafts[:count] if drafts else []

async def generate_drafts(req):
    brand = get_brand(req.brand_id)
    brand_text = brand_context(brand)
    raw_sandbox = 1 if req.lane == "raw" else 0

    ollama = OllamaClient()
    health = await ollama.health()
    model = req.model or os.getenv("SAFE_MODEL") or "qwen2.5:3b"

    if health["ok"] and model:
        try:
            prompt = build_prompt(brand_text, req.topic, req.platform, req.goal, req.tone, req.count, req.lane)
            response = await ollama.generate(model, prompt)
            contents = split_numbered_response(response, req.count)
            if len(contents) < req.count:
                contents += fallback_drafts(req.topic, req.platform, req.tone, req.count - len(contents), req.lane)
        except Exception:
            contents = fallback_drafts(req.topic, req.platform, req.tone, req.count, req.lane)
    else:
        contents = fallback_drafts(req.topic, req.platform, req.tone, req.count, req.lane)

    results = []
    for content in contents[:req.count]:
        review = review_content(content, req.platform, brand)
        results.append({
            "content": content,
            "hook": content.split(".")[0][:120],
            "hashtags": "#localAI #contentOps #creatorTools",
            "score": review["score"],
            "clarity_score": review["clarity_score"],
            "tone_score": review["tone_score"],
            "platform_fit_score": review["platform_fit_score"],
            "claim_risk_score": review["claim_risk_score"],
            "legal_risk_score": review["legal_risk_score"],
            "spam_risk_score": review["spam_risk_score"],
            "brand_match_score": review["brand_match_score"],
            "risk_notes": review["risk_notes"],
            "raw_sandbox": raw_sandbox
        })
    return results
