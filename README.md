# SocialForge AI

**Local-first AI command center for social media planning, content generation, review, and scheduling.**

SocialForge AI helps creators, teams, and operators turn ideas into structured social media workflows. It is designed for people who want AI help without losing control of the process.

```txt
Plan the work.
Generate the content.
Review the output.
Schedule the action.
Keep the workflow visible and auditable.
```

This is not a black-box auto-poster. SocialForge AI is a local-first command center where you can see what is happening, decide what gets approved, and keep a record of meaningful actions.

![SocialForge AI hero](docs/assets/hero.svg)

## Current status

SocialForge AI is an early experimental MVP.

It is currently **draft-first** and **local-schedule-only**. It does not publish to live social platforms yet.

That is intentional. Publishing is a higher-consequence feature and should only be added after the planning, review, approval, scheduling, and audit layers are dependable.

## What it does now

- Campaign and content planning
- Structured AI task setup
- Local model-assisted drafting
- Fallback draft generation when no model is running
- Draft review and approval workflow
- Visual workflow board
- Calendar scheduling surface
- Editable platform previews
- Platform-specific character counts and preview rules
- X thread split preview
- Hashtag and link detection
- Raw creative sandbox flow
- Raw-to-safe promotion path
- Bulk job splitting into child jobs
- Local audit/history records
- FastAPI backend
- React/Vite frontend
- SQLite local database

## What it does not do yet

- Live social posting
- Platform credential storage
- Auto-publishing
- Real image/video model execution
- Full rich-text editor package
- Production multi-user auth

## Why this exists

Most AI content tools can create content quickly, but they often make the workflow hard to trust.

Users still need to know:

- What is the AI doing?
- What platform is this for?
- Is this approved?
- Is this scheduled?
- Is this safe to publish?
- What changed?
- Can I revise or recover it?
- What happens next?

SocialForge AI is built to make those questions visible.

## Core product model

```txt
Command Center  = overview and system health
Workflow Board  = work state and movement
Calendar        = time and scheduling layer
Task Object     = structured AI work setup
Inspector       = details, preview, approval, and history
Editor/Preview  = WYSIWYG-style output surface
AI Engine       = drafting, review, polish, repurposing
Scheduler       = future execution authority
Audit Log       = trust memory
```

Visual cards are used as handles for tasks and actions. They are one interaction method inside the broader command center.

## Interface areas

| Area | Purpose |
|---|---|
| Job Board | Move work through idea, drafting, review, approval, scheduling |
| New Task | Create a structured AI media task |
| Inspector | Edit setup, preview output, run actions, inspect history |
| Calendar | Schedule approved work locally |
| Health | Check backend/model/system status |

## Structured AI task setup

Instead of relying on one giant prompt, SocialForge AI uses structured setup fields:

1. Objective
2. Output Type
3. Brand / Project
4. Platform / Destination
5. Source Material
6. AI Role
7. Model Lane
8. Constraints
9. Workflow Rule
10. Execution Plan
11. Preview
12. History

This method makes AI work easier to repeat, inspect, and schedule.

## Example workflows

Standard content workflow:

```txt
Create content idea
→ Generate draft variants
→ Review draft
→ Approve selected output
→ Schedule locally
→ Inspect history
```

Raw creative workflow:

```txt
Create Raw Creative task
→ Generate raw material
→ Promote into safe version
→ Review
→ Approve
→ Schedule
```

Raw creative outputs cannot be scheduled directly.

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 20+
- npm
- Optional: Ollama running locally

### 1. Clone

```bash
git clone https://github.com/YOUR-USERNAME/socialforge-ai.git
cd socialforge-ai
```

### 2. Start backend

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8787
```

Backend:

```txt
http://localhost:8787
```

API docs:

```txt
http://localhost:8787/docs
```

### 3. Start frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

## Optional local model setup

If Ollama is running, the app can call a local model.

Example:

```bash
ollama run qwen2.5:3b
```

If Ollama is not running, SocialForge AI still works in local fallback mode.

## Suggested first demo

1. Open **New Task**.
2. Choose a template preset.
3. Create a social post task.
4. Generate output.
5. Open the Inspector.
6. Edit the preview.
7. Review it.
8. Approve it.
9. Schedule it locally.
10. Check the history panel.

Then test the raw safety path:

1. Create a raw creative task.
2. Generate raw material.
3. Try to schedule it.
4. Confirm the system blocks direct scheduling.
5. Promote it into a safe reviewed task.

## Repository structure

```txt
socialforge-ai/
  backend/                 FastAPI backend
  frontend/                React/Vite frontend
  docs/                    Architecture, roadmap, safety, launch docs
  scripts/                 Dev and preflight scripts
  .github/                 CI, issue templates, PR template
  README.md
  START_HERE.md
  ROADMAP.md
  CONTRIBUTING.md
  SECURITY.md
  CHANGELOG.md
  LICENSE
```

## Development commands

Backend tests:

```bash
cd backend
pytest -q
```

Frontend build:

```bash
cd frontend
npm install
npm run build
```

Repo preflight:

```bash
python scripts/repo_preflight.py
```

Seed demo data while backend is running:

```bash
python scripts/seed_demo_data.py
```

## Safety posture

- No live posting yet.
- No social credentials stored.
- Scheduling is local-only.
- Raw creative tasks are draft-only.
- Raw outputs must be promoted before approval/scheduling.
- Every meaningful task action should be inspectable and auditable.

See [`SECURITY.md`](SECURITY.md) and [`docs/SAFETY_MODEL.md`](docs/SAFETY_MODEL.md).

## Roadmap

Near-term:

- Richer WYSIWYG editor
- Saved brand presets
- Saved platform presets
- Full calendar integration
- Scheduler authority
- Better local model selector
- Controlled publisher architecture

Later:

- Platform adapters
- Credential vault
- Publish audit logs
- Rate-limit handling
- Media generation jobs
- Multi-brand workflows

See [`ROADMAP.md`](ROADMAP.md).

## Suggested GitHub topics

```txt
ai
local-ai
social-media
content-creation
creator-tools
automation
scheduling
fastapi
react
ollama
workflow
```

## License

MIT. See [`LICENSE`](LICENSE).
