# socialforge-ai

<p align="center">
  <a href="https://lumenhelix.com">
    <img src="docs/assets/lumenhelix-logo.svg" alt="LumenHelix Solutions" width="180">
  </a>
</p>

<h3 align="center">Local-first AI command center for social media planning, drafting, review, and scheduling</h3>

<p align="center">
  <a href="https://lumenhelixsolutions.github.io/socialforge-ai/">
    <img src="https://img.shields.io/badge/Launch_Page-socialforge-ai-00D4FF?style=flat-square&logo=githubpages&logoColor=white" alt="Launch Page">
  </a>
  <a href="https://lumenhelix.com">
    <img src="https://img.shields.io/badge/Built_by-LumenHelix-7C3AED?style=flat-square" alt="Built by LumenHelix">
  </a>
  <img src="https://img.shields.io/badge/license-MIT-8A95A8?style=flat-square" alt="License">
</p>

---

**socialforge-ai** is part of the [LumenHelix Solutions](https://lumenhelix.com) portfolio — applied symbolic dynamics & reversible computation for deterministic, traceable AI systems.

SocialForge AI is a local-first command center built by LumenHelix for social media planning, content generation, review, and scheduling. It uses a structured task setup, draft-first workflow, visual job board, calendar, and inspector so creators and teams know what the AI is doing, what platform it is for, and whether it is approved and scheduled before any content goes live.

## Why this exists

- **Trust the workflow.** Every task moves through visible states: idea, drafting, review, approval, scheduling.
- **Own your content.** Projects, drafts, and audit records stay in a local SQLite database.
- **Use any model.** Ollama integration with local fallback keeps you productive offline.

## Quick start

Install and run socialforge-ai in under two minutes.

### macOS / Linux

```bash
# Clone
git clone https://github.com/lumenhelixsolutions/socialforge-ai.git
cd socialforge-ai

# Install & run
# Backend (terminal 1)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8787

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

### Windows (PowerShell)

```powershell
# Clone
git clone https://github.com/lumenhelixsolutions/socialforge-ai.git
Set-Location socialforge-ai

# Install & run
# Backend (terminal 1)
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn main:app --reload --port 8787

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

### Windows (Git Bash / WSL)

```bash
git clone https://github.com/lumenhelixsolutions/socialforge-ai.git
cd socialforge-ai
# Backend (terminal 1)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8787

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

> **Device note:** socialforge-ai is tested on Windows 11, macOS Sonoma, Ubuntu 22.04/24.04, and modern mobile browsers.

## Full documentation

Visit the launch page for architecture, API reference, and deployment guides:  
**https://lumenhelixsolutions.github.io/socialforge-ai/**

## Features

| Feature | What it gives you |
|---------|-------------------|
| Structured task setup | Objective, output type, platform, constraints, model lane, and execution plan keep AI work repeatable. |
| Draft-first workflow | Generate variants, review, edit, approve, and schedule — no live posting without explicit approval. |
| Visual work board | Move tasks through idea, drafting, review, approval, and scheduling with drag-and-drop cards. |
| Local model support | Optional Ollama integration with local fallback so the app works even when no model server is running. |

## Architecture at a glance

```
socialforge-ai/
├── backend/   FastAPI + SQLite + local model adapter
├── frontend/  React + Vite + drag-and-drop job board
├── docs/      Architecture, safety model, API, and roadmap
└── scripts/   Preflight checks, smoke tests, and demo seeding
```

## Development

```bash
# Backend
cd backend && .venv/bin/uvicorn main:app --reload --port 8787

# Frontend (new terminal)
cd frontend && npm run dev
```

## Roadmap

- [ ] Rich WYSIWYG editor and saved brand/platform presets
- [ ] Full calendar integration and scheduler authority
- [ ] Controlled publisher architecture with audit logs

## Support & consulting

Need deterministic AI systems with full traceability? LumenHelix builds reversible computation kernels, governance layers, and end-to-end AI integrations.

- **Website:** https://lumenhelix.com
- **Services:** AI diagnostics, B.Y.O. support packages, governance audits
- **Research:** TEN² kernel, R.U.B.I.C. boundary discipline, C.O.R.E. constraint lens

## License

Released under the MIT License.

---

<p align="center">
  <sub>Engineered by <a href="https://lumenhelix.com">LumenHelix Solutions</a> — Applied Symbolic Dynamics & Reversible Computation.</sub>
</p>
