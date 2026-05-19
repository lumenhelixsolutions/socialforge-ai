# Changelog

## [Unreleased] — v0.3.4

- **Pinned cards**: `pinned INTEGER` column on task_cards (auto-migrated); pin/unpin button in inspector Actions tab; pinned cards sort to top of each board column; pin indicator chip on card tile
- **Bulk "Select all visible"**: in bulk-select mode, "All visible" button selects every card currently shown after filters are applied
- **Dismissable error banner**: error div in main workspace now has an × button to clear it; styled with red border and close affordance
- **`/api/stats` enhanced**: returns `cards_by_platform`, `cards_by_lane`, and `reviewed_cards` count in addition to `cards_by_state`
- **Bulk-select on board**: "Select" mode toggle in board header; checkbox on each card when active; floating bulk action bar with state picker and "Move selected" button; calls `POST /api/task-cards/bulk-move`
- **`POST /api/task-cards/bulk-move`**: accepts `{ids: [...], target_state}`, returns `{moved, errors, moved_count}`; partial failures reported per-card without aborting the batch
- **Tag filter on board**: when any cards have tags, a tag dropdown appears in the board filter bar; filters to cards containing that exact tag; tag text also searched in the query search
- **Tags in inspector read view**: tag chips shown in Setup tab below card header badges (no edit required to see them)
- **Campaign progress chips**: when a campaign is expanded, a row of coloured state chips shows how many cards are in each workflow state (approved=green, scheduled=blue, needs_review=yellow, needs_edit=red)
- **Reviewer notes badge**: board task cards show a 📝 badge when `reviewer_notes` is set; hovering shows the notes content as tooltip
- **Schema validation hardened**: `TaskCardUpdate.card_type`, `.platform`, `.model_lane`, `.workflow_rule` fields now carry Pydantic pattern validators matching the allowed values; invalid patches return 422
- **Tests expanded to 30**: 4 new bulk-move tests covering full success, partial failure, invalid state (422), and empty ids (422)

## v0.3.3 — Stability, Observability, and Code Quality

- **Frontend component split**: App.jsx (2000-line monolith) extracted into 9 focused component files under `src/components/`; shared utilities in `src/lib/utils.js`; constants in `src/lib/constants.js`; App.jsx reduced to ~120 lines of composition
- **Duplicate API key fix**: `models` key appeared twice in `api.js`; second definition removed
- **Error boundary**: `ErrorBoundary` class component wraps entire app; render crashes show recovery UI with "Try again" button instead of a blank screen
- **Toast system**: `addToast(message, type)` with 4.5s auto-dismiss; `ToastContainer` overlay; success/info/error variants; used for card duplication and deletion feedback
- **Card duplication**: `POST /api/task-cards/{id}/duplicate` copies all config fields, clears review state, appends " (copy)" to title, audits as `created_as_duplicate`; Duplicate button in inspector Actions tab fires success toast
- **Campaign deletion**: `DELETE /api/campaigns/{id}` nulls `campaign_id` on linked task cards before deleting; Trash2 button in CampaignsManager header with confirmation dialog
- **Global audit log**: `GET /api/audit-log?limit=N` joins `audit_events` with `task_cards` for `card_title`; displayed in Health tab Recent Activity panel
- **Stats endpoint**: `GET /api/stats` returns `cards_by_state` counts + brands/campaigns/active_drafts totals
- **Health tab overhaul**: rewritten as 4-panel grid — Diagnostics checks, Board stats (8-state breakdown), Local models list, Recent activity (40 events)
- **fix**: `card_type` added to `update_task_card()` allowed list (was present in `TaskCardUpdate` schema but missing from service layer)
- **Task card deletion**: `DELETE /api/task-cards/{id}` permanently removes a card and its audit history; decrements parent child_count; Delete button in inspector Actions tab
- **Hide archived toggle**: board filter bar gains "Archived (N)" toggle button; archived cards hidden by default so the board stays clean
- **Model picker in inspector**: when Ollama is online and returns models, a Model dropdown appears in the Actions tab; selected model passed to Generate and Polish actions via `cardAction(id, action, model)`
- **Campaign inline editing**: each campaign card has an Edit button that expands an inline name/goal form, saving via PATCH
- **Backend test suite expanded**: 13 new tests in `test_new_endpoints.py` covering brand update/delete, campaign get-by-id/update, task card export, card deletion, and card_type update
- **Inspector card editing**: Setup tab now has an Edit button; opens inline form for title, card_type, output_type, platform, ai_role, model_lane, workflow_rule, objective, constraints, execution_plan, source_material; saves via PATCH; source_material shown as collapsible details in read-only view
- **Draft → Task Card**: DraftCard "→ Create Task Card" button creates a task card directly from draft content (content→preview+source_material, topic→title, platform/brand preserved), then navigates to the new card on the board
- **Job board search/filter**: filter bar above board with text search (title/objective/preview), platform dropdown, and lane dropdown; Clear button when any filter is active; column headers show card count badge
- **Brand editing and deletion**: inline edit form per brand card; delete with confirmation (nulls brand_id on linked task cards); `PATCH /api/brands/{id}` and `DELETE /api/brands/{id}` endpoints
- **Calendar overhaul**: fixed major bug where all approved cards appeared as scheduling buttons on every day; new layout with "Ready to schedule" queue on left, 7-day grid on right, per-day slot picker with time selection, unschedule (return to Approved) per scheduled card
- **Drafts Studio**: new Drafts tab with topic-brief form (platform, lane, brand, goal, tone, count), AI generation via `/api/drafts/generate`, expandable draft cards with score breakdown per sub-dimension, status management, raw→safe promotion

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
