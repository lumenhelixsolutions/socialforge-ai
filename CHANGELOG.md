# Changelog

## v0.3.2 — Quality + Polish Foundation

- Platform-aware fallback drafts: each platform (X, LinkedIn, Instagram, TikTok, Mastodon, YouTube) now gets appropriately formatted fallback content when Ollama is unavailable
- `polish` card action: refines existing draft content through local model, then moves card to `needs_review`; gracefully falls back to original content if model is unavailable
- Brand context now applied to all `review_content` calls in task card flows (move-to-review, review action, generate action) — brand preferred words and forbidden claims now score correctly for task cards
- `campaigns.py`: added error handling on create to return proper HTTP 400 instead of raw DB errors
- `diagnostics_service.py`: use `.get()` for safe model health dict access
- `task_card_service.py`: archive action now uses `TaskCardMove` schema instead of an anonymous class object

## v0.3.1 — First Public GitHub Stack

Initial public repository stack for SocialForge AI.

Includes:

- Local-first FastAPI backend
- React/Vite frontend
- SQLite local database
- Visual workflow board
- Structured AI task setup
- Editable platform previews
- Calendar scheduling surface
- Raw creative sandbox flow
- Raw-to-safe promotion
- Bulk job splitting
- Local audit/history display
- GitHub Actions CI
- Issue templates
- Pull request template
- Security policy
- Launch documentation

## v0.2.2 — WYSIWYG + Platform Preview Foundation

- Editable preview saving
- Platform-specific preview shells
- Character counts and limit warnings
- Hashtag/link detection
- X thread split preview
- Task templates metadata
- Backend preview-analysis tests

## v0.2.1 — Interaction Foundation

- Drag/drop between workflow columns
- Transition confirmations
- Calendar scheduling surface
- Audit/history display
- FastAPI lifespan startup

## v0.2.0 — Structured Task Foundation

- Task object model
- Task API/service layer
- Workflow board
- Inspector
- Raw-to-safe promotion
- Bulk split behavior

## v0.1.x — Draft-first Prototype

- FastAPI backend
- React/Vite frontend
- Draft generation fallback
- Approval queue
- Local test reports
