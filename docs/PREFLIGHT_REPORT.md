# MVP 0.1.1 Preflight Report

## What this upgrade fixed

- Added a repository-level preflight script.
- Added backend golden-path tests.
- Pinned frontend dependency versions and generated `package-lock.json`.
- Added category reviewer scoring.
- Added raw-to-safe draft promotion.
- Added migration-safe draft columns for existing local SQLite databases.

## Remaining known limitations

- Docker runtime is not tested in this environment.
- Ollama live generation still requires the user's machine to have Ollama running.
- Social publishing is intentionally disabled.
- Frontend production build passes and npm audit reports 0 vulnerabilities, but the UI is still a scaffold, not a final polished commercial UI.
- The reviewer is deterministic and heuristic; a model-based reviewer comes later.

## Recommended user-side local test

```bash
python scripts/preflight_check.py
cd backend
pytest -q
uvicorn main:app --reload --port 8787
```

Then run frontend:

```bash
cd frontend
npm install
npm run dev
```
