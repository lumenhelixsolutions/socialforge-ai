# Roadmap

## Step 1 — Product spec and architecture

Completed in this package.

## Step 2 — Repo scaffold

Completed in this package.

## Step 3 — MVP implementation plan

Completed in this package.

## Next coding milestones

### Milestone A — Backend boot

- FastAPI starts
- SQLite initializes
- `/api/diagnostics` works
- `/api/brands` CRUD works
- `/api/drafts/generate` works in fallback mode

### Milestone B — Frontend boot

- Vite app starts
- Diagnostics panel reads backend
- Brand profile form works
- Draft Lab calls backend
- Approval queue displays drafts

### Milestone C — Ollama integration

- Detect models
- Select model lane
- Generate safe drafts
- Generate raw drafts with sandbox flag
- Reviewer scores drafts

### Milestone D — Scheduling mock

- Calendar UI
- Scheduled status
- Local-only scheduled posts
- No external posting

### Milestone E — One platform adapter

Recommended first adapter: Mastodon or X, but only after approval queue is stable.
