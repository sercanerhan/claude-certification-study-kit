# Authoring guide (study content for CCAR-F)

This folder is a personal study system for **Claude Certified Architect – Foundations (CCAR-F)**, exam guide v1.0 (July 2026).
The typical learner works full-time and studies about 1 h/day.

## Sources (read these, in this order of authority)
1. `vendor/official-ccar-f-exam-guide.txt`: the official exam guide (text). Section 6 lists every task statement with "Knowledge of" and "Skills in". Section 9 has 12 official sample questions with explanations. **This is the authority on what the exam expects.**
2. Official docs, linked per task in `data/blueprint.js` (`CCA.tasks[].docs`). Use WebFetch to verify any concrete fact you assert, such as flags, file paths, frontmatter keys, hook names, API fields and limits.
3. `vendor/community-guide_en.md`: a community study guide. It is useful for its theory chapters, but it is unofficial.

Write for the exam: use the terminology of guide v1.0 (`Task` tool, `allowedTools`, `AgentDefinition`, `fork_session`, `.claude/commands/`, `stop_reason`, and so on). If the current docs name something differently (for example, a renamed tool), still teach the exam term and add one line saying what the docs call it now.

Don't copy long passages from either source. Write in your own words.

## Learn cards: `notes/<task>-<slug>.md` (one per task statement, 250–450 words)
```markdown
---
task: "1.1"
title: Agentic loops & stop_reason
---
## Core idea
2–4 sentences, plain words. What it is and why it matters for an architect.

## What the exam tests
- 3–6 bullets mapped to the guide's knowledge/skills for this task

## Exam traps
- **Trap:** tempting-but-wrong choice → **Instead:** what the exam wants, and why (3–5 traps)

## Example
A short snippet (config, JSON schema, pseudo-code, or a mini scenario) when it helps.

## Remember
- 3–5 one-line flashcard facts
```
Don't add doc links. The app adds the official links from the blueprint.

## Authored questions: `data/authored/<your-file>.json` (a JSON array)
```json
{
  "id": "A-S4-01",
  "scenario": "S4",
  "domain": 2,
  "task": "2.5",
  "type": "single",
  "select": 1,
  "difficulty": 2,
  "stem": "Scenario-grounded situation ... What should you do?",
  "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, {"key": "C", "text": "..."}, {"key": "D", "text": "..."}],
  "answer": ["C"],
  "explanation": "Why the correct option is the best choice (2–4 sentences).",
  "why": {"A": "Why A is weaker here", "B": "...", "D": "..."},
  "whenRight": "Under what changed circumstances another option would become correct (name it).",
  "trap": "The deciding phrase in the stem, e.g. 'first step', 'must always', 'every developer'.",
  "verified": ["https://official-doc-url-you-checked"]
}
```
- **Multiple-response items:** use `"type": "multi"`, `"select": 2` (or 3), and 5 options A–E. The stem must end with `(Select TWO.)` or `(Select THREE.)`. `answer` lists all the correct keys.
- **Exam style:** a realistic production situation, then one decision. Four plausible options of similar length and tone. The wrong options should be things a competent engineer might really choose: over-engineering, prompt-only fixes where code enforcement is needed, fixing the wrong layer, premature escalation, and so on. Avoid "all of the above", jokes, and making the correct option the longest one.
- **Balance answers:** spread the correct letter evenly over A–D across your file.
- Every question must map to exactly one task statement (`task`), and `domain` must equal the first digit of `task`.
- `difficulty`: 1 = recall, 2 = applied, 3 = subtle trade-off (two options look reasonable). Aim for mostly 2–3.
- Don't duplicate an existing official or community question. You may test the same concept from a different angle.

## Enrichment of imported questions: `data/enrichment/<your-file>.json` (an object keyed by question id)
The questions are in `data/questions.official.js` (`OFF-xx`) and `data/questions.community.js` (`COM-xx`). Skip any community question that has `duplicateOf`. For each assigned id:
```json
{
  "COM-07": {
    "domain": 1, "task": "1.3", "alsoTasks": ["5.6"],
    "why": {"A": "...", "B": "...", "C": "..."},
    "whenRight": "...",
    "trap": "...",
    "note": "optional: only if the community answer conflicts with the official guide/docs; explain which to trust"
  }
}
```
`why` covers each **wrong** option. Don't repeat the existing `explanation`; add to it.

## Check your work
Run `python3 tools/build_data.py --check`. Fix every `ERROR` that mentions your files or ids. Warnings about other people's ids or tasks are expected while others are still working. Never edit files that weren't assigned to you.
