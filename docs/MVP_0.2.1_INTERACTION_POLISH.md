# MVP 0.2.1 — Interaction Polish

## Completed

1. Converted FastAPI startup from deprecated `on_event` to lifespan style.
2. Added dnd-kit dependencies and real drag/drop between board columns.
3. Added confirmation dialogs for meaningful state changes.
4. Added a stronger calendar scheduler surface with seven-day scheduling slots.
5. Added card history in the Job Inspector from `audit_events`.

## Design choice

Drag/drop is now available, but it remains a convenience. The inspector buttons remain the contract.

Every meaningful card transition is confirmed and still validated by the backend.

## Still not implemented

- Live social posting
- True FullCalendar integration
- WYSIWYG editor package
- Background scheduler execution
- Platform credential vault

## Next recommended step

MVP 0.2.2 should focus on WYSIWYG editing and stronger platform previews before adding publishing.
