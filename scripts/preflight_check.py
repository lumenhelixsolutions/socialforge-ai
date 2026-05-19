#!/usr/bin/env python3
"""Local Social Agent MVP preflight check.

Run from repository root:

    python scripts/preflight_check.py

This script avoids external network calls. It validates the local scaffold before the user
starts backend/frontend services.
"""
from __future__ import annotations

import json
import os
import py_compile
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_PATHS = [
    "README.md",
    "backend/main.py",
    "backend/requirements.txt",
    "backend/app/db/schema.sql",
    "backend/app/api/drafts.py",
    "frontend/package.json",
    "frontend/src/App.jsx",
    "docs/PRODUCT_SPEC.md",
    "docs/SAFETY_POLICY.md",
]


def ok(name: str, message: str = ""):
    print(f"[PASS] {name}{': ' + message if message else ''}")


def fail(name: str, message: str):
    print(f"[FAIL] {name}: {message}")
    raise SystemExit(1)


def check_paths():
    missing = [p for p in REQUIRED_PATHS if not (ROOT / p).exists()]
    if missing:
        fail("required files", ", ".join(missing))
    ok("required files")


def check_python_compile():
    files = list((ROOT / "backend").rglob("*.py")) + [ROOT / "scripts" / "smoke_test_backend.py"]
    for file in files:
        py_compile.compile(str(file), doraise=True)
    ok("python compile", f"{len(files)} files")


def check_frontend_versions():
    pkg = json.loads((ROOT / "frontend" / "package.json").read_text(encoding="utf-8"))
    bad = [name for name, version in pkg.get("dependencies", {}).items() if version == "latest" or version.startswith("^")]
    if bad:
        fail("frontend dependency pinning", f"unpinned dependencies: {bad}")
    ok("frontend dependency pinning")


def check_backend_import_and_db():
    env = dict(os.environ)
    env["LOCAL_SOCIAL_AGENT_DB"] = str(ROOT / "backend" / "data" / "preflight_check.db")
    code = "from app.db.database import init_db, DB_PATH; init_db(); print(DB_PATH)"
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=ROOT / "backend",
        env=env,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        fail("backend import/db init", result.stderr.strip())
    ok("backend import/db init", result.stdout.strip())


def check_docs_safety():
    safety = (ROOT / "docs" / "SAFETY_POLICY.md").read_text(encoding="utf-8").lower()
    required = ["no autonomous agent", "raw creative sandbox", "publisher service"]
    missing = [term for term in required if term not in safety]
    if missing:
        fail("safety policy", f"missing terms: {missing}")
    ok("safety policy")


def main():
    print("Local Social Agent MVP 0.1.1 preflight")
    print(f"Repo: {ROOT}")
    check_paths()
    check_python_compile()
    check_frontend_versions()
    check_backend_import_and_db()
    check_docs_safety()
    print("\nPreflight complete. Next: cd backend && pytest -q")


if __name__ == "__main__":
    main()
