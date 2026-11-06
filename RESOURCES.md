# Resources

Official sources come first. Where the community material and an official source disagree, trust the **official exam guide**. All links were checked in November 2026. Files named `vendor/…` below are local copies that `tools/setup.py` downloads from the original source. They are not part of this repository.

## 1. Official: exam and registration
| What | Link | Notes |
|---|---|---|
| **CCAR-F Exam Guide v1.0** (PDF) | [Claude Certified Architect – Foundations Exam Guide](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf) | **The authority.** Format, 5 domains, 30 task statements, 6 scenarios, 4 exercises, 12 sample questions. Local copies: `vendor/official-ccar-f-exam-guide.pdf` and `.txt`. |
| Exam page (buy, $125) | [anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification](https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification) | Also links the Terms & Conditions and the Exam Policy. |
| All certifications | [Partner Academy: certifications](https://anthropic-partners.skilljar.com/page/partner-certifications) | Associate, Developer, Architect F/P. Says to start at Foundations. |
| Eligibility | [Who can take an exam](https://anthropic-partners.skilljar.com/page/certification-eligibility) | Exams are for **Claude Partner Network** organizations. [Partner registration](https://partnerportal.anthropic.com/s/partner-registration) |
| Pearson VUE (scheduling, policies) | [pearsonvue.com/us/en/anthropic.html](https://www.pearsonvue.com/us/en/anthropic.html) | **Content update Dec 7, 2026; new guides published Nov 17, 2026.** Retakes: wait 14 / 30 / 90 days, max 4 attempts in 12 months. Reschedule ≥ 48 h before. |
| Online proctoring | [OnVUE info](https://www.pearsonvue.com/us/en/anthropic/onvue.html) | Run the system check in advance. |
| Support | certifications-support@anthropic.com | Name corrections, issues. |

### Exam facts (from the official guide)
60 items, multiple choice plus **multiple-response** (each item says how many to pick). 120 minutes. **4 of 6 scenarios** at random. Scaled score 100–1000, **pass at 720**. Your score report shows percent-correct by domain. The credential is valid for 12 months.

| Domain | Weight |
|---|---|
| 1. Agentic Architecture & Orchestration | 27% |
| 2. Tool Design & MCP Integration | 18% |
| 3. Claude Code Configuration & Workflows | 20% |
| 4. Prompt Engineering & Structured Output | 20% |
| 5. Context Management & Reliability | 15% |

Scenarios: Customer Support Resolution Agent · Code Generation with Claude Code · Multi-Agent Research System · Developer Productivity with Claude · Claude Code for CI · Structured Data Extraction.

## 2. Official: free courses (Anthropic Academy)
These are the prep courses the Partner Academy recommends for CCAR-F. Public versions are on anthropic.skilljar.com.

| Course | Link | Best for |
|---|---|---|
| Building with the Claude API | [anthropic.skilljar.com/claude-with-the-anthropic-api](https://anthropic.skilljar.com/claude-with-the-anthropic-api) | D1, D2, D4: tool use, structured output, agent loops |
| Claude Code in Action | [anthropic.skilljar.com/claude-code-in-action](https://anthropic.skilljar.com/claude-code-in-action) | D3: CLAUDE.md, hooks, headless/CI |
| Introduction to Model Context Protocol | [anthropic.skilljar.com/introduction-to-model-context-protocol](https://anthropic.skilljar.com/introduction-to-model-context-protocol) | D2: MCP tools, resources, servers |
| MCP: Advanced Topics | [anthropic.skilljar.com/model-context-protocol-advanced-topics](https://anthropic.skilljar.com/model-context-protocol-advanced-topics) | D2 (optional depth) |
| Introduction to Agent Skills | [anthropic.skilljar.com/introduction-to-agent-skills](https://anthropic.skilljar.com/introduction-to-agent-skills) | D3: skills, `context: fork`, `allowed-tools` |

You don't need the videos for the API courses to run the code. Watching and reading is enough; running their notebooks would use API credits.

## 3. Official: documentation by domain
Each learn card in the app links the most relevant pages for its task statement. The main ones:

- **Agent SDK:** [overview](https://platform.claude.com/docs/en/agent-sdk/overview) · [agent loop](https://platform.claude.com/docs/en/agent-sdk/agent-loop) · [subagents](https://platform.claude.com/docs/en/agent-sdk/subagents) · [hooks](https://platform.claude.com/docs/en/agent-sdk/hooks) · [sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) · [permissions](https://platform.claude.com/docs/en/agent-sdk/permissions) · [MCP](https://platform.claude.com/docs/en/agent-sdk/mcp)
- **Claude API:** [tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) · [implement tool use / tool_choice](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) · [stop reasons](https://platform.claude.com/docs/en/api/handling-stop-reasons) · [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) · [batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) · [context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) · [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- **Prompt engineering:** [best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) · [be clear and direct](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/be-clear-and-direct) · [few-shot](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting) · [chaining](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/chain-prompts) · [reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- **Claude Code:** [memory / CLAUDE.md / rules](https://code.claude.com/docs/en/memory) · [skills](https://code.claude.com/docs/en/skills) · [slash commands](https://code.claude.com/docs/en/slash-commands) · [hooks](https://code.claude.com/docs/en/hooks) · [subagents](https://code.claude.com/docs/en/sub-agents) · [MCP](https://code.claude.com/docs/en/mcp) · [headless `-p`](https://code.claude.com/docs/en/headless) · [CLI reference](https://code.claude.com/docs/en/cli-reference) · [GitHub Actions](https://code.claude.com/docs/en/github-actions) · [tools reference](https://code.claude.com/docs/en/tools-reference) · [best practices](https://code.claude.com/docs/en/best-practices)
- **MCP:** [server concepts](https://modelcontextprotocol.io/docs/learn/server-concepts) · [tools spec (`isError`)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- **Anthropic engineering blog:** [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) · [Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) · [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) · [Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) · [Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices)

## 4. Community (unofficial, use with care)
| What | Notes |
|---|---|
| [paullarionov/claude-certified-architect](https://github.com/paullarionov/claude-certified-architect) · [guide_en.md](https://github.com/paullarionov/claude-certified-architect/blob/main/guide_en.md) | Theory chapters plus domain notes that mirror the official guide, the 12 official samples in shortened form, and **76 practice questions** (12 of them restate the official samples; the app links each duplicate to its official version). It has **no Developer Productivity or Structured Extraction questions** and **no multiple-response items**, so this system adds authored ones. It also has a community-reported "Conversational AI" scenario that isn't in guide v1.0. **The repo has no license**, so this kit doesn't redistribute it. `tools/setup.py` downloads `guide_en.md`, pinned to commit `946cd28`, onto your machine. |
| Blog: ["How I Passed the Claude Certified Architect — Foundations (CCA-F) Exam: My Experience and…"](https://medium.com/@kbdhunga/how-i-passed-the-claude-certified-architect-foundations-cca-f-exam-my-experience-and-66bc455aaf23) by Kamal Dhungana (Medium, Jul 22, 2026) | Practical tips: start with 2 practice tests, aim for ≥ 75%, don't memorise answers, and be able to argue every option. Weak spots it reports: built-in tools and Message Batches. Nullable/enum questions are likely. These ideas are built into the app's explanations and the schedule. |
| [Claude Test Prep](https://claudetestprep.com/) | An independent prep site with blueprint-weighted practice and full-length timed mocks for all four exams. It inspired this kit's Mock exams tab. Not affiliated with this kit. |
| Other community prep sites and repos | Plenty exist (practice simulators, cheat sheets). None is verified against the official guide. Use them for extra reps only. |

## 5. Developer – Foundations (CCDV-F): mock exam only
The official [CCDV-F exam guide v1.0](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf) is also saved locally as `vendor/official-ccdv-f-exam-guide.pdf`.

The exam is 53 items in 120 minutes, pass at 720, $125, with **no scenarios**. Its 8 domains:

| Domain | Weight |
|---|---|
| Agents & Workflows | 14.7% |
| Applications & Integration | 33.1% |
| Claude Code | 3.1% |
| Eval/Testing/Debugging | 2.6% |
| Model Selection & Optimization | 16.8% |
| Prompt & Context Engineering | 11.0% |
| Security & Safety | 8.1% |
| Tools & MCPs | 10.6% |

The guide has 3 sample items. The app's **Developer – Foundations · Mock A** uses those 3 plus 50 new items written to these weights. Each Developer mock item links to the official docs for its skill (see `data/blueprint.dev.js`).

## 6. Later: Architect – Professional (CCAR-P)
The official [CCAR-P exam guide](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542810%2FClaude+Certified+Architect+%E2%80%93+Professional+Exam+Guide.pdf) (local copy: `vendor/official-ccar-p-exam-guide.pdf`) lists 63 items in 120 minutes, pass at 720, $175, and no mandatory prerequisites (the program advises Foundations first). Its 7 domains are mostly different:
- Solution Design & Architecture (17%)
- Models, Prompting & Context Engineering (13%)
- Integration, including RAG, auth and observability (19%)
- Evaluation, Testing & Optimization (16%)
- Governance, Safety & Risk (14%)
- Stakeholder Communication & Lifecycle (14%)
- Developer Productivity (7%)

Its content also changed on Dec 7, 2026 (new guides published Nov 17, 2026). This kit doesn't cover it yet, but its structure (blueprint, cards, questions) can be extended for it. Contributions are welcome.
