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

## DEC-005: Architect Contract Freeze (DB & API Contracts)
- **Date**: 2026-09-01
- **Author**: Architect Agent
- **Decision**: The database contract (`docs/contracts/db_contract.md`) and API contract (`docs/contracts/api_contract.md`) are formally **FROZEN** and authoritative for downstream tasks T06, T08, T09, T10–T13, and T15–T18. All schemas conform strictly to the validated 1,675 allocation records with zero synthetic/unsupported fields.

## DEC-006: Frontend Feature Pages (T19, T20, T21) & Full-Stack E2E Integration (T22) Acceptance
- **Date**: 2026-09-01
- **Author**: Architect & Lead Frontend Agent
- **Decision**: Complete implementation of District GIS Map (T19), Sector Analytics (T20), Methodology & Transparency (T21), and E2E Integration Pass (T22).
- **Terms**: Strict adherence to Model A linear additive formulation, district centroid reference mapping, financial utilization proxies, and zero-accusatory Responsible AI guardrails.
- **Status**: ACCEPTED & FROZEN.

## DEC-007: Resolution of Frontend API Client Integration Defects (/map & /methodology)
- **Date**: 2026-09-02
- **Author**: Lead Integration Agent
- **Decision**: Corrected API client method binding and import mismatches on `/map` (bound to `AnalyticsAPI.getLocations` / `/api/locations`) and `/methodology` (bound to `MethodologyAPI.getMethodology` / `/api/methodology`). Added backward-safe aliasing in `api.js`.
- **Impact**: Zero change to backend API contracts, database schemas, risk scoring methodology, or data payloads. All 66 backend pytest tests passing; frontend production build and browser validation confirmed functional.
- **Status**: VERIFIED & READY FOR USER RE-TEST.
