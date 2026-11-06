#!/usr/bin/env python3
"""Build the fixed mock-exam forms into data/mocks.js and check them against the official blueprints.

  Architect Mock A (CCAR-F): 60 items = 4 official scenarios × 15, chosen to match the
                             27/18/20/20/15 domain weights as closely as possible.
  Developer Mock A (CCDV-F): all 53 Developer questions (3 official samples + 50 authored),
                             domains interleaved.

Selection is seeded, so re-running gives the same forms for the same question bank.
Run after tools/build_data.py.  Usage: python3 tools/build_mocks.py
"""
import collections
import itertools
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SEED = 20261121
ARCH_WEIGHTS = {1: 27, 2: 18, 3: 20, 4: 20, 5: 15}
ARCH_SCENARIOS = ["S1", "S2", "S3", "S4", "S5", "S6"]


def js_value(name, var):
    if not (DATA / name).exists():
        print(f"WARN {name} not found (run python3 tools/setup.py)")
        return []
    text = (DATA / name).read_text(encoding="utf-8")
    m = re.search(r"CCA\." + var + r" = ", text)
    return json.loads(text[m.end():].rstrip().rstrip(";"))


def arch_pool():
    enr = js_value("enrichment.js", "enrichment")
    qs = js_value("questions.official.js", "questionsOfficial") + js_value("questions.community.js", "questionsCommunity")
    qs = [{**q, **enr.get(q["id"], {})} for q in qs] + js_value("questions.authored.js", "questionsAuthored")
    return [q for q in qs if not q.get("duplicateOf") and q.get("task") and q["scenario"] in ARCH_SCENARIOS]


def targets(weights, n):
    raw = {d: w * n / sum(weights.values()) for d, w in weights.items()}
    out = {d: int(v) for d, v in raw.items()}
    for d in sorted(raw, key=lambda d: raw[d] - out[d], reverse=True)[: n - sum(out.values())]:
        out[d] += 1
    return out


def score(sel, target):
    dom = collections.Counter(q["domain"] for q in sel)
    gap = sum(abs(dom[d] - t) for d, t in target.items())
    multi = sum(q["type"] == "multi" for q in sel)
    tasks = len({q["task"] for q in sel})
    return gap * 10 - min(multi, 10) - tasks * 0.5


def build_arch(pool, rng):
    target = targets(ARCH_WEIGHTS, 60)
    by_scen = {s: [q for q in pool if q["scenario"] == s] for s in ARCH_SCENARIOS}
    best = None
    for combo in itertools.combinations(ARCH_SCENARIOS, 4):
        if any(len(by_scen[s]) < 15 for s in combo):
            continue
        for _ in range(40 if len(combo) else 0):  # random restarts + hill climbing on within-scenario swaps
            picked = {s: rng.sample(by_scen[s], 15) for s in combo}
            cur = score([q for s in combo for q in picked[s]], target)
            improved = True
            while improved:
                improved = False
                for s in combo:
                    outside = [q for q in by_scen[s] if q not in picked[s]]
                    for i in range(15):
                        for cand in outside:
                            trial = picked[s][:i] + [cand] + picked[s][i + 1:]
                            sel = [q for t in combo for q in (trial if t == s else picked[t])]
                            sc = score(sel, target)
                            if sc < cur:
                                picked[s], cur, improved = trial, sc, True
                                outside = [q for q in by_scen[s] if q not in picked[s]]
                                break
            sel = [q for s in combo for q in picked[s]]
            if best is None or cur < best[0]:
                best = (cur, combo, sel)
    if best is None:
        return None, [], target
    _, combo, sel = best
    order = {s: i for i, s in enumerate(combo)}
    sel.sort(key=lambda q: (order[q["scenario"]], q["id"]))  # scenario blocks, as on the real exam
    return {"id": "ARCH-A", "exam": "CCAR-F", "title": "Architect – Foundations · Mock A", "minutes": 120,
            "scenarios": list(combo), "qids": [q["id"] for q in sel]}, sel, target


def build_dev(rng):
    dev = js_value("questions.dev.js", "questionsDev")
    by_dom = collections.defaultdict(list)
    for q in dev:
        by_dom[q["domain"]].append(q)
    for lst in by_dom.values():
        rng.shuffle(lst)
    # Interleave: repeatedly take from the domain with the most items left, never twice in a row if avoidable.
    order, last = [], None
    while any(by_dom.values()):
        cands = sorted((d for d in by_dom if by_dom[d]), key=lambda d: (-len(by_dom[d]), d))
        d = next((c for c in cands if c != last), cands[0])
        order.append(by_dom[d].pop())
        last = d
    return {"id": "DEV-A", "exam": "CCDV-F", "title": "Developer – Foundations · Mock A", "minutes": 120,
            "qids": [q["id"] for q in order]}, order


def report(title, sel, weights, target):
    dom = collections.Counter(q["domain"] for q in sel)
    print(f"\n{title}: {len(sel)} items, {sum(q['type'] == 'multi' for q in sel)} multiple-response")
    for d in sorted(weights):
        print(f"  D{d}  weight {weights[d]:>5}%  target {target[d]:>2}  form {dom[d]:>2}")


def main():
    rng = random.Random(SEED)
    errors, forms = [], []
    sources_ok = all((DATA / f).exists() and (DATA / f).stat().st_size > 200 for f in ("questions.official.js", "questions.community.js", "questions.dev.official.js"))
    arch_form, arch_sel, arch_target = build_arch(arch_pool(), rng)
    if arch_form is None:
        print("WARN Architect Mock A skipped: not enough questions per scenario (are the community/official sources imported?)")
    else:
        report(f"Architect Mock A  scenarios {arch_form['scenarios']}", arch_sel, ARCH_WEIGHTS, arch_target)
        if len(arch_form["qids"]) != 60 or len(set(arch_form["qids"])) != 60:
            errors.append("Architect form must have 60 unique items")
        forms.append(arch_form)

    bp = (DATA / "blueprint.dev.js").read_text(encoding="utf-8")
    dev_weights = {int(d): float(w) for d, w in re.findall(r'\{ id: (\d), name: "[^"]+", short: "[^"]+", weight: ([\d.]+) \}', bp)}
    dev_targets = collections.Counter()
    for sk, n in re.findall(r'"(\d)\.\d": (\d+)', bp.split("CCA.devTargets", 1)[1]):
        dev_targets[int(sk)] += int(n)
    dev_form, dev_sel = build_dev(rng)
    report("Developer Mock A", dev_sel, dev_weights, dev_targets)
    dev_problems = []
    if len(dev_form["qids"]) != 53 or len(set(dev_form["qids"])) != 53:
        dev_problems.append(f"Developer form must have 53 unique items (has {len(dev_form['qids'])})")
    if collections.Counter(q["domain"] for q in dev_sel) != dev_targets:
        dev_problems.append("Developer form domain counts differ from CCA.devTargets")
    if dev_sel:
        forms.append(dev_form)
    # With every source imported these are real errors; without them they are expected gaps.
    (errors if sources_ok else []).extend(dev_problems)
    for w in ([] if sources_ok else dev_problems):
        print("WARN", w, "(some sources are not imported)")

    for e in errors:
        print("ERROR", e)
    if errors and "--force" not in sys.argv:
        sys.exit(1)
    payload = json.dumps(forms, ensure_ascii=False, indent=1)
    (DATA / "mocks.js").write_text(
        f"// Generated by tools/build_mocks.py — fixed mock-exam forms.\nwindow.CCA = window.CCA || {{}};\nCCA.mockForms = {payload};\n",
        encoding="utf-8")
    print("\nwrote data/mocks.js")


if __name__ == "__main__":
    main()
