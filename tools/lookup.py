#!/usr/bin/env python3
"""Read-only helper for the /tutor skill: prints questions, cards and progress in plain text.

  python3 tools/lookup.py status            today's plan item, weakest tasks, due reviews, mocks
  python3 tools/lookup.py q <QUESTION-ID>   full question + answer + explanations + learner's history
                                            (also Developer mock items: DVO-xx, DV-<skill>-xx)
  python3 tools/lookup.py task <TASK-ID>    card text, official docs, question ids and learner's accuracy
  python3 tools/lookup.py find <words>      search question stems
"""
import json
import re
import sys
import time
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def js_value(name, var):
    path = DATA / name
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    m = re.search(r"CCA\." + var + r" = ", text)
    return json.loads(text[m.end():].rstrip().rstrip(";")) if m else None


def blueprint():
    text = (DATA / "blueprint.js").read_text(encoding="utf-8")
    tasks = dict(re.findall(r't\("(\d\.\d)", "([^"]+)"', text))
    docs = {k: v for k, v in re.findall(r'(\w+): \["([^"]+)", "https?://[^"]+"\]', text)}
    urls = {k: u for k, u in re.findall(r'(\w+): \["[^"]+", "(https?://[^"]+)"\]', text)}
    task_docs = {tid: [f"{docs[k]} — {urls[k]}" for k in re.findall(r'"(\w+)"', keys)]
                 for tid, keys in re.findall(r't\("(\d\.\d)", "[^"]+", \[([^\]]*)\]', text)}
    scen = dict(re.findall(r'id: "(S\d|CAI)", name: "([^"]+)"', text))
    return tasks, task_docs, scen


def questions():
    enr = js_value("enrichment.js", "enrichment") or {}
    qs = []
    for f, v in (("questions.official.js", "questionsOfficial"), ("questions.community.js", "questionsCommunity"), ("questions.authored.js", "questionsAuthored"), ("questions.dev.js", "questionsDev")):
        qs += js_value(f, v) or []
    return {q["id"]: {**q, **enr.get(q["id"], {})} for q in qs}


def progress():
    p = ROOT / "progress" / "progress.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def last_ok(prog, qid):
    a = prog.get("answers", {}).get(qid)
    return a["hist"][-1]["ok"] if a and a.get("hist") else None


def cmd_q(qid):
    qs = questions()
    q = qs.get(qid.upper())
    if not q:
        sys.exit(f"No question {qid}. Try: python3 tools/lookup.py find <words>")
    tasks, _, scen = blueprint()
    if q.get("exam") == "CCDV-F":
        skills = dict(re.findall(r's\("(\d\.\d)", "([^"]+)"', (DATA / "blueprint.dev.js").read_text(encoding="utf-8")))
        print(f"{q['id']}  [{q.get('source')}]  Developer – Foundations (CCDV-F) mock item  domain {q['domain']}  skill {q['skill']} {skills.get(q['skill'], '')}")
        print("(Held out of drills: explain it, but don't quiz the learner on other Developer mock items before they sit the mock.)")
    else:
        print(f"{q['id']}  [{q.get('source')}]  scenario {q['scenario']} ({scen.get(q['scenario'], '')})  task {q.get('task')} {tasks.get(q.get('task'), '')}")
    if q.get("duplicateOf"):
        print(f"(duplicate of {q['duplicateOf']})")
    print("\nSTEM:\n" + q["stem"] + "\n")
    for o in q["options"]:
        print(f"  {o['key']}) {o['text']}")
    print(f"\nCORRECT: {', '.join(q['answer'])}\nEXPLANATION: {q['explanation']}")
    for k, v in (q.get("why") or {}).items():
        print(f"  why not {k}: {v}")
    for field in ("whenRight", "trap", "note"):
        if q.get(field):
            print(f"{field.upper()}: {q[field]}")
    a = progress().get("answers", {}).get(q["id"])
    if a:
        hist = ", ".join(f"{'ok' if h['ok'] else 'WRONG'}/{h.get('conf')}" for h in a["hist"][-5:])
        print(f"\nLEARNER: {a['n']} attempts, {a['c']} correct, box {a.get('box')}/5. Recent: {hist}")
    else:
        print("\nLEARNER: not attempted yet")


def cmd_task(tid):
    tasks, task_docs, _ = blueprint()
    if tid not in tasks:
        sys.exit(f"Unknown task {tid}. Valid: {', '.join(tasks)}")
    print(f"TASK {tid}: {tasks[tid]}\n")
    cards = {c["task"]: c for c in (js_value("cards.js", "cards") or [])}
    print(cards[tid]["body"] if tid in cards else "(no card yet)")
    print("\nOFFICIAL DOCS:\n" + "\n".join("  " + d for d in task_docs.get(tid, [])))
    prog = progress()
    rows = [q for q in questions().values() if q.get("task") == tid and not q.get("duplicateOf")]
    tried = [q for q in rows if last_ok(prog, q["id"]) is not None]
    ok = [q for q in tried if last_ok(prog, q["id"])]
    print(f"\nQUESTIONS ({len(rows)}), learner {len(ok)}/{len(tried)} correct on latest attempt:")
    for q in rows:
        s = last_ok(prog, q["id"])
        print(f"  {q['id']:10} {'ok ' if s else 'BAD' if s is False else 'new'}  {q['stem'][:90]}")


def cmd_status():
    tasks, _, _ = blueprint()
    prog = progress()
    today = date.today()
    print(f"Today: {today.isoformat()}")
    sched = (DATA / "schedule.js").read_text(encoding="utf-8")
    # The schedule is written against reference dates; shift by the learner's plan start (app Plan tab).
    settings = prog.get("settings", {}) if prog else {}
    base = date.fromisoformat(re.search(r'scheduleBase = "([\d-]+)"', sched).group(1))
    start = date.fromisoformat(settings["planStart"]) if settings.get("planStart") else base
    ref_day = (base + (today - start)).isoformat()
    m = re.search(r'date: "' + ref_day + r'", title: "([^"]+)"', sched)
    print(f"Plan day {(today - start).days + 1} (plan started {start.isoformat()}): {m.group(1) if m else '(outside the 5-week plan)'}")
    if settings.get("examDate"):
        print(f"Exam date: {settings['examDate']} ({(date.fromisoformat(settings['examDate']) - today).days} days away)")
    if not prog:
        print("No progress file yet (the app writes progress/progress.json when started with ./start.sh).")
        return
    qs = questions()
    pool = [q for q in qs.values() if q.get("task") and not q.get("duplicateOf")]
    now_ms = time.time() * 1000
    due = [i for i, a in prog.get("answers", {}).items() if a.get("due", 1e18) <= now_ms]
    print(f"Questions seen: {sum(1 for q in pool if q['id'] in prog.get('answers', {}))}/{len(pool)}; reviews due: {len(due)}")
    stats = []
    for tid, title in tasks.items():
        rows = [q for q in pool if q["task"] == tid]
        tried = [q for q in rows if last_ok(prog, q["id"]) is not None]
        ok = sum(1 for q in tried if last_ok(prog, q["id"]))
        stats.append(((ok + 1) / (len(tried) + 2), tid, title, ok, len(tried), len(rows)))
    print("\nWeakest task statements (smoothed accuracy):")
    for score, tid, title, ok, n, total in sorted(stats)[:6]:
        print(f"  {tid} {title[:70]:70} {ok}/{n} correct, {total} questions")
    unseen = [s for s in stats if s[4] == 0]
    if unseen:
        print("Not attempted yet: " + ", ".join(s[1] for s in unseen))
    for i, mk in enumerate(prog.get("mocks", []), 1):
        doms = ", ".join(f"D{d} {v['c']}/{v['n']}" for d, v in sorted(mk["byDomain"].items()))
        print(f"Mock {i} ({mk['date']}): {mk['c']}/{mk['n']} = {round(100 * mk['c'] / mk['n'])}%  [{doms}]")
    recent = sorted((h for a in prog.get("answers", {}).values() for h in a.get("hist", [])), key=lambda h: -h["t"])[:40]
    if recent:
        print(f"Last {len(recent)} answers: {round(100 * sum(h['ok'] for h in recent) / len(recent))}% correct")
    mins = sum(d.get("minutes", 0) for d in prog.get("days", {}).values())
    print(f"Total study minutes logged: {round(mins)}")


def cmd_find(words):
    pat = re.compile(re.escape(" ".join(words)), re.I)
    for q in questions().values():
        if pat.search(q["stem"]) or any(pat.search(o["text"]) for o in q["options"]):
            print(f"{q['id']:10} task {q.get('task', '?'):4} {q['stem'][:100]}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] == "status":
        cmd_status()
    elif args[0] == "q" and len(args) > 1:
        cmd_q(args[1])
    elif args[0] == "task" and len(args) > 1:
        cmd_task(args[1])
    elif args[0] == "find" and len(args) > 1:
        cmd_find(args[1:])
    else:
        print(__doc__)
