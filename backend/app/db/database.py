import os
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(os.getenv("LOCAL_SOCIAL_AGENT_DB", "data/local_social_agent.db"))

DRAFT_COLUMN_MIGRATIONS = {
    "clarity_score": "INTEGER NOT NULL DEFAULT 0",
    "tone_score": "INTEGER NOT NULL DEFAULT 0",
    "platform_fit_score": "INTEGER NOT NULL DEFAULT 0",
    "claim_risk_score": "INTEGER NOT NULL DEFAULT 0",
    "legal_risk_score": "INTEGER NOT NULL DEFAULT 0",
    "spam_risk_score": "INTEGER NOT NULL DEFAULT 0",
    "brand_match_score": "INTEGER NOT NULL DEFAULT 0",
    "promoted_from_draft_id": "INTEGER",
}

TASK_CARD_COLUMN_MIGRATIONS = {
    "tags": "TEXT NOT NULL DEFAULT ''",
    "pinned": "INTEGER NOT NULL DEFAULT 0",
}

def _ensure_column(conn, table: str, name: str, definition: str):
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    existing = {row[1] for row in rows}
    if name not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    schema_path = Path(__file__).with_name("schema.sql")
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(schema_path.read_text(encoding="utf-8"))
        for column, definition in DRAFT_COLUMN_MIGRATIONS.items():
            _ensure_column(conn, "drafts", column, definition)
        for column, definition in TASK_CARD_COLUMN_MIGRATIONS.items():
            _ensure_column(conn, "task_cards", column, definition)
        conn.commit()

@contextmanager
def get_conn():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def rows_to_dicts(rows):
    return [dict(row) for row in rows]
