RISK_TERMS = {
    "claim": ["guaranteed", "always", "never", "proven", "cure"],
    "legal": ["illegal", "sue", "criminal", "fraud", "defamatory"],
    "spam": ["buy now", "limited time", "click here", "100%", "get rich"],
    "privacy": ["dox", "expose private", "address", "phone number"],
    "harassment": ["harass", "threat", "destroy them"],
}

def _hits(content: str, terms: list[str]) -> list[str]:
    lower = content.lower()
    return [term for term in terms if term in lower]

def _bounded(value: int) -> int:
    return max(0, min(100, value))

def review_content(content: str, platform: str = "x", brand: dict | None = None) -> dict:
    lower = content.lower()
    length = len(content)

    claim_hits = _hits(lower, RISK_TERMS["claim"])
    legal_hits = _hits(lower, RISK_TERMS["legal"] + RISK_TERMS["privacy"] + RISK_TERMS["harassment"])
    spam_hits = _hits(lower, RISK_TERMS["spam"])

    clarity_score = _bounded(92 - (15 if length < 40 else 0) - (8 if length > 700 else 0))
    tone_score = 86
    platform_fit_score = 90
    if platform in {"x", "twitter"} and length > 280:
        platform_fit_score -= 18
    if platform == "linkedin" and length < 80:
        platform_fit_score -= 8

    claim_risk_score = _bounded(100 - len(claim_hits) * 18)
    legal_risk_score = _bounded(100 - len(legal_hits) * 22)
    spam_risk_score = _bounded(100 - len(spam_hits) * 18)

    brand_match_score = 75
    if brand:
        preferred = [w.strip().lower() for w in brand.get("preferred_words", "").replace(",", " ").split() if w.strip()]
        if preferred:
            matches = sum(1 for word in preferred if word in lower)
            brand_match_score = _bounded(70 + matches * 8)
        forbidden = [w.strip().lower() for w in brand.get("forbidden_claims", "").split(",") if w.strip()]
        if any(term and term in lower for term in forbidden):
            brand_match_score = max(0, brand_match_score - 25)

    category_scores = {
        "clarity_score": clarity_score,
        "tone_score": tone_score,
        "platform_fit_score": platform_fit_score,
        "claim_risk_score": claim_risk_score,
        "legal_risk_score": legal_risk_score,
        "spam_risk_score": spam_risk_score,
        "brand_match_score": brand_match_score,
    }
    overall = int(sum(category_scores.values()) / len(category_scores))

    notes = []
    if claim_hits:
        notes.append("Claim-risk terms: " + ", ".join(claim_hits))
    if legal_hits:
        notes.append("Legal/privacy/harassment-risk terms: " + ", ".join(legal_hits))
    if spam_hits:
        notes.append("Spam-risk terms: " + ", ".join(spam_hits))
    if platform in {"x", "twitter"} and length > 280:
        notes.append("May need shortening for X.")
    if not notes:
        notes.append("No major MVP review flags.")

    return {
        "score": overall,
        **category_scores,
        "risk_notes": " ".join(notes)
    }
