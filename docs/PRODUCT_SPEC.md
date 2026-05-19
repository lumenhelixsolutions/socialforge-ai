# Product Spec — Local Social Agent MVP 0.1

## Product vision

Build a local-first social media command center that lets the user create, review, approve, and schedule content with minimal friction.

The product should feel like:

```txt
Open WebUI + Notion + Buffer + Langflow, simplified for one creator/operator.
```

The goal is not to expose AI infrastructure. The goal is to help the user create useful content safely and quickly.

## Golden path

```txt
User opens app
→ app checks Ollama/model status
→ user creates/selects brand profile
→ user enters idea
→ app generates draft pack
→ reviewer scores drafts
→ user approves or edits one
→ draft moves to approval queue
→ user marks it scheduled
```

## MVP boundaries

Included:

- First-run guided setup
- Brand profiles
- Model lane selector
- Draft Lab
- Approval Queue
- Diagnostics
- Local SQLite storage
- Template fallback mode when no LLM is available
- Raw creative sandbox lane, draft-only

Excluded for MVP 0.1:

- Direct social posting
- Browser automation
- Multi-user auth
- Cloud deployment
- Full analytics
- Background autonomous engagement

## User roles

| Role | Description |
|---|---|
| Owner | The local operator who creates brands, drafts, and approvals |
| Agent | A bounded service that generates or reviews drafts |
| Publisher | Future locked service that posts only approved content |

## Key entities

| Entity | Purpose |
|---|---|
| BrandProfile | Stores tone, audience, forbidden claims, preferred vocabulary |
| Campaign | Groups drafts around a strategic goal |
| Draft | A generated post candidate |
| Review | Risk/tone/platform score |
| ScheduleSlot | Future target date/time/platform |
| AuditEvent | Immutable record of meaningful state changes |

## Definition of done for MVP 0.1

The MVP is done when:

1. The app boots without manual configuration beyond Python/npm install.
2. Diagnostics can detect Ollama present/missing.
3. A user can create a brand.
4. A user can generate at least five drafts from one idea.
5. Drafts receive reviewer scores.
6. Drafts can be approved/rejected/archived/scheduled.
7. The app works without social credentials.
8. Raw creative lane cannot publish.
9. All major failures show plain-English remediation.
