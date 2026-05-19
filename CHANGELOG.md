# Changelog

## v0.3.2 — Quality + Polish Foundation

- **Campaigns Management UI**: new Campaigns tab (FolderKanban icon) with list of campaigns, expandable per-campaign card view, open/close status toggle, and create form; campaign dropdown added to New Card step 2
- **Inspector tab navigation**: JobInspector split into Setup / Preview / Actions / History tabs; risk score and state badges shown in header; no longer a single scrolling column
- **Saved presets panel**: localStorage-backed platform+role+constraints+execution presets in New Card form; save, load by name, and delete presets
- **Campaigns backend**: `GET /api/campaigns/{id}` returns campaign with its task cards; `PATCH /api/campaigns/{id}` updates name/goal/status
- **`needs_edit` board column**: cards sent for revision now appear in the correct board column (was silently falling back to "idea")
- **Card export/import**: `GET /api/task-cards/{id}/export` endpoint; Export button in inspector Actions tab; JSON import panel in New Card form pre-fills all fields
- **EditablePreviewPanel**: auto-resize textarea, platform field hint chips from meta endpoint, character progress bar (warn at 80%, over at 100%)
- **JobInspector loading states**: Generate/Polish/Review buttons disable and relabel while in flight; Polish (Wand2) and Send-to-Edit (Pencil) buttons
- Platform-aware fallback drafts: each platform gets appropriately formatted fallback content when Ollama is unavailable
- `polish` card action: refines existing draft content through local model, then moves card to `needs_review`; gracefully falls back to original content if model is unavailable
- Brand context now applied to all `review_content` calls in task card flows (move-to-review, review action, generate action)
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
