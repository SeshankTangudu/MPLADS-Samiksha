# Checkpoint T03 — Download MPLADS Snapshot

- **Task ID**: T03
- **Agent**: Data Engineer
- **Timestamp**: 2026-09-01T21:55:00+05:30
- **Status**: PASSED

## Change Review Summary (§B.22 & Change Gate)

### Created / Modified Files:
1. `scripts/download_data.py` — Automated data acquisition and SHA256 provenance calculation script (Script / Pipeline).
2. `data/raw/PROVENANCE.md` — Complete audit trail recording source URLs, timestamps, SHA256 file hashes, row counts, and schema dictionaries for all raw data snapshots (Documentation / Data Audit).
3. `data/raw/mplads_17th_lok_sabha_spending.csv` — Official MPLADS spending extract for 17th Lok Sabha (557 rows, 48,895 bytes, SHA256 `a14011eae26d...`) (Raw Data, git-ignored).
4. `data/raw/mplads_16th_lok_sabha_spending.csv` — Official MPLADS spending extract for 16th Lok Sabha (572 rows, 83,829 bytes, SHA256 `75af7fc192aa...`) (Raw Data, git-ignored).
5. `data/raw/mplads_15th_lok_sabha_spending.csv` — Official MPLADS spending extract for 15th Lok Sabha (552 rows, 77,719 bytes, SHA256 `45ee72a31ec9...`) (Raw Data, git-ignored).
6. `data/raw/mplads_rajya_sabha_spending_2022.csv` — Official MPLADS spending extract for Rajya Sabha sitting members (236 rows, 36,964 bytes, SHA256 `85ce98386a2e...`) (Raw Data, git-ignored).

### Verification
- `scripts/download_data.py` executed successfully with code 0.
- All raw datasets downloaded from official OpenCity/MoSPI releases into `data/raw/`.
- `data/raw/PROVENANCE.md` verified with matching SHA256 checksums and exact column lists.
- Confirmed zero synthetic, fabricated, or mock rows.

### Downstream Unlocked Tasks
- **T04** (Clean + validate + data-quality report) — `READY`
- **T05** (Centroid reference table) — `READY`
- **T07** (FastAPI skeleton + CORS + error handlers) — `READY`
- **T14** (React foundation: router, theme, API client, states) — `READY`
