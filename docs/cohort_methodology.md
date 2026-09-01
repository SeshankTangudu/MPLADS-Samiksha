# Statistical Cohort Baseline & Anomaly Methodology (T10)

- **Version**: 2.0.0
- **Effective Date**: 2026-09-01
- **Author**: AI/ML Engineer
- **Data Source**: `data/processed/mplads.db` (1,675 authentic records)
- **Output Artifact**: `ml/cohort_baselines.json`

---

## 1. Cohort Definition & Objective

To ensure fair, context-aware anomaly detection without rigid national hard-coding, statistical baselines are computed within **peer cohorts**:

1. **Primary Cohort Tier**: `(Civic Category, State)`
   - Groups allocation records sharing the same broad sector ("Infrastructure & Public Amenities", "Community Development", "Rural & Urban Development") within the same State/UT.
   - Accounts for regional cost differences and state administrative structures.

2. **Secondary Fallback Tier**: `Category (National)`
   - Applied when a localized state cohort has fewer than `MIN_COHORT_SIZE = 10` records.
   - Prevents small sample skew while preserving sectoral characteristics.

3. **Tertiary Global Baseline**: All 1,675 Allocations
   - Used for macro KPI benchmarking.

---

## 2. Statistical Baseline Metrics & Formulas

For each cohort $C$, the following non-parametric robust statistics are calculated:

1. **Sample Size ($N$)**: Total allocations in cohort.
2. **Median Expenditure ($\text{Med}_{\text{exp}}$)**: 50th percentile of reported expenditure (₹ Cr).
3. **P90 Expenditure ($P90_{\text{exp}}$)**: 90th percentile expenditure threshold (₹ Cr).
4. **Median Sanctioned Cost ($\text{Med}_{\text{sanct}}$)**: 50th percentile sanctioned budget (₹ Cr).
5. **P90 Sanctioned Cost ($P90_{\text{sanct}}$)**: 90th percentile budget threshold (₹ Cr).
6. **Financial Utilization Proxy Baselines**:
   $$\text{Financial Utilization} = \frac{\text{expenditure}}{\text{sanctioned\_cost}} \times 100$$
   - $\text{Med}_{\text{util}}$ (50th percentile)
   - $P10_{\text{util}}$ (10th percentile: lower bound for stagnation flags)
   - $P90_{\text{util}}$ (90th percentile)
7. **Median & P90 Unspent Balance**: Thresholds for unutilized fund accumulation.

---

## 3. Verified Empirical Baseline Snapshot

From the 1,675 database allocation records:
- **Total Category+State Cohorts**: 74
- **Global Median Expenditure**: ₹17.92 Cr
- **Global P90 Expenditure**: ₹22.83 Cr
- **Global Median Financial Utilization**: 93.20%
- **Global P10 Financial Utilization**: 21.05%

---

## 4. Responsible AI & Explainability Principles

1. **Non-Accusatory Classification**: Statistical deviations are flagged as **"Analytical Review Items"** or **"Anomalies"**, strictly NOT labeled as fraud, corruption, or proven wrongdoing.
2. **Deterministic & Auditable**: All scores are derived from pure mathematical formulas over peer baselines with zero opaque black-box parameters.
3. **Standing Disclaimer**: Every view displays the mandated disclaimer:
   > *"Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."*
