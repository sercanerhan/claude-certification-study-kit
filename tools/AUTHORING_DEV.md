# Authoring guide: Developer (CCDV-F) mock questions

These questions make up the **Developer – Foundations mock exam** (53 items: the 3 official samples plus 50 authored). They are kept out of the Architect drills, so the learner meets them fresh when sitting the mock.

## Sources (in order of authority)
1. `vendor/official-ccdv-f-exam-guide.txt`: the official CCDV-F guide v1.0.
   - Section 6 has the 8 domains and their skills with weights. Each skill's description lists what items are written against.
   - Section 8 has 3 sample items showing the style and level.
2. Official docs listed per skill in `data/blueprint.dev.js` (`CCA.devSkills[].docs`). Use WebFetch to verify every concrete fact you assert: parameter names, limits, behaviour, file locations, CLI flags, transport names.
   - Don't rely on memory for model names, prices, context sizes or which models support a feature. Either check the docs, or write the question so it doesn't depend on that detail.
   - Avoid "trivia that changes monthly". Prefer the stable principle: for example, "use the Batches API for non-urgent bulk work at lower cost", not an exact price.
3. `tools/AUTHORING.md` explains the quality bar used for the Architect bank. The same bar applies here, apart from the format differences below.

## Format: `data/dev/authored/<your-file>.json` (a JSON array)
```json
{
  "id": "DV-2.3-01",
  "exam": "CCDV-F",
  "domain": 2,
  "skill": "2.3",
  "type": "single",
  "select": 1,
  "difficulty": 2,
  "stem": "A short, self-contained work situation (2–4 sentences) followed by one question.",
  "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, {"key": "C", "text": "..."}, {"key": "D", "text": "..."}],
  "answer": ["B"],
  "explanation": "Why the correct option is best (2–4 sentences).",
  "why": {"A": "Why A is weaker", "C": "...", "D": "..."},
  "whenRight": "Under what changed circumstances another option would become correct (name it).",
  "trap": "The deciding phrase in the stem.",
  "verified": ["https://official-doc-url-you-checked"]
}
```
- **IDs:** `DV-<skill>-<nn>`, numbered from 01 within each skill.
- **No scenarios:** the Developer exam doesn't use them, so there's no `scenario` field. Each stem carries its own context, as in the official samples.
- **Multiple-response items:** `"type": "multi"`, `"select": 2` (or 3), and 5 options A–E. The stem must end with `(Select TWO.)` or `(Select THREE.)`.
- **Style:**
  - realistic developer decisions: code, API calls, config, cost, security and debugging
  - four plausible options of similar length
  - wrong options are mistakes a working engineer might really make
  - no "all of the above"
  - the correct option is **never** the longest
- **Balance:** spread the correct letters evenly over A–D across your file. Mix difficulty 2 and 3, with at most a few at difficulty 1.
- **Coverage:** follow the per-skill counts in your brief exactly. Together with the 3 official samples (DVO-01 = skill 2.3, DVO-02 = 7.1, DVO-03 = 8.3) they must match `CCA.devTargets` in `data/blueprint.dev.js`.
- `why` must cover every wrong option.

## Check your work
Run `python3 tools/build_data.py --check`. Fix every `ERROR` that mentions your ids. `WARN dev skill` lines about skills that aren't yours are expected while the other author works. Only edit your own file. Never call the Claude API.
