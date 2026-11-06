#!/usr/bin/env python3
"""Import practice questions from the official exam guide PDFs and the community guide.

These sources are not redistributed in this repository. They are downloaded from their original
publishers into vendor/ (git-ignored) on your machine, for personal study:
  - Official CCAR-F exam guide v1.0 (Anthropic Partner Academy) -> 12 sample questions
  - Official CCDV-F exam guide v1.0 (Anthropic Partner Academy) -> 3 sample questions (Developer mock)
  - Official CCAR-P exam guide v1.0 (reference only)
  - paullarionov/claude-certified-architect guide_en.md, pinned to the commit this project's
    question IDs and explanations were written against              -> 76 practice questions

Outputs data/questions.official.js, data/questions.community.js and data/questions.dev.official.js.
A source that is missing (download failed, no pdftotext) is skipped with a warning, so the app
still runs with the questions authored in this repository.

Usage:
  python3 tools/import_sources.py                 # parse files already in vendor/
  python3 tools/import_sources.py --fetch-missing # download only the sources not in vendor/ yet
  python3 tools/import_sources.py --refresh       # re-download every source
"""
import json
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENDOR = ROOT / "vendor"
DATA = ROOT / "data"

OFFICIAL_PDF = VENDOR / "official-ccar-f-exam-guide.pdf"
DEV_PDF = VENDOR / "official-ccdv-f-exam-guide.pdf"
PRO_PDF = VENDOR / "official-ccar-p-exam-guide.pdf"
COMMUNITY_MD = VENDOR / "community-guide_en.md"
COMMUNITY_COMMIT = "946cd28e67392cf645fb4e797b853ecadafafa60"  # guide_en.md as of Sep 9, 2026

SOURCES = {
    OFFICIAL_PDF: "https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf",
    DEV_PDF: "https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf",
    PRO_PDF: "https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542810%2FClaude+Certified+Architect+%E2%80%93+Professional+Exam+Guide.pdf",
    COMMUNITY_MD: f"https://raw.githubusercontent.com/paullarionov/claude-certified-architect/{COMMUNITY_COMMIT}/guide_en.md",
}

SCENARIOS = {
    "customer support": "S1",
    "code generation with claude code": "S2",
    "multi-agent research system": "S3",
    "developer productivity": "S4",
    "claude code for continuous integration": "S5",
    "claude code for ci": "S5",
    "multi-file code review": "S5",
    "structured data extraction": "S6",
    "conversational ai architecture patterns": "CAI",
}


def scenario_code(name):
    n = name.lower().strip()
    for key, code in SCENARIOS.items():
        if n.startswith(key):
            return code
    raise ValueError(f"Unknown scenario: {name!r}")


def have_pdftotext():
    return shutil.which("pdftotext") is not None


def fetch(only_missing):
    VENDOR.mkdir(exist_ok=True)
    for path, url in SOURCES.items():
        if only_missing and path.exists() and path.stat().st_size > 0:
            continue
        print(f"Downloading {path.name} ...")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "claude-certification-study-kit"})
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
            path.write_bytes(data)
        except Exception as e:  # network down, URL moved, ...
            print(f"  WARN could not download {path.name}: {e}")
    # Plain-text extracts used by the /tutor skill and the authoring guides.
    for pdf in (OFFICIAL_PDF, DEV_PDF, PRO_PDF):
        txt = pdf.with_suffix(".txt")
        if pdf.exists() and (not txt.exists() or txt.stat().st_mtime < pdf.stat().st_mtime):
            if have_pdftotext():
                subprocess.run(["pdftotext", "-layout", str(pdf), str(txt)], check=False)
            else:
                print(f"  WARN pdftotext not found, skipping {txt.name} (install poppler: brew install poppler / apt install poppler-utils)")


def join_lines(lines):
    return re.sub(r"\s+", " ", " ".join(l.strip() for l in lines)).strip()


def parse_official():
    text = subprocess.run(["pdftotext", str(OFFICIAL_PDF), "-"], capture_output=True, text=True, check=True).stdout
    section = text.split("9. Sample Questions", 1)[1].split("10. How the Exam Is Scored", 1)[0]
    lines = [l for l in section.splitlines() if l.strip() not in ("Claude Certification Program", "Exam guide", "")]

    questions, scenario, cur, part = [], None, None, None
    for line in lines:
        m_s = re.match(r"^Scenario: (.+)$", line)
        m_q = re.match(r"^Question (\d+): (.*)$", line)
        m_o = re.match(r"^([A-D])\. (.*)$", line)
        m_a = re.match(r"^Correct Answer: ([A-D])\. (.*)$", line)
        if m_s:
            scenario = scenario_code(m_s.group(1))
        elif m_q:
            cur = {"n": int(m_q.group(1)), "scenario": scenario, "stem": [m_q.group(2)], "options": {}, "answer": None, "expl": []}
            questions.append(cur)
            part = "stem"
        elif cur is None:
            continue
        elif m_a:
            cur["answer"] = m_a.group(1)
            cur["expl"].append(m_a.group(2))
            part = "expl"
        elif m_o and part in ("stem", "opt"):
            part = "opt"
            cur["_opt"] = m_o.group(1)
            cur["options"][m_o.group(1)] = [m_o.group(2)]
        elif part == "stem":
            cur["stem"].append(line)
        elif part == "opt":
            cur["options"][cur["_opt"]].append(line)
        elif part == "expl":
            cur["expl"].append(line)

    out = []
    for q in questions:
        out.append({
            "id": f"OFF-{q['n']:02d}",
            "source": "official",
            "scenario": q["scenario"],
            "type": "single",
            "select": 1,
            "stem": join_lines(q["stem"]),
            "options": [{"key": k, "text": join_lines(v)} for k, v in sorted(q["options"].items())],
            "answer": [q["answer"]],
            "explanation": join_lines(q["expl"]),
        })
    return out


# Skill tags for the CCDV-F samples (the guide only names the domain).
DEV_SAMPLE_SKILLS = {1: "2.3", 2: "7.1", 3: "8.3"}


def parse_dev_official():
    text = subprocess.run(["pdftotext", str(DEV_PDF), "-"], capture_output=True, text=True, check=True).stdout
    section = text.split("8. Sample Questions", 1)[1].split("9. How the Exam Is Scored", 1)[0]
    lines = [l for l in section.splitlines() if l.strip() not in ("Claude Certification Program", "Exam guide", "")]
    questions, keys, cur, part = {}, {}, None, None
    for line in lines:
        m_q = re.match(r"^Sample (\d+) · Domain (\d+)", line)
        m_o = re.match(r"^([A-D])\. (.*)$", line)
        m_a = re.match(r"^Sample (\d+): ([A-D])\. (.*)$", line)
        if line.startswith("Answer key"):
            part = "keys"
        elif m_a:
            cur = int(m_a.group(1)); keys[cur] = [m_a.group(2), [m_a.group(3)]]; part = "key"
        elif part in ("key", "keys") and cur in keys:
            keys[cur][1].append(line)
        elif m_q:
            cur = int(m_q.group(1)); questions[cur] = {"domain": int(m_q.group(2)), "stem": [], "options": {}}; part = "stem"
        elif cur in questions and m_o:
            part = "opt"; questions[cur]["_opt"] = m_o.group(1); questions[cur]["options"][m_o.group(1)] = [m_o.group(2)]
        elif cur in questions and part == "stem":
            questions[cur]["stem"].append(line)
        elif cur in questions and part == "opt":
            questions[cur]["options"][questions[cur]["_opt"]].append(line)
    out = []
    for n, q in sorted(questions.items()):
        out.append({
            "id": f"DVO-{n:02d}",
            "exam": "CCDV-F",
            "source": "official",
            "domain": q["domain"],
            "skill": DEV_SAMPLE_SKILLS[n],
            "type": "single",
            "select": 1,
            "stem": join_lines(q["stem"]),
            "options": [{"key": k, "text": join_lines(v)} for k, v in sorted(q["options"].items())],
            "answer": [keys[n][0]],
            "explanation": join_lines(keys[n][1]),
        })
    return out


def parse_community():
    text = COMMUNITY_MD.read_text(encoding="utf-8")
    section = text[text.index("# Practice Test"): text.index("# Practical Exercises")]
    blocks = re.split(r"\n## Question ", section)[1:]
    out = []
    for block in blocks:
        header, _, body = block.partition("\n")
        m = re.match(r"(\d+) \(Scenario: (.+)\)", header)
        n, scen = int(m.group(1)), scenario_code(m.group(2))
        body = body.split("\n---", 1)[0]
        situation = re.search(r"\*\*Situation:\*\*\s*(.+)", body).group(1).strip()
        ask = re.search(r"^\*\*(?!Situation|Why)(.+?)\*\*\s*$", body, re.M)
        stem = situation
        if ask and ask.group(1).strip().rstrip("?").lower() not in situation.lower():
            stem = f"{situation}\n\n{ask.group(1).strip()}"
        options, answer = [], None
        for key, opt in re.findall(r"^- ([A-D])\) (.+)$", body, re.M):
            if "[CORRECT]" in opt:
                answer = key
                opt = opt.replace("**[CORRECT]**", "").strip()
            options.append({"key": key, "text": opt.strip()})
        why = re.search(r"\*\*Why [A-D]:\*\*\s*(.+)", body, re.S).group(1).strip()
        out.append({
            "id": f"COM-{n:02d}",
            "source": "community",
            "scenario": scen,
            "type": "single",
            "select": 1,
            "stem": stem,
            "options": options,
            "answer": [answer],
            "explanation": why,
        })
    return out


def words(s):
    return set(re.findall(r"[a-z0-9]+", s.lower())[:45])


def mark_duplicates(official, community):
    """Community practice questions that restate an official sample point at it (the official one is preferred)."""
    for c in community:
        cw = words(c["stem"])
        best, score = None, 0.0
        for o in official:
            ow = words(o["stem"])
            r = len(cw & ow) / len(cw | ow)
            if r > score:
                best, score = o, r
        if score >= 0.4:
            c["duplicateOf"] = best["id"]


def write_js(path, var, items):
    payload = json.dumps(items, ensure_ascii=False, indent=1)
    path.write_text(
        "// Generated by tools/import_sources.py — do not edit by hand.\n"
        f"window.CCA = window.CCA || {{}};\nCCA.{var} = {payload};\n",
        encoding="utf-8",
    )


def safely(label, path, parser, needs_pdf=True):
    """Run a parser, or return [] with a warning when its source is unavailable."""
    if not path.exists():
        print(f"WARN {label}: {path.name} is missing (run with --fetch-missing); skipping")
        return []
    if needs_pdf and not have_pdftotext():
        print(f"WARN {label}: pdftotext not found (brew install poppler / apt install poppler-utils); skipping")
        return []
    try:
        return parser()
    except Exception as e:
        print(f"WARN {label}: could not parse {path.name}: {e}; skipping")
        return []


def main():
    if "--refresh" in sys.argv or "--fetch-missing" in sys.argv:
        fetch(only_missing="--refresh" not in sys.argv)
    official = safely("official CCAR-F samples", OFFICIAL_PDF, parse_official)
    community = safely("community questions", COMMUNITY_MD, parse_community, needs_pdf=False)
    mark_duplicates(official, community)
    if official and len(official) != 12:
        print(f"WARN expected 12 official samples, got {len(official)}")
    for q in official + community:
        assert len(q["options"]) == 4 and q["answer"][0], q["id"]
    DATA.mkdir(exist_ok=True)
    write_js(DATA / "questions.official.js", "questionsOfficial", official)
    write_js(DATA / "questions.community.js", "questionsCommunity", community)
    dev = safely("official CCDV-F samples", DEV_PDF, parse_dev_official)
    if dev and (len(dev) != 3 or not all(len(q["options"]) == 4 for q in dev)):
        print("WARN expected 3 CCDV-F samples with 4 options each")
    write_js(DATA / "questions.dev.official.js", "questionsDevOfficial", dev)
    dups = [f"{c['id']}->{c['duplicateOf']}" for c in community if "duplicateOf" in c]
    print(f"official: {len(official)}  community: {len(community)}  duplicates: {len(dups)}  developer samples: {len(dev)}")
    print("  " + ", ".join(dups))


if __name__ == "__main__":
    main()
