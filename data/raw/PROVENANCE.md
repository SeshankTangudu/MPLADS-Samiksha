# MPLADS Raw Data Provenance & Acquisition Log

- **Acquisition Date**: 2026-09-01 16:25:04 UTC
- **Status**: Verified Immutable Raw Snapshots
- **Source Portals**: OpenCity.in Open Data Portal / Ministry of Statistics & Programme Implementation (MoSPI) / e-SAKSHI

## Downloaded Files Summary

| File | Source URL | Rows | Size (bytes) | SHA256 Hash |
|---|---|---|---|---|
| `mplads_17th_lok_sabha_spending.csv` | [OpenCity / MoSPI MPLADS Portal](https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/e4524ed7-6c9b-41a5-ad0a-003358fdabca/download/4d2bc892-cd12-4f17-befa-aa7efb6e210b.csv) | 557 | 48,895 | `a14011eae26dc1c60d4a16ddb092af5e0735ed915368b6afe8fdae084da9bb28` |
| `mplads_16th_lok_sabha_spending.csv` | [OpenCity / MoSPI MPLADS Portal](https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/57baaa96-04ca-4328-86bc-17b455af1024/download/d6a40c40-f0bb-44d7-b697-fd4d74ffefd3.csv) | 572 | 83,829 | `75af7fc192aab5fe1a498408e6a471f77062429992d3e3d78047b57de603c8e0` |
| `mplads_15th_lok_sabha_spending.csv` | [OpenCity / MoSPI MPLADS Portal](https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/0b894524-3708-41ec-896e-7a5e8d15c2f3/download/cfa8c46b-1bb0-4d8a-b149-2d1d53ad0826.csv) | 552 | 77,719 | `45ee72a31ec90a10a21b1c11dd02f9c80c6119876af4cbc19a8ae6132a91c7f5` |
| `mplads_rajya_sabha_spending_2022.csv` | [OpenCity / MoSPI MPLADS Portal](https://data.opencity.in/dataset/67be7a7d-d92c-42fa-aa2a-4b6cfdfe84ee/resource/628edb2f-536f-4b2d-a064-886025486b4b/download/b0b31326-0ede-41b3-97ba-6c77f9cb5419.csv) | 236 | 36,964 | `85ce98386a2e797197025a8ca724a30632848ef62661b133b44a0d3cc4a836cf` |

## Dataset Schemas & Dictionaries

### `mplads_17th_lok_sabha_spending.csv`
- **Description**: MPLADS Spending Details for 17th Lok Sabha (2019-2024)
- **Columns (11)**:
  - `Sl No`
  - `MP Name`
  - `Constituency `
  - `Entitlement`
  - `FundReceivedGOI`
  - `AmountAvailable`
  - `WorksRecommCost`
  - `WSCost`
  - `ActualExpenditureIncurred`
  - `UtilizationOverRelease`
  - `UnspentBalance`

### `mplads_16th_lok_sabha_spending.csv`
- **Description**: MPLADS Spending Details for 16th Lok Sabha (2014-2019)
- **Columns (20)**:
  - `Textbox4`
  - `Unnamed: 1`
  - `Unnamed: 2`
  - `Unnamed: 3`
  - `Unnamed: 4`
  - `Unnamed: 5`
  - `Unnamed: 6`
  - `Unnamed: 7`
  - `Unnamed: 8`
  - `Unnamed: 9`
  - `Unnamed: 10`
  - `Unnamed: 11`
  - `Unnamed: 12`
  - `Unnamed: 13`
  - `Unnamed: 14`
  - `Unnamed: 15`
  - `Unnamed: 16`
  - `Unnamed: 17`
  - `Unnamed: 18`
  - `Unnamed: 19`

### `mplads_15th_lok_sabha_spending.csv`
- **Description**: MPLADS Spending Details for 15th Lok Sabha (2009-2014)
- **Columns (20)**:
  - `Textbox4`
  - `Unnamed: 1`
  - `Unnamed: 2`
  - `Unnamed: 3`
  - `Unnamed: 4`
  - `Unnamed: 5`
  - `Unnamed: 6`
  - `Unnamed: 7`
  - `Unnamed: 8`
  - `Unnamed: 9`
  - `Unnamed: 10`
  - `Unnamed: 11`
  - `Unnamed: 12`
  - `Unnamed: 13`
  - `Unnamed: 14`
  - `Unnamed: 15`
  - `Unnamed: 16`
  - `Unnamed: 17`
  - `Unnamed: 18`
  - `Unnamed: 19`

### `mplads_rajya_sabha_spending_2022.csv`
- **Description**: MPLADS Spending for Rajya Sabha Sitting Members (2022)
- **Columns (17)**:
  - `Andhra Pradesh`
  - `Unnamed: 1`
  - `2`
  - `SHRI. Ayodhya Rami Reddy Alla`
  - `Unnamed: 4`
  - `GUNTUR`
  - `2.00`
  - `2.00.1`
  - `0.00`
  - `1.14`
  - `3.86`
  - `1`
  - `2021-2022`
  - `01-02-2022`
  - `2.00.2`
  - `Unnamed: 15`
  - `Eligible MPR not Received.`

## Integrity Statement
All files listed above are raw, untouched extracts. No manual or automated alterations have been applied to files in `data/raw/`.
Downstream transformations are executed via reproducible pipelines in `scripts/clean_data.py` into `data/processed/`.