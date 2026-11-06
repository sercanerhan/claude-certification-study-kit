#!/usr/bin/env python3
"""One-step setup: fetch the sources this repo doesn't redistribute, then build the app's data.

  1. Download any missing source into vendor/ (official Anthropic exam guides, pinned community guide)
  2. Import their sample/practice questions             (tools/import_sources.py)
  3. Validate and build the question bank and cards      (tools/build_data.py)
  4. Build the fixed mock-exam forms, when inputs changed (tools/build_mocks.py)

Safe to re-run; ./start.sh runs it every time. Usage: python3 tools/setup.py [--refresh]
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def run(*args, quiet=False):
    r = subprocess.run([sys.executable, *args], cwd=ROOT, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip()
    lines = [l for l in out.splitlines() if not quiet or l.startswith(("WARN", "ERROR", "Downloading"))]
    if lines:
        print("\n".join("  " + l for l in lines))
    return r.returncode


def newest(paths):
    return max((p.stat().st_mtime for p in paths if p.exists()), default=0)


def main():
    if sys.version_info < (3, 9):
        sys.exit("Python 3.9 or newer is required.")
    if not shutil.which("pdftotext"):
        print("WARN pdftotext not found. Install poppler (macOS: brew install poppler, Debian/Ubuntu: apt install poppler-utils)")
        print("     to import the official exam-guide samples. Continuing with the other sources.")
    print("1/3 Fetching and importing sources ...")
    run("tools/import_sources.py", "--refresh" if "--refresh" in sys.argv else "--fetch-missing", quiet=True)
    print("2/3 Building the question bank ...")
    if run("tools/build_data.py", quiet=True) != 0:
        sys.exit("Data validation failed: run python3 tools/build_data.py to see the errors.")
    inputs = list(DATA.glob("questions.*.js")) + [DATA / "blueprint.js", DATA / "blueprint.dev.js", ROOT / "tools" / "build_mocks.py"]
    if not (DATA / "mocks.js").exists() or newest(inputs) > (DATA / "mocks.js").stat().st_mtime:
        print("3/3 Building the mock-exam forms ...")
        run("tools/build_mocks.py", "--force", quiet=True)
    else:
        print("3/3 Mock-exam forms are up to date.")
    print("Ready.")


if __name__ == "__main__":
    main()
