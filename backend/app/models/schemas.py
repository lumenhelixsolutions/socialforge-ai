from pydantic import BaseModel, Field
from typing import Optional, List

class BrandCreate(BaseModel):
    name: str
    voice: str = ""
    audience: str = ""
    forbidden_claims: str = ""
    preferred_words: str = ""

class Brand(BrandCreate):
    id: int

class DraftGenerateRequest(BaseModel):
    brand_id: Optional[int] = None
    platform: str = "x"
    topic: str
    goal: str = "engagement"
    tone: str = "clear, useful, human"
    audience: str = ""
    lane: str = Field(default="safe", pattern="^(safe|raw|reviewer|polish)$")
    count: int = Field(default=5, ge=1, le=10)
    model: Optional[str] = None

class DraftStatusUpdate(BaseModel):
    status: str = Field(pattern="^(draft|needs_edit|approved|scheduled|rejected|archived)$")

class CampaignCreate(BaseModel):
    name: str
    goal: str = ""
    brand_id: Optional[int] = None

class TaskCardCreate(BaseModel):
    title: str
    card_type: str = Field(default="post", pattern="^(campaign|bulk|post|image|video|review|polish|repurpose)$")
    objective: str = ""
    output_type: str = "post"
    brand_id: Optional[int] = None
    campaign_id: Optional[int] = None
    platform: str = "x"
    source_material: str = ""
    ai_role: str = "writer"
    model_lane: str = Field(default="safe", pattern="^(safe|raw|reviewer|polish|image|video)$")
    constraints: str = ""
    workflow_rule: str = "approval_required"
    execution_plan: str = ""
    preview: str = ""
    parent_card_id: Optional[int] = None

class TaskCardMove(BaseModel):
    target_state: str = Field(pattern="^(inbox|idea|drafting|needs_review|needs_edit|approved|scheduled|archived)$")
    scheduled_at: Optional[str] = None
    timezone: str = "America/New_York"

class TaskCardAction(BaseModel):
    action: str = Field(pattern="^(generate|review|polish|promote_raw|split_bulk|archive)$")
    model: Optional[str] = None


class TaskCardUpdate(BaseModel):
    title: Optional[str] = None
    objective: Optional[str] = None
    output_type: Optional[str] = None
    platform: Optional[str] = None
    source_material: Optional[str] = None
    ai_role: Optional[str] = None
    model_lane: Optional[str] = None
    constraints: Optional[str] = None
    workflow_rule: Optional[str] = None
    execution_plan: Optional[str] = None
    preview: Optional[str] = None
