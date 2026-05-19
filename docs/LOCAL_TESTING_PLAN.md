# Local Testing Plan

## Stage 1 — Preflight only

Run:

```bash
python scripts/preflight_check.py
```

Expected: all PASS.

## Stage 2 — Backend tests

Run:

```bash
cd backend
pytest -q
```

Expected: diagnostics, safe draft flow, raw promotion flow all pass.

## Stage 3 — Backend manual run

```bash
cd backend
uvicorn main:app --reload --port 8787
```

Open:

```txt
http://localhost:8787/api/diagnostics
```

## Stage 4 — Frontend run

```bash
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Stage 5 — Ollama test

```bash
ollama run qwen2.5:3b
```

Then refresh Models & Safety in the app.

## Stage 6 — Manual golden path

1. Create brand.
2. Generate safe draft pack.
3. Approve one draft.
4. Schedule one safe draft.
5. Generate raw draft.
6. Confirm raw draft cannot schedule directly.
7. Promote raw draft to safe.
8. Schedule promoted draft.
