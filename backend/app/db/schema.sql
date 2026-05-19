CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    voice TEXT NOT NULL DEFAULT '',
    audience TEXT NOT NULL DEFAULT '',
    forbidden_claims TEXT NOT NULL DEFAULT '',
    preferred_words TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER,
    platform TEXT NOT NULL,
    topic TEXT NOT NULL,
    lane TEXT NOT NULL DEFAULT 'safe',
    content TEXT NOT NULL,
    hook TEXT NOT NULL DEFAULT '',
    hashtags TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL DEFAULT 0,
    clarity_score INTEGER NOT NULL DEFAULT 0,
    tone_score INTEGER NOT NULL DEFAULT 0,
    platform_fit_score INTEGER NOT NULL DEFAULT 0,
    claim_risk_score INTEGER NOT NULL DEFAULT 0,
    legal_risk_score INTEGER NOT NULL DEFAULT 0,
    spam_risk_score INTEGER NOT NULL DEFAULT 0,
    brand_match_score INTEGER NOT NULL DEFAULT 0,
    risk_notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    raw_sandbox INTEGER NOT NULL DEFAULT 0,
    promoted_from_draft_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    goal TEXT NOT NULL DEFAULT '',
    brand_id INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    action TEXT NOT NULL,
    before_state TEXT,
    after_state TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    card_type TEXT NOT NULL DEFAULT 'post',
    objective TEXT NOT NULL DEFAULT '',
    output_type TEXT NOT NULL DEFAULT 'post',
    brand_id INTEGER,
    campaign_id INTEGER,
    platform TEXT NOT NULL DEFAULT 'x',
    source_material TEXT NOT NULL DEFAULT '',
    ai_role TEXT NOT NULL DEFAULT 'writer',
    model_lane TEXT NOT NULL DEFAULT 'safe',
    constraints TEXT NOT NULL DEFAULT '',
    workflow_rule TEXT NOT NULL DEFAULT 'approval_required',
    execution_plan TEXT NOT NULL DEFAULT '',
    preview TEXT NOT NULL DEFAULT '',
    workflow_state TEXT NOT NULL DEFAULT 'idea',
    approval_state TEXT NOT NULL DEFAULT 'not_reviewed',
    schedule_state TEXT NOT NULL DEFAULT 'unscheduled',
    scheduled_at TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    risk_score INTEGER NOT NULL DEFAULT 0,
    reviewer_notes TEXT NOT NULL DEFAULT '',
    automation_level TEXT NOT NULL DEFAULT 'semi_auto',
    parent_card_id INTEGER,
    child_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (parent_card_id) REFERENCES task_cards(id)
);

CREATE INDEX IF NOT EXISTS idx_task_cards_state ON task_cards(workflow_state);
CREATE INDEX IF NOT EXISTS idx_task_cards_schedule ON task_cards(schedule_state, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_task_cards_parent ON task_cards(parent_card_id);
