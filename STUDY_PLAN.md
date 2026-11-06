# The 5-week study plan (Architect – Foundations)

**Goal:** pass Claude Certified Architect – Foundations (CCAR-F). That needs a scaled score of 720/1000.

**Built for:** people with a full-time job who can usually give about an hour a day, sometimes less. **No day in the plan is longer than 60 minutes**, weekends included. That includes the mock exams, which run in two parts.

**Your dates:** on first launch the plan starts today. Set your own **plan start** and **exam date** on the app's **Plan** tab, and every day shifts with them. Book the exam two or three days into week 6; the first day of week 6 is a calm review day.

> **Exam-guide version.** The question bank and the plan follow the official exam guides **v1.0 (July 2026)**. Anthropic updated the content of all four exams on **Dec 7, 2026**, with new guides published Nov 17, 2026. If your exam date falls after that, read the guide for your date on the Partner Academy, and compare its task statements with the Learn tab.

| Day type | Time | What you do |
|---|---|---|
| Weekday (normal) | 40–55 min | 1–2 learn cards → a drill on those task statements → the due spaced reviews |
| Any busy day | **15 min** | Today → "15-min minimum": 10 due reviews. Your streak and the memory schedule stay intact. |
| Saturday | ≤ 60 min | Two scenario sets, or **part 1 of a mock** |
| Sunday | ≤ 60 min | Usually optional: an official exercise or catch-up. In mock weeks: **part 2 of the mock**. |

Every day's tasks are in the app under **Today**, with Start buttons. The **Plan** tab shows the whole sprint with checkboxes.

## Why this order
- **Domain weight drives the time spent.** D1 Agentic Architecture is 27%, so it gets week 1. D3 Claude Code and D4 Prompting are 20% each and get a full week each. D2 Tools/MCP (18%) and D5 Context & Reliability (15%) share week 2 because they overlap in the customer-support and research scenarios.
- **Diagnostic first.** Two practice runs before studying show what you already know. Day 1 is the 12 official sample questions, and day 2 is a 20-question diagnostic.
- **Extra time on the topics candidates report as hard:**
  - built-in tools (Read/Write/Edit/Bash/Grep/Glob, and when Edit fails, Read + Write), in week 3
  - the Message Batches API, in week 4
  - nullable fields and enums with "other", inside task 4.3
- **Two mocks, each in two parts.**
  - Mock 1 is the fixed **Architect Mock A** (Mock exams tab). Mock 2 is a random mock that prefers questions you haven't seen. Each is 60 questions from 4 scenarios, with an exam-pace target of 120 minutes (2 min per question).
  - Part 1 (questions 1–30) is on Saturday and part 2 (questions 31–60) on Sunday, about 60 minutes each.
  - The mock clock only runs while the mock screen is open. If you're interrupted, press **Pause & exit** and carry on later, even one question at a time.
  - Answers stay hidden until you end the exam, so drills in between don't spoil it.
  - The week between the two mocks goes to your weakest task statements, which the app finds for you.
- **Optional before exam day:** one uninterrupted full sitting (Mock exams → "Full 120-min sitting") to practise holding focus for 2 hours. Skip it if you have no 2-hour slot. Pacing matters more, and the split mock trains it.

## Weekly overview
| Week | Focus | Weekend |
|---|---|---|
| 1 | Exam guide, official samples, diagnostic, **D1** (1.1–1.7) | Sat: cards 1.6/1.7 + Domain 1 set (15). Sun (optional): Exercise 4 on paper. |
| 2 | **D2** (2.1–2.4) + **D5** (5.1–5.6) | Sat: scenario sets S1 + S3. Sun: **book the exam** + Exercise 1 on paper. |
| 3 | **D3** (3.1–3.6) + **2.5 built-in tools**, hands-on in this repo | Sat: scenario sets S2 + S4. Sun (optional): Exercise 2 in a scratch repo. |
| 4 | **D4** (4.1–4.6): batches, multi-pass review. Check for a newer exam guide. | **Mock 1**: part 1 on Saturday, part 2 on Sunday |
| 5 | Mon: Mock 1 review. Then your weakest task statements, a sweep of past mistakes, scenario rotation. | **Mock 2**: part 1 on Saturday, part 2 on Sunday |
| 6 | Mon: Mock 2 review + go/no-go. Tue: final review. **Exam on Wed or Thu.** | — |

## How a 60-minute session looks
1. **5 min:** open the Today tab and do the due reviews. Spaced repetition brings questions back after 1, 2, 4, 8 and 16 days.
2. **15–20 min:** read the learn card(s), focusing on **Exam traps**.
3. **20 min:** drill the same task statements. After each answer, mark it *sure*, *unsure* or *guessing*. Lucky guesses come back for review.
4. **5 min:** for anything that still feels shaky, run `/tutor explain <id>` in Claude Code, or use "Copy question for a Claude chat".

For every question, you should be able to say **why the right option is best, why each other option is worse, and when another option would become right**. The app shows all three after you answer.

## Falling behind (it will happen)
- Don't try to make up every missed day. Do the 15-minute minimum and continue from **today's** item. Unfinished items stay visible as "carried over" for 3 days.
- If you must cut, cut in this order: optional Sunday items, then hands-on extras, then the second card of a two-card day (read it at the weekend instead).
- Never skip the two mocks. If a mock weekend gets busy, do the mock in smaller pieces over the next few days. The clock waits. If time gets very tight, protect D1 (27%), D3 (20%) and D4 (20%) first.

## Go / no-go (Monday of week 6)
- **Go** if both mocks are **≥ 75% raw** and **no domain is below 60%**. Anthropic doesn't publish the official raw-to-scaled conversion, so 75% is a practical safety margin.
- **Borderline (69–74%):** go if Mock 2 improved on Mock 1 and the weak domain has caught up, and spend the review day only on that domain.
- **Below 69%:** reschedule at least 48 h before the appointment. The exam guide says 24 h, but Pearson VUE's Anthropic page says 48 h. Check which exam-guide version applies to the new date. A failed attempt means a 14-day wait before a retake.

## Admin checklist
- [ ] **Week 1:** confirm eligibility. The exam is open to organizations in the **Claude Partner Network**, so ask whoever manages your company's Anthropic partnership.
- [ ] **End of week 2:** buy the exam ($125) on the Partner Academy, then schedule it with Pearson VUE (online proctored or test center) for the middle of week 6.
- [ ] Read the Certification Terms and the Exam Policy linked on the exam page.
- [ ] **Week 4:** check the Partner Academy for the exam guide that applies to your exam date.
- [ ] **For online proctoring:** run the OnVUE system check a few days before. You'll need a government photo ID whose name exactly matches your registration.
- [ ] **Exam day:** the real exam is one 120-minute sitting with no pause: 60 items, about 2 minutes each. Your split mocks will have trained exactly this pace. Some items are multiple-response and say how many to pick. There's no guessing penalty, so answer everything. Mark hard items and come back to them.
