# Safety Model

## Current rule

SocialForge AI is draft-first.

No task publishes to a live platform in the current version.

## Why

Social media publishing is user-impacting, reputation-impacting, and sometimes legally sensitive. The system must prove review, approval, scheduling, and auditability before adding live publishing.

## Current safety boundaries

- No live posting.
- No platform credentials.
- Local scheduling only.
- Raw creative tasks are draft-only.
- Raw output must be promoted before approval/scheduling.
- Every meaningful task action should have history.

## Future publisher requirements

Before live publishing is added, the project needs:

1. Credential vault
2. Official platform adapter interface
3. Rate-limit handling
4. Approval gate
5. Dry-run mode
6. Publish audit log
7. Retry/failure model
8. Clear undo/recovery model where platforms allow it

## Agent rule

Agents reason. Tools act.

Publishing, deleting, replying, and editing live posts must be bounded tool actions, not free-form agent autonomy.
