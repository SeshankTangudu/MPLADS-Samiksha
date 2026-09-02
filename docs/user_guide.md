# MPLADS Samiksha — User Guide & Feature Walkthrough

**Version**: 2.0.0  
**Target Audience**: Administrative Reviewers, Parliamentary Researchers, Civil Society Analysts, Citizens  

---

## 1. Overview & Dashboard Page (`/` and `/dashboard`)

The **Overview Page** serves as the macro entry point into the parliamentary fund portfolio:
- **Macro KPI Cards**: Instantly view total constituency allocations (`1,675`), total sanctioned budget (`₹6,464.21 Cr`), cumulative expenditure incurred (`₹4,772.37 Cr`), and the overall financial utilization proxy (`73.83%`).
- **Risk Distribution Chart**: View the breakdown of allocations across Low (1,166), Medium (413), High (96), and Critical (0) tiers.
- **Sector Financial Utilization**: Compare reported expenditures and budget allocations across *Infrastructure & Public Amenities*, *Community Development*, and *Rural & Urban Development*.
- **Longitudinal Term Comparison**: Inspect allocation activity across the 15th, 16th, and 17th Lok Sabha sessions.

---

## 2. Allocation Explorer (`/projects`)

The **Allocation Explorer** provides interactive search and multi-facet filtering across all 1,675 constituency allocations:
- **Search Bar**: Type any Member of Parliament name, constituency, district, or record identifier (e.g. `LS17_0001`). Search input is automatically debounced for smooth interaction.
- **Multi-Facet Dropdowns**: Filter concurrently by Civic Category, Lok Sabha Term (15th, 16th, 17th), and Financial Status (*In Progress*, *Completed*, *Allocated*).
- **Sorting Controls**: Sort allocations by Reported Expenditure, Sanctioned Works Budget, Unspent Balance, or Sanction Date (Ascending or Descending).
- **Financial Utilization Bar**: View the utilization percentage with color-coded progress bars (Emerald ≥ 90%, Blue ≥ 50%, Amber < 50%).
- **Deep Investigation Link**: Click the external link icon on any row to open the complete score breakdown.

---

## 3. Anomaly Intelligence Center (`/anomalies`)

The **Anomaly Intelligence Center** is the prioritized review queue for oversight officials:
- **Priority Ranking**: Displays allocations sorted strictly by analytical risk score descending.
- **Risk Tier Chips**: Quickly isolate High Risk (50–74) or Medium Risk (25–49) allocations.
- **Signal Type Filter**: Filter specifically for *Financial Deviations* (P90 cohort outliers), *Timeline Stagnations* (multi-year sessions without expenditure), or *Compliance Review Notes* (pending audit certificates or missing MPRs).
- **Export Risk CSV**: Download a complete, spreadsheet-ready CSV summary (`mplads_risk_summary.csv`) containing all allocation records, scores, risk tiers, and primary reason signals.

---

## 4. Deep Investigation Page (`/projects/:id`)

The **Deep Investigation Page** provides exhaustive explainability for a single allocation:
- **Parliamentary Entity Profile**: View MP name, house, constituency, state, district, and official administrative notes (`pending_reason`).
- **Financial Deployment Summary**: View approved budget, reported expenditure, MoSPI releases, unspent balance, and the financial utilization proxy meter.
- **Composite Risk Score Gauge**: View the total risk score (out of 100) and 4-dimension breakdown:
  * Financial Deviation (out of 35)
  * Timeline Stagnation (out of 25)
  * Data Quality & Compliance (out of 20)
  * Geographic Spatial Density (out of 10)
- **Explainable ReasonCards**: Inspect every triggered flag showing *Observed Value*, *Peer Cohort Baseline*, *Trigger Threshold*, and *Detailed Non-Accusatory Explanation*.
- **Peer Cohort Comparables Table**: Compare the allocation against 3 peer records in the same civic sector with similar sanctioned budgets.

---

## 5. District GIS Map (`/map`)

The **District GIS Map** renders interactive geospatial intelligence across administrative districts:
- **Leaflet OpenStreetMap Layer**: Plots verified district reference centroids (100% matched across 1,015 districts in India).
- **Volume-Proportional Markers**: Circle radius automatically scales with total allocation volume.
- **Color-Coded Risk Tiers**: Red indicates districts with high risk concentration (≥ 2 flagged allocations), Amber indicates medium concentration (1 flagged allocation), and Blue indicates normal parameters.
- **Centroid Popups**: Click any marker to view District Name, State, Total Allocations, Reported Expenditure (₹ Cr), Flagged Count, and Dominant Risk Tier.
- **State & Risk Filters**: Zoom and filter directly to specific States/UTs.

---

## 6. Sector Analytics (`/analytics`)

The **Sector Analytics Page** provides high-level macro comparisons:
- **Category Financial Comparison**: Grouped Recharts bar charts comparing Sanctioned Works Budget vs Cumulative Reported Spent.
- **Review Signal Density**: Bar charts illustrating the percentage of allocations flagged for review within each civic sector.
- **Top 20 District Rankings**: Ranked table of administrative districts by total allocation volume and risk concentration.

---

## 7. Methodology & Transparency (`/methodology`)

The **Methodology Framework** provides complete scientific disclosures:
- Complete mathematical formulas and linear additive weights (35 + 25 + 20 + 10 + 10 = 100).
- Statistical cohort quantile methodology and hierarchical fallback rules.
- Definitions of the 4 risk tiers (Low, Medium, High, Critical).
- Data boundaries and Responsible AI disclosures.
