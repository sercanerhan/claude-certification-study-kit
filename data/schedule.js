// 5-week sprint, written as reference dates starting Mon Oct 26, 2026 (CCA.scheduleBase).
// The app shifts every date so the plan starts on the learner's own start date (Plan tab).
// Every day is capped at ~60 min (mocks run in two 30-question parts). Every day has a 15-minute fallback: 10 due reviews.
// Item kinds: read | card | drill | review | official | diagnostic | mock | mockResume | mockReview | weak | handson | todo
window.CCA = window.CCA || {};
CCA.scheduleBase = "2026-10-26";

(function () {
const GUIDE = "../vendor/official-ccar-f-exam-guide.pdf";

CCA.weeks = [
  { n: 1, start: "2026-10-26", title: "Baseline + Domain 1: Agentic architecture (27%)" },
  { n: 2, start: "2026-11-02", title: "Domain 2: Tools & MCP (18%) + Domain 5: Context & reliability (15%)" },
  { n: 3, start: "2026-11-09", title: "Domain 3: Claude Code configuration (20%) + built-in tools" },
  { n: 4, start: "2026-11-16", title: "Domain 4: Prompting & structured output (20%) + Mock 1" },
  { n: 5, start: "2026-11-23", title: "Weak areas + Mock 2" },
  { n: 6, start: "2026-11-30", title: "Exam week" },
];

const card = (task, min = 15) => ({ kind: "card", task, min });
const drill = (title, filter, n, min) => ({ kind: "drill", title, filter, n, min: min || Math.round(n * 1.5) });
const review = (n = 10) => ({ kind: "review", n, min: Math.round(n * 1.2) });

CCA.schedule = [
  // Week 1
  { date: "2026-10-26", title: "Kick-off: know the exam", items: [
    { kind: "read", title: "Official exam guide §1–5: format, domains, the 6 scenarios", url: GUIDE, min: 20 },
    { kind: "official", title: "Official sample questions (12) — untimed, honest first try", min: 25 },
    { kind: "todo", title: "Check eligibility: is your company in the Claude Partner Network?", text: "The exam is only open to Claude Partner Network organizations. Ask whoever manages your Anthropic partnership, or see the Partner Academy page in RESOURCES.md.", min: 5 },
  ]},
  { date: "2026-10-27", title: "Diagnostic", items: [
    { kind: "diagnostic", title: "Diagnostic: 20 mixed questions across all domains", n: 20, min: 35 },
    { kind: "todo", title: "Look at Progress → note your 3 weakest domains", min: 5 },
  ]},
  { date: "2026-10-28", title: "Agentic loops", items: [card("1.1"), drill("Drill: 1.1 agentic loops", { tasks: ["1.1"] }, 6), card("1.2"), review(8)] },
  { date: "2026-10-29", title: "Coordinators & subagents", items: [drill("Drill: 1.2", { tasks: ["1.2"] }, 6), card("1.3"), drill("Drill: 1.3 context passing", { tasks: ["1.3"] }, 6), review(8)] },
  { date: "2026-10-30", title: "Enforcement & hooks", items: [card("1.4"), card("1.5"), drill("Drill: 1.4 + 1.5", { tasks: ["1.4", "1.5"] }, 10), review(8)] },
  { date: "2026-10-31", title: "Weekend block: finish Domain 1", weekend: true, items: [
    card("1.6"), card("1.7"),
    drill("Domain 1 set (15)", { domains: [1] }, 15, 25),
  ]},
  { date: "2026-11-01", title: "Exercise 4 + catch-up", optional: true, items: [
    { kind: "read", title: "Official guide §8 Exercise 4 (multi-agent research pipeline): sketch the design on paper", url: GUIDE, min: 20 },
    review(15),
  ]},

  // Week 2
  { date: "2026-11-02", title: "Tool interfaces & errors", items: [card("2.1"), card("2.2"), drill("Drill: 2.1 + 2.2", { tasks: ["2.1", "2.2"] }, 8), review(8)] },
  { date: "2026-11-03", title: "Tool distribution & MCP", items: [card("2.3"), card("2.4"), drill("Drill: 2.3 + 2.4", { tasks: ["2.3", "2.4"] }, 8), review(8)] },
  { date: "2026-11-04", title: "Context & escalation", items: [card("5.1"), card("5.2"), drill("Drill: 5.1 + 5.2", { tasks: ["5.1", "5.2"] }, 8), review(8)] },
  { date: "2026-11-05", title: "Errors across agents & big codebases", items: [card("5.3"), card("5.4"), drill("Drill: 5.3 + 5.4", { tasks: ["5.3", "5.4"] }, 8), review(8)] },
  { date: "2026-11-06", title: "Human review & provenance", items: [card("5.5"), card("5.6"), drill("Drill: 5.5 + 5.6", { tasks: ["5.5", "5.6"] }, 8), review(8)] },
  { date: "2026-11-07", title: "Weekend block: scenarios S1 + S3", weekend: true, items: [
    drill("Scenario set: Customer Support Agent", { scenarios: ["S1"] }, 15, 25),
    drill("Scenario set: Multi-Agent Research", { scenarios: ["S3"] }, 15, 25),
  ]},
  { date: "2026-11-08", title: "Book the exam + Exercise 1", optional: true, items: [
    { kind: "todo", title: "Book the exam for the middle of week 6 (Partner Academy → Pearson VUE)", text: "Pick a slot two or three days into week 6, leaving the first day for a calm final review. Cancel or reschedule at least 48h before (Pearson VUE's page says 48h, the exam guide says 24h, so use 48h to be safe). A retake needs a 14-day wait.", min: 15 },
    { kind: "read", title: "Official guide §8 Exercise 1 (multi-tool agent with escalation): write the tool descriptions + error schema yourself", url: GUIDE, min: 25 },
  ]},

  // Week 3
  { date: "2026-11-09", title: "CLAUDE.md hierarchy", items: [card("3.1"), { kind: "handson", title: "Hands-on: read this project's CLAUDE.md, then add a user-level ~/.claude/CLAUDE.md line and an @import — notice what loads where", min: 15 }, drill("Drill: 3.1", { tasks: ["3.1"] }, 6), review(6)] },
  { date: "2026-11-10", title: "Commands & skills", items: [card("3.2"), { kind: "handson", title: "Hands-on: open .claude/skills/tutor/SKILL.md in this project — identify frontmatter, then run /tutor 3.2 in Claude Code", min: 15 }, drill("Drill: 3.2", { tasks: ["3.2"] }, 6), review(6)] },
  { date: "2026-11-11", title: "Path rules & plan mode", items: [card("3.3"), card("3.4"), drill("Drill: 3.3 + 3.4", { tasks: ["3.3", "3.4"] }, 8), review(6)] },
  { date: "2026-11-12", title: "Built-in tools (extra time)", items: [card("2.5", 20), drill("Drill: 2.5 built-in tools", { tasks: ["2.5"] }, 8), review(8)] },
  { date: "2026-11-13", title: "Iteration & CI/CD", items: [card("3.5"), card("3.6"), drill("Drill: 3.5 + 3.6", { tasks: ["3.5", "3.6"] }, 8), review(6)] },
  { date: "2026-11-14", title: "Weekend block: scenarios S2 + S4", weekend: true, items: [
    drill("Scenario set: Code Generation with Claude Code", { scenarios: ["S2"] }, 15, 25),
    drill("Scenario set: Developer Productivity", { scenarios: ["S4"] }, 15, 25),
  ]},
  { date: "2026-11-15", title: "Hands-on: Exercise 2", optional: true, items: [
    { kind: "handson", title: "Official guide §8 Exercise 2 in a scratch repo: project CLAUDE.md, .claude/rules/ with paths globs, a skill with context: fork, a .mcp.json with ${ENV} expansion", min: 35 },
    review(10),
  ]},

  // Week 4
  { date: "2026-11-16", title: "Explicit criteria", items: [card("4.1"), drill("Drill: 4.1", { tasks: ["4.1"] }, 6), card("4.2"), review(8)] },
  { date: "2026-11-17", title: "Few-shot + exam guide check", items: [drill("Drill: 4.2", { tasks: ["4.2"] }, 6), card("4.3"), drill("Drill: 4.3 schemas", { tasks: ["4.3"] }, 6),
    { kind: "todo", title: "Check the Partner Academy for a newer exam guide than v1.0 (July 2026). Anthropic updated exam content on Dec 7, 2026; if your exam uses a newer guide, compare its task list with the Learn tab", min: 10 }] },
  { date: "2026-11-18", title: "Validation & retries", items: [card("4.4"), drill("Drill: 4.3 + 4.4", { tasks: ["4.3", "4.4"] }, 8), review(10)] },
  { date: "2026-11-19", title: "Message Batches (extra time)", items: [card("4.5", 20), drill("Drill: 4.5 batches", { tasks: ["4.5"] }, 8), review(8)] },
  { date: "2026-11-20", title: "Multi-pass review + S5/S6", items: [card("4.6"), drill("Scenario set: CI/CD", { scenarios: ["S5"] }, 10, 15), drill("Scenario set: Structured extraction", { scenarios: ["S6"] }, 10, 15)] },
  { date: "2026-11-21", title: "MOCK 1 — part 1", weekend: true, items: [
    { kind: "mock", split: true, form: "ARCH-A", title: "Mock exam 1 (Architect Mock A), part 1: items 1–30 (~60 min, exam conditions, no notes). Stop when the app says Part 1 done.", min: 60 },
  ]},
  { date: "2026-11-22", title: "MOCK 1 — part 2", weekend: true, items: [
    { kind: "mockResume", title: "Mock exam 1 (Architect Mock A), part 2: items 31–60 (~60 min), then end the exam", min: 60 },
  ]},

  // Week 5
  { date: "2026-11-23", title: "Mock 1 review", items: [
    { kind: "mockReview", title: "Review every wrong + guessed answer from Mock 1; for each, re-read the task card", min: 45 },
    { kind: "todo", title: "Write down your 4 weakest task statements (Progress → task grid)", min: 5 },
  ]},
  { date: "2026-11-24", title: "Weak areas I", items: [{ kind: "weak", title: "Drill your weakest task statements", n: 15, min: 25 }, review(15)] },
  { date: "2026-11-25", title: "Weak areas II", items: [{ kind: "weak", title: "Drill your weakest task statements", n: 15, min: 25 }, review(15)] },
  { date: "2026-11-26", title: "Mistakes sweep", items: [drill("All previous mistakes", { mistakes: true }, 20, 30), review(10)] },
  { date: "2026-11-27", title: "Scenario rotation + traps", items: [drill("Mixed scenario set (all 6)", { scenarios: ["S1", "S2", "S3", "S4", "S5", "S6"] }, 15, 25), { kind: "todo", title: "Re-read the 'Exam traps' section of your 6 weakest cards", min: 20 }] },
  { date: "2026-11-28", title: "MOCK 2 — part 1", weekend: true, items: [
    { kind: "mock", split: true, title: "Mock exam 2 (random Architect mock, fresh items where possible), part 1: items 1–30 (~60 min)", min: 60 },
  ]},
  { date: "2026-11-29", title: "MOCK 2 — part 2", weekend: true, items: [
    { kind: "mockResume", title: "Mock exam 2, part 2: questions 31–60 (~60 min), then submit", min: 60 },
  ]},

  // Exam week
  { date: "2026-11-30", title: "Mock 2 review + go/no-go", items: [
    { kind: "mockReview", title: "Review Mock 2 wrong + guessed answers", min: 40 },
    { kind: "todo", title: "Go/no-go: both mocks ≥ 75% and no domain < 60%? If not, consider moving the exam (≥48h before); check which exam-guide version applies to the new date", min: 5 },
  ]},
  { date: "2026-12-01", title: "Final review (exam window starts)", items: [
    { kind: "todo", title: "Skim the 'Remember' section of all 30 cards (Learn tab)", min: 30 },
    review(15),
    { kind: "todo", title: "Day before the exam: no new material. ID ready; for online proctoring run the OnVUE system check. Sleep.", min: 5 },
  ]},
  { date: "2026-12-02", title: "Exam day (or light review)", items: [
    { kind: "todo", title: "In the exam: ~2 min per question; read the deciding phrase ('first step', 'most effective', 'must always'); mark and move on; answer every item — no guessing penalty", min: 0 },
    { kind: "todo", title: "Not your exam day? 20 min: flagged questions + 'Remember' bullets only", min: 20 },
  ]},
  { date: "2026-12-03", title: "Exam day (last day of the window)", items: [{ kind: "todo", title: "Exam day (if booked today)", min: 0 }] },
];
})();
