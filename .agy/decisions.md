# Architectural & Orchestration Decisions Log

## DEC-001: Master Execution Guide v2.0 as Source of Truth
- **Date**: 2026-09-01
- **Author**: PM / Orchestrator Agent
- **Decision**: Adopt `MPLADS_Samiksha_AGY_Master_Execution_Guide_v2.md` as the authoritative project blueprint and execution guide.
- **Rationale**: Establishes strict phase gates, canonical T00–T26 task IDs, data compatibility verification before contract freeze, and deterministic risk engine logic.

## DEC-002: Capability Audit Classification & Operational Boundaries
- **Date**: 2026-09-01
- **Author**: PM / Orchestrator Agent
- **Decision**: Verified and classified capabilities:
  - [CODING]: AGY-EXECUTABLE (Python 3.13, Node v24, Git available in environment)
  - [BROWSER]: AGY-EXECUTABLE (Browser agent for public inspection & search)
  - [FILE]: AGY-EXECUTABLE (Direct read/write/edit in workspace)
  - [EXEC]: AGY-EXECUTABLE (PowerShell terminal execution)
  - [LOCAL]: AGY-EXECUTABLE (Local command generation & direct run)
  - [GIT]: AGY-EXECUTABLE (Git 2.52 CLI available)
  - [PARALLEL]: AGY-EXECUTABLE (Orchestrator manages sequential/parallel branches without file contention)
  - [TEST]: AGY-EXECUTABLE (pytest & npm test execution)
  - [DEPLOY]: AGY-GENERATES-COMMAND (Localhost execution is automated; Cloud Vercel/Render requires user-provided tokens/action)
  - [BROWSER-SESSION]: USER-ACTION (External authentication requiring 2FA is user-performed)

## DEC-003: Strict Preflight & Gating Protocol
- **Date**: 2026-09-01
- **Author**: PM / Orchestrator Agent
- **Decision**: No application code will be generated until prerequisite gates are satisfied. T01 (Scaffold) and T03 (Data Download) are the only tasks unlocked after T00. DB and API contracts will not be frozen until after the real data compatibility gate (T04/T05).

## DEC-004: Data Unit of Observation & Terminology Realignment
- **Date**: 2026-09-01
- **Author**: Architect & Data Engineer Agents
- **Decision**: The unit of observation for the platform's open snapshot is explicitly defined as **"Constituency-Level Parliamentary Term Work & Fund Allocations"** (15th, 16th, 17th Lok Sabha). All documentation, API schemas, and UI components must:
  1. Distinguish between constituency allocations, itemized portal records, and physical on-site civil works.
  2. Treat `source_record_id` as a dataset index key, not a government work ID.
  3. Treat `progress percentage` strictly as a "financial utilization proxy" (`expenditure / sanctioned_cost`), never claiming physical construction completion.
  4. Use district centroids for spatial context without claiming individual project GPS pins.
  5. Frame anomaly signals as review indicators derived from reported financial and administrative compliance data.

