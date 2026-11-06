/* CCA-F study app — static, no network calls except saving progress to the local serve.py (if used). */
(function () {
  "use strict";

  // ---------------------------------------------------------------- helpers
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const DAY = 86400000;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (c, n) => (n ? Math.round((100 * c) / n) : 0);
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  function localDate(d = new Date()) {
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }
  const params = new URLSearchParams(location.search);
  const TODAY = params.get("date") || localDate(); // ?date=YYYY-MM-DD lets you preview another day
  const dayStart = (dateStr) => new Date(dateStr + "T00:00:00").getTime();
  const NOW = () => (params.get("date") ? dayStart(TODAY) + 12 * 3600000 : Date.now());
  const fmtDate = (s, opts = { weekday: "short", month: "short", day: "numeric" }) => new Date(s + "T12:00:00").toLocaleDateString(undefined, opts);

  // Tiny markdown renderer (headings, lists, code, bold/italic, links, paragraphs)
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/→/g, "&rarr;");
  }
  function md(src) {
    const lines = String(src || "").split("\n");
    let out = "", list = null, para = [];
    const flushPara = () => { if (para.length) { out += `<p>${inline(para.join(" "))}</p>`; para = []; } };
    const flushList = () => { if (list) { out += `</${list}>`; list = null; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^```/.test(line)) {
        flushPara(); flushList();
        const code = [];
        while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
        out += `<pre><code>${esc(code.join("\n"))}</code></pre>`;
        continue;
      }
      let m;
      if ((m = line.match(/^(#{2,4})\s+(.*)$/))) { flushPara(); flushList(); const h = m[1].length; out += `<h${h}>${inline(m[2])}</h${h}>`; continue; }
      if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { flushPara(); if (list !== "ul") { flushList(); out += "<ul>"; list = "ul"; } out += `<li>${inline(m[1])}</li>`; continue; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); if (list !== "ol") { flushList(); out += "<ol>"; list = "ol"; } out += `<li>${inline(m[1])}</li>`; continue; }
      if (!line.trim()) { flushPara(); flushList(); continue; }
      if (list && /^\s{2,}/.test(line)) { out = out.replace(/<\/li>$/, " " + inline(line.trim()) + "</li>"); continue; }
      flushList(); para.push(line.trim());
    }
    flushPara(); flushList();
    return out;
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
    toast("Copied to clipboard");
  }

  // ---------------------------------------------------------------- data
  const C = window.CCA || {};
  const TASKS = Object.fromEntries(C.tasks.map((t) => [t.id, t]));
  const DOMAINS = Object.fromEntries(C.domains.map((d) => [d.id, d]));
  const SCEN = Object.fromEntries(C.scenarios.map((s) => [s.id, s]));
  const CARDS = Object.fromEntries((C.cards || []).map((c) => [c.task, c]));
  const ENR = C.enrichment || {};
  const ALL = [...(C.questionsOfficial || []), ...(C.questionsCommunity || []), ...(C.questionsAuthored || [])].map((q) => ({ ...q, ...(ENR[q.id] || {}) }));
  const BY_ID = Object.fromEntries(ALL.map((q) => [q.id, q]));
  const POOL = ALL.filter((q) => !q.duplicateOf && q.task && TASKS[q.task]);
  const DEV_DOMAINS = Object.fromEntries((C.devDomains || []).map((d) => [d.id, d]));
  const DEV_SKILLS = Object.fromEntries((C.devSkills || []).map((x) => [x.id, x]));
  (C.questionsDev || []).forEach((q) => { BY_ID[q.id] = q; });
  const FORMS = Object.fromEntries((C.mockForms || []).map((f) => [f.id, f]));
  const isDev = (q) => !!q && q.exam === "CCDV-F";
  const EXAMS = {
    "CCAR-F": { code: "CCAR-F", name: C.exam.name, short: "Architect – Foundations", domains: C.domains, domain: (id) => DOMAINS[id],
      unitLabel: "Task", unit: (q) => q.task, unitTitle: (u) => (TASKS[u] ? TASKS[u].title : u), docs: (q) => (TASKS[q.task] ? TASKS[q.task].docs : []) },
    "CCDV-F": { code: "CCDV-F", name: (C.devExam || {}).name || "Claude Certified Developer – Foundations", short: "Developer – Foundations", domains: C.devDomains || [], domain: (id) => DEV_DOMAINS[id],
      unitLabel: "Skill", unit: (q) => q.skill, unitTitle: (u) => (DEV_SKILLS[u] ? DEV_SKILLS[u].name : u), docs: (q) => (DEV_SKILLS[q.skill] ? DEV_SKILLS[q.skill].docs : []) },
  };
  const examOf = (q) => EXAMS[isDev(q) ? "CCDV-F" : "CCAR-F"];
  const dcol = (d) => `var(--d${((d - 1) % 5) + 1})`;

  // The schedule is written against reference dates (CCA.scheduleBase). Each learner picks a plan start
  // date and an exam date (Plan tab); every schedule date is shifted by the same number of days.
  const SCHED_BASE = C.scheduleBase || C.schedule[0].date;
  const SCHED_REF = C.schedule.map((d) => d.date), WEEKS_REF = C.weeks.map((w) => w.start);
  const EXAM_OFFSET = 37; // reference exam day (day 38 of the plan, middle of week 6)
  const addDays = (dateStr, n) => localDate(new Date(dayStart(dateStr) + n * DAY + 12 * 3600000));
  const daysBetween = (a, b) => Math.round((dayStart(b) - dayStart(a)) / DAY);
  function applySchedule() {
    const shift = daysBetween(SCHED_BASE, P.settings.planStart);
    C.schedule.forEach((d, i) => { d.date = addDays(SCHED_REF[i], shift); });
    C.weeks.forEach((w, i) => { w.start = addDays(WEEKS_REF[i], shift); });
  }
  function ensurePlanDates() {
    if (!P.settings.planStart) {
      // Existing progress keeps its dates: start the plan on the earliest day with activity.
      const used = [...Object.keys(P.checks).map((k) => k.split("#")[0]), ...Object.keys(P.days)].filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)).sort();
      P.settings.planStart = used[0] || TODAY;
    }
    const isNew = !P.settings.examDate;
    if (isNew) P.settings.examDate = addDays(P.settings.planStart, EXAM_OFFSET);
    applySchedule();
    if (isNew) save(); // pin the start date, so it doesn't move forward with each new day
  }
  const SOURCE_LABEL = { official: "Official sample", community: "Community", authored: "Authored" };
  const INTERVALS = [0, 1, 2, 4, 8, 16];

  // ---------------------------------------------------------------- progress store
  const KEY = "cca-progress-v1";
  const SERVER = location.protocol.startsWith("http");
  const blank = () => ({ version: 1, updatedAt: 0, answers: {}, mocks: [], sessions: [], days: {}, checks: {}, cardsRead: {}, flags: {}, settings: {}, active: null, activeMock: null });
  let P = blank();
  try { P = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { /* private mode etc. */ }

  let saveTimer = null;
  function save() {
    P.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* ignore */ }
    if (SERVER) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(P) })
          .then((r) => setSaveState(r.ok ? "Saved to progress/progress.json" : "Saved in browser only"))
          .catch(() => setSaveState("Saved in browser only"));
      }, 400);
    } else setSaveState("Saved in this browser");
  }
  function setSaveState(s) { const el = $("#save-state"); if (el) el.textContent = s; }

  async function syncFromServer() {
    if (!SERVER) { setSaveState("Saved in this browser"); return; }
    try {
      const r = await fetch("/api/progress", { cache: "no-store" });
      if (r.ok) {
        const remote = await r.json();
        if (remote && remote.updatedAt > (P.updatedAt || 0)) P = { ...blank(), ...remote };
        setSaveState("Synced with progress/progress.json");
      }
    } catch { setSaveState("Saved in browser only"); }
  }

  const today = () => (P.days[TODAY] ||= { minutes: 0, answered: 0 });
  function addMinutes(m) { if (m > 0) { today().minutes = Math.round((today().minutes + m) * 10) / 10; } }

  function grade(qid, ok, conf, mode) {
    if (isDev(BY_ID[qid])) return; // Developer mock items stay out of spaced repetition
    const a = (P.answers[qid] ||= { box: 0, n: 0, c: 0, hist: [] });
    a.n++; if (ok) a.c++;
    a.hist.push({ t: NOW(), ok, conf, mode });
    if (a.hist.length > 20) a.hist.shift();
    if (!ok) a.box = 1;
    else if (conf === "sure") a.box = Math.min(5, (a.box || 0) + 1);
    else a.box = Math.max(1, a.box || 1);
    a.due = dayStart(TODAY) + INTERVALS[a.box] * DAY;
    a.last = NOW();
    today().answered++;
  }
  const lastOk = (qid) => { const a = P.answers[qid]; return a && a.hist.length ? a.hist[a.hist.length - 1].ok : null; };
  const dueIds = () => Object.entries(P.answers).filter(([id, a]) => BY_ID[id] && a.due && a.due <= NOW()).sort((x, y) => x[1].due - y[1].due || x[1].box - y[1].box).map(([id]) => id);
  const mistakeIds = () => POOL.filter((q) => lastOk(q.id) === false).map((q) => q.id);
  const flaggedIds = () => Object.keys(P.flags).filter((id) => P.flags[id] && BY_ID[id] && !isDev(BY_ID[id]));

  function taskStats(taskId) {
    const qs = POOL.filter((q) => q.task === taskId);
    const tried = qs.filter((q) => lastOk(q.id) !== null);
    const ok = tried.filter((q) => lastOk(q.id)).length;
    return { total: qs.length, n: tried.length, c: ok, acc: tried.length ? ok / tried.length : null };
  }
  function domainStats(d) {
    const qs = POOL.filter((q) => q.domain === d);
    const tried = qs.filter((q) => lastOk(q.id) !== null);
    const ok = tried.filter((q) => lastOk(q.id)).length;
    return { total: qs.length, n: tried.length, c: ok, acc: tried.length ? ok / tried.length : null };
  }
  function weakestTasks(k = 3) {
    return C.tasks.map((t) => { const s = taskStats(t.id); return { id: t.id, score: (s.c + 1) / (s.n + 2), s }; })
      .filter((x) => x.s.total > 0).sort((a, b) => a.score - b.score).slice(0, k);
  }
  function streak() {
    let n = 0, d = new Date(TODAY + "T12:00:00");
    const active = (s) => P.days[s] && (P.days[s].answered > 0 || P.days[s].minutes >= 10);
    if (!active(localDate(d))) d = new Date(d.getTime() - DAY);
    while (active(localDate(d))) { n++; d = new Date(d.getTime() - DAY); }
    return n;
  }

  // ---------------------------------------------------------------- question selection
  function pick(filter = {}, n = 10) {
    let qs = POOL;
    if (filter.tasks) qs = qs.filter((q) => filter.tasks.includes(q.task));
    if (filter.domains) qs = qs.filter((q) => filter.domains.includes(q.domain));
    if (filter.scenarios) qs = qs.filter((q) => filter.scenarios.includes(q.scenario));
    if (filter.sources) qs = qs.filter((q) => filter.sources.includes(q.source));
    if (filter.multiOnly) qs = qs.filter((q) => q.type === "multi");
    if (filter.mistakes) { const m = new Set(mistakeIds()); qs = qs.filter((q) => m.has(q.id)); }
    if (filter.flagged) { const f = new Set(flaggedIds()); qs = qs.filter((q) => f.has(q.id)); }
    if (filter.unseen) qs = qs.filter((q) => !P.answers[q.id]);
    const rank = (q) => { const a = P.answers[q.id]; if (!a) return 0; if (lastOk(q.id) === false) return 1; if (a.due <= NOW()) return 2; return 3 + a.box; };
    return shuffle(qs).sort((a, b) => rank(a) - rank(b)).slice(0, n).map((q) => q.id);
  }
  function pickDiagnostic() {
    const quota = { 1: 5, 2: 4, 3: 4, 4: 4, 5: 3 };
    return shuffle(Object.entries(quota).flatMap(([d, k]) => pick({ domains: [Number(d)], sources: ["community", "authored"] }, k)));
  }
  function pickWeak(n = 15) {
    const tasks = weakestTasks(3).map((x) => x.id);
    return pick({ tasks }, n);
  }
  function pickMock() {
    const used = new Set(P.mocks.flatMap((m) => m.qids));
    const eligible = C.scenarios.filter((s) => s.official && POOL.filter((q) => q.scenario === s.id).length >= 15).map((s) => s.id);
    const scen = shuffle(eligible).slice(0, 4);
    const qids = [];
    for (const s of scen) {
      const qs = shuffle(POOL.filter((q) => q.scenario === s));
      qs.sort((a, b) => (used.has(a.id) - used.has(b.id)) || (!!P.answers[a.id] - !!P.answers[b.id]));
      qids.push(...qs.slice(0, 15).map((q) => q.id));
    }
    return { scen, qids };
  }

  // ---------------------------------------------------------------- sessions
  function startSession({ title, qids, mode = "practice", itemKey = null, scen = null, split = true, exam = "CCAR-F", form = null, minutes = 120 }) {
    if (!qids.length) { toast("No questions match — try a wider filter"); return; }
    if (mode === "mock") {
      // Mocks live in their own slot so practice drills can run between the two parts.
      P.activeMock = { mode, title, qids, i: 0, resp: {}, startedAt: NOW(), itemKey, scen, split, exam, form, minutes,
        elapsedMs: 0, runningSince: null, part1Ms: null, onBreak: false, view: "item", timeOn: {}, firstSel: {} };
      if (!split) P.activeMock.endsAt = Date.now() + minutes * 60000;
      save();
      location.hash = "#/mock";
      return;
    }
    P.active = { mode, title, qids, i: 0, resp: {}, startedAt: NOW(), lastAct: Date.now(), itemKey, scen };
    save();
    location.hash = "#/quiz";
  }

  // Split mocks: the clock only runs while the mock screen is open and visible.
  const partSize = (s) => Math.ceil(s.qids.length / 2);
  const partMs = (s) => ((s.minutes || 120) / 2) * 60000;
  const paceMs = (s) => ((s.minutes || 120) * 60000) / s.qids.length;
  const mockElapsed = (s) => s.elapsedMs + (s.runningSince ? Date.now() - s.runningSince : 0);
  function pauseMock() {
    const s = P.activeMock;
    if (!s || !s.split || !s.runningSince) return;
    s.elapsedMs = mockElapsed(s); s.runningSince = null; s.beat = null; save();
  }
  function resumeMock() {
    const s = P.activeMock;
    if (!s || !s.split || s.onBreak) return;
    // A crash or killed tab leaves runningSince set: count only up to the last heartbeat.
    if (s.runningSince) { s.elapsedMs += Math.max(0, (s.beat || s.runningSince) - s.runningSince); }
    s.runningSince = Date.now(); s.beat = Date.now();
  }
  const fmtMs = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
  function tickTime() {
    const s = P.active; if (!s) return;
    const now = Date.now();
    addMinutes(Math.min(now - (s.lastAct || now), 4 * 60000) / 60000);
    s.lastAct = now;
  }

  // ---------------------------------------------------------------- views
  const view = () => $("#view");
  const domainPill = (d, ex = EXAMS["CCAR-F"]) => `<span class="pill d${((d - 1) % 5) + 1}">D${d} ${esc(ex.domain(d) ? ex.domain(d).short : "")}</span>`;
  const taskLink = (t) => `<a href="#/learn/${t}" class="pill">${t} ${esc(TASKS[t].title.split(" ").slice(0, 5).join(" "))}…</a>`;

  function itemLabel(it) {
    if (it.kind === "card") return `Learn card ${it.task} — ${TASKS[it.task].title}`;
    if (it.kind === "review") return `Spaced review: ${it.n} due questions`;
    return it.title;
  }
  function itemAuto(it) { return ["card", "drill", "review", "official", "diagnostic", "mock", "mockResume", "weak", "mockReview"].includes(it.kind); }
  function runItem(it, key) {
    switch (it.kind) {
      case "card": location.hash = `#/learn/${it.task}?item=${encodeURIComponent(key)}`; break;
      case "drill": startSession({ title: it.title, qids: pick(it.filter, it.n), itemKey: key }); break;
      case "review": { const d = dueIds().slice(0, it.n); startSession({ title: "Spaced review", qids: d.length ? d : pick({}, it.n), itemKey: key }); if (!d.length) toast("Nothing due yet — practising new questions instead"); break; }
      case "official": startSession({ title: "Official sample questions", qids: POOL.filter((q) => q.source === "official").map((q) => q.id), itemKey: key }); break;
      case "diagnostic": startSession({ title: "Diagnostic (20 mixed)", qids: pickDiagnostic(), itemKey: key }); break;
      case "weak": startSession({ title: "Weak areas: " + weakestTasks(3).map((x) => x.id).join(", "), qids: pickWeak(it.n), itemKey: key }); break;
      case "mock": {
        if (P.activeMock) { location.hash = "#/mock"; toast("Resuming your unfinished mock"); break; }
        const f = it.form && FORMS[it.form];
        if (f) { startSession({ title: f.title, qids: f.qids, mode: "mock", itemKey: key, scen: f.scenarios || null, split: it.split !== false, exam: f.exam, form: f.id, minutes: f.minutes }); break; }
        const m = pickMock(); startSession({ title: "Architect – random mock", qids: m.qids, mode: "mock", itemKey: key, scen: m.scen, split: it.split !== false }); break;
      }
      case "mockResume":
        if (!P.activeMock) { toast("No mock in progress — starting a new one"); runItem({ kind: "mock" }, key); break; }
        P.activeMock.itemKey2 = key; P.activeMock.onBreak = false; save(); location.hash = "#/mock"; break;
      case "mockReview": { P.checks[key] = true; save(); const last = P.mocks.map((m, i) => ((m.exam || "CCAR-F") === "CCAR-F" ? i : -1)).filter((i) => i >= 0).pop(); location.hash = last !== undefined ? `#/mock-result/${last}` : "#/exams"; break; }
      default: if (it.url) window.open(it.url, "_blank");
    }
  }

  function renderToday() {
    const sched = C.schedule;
    const idx = sched.findIndex((d) => d.date === TODAY);
    const before = TODAY < sched[0].date, after = TODAY > sched[sched.length - 1].date;
    const day = idx >= 0 ? sched[idx] : before ? sched[0] : null;
    const week = C.weeks.filter((w) => w.start <= (day ? day.date : TODAY)).pop();
    const daysToExam = daysBetween(TODAY, P.settings.examDate);
    const due = dueIds().length;
    const carry = sched.filter((d) => d.date < TODAY && d.date >= localDate(new Date(dayStart(TODAY) - 3 * DAY)))
      .flatMap((d) => d.items.map((it, i) => ({ it, key: `${d.date}#${i}`, d })).filter((x) => !P.checks[x.key] && x.it.min > 0));

    let html = `<div class="row"><h1>${esc(fmtDate(TODAY, { weekday: "long", month: "long", day: "numeric" }))}</h1><span class="spacer"></span>
      ${daysToExam > 0 ? `<span class="pill warn">${daysToExam} day${daysToExam === 1 ? "" : "s"} to your exam</span>` : daysToExam === 0 ? '<span class="pill warn">Exam day: good luck!</span>' : ""}</div>`;
    if (week) html += `<p class="muted" style="margin-top:-6px">Week ${week.n}: ${esc(week.title)}</p>`;
    if (before) html += `<div class="banner">The plan starts on ${fmtDate(sched[0].date)}. Here is day 1.</div>`;
    if (after) html += `<div class="banner warn">The sprint schedule has ended. Keep using Practice and spaced reviews, or check Plan.</div>`;

    html += `<div class="grid grid-3" style="margin-bottom:16px">
      <div class="card"><div class="stat">${streak()}</div><div class="stat-label">day streak</div></div>
      <div class="card"><div class="stat">${due}</div><div class="stat-label">reviews due</div></div>
      <div class="card"><div class="stat">${Math.round(today().minutes)}<span class="small muted"> min</span></div><div class="stat-label">studied today</div></div>
    </div>`;

    html += `<div class="card"><div class="row"><h2 style="margin:0">Busy day?</h2><span class="spacer"></span>
      <button class="btn" id="min-day">15-min minimum: 10 reviews</button></div>
      <p class="muted small" style="margin:.5em 0 0">Keeps the streak and spaced repetition alive. Do the full plan when you can.</p></div>`;

    if (day) {
      const total = sum(day.items.map((it) => it.min || 0));
      html += `<div class="card"><div class="row"><h2 style="margin:0">${esc(day.title)}</h2><span class="spacer"></span>
        <span class="muted small">~${total} min${day.optional ? " · optional day" : ""}</span></div>`;
      day.items.forEach((it, i) => {
        const key = `${day.date}#${i}`, done = !!P.checks[key];
        html += `<div class="todo ${done ? "done" : ""}"><input type="checkbox" data-check="${esc(key)}" ${done ? "checked" : ""} aria-label="done">
          <div class="todo-body"><div class="todo-title">${esc(itemLabel(it))}</div>
          ${it.text ? `<div class="small muted">${esc(it.text)}</div>` : ""}
          <div class="small muted">~${it.min || 0} min</div></div>
          ${it.kind === "todo" || it.kind === "handson" ? "" : `<button class="btn sm ${done ? "" : "primary"}" data-run="${esc(key)}">${it.kind === "read" ? "Open" : done ? "Again" : "Start"}</button>`}</div>`;
      });
      html += `</div>`;
    }
    if (carry.length) {
      html += `<div class="card"><h3>Carried over from the last 3 days</h3>`;
      carry.slice(0, 6).forEach(({ it, key, d }) => {
        html += `<div class="todo"><input type="checkbox" data-check="${esc(key)}"><div class="todo-body"><div class="todo-title">${esc(itemLabel(it))}</div><div class="small muted">${fmtDate(d.date)}</div></div>
        ${it.kind === "todo" || it.kind === "handson" ? "" : `<button class="btn sm" data-run="${esc(key)}">Start</button>`}</div>`;
      });
      html += `</div>`;
    }
    if (P.activeMock) { const s = P.activeMock, n = s.qids.filter((id) => s.resp[id] && s.resp[id].sel.length).length; html += `<div class="banner">${esc(s.title || "Mock exam")} in progress: ${n}/${s.qids.length} answered${s.split ? `, ${fmtMs(mockElapsed(s))} used (clock paused)` : ""}. <a href="#/mock">Resume mock</a></div>`; }
    if (P.active) html += `<div class="banner">You have an unfinished session (“${esc(P.active.title)}”). <a href="#/quiz">Resume</a></div>`;
    view().innerHTML = html;

    $("#min-day").onclick = () => { const d = dueIds().slice(0, 10); startSession({ title: "Minimum day: 10 reviews", qids: d.length >= 5 ? d : [...d, ...pick({}, 10 - d.length)] }); };
    bindSchedule();
  }

  function scheduleItem(key) {
    const [date, i] = key.split("#");
    const d = C.schedule.find((x) => x.date === date);
    return d && d.items[Number(i)];
  }
  function bindSchedule() {
    $$("[data-check]").forEach((cb) => cb.onchange = () => { P.checks[cb.dataset.check] = cb.checked; save(); route(); });
    $$("[data-run]").forEach((b) => b.onclick = () => {
      const key = b.dataset.run, it = scheduleItem(key);
      if (it.kind === "mock" && !P.activeMock && !confirm("Start the mock exam now? It runs in 2 parts of 30 questions (~60 min each). The clock pauses whenever you leave the mock screen.")) return;
      if (!itemAuto(it)) { P.checks[key] = true; save(); }
      runItem(it, key);
      if (it.kind === "read") route();
    });
  }

  // ---- Practice setup
  const practiceState = { domains: [], tasks: [], scenarios: [], sources: [], n: 10, unseen: false, multiOnly: false };
  function renderPractice() {
    const s = practiceState;
    const chips = (name, items, sel) => items.map(([v, label]) => `<button class="chip ${sel.includes(v) ? "on" : ""}" data-chip="${name}" data-v="${esc(v)}">${esc(label)}</button>`).join("");
    const counts = { due: dueIds().length, mistakes: mistakeIds().length, flagged: flaggedIds().length };
    view().innerHTML = `<h1>Practice</h1>
      <div class="grid grid-3" style="margin-bottom:16px">
        <button class="btn" data-quick="due">Due reviews (${counts.due})</button>
        <button class="btn" data-quick="mistakes">My mistakes (${counts.mistakes})</button>
        <button class="btn" data-quick="flagged">Flagged (${counts.flagged})</button>
        <button class="btn" data-quick="weak">Weakest 3 tasks</button>
        <button class="btn" data-quick="diag">Diagnostic (20)</button>
        <button class="btn" data-quick="official">Official samples (12)</button>
      </div>
      <div class="card"><div class="row"><h2 style="margin:0">Mock exam</h2><span class="spacer"></span>
        ${P.activeMock ? `<a class="btn primary" href="#/mock">Resume mock in progress</a>` : `<button class="btn primary" data-quick="mock">Mock in 2 parts (pause anytime)</button><button class="btn" data-quick="mockfull">Full 120-min sitting</button>`}</div>
        <p class="muted small" style="margin:.5em 0 0"><strong>Random mock from your question bank.</strong> For the fixed Architect and Developer mock exams, open the <a href="#/exams">Mock exams</a> tab. 60 questions: 4 random official scenarios × 15. No feedback until you submit. Questions you saw in earlier mocks are avoided where possible.
        <strong>In 2 parts:</strong> 30 questions per sitting with a 60-minute target each (exam pace is 2 min per question). The clock only runs while the mock screen is open, so you can stop after any question. <strong>Full sitting:</strong> 120 minutes of wall-clock time, like the real exam. Try one before exam day if you can.</p></div>
      <div class="card">
        <h2>Custom drill</h2>
        <div class="small muted">Domains</div><div class="chip-group">${chips("domains", C.domains.map((d) => [d.id, `D${d.id} ${d.short} (${d.weight}%)`]), s.domains)}</div>
        <div class="small muted">Task statements</div><div class="chip-group">${chips("tasks", C.tasks.map((t) => [t.id, `${t.id}`]), s.tasks)}</div>
        <div class="small muted">Scenarios</div><div class="chip-group">${chips("scenarios", C.scenarios.map((x) => [x.id, `${x.id === "CAI" ? "CAI*" : x.id} ${x.name.split(" ").slice(0, 3).join(" ")}`]), s.scenarios)}</div>
        <div class="small muted">Source</div><div class="chip-group">${chips("sources", [["official", "Official"], ["community", "Community"], ["authored", "Authored"]], s.sources)}</div>
        <div class="row" style="margin:8px 0 14px">
          <label class="small"><input type="checkbox" id="opt-unseen" ${s.unseen ? "checked" : ""}> Only unseen</label>
          <label class="small"><input type="checkbox" id="opt-multi" ${s.multiOnly ? "checked" : ""}> Only multiple-response</label>
          <label class="small">Questions <select id="opt-n">${[5, 10, 15, 20, 30, 50].map((n) => `<option ${n === s.n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        </div>
        <div class="row"><button class="btn primary" id="go">Start drill</button><span class="muted small" id="match"></span></div>
        <p class="muted small">* CAI is a community-reported scenario that isn't in the official v1.0 guide. It's kept for extra practice and excluded from mocks.</p>
      </div>`;
    const updateMatch = () => {
      const f = buildFilter(); const n = pick(f, 9999).length;
      $("#match").textContent = `${n} matching question${n === 1 ? "" : "s"}`;
    };
    $$("[data-chip]").forEach((b) => b.onclick = () => {
      const arr = s[b.dataset.chip]; const v = b.dataset.chip === "domains" ? Number(b.dataset.v) : b.dataset.v;
      const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v);
      b.classList.toggle("on"); updateMatch();
    });
    $("#opt-unseen").onchange = (e) => { s.unseen = e.target.checked; updateMatch(); };
    $("#opt-multi").onchange = (e) => { s.multiOnly = e.target.checked; updateMatch(); };
    $("#opt-n").onchange = (e) => { s.n = Number(e.target.value); };
    $("#go").onclick = () => startSession({ title: "Custom drill", qids: pick(buildFilter(), s.n) });
    $$("[data-quick]").forEach((b) => b.onclick = () => {
      const k = b.dataset.quick;
      if (k === "due") startSession({ title: "Due reviews", qids: dueIds().slice(0, 30) });
      if (k === "mistakes") startSession({ title: "My mistakes", qids: shuffle(mistakeIds()).slice(0, 30) });
      if (k === "flagged") startSession({ title: "Flagged questions", qids: flaggedIds() });
      if (k === "weak") runItem({ kind: "weak", n: 15 });
      if (k === "diag") runItem({ kind: "diagnostic" });
      if (k === "official") runItem({ kind: "official" });
      if (k === "mock") runItem({ kind: "mock", split: true });
      if (k === "mockfull") { if (confirm("Start a full 120-minute mock now? The timer keeps running even if you close the tab, like the real exam.")) runItem({ kind: "mock", split: false }); }
    });
    updateMatch();
  }
  function buildFilter() {
    const s = practiceState, f = {};
    if (s.domains.length) f.domains = s.domains;
    if (s.tasks.length) f.tasks = s.tasks;
    if (s.scenarios.length) f.scenarios = s.scenarios;
    if (s.sources.length) f.sources = s.sources;
    if (s.unseen) f.unseen = true;
    if (s.multiOnly) f.multiOnly = true;
    return f;
  }

  // ---- Question rendering (shared)
  function stemHtml(q) {
    const stem = String(q.stem).split(/\n\n+/).map((p) => `<p>${inline(p)}</p>`).join("");
    return stem.replace(/\((Select (TWO|THREE)\.)\)/, '<span class="select-hint">($1)</span>');
  }
  function headHtml(q, extra = "") {
    if (isDev(q)) {
      const ex = EXAMS["CCDV-F"];
      return `<div class="q-head">${domainPill(q.domain, ex)} <span class="pill">Skill ${q.skill} ${esc(ex.unitTitle(q.skill))}</span>
        <span class="pill">Developer exam</span> <span class="pill">${esc(SOURCE_LABEL[q.source] || q.source)}</span>
        ${q.type === "multi" ? `<span class="pill warn">Select ${q.select}</span>` : ""}<span class="spacer"></span>${extra}</div>`;
    }
    const s = SCEN[q.scenario];
    return `<div class="q-head">${domainPill(q.domain)} <a class="pill" href="#/learn/${q.task}">Task ${q.task}</a>
      <span class="pill">${esc(s ? s.name : q.scenario)}</span> <span class="pill">${esc(SOURCE_LABEL[q.source] || q.source)}</span>
      ${q.type === "multi" ? `<span class="pill warn">Select ${q.select}</span>` : ""}<span class="spacer"></span>${extra}</div>`;
  }
  function explainHtml(q, sel) {
    const wrong = q.options.filter((o) => !q.answer.includes(o.key));
    const ex = examOf(q);
    let h = `<div class="explain md">`;
    h += `<h4>Why ${q.answer.join(" + ")}</h4>${md(q.explanation)}`;
    const why = q.why || {};
    if (wrong.some((o) => why[o.key])) {
      h += `<h4>Why not the others</h4><ul>${wrong.filter((o) => why[o.key]).map((o) => `<li><strong>${o.key}${sel && sel.includes(o.key) ? " (your pick)" : ""}:</strong> ${inline(why[o.key])}</li>`).join("")}</ul>`;
    }
    if (q.whenRight) h += `<h4>When would another option be right?</h4>${md(q.whenRight)}`;
    if (q.trap) h += `<h4>Deciding phrase</h4>${md(q.trap)}`;
    if (q.note) h += `<div class="note-box"><strong>Note:</strong> ${inline(q.note)}</div>`;
    h += `<h4>Go deeper</h4><div class="row small">${isDev(q) ? `Developer skill ${q.skill}: ${esc(ex.unitTitle(q.skill))}` : `<a href="#/learn/${q.task}">Learn card ${q.task}: ${esc(ex.unitTitle(q.task))}</a>`}</div>
      <div class="row small" style="margin-top:4px">${ex.docs(q).map((d) => `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)} ↗</a>`).join(" · ")}</div>
      <div class="row" style="margin-top:10px">
        <button class="btn sm" data-copy="tutor">Copy “/tutor explain ${esc(q.id)}”</button>
        <button class="btn sm" data-copy="chat">Copy question for a Claude chat</button>
        <span class="muted small">${esc(q.id)}</span></div>`;
    return h + `</div>`;
  }
  function chatPrompt(q, sel) {
    const opts = q.options.map((o) => `${o.key}) ${o.text}`).join("\n");
    const ex = examOf(q), u = ex.unit(q);
    return `I'm studying for the ${ex.name} exam (${ex.unitLabel.toLowerCase()} ${u}: ${ex.unitTitle(u)}).
Explain this question: why the correct answer is best, why each other option is weaker, and when another option would become correct. Then ask me one follow-up question to check my understanding.

Scenario: ${SCEN[q.scenario] ? SCEN[q.scenario].name + " — " + SCEN[q.scenario].blurb : "(none — standalone item)"}

Question: ${q.stem}

${opts}

My answer: ${sel && sel.length ? sel.join(", ") : "(none)"}
Correct answer: ${q.answer.join(", ")}
Explanation given: ${q.explanation}`;
  }
  function bindCopy(q, sel) {
    $$("[data-copy]").forEach((b) => b.onclick = () => copy(b.dataset.copy === "tutor" ? `/tutor explain ${q.id}` : chatPrompt(q, sel)));
  }

  // ---- Practice quiz
  function renderQuiz() {
    const s = P.active;
    if (!s || s.mode !== "practice") { location.hash = "#/practice"; return; }
    if (s.i >= s.qids.length) return renderSummary();
    const q = BY_ID[s.qids[s.i]];
    const r = (s.resp[q.id] ||= { sel: [], checked: false });
    const sc = SCEN[q.scenario];
    let html = `<div class="row" style="margin-bottom:6px"><strong>${esc(s.title)}</strong><span class="spacer"></span>
      <span class="muted small">${s.i + 1} / ${s.qids.length}</span><button class="btn sm ghost" id="quit">End session</button></div>
      <div class="q-progress"><div style="width:${pct(s.i, s.qids.length)}%"></div></div>
      <div class="card">${headHtml(q, `<button class="btn sm ghost" id="flag">${P.flags[q.id] ? "★ Flagged" : "☆ Flag"}</button>`)}
      ${sc ? `<div class="scenario-box"><strong>${esc(sc.name)}:</strong> ${esc(sc.blurb)}</div>` : ""}
      <div class="stem">${stemHtml(q)}</div><div class="options">`;
    q.options.forEach((o, idx) => {
      let cls = r.sel.includes(o.key) ? "sel" : "";
      let whyInline = "";
      if (r.checked) {
        cls = q.answer.includes(o.key) ? "correct" : r.sel.includes(o.key) ? "wrong" : "";
        if (r.sel.includes(o.key) && !q.answer.includes(o.key) && q.why && q.why[o.key]) whyInline = `<span class="why-inline">${inline(q.why[o.key])}</span>`;
      }
      html += `<button class="opt ${cls}" data-key="${o.key}" ${r.checked ? "disabled" : ""}><span class="key">${o.key}</span><span>${inline(o.text)}${whyInline}</span></button>`;
    });
    html += `</div>`;
    if (!r.checked) {
      html += `<div class="q-actions"><button class="btn primary" data-conf="sure" ${r.sel.length === q.select ? "" : "disabled"}>Check — I'm sure <span class="kbd">Enter</span></button>
        <button class="btn" data-conf="unsure" ${r.sel.length === q.select ? "" : "disabled"}>Check — unsure <span class="kbd">U</span></button>
        <button class="btn" data-conf="guess" ${r.sel.length === q.select ? "" : "disabled"}>Check — guessing <span class="kbd">G</span></button>
        <span class="muted small">${q.type === "multi" ? `Pick ${q.select}. ` : ""}Keys: A–${q.options[q.options.length - 1].key} or 1–${q.options.length}</span></div>`;
    } else {
      html += `<div class="q-actions"><span class="result-line ${r.ok ? "good" : "bad"}">${r.ok ? "Correct" : "Not quite"}</span>
        ${r.ok && r.conf !== "sure" ? `<span class="pill warn">${r.conf === "guess" ? "lucky guess" : "unsure"}: it will come back soon</span>` : ""}
        <span class="spacer"></span><button class="btn primary" id="next">${s.i + 1 < s.qids.length ? "Next" : "Finish"} <span class="kbd">Enter</span></button></div>`;
      html += explainHtml(q, r.sel);
    }
    html += `</div>`;
    view().innerHTML = html;

    $$(".opt").forEach((b) => b.onclick = () => toggleOpt(q, r, b.dataset.key));
    $$("[data-conf]").forEach((b) => b.onclick = () => check(q, r, b.dataset.conf));
    $("#flag").onclick = () => { P.flags[q.id] = !P.flags[q.id]; save(); renderQuiz(); };
    $("#quit").onclick = () => { s.qids = s.qids.slice(0, s.i + (r.checked ? 1 : 0)); s.i = s.qids.length; save(); renderQuiz(); };
    if ($("#next")) $("#next").onclick = next;
    if (r.checked) bindCopy(q, r.sel);
  }
  function toggleOpt(q, r, key) {
    if (r.checked) return;
    if (q.select === 1) r.sel = [key];
    else if (r.sel.includes(key)) r.sel = r.sel.filter((k) => k !== key);
    else if (r.sel.length < q.select) r.sel = [...r.sel, key];
    route();
  }
  function check(q, r, conf) {
    if (r.checked || r.sel.length !== q.select) return;
    r.checked = true; r.conf = conf;
    r.ok = r.sel.length === q.answer.length && r.sel.every((k) => q.answer.includes(k));
    tickTime();
    grade(q.id, r.ok, conf, "practice");
    save(); renderQuiz();
  }
  function next() { const s = P.active; s.i++; save(); renderQuiz(); window.scrollTo(0, 0); }

  function renderSummary() {
    const s = P.active;
    const done = s.qids.filter((id) => s.resp[id] && s.resp[id].checked);
    const ok = done.filter((id) => s.resp[id].ok);
    const wrong = done.filter((id) => !s.resp[id].ok);
    if (!s.finished) {
      s.finished = true;
      P.sessions.push({ at: NOW(), date: TODAY, title: s.title, n: done.length, c: ok.length });
      if (s.itemKey) P.checks[s.itemKey] = true;
      save();
    }
    const byTask = {};
    done.forEach((id) => { const q = BY_ID[id], t = examOf(q).unit(q); (byTask[t] ||= { n: 0, c: 0, dev: isDev(q) }); byTask[t].n++; if (s.resp[id].ok) byTask[t].c++; });
    view().innerHTML = `<h1>${esc(s.title)}: done</h1>
      <div class="grid grid-3"><div class="card"><div class="stat">${pct(ok.length, done.length)}%</div><div class="stat-label">${ok.length} / ${done.length} correct</div></div>
      <div class="card"><div class="stat">${dueIds().length}</div><div class="stat-label">reviews now due</div></div>
      <div class="card"><div class="stat">${Math.round(today().minutes)}</div><div class="stat-label">minutes today</div></div></div>
      <div class="card"><h3>By task statement / skill</h3>${Object.entries(byTask).sort().map(([t, v]) => `<div class="bar-row">${v.dev ? `<span>${t} ${esc(EXAMS["CCDV-F"].unitTitle(t).slice(0, 38))}</span>` : `<a href="#/learn/${t}">${t} ${esc(TASKS[t].title.slice(0, 38))}…</a>`}
        <div class="bar"><div style="width:${pct(v.c, v.n)}%;background:${dcol(Number(t[0]))}"></div></div><span class="small">${v.c}/${v.n}</span></div>`).join("")}</div>
      ${wrong.length ? `<div class="card"><h3>Missed</h3><ul>${wrong.map((id) => `<li><a href="#/q/${id}">${esc(id)}</a>: ${esc(BY_ID[id].stem.slice(0, 110))}…</li>`).join("")}</ul></div>` : ""}
      <div class="row">${wrong.length ? `<button class="btn primary" id="retry">Retry the ${wrong.length} missed</button>` : ""}<a class="btn" href="#/today">Back to Today</a><a class="btn" href="#/practice">Practice</a></div>`;
    if ($("#retry")) $("#retry").onclick = () => startSession({ title: "Retry missed", qids: shuffle(wrong) });
    P.active = null; save();
  }

  // Single question view (review link)
  function renderSingle(id) {
    const q = BY_ID[id]; if (!q) { view().innerHTML = "<p>Unknown question.</p>"; return; }
    const a = P.answers[id];
    view().innerHTML = `<p><a href="javascript:history.back()">← Back</a></p><div class="card">${headHtml(q)}<div class="stem">${stemHtml(q)}</div>
      <div class="options">${q.options.map((o) => `<div class="opt ${q.answer.includes(o.key) ? "correct" : ""}"><span class="key">${o.key}</span><span>${inline(o.text)}</span></div>`).join("")}</div>
      ${a ? `<p class="small muted">Attempts: ${a.n}, correct ${a.c}. Box ${a.box}/5.</p>` : ""}${explainHtml(q, [])}</div>
      <button class="btn" id="drill1">Practice this question</button>`;
    bindCopy(q, []);
    $("#drill1").onclick = () => startSession({ title: `Question ${id}`, qids: [id] });
  }

  // ---- Mock exam (exam simulator: Architect CCAR-F and Developer CCDV-F)
  let mockTimer = null, lastTick = 0;
  const mockAnswered = (s, id) => s.resp[id] && s.resp[id].sel.length === BY_ID[id].select;
  const mockStatus = (s, id) => {
    const r = s.resp[id];
    if (!r || !r.sel.length) return "unanswered";
    return r.sel.length < BY_ID[id].select ? "incomplete" : "answered";
  };
  function exitExamMode() { document.body.classList.remove("exam-mode"); }

  function renderMock() {
    const s = P.activeMock;
    if (!s) { exitExamMode(); location.hash = "#/exams"; return; }
    s.timeOn ||= {}; s.firstSel ||= {}; s.exam ||= "CCAR-F"; s.minutes ||= 120; s.view ||= "item";
    document.body.classList.add("exam-mode");
    if (s.split && s.onBreak) return renderMockBreak();
    if (s.split && !s.runningSince) resumeMock();
    if (s.view === "review") return renderMockReview();
    const ex = EXAMS[s.exam], PART = partSize(s);
    const q = BY_ID[s.qids[s.i]];
    const r = (s.resp[q.id] ||= { sel: [], flag: false });
    const prevScen = s.i > 0 ? BY_ID[s.qids[s.i - 1]].scenario : null;
    const sc = SCEN[q.scenario];
    const last = s.i + 1 >= s.qids.length;
    view().innerHTML = `<div class="exam-bar"><div><strong>${esc(ex.name)}</strong><div class="small">${esc(s.title || "Mock exam")}${s.split ? ` · Part ${s.i < PART ? 1 : 2} of 2` : ""}</div></div>
        <span class="spacer"></span><span class="timer" id="timer"></span></div>
      <div class="exam-sub"><span>Item <strong>${s.i + 1}</strong> of ${s.qids.length}</span>
        <label class="exam-mark"><input type="checkbox" id="mflag" ${r.flag ? "checked" : ""}> Mark for review <span class="kbd">F</span></label></div>
      <div class="palette">${s.qids.map((id, i) => { const x = s.resp[id]; return `<button data-goto="${i}" class="${x && x.sel.length ? "answered" : ""} ${x && x.flag ? "flag" : ""} ${i === s.i ? "cur" : ""}">${i + 1}</button>`; }).join("")}</div>
      <div class="card exam-card">
        ${sc ? `<div class="scenario-box"><strong>Scenario: ${esc(sc.name)}</strong>${q.scenario !== prevScen ? ` — ${esc(sc.blurb)}` : ""}</div>` : ""}
        <div class="stem">${stemHtml(q)}</div>
        ${q.type === "multi" ? `<p class="select-hint">Choose ${q.select} answers.</p>` : ""}
        <div class="options">${q.options.map((o) => `<button class="opt ${r.sel.includes(o.key) ? "sel" : ""}" data-key="${o.key}"><span class="key">${o.key}</span><span>${inline(o.text)}</span></button>`).join("")}</div>
      </div>
      <div class="exam-nav"><button class="btn" id="prev" ${s.i ? "" : "disabled"}>← Previous</button>
        ${s.split ? `<button class="btn ghost" id="pause">Pause &amp; exit</button>` : `<button class="btn ghost" id="leave">Leave (clock keeps running)</button>`}
        <span class="spacer"></span><button class="btn" id="review">Review <span class="kbd">R</span></button>
        <button class="btn primary" id="mnext">${last ? "Review &amp; finish →" : "Next →"}</button></div>`;
    $$(".opt").forEach((b) => b.onclick = () => {
      const k = b.dataset.key;
      if (q.select === 1) r.sel = [k];
      else if (r.sel.includes(k)) r.sel = r.sel.filter((x) => x !== k);
      else if (r.sel.length < q.select) r.sel = [...r.sel, k];
      if (!(q.id in s.firstSel) && r.sel.length === q.select) s.firstSel[q.id] = [...r.sel];
      save(); renderMock();
    });
    const go = (i) => {
      if (s.split && s.part1Ms === null && s.i === PART - 1 && i === PART) {
        // Finished part 1: offer a natural stopping point.
        s.part1Ms = mockElapsed(s); s.i = i; s.onBreak = true; pauseMock();
        if (s.itemKey) P.checks[s.itemKey] = true;
        save(); renderMockBreak(); window.scrollTo(0, 0); return;
      }
      if (s.split && s.part1Ms === null && i >= PART) s.part1Ms = mockElapsed(s);
      s.i = i; s.view = "item"; save(); renderMock(); window.scrollTo(0, 0);
    };
    $$("[data-goto]").forEach((b) => b.onclick = () => go(Number(b.dataset.goto)));
    $("#prev").onclick = () => go(s.i - 1);
    $("#mnext").onclick = () => (last ? openReview() : go(s.i + 1));
    $("#review").onclick = openReview;
    if ($("#pause")) $("#pause").onclick = () => { pauseMock(); exitExamMode(); toast("Mock paused and saved. Resume from Today or Mock exams."); location.hash = "#/exams"; };
    if ($("#leave")) $("#leave").onclick = () => { if (confirm("Leave the exam screen? In a full sitting the clock keeps running.")) { exitExamMode(); location.hash = "#/exams"; } };
    $("#mflag").onchange = (e) => { r.flag = e.target.checked; save(); renderMock(); };
    startMockClock(s);
  }
  function openReview() { const s = P.activeMock; s.view = "review"; save(); renderMock(); window.scrollTo(0, 0); }

  function renderMockReview() {
    const s = P.activeMock, ex = EXAMS[s.exam];
    const filter = s.reviewFilter || "all";
    const st = s.qids.map((id, i) => ({ id, i, status: mockStatus(s, id), flag: !!(s.resp[id] && s.resp[id].flag) }));
    const count = (f) => st.filter(f).length;
    const shown = st.filter((x) => filter === "all" || (filter === "marked" && x.flag) || (filter === "open" && x.status !== "answered"));
    const label = { answered: "Answered", unanswered: "Unanswered", incomplete: "Incomplete" };
    view().innerHTML = `<div class="exam-bar"><div><strong>${esc(ex.name)}</strong><div class="small">Review screen</div></div><span class="spacer"></span><span class="timer" id="timer"></span></div>
      <div class="card"><h2 style="margin-top:0">Review your answers</h2>
        <p class="muted small">Select an item to return to it. Nothing is scored until you end the exam. There is no guessing penalty, so answer every item.</p>
        <div class="row" style="margin-bottom:12px">
          <span class="pill good">${count((x) => x.status === "answered")} answered</span>
          <span class="pill bad">${count((x) => x.status === "unanswered")} unanswered</span>
          <span class="pill warn">${count((x) => x.status === "incomplete")} incomplete</span>
          <span class="pill">${count((x) => x.flag)} marked</span></div>
        <div class="chip-group">
          <button class="chip ${filter === "all" ? "on" : ""}" data-rf="all">All items</button>
          <button class="chip ${filter === "marked" ? "on" : ""}" data-rf="marked">Review marked</button>
          <button class="chip ${filter === "open" ? "on" : ""}" data-rf="open">Review unanswered / incomplete</button></div>
        <div class="review-grid">${shown.map((x) => `<button class="review-cell ${x.status} ${x.flag ? "flag" : ""}" data-goto="${x.i}"><b>${x.i + 1}</b><span>${label[x.status]}${x.flag ? " · marked" : ""}</span></button>`).join("") || '<p class="muted">No items match this filter.</p>'}</div>
      </div>
      <div class="exam-nav"><button class="btn" id="back">← Return to item ${s.i + 1}</button>${s.split ? `<button class="btn ghost" id="pause">Pause &amp; exit</button>` : ""}<span class="spacer"></span>
        <button class="btn primary" id="end">End exam</button></div>`;
    $$("[data-rf]").forEach((b) => b.onclick = () => { s.reviewFilter = b.dataset.rf; save(); renderMockReview(); });
    $$("[data-goto]").forEach((b) => b.onclick = () => {
      const i = Number(b.dataset.goto);
      if (s.split && s.part1Ms === null && i >= partSize(s)) s.part1Ms = mockElapsed(s);
      s.i = i; s.view = "item"; save(); renderMock(); window.scrollTo(0, 0);
    });
    $("#back").onclick = () => { s.view = "item"; save(); renderMock(); };
    if ($("#pause")) $("#pause").onclick = () => { pauseMock(); exitExamMode(); location.hash = "#/exams"; };
    $("#end").onclick = () => {
      const open = count((x) => x.status !== "answered");
      if (confirm(open ? `${open} item(s) are unanswered or incomplete. End the exam and see your score?` : "End the exam and see your score?")) submitMock();
    };
    startMockClock(s);
  }

  function startMockClock(s) {
    let beats = 0;
    lastTick = Date.now();
    const tick = () => {
      const el = $("#timer"); if (!el) { clearInterval(mockTimer); return; }
      const now = Date.now(), dt = Math.min(now - lastTick, 5000); lastTick = now;
      const running = s.split ? !!s.runningSince : !document.hidden;
      if (running && s.view === "item" && !s.onBreak) { const id = s.qids[s.i]; s.timeOn[id] = (s.timeOn[id] || 0) + dt; }
      if (s.split) {
        const total = mockElapsed(s), thisPart = s.i < partSize(s) || s.part1Ms === null ? total : total - s.part1Ms;
        el.textContent = `${fmtMs(thisPart)} / ${fmtMs(partMs(s))} this part`;
        el.title = `Total ${fmtMs(total)} of ${s.minutes}:00. Exam pace is ${fmtMs(paceMs(s))} per item.`;
        el.classList.toggle("low", thisPart > partMs(s));
      } else {
        const left = Math.max(0, s.endsAt - now);
        el.textContent = `${fmtMs(left)} left`;
        el.classList.toggle("low", left < 10 * 60000);
        if (left <= 0) { clearInterval(mockTimer); toast("Time is up — submitting"); submitMock(); return; }
      }
      if (++beats % 10 === 0) { if (s.runningSince) s.beat = now; try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* ignore */ } }
    };
    clearInterval(mockTimer); mockTimer = setInterval(tick, 1000); tick();
  }

  function renderMockBreak() {
    const s = P.activeMock, PART = partSize(s);
    clearInterval(mockTimer);
    const answered = s.qids.slice(0, PART).filter((id) => s.resp[id] && s.resp[id].sel.length).length;
    view().innerHTML = `<div class="card"><h1>Part 1 done</h1>
      <p>${answered}/${PART} answered in <strong>${fmtMs(s.part1Ms)}</strong> (target ${fmtMs(partMs(s))}, which is ${fmtMs(paceMs(s))} per item).</p>
      <p class="muted">The clock is paused. This is a good place to stop for today. Part 2 waits for you on Today and Mock exams. You'll see no answers or feedback until you end the whole exam, so you can do drills in between without spoiling it.</p>
      <div class="row"><button class="btn primary" id="p2">Start part 2 now</button><a class="btn" href="#/exams" id="stop">Stop for today</a></div></div>`;
    $("#p2").onclick = () => { s.onBreak = false; save(); renderMock(); };
    $("#stop").onclick = exitExamMode;
  }

  function submitMock() {
    const s = P.activeMock; if (!s) return;
    clearInterval(mockTimer);
    pauseMock();
    const ex = EXAMS[s.exam || "CCAR-F"];
    const byDomain = {}, byScen = {}, byUnit = {};
    let c = 0;
    const answers = {};
    s.qids.forEach((id) => {
      const q = BY_ID[id], r = s.resp[id] || { sel: [] };
      const isOk = (sel) => !!sel && sel.length === q.answer.length && sel.every((k) => q.answer.includes(k));
      const ok = isOk(r.sel), first = (s.firstSel || {})[id];
      answers[id] = { sel: r.sel, ok, flag: !!r.flag, ms: Math.round((s.timeOn || {})[id] || 0), firstOk: first ? isOk(first) : null, changed: !!first && first.join() !== r.sel.join() };
      if (ok) c++;
      (byDomain[q.domain] ||= { n: 0, c: 0 }); byDomain[q.domain].n++; if (ok) byDomain[q.domain].c++;
      if (q.scenario) { (byScen[q.scenario] ||= { n: 0, c: 0 }); byScen[q.scenario].n++; if (ok) byScen[q.scenario].c++; }
      const u = ex.unit(q); (byUnit[u] ||= { n: 0, c: 0 }); byUnit[u].n++; if (ok) byUnit[u].c++;
      grade(id, ok, r.flag ? "unsure" : "sure", "mock");
    });
    const used = s.split ? Math.round(s.elapsedMs / 60000) : Math.min(s.minutes, Math.round((Date.now() - (s.endsAt - s.minutes * 60000)) / 60000));
    addMinutes(used);
    const parts = s.split && s.part1Ms !== null ? [Math.round(s.part1Ms / 60000), Math.round((s.elapsedMs - s.part1Ms) / 60000)] : null;
    P.mocks.push({ at: NOW(), date: TODAY, exam: ex.code, form: s.form || null, title: s.title, qids: s.qids, scen: s.scen, answers, c, n: s.qids.length,
      byDomain, byScen, byUnit, minutes: used, limit: s.minutes, split: !!s.split, parts });
    if (s.itemKey) P.checks[s.itemKey] = true;
    if (s.itemKey2) P.checks[s.itemKey2] = true;
    P.activeMock = null; save();
    exitExamMode();
    location.hash = `#/mock-result/${P.mocks.length - 1}`;
  }

  const scaledEstimate = (raw) => Math.round(100 + 900 * raw);
  function renderMockResult(idx) {
    const m = P.mocks[idx]; if (!m) { location.hash = "#/exams"; return; }
    const ex = EXAMS[m.exam || "CCAR-F"], limit = m.limit || 120;
    const raw = m.c / m.n, scaled = scaledEstimate(raw);
    const doms = Object.entries(m.byDomain).map(([d, v]) => ({ d: Number(d), ...v }));
    const minDomain = Math.min(...doms.map((d) => d.c / d.n));
    const verdict = raw >= 0.75 && minDomain >= 0.6 ? ["good", "On track: at or above the 75% target with no weak domain."] : raw >= 0.69 ? ["warn", "Borderline: close to the line. Fix the weak domains below."] : ["bad", "Not yet: below the 75% target. Focus on where you lost marks."];
    const query = new URLSearchParams((location.hash.split("#q-")[0].split("?")[1]) || "");
    const filter = query.get("f") || (location.hash.includes("?all") ? "all" : "wrong");
    const A = m.answers;
    const list = m.qids.filter((id) => filter === "all" || (filter === "wrong" && (!A[id].ok || A[id].flag)) || (filter === "marked" && A[id].flag) || (filter.startsWith("d") && BY_ID[id].domain === Number(filter.slice(1))));
    // Where marks were lost
    const lost = doms.map((d) => ({ ...d, lost: d.n - d.c })).sort((a, b) => b.lost - a.lost || a.c / a.n - b.c / b.n);
    const units = Object.entries(m.byUnit || {}).map(([u, v]) => ({ u, ...v, score: (v.c + 1) / (v.n + 2) })).sort((a, b) => a.score - b.score).slice(0, 3);
    // Confidence (marked vs not) and answer changes
    const marked = m.qids.filter((id) => A[id].flag), unmarked = m.qids.filter((id) => !A[id].flag);
    const okOf = (ids) => ids.filter((id) => A[id].ok).length;
    const changed = m.qids.filter((id) => A[id].changed);
    const w2r = changed.filter((id) => A[id].firstOk === false && A[id].ok).length, r2w = changed.filter((id) => A[id].firstOk === true && !A[id].ok).length;
    // Timing
    const timed = m.qids.filter((id) => A[id].ms > 0);
    const pace = (limit * 60000) / m.n;
    const avg = timed.length ? timed.reduce((t, id) => t + A[id].ms, 0) / timed.length : 0;
    const slow = [...timed].sort((a, b) => A[b].ms - A[a].ms).slice(0, 5);
    const over = timed.filter((id) => A[id].ms > pace).length;
    const pos = (id) => m.qids.indexOf(id) + 1;
    view().innerHTML = `<p><a href="#/exams">← Mock exams</a></p>
      <h1>${esc(m.title || "Mock exam")} <span class="muted small">${fmtDate(m.date)} · ${esc(ex.short)}</span></h1>
      <div class="grid grid-3"><div class="card"><div class="stat">${pct(m.c, m.n)}%</div><div class="stat-label">${m.c}/${m.n} correct (target 75%)</div></div>
        <div class="card"><div class="stat">≈${scaled} <span class="pill ${scaled >= 720 ? "good" : "bad"}">${scaled >= 720 ? "pass?" : "fail?"}</span></div><div class="stat-label">estimated scaled score (pass = 720)</div></div>
        <div class="card"><div class="stat">${m.minutes}</div><div class="stat-label">minutes used${m.parts ? ` (part 1: ${m.parts[0]}, part 2: ${m.parts[1]})` : ""} · limit ${limit}</div></div></div>
      <div class="banner ${verdict[0] === "good" ? "" : "warn"}">${verdict[1]} <span class="small muted">Anthropic doesn't publish the raw-to-scaled conversion, so “≈” and pass/fail are only a linear guess. Go by the 75% raw target.</span></div>
      <div class="card"><h3>By domain</h3><table class="simple"><tr><th>Domain</th><th>Weight</th><th>Items</th><th>Correct</th><th style="width:38%"></th></tr>
        ${ex.domains.map((d) => { const v = m.byDomain[d.id]; if (!v) return ""; return `<tr><td>D${d.id} ${esc(d.short)}</td><td>${d.weight}%</td><td>${v.n}</td><td>${v.c} (${pct(v.c, v.n)}%)</td>
          <td><div class="bar"><div style="width:${pct(v.c, v.n)}%;background:${dcol(d.id)}"></div><span class="mark" style="left:75%"></span></div></td></tr>`; }).join("")}</table>
        ${Object.keys(m.byScen || {}).length ? `<h3>By scenario</h3>${Object.entries(m.byScen).map(([sid, v]) => `<div class="bar-row"><span>${esc(SCEN[sid] ? SCEN[sid].name : sid)}</span><div class="bar"><div style="width:${pct(v.c, v.n)}%;background:var(--accent)"></div></div><span class="small">${v.c}/${v.n}</span></div>`).join("")}` : ""}</div>
      <div class="grid grid-2">
        <div class="card"><h3>Where you lost marks</h3><ol class="small">${lost.filter((d) => d.lost).map((d) => `<li><strong>D${d.d} ${esc(ex.domain(d.d).short)}</strong>: ${d.lost} of ${d.n} missed</li>`).join("") || "<li>Nothing — perfect score.</li>"}</ol>
          <h4 class="small muted">Weakest ${ex.unitLabel.toLowerCase()}s</h4><ul class="small">${units.map((x) => `<li>${isDev(BY_ID[m.qids[0]]) ? `${x.u} ${esc(ex.unitTitle(x.u))}` : `<a href="#/learn/${x.u}">${x.u} ${esc(ex.unitTitle(x.u))}</a>`}: ${x.c}/${x.n}</li>`).join("")}</ul></div>
        <div class="card"><h3>Confidence and changes</h3><ul class="small">
          <li>Marked for review: ${marked.length ? `${okOf(marked)}/${marked.length} correct (${pct(okOf(marked), marked.length)}%)` : "none"}</li>
          <li>Not marked: ${okOf(unmarked)}/${unmarked.length} correct (${pct(okOf(unmarked), unmarked.length)}%)</li>
          <li>Answers changed: ${changed.length} (wrong → right: <strong>${w2r}</strong>, right → wrong: <strong>${r2w}</strong>)</li></ul>
          ${changed.length ? `<p class="small muted">${w2r >= r2w ? "Your second thoughts helped more than they hurt." : "Changing answers cost you marks. Change one only when you find a concrete reason in the stem."}</p>` : ""}</div>
      </div>
      <div class="card"><h3>Timing</h3>${timed.length ? `<p class="small">Average <strong>${fmtMs(avg)}</strong> per item (exam pace ${fmtMs(pace)}). ${over} item(s) took longer than the pace.</p>
        <div class="small muted">Slowest: ${slow.map((id) => `<a href="#/mock-result/${idx}?f=all#q-${id}">#${pos(id)}</a> ${fmtMs(A[id].ms)}`).join(" · ")}</div>` : '<p class="small muted">No timing data for this attempt.</p>'}</div>
      <div class="row" style="margin-bottom:16px">${m.form && FORMS[m.form] ? `<button class="btn" id="retake">Retake this form</button>` : ""}
        ${m.qids.some((id) => !A[id].ok) ? `<button class="btn primary" id="drillMissed">Drill the ${m.qids.filter((id) => !A[id].ok).length} missed</button>` : ""}</div>
      <div class="card"><div class="row"><h3 style="margin:0">Review</h3><span class="spacer"></span>
        ${[["wrong", "Wrong + marked"], ["marked", "Marked"], ["all", `All ${m.n}`]].map(([f, l]) => `<a class="btn sm ${filter === f ? "primary" : ""}" href="#/mock-result/${idx}?f=${f}">${l}</a>`).join("")}</div>
        <div class="chip-group" style="margin-top:8px">${ex.domains.filter((d) => m.byDomain[d.id]).map((d) => `<a class="chip ${filter === "d" + d.id ? "on" : ""}" href="#/mock-result/${idx}?f=d${d.id}">D${d.id}</a>`).join("")}</div>
        ${list.map((id) => { const q = BY_ID[id], a = A[id]; return `<details id="q-${id}" style="border-top:1px solid var(--border);padding:10px 0">
          <summary><span class="pill ${a.ok ? "good" : "bad"}">${a.ok ? "✓" : "✗"}</span> ${a.flag ? '<span class="pill warn">marked</span>' : ""} <strong>#${pos(id)}</strong> ${esc(id)} · ${esc(ex.unit(q) || "")} · ${a.ms ? fmtMs(a.ms) + " · " : ""}${esc(q.stem.slice(0, 90))}…</summary>
          <div style="margin-top:10px"><div class="stem">${stemHtml(q)}</div><div class="options">${q.options.map((o) => `<div class="opt ${q.answer.includes(o.key) ? "correct" : a.sel.includes(o.key) ? "wrong" : ""}"><span class="key">${o.key}</span><span>${inline(o.text)}</span></div>`).join("")}</div>
          <p class="small muted">Your answer: ${a.sel.join(", ") || "none"}${a.changed ? " (changed)" : ""}</p>${explainHtml(q, a.sel).replace(/data-copy="(tutor|chat)"/g, `data-copy="$1" data-qid="${id}"`)}</div></details>`; }).join("") || "<p>Nothing to review here.</p>"}
      </div>`;
    $$("[data-copy]").forEach((b) => b.onclick = () => { const q = BY_ID[b.dataset.qid]; copy(b.dataset.copy === "tutor" ? `/tutor explain ${q.id}` : chatPrompt(q, A[q.id].sel)); });
    if ($("#retake")) $("#retake").onclick = () => startForm(m.form, true);
    if ($("#drillMissed")) $("#drillMissed").onclick = () => startSession({ title: `Missed from ${m.title || "mock"}`, qids: shuffle(m.qids.filter((id) => !A[id].ok)) });
    const target = location.hash.split("#q-")[1];
    if (target && document.getElementById("q-" + target)) { const d = document.getElementById("q-" + target); d.open = true; d.scrollIntoView(); }
  }

  // ---- Mock exams tab
  function startForm(formId, split) {
    const f = FORMS[formId]; if (!f) { toast("This mock form isn't built yet — run tools/build_mocks.py"); return; }
    if (P.activeMock && !confirm(`You have an unfinished mock (“${P.activeMock.title}”). Discard it and start ${f.title}?`)) return;
    startSession({ title: f.title, qids: f.qids, mode: "mock", scen: f.scenarios || null, split, exam: f.exam, form: f.id, minutes: f.minutes });
  }
  function mockTable(rows) {
    return `<div class="table-wrap"><table class="simple"><tr><th>Date</th><th>Mock</th><th>Score</th><th>≈Scaled</th><th>Weakest domain</th><th></th></tr>
      ${rows.map(([m, i]) => { const ex = EXAMS[m.exam || "CCAR-F"]; const w = Object.entries(m.byDomain).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n)[0];
        return `<tr><td>${fmtDate(m.date)}</td><td>${esc(m.title || "Mock exam")}<div class="small muted">${esc(ex.short)}</div></td><td><span class="pill ${m.c / m.n >= 0.75 ? "good" : "bad"}">${pct(m.c, m.n)}%</span></td>
          <td>${scaledEstimate(m.c / m.n)}</td><td>D${w[0]} ${esc(ex.domain(Number(w[0])) ? ex.domain(Number(w[0])).short : "")} ${pct(w[1].c, w[1].n)}%</td><td><a href="#/mock-result/${i}">report</a></td></tr>`; }).join("")}</table></div>`;
  }
  function renderExams() {
    exitExamMode();
    const am = P.activeMock;
    const formCard = (f) => {
      const ex = EXAMS[f.exam], tries = P.mocks.map((m, i) => [m, i]).filter(([m]) => m.form === f.id);
      const best = tries.length ? Math.max(...tries.map(([m]) => pct(m.c, m.n))) : null;
      const dom = {}; f.qids.forEach((id) => { const q = BY_ID[id]; if (q) dom[q.domain] = (dom[q.domain] || 0) + 1; });
      const missing = f.qids.filter((id) => !BY_ID[id]).length;
      return `<div class="card"><div class="row"><h2 style="margin:0">${esc(f.title)}</h2><span class="spacer"></span><span class="pill">${esc(ex.code)}</span></div>
        <p class="small muted">${f.qids.length} items · ${f.minutes} minutes · pass mark 720/1000 · single- and multiple-answer items${f.scenarios ? ` · scenarios: ${f.scenarios.map((x) => esc(SCEN[x] ? SCEN[x].name : x)).join(", ")}` : " · no scenarios (standalone items)"}</p>
        <div class="chip-group">${ex.domains.map((d) => `<span class="pill d${((d.id - 1) % 5) + 1}">D${d.id} ${esc(d.short)} · ${dom[d.id] || 0}</span>`).join("")}</div>
        ${f.exam === "CCDV-F" ? '<p class="small muted">These Developer questions are held out of Practice and spaced review, so they stay fresh for this mock.</p>' : '<p class="small muted">Built from your question bank and matched to the 27/18/20/20/15 blueprint, so you may recognise some items from drills.</p>'}
        ${missing ? `<div class="banner warn">${missing} item(s) of this form are missing from the question data. Rebuild with tools/build_data.py and tools/build_mocks.py.</div>` : ""}
        <div class="row">${am && am.form === f.id ? `<a class="btn primary" href="#/mock">Resume (${am.qids.filter((id) => am.resp[id] && am.resp[id].sel.length).length}/${am.qids.length} answered)</a>`
          : `<button class="btn primary" data-start="${f.id}" data-split="1">Start in 2 parts (pause anytime)</button><button class="btn" data-start="${f.id}" data-split="0">Full ${f.minutes}-min sitting</button>`}
          <span class="spacer"></span>${tries.length ? `<span class="small muted">${tries.length} attempt(s) · best ${best}% · last ${pct(tries[tries.length - 1][0].c, tries[tries.length - 1][0].n)}%</span>` : '<span class="small muted">Not attempted yet</span>'}</div></div>`;
    };
    view().innerHTML = `<h1>Mock exams</h1>
      <p class="muted">Full-length, timed exams in the real format, with no feedback until you end the exam. Afterwards you get a report showing where you gained and lost marks, and a full review with explanations.</p>
      ${am ? `<div class="banner">${esc(am.title || "A mock")} is in progress. <a href="#/mock">Resume</a> · <a href="javascript:void 0" id="discard">Discard it</a></div>` : ""}
      ${(C.mockForms || []).map(formCard).join("") || '<div class="banner warn">No mock forms built yet. Run python3 tools/build_mocks.py.</div>'}
      <div class="card"><div class="row"><h2 style="margin:0">Architect – random mock</h2><span class="spacer"></span><span class="pill">CCAR-F</span></div>
        <p class="small muted">60 items drawn fresh each time from 4 random scenarios, preferring questions you haven't seen in earlier mocks.</p>
        <div class="row">${am ? "" : `<button class="btn" data-random="1">Start in 2 parts</button><button class="btn" data-random="0">Full 120-min sitting</button>`}</div></div>
      <div class="card"><h3>Your attempts</h3>${P.mocks.length ? mockTable(P.mocks.map((m, i) => [m, i]).reverse()) : '<p class="muted">No mocks yet.</p>'}
        <p class="small muted">Official exam guides: <a href="../vendor/official-ccar-f-exam-guide.pdf" target="_blank">Architect – Foundations</a> · <a href="../vendor/official-ccdv-f-exam-guide.pdf" target="_blank">Developer – Foundations</a></p></div>`;
    $$("[data-start]").forEach((b) => b.onclick = () => startForm(b.dataset.start, b.dataset.split === "1"));
    $$("[data-random]").forEach((b) => b.onclick = () => { const split = b.dataset.random === "1"; if (!split && !confirm("Start a full 120-minute mock now? The timer keeps running even if you close the tab, like the real exam.")) return; runItem({ kind: "mock", split }); });
    if ($("#discard")) $("#discard").onclick = () => { if (confirm("Discard the unfinished mock? Its answers are lost.")) { P.activeMock = null; save(); renderExams(); } };
  }

  // ---- Learn
  function renderLearn() {
    let html = `<h1>Learn</h1><p class="muted">One card per official task statement. Read the card, then drill it. “Exam traps” are where most points are lost.</p>`;
    C.domains.forEach((d) => {
      const ds = domainStats(d.id);
      html += `<div class="card"><div class="row"><h2 style="margin:0">${domainPill(d.id)} ${esc(d.name)}</h2><span class="spacer"></span><span class="muted small">${d.weight}% of exam${ds.n ? ` · ${pct(ds.c, ds.n)}% correct` : ""}</span></div><div class="learn-list" style="margin-top:8px">`;
      C.tasks.filter((t) => t.domain === d.id).forEach((t) => {
        const st = taskStats(t.id);
        html += `<a href="#/learn/${t.id}"><span class="tid">${t.id}</span><span style="flex:1">${esc(t.title)}</span>
          ${P.cardsRead[t.id] ? '<span class="pill good">read</span>' : ""}${CARDS[t.id] ? "" : '<span class="pill">card pending</span>'}
          <span class="small muted">${st.n ? `${pct(st.c, st.n)}%` : ""} ${st.total}Q</span></a>`;
      });
      html += `</div></div>`;
    });
    view().innerHTML = html;
  }
  let cardOpenedAt = null;
  function renderCard(taskId, itemKey) {
    const t = TASKS[taskId]; if (!t) { location.hash = "#/learn"; return; }
    const c = CARDS[taskId], st = taskStats(taskId);
    const qs = POOL.filter((q) => q.task === taskId);
    cardOpenedAt = Date.now();
    view().innerHTML = `<p><a href="#/learn">← All cards</a></p>
      <div class="card"><div class="q-head">${domainPill(t.domain)}<span class="pill">Task ${t.id}</span>${P.cardsRead[t.id] ? '<span class="pill good">read</span>' : ""}</div>
      <h1>${esc(c ? c.title : t.title)}</h1><p class="muted" style="margin-top:-8px">${esc(t.title)}</p>
      <div class="md">${c ? md(c.body) : "<p>This card hasn't been written yet. Use the official docs below, or run <code>/tutor " + t.id + "</code> in Claude Code.</p>"}</div>
      <h2>Official docs</h2><ul>${t.docs.map((d) => `<li><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)} ↗</a></li>`).join("")}</ul>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="read">${P.cardsRead[t.id] ? "Read again ✓" : "Mark as read"}</button>
        <button class="btn" id="drill" ${qs.length ? "" : "disabled"}>Drill ${t.id} (${Math.min(qs.length, 8)} Q)</button>
        <button class="btn" id="tutor">Copy “/tutor ${t.id}”</button></div></div>
      <div class="card"><h3>Questions on this task ${st.n ? `<span class="muted small">· ${st.c}/${st.n} correct</span>` : ""}</h3>
        ${qs.map((q) => { const ok = lastOk(q.id); return `<div class="small" style="padding:4px 0"><span class="pill ${ok === true ? "good" : ok === false ? "bad" : ""}">${ok === true ? "✓" : ok === false ? "✗" : "new"}</span> <a href="#/q/${q.id}">${q.id}</a> ${esc(q.stem.slice(0, 100))}…</div>`; }).join("") || '<p class="muted">No questions yet.</p>'}</div>`;
    $("#read").onclick = () => {
      P.cardsRead[t.id] = TODAY;
      if (itemKey) P.checks[itemKey] = true;
      addMinutes(Math.min(Date.now() - cardOpenedAt, 25 * 60000) / 60000); cardOpenedAt = Date.now();
      save(); toast("Marked as read"); renderCard(taskId, null);
    };
    $("#drill").onclick = () => startSession({ title: `Drill ${t.id}`, qids: pick({ tasks: [t.id] }, 8) });
    $("#tutor").onclick = () => copy(`/tutor ${t.id}`);
  }

  // ---- Progress
  function renderProgress() {
    const answered = Object.values(P.answers);
    const seen = POOL.filter((q) => P.answers[q.id]).length;
    const recent = answered.flatMap((a) => a.hist).sort((a, b) => b.t - a.t).slice(0, 60);
    const lastTwo = P.mocks.filter((m) => (m.exam || "CCAR-F") === "CCAR-F").slice(-2);
    const ready = lastTwo.length === 2 && lastTwo.every((m) => m.c / m.n >= 0.75 && Math.min(...Object.values(m.byDomain).map((d) => d.c / d.n)) >= 0.6);
    const days = Array.from({ length: 21 }, (_, i) => localDate(new Date(dayStart(TODAY) - (20 - i) * DAY + 12 * 3600000)));
    const maxMin = Math.max(30, ...days.map((d) => (P.days[d] ? P.days[d].minutes : 0)));
    let html = `<h1>Progress</h1>
      <div class="grid grid-3"><div class="card"><div class="stat">${seen}<span class="small muted"> / ${POOL.length}</span></div><div class="stat-label">questions seen</div></div>
      <div class="card"><div class="stat">${recent.length ? pct(recent.filter((h) => h.ok).length, recent.length) + "%" : "—"}</div><div class="stat-label">accuracy, last ${recent.length} answers</div></div>
      <div class="card"><div class="stat">${ready ? "Ready" : lastTwo.length ? "Not yet" : "—"}</div><div class="stat-label">Architect readiness (last 2 mocks ≥ 75%)</div></div></div>
      <div class="card"><h3>Domains <span class="muted small">(latest answer per question; line = 75% target)</span></h3>
      ${C.domains.map((d) => { const s = domainStats(d.id); return `<div class="bar-row"><span>D${d.id} ${esc(d.short)} <span class="muted small">${d.weight}%</span></span>
        <div class="bar"><div style="width:${s.n ? pct(s.c, s.n) : 0}%;background:var(--d${d.id})"></div><span class="mark" style="left:75%"></span></div><span class="small">${s.n ? pct(s.c, s.n) + "%" : "—"}</span></div>`; }).join("")}</div>
      <div class="card"><h3>Task statements</h3><p class="small muted" style="margin-top:0">Red &lt; 60%, amber &lt; 80%, green ≥ 80%, grey = not tried yet. Click to open the card.</p><div class="task-grid">
      ${C.tasks.map((t) => { const s = taskStats(t.id); const lvl = s.acc === null ? 0 : s.acc < 0.6 ? 1 : s.acc < 0.8 ? 2 : 3; return `<a class="task-cell lvl${lvl}" href="#/learn/${t.id}"><b>${t.id} ${s.n ? pct(s.c, s.n) + "%" : ""}</b>${esc(t.title.split(" ").slice(0, 6).join(" "))}… <span class="muted">${s.n}/${s.total}</span></a>`; }).join("")}
      </div></div>
      <div class="card"><h3>Study minutes, last 21 days</h3><div style="display:flex;align-items:flex-end;gap:3px;height:80px">
      ${days.map((d) => { const m = P.days[d] ? P.days[d].minutes : 0; return `<div title="${d}: ${Math.round(m)} min" style="flex:1;background:${d === TODAY ? "var(--accent)" : "var(--d2)"};opacity:${m ? 1 : 0.15};height:${Math.max(3, (m / maxMin) * 80)}px;border-radius:3px 3px 0 0"></div>`; }).join("")}
      </div><div class="row small muted"><span>${fmtDate(days[0])}</span><span class="spacer"></span><span>today</span></div></div>
      <div class="card"><h3>Mock exams</h3>${P.mocks.length ? mockTable(P.mocks.map((m, i) => [m, i])) : '<p class="muted">No mocks yet. Mock 1 (Architect Mock A) is scheduled at the end of week 4. See the <a href="#/exams">Mock exams</a> tab.</p>'}</div>
      <div class="card"><h3>Your data</h3><p class="small muted">${SERVER ? "Progress is saved to <code>progress/progress.json</code> (the /tutor skill reads it) and in this browser." : "You opened the file directly, so progress is only in this browser. Run <code>./start.sh</code> to also save it to <code>progress/progress.json</code> for the /tutor skill."}</p>
        <div class="row"><button class="btn" id="export">Export progress</button><label class="btn">Import progress<input type="file" id="import" accept="application/json" hidden></label>
        <span class="spacer"></span><button class="btn ghost" id="reset">Reset everything</button></div></div>`;
    view().innerHTML = html;
    $("#export").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 1)], { type: "application/json" })); a.download = `cca-progress-${TODAY}.json`; a.click(); };
    $("#import").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { P = { ...blank(), ...JSON.parse(await f.text()) }; save(); toast("Imported"); route(); } catch { toast("That file isn't valid progress JSON"); } };
    $("#reset").onclick = () => { if (confirm("Delete all progress, mocks and checkmarks? This cannot be undone.")) { P = blank(); save(); route(); } };
  }

  // ---- Plan
  function renderPlan() {
    let html = `<h1>5-week plan</h1><p class="muted">No day is longer than about 60 minutes, weekends included. Mocks run in two 30-question parts, and their clock pauses whenever you leave. On a busy day the 15-minute minimum (10 reviews) is enough. See STUDY_PLAN.md for the reasoning.</p>
      <div class="card"><h3 style="margin-top:0">Your dates</h3><div class="row">
        <label class="small">Plan starts <input type="date" id="plan-start" value="${esc(P.settings.planStart)}"></label>
        <label class="small">Exam date <input type="date" id="exam-date" value="${esc(P.settings.examDate)}"></label>
        <button class="btn sm primary" id="save-dates">Save dates</button></div>
        <p class="small muted" style="margin-bottom:0">The plan is 5½ weeks; booking your exam two or three days into week 6 leaves a calm review day first. The question bank follows the exam guides v1.0 (July 2026). Anthropic updated exam content on Dec 7, 2026, so check the guide that applies to your exam date. Checkmarks you already made stay on their calendar dates.</p></div>`;
    C.weeks.forEach((w) => {
      const days = C.schedule.filter((d) => { const nx = C.weeks.find((x) => x.n === w.n + 1); return d.date >= w.start && (!nx || d.date < nx.start); });
      const items = days.flatMap((d) => d.items.map((_, i) => `${d.date}#${i}`));
      const done = items.filter((k) => P.checks[k]).length;
      html += `<div class="card week"><div class="row"><h2 style="margin:0">Week ${w.n}</h2><span class="muted">${esc(w.title)}</span><span class="spacer"></span><span class="small muted">${done}/${items.length} done</span></div>`;
      days.forEach((d) => {
        const keys = d.items.map((_, i) => `${d.date}#${i}`), dn = keys.filter((k) => P.checks[k]).length;
        html += `<details class="day-row ${d.date === TODAY ? "today" : ""} ${d.date < TODAY ? "past" : ""}" ${d.date === TODAY ? "open" : ""} style="display:block">
          <summary style="display:grid;grid-template-columns:92px 1fr auto;gap:10px;cursor:pointer"><span class="small muted">${fmtDate(d.date)}</span><span class="day-title">${esc(d.title)}${d.optional ? ' <span class="pill">optional</span>' : ""}</span>
          <span class="small ${dn === keys.length ? "" : "muted"}">${dn === keys.length ? "✓" : `${dn}/${keys.length}`}</span></summary>
          ${d.items.map((it, i) => { const k = `${d.date}#${i}`; return `<div class="todo ${P.checks[k] ? "done" : ""}" style="padding:6px 0 6px 102px"><input type="checkbox" data-check="${esc(k)}" ${P.checks[k] ? "checked" : ""}>
            <div class="todo-body"><div class="small">${esc(itemLabel(it))} <span class="muted">~${it.min} min</span></div></div>
            ${it.kind === "todo" || it.kind === "handson" ? "" : `<button class="btn sm" data-run="${esc(k)}">${it.kind === "read" ? "Open" : "Start"}</button>`}</div>`; }).join("")}
        </details>`;
      });
      html += `</div>`;
    });
    view().innerHTML = html;
    bindSchedule();
    $("#save-dates").onclick = () => {
      const st = $("#plan-start").value, ex = $("#exam-date").value;
      if (!st || !ex) { toast("Pick both dates"); return; }
      if (ex < st) { toast("The exam date must be after the plan start"); return; }
      P.settings.planStart = st; P.settings.examDate = ex; applySchedule(); save(); toast("Dates saved"); renderPlan();
    };
  }

  // ---------------------------------------------------------------- router & keys
  function route() {
    const h = location.hash || "#/today";
    const [path, query] = h.slice(1).split("?");
    const parts = path.split("/").filter(Boolean);
    const tab = parts[0] || "today";
    $$("#tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab || (tab === "quiz" && a.dataset.tab === "practice") || ((tab === "mock" || tab === "mock-result") && a.dataset.tab === "exams")));
    if (tab !== "mock") { clearInterval(mockTimer); pauseMock(); exitExamMode(); }
    if (tab === "today") renderToday();
    else if (tab === "practice") renderPractice();
    else if (tab === "quiz") renderQuiz();
    else if (tab === "mock") renderMock();
    else if (tab === "mock-result") renderMockResult(Number(parts[1]));
    else if (tab === "exams") renderExams();
    else if (tab === "learn" && parts[1]) renderCard(parts[1], new URLSearchParams(query || "").get("item"));
    else if (tab === "learn") renderLearn();
    else if (tab === "progress") renderProgress();
    else if (tab === "plan") renderPlan();
    else if (tab === "q") renderSingle(parts[1]);
    else renderToday();
  }

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const tab = (location.hash || "").split("/")[1];
    const s = tab === "mock" ? P.activeMock : P.active;
    if (!s || !["quiz", "mock"].includes(tab) || (tab === "mock" && (s.onBreak || s.view === "review"))) return;
    const q = BY_ID[s.qids[s.i]]; if (!q) return;
    const k = e.key.toUpperCase();
    const idx = "ABCDE".indexOf(k) >= 0 && k.length === 1 ? "ABCDE".indexOf(k) : "12345".indexOf(e.key);
    if (idx >= 0 && idx < q.options.length) { const b = $$(".opt")[idx]; if (b && !b.disabled) { b.click(); e.preventDefault(); } return; }
    if (tab === "quiz") {
      const r = s.resp[q.id];
      if (e.key === "Enter") { e.preventDefault(); if (r && r.checked) next(); else if (r) check(q, r, "sure"); }
      else if (k === "U" && r && !r.checked) check(q, r, "unsure");
      else if (k === "G" && r && !r.checked) check(q, r, "guess");
      else if (k === "F") $("#flag") && $("#flag").click();
    } else if (tab === "mock") {
      if (e.key === "ArrowRight" && $("#mnext") && !$("#mnext").disabled) $("#mnext").click();
      if (e.key === "ArrowLeft" && $("#prev") && !$("#prev").disabled) $("#prev").click();
      if (k === "F" && $("#mflag")) $("#mflag").click();
      if (k === "R" && $("#review")) $("#review").click();
    }
  });

  function applyTheme() { if (P.settings.theme) document.documentElement.dataset.theme = P.settings.theme; else delete document.documentElement.dataset.theme; }
  $("#theme-btn").onclick = () => {
    const dark = P.settings.theme ? P.settings.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    P.settings.theme = dark ? "light" : "dark"; applyTheme(); save();
  };
  window.addEventListener("hashchange", route);
  document.addEventListener("visibilitychange", () => {
    if ((location.hash || "").startsWith("#/mock") && !location.hash.startsWith("#/mock-result")) {
      if (document.hidden) pauseMock(); else { resumeMock(); }
    }
  });
  window.addEventListener("pagehide", pauseMock);

  (async function init() {
    await syncFromServer();
    ensurePlanDates();
    applyTheme();
    route();
  })();
})();
