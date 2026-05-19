# Start Here

SocialForge AI is a local-first command center for AI-assisted social media workflows.

The product goal is:

```txt
Plan campaigns.
Generate content.
Review drafts.
Schedule actions.
Keep the workflow visible and auditable.
```

## First run

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8787
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## First thing to test

1. Create a task.
2. Generate content.
3. Review it.
4. Approve it.
5. Schedule it locally.
6. Inspect the history.

## Product stance

SocialForge AI is draft-first. It does not publish to live platforms yet.
