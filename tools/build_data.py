#!/usr/bin/env python3
"""Merge authored questions, enrichment and notes into the app's data files, then validate everything.

Inputs
  data/authored/*.json     lists of authored questions
  data/enrichment/*.json   objects keyed by question id (tags + deeper explanations for imported questions)
  notes/*.md               one learn card per task statement (frontmatter: task, title)
  data/dev/authored/*.json, data/dev/enrichment/*.json   Developer (CCDV-F) mock questions
Outputs
  data/questions.authored.js, data/enrichment.js, data/cards.js, data/questions.dev.js

Usage: python3 tools/build_data.py [--check]   (--check validates without writing)
"""
import collections
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
NOTES = ROOT / "notes"

blueprint = (DATA / "blueprint.js").read_text(encoding="utf-8")
TASKS = re.findall(r't\("(\d\.\d)"', blueprint)
SCENARIOS = re.findall(r'\{ id: "(S\d|CAI)"', blueprint)
OFFICIAL_SCENARIOS = [s for s in SCENARIOS if s.startswith("S")]

dev_blueprint = (DATA / "blueprint.dev.js").read_text(encoding="utf-8")
DEV_SKILLS = re.findall(r's\("(\d\.\d)"', dev_blueprint)
DEV_TARGETS = {k: int(v) for k, v in re.findall(r'"(\d\.\d)": (\d+)', dev_blueprint.split("CCA.devTargets", 1)[1])}

errors, warnings = [], []


def load_js_array(path):
    """Generated question files; a source that couldn't be imported yields an empty list."""
    if not path.exists():
        warnings.append(f"{path.name} not found: run python3 tools/setup.py to import the official/community sources")
        return []
    text = path.read_text(encoding="utf-8")
    return json.loads(text[text.index("= [") + 2:].rstrip().rstrip(";"))


def load_json_dir(sub):
    items = []
    for p in sorted((DATA / sub).glob("*.json")):
        try:
            items.append((p.name, json.loads(p.read_text(encoding="utf-8"))))
        except json.JSONDecodeError as e:
            errors.append(f"{sub}/{p.name}: invalid JSON: {e}")
    return items


def check_question(q, where):
    qid = q.get("id", "?")
    for field in ("id", "scenario", "domain", "task", "type", "select", "stem", "options", "answer", "explanation"):
        if field not in q:
            errors.append(f"{where} {qid}: missing {field}")
    if q.get("scenario") not in SCENARIOS:
        errors.append(f"{where} {qid}: unknown scenario {q.get('scenario')}")
    if q.get("task") not in TASKS:
        errors.append(f"{where} {qid}: unknown task {q.get('task')}")
    elif int(q["task"][0]) != q.get("domain"):
        errors.append(f"{where} {qid}: domain {q.get('domain')} does not match task {q['task']}")
    check_options(q, where)


def check_dev_question(q, where):
    qid = q.get("id", "?")
    for field in ("id", "exam", "domain", "skill", "type", "select", "stem", "options", "answer", "explanation"):
        if field not in q:
            errors.append(f"{where} {qid}: missing {field}")
    if q.get("exam") != "CCDV-F":
        errors.append(f"{where} {qid}: exam must be CCDV-F")
    if q.get("skill") not in DEV_SKILLS:
        errors.append(f"{where} {qid}: unknown skill {q.get('skill')}")
    elif int(q["skill"][0]) != q.get("domain"):
        errors.append(f"{where} {qid}: domain {q.get('domain')} does not match skill {q['skill']}")
    check_options(q, where)


def check_options(q, where):
    qid = q.get("id", "?")
    keys = [o.get("key") for o in q.get("options", [])]
    if keys != list("ABCDE"[: len(keys)]) or len(keys) not in (4, 5):
        errors.append(f"{where} {qid}: options must be keyed A.. with 4 or 5 entries, got {keys}")
    ans = q.get("answer", [])
    if len(ans) != q.get("select") or any(a not in keys for a in ans) or len(set(ans)) != len(ans):
        errors.append(f"{where} {qid}: answer {ans} inconsistent with select={q.get('select')} / options {keys}")
    if q.get("type") == "multi" and not re.search(r"\(Select (TWO|THREE)\.\)\s*$", q.get("stem", "")):
        errors.append(f"{where} {qid}: multi-response stem must end with '(Select TWO.)' or '(Select THREE.)'")
    if q.get("type") == "single" and q.get("select") != 1:
        errors.append(f"{where} {qid}: single questions must have select=1")
    why = q.get("why", {})
    missing = [k for k in keys if k not in ans and k not in why]
    if missing:
        warnings.append(f"{where} {qid}: no 'why' for distractor(s) {missing}")


def parse_card(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        errors.append(f"notes/{path.name}: missing frontmatter")
        return None
    meta = dict(re.findall(r'^(\w+):\s*"?(.*?)"?\s*$', m.group(1), re.M))
    if meta.get("task") not in TASKS:
        errors.append(f"notes/{path.name}: unknown task {meta.get('task')}")
    for heading in ("## Core idea", "## Exam traps"):
        if heading not in m.group(2):
            errors.append(f"notes/{path.name}: missing section '{heading}'")
    return {"task": meta.get("task"), "title": meta.get("title", ""), "file": f"notes/{path.name}", "body": m.group(2).strip()}


def write_js(name, var, value):
    payload = json.dumps(value, ensure_ascii=False, indent=1)
    (DATA / name).write_text(
        f"// Generated by tools/build_data.py — edit the sources, not this file.\nwindow.CCA = window.CCA || {{}};\nCCA.{var} = {payload};\n",
        encoding="utf-8",
    )


def main():
    check_only = "--check" in sys.argv
    official = load_js_array(DATA / "questions.official.js")
    community = load_js_array(DATA / "questions.community.js")

    authored = []
    for name, items in load_json_dir("authored"):
        for q in items:
            q.setdefault("source", "authored")
            check_question(q, f"authored/{name}")
            authored.append(q)

    enrichment = {}
    for name, obj in load_json_dir("enrichment"):
        for qid, e in obj.items():
            if qid in enrichment:
                errors.append(f"enrichment/{name}: {qid} enriched twice")
            enrichment[qid] = e

    imported = {q["id"]: q for q in official + community}
    have = {"OFF": bool(official), "COM": bool(community)}
    skipped = 0
    for qid, e in enrichment.items():
        if qid not in imported:
            if not have.get(qid.split("-")[0], True):
                skipped += 1  # its source wasn't imported on this machine
            else:
                errors.append(f"enrichment: unknown question id {qid}")
            continue
        merged = {**imported[qid], **e}
        check_question(merged, "enrichment")

    if skipped:
        warnings.append(f"{skipped} enrichment entries skipped because their source questions aren't imported")
    pool = [q for q in official + community if "duplicateOf" not in q]
    for q in pool:
        if q["id"] not in enrichment:
            warnings.append(f"{q['id']}: not enriched yet (no domain/task tag)")
    ids = [q["id"] for q in official + community + authored]
    for qid, n in collections.Counter(ids).items():
        if n > 1:
            errors.append(f"duplicate id {qid}")

    cards = [c for c in (parse_card(p) for p in sorted(NOTES.glob("*.md"))) if c]
    card_tasks = collections.Counter(c["task"] for c in cards)
    for task in TASKS:
        if card_tasks[task] != 1:
            warnings.append(f"task {task}: {card_tasks[task]} cards (expected 1)")

    # Coverage report over the practice pool (imported unique + authored)
    tagged = [{**q, **enrichment.get(q["id"], {})} for q in pool if q["id"] in enrichment] + authored
    by_scen = collections.Counter(q["scenario"] for q in tagged)
    by_task = collections.Counter(q.get("task") for q in tagged)
    by_type = collections.Counter(q["type"] for q in tagged)
    letters = collections.Counter(a for q in authored for a in q["answer"])
    for s in OFFICIAL_SCENARIOS:
        if by_scen[s] < 15:
            warnings.append(f"scenario {s}: only {by_scen[s]} questions (need 15 for a mock)")
    for task in TASKS:
        if by_task[task] < 3:
            warnings.append(f"task {task}: only {by_task[task]} questions (want >= 3)")

    print(f"pool: {len(tagged)} questions  (official {len(official)}, community unique {len(pool) - len(official)}, authored {len(authored)})")
    print("by scenario:", dict(sorted(by_scen.items())))
    print("by type:", dict(by_type), " authored answer letters:", dict(sorted(letters.items())))
    print("by task:", " ".join(f"{k}:{by_task[k]}" for k in TASKS))
    print(f"cards: {len(cards)}/{len(TASKS)}")

    # Developer (CCDV-F) mock questions: kept out of the Architect drill pool.
    dev_official = load_js_array(DATA / "questions.dev.official.js")
    dev_enrich = {}
    for name, obj in load_json_dir("dev/enrichment"):
        dev_enrich.update(obj)
    dev = [{**q, **dev_enrich.get(q["id"], {})} for q in dev_official]
    for name, items in load_json_dir("dev/authored"):
        for q in items:
            q.setdefault("source", "authored")
            dev.append(q)
    for q in dev:
        check_dev_question(q, "dev")
    for qid, n in collections.Counter(q["id"] for q in dev).items():
        if n > 1:
            errors.append(f"dev: duplicate id {qid}")
    dev_skill = collections.Counter(q.get("skill") for q in dev)
    dev_dom = collections.Counter(q.get("domain") for q in dev)
    dev_letters = collections.Counter(a for q in dev if q.get("source") == "authored" for a in q["answer"])
    for sk, want in DEV_TARGETS.items():
        if dev_skill[sk] != want:
            warnings.append(f"dev skill {sk}: {dev_skill[sk]} questions (target {want})")
    print(f"developer: {len(dev)} questions  by domain: {dict(sorted(dev_dom.items()))}  multi: {sum(q['type'] == 'multi' for q in dev)}  authored letters: {dict(sorted(dev_letters.items()))}")
    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    if errors:
        sys.exit(1)
    if not check_only:
        write_js("questions.authored.js", "questionsAuthored", authored)
        write_js("enrichment.js", "enrichment", enrichment)
        write_js("cards.js", "cards", cards)
        write_js("questions.dev.js", "questionsDev", dev)
        print("wrote data/questions.authored.js, data/enrichment.js, data/cards.js, data/questions.dev.js")


if __name__ == "__main__":
    main()
