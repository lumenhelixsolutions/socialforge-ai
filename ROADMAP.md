# Roadmap

## v0.3.1 — First Public GitHub Stack

Released.

- Public-ready repository structure
- SocialForge AI positioning
- Launch-grade README/docs
- GitHub Actions CI
- Issue templates and PR template
- Local-first social media workflow MVP
- Draft-first safety model

## v0.3.2 — Quality + Polish Foundation

In progress.

- Platform-aware fallback draft generation (each platform gets appropriate tone/format)
- `polish` card action: AI-assisted content refinement using local model
- Brand context applied consistently to all review and generate flows
- Proper error handling across all API routes
- Archive action uses typed payload instead of raw object hack
- Diagnostics service hardened against missing model health fields

Completed in this milestone:

- Better WYSIWYG editor (auto-resize, char bar, field hints)
- Saved brand presets UI (Brands tab, create/list brand profiles)
- Saved platform presets (localStorage-backed presets in New Card form)
- Better inspector layout (tab navigation: Setup / Preview / Actions / History)
- Import/export task JSON (GET /api/task-cards/{id}/export + JSON import panel)
- Campaigns management UI (Campaigns tab, expandable campaign cards, status toggle)
- `needs_edit` board column (was missing from frontend, cards silently fell back to "idea")

## v0.4.0 — Calendar + Scheduler Authority

- Full calendar integration
- One scheduler authority
- Recurring scheduled tasks
- Reschedule/retry behavior
- Scheduler audit logs

## v0.5.0 — Controlled Publisher Architecture

- Publisher service boundary
- Platform adapter interface
- Credential vault design
- Dry-run publisher mode
- Rate-limit model
- Publish approval gate
- Publish audit log

## v0.6.0 — First Platform Adapter

Candidate adapters:

- Mastodon for safer open testing
- X if traction matters more
- LinkedIn for professional content

## v0.7.0 — Media Jobs

- Image prompt tasks
- Video script tasks
- Carousel workflows
- Asset library
- Alt-text generation
- Media review workflow

## v1.0.0 — Social Media Command Center

- Local-first planning
- Multi-brand content workflows
- AI-assisted drafting/review/scheduling
- Controlled publishing
- Auditable history
- Production installer
