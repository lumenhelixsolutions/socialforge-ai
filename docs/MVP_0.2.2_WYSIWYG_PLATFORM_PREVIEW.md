# MVP 0.2.2 — WYSIWYG + Platform Preview Polish

## Completed

1. Added editable preview saving through `PATCH /api/task-cards/{id}`.
2. Added platform preview analysis:
   - character count
   - max character limit
   - over-limit warning
   - hashtag detection
   - link detection
   - X thread split preview
3. Added platform-specific preview shells:
   - X
   - LinkedIn
   - Instagram
   - Mastodon
   - YouTube
   - TikTok
4. Added card template presets for common AI tasks.
5. Added backend metadata for templates and platform preview rules.
6. Added tests for card update and platform preview.

## Design principle

The card remains the visible handle. The inspector is the structured task-programming interface. The preview editor is the first WYSIWYG layer.

## Still intentionally excluded

- Live social posting
- Full Tiptap editor
- FullCalendar integration
- Image/video model execution
- Platform credential vault

## Recommended next pass

MVP 0.2.3 should add a richer editor and reusable brand/platform presets, or MVP 0.3 should begin controlled publisher architecture.
