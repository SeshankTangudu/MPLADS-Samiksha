# MPLADS Samiksha — Analytical Risk Scoring Methodology & Transparency Framework

**Version**: 2.0.0  
**Model**: Model A (Pure Linear Additive Formulation)  
**Status**: APPROVED & PUBLISHED  

---

## 1. Core Philosophy & Responsible AI Principle

The MPLADS Samiksha risk intelligence engine is designed strictly as an **analytical review support system** to help oversight bodies prioritize manual administrative audits.

> **Mandatory Principle**:  
> *"Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."*

A high risk score or statistical deviation does **NOT** indicate fraud, corruption, embezzlement, or criminal guilt. It highlights statistical anomalies, multi-year disbursement stagnation, or official documentation remarks warranting administrative inspection.

---

## 2. Composite Score Mathematical Formulation

The risk score follows a theoretical linear additive formulation designed for a 100-point scale, but the active production implementation operates under a lower ceiling due to intentionally inactive components.

### 2.1 Theoretical Model A Framework
$$\text{Composite Score} = \min\left(100.0, \text{round}\left(S_{\text{FIN}} + S_{\text{TIM}} + S_{\text{DQ}} + S_{\text{GEO}} + S_{\text{DUP}}, 1\right)\right)$$

- Financial ($S_{\text{FIN}}$): 35 points
- Timeline ($S_{\text{TIM}}$): 25 points
- Data Quality ($S_{\text{DQ}}$): 20 points
- Geographic ($S_{\text{GEO}}$): 10 points
- Duplicate ($S_{\text{DUP}}$): 10 points
- **Theoretical Maximum**: 100.0 points

### 2.2 Current Production Implementation
- **Financial**: Active, max 35 points
- **Timeline**: Active, max 25 points
- **Data Quality**: Active, max 20 points
- **Geographic**: Intentionally inactive, contributes 0 points
- **Duplicate**: Intentionally inactive, contributes 0 points
- **Current Implemented Ceiling**: 72.0 points (max combined verifiable components)

### 2.3 Current Production Observation
- **Evaluated Set**: 1,675 authentic allocations
- **Observed Maximum**: 63.0 points
- **Critical Records**: 0

### 2.4 Implementation Limitations & Risk Tiers
**Critical-Tier Limitation**:
The Critical tier is defined as 75.0–100.0 points in the theoretical framework. Under the current production implementation, the Critical tier is **mathematically unreachable** because the inactive components contribute 0 points. This is strictly a limitation of the current active scoring implementation, and does NOT serve as evidence that the dataset contains no severe cases.

**Geographic Limitation**:
The originally specified categorical district-concentration formula was reviewed but remains intentionally inactive. Its baseline behavior would assign approximately 5 points to an average district allocation, artificially inflating ordinary risk scores and violating the clean-baseline principle.

**Duplicate Limitation**:
Verified duplicate evidence is completely absent from the authentic, deduplicated production dataset. While unverified duplicate candidate intelligence may exist separately, these unverified candidates must NOT be converted into a 10-point production risk score.

---

## 3. Sub-Score Dimensions & Trigger Rules

### 3.1 Financial Deviation Score ($S_{\text{FIN}}$: 0 to 35 Points)
- **Cohort Grouping**: Allocations are evaluated against peers in the same **(Civic Category, State)** cohort.
- **Dual Anomaly Trigger**: Emits a `FINANCIAL` warning flag strictly when:
  $$\text{Reported Expenditure} > \text{Cohort P90} \quad \text{AND} \quad \frac{\text{Reported Expenditure}}{\text{Cohort P50}} \ge 1.30$$
- **Score Calculation**:
  $$S_{\text{FIN}} = \begin{cases} \min\left(35, \max\left(0, \frac{\text{expenditure} - \text{Cohort P50}}{\text{Cohort P90} - \text{Cohort P50}} \times 35\right)\right) & \text{if } P90 > P50 \\ 0.0 & \text{otherwise} \end{cases}$$
- **Zero-Spread Protection**: If $P90 == P50$, $S_{\text{FIN}} = 0.0$ to prevent division-by-zero errors.

### 3.2 Timeline Stagnation Score ($S_{\text{TIM}}$: 0 to 25 Points)
- Identifies multi-year administrative retention without fund deployment:
  * Active allocation (`In Progress` or `Allocated`) with zero expenditure: **25.0 points**.
  * Historical active allocation from 16th Lok Sabha (2014–2019): **18.0 points**.
  * Historical active allocation from 15th Lok Sabha (2009–2014): **22.0 points**.
  * Completed allocations: **0.0 points**.

### 3.3 Data Quality & Compliance Review Score ($S_{\text{DQ}}$: 0 to 20 Points)
- Evaluates official administrative delay remarks (`ReasonsforNotRel`):
  * "Audit Certificate Pending" or "Utilisation Certificate Pending": **+5.0 points**.
  * "Eligible MPR not Received": **+5.0 points**.
  * Zero Sanctioned Budget (`sanctioned_cost == 0`): **+5.0 points**.
  * Negative Accounting Balance (`unspent_balance < 0`): **+5.0 points**.
- Score is clamped at **20.0 points maximum**.

### 3.4 Geographic Density Score ($S_{\text{GEO}}$: 0 to 10 Points)
- Measures spatial concentration across administrative district reference centroids:
  $$S_{\text{GEO}} = \min\left(10.0, \frac{\text{District Allocations}}{\text{State Average District Allocations}} \times 5.0\right)$$

### 3.5 Duplicate Allocation Score ($S_{\text{DUP}}$: 0 to 10 Points)
- Detects exact or near-duplicate allocation rows. On the verified, deduplicated dataset `projects_clean.csv`, $S_{\text{DUP}} = 0$ for all records.

---

## 4. Cohort Quantile Hierarchy & Fallback Rules

To eliminate sample-size noise and handle small states reliably:
1. **Primary Cohort ($N \ge 10$)**: Localized `(Category, State)` baseline. Covers **94.6%** of allocations across 36 cohorts.
2. **Category Fallback ($N < 10$)**: National `Category` baseline. Applied to **5.4%** of allocations across 38 small cohorts.
3. **Global Baseline Fallback**: Applied if category information is missing.

---

## 5. Risk Tier Classification

- 🟢 **Low Risk (0.0 – 24.9)**: Normal statistical cohort parameters. Expenditure within expected median band.
- 🟡 **Medium Risk (25.0 – 49.9)**: Moderate single-dimension deviation, multi-year active retention, or audit certificate documentation note.
- 🟠 **High Risk (50.0 – 74.9)**: Compounding multi-signal outlier or significant financial deviation exceeding localized P90 threshold with ratio $\ge 1.30$.
- 🔴 **Critical Risk (75.0 – 100.0)**: Severe multi-dimensional compounding anomaly across all criteria.
