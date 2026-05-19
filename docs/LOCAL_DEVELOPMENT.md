# Local Development

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest -q
uvicorn main:app --reload --port 8787
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Full preflight

```bash
python scripts/repo_preflight.py
```

## Seed demo data

With the backend running:

```bash
python scripts/seed_demo_data.py
```
