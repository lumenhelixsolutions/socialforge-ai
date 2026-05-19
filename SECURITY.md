# Security Policy

Local Social Agent is an experimental local-first app. It is not production hardened.

## Current safety posture

The app currently does **not**:

- Store social media credentials
- Publish to live social platforms
- Auto-send posts
- Execute browser automation
- Expose a public multi-user service

## Important safety rules

- Raw creative cards must remain draft-only.
- Raw cards must be promoted into safe reviewed cards before approval/scheduling.
- Scheduling must not equal publishing.
- Publishing must remain a separate future service with approval gates.
- API credentials must never be exposed to AI agents directly.
- Secrets must not be committed.
