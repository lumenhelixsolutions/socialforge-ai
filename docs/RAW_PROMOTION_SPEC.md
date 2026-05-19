# Raw Draft Promotion Spec

## Problem

Raw/obliterated model output may be creatively valuable, but it must not enter the scheduling/publishing path directly.

## Solution

Raw drafts use this path:

```txt
raw draft → promote-safe route → reviewed safe draft → needs_edit → approved → scheduled
```

The original raw draft is archived. The promoted safe draft receives a new ID and has:

```txt
lane = safe
raw_sandbox = 0
status = needs_edit
promoted_from_draft_id = original raw draft ID
```

## Why this matters

This preserves creative freedom while maintaining a controlled publication boundary.
