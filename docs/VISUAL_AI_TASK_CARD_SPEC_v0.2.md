# Visual AI Task Card System Spec v0.2

## Doctrine

A card is a visible, inspectable, schedulable, programmable AI work order.

The card is the central visual object the user can click, move, schedule, approve, and trust. The inspector is where the structured AI task setup lives.

## Standard card setup method

Every card follows the same setup method:

1. Objective
2. Output Type
3. Brand / Project
4. Platform / Destination
5. Source Material
6. AI Role
7. Model Lane
8. Constraints
9. Workflow Rule
10. Execution Plan
11. Preview
12. History

## Product model

```txt
Board      = workflow map
Calendar   = time map
Card       = central visible/control object
Inspector  = structured task-programming and trust panel
Editor     = WYSIWYG output surface
AI         = production engine behind card actions
Scheduler  = timing/execution authority
Audit log  = card history
```

## Hierarchy

```txt
Campaign Card
  → Bulk Job Card
      → Post / Image / Video / Review / Polish Job Card
          → Execution Attempt
```

Bulk cards plan. Individual cards execute. Execution attempts record truth.

## MVP 0.2 scope

Implemented:

- Task card database model
- Card creation API
- Card board
- Card inspector
- Structured task setup form
- Generate/review/promote/split/archive actions
- Calendar scheduler mock
- Raw-to-safe promotion
- Local schedule state without publishing

Not yet implemented:

- True drag/drop
- Full WYSIWYG editor
- Full calendar grid
- Live social posting
- Background scheduler execution
- Platform credential vault
