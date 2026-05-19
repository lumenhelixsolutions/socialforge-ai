# API Reference

Backend base URL: `http://localhost:8787`

FastAPI docs: `http://localhost:8787/docs`

## Task Cards

```http
GET    /api/task-cards/meta
GET    /api/task-cards
POST   /api/task-cards
GET    /api/task-cards/{card_id}
PATCH  /api/task-cards/{card_id}
GET    /api/task-cards/{card_id}/preview
PATCH  /api/task-cards/{card_id}/move
POST   /api/task-cards/{card_id}/action
```

## Card actions

```txt
generate
review
polish
promote_raw
split_bulk
archive
```

## Move states

```txt
inbox
idea
drafting
needs_review
needs_edit
approved
scheduled
archived
```
