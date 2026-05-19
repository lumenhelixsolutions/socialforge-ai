# Manual MVP Smoke Test

1. Start backend.
2. Visit `/api/diagnostics`.
3. Confirm JSON response.
4. Create a brand with `POST /api/brands`.
5. Generate drafts with `POST /api/drafts/generate`.
6. Update a draft status with `PATCH /api/drafts/{id}/status`.
7. Try scheduling a raw draft and confirm it is blocked.
