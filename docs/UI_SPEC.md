# Guided UI Spec

## UI ideology

The interface should behave like:

```txt
Tell me what you want to make. I will handle the machinery.
```

No first-time user should have to understand model endpoints, agents, vector databases, or queue workers.

## Primary navigation

| Screen | Purpose |
|---|---|
| Command Center | Daily status, drafts awaiting review, diagnostics |
| Draft Lab | Generate content from ideas, links, notes, or files |
| Approval Queue | Review, edit, approve, reject, schedule |
| Brand Profiles | Manage tone and rules per brand |
| Campaign Board | Kanban view for campaigns |
| Calendar | Schedule mockup in MVP |
| Model Settings | Local model lanes and health |
| Safety | Publishing, raw lane, and sandbox controls |

## First-run wizard

Steps:

1. Choose app mode: Draft-only, Scheduler, or Publisher-ready later
2. Create first brand
3. Choose default platform
4. Choose safe model
5. Choose reviewer model
6. Optional: enable raw creative sandbox
7. Run diagnostics

## Draft Lab form

Fields:

- Brand
- Platform
- Topic / idea
- Goal
- Audience
- Tone
- Lane: Safe Draft or Raw Creative
- Number of drafts
- Temperature / creativity level in Advanced mode only

Output:

- Draft cards
- Hook
- Body
- Hashtags
- Reviewer score
- Risk notes

## Approval Queue

Statuses:

```txt
draft → needs_edit → approved → scheduled → published
draft → rejected
draft → archived
```

MVP only supports up to scheduled. Published is reserved for future platform adapter.

## Diagnostics Panel

Must check:

- Backend reachable
- Database initialized
- Ollama reachable
- Safe model selected
- Reviewer model selected
- Raw model isolated
- Publisher disabled/enabled
- Storage path writable

## Progressive disclosure

Beginner mode shows:

- Brand
- Topic
- Tone
- Generate
- Review
- Approve

Advanced mode shows:

- System prompt
- Temperature
- Context length
- Model endpoint
- Agent route
- Debug trace
- JSON payload
