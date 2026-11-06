# Claude certification study kit

Open-source exam prep for **Claude Certified Architect – Foundations (CCAR-F)**, plus a mock exam for **Claude Certified Developer – Foundations (CCDV-F)**. It is written against the exam guides v1.0 (July 2026); Anthropic updated exam content on Dec 7, 2026. The typical learner is a busy professional studying about 1 h a day. Their plan start and exam dates are in `progress/progress.json` under `settings`.

## Hard rule
Never use Claude API credits: no API keys, SDK calls, `claude -p` in scripts, or Message Batches. Everything runs locally and offline. Tutoring happens in Claude Code conversations through the `/tutor` skill.

## Layout
- `app/`: static quiz app (index.html, app.js, styles.css). Open it with `./start.sh`, which serves http://127.0.0.1:8765 and saves progress to `progress/progress.json`.
- `data/blueprint.js`: domains, 30 task statements, scenarios, official doc links. `data/schedule.js`: 5-week day-by-day plan.
- `data/blueprint.dev.js`: Developer – Foundations (CCDV-F) domains, 25 skills and per-skill mock targets. `data/dev/authored/*.json`: Developer mock questions (`DV-<skill>-nn`). The 3 official samples (`DVO-xx`) are imported by `tools/import_sources.py`. They are kept out of drills and spaced review.
- `tools/build_mocks.py` builds the fixed forms in `data/mocks.js` (Architect Mock A: 60 items matched to the blueprint; Developer Mock A: 53 items). Run it after `tools/build_data.py`.
- `tools/setup.py` (run by `./start.sh`) downloads the sources this repo doesn't redistribute into `vendor/`: the official exam guides, and the community guide pinned to one commit. It then builds everything. `data/questions.official.js`, `questions.community.js`, `questions.dev.official.js` and all other generated `data/*.js` files are git-ignored build outputs. Don't edit them by hand.
- `data/authored/*.json`: authored questions. `data/enrichment/*.json`: tags and deeper explanations for imported questions. `notes/*.md`: one learn card per task statement.
- `tools/build_data.py` validates all of the above and generates `data/questions.authored.js`, `data/enrichment.js` and `data/cards.js`. Run it after any content change.
- `tools/lookup.py`: read-only CLI the tutor uses (`status`, `q <id>`, `task <id>`, `find <words>`).
- `tools/AUTHORING.md`: the formats and quality bar for new cards and questions.

## Conventions
- Exam terminology follows guide v1.0. Where the current docs differ, keep the exam term and note the difference in one line.
- Question ids: `OFF-xx` official, `COM-xx` community, `A-<scenario>-xx` authored.
- The community repo has no license, and the official guides are Anthropic's material. Never commit `vendor/`, `progress/` or generated data files. `.gitignore` covers them.
- Licenses: code is MIT (`LICENSE`). Authored content (`notes/`, `data/authored/`, `data/enrichment/`, `data/dev/`, docs) is CC BY 4.0 (`LICENSE-CONTENT`).
