# SocialForge AI — Codebase Guide

Local-first AI social media command center. FastAPI backend + React/Vite frontend + SQLite.

## Quick start

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8787

# Frontend
cd frontend && npm install
npm run dev   # http://localhost:5173
```

## Architecture

```
backend/
  main.py                     FastAPI app, CORS, lifespan
  app/
    api/
      brands.py               CRUD: GET/POST/PATCH/DELETE /api/brands
      campaigns.py            CRUD: GET/POST/PATCH/DELETE /api/campaigns
      diagnostics.py          GET /api/diagnostics, /api/stats, /api/audit-log
      drafts.py               POST /api/drafts/generate, GET/PATCH /api/drafts
      models.py               GET /api/models (Ollama)
      task_cards.py           Full CRUD + move/action/duplicate/export
    db/
      database.py             SQLite connection, get_conn(), rows_to_dicts()
      schema.sql              Table definitions (auto-applied on init_db())
    models/
      schemas.py              Pydantic request/response models
    services/
      task_card_service.py    Core business logic: create, update, move, action, duplicate, delete
      draft_service.py        Draft generation with Ollama or fallback
      brand_voice_service.py  Brand context injection into AI prompts
      reviewer_service.py     Risk scoring and review logic
      ollama_client.py        Ollama HTTP client wrapper
      diagnostics_service.py  Health checks (DB, Ollama, disk)

frontend/src/
  App.jsx                     Root component (~120 lines): state, refresh, routing
  lib/
    api.js                    All fetch calls; single `api` export object
    constants.js              columns, cardTypes, outputTypes, aiRoles, modelLanes, fallbacks
    utils.js                  readableError, guardedMove, transitionMessage, getPlatformRule, analyzePreview
  components/
    ErrorBoundary.jsx         Class component; wraps entire app for crash recovery
    ToastContainer.jsx        Overlay toasts with auto-dismiss
    JobBoard.jsx              Board + BoardColumn + SortableTaskCard (DnD)
    JobInspector.jsx          Inspector aside: Setup/Preview/Actions/History tabs
    TaskCard.jsx              Single task card tile (shared by JobBoard + CampaignsManager)
    TaskCardCreator.jsx       New card form + SetupStep + PresetsPanel
    BrandsManager.jsx         Brand CRUD UI
    CampaignsManager.jsx      Campaign CRUD UI (imports TaskCard)
    CalendarSurface.jsx       7-day queue + slot picker scheduler
    Health.jsx                4-panel grid: diagnostics / stats / models / audit log
    DraftsStudio.jsx          Draft generation form + DraftCard list
  styles.css                  Single global stylesheet (dark theme)
```

## Core data model

**task_cards** — the central entity. Key fields:
- `workflow_state`: `inbox → idea → drafting → needs_review → needs_edit → approved → scheduled → archived`
- `approval_state`: `pending_review | under_review | approved | needs_edit`
- `model_lane`: `safe | raw | reviewer | polish | image | video`
- `card_type`: `post | image | video | campaign | bulk | review | polish | repurpose`

**audit_events** — every meaningful state change is logged here with `entity_type`, `entity_id`, `action`, `before_state`, `after_state`.

## Running tests

```bash
cd backend
python -m pytest tests/ -v
```

22 tests across three files. Tests share a file-based test DB (`tests/test_local_social_agent.db`). Use `uuid.uuid4().hex[:8]` prefixes for any names to avoid collision on repeat runs.

## Key patterns

**API calls** — all go through `api.js`. Add new endpoints there first.

**State transitions** — always use `guardedMove()` from `utils.js` for user-confirmed moves; it calls `api.moveTaskCard()`.

**Error display** — use `readableError(err)` to unwrap FastAPI `{"detail": "..."}` responses.

**Toasts** — `addToast(message, type)` passed down from App; types: `"success"`, `"info"`, `"error"`.

**Backend service layer** — API routes stay thin; all logic lives in `app/services/`. Routes import from services, never from other routes.

**DB access** — use `get_conn()` context manager; `rows_to_dicts()` to convert sqlite3.Row to plain dicts.

## Environment

- Backend default port: `8787`
- Frontend default port: `5173`
- Database: `backend/local_social_agent.db` (created on first run)
- Ollama: optional; `http://localhost:11434` — app works without it (fallback content)
- Frontend API base: `VITE_API_BASE` env var, defaults to `http://localhost:8787`
