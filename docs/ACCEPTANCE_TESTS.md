# Acceptance Tests

## MVP golden path

```gherkin
Feature: Draft-first local social agent

Scenario: First useful session
  Given the backend is running
  And the database is initialized
  When the user opens the UI
  Then diagnostics are visible
  And the app explains whether Ollama is connected

Scenario: Brand creation
  Given the user is on Brand Profiles
  When the user creates a brand named "OIQ"
  Then the brand is saved
  And it can be selected in Draft Lab

Scenario: Draft generation without Ollama
  Given Ollama is not running
  When the user submits a topic in Draft Lab
  Then the app generates fallback template drafts
  And explains that local model mode is unavailable

Scenario: Draft generation with Ollama
  Given Ollama is running
  And a model is selected
  When the user submits a topic
  Then the backend returns five draft candidates
  And each draft has a reviewer score

Scenario: Raw creative lane isolation
  Given raw creative mode is enabled
  When a raw draft is generated
  Then it is marked as raw_sandbox=true
  And it cannot be scheduled directly
  And it must pass reviewer workflow first

Scenario: Approval queue
  Given drafts exist
  When the user approves a draft
  Then status changes to approved
  And an audit event is recorded

Scenario: No accidental publishing
  Given a draft is approved
  When the user clicks schedule
  Then the draft can become scheduled
  But no external platform API is called in MVP 0.1
```

## Non-functional tests

- App starts with clean database.
- App starts when Ollama is missing.
- Diagnostics endpoint never crashes.
- No `.env` secrets are committed.
- Raw lane has no publisher route.
- Draft status transitions are reversible up to MVP scope.
