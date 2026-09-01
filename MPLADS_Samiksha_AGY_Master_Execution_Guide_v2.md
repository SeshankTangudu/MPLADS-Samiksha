# MPLADS Samiksha — AGY Master Execution Guide v2.0

**Revision status:** Revised execution architecture incorporating capability preflight, PM orchestration, data compatibility before contract freeze, persistent execution state, dependency-driven scheduling, continuous review gates, and canonical T task IDs.

**PART A — APPROVED PROJECT PLAN (extracted from the
previously generated report; source of truth)**

**1. Project Name:** MPLADS Samiksha — Risk
Intelligence & Anomaly Detection Platform (fallback name: Project Drishti).

**2. Problem:** MPLADS publishes massive
project-level data (cost, expenditure, dates, status, category, district, MP).
No public interface ranks or explains which records deserve scrutiny; review
effort is manual, unranked, unexplained.

**3. Proposed Solution:** A read-only intelligence
layer over a dated, source-attributed snapshot: **Data → Analysis → Risk
Indicator → Explanation → Review Support.** All risk computation is done
offline at build time; runtime is a read-only API + React UI. Standing
disclaimer on all outputs: *"Risk indicators are analytical signals
intended to support review. They do not constitute proof of wrongdoing."*

**4. Target Users:** Monitoring/oversight officials,
auditors, researchers/analysts, citizens/journalists (users set = assumption
A1, validate Day 1).

**5. Final MVP:** 1 snapshot dataset · 1 DB · 8–9
read-only endpoints · 6 pages · 3 anomaly families · 1 explainable scoring
model · 1 CSV export · 1 methodology page · 1 rehearsed demo.

**6. P0 Features:** Dashboard (KPIs + risk
distribution) · Project Explorer (search/filter/sort/pagination) · Anomaly
Intelligence Center · Project Investigation page (score decomposition +
comparable projects) · Explainable risk engine · Responsible-AI disclaimers.

**7. P1 Features:** District map (Leaflet
CircleMarkers, centroids) · CSV risk-report export · comparative analytics ·
Per-MP concentration flag if trivial. **P2 (only if stable):** Isolation
Forest offline cross-check, rule-based fuzzy duplicates, district
polygons. **Future (slides only):** auth/RBAC/audit, live
ingestion, PDF pipeline, embeddings.

**8. Selected Anomaly Features:**

- **Financial      (weight 35):** dual condition — cost > P90 of cohort **AND** ratio      > 3.0× median of same category+state cohort; suppressed for cohorts      < 10.
- **Timeline      (weight 25):** age-in-status > P90 of same-status cohort.
- **Data-quality      (weight 5 each, cap 20):** deterministic validation failures      (missing district, cost ≤ 0, completion < sanction, Completed with 0      expenditure, missing category) — phrased as documentation-review items.
- **Geographic      (10):** district share of flagged value above district P90 — map      context, scored only if trivially computable.
- **Duplicate      (10, P2):** token similarity > 0.85 + same district + cost ±5%.
- **Isolation      Forest:** offline cross-check only, presented in slides, never in      runtime path.

**9. Risk Scoring Method:** raw = 35·FIN + 25·TIM +
min(20, 5·DQ) + 10·GEO + 10·DUP; score = min(100, raw). Levels: 0–24 Low /
25–49 Medium / 50–74 High / 75–100 Critical. Thresholds computed from
snapshot **Day 3 AM, then frozen and published** in docs/methodology.md.
Every score returns ordered reasons[] (observed, baseline, cohort,
threshold).

**10. Dataset Requirements:** Project-level MPLADS
records (state, district, MP, category, description, sanction date, completion
date, sanctioned cost, expenditure, status) + district centroid reference.

**11. Data Sources:** mplads.mospi.gov.in released
reports; data.gov.in MPLADS datasets; community district centroid list;
optional cached Nominatim one-off geocoding. **No live API exists —
disclosed snapshot.** Real data attempted Day 1; synthetic fallback only
if real data unusable, and only with a red "demo data" banner.

**12. Technology Stack:** React+Vite, Recharts,
Leaflet+OSM | FastAPI, SQLAlchemy, Pydantic | SQLite (Postgres-ready) |
Python+Pandas, scikit-learn (offline only) | pytest, GitHub Actions (one
workflow) | Vercel (frontend) + local/Render (backend) | draw\.io, OBS.

**13. System Architecture:** Raw files → clean
scripts → SQLite → batch risk engine → read-only FastAPI → React UI. External:
OSM tiles, Vercel, optional Render. Intelligence never computed at runtime.

**14. Database:** mps, districts, projects (FK
mps/districts, UNIQUE source\_record\_id), risk\_scores (1:1
projects), risk\_flags (1\:N), analytics\_cache. Indexes:
projects(category,status), projects(district\_id), risk\_scores(total\_score
DESC), risk\_flags(project\_id).

**15. APIs:** GET /api/stats/overview · /api/projects · /api/projects/{id} · /api/anomalies · /api/analytics/by-category · /api/analytics/by-district · /api/locations · /api/methodology · /api/reports/risk-summary.csv. **Contract is frozen only after the Day-1 data compatibility gate confirms that the real snapshot can support the approved schema and API shapes.**

**16. Frontend Pages:** Overview/Home ·
Dashboard/Analytics · Project Explorer · Project Investigation · Anomaly Center
· Geographic Intelligence · Reports · Methodology. Government style:
white/off-white, navy #1B3A5C, amber/red only for risk, Inter/Noto Sans.
Empty/loading/error states everywhere.

**17. Security Requirements:** Read-only ORM API,
Pydantic validation, React escaping, CORS allowlist, no
uploads, .env hygiene, generic errors, rate-limit stub. Known gaps
disclosed: no auth, SQLite concurrency, basic rate limit. Never claim zero
vulnerabilities.

**18. Deployment Plan:** Frontend → Vercel (hobby).
Backend → local laptop primary; optional Render free tier (cold-start risk
disclosed). DB → versioned SQLite file. Screen-recorded backup demo mandatory.

**19. 4-Day Timeline:** D1 capability audit + repo/environment + real-data discovery/validation + **data compatibility gate + contract freeze** · D2 core application + browse + anomaly engine · D3 intelligence + integration (thresholds frozen only after validated data) + gated P1 map/export · D4 hardening, deploy, docs, rehearsal. No new features Day 4.





**20. Post-Hackathon Roadmap:** automated ingestion
→ historical trend anomalies → embedding duplicates → reviewer
workflow/RBAC/audit → national-scale architecture (Postgres, scheduled scoring,
caching, monitoring).

---

**PART B — AGY MASTER EXECUTION GUIDE**

**B.1 AGY CAPABILITY + INITIALIZATION PROTOCOL (read first)**

AGY's exact tool inventory is not disclosed in this conversation. **AGY MUST NOT begin implementation until it completes the capability audit below.** The audit is a preflight gate, not a coding task.

### B.1.1 Capability audit

Before touching application code, the PM Agent must verify and report whether AGY can perform each capability:

- **[CODING]** read/write project files and run code in the workspace.
- **[BROWSER]** open and inspect public websites.
- **[FILE]** read/write project files and supplied artifacts.
- **[EXEC]** run shell/terminal commands and observe exit codes/output.
- **[LOCAL]** provide exact commands for user-side execution when AGY cannot execute locally.
- **[GIT]** initialize/commit/check repository state.
- **[PARALLEL]** run independent agents/tasks concurrently without conflicting workspace writes.
- **[TEST]** run Python/Node test suites and retain results.
- **[DEPLOY]** perform deployment steps directly, or identify the exact [USER] click-through required.
- **[BROWSER-SESSION]** determine whether authentication must be completed by the user in a browser.

If any required capability is unavailable, AGY must classify the affected tasks as **AGY-EXECUTABLE**, **AGY-GENERATES-COMMAND**, or **USER-ACTION**. It must not pretend an unavailable capability exists.

### B.1.2 Mandatory initialization

After the capability audit, PM Agent creates and maintains:

```text
.agy/
  state.json
  task_queue.json
  blockers.json
  decisions.md
  checkpoints/
```

`state.json` is the authoritative execution state. It must track current phase, completed/running/blocked/failed tasks, frozen contracts, threshold status, integration status, and the next unlocked task. `task_queue.json` records dependency status and priority. `blockers.json` records active blockers. `decisions.md` records non-trivial architectural decisions and approved deviations.

### B.1.3 Execution rules

1. **DO NOT START IMPLEMENTATION** before the capability audit and state initialization are complete.
2. Use **T IDs from §B.4 as the only canonical task IDs** for dependencies, state, checkpoints, and resume logic.
3. The numbered prompt bundles in §B.5 are execution instructions only; they are **not a second task-ID system**.
4. PM Agent schedules work dynamically from dependency readiness, priority, and available parallel capacity. The 4-day schedule in §B.20 is a deadline/priority framework, not a rigid serial script.
5. If AGY stops or restarts, it must read `.agy/state.json`, `.agy/task_queue.json`, and `.agy/decisions.md` and resume from the first unlocked task without repeating completed work.
6. No downstream task starts while a required upstream gate is failed or unresolved.

### B.1.4 Tool labels

- **[USER]** — you must perform the step manually (login, download, deploy click-through).
- **[LOCAL]** — runs on your machine; AGY supplies exact commands unless [EXEC] is available.
- **[AGY CAPABILITY TO VERIFY]** — must be resolved during the audit before the task is scheduled.

Nothing in this plan permits fabricating datasets, credentials, URLs, API responses, or platform capabilities.

**B.2 AGENT ARCHITECTURE**

The PM Agent is the **controller/orchestrator**, not merely a reporting role. It owns execution state, task scheduling, dependency unlocking, agent assignment, checkpoint acceptance, blocker escalation, and resume logic. It must not write application code.

| # | Agent | Responsibility | Primary Tools |
|---|---|---|---|
| 1 | **PM / Orchestrator Agent** | Capability audit, task sequencing, parallel dispatch, state management, checkpoint acceptance/rejection, blocker escalation, resume | Orchestration |
| 2 | **Architect Agent** | Architecture, data compatibility decisions, frozen DB/API contracts, dispute arbitration | [FILE][CODING] |
| 3 | **Data Engineer** | Download, preserve, clean, validate, profile snapshot, centroid reference | [CODING][BROWSER][FILE] |
| 4 | **Database Engineer** | Schema, load, indexes, integrity verification | [CODING][FILE] |
| 5 | **Backend Engineer** | FastAPI app, routers, schemas, contract conformance | [CODING][FILE] |
| 6 | **AI/ML Agent** | Cohort statistics, risk engine, batch scoring, offline IF cross-check | [CODING][FILE] |
| 7 | **Frontend Engineer** | Pages, routing, API client, application states | [CODING][FILE] |
| 8 | **UI/UX Agent** | Government design tokens, responsive layout, accessibility/state review, polish | [CODING][BROWSER] |
| 9 | **Integration Agent** | Frontend↔backend wiring, contract conformance, end-to-end journey | [CODING][LOCAL] |
| 10 | **Security Agent** | Security review, secrets audit, risk table | [CODING][FILE] |
| 11 | **QA Agent** | Unit/API/UI/E2E testing, regression review, gate ownership | [CODING][LOCAL] |
| 12 | **DevOps Agent** | Environment, run scripts, deployment runbook, health checks, backup | [CODING][LOCAL][USER] |
| 13 | **Docs Agent** | Methodology, README, trace evidence, slides, demo documentation | [FILE] |
| 14 | **Demo Reviewer** | Ruthless judge pass on running app, rehearsal, demo backup | [BROWSER][LOCAL] |

**PM control rule:** every task moves through `LOCKED → READY → RUNNING → REVIEW → PASSED` or `BLOCKED/FAILED`. A dependent task is unlocked only after its required gate passes. Agents report through §B.22; PM records the result in `.agy/state.json` and `.agy/checkpoints/`.

Agents 8, 10, 11, 12, 13, 14 are activated at defined checkpoints rather than continuously, except when PM explicitly schedules them for a gate.

**B.3 MASTER DEPENDENCY GRAPH**

```text
APPROVED PROJECT REQUIREMENTS (Part A)
                ↓
      T00 — AGY CAPABILITY AUDIT
                ↓
        ┌───────┴────────┐
        ↓                ↓
   T01 → T02          T03 DATA
 REPO → ENV           DOWNLOAD
                         ↓
                     T04/T05
                   CLEAN + REF
        └───────┬────────┘
                ↓
      DATA COMPATIBILITY GATE
                ↓
      ARCHITECT CONTRACT FREEZE
       (DB + API contracts)
                ↓
   ┌────────────┼─────────────┐
   ↓            ↓             ↓
 T06 DB      T07–T09       T14 FRONTEND
   ↓         BACKEND       FOUNDATION
 T10–T12       LANE             ↓
 AI/ML        against       T15–T18 FRONTEND
   ↓          frozen           │
 SCORED DB     contracts       │
   └────────────┬──────────────┘
                ↓
             T20 INTEGRATION
                ↓
       ┌────────┴────────┐
       ↓                 ↓
   T21 QA GATE       T22 SECURITY
       └────────┬────────┘
                ↓
             T23 DEPLOY
                ↓
        T24 DOCS + T25 UI
                ↓
             T26 DEMO
                ↓
          FINAL HUMAN CHECK
```

**Parallel execution rule:** after the data compatibility/contract-freeze gate, the DB→AI/ML lane, Backend lane, and Frontend-on-mocks lane may run in parallel when their dependencies are satisfied. Frontend switches from mocks to live API only after the relevant backend contract is available. Map/CSV remain gated until integration is green.

**Critical change:** architecture is designed before implementation, but the **final DB/API contract is not frozen until the real-data compatibility gate** confirms that required fields, derivations, null behavior, and unsupported features are understood. This prevents the contract from encoding assumptions that the real snapshot cannot support.

**B.4 MASTER TASK LIST (condensed; full prompts follow in §B.5)**

**Canonical ID rule:** T00–T26 are the only task identifiers. Dependencies, state transitions, blockers, checkpoint reports, and resume operations must reference these T IDs. Prompt bundles in §B.5 are grouped instructions mapped to these tasks and are not independent IDs.

|      |
| ---- |

ID

|      |
| ---- |

Task

|      |
| ---- |

Agent

|      |
| ---- |

Depends On

|      |
| ---- |

Input

|      |
| ---- |

Output

|      |
| ---- |

Pri

|      |
| ---- |

Definition of Done

|     |
| --- |

T01

|     |
| --- |

Repo scaffold + README + .gitignore + folder structure

|     |
| --- |

Architect

|     |
| --- |

T00

|     |
| --- |

Part A §20

|     |
| --- |

Repo tree

|     |
| --- |

P0

|     |
| --- |

Structure matches report §20

|     |
| --- |

T02

|     |
| --- |

Python venv + Node env + dependency files

|     |
| --- |

DevOps

|     |
| --- |

T01

|     |
| --- |

Stack §14

|     |
| --- |

requirements.txt, package.json

|     |
| --- |

P0

|     |
| --- |

Installs cleanly, versions pinned

|     |
| --- |

T03

|     |
| --- |

Download MPLADS snapshot

|     |
| --- |

Data Eng

|     |
| --- |

T00

|     |
| --- |

Sources §11

|     |
| --- |

data/raw/\* + provenance note

|     |
| --- |

P0

|     |
| --- |

Files + date + URL recorded

|     |
| --- |

T04

|     |
| --- |

Clean + validate + data-quality report

|     |
| --- |

Data Eng

|     |
| --- |

T03

|     |
| --- |

Raw files

|     |
| --- |

clean CSV + DQ report

|     |
| --- |

P0

|     |
| --- |

Report §B.10 checks all pass or documented

|     |
| --- |

T05

|     |
| --- |

Centroid reference table

|     |
| --- |

Data Eng

|     |
| --- |

T03

|     |
| --- |

Community centroid list

|     |
| --- |

data/reference/centroids.csv

|     |
| --- |

P1

|     |
| --- |

≥90% districts matched; else map demoted

|     |
| --- |

T06

|     |
| --- |

Schema + load DB

|     |
| --- |

DB Eng

|     |
| --- |

T04

|     |
| --- |

Clean CSV, §B.6

|     |
| --- |

SQLite DB

|     |
| --- |

P0

|     |
| --- |

Row counts match clean CSV; FK integrity query passes

|     |
| --- |

T07

|     |
| --- |

FastAPI skeleton + CORS + error handlers

|     |
| --- |

Backend

|     |
| --- |

T01,T02

|     |
| --- |

§B.7

|     |
| --- |

Running app + Swagger

|     |
| --- |

P0

|     |
| --- |

Swagger loads; 404/422 handlers verified

|     |
| --- |

T08

|     |
| --- |

ORM models + Pydantic schemas (frozen)

|     |
| --- |

Backend

|     |
| --- |

T06,T07

|     |
| --- |

§B.6,§B.7

|     |
| --- |

models.py, schemas.py

|     |
| --- |

P0

|     |
| --- |

Round-trip test DB↔model↔schema passes

|     |
| --- |

T09

|     |
| --- |

Endpoints: overview, projects, project/{id}

|     |
| --- |

Backend

|     |
| --- |

T08

|     |
| --- |

Contract §B.7

|     |
| --- |

Working routes

|     |
| --- |

P0

|     |
| --- |

pytest contract tests pass

|     |
| --- |

T10

|     |
| --- |

Cohort statistics script

|     |
| --- |

AI/ML

|     |
| --- |

T06

|     |
| --- |

Scored-able DB

|     |
| --- |

stats tables/JSON

|     |
| --- |

P0

|     |
| --- |

Median/P90 spot-checked by hand on 5 cohorts

|     |
| --- |

T11

|     |
| --- |

risk\_engine.py (pure functions)

|     |
| --- |

AI/ML

|     |
| --- |

T10

|     |
| --- |

Stats + rows

|     |
| --- |

flags+scores

|     |
| --- |

P0

|     |
| --- |

Unit tests: edge cases, hand-verified example

|     |
| --- |

T12

|     |
| --- |

Batch scoring → risk tables

|     |
| --- |

AI/ML

|     |
| --- |

T11

|     |
| --- |

DB

|     |
| --- |

risk\_scores, risk\_flags

|     |
| --- |

P0

|     |
| --- |

Flag rate in 1–6% band; 1 project manually verified
&#x20; end-to-end

|     |
| --- |

T13

|     |
| --- |

Endpoints: anomalies, analytics×2, locations, methodology,
&#x20; CSV

|     |
| --- |

Backend

|     |
| --- |

T12

|     |
| --- |

Contract

|     |
| --- |

Routes

|     |
| --- |

P0/P1

|     |
| --- |

Contract tests + CSV opens in Excel

|     |
| --- |

T14

|     |
| --- |

React foundation: router, theme, API client, states

|     |
| --- |

Frontend

|     |
| --- |

T01,T02

|     |
| --- |

§16 design

|     |
| --- |

App shell

|     |
| --- |

P0

|     |
| --- |

All routes render; mock-driven

|     |
| --- |

T15

|     |
| --- |

Overview + Dashboard pages

|     |
| --- |

Frontend

|     |
| --- |

T14

|     |
| --- |

Mocks→API

|     |
| --- |

2 pages

|     |
| --- |

P0

|     |
| --- |

4 KPIs + 6 charts live on real API

|     |
| --- |

T16

|     |
| --- |

Project Explorer

|     |
| --- |

Frontend

|     |
| --- |

T14

|     |
| --- |

/api/projects

|     |
| --- |

Page

|     |
| --- |

P0

|     |
| --- |

Search/filter/sort/pagination live

|     |
| --- |

T17

|     |
| --- |

Anomaly Center

|     |
| --- |

Frontend

|     |
| --- |

T12,T14

|     |
| --- |

/api/anomalies

|     |
| --- |

Page

|     |
| --- |

P0

|     |
| --- |

Table + badges + reason chips + disclaimer

|     |
| --- |

T18

|     |
| --- |

Investigation page (wow moment)

|     |
| --- |

Frontend

|     |
| --- |

T12,T14

|     |
| --- |

/api/projects/{id}

|     |
| --- |

Page

|     |
| --- |

P0

|     |
| --- |

Reason cards + comparables table + highlight

|     |
| --- |

T19

|     |
| --- |

Map page

|     |
| --- |

Frontend

|     |
| --- |

T05,T13

|     |
| --- |

/api/locations

|     |
| --- |

Page

|     |
| --- |

P1

|     |
| --- |

Points render, risk-colored

|     |
| --- |

T20

|     |
| --- |

Integration pass

|     |
| --- |

Integration

|     |
| --- |

T09,T13,T15–T18

|     |
| --- |

Live app

|     |
| --- |

Wired app

|     |
| --- |

P0

|     |
| --- |

Zero console errors; no mock fallbacks left

|     |
| --- |

T21

|     |
| --- |

Full test suite + E2E

|     |
| --- |

QA

|     |
| --- |

T20

|     |
| --- |

§B.18

|     |
| --- |

Passing suite + report

|     |
| --- |

P0

|     |
| --- |

All P0 tests green

|     |
| --- |

T22

|     |
| --- |

Security review

|     |
| --- |

Security

|     |
| --- |

T20

|     |
| --- |

§B.19

|     |
| --- |

Risk table

|     |
| --- |

P0

|     |
| --- |

Table complete, no critical unfixed

|     |
| --- |

T23

|     |
| --- |

Deploy frontend + backend runbook

|     |
| --- |

DevOps

|     |
| --- |

T21

|     |
| --- |

§B.20

|     |
| --- |

URL + runbook

|     |
| --- |

P1

|     |
| --- |

URL loads; localhost fallback verified

|     |
| --- |

T24

|     |
| --- |

methodology.md + README + slides

|     |
| --- |

Docs

|     |
| --- |

T12

|     |
| --- |

Engine config

|     |
| --- |

Docs

|     |
| --- |

P0

|     |
| --- |

All weights/thresholds published

|     |
| --- |

T25

|     |
| --- |

UI polish + disclaimers + responsive

|     |
| --- |

UI/UX

|     |
| --- |

T21

|     |
| --- |

§16

|     |
| --- |

Polished app

|     |
| --- |

P0

|     |
| --- |

No blank screens at any viewport

|     |
| --- |

T26

|     |
| --- |

Demo script + rehearsal + backup video

|     |
| --- |

Demo Reviewer

|     |
| --- |

T23,T25

|     |
| --- |

§B.24

|     |
| --- |

Script + video

|     |
| --- |

P0

|     |
| --- |

3 clean run-throughs recorded

**B.5 EXECUTION PROMPT LIBRARY (copy-paste ready)**

**Canonical task-ID rule:** §B.4 T IDs are the only identifiers used in dependencies, state, blockers, checkpoints, and resume logic. The prompt bundles below are grouped instructions and may cover one or more T IDs. They must not be treated as a second dependency system.

**Universal preamble — prepend to EVERY coding prompt:**

Before modifying any file, inspect the existing repository, architecture, dependencies, related files, schemas, and APIs. Do not overwrite working functionality unnecessarily. Work in order: Inspect → Understand → Plan → Modify → Run → Test → Verify → Report. Before starting, read `.agy/state.json` and confirm the task's T ID is READY. If any required input is missing, STOP and raise a BLOCKER per the protocol; never fabricate data, credentials, URLs, APIs, or platform capabilities. After completion, PM Agent updates `.agy/state.json` and writes the checkpoint under `.agy/checkpoints/`.

**Universal suffix — append to EVERY coding prompt:**

Report back using the checkpoint format (§B.22): COMPLETED /
MODIFIED FILES / TESTS PASSED / TESTS FAILED / BLOCKERS / USER ACTION REQUIRED
/ NEXT TASK.

---

**TASK T00 — AGY Capability Audit + Execution State**

**AGENT:** PM / Orchestrator

**OBJECTIVE:** Complete §B.1 before any implementation.

**REQUIREMENTS:**
1. Audit [CODING], [BROWSER], [FILE], [EXEC], [LOCAL], [GIT], [PARALLEL], [TEST], and deployment/browser-session capabilities.
2. Classify every required capability as available, command-generated, or user-action.
3. Create `.agy/state.json`, `.agy/task_queue.json`, `.agy/blockers.json`, `.agy/decisions.md`, and `.agy/checkpoints/`.
4. Load the canonical T01–T26 task graph and mark only tasks whose dependencies are satisfied as READY.
5. Record any capability blocker before implementation begins.

**DO NOT:** write application code, install application dependencies, fabricate capabilities, or silently downgrade requirements.

**DoD:** Capability report is complete; state files exist; task graph is initialized; T01 is READY only after T00 passes.

**PROMPT 01 — Repository + Architecture**

**CANONICAL TASK: T01**

**AGENT:** Architect · **TOOLS:** [CODING][FILE]

**OBJECTIVE:** Create the exact repository skeleton from report §20.

**FILES TO MODIFY:** none existing; create scaffold only.

**REQUIREMENTS:**

1. Create mplads-samiksha/ with      the exact folder tree from report §20 (frontend/, backend/app/,      data/raw|processed|reference, ml/, scripts/, notebooks/, tests/, docs/,      .env.example).
2. Create      root .gitignore: .env, data/raw/\*, data/processed/\*.db, node\_modules/, \_\_pycache\_\_/, .venv/, dist/.
3. Create .env.example with DATABASE\_URL=sqlite:///data/processed/mplads.db and      commented placeholders only.
4. Create docs/contracts/ with      two empty placeholder files: api\_contract.md, db\_contract.md.
5. Initialize      git; first commit message: "chore: scaffold per approved      architecture".
         **DO NOT:** create any application code; install packages; create      data files.
         **DoD:** Tree matches §20; git status clean;      .env.example has no real values.

**PROMPT 02 — Environment Setup**

**CANONICAL TASK: T02**

**AGENT:** DevOps · **TOOLS:** [CODING][LOCAL]

**OBJECTIVE:** Reproducible environments.

**REQUIREMENTS:**

1. Generate requirements.txt:      fastapi, uvicorn[standard], sqlalchemy, pydantic, pandas, openpyxl,      scikit-learn, pytest, httpx, python-dotenv — latest stable, pinned      with ==.
2. Generate frontend/package.json via      Vite React template: react, react-dom, react-router-dom, axios, recharts,      leaflet; dev: vite.
3. Generate backend/run.sh / run.bat:      activate venv → uvicorn app.main\:app --reload --port 8000.
4. One      GitHub Actions workflow tests.yml: pytest on push — **mark      optional; only commit if Day 4 spare time**.
         **DoD:** Fresh pip install -r and npm      install succeed on a clean machine.

**PROMPT 03 — Data Pipeline**

**CANONICAL TASKS: T03–T05**

**AGENT:** Data Engineer · **TOOLS:** [CODING][BROWSER][FILE]

**OBJECTIVE:** Acquire and clean the real MPLADS snapshot per report
§11–12.

**FILES:** create scripts/download\_data.py, scripts/clean\_data.py;
write data/raw/, data/processed/projects\_clean.csv, docs/data\_quality\_report.md.

**REQUIREMENTS:**

1. Download      project-level MPLADS released reports from mplads.mospi.gov.in and/or      data.gov.in via browser; record exact URL, download date, and file names      in data/raw/PROVENANCE.md. If automated download fails, raise BLOCKER      — I will download manually.
2. download\_data.py:      preserve raw files untouched.
3. clean\_data.py (Pandas):      strip ₹/commas → float; parse dates → ISO; normalize district names      (lowercase, trim, standard spelling map      in data/reference/district\_map.csv); deduplicate on source\_record\_id;      trim strings; drop empty rows.
4. Output      columns must exactly match DB contract §B.6 projects fields.
5. Produce docs/data\_quality\_report.md with:      row counts before/after, per-column null %, duplicate count, invalid      dates, costs ≤ 0, invalid statuses, geographic unmatched values.
         **DO NOT:** invent rows; silently drop >5% of records (report      instead); switch to synthetic data without an explicit red-flag decision      from me.
         **TESTS:** script runs twice idempotently; output CSV column names      verified against §B.6.
         **DoD:** Clean CSV + DQ report complete; <5% critical nulls;      provenance documented.

**PROMPT 04 — Database**

**CANONICAL TASK: T06**

**AGENT:** Database Engineer · **DEPENDS:** data compatibility gate

**OBJECTIVE:** Implement the frozen DB contract.

**REQUIREMENTS:**

1. Create scripts/build\_db.py +      SQLAlchemy models in backend/app/models.py implementing exactly      the six tables of §B.6 (mps, districts, projects, risk\_scores, risk\_flags,      analytics\_cache) with the listed PKs, FKs, UNIQUE(source\_record\_id), and      the four indexes.
2. Load      clean CSV; fail loudly on FK violations.
3. Write docs/contracts/db\_contract.md (tables,      fields, types, relationships, constraints, indexes).
4. Verification      script: row counts vs CSV; FK integrity query; sample joins.
         **DoD:** DB loads; integrity checks pass; contract doc committed      and declared FROZEN.

**PROMPT 05 — Backend Foundation**

**CANONICAL TASK: T07**

**AGENT:** Backend Engineer · **DEPENDS:** T06 + data compatibility gate

**OBJECTIVE:** FastAPI app per report §13/§18.

**REQUIREMENTS:**

1. backend/app/main.py:      FastAPI app, CORS allowlist from env      var ALLOWED\_ORIGINS (default localhost:5173), global exception      handler returning {detail, code} without stack      traces, /health endpoint.
2. Pydantic      schemas in schemas.py mirroring every table + the response      shapes in §B.7.
3. Read-only:      no POST/PUT/DELETE routers anywhere.
         **TESTS:** pytest with httpx TestClient: /health 200; unknown      route 404 shape; invalid filter → 422.
         **DoD:** Swagger UI loads; all tests green.

**PROMPT 06 — Core APIs (contract-conformant)**

**CANONICAL TASKS: T08–T09**

**AGENT:** Backend Engineer · **DEPENDS:** T07 + contract freeze

**OBJECTIVE:** Implement /api/stats/overview, /api/projects, /api/projects/{id} exactly
per §B.7.

**REQUIREMENTS:**

1. SQLAlchemy      parameterized queries only; pagination default 25/page; filter params      validated as enums.
2. /api/projects/{id} returns      project + flags + score + comparables (same category+state, nearest 10 by      cost) in one payload.
3. Contract      tests for happy path, empty result, bad id (404), bad filter (422).
         **DoD:** Swagger shows real data; tests green; response matches      contract byte-for-byte on field names.

**PROMPT 07 — Anomaly Engine**

**CANONICAL TASKS: T10–T11**

**AGENT:** AI/ML Agent · **DEPENDS:** T06 + T10

**OBJECTIVE:** ml/risk\_engine.py — pure functions, exactly the
three approved families (report §8.1–8.3); GEO and DUP flags only per §8.4
rules; NO ML in this module.

**REQUIREMENTS:**

1. First      create scripts/compute\_stats.py: per category+state cohort → median      cost, P90 cost; per status cohort → P90 age\_days. Output stats table in      DB.
2. risk\_engine.py implements      ONLY:
   - FINANCIAL:       flag iff cost > P90(cohort) **AND** cost/median >       3.0; skip cohorts < 10 rows (record skipped, don't flag).
   - TIMELINE:       flag iff age\_days > P90(status cohort) for non-terminal       statuses; skip if sanction\_date null (emit data-quality note instead).
   - DATA-QUALITY:       five hard rules (missing district, cost ≤ 0, completion\_date <       sanction\_date, status Completed & expenditure 0, missing category),       weight 5 each, cap 20.
3. Every      flag writes: flag\_type, weight, observed\_value, baseline\_value,      cohort\_desc (with cohort size), reason\_text (plain-language sentence      exactly in the §8 templates), severity.
4. Language      rule: never use "fraud", "corruption",      "misuse"; only "unusual pattern", "requires      review", "documentation check".
         **TESTS (mandatory):** handcrafted fixture rows — project exactly      at threshold (no flag), 1rupee above (flag), cohort of 9 (no flag,      logged), Completed+0 expenditure (DQ flag), completion before sanction (DQ      flag). One real DB project's flag verified by hand against raw numbers.
         **DoD:** Pure module (no I/O in functions); all edge-case tests      pass; one hand-verified real example documented      in docs/methodology.md draft.

**PROMPT 08 — Risk Scoring**

**CANONICAL TASK: T12**

**AGENT:** AI/ML Agent · **DEPENDS:** T11

**OBJECTIVE:** Batch scorer implementing §9 exactly.

**REQUIREMENTS:**

1. scripts/compute\_risk.py: raw      = 35·FIN + 25·TIM + min(20, 5·DQ) + 10·GEO + 10·DUP; GEO/DUP default 0      unless their P2/P1 conditions implemented; score = min(100, raw);      levels per §9.3.
2. Write      risk\_scores + risk\_flags; freeze thresholds      into docs/methodology.md (weights, P90s, cohort definitions,      snapshot date).
3. Report      flag-rate distribution; if any level >6% of projects, report as a      warning, don't auto-retune.
         **TESTS:** unit tests proving: single FIN flag → score 35/Medium;      FIN+TIM+2 DQ → 35+25+10=70/High; capped DQ (5 flags) → min(20,25)=20;      min(100,·) cap works.
         **DoD:** Scores persisted; methodology published; tests green.

**PROMPT 09 — Frontend Foundation**

**CANONICAL TASK: T14**

**AGENT:** Frontend Engineer · **DEPENDS:** T02

**OBJECTIVE:** App shell per report §16 against MOCK data matching
§B.7.

**REQUIREMENTS:**

1. Vite      + React Router with      routes: /, /analytics, /explore, /anomalies, /project/\:id, /map, /methodology, /about.
2. Theme      tokens: background #FAFAF8, primary #1B3A5C, risk colors amber/red only,      Inter/Noto Sans, thin tables.
3. Typed      API client module with base URL from VITE\_API\_BASE;      a mock/ data folder mirroring the contract for pre-integration      development.
4. Reusable      components: KpiCard, RiskBadge, ReasonCard, DataTable, DisclaimerBanner,      EmptyState, LoadingState, ErrorState.
5. Every      page wired to use Empty/Loading/Error states from day one.
         **DoD:** All routes render with mocks; no console errors; theme      consistent.

**PROMPT 10–11 — Dashboard + Explorer**

**CANONICAL TASKS: T15–T16**

**AGENT:** Frontend Engineer · **DEPENDS:** T09 + T14

**OBJECTIVE:** Overview page (4 KPI cards, risk-distribution bar, top-5
review priorities, disclaimer banner, source footer) and Explorer (search,
filters status/category/state/risk, sort, pagination).

**REQUIREMENTS:** switch from mocks to live API; debounce search 300ms;
URL query params preserved on filter; footer on both pages: "Data: MOSPI
MPLADS released reports · Snapshot: [date] · Analytical signals only — not
proof of wrongdoing."

**DoD:** Live data; filters compose; zero console errors.

**PROMPT 12 — Investigation Page (WOW MOMENT)**

**CANONICAL TASK: T18**

**AGENT:** Frontend Engineer · **DEPENDS:** T09 + T14 + T12

**OBJECTIVE:** The centerpiece page.

**REQUIREMENTS:**

1. Sections:      project overview · financial card · timeline card · **"Why this      project was flagged" ReasonCards** (observed vs baseline vs      threshold, cohort size) · **comparable-projects table with this      project visually highlighted** · recommended-review footer ·      "Download report" action.
2. If      project has zero flags, page shows "No risk indicators triggered for      this project" — never a blank section.
         **DoD:** A flagged project tells the complete §8 explanation story      in one screen.

**PROMPT 13 — Anomaly Center**

**CANONICAL TASK: T17**

**AGENT:** Frontend Engineer

**REQUIREMENTS:** table (Project · District/MP · RiskBadge · anomaly
chips · one-line reason · severity), sort by score desc default, filters by
flag\_type/level, row click → Investigation, DisclaimerBanner pinned top.

**DoD:** Complete prioritized review list functional.

**PROMPT 14 — Map + CSV (P1, gated)**

**CANONICAL TASK: T19**

**AGENT:** Frontend + Backend · **GATE:** build
ONLY after T20 integration passes; if gated out by Day 3 late, remain
P1-deferred — do not rescue at the cost of P0.

**REQUIREMENTS:** Leaflet CircleMarkers (color=risk, radius=cost),
legend, filter by risk; district-precision note displayed. CSV endpoint: UTF-8
BOM, active filters applied, filename mplads\_risk\_summary\_[date].csv.

**DoD:** Map renders points; CSV opens correctly in Excel.

**PROMPT 15 — Integration**

**CANONICAL TASK: T20**

**AGENT:** Integration Engineer

**REQUIREMENTS:** remove all mock fallbacks; verify every endpoint
consumed matches contract field names; test filter→chart→table→detail flow;
verify CSV; check all three states (empty/loading/error) on every page by
temporarily killing backend.

**DoD:** Full user journey on real API; no dead links; no console
errors.

**PROMPT 16 — Testing**

**CANONICAL TASK: T21**

**AGENT:** QA Engineer

**REQUIREMENTS:** consolidate: engine unit tests (T11/T12), API contract tests (T07–T09), UI state tests, one E2E script (documented, manual:
§B.24 steps). Produce docs/test\_report.md.

**DoD:** suite green; report committed.

**PROMPT 17 — Security Review**

**CANONICAL TASK: T22**

**AGENT:** Security Agent — execute §B.19
exactly; produce the risk table; fix Critical/High only.

**PROMPT 18 — Deployment**

**CANONICAL TASK: T23**

**AGENT:** DevOps — execute §B.20 deployment requirements.

**TASK T24 — Documentation + Trace Evidence**

**AGENT:** Docs Agent · **DEPENDS:** T12 and the latest accepted integration state

**OBJECTIVE:** Produce judge-verifiable documentation without changing application behavior.

**REQUIREMENTS:**
1. Complete `docs/methodology.md` with approved weights, cohort definitions, threshold snapshot date, and explainability rules.
2. Complete README with setup, data provenance, architecture, known limitations, and deployment/run instructions.
3. Create `docs/trace_example.md` tracing one flagged project from raw row → clean row → DB row → flags → score → API response → UI reason card; every number must match.
4. Ensure slide/demo claims do not overstate ML, data freshness, security, or wrongdoing.

**DoD:** methodology, README, and trace evidence are complete and consistent with the frozen contracts and final implementation.

**PROMPT 19 — UI Polish**

**CANONICAL TASK: T25**

**AGENT:** UI/UX Agent

**REQUIREMENTS:** responsive at 1280/1024/768; disclaimers on Anomaly
Center, Investigation, exports; consistent RiskBadge colors; table overflow
handling; print stylesheet for Investigation (browser-print → PDF path).

**DoD:** no blank screens, no clipped tables, disclaimer audit passes.

**PROMPT 20 — Demo Preparation**

**CANONICAL TASK: T26**

**AGENT:** Demo Reviewer — execute §B.24 + §B.26.

**B.6 FROZEN DATABASE CONTRACT (all agents obey; changes
only via Architect)**

As per Part A §14. Authoritative doc generated in T06
and committed to docs/contracts/db\_contract.md. **No agent may
add/rename a column without an Architect-approved contract amendment noted in
that file.**

**B.7 FROZEN API CONTRACT**

|      |
| ---- |

Endpoint

|      |
| ---- |

Method

|      |
| ---- |

Request

|      |
| ---- |

Response (key fields)

|      |
| ---- |

Error

|     |
| --- |

/api/health

|     |
| --- |

GET

|     |
| --- |

—

|     |
| --- |

{status}

|     |
| --- |

—

|     |
| --- |

/api/stats/overview

|     |
| --- |

GET

|     |
| --- |

—

|     |
| --- |

{total\_projects, total\_sanctioned, flagged\_count,
&#x20; data\_coverage\_pct, risk\_distribution{}, anomaly\_breakdown{},
&#x20; top\_priorities[]}

|     |
| --- |

500

|     |
| --- |

/api/projects

|     |
| --- |

GET

|     |
| --- |

q, status, category, state, risk\_level, page, per\_page

|     |
| --- |

{items[], total, page, per\_page}

|     |
| --- |

422

|     |
| --- |

/api/projects/{id}

|     |
| --- |

GET

|     |
| --- |

id

|     |
| --- |

{project{}, score{}, flags[], comparables[]}

|     |
| --- |

404

|     |
| --- |

/api/anomalies

|     |
| --- |

GET

|     |
| --- |

flag\_type, risk\_level, sort, page

|     |
| --- |

{items[{project\_id, name, district, mp, risk\_level, score,
&#x20; top\_reason, flag\_types[]}], total}

|     |
| --- |

422

|     |
| --- |

/api/analytics/by-category

|     |
| --- |

GET

|     |
| --- |

—

|     |
| --- |

[{category, count, sanctioned, expenditure, flagged}]

|     |
| --- |

500

|     |
| --- |

/api/analytics/by-district

|     |
| --- |

GET

|     |
| --- |

—

|     |
| --- |

[{district, count, flagged, total\_cost}]

|     |
| --- |

500

|     |
| --- |

/api/locations

|     |
| --- |

GET

|     |
| --- |

risk\_level

|     |
| --- |

[{lat, lng, risk\_level, cost, project\_id}]

|     |
| --- |

500

|     |
| --- |

/api/methodology

|     |
| --- |

GET

|     |
| --- |

—

|     |
| --- |

{weights{}, thresholds{}, cohorts{}, snapshot\_date,
&#x20; limitations[]}

|     |
| --- |

500

|     |
| --- |

/api/reports/risk-summary.csv

|     |
| --- |

GET

|     |
| --- |

same filters as /projects

|     |
| --- |

CSV stream

|     |
| --- |

422

**B.8 ACCESS / LOGIN PROTOCOL**

|      |
| ---- |

Platform

|      |
| ---- |

Why needed

|      |
| ---- |

What you do

|      |
| ---- |

AGY access

|      |
| ---- |

Never provide

|     |
| --- |

GitHub

|     |
| --- |

Source control

|     |
| --- |

Create repo yourself; give AGY the repo via its git
&#x20; integration, or AGY generates commands for you to push

|     |
| --- |

Read/write to this one repo

|     |
| --- |

Password, SSH private key, tokens in chat

|     |
| --- |

data.gov.in / MPLADS portal

|     |
| --- |

Dataset download

|     |
| --- |

If AGY's [BROWSER] download fails, you download manually
&#x20; into data/raw/

|     |
| --- |

Public pages only

|     |
| --- |

Any account credentials (public download needs none)

|     |
| --- |

Vercel

|     |
| --- |

Frontend deploy

|     |
| --- |

You create account + import repo via Vercel's own OAuth
&#x20; flow in browser

|     |
| --- |

None directly; AGY supplies build settings (npm run build,
&#x20; output dist, env VITE\_API\_BASE)

|     |
| --- |

Password, cookies

|     |
| --- |

Render (optional)

|     |
| --- |

Backend deploy

|     |
| --- |

You create the service using AGY's runbook

|     |
| --- |

None directly

|     |
| --- |

Password, cookies

|     |
| --- |

Nominatim/OSM

|     |
| --- |

One-off geocoding

|     |
| --- |

None — no account

|     |
| --- |

Public API, ≤1 req/sec, cached precompute

|     |
| --- |

—

**Rule:** authentication always happens in AGY's
supported browser login flow if available; otherwise you perform it. **Never
paste passwords, cookies, or private keys into chat.**

**B.9 SECRETS MANAGEMENT**

.env (gitignored) + .env.example (committed,
placeholders only) + .gitignore (T01).

|      |
| ---- |

Secret

|      |
| ---- |

Service

|      |
| ---- |

Required By

|      |
| ---- |

Storage

|     |
| --- |

DATABASE\_URL

|     |
| --- |

SQLite path

|     |
| --- |

Backend

|     |
| --- |

.env

|     |
| --- |

ALLOWED\_ORIGINS

|     |
| --- |

CORS

|     |
| --- |

Backend

|     |
| --- |

.env

|     |
| --- |

VITE\_API\_BASE

|     |
| --- |

API base URL

|     |
| --- |

Frontend

|     |
| --- |

.env / Vercel env

|     |
| --- |

*(none — no API keys exist in this architecture)*

|     |
| --- |

—

|     |
| --- |

—

|     |
| --- |

—

No fake credentials are generated. The app intentionally
needs **zero** third-party API keys.

**B.10 DATA EXECUTION + VALIDATION**

Per dataset (MPLADS snapshot, centroids): Source → Access →
Fields → Download → Cleaning → Transformation → Storage → Usage → Validation →
Backup are fully specified in T03–T05 and T07 plus report §11–12. **Pre-ML
validation gate (the data compatibility gate must pass before T11 runs):** row
count, columns, null %, duplicates, invalid dates, invalid costs, invalid
statuses, outliers, geographic values, required-field completeness — all
in docs/data\_quality\_report.md. **If live download is unreliable,
AGY must STOP and raise a blocker — switching to synthetic data is my explicit
decision only, and if taken, it requires the red "demo data" banner.**

**B.11–B.12 ENGINE EXECUTION**

Fully encoded in T11 (input fields, algorithm, parameters, explanation templates, tests, expected results per anomaly family) and T12 (indicator→calculation→score→level→reasons chain with proof tests). **Non-negotiables:** only approved methods; explainability
fields mandatory on every flag; thresholds frozen post-calibration.

**B.13 FRONTEND + GOVERNMENT DESIGN EXECUTION**

Encoded in T14–T19. Design directive for the frontend
agent: professional Indian public-sector portal — reference mplads.mospi.gov.in
and the EmpoweredIndian page **for information architecture and tone
only; do not copy their design.** Communicate trust, transparency,
seriousness, data intelligence, accessibility (contrast, keyboard navigation,
semantic tables).

**B.14 MODULE INTEGRATION CONTRACT**

|      |
| ---- |

Module

|      |
| ---- |

Interface

|      |
| ---- |

Input

|      |
| ---- |

Output

|      |
| ---- |

Consumer

|     |
| --- |

clean\_data

|     |
| --- |

CSV schema §B.6

|     |
| --- |

raw files

|     |
| --- |

projects\_clean.csv

|     |
| --- |

build\_db

|     |
| --- |

build\_db

|     |
| --- |

SQLAlchemy models

|     |
| --- |

clean CSV

|     |
| --- |

mplads.db

|     |
| --- |

risk engine, API

|     |
| --- |

compute\_stats

|     |
| --- |

stats tables

|     |
| --- |

DB

|     |
| --- |

cohort stats

|     |
| --- |

risk\_engine

|     |
| --- |

risk\_engine

|     |
| --- |

pure functions

|     |
| --- |

rows + stats

|     |
| --- |

flag dicts

|     |
| --- |

compute\_risk

|     |
| --- |

compute\_risk

|     |
| --- |

batch script

|     |
| --- |

DB + flags

|     |
| --- |

risk

|   |
| - |

⚠️ The response reached the
length limit. Reply **continue** to get the rest.

Copy

Continue exactly from where you left off. Do not repeat
anything.

|      |
| ---- |

Module

|      |
| ---- |

Interface

|      |
| ---- |

Input

|      |
| ---- |

Output

|      |
| ---- |

Consumer

|     |
| --- |

compute\_risk

|     |
| --- |

batch script

|     |
| --- |

DB + flags

|     |
| --- |

risk\_scores, risk\_flags rows

|     |
| --- |

API, Anomaly Center, Investigation

|     |
| --- |

FastAPI routers

|     |
| --- |

REST §B.7

|     |
| --- |

HTTP

|     |
| --- |

JSON/CSV

|     |
| --- |

React pages

|     |
| --- |

React API client

|     |
| --- |

typed fetchers

|     |
| --- |

contract JSON

|     |
| --- |

component props

|     |
| --- |

pages

|     |
| --- |

methodology doc

|     |
| --- |

markdown + /api/methodology

|     |
| --- |

engine config

|     |
| --- |

UI Methodology page

|     |
| --- |

judges, users

**B.14.5 PM REVIEW / ACCEPTANCE LOOP**

Every task must pass this lifecycle:

```text
READY
  ↓
RUNNING
  ↓
SELF-TEST
  ↓
CHECKPOINT REPORT
  ↓
QA / SPECIALIST REVIEW
  ↓
ARCHITECT CONTRACT CHECK (where applicable)
  ↓
PM ACCEPT / REJECT
  ├── ACCEPT → unlock dependents
  └── REJECT → return to owning agent with exact failures
```

A failed task does not unlock its dependents. The owning agent fixes the failure and resubmits. PM records every transition in `.agy/state.json` and the corresponding checkpoint file. This review loop applies throughout the build, not only during the final QA phase.

**B.15 TEST-AFTER-EVERY-MODULE GATE**

No agent proceeds to its dependent task until the previous module's gate passes. PM Agent is the unlock authority; a green local test alone does not unlock downstream work:

|      |
| ---- |

After

|      |
| ---- |

Gate test

|      |
| ---- |

Gate owner

|     |
| --- |

Database

|     |
| --- |

row counts + FK integrity query

|     |
| --- |

DB Eng → Backend confirms

|     |
| --- |

Backend core

|     |
| --- |

contract pytest suite green

|     |
| --- |

QA

|     |
| --- |

Anomaly engine

|     |
| --- |

edge-case fixtures (P07 tests)

|     |
| --- |

QA + AI/ML

|     |
| --- |

Risk engine

|     |
| --- |

score-proof tests (P08)

|     |
| --- |

QA

|     |
| --- |

Frontend (mocks)

|     |
| --- |

all routes render, 3 states each

|     |
| --- |

Integration

|     |
| --- |

Integration

|     |
| --- |

full journey on live API, zero console errors

|     |
| --- |

Integration

|     |
| --- |

Deployment

|     |
| --- |

health check + E2E on deployed URL

|     |
| --- |

DevOps

**B.16 SECURITY REVIEW CHECKLIST (Security Agent — T22)**

Check and produce docs/security\_review\.md with a
table: **Risk | Severity | Status | Fix**:

1. Secrets      — grep repo for hard-coded values; verify .env gitignored; verify      .env.example has placeholders only.
2. Authentication/Authorization      — confirm none exists; verify read-only justifies it; note as Known Risk      (do not claim secure).
3. Input      validation — every query param enum/typed; invalid → 422 not 500.
4. SQL      injection — grep for raw string SQL; ORM parameterized only.
5. XSS      — grep for dangerouslySetInnerHTML; CSV formula-injection check      (prefix =,+,-,@ cells with ').
6. CORS      — allowlist from env, no wildcard.
7. Rate      limiting — slowapi stub present on public endpoints; marked as basic.
8. API      exposure — confirm no mutation endpoints; Swagger exposed knowingly      (demo); note for production.
9. Dependencies      — pip audit / npm audit; fix Critical only, list the rest.
10. Database      — file outside web root; read-only at runtime.
11. Error      messages — no stack traces to clients.
12. File      uploads — confirm none exist.
13. Logging      — no PII; structured; server-side only.

**Rule:** never state "zero
vulnerabilities" — state "reviewed; remaining risks documented."

**B.17 AI CODE REVIEW CHAIN**

Developer Agent → **QA Agent** (bugs, duplicate
code, broken deps, incorrect anomaly math, contract mismatches) → **Security
Agent** (hard-coded secrets, unsafe patterns) → **Integration
Agent** (UI/API field-name match). Code is accepted only after all three
sign off in the checkpoint report. Hard-coded values (thresholds, URLs, colors)
must live in config/constants, not scattered in logic.

**B.18 FINAL INTEGRATION SEQUENCE (verify end-to-end)**

DATA → DATABASE → BACKEND → ANOMALY ENGINE → RISK ENGINE →
API → FRONTEND → USER

Verification: pick one flagged project; trace its raw row →
clean row → DB row → flags → score → API response → UI reason card. Every
number must match at every hop. Document this trace
in docs/trace\_example.md — it doubles as judge evidence.

**B.19 DEPLOYMENT (DevOps Agent — T23)**

- **Frontend:** Vercel      hobby — import repo, build npm run build, output dist,      env VITE\_API\_BASE=https\://\<backend-url>/api (or localhost      for in-person demo). **[USER] performs the Vercel OAuth login in      browser; AGY supplies exact settings.**
- **Backend:** PRIMARY      = local laptop (run.sh, port      8000, ALLOWED\_ORIGINS=https\://\<vercel-url>). OPTIONAL = Render      free tier via runbook; cold-start sleep disclosed — never used as the only      instance.
- **Database:** versioned      SQLite file in data/processed/; backup copy      in data/processed/backup/.
- **ML:** none      at runtime (batch only) — nothing to deploy.
- **Health      checks:** GET /api/health before every demo; Vercel deploy      preview checked.
- **Production      URL:** recorded in README; localhost fallback verified same day.

**B.20 FOUR-DAY AGY EXECUTION SCHEDULE**

**Important:** the days are **deadline/priority targets**, not a rigid serial script. PM Agent should execute any READY independent task in parallel, subject to workspace safety and P0 priority.

**DAY 1 — Capability + Data + Foundation**

1. **Preflight:** T00 capability audit + `.agy/` state initialization.
2. **Parallel:** T01 repo scaffold + T02 environment setup + T03 real-data acquisition.
3. T04 data cleaning/validation and T05 centroid/reference work as dependencies permit.
4. **Mandatory data compatibility gate:** Architect + Data Engineer compare the real snapshot against the approved schema/API requirements.
5. **Only after the gate passes:** freeze DB/API contracts; unlock T06 DB, T07–T09 Backend, and T14 Frontend Foundation as their dependencies permit.

**Checkpoint EOD:** capability report complete; real data status known; DQ report complete; compatibility report complete; contracts frozen or an explicit blocker is raised; DB/backend/frontend may already be progressing where legally unlocked.

**DAY 2 — Core Application + Intelligence**

Parallel where dependencies permit: T06 DB · T07–T09 Backend · T10–T12 AI/ML · T14–T18 Frontend · QA review of completed work.

**Checkpoint:** browse path works against real data where available; anomaly/risk fixtures pass; `.agy/state.json` accurately reflects all gates.

**DAY 3 — Integration + P1 Gate**

AM: finalize scoring, freeze thresholds **only after validated data is available**, publish methodology.

PM: Anomaly Center, integration, then gate-check map/CSV. P1 work starts only if P0 integration is green and sufficient time remains.

**Checkpoint EOD:** Dashboard → Explorer → flagged project → reason cards → comparables works live; flag-rate band is verified; no unresolved P0 dependency remains.

**DAY 4 — Hardening + Demo (NO new features)**

Parallel: QA + Security · UI polish · deployment + backup · Docs. CI only if spare time.

**Checkpoint EOD:** deployed URL + localhost both green where applicable; 3 rehearsals recorded; judge review passed; MVP frozen.

**Dynamic scheduling rule:** if a task becomes READY early, PM may execute it early. If a task is blocked, PM moves it to BLOCKED and schedules the next highest-priority READY task. Never wait for the nominal day if useful independent work can proceed.

**B.21 BLOCKER PROTOCOL**

If AGY hits a missing dependency, it must STOP and report
exactly:

**BLOCKER:** [what is missing] · **WHY IT IS
REQUIRED:** [which task depends on it] · **WHAT I NEED TO DO:** [precise
user action — e.g., "download [file] from [official page] into
data/raw/"; "complete Vercel login in browser"] · **AFTER
I COMPLETE IT:** [AGY resumes the exact blocked task].

Forbidden: fabricating datasets, credentials, URLs, API responses, or platform capabilities. A capability gap is a valid blocker and must be recorded in `.agy/blockers.json`; PM may only reroute to an approved [LOCAL]/[USER] path or another available agent capability. Likely blockers: MPLADS download failing
(→ manual download), district matching <90% (→ map demoted to P2), flag rate
\>6% (→ architectural review, not silent retuning).

**B.22 CHECKPOINT REPORT FORMAT (every agent, every task)**

COMPLETED:        
[tasks/requirements done]

MODIFIED FILES:   
[exact paths]

TESTS PASSED:     
[list with results]

TESTS FAILED:     
[list or "none"]

BLOCKERS:         
[per B.21 or "none"]

USER ACTION REQ'D: [or "none"]

NEXT TASK:        
[task ID]

**B.23 DEMO WORKFLOW (exact steps — Demo Reviewer script)**

1. **Dashboard** —      load /. Expected: KPIs + risk distribution + Top-5 priorities. *Say:* the      scale problem.
2. **Anomaly      Center** — open, sort by risk. Expected: prioritized, explained      review list. *Say:* this is what manual review cannot do.
3. **Project      Explorer** — filter to one state/category. Expected: instant      filtered results.
4. **Flagged      project → Investigation** — click top anomaly. Expected:      ReasonCards with observed vs baseline vs threshold.
5. **Risk      score decomposition** — point at score, level, ordered      reasons. *Say:* fully explainable, auditable.
6. **Comparable      projects table** — project highlighted among peers. *Say:* relative,      not absolute, judgement. ← **WOW MOMENT**
7. **Map** (if      built) — geographic context. 8. **CSV export** —      official-feel output. 9. **Methodology page** — transparency      close. 10. **Impact statement** + disclaimer.

Backup: pre-recorded screen video of this exact sequence
(OBS, Day 4).

**B.24 DEMO BACKUP MATRIX**

|      |
| ---- |

Failure

|      |
| ---- |

Backup

|     |
| --- |

Internet down

|     |
| --- |

Full localhost demo (frontend + backend + SQLite local);
&#x20; map hidden; charts local

|     |
| --- |

API down

|     |
| --- |

Restart via run.sh (60s); fallback: backup video

|     |
| --- |

DB corrupt

|     |
| --- |

Backup SQLite copy restored (kept in
&#x20; data/processed/backup/)

|     |
| --- |

Deployment down

|     |
| --- |

Switch VITE\_API\_BASE to localhost, rebuild, or run
&#x20; frontend locally

|     |
| --- |

Dataset problem

|     |
| --- |

Backup video; snapshot immutable in data/raw so re-clean
&#x20; is possible

|     |
| --- |

AI/agent failure

|     |
| --- |

All code committed; runbooks allow manual operation
&#x20; without agents

**Rule:** the demo must never depend on exactly one
external service. Localhost is always the second instance, never deleted.

**B.25 RUTHLESS JUDGE CHECK (Demo Reviewer, Day 4)**

|      |
| ---- |

Dimension

|      |
| ---- |

Check

|      |
| ---- |

Weak-spot fix if failing

|     |
| --- |

Innovation

|     |
| --- |

Score + explanation + comparables, not another dashboard

|     |
| --- |

Lead demo with Investigation page

|     |
| --- |

Technical depth

|     |
| --- |

Frozen contracts, pure engine, batch design, tests

|     |
| --- |

Show trace\_example.md + methodology page

|     |
| --- |

Real-world usefulness

|     |
| --- |

Review-queue framing

|     |
| --- |

Open demo with the official's workflow

|     |
| --- |

Data credibility

|     |
| --- |

Real dated snapshot + provenance + DQ report

|     |
| --- |

Show PROVENANCE.md, never hide the snapshot date

|     |
| --- |

AI/ML necessity

|     |
| --- |

Rules justified by explainability; IF only cross-check

|     |
| --- |

Never oversell ML; frame honesty as maturity

|     |
| --- |

Explainability

|     |
| --- |

Every flag shows observed/baseline/threshold

|     |
| --- |

Verify on 3 flagged projects

|     |
| --- |

UI

|     |
| --- |

Government-serious, no broken states

|     |
| --- |

T25 polish pass

|     |
| --- |

Security

|     |
| --- |

Disclosed risks, read-only surface

|     |
| --- |

Present security\_review\.md, never claim "secure"

|     |
| --- |

Scalability

|     |
| --- |

Postgres-ready ORM, batch pipeline

|     |
| --- |

Show §B.27 phases — honest "prototype →
&#x20; production"

|     |
| --- |

Demo

|     |
| --- |

Smooth, fast, no dead clicks

|     |
| --- |

3 rehearsals; kill slow animations

Losing risks: overselling ML, blank states on stage,
unverifiable data claims, blank Methodology page. All fixed above within
remaining time.

**B.26 POST-HACKATHON AGY PHASES (not built during MVP)**

- **PHASE      5 — Automated ingestion & freshness:** scheduled downloads,      change detection, rescore pipeline. Agent: Data Eng + DevOps. Deps: stable      official sources. Output: auto-updating snapshot.
- **PHASE      6 — Intelligence upgrade:** historical timeline anomalies,      embedding-based duplicate detection, geographic concentration scoring,      Isolation Forest promoted to visible cross-check UI. Agent: AI/ML. Deps:      Phase 5 history.
- **PHASE      7 — Production platform:** Postgres, auth (OIDC), RBAC, reviewer      workflow with audit trails, notifications, PDF reporting,      monitoring/caching, national-scale batch infra. Agents: Backend, Security,      DevOps. Deps: Phases 5–6 + domain authority engagement.

**B.27 FINAL AGY MASTER COMMAND SEQUENCE**

01 — Read approved Part A + this AGY Master Execution Guide.

02 — Execute **T00: AGY capability audit + `.agy/` initialization**. **STOP if required capabilities are unresolved.**

03 — Execute **T01 + T02** (repo + environment) and **T03** (real-data acquisition) in parallel where possible.

04 — Execute **T04 + T05** (clean/validate + centroid/reference work).

05 — Execute the **DATA COMPATIBILITY GATE**. Produce `docs/data_compatibility.md` and resolve any schema/API assumptions against real data.

06 — Architect freezes `docs/contracts/db_contract.md` + `docs/contracts/api_contract.md`. Record `contracts_frozen=true` in `.agy/state.json`.

07 — Execute **T06** (database), **T07–T09** (backend), and **T14** (frontend foundation) as soon as dependencies are READY; parallelize independent work.

08 — Execute **T10–T12** (cohort stats, anomaly engine, batch risk scoring) with mandatory fixture gates.

09 — Execute **T13** (extended APIs) and **T15–T18** (Dashboard, Explorer, Anomaly Center, Investigation) as dependencies unlock.

10 — Execute **T20 Integration** only when required upstream tasks have passed. Remove mock fallbacks and verify the full live journey.

11 — Execute **T19 Map + CSV** ONLY if the integration gate is green and P0 work is stable.

12 — Execute **T21 QA**, then **T22 Security**, with PM acceptance after each gate.

13 — Execute **T23 Deployment**, **T24 Docs**, and **T25 UI polish** in parallel where dependencies allow.

14 — Execute **T26 Demo preparation**, including backup path and 3 rehearsals.

15 — Execute judge review (B.25); fix only issues that do not violate frozen contracts or scope priorities.

16 — Freeze MVP; tag git `v1.0.0`; record final trace evidence and checkpoint in `.agy/checkpoints/`.

17 — Final human check: verify deployed/localhost path, data provenance, methodology, disclaimers, and demo backup.

**Resume rule:** if AGY is interrupted at any point, do not restart from Command 01 blindly. Read `.agy/state.json`, `.agy/task_queue.json`, `.agy/blockers.json`, and `.agy/decisions.md`; resume from the first highest-priority READY task. Never repeat a PASSED task unless its inputs/contracts changed through an approved Architect decision.

**End of guide.** AGY begins with T00. Every deviation from Part A must be declared as a **RECOMMENDED CHANGE** and recorded in `.agy/decisions.md`; no deviation is applied silently.

Copy