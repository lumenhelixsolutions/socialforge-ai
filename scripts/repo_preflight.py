#!/usr/bin/env python3
from __future__ import annotations
import json, os, shutil, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def run(name, cmd, cwd=None, timeout=300):
    try:
        p=subprocess.run(cmd,cwd=cwd or ROOT,capture_output=True,text=True,timeout=timeout)
        return {"name":name,"ok":p.returncode==0,"exit":p.returncode,"output":(p.stdout+p.stderr)[-4000:]}
    except Exception as e:
        return {"name":name,"ok":False,"exit":-1,"output":str(e)}
def main():
    checks=[]
    checks.append({"name":"structure","ok":all((ROOT/p).exists() for p in ['backend/main.py','frontend/package.json','README.md']),"output":"Required files present"})
    checks.append(run('backend_compile',[sys.executable,'-m','py_compile','backend/main.py']))
    checks.append(run('backend_tests',[sys.executable,'-m','pytest','-q'],ROOT/'backend'))
    if shutil.which('npm'): checks.append(run('frontend_build',['npm','run','build'],ROOT/'frontend'))
    else: checks.append({"name":"frontend_build","ok":False,"output":"npm not found"})
    report={"project":"local-social-agent","preflight_ok":all(c['ok'] for c in checks),"checks":checks}
    print(json.dumps(report, indent=2))
    return 0 if report['preflight_ok'] else 1
if __name__=='__main__': raise SystemExit(main())
