"""MPLADS Data Acquisition Script (T03).

Downloads official MPLADS snapshots and records provenance details.
Preserves raw files untouched in data/raw/.
"""

import hashlib
import io
import json
import os
import sys
from datetime import datetime, timezone
import httpx
import pandas as pd

RAW_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw"))
PROVENANCE_FILE = os.path.join(RAW_DIR, "PROVENANCE.md")

DATASETS = [
    {
        "id": "17th_lok_sabha_mplads_spending",
        "filename": "mplads_17th_lok_sabha_spending.csv",
        "url": "https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/e4524ed7-6c9b-41a5-ad0a-003358fdabca/download/4d2bc892-cd12-4f17-befa-aa7efb6e210b.csv",
        "description": "MPLADS Spending Details for 17th Lok Sabha (2019-2024)",
        "source": "OpenCity / MoSPI MPLADS Portal"
    },
    {
        "id": "16th_lok_sabha_mplads_spending",
        "filename": "mplads_16th_lok_sabha_spending.csv",
        "url": "https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/57baaa96-04ca-4328-86bc-17b455af1024/download/d6a40c40-f0bb-44d7-b697-fd4d74ffefd3.csv",
        "description": "MPLADS Spending Details for 16th Lok Sabha (2014-2019)",
        "source": "OpenCity / MoSPI MPLADS Portal"
    },
    {
        "id": "15th_lok_sabha_mplads_spending",
        "filename": "mplads_15th_lok_sabha_spending.csv",
        "url": "https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/0b894524-3708-41ec-896e-7a5e8d15c2f3/download/cfa8c46b-1bb0-4d8a-b149-2d1d53ad0826.csv",
        "description": "MPLADS Spending Details for 15th Lok Sabha (2009-2014)",
        "source": "OpenCity / MoSPI MPLADS Portal"
    },
    {
        "id": "rajya_sabha_mplads_spending_2022",
        "filename": "mplads_rajya_sabha_spending_2022.csv",
        "url": "https://data.opencity.in/dataset/67be7a7d-d92c-42fa-aa2a-4b6cfdfe84ee/resource/628edb2f-536f-4b2d-a064-886025486b4b/download/b0b31326-0ede-41b3-97ba-6c77f9cb5419.csv",
        "description": "MPLADS Spending for Rajya Sabha Sitting Members (2022)",
        "source": "OpenCity / MoSPI MPLADS Portal"
    }
]

def sha256_file(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def download_all():
    os.makedirs(RAW_DIR, exist_ok=True)
    records = []

    print(f"Starting MPLADS raw data acquisition into: {RAW_DIR}")
    client = httpx.Client(timeout=60.0, follow_redirects=True)

    for item in DATASETS:
        dest = os.path.join(RAW_DIR, item["filename"])
        print(f"Downloading {item['id']} from {item['url']} ...")
        resp = client.get(item["url"])
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to download {item['id']}: HTTP {resp.status_code}")

        content_bytes = resp.content
        with open(dest, "wb") as f:
            f.write(content_bytes)

        file_hash = sha256_file(dest)
        size_bytes = len(content_bytes)

        # Inspect basic shape
        try:
            df = pd.read_csv(dest)
            row_count = len(df)
            col_count = len(df.columns)
            columns = df.columns.tolist()
        except Exception:
            try:
                df = pd.read_csv(dest, skiprows=5)
                row_count = len(df)
                col_count = len(df.columns)
                columns = df.columns.tolist()
            except Exception:
                row_count = "N/A"
                col_count = "N/A"
                columns = []

        record = {
            "id": item["id"],
            "filename": item["filename"],
            "url": item["url"],
            "description": item["description"],
            "source": item["source"],
            "download_timestamp": datetime.now(timezone.utc).isoformat(),
            "sha256": file_hash,
            "size_bytes": size_bytes,
            "row_count": row_count,
            "col_count": col_count,
            "columns": columns
        }
        records.append(record)
        print(f"  -> Saved {item['filename']} ({size_bytes:,} bytes, {row_count} rows, sha256: {file_hash[:12]}...)")

    # Generate PROVENANCE.md
    provenance_content = generate_provenance_md(records)
    with open(PROVENANCE_FILE, "w", encoding="utf-8") as f:
        f.write(provenance_content)

    print(f"\nProvenance documentation written to {PROVENANCE_FILE}")
    return records

def generate_provenance_md(records) -> str:
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    lines = [
        "# MPLADS Raw Data Provenance & Acquisition Log",
        "",
        f"- **Acquisition Date**: {now_str}",
        "- **Status**: Verified Immutable Raw Snapshots",
        "- **Source Portals**: OpenCity.in Open Data Portal / Ministry of Statistics & Programme Implementation (MoSPI) / e-SAKSHI",
        "",
        "## Downloaded Files Summary",
        "",
        "| File | Source URL | Rows | Size (bytes) | SHA256 Hash |",
        "|---|---|---|---|---|"
    ]
    for r in records:
        lines.append(f"| `{r['filename']}` | [{r['source']}]({r['url']}) | {r['row_count']} | {r['size_bytes']:,} | `{r['sha256']}` |")

    lines.extend([
        "",
        "## Dataset Schemas & Dictionaries",
        ""
    ])
    for r in records:
        lines.append(f"### `{r['filename']}`")
        lines.append(f"- **Description**: {r['description']}")
        lines.append(f"- **Columns ({r['col_count']})**:")
        for col in r["columns"]:
            lines.append(f"  - `{col}`")
        lines.append("")

    lines.extend([
        "## Integrity Statement",
        "All files listed above are raw, untouched extracts. No manual or automated alterations have been applied to files in `data/raw/`.",
        "Downstream transformations are executed via reproducible pipelines in `scripts/clean_data.py` into `data/processed/`."
    ])
    return "\n".join(lines)

if __name__ == "__main__":
    download_all()
