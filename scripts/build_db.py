"""Database Builder and Initial Loader Script (T06).

Implements the frozen database schema from docs/contracts/db_contract.md,
creates all tables and indexes, and populates `mps`, `districts`, and `projects`
from data/processed/projects_clean.csv and data/reference/centroids.csv.
"""

import os
import sys
import pandas as pd
from sqlalchemy import create_engine, select, func, text
from sqlalchemy.orm import sessionmaker

# Set up paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.app.models import Base, MP, District, Project, RiskScore, RiskFlag, AnalyticsCache

DB_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "mplads.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
PROJECTS_CSV = os.path.join(PROJECT_ROOT, "data", "processed", "projects_clean.csv")
CENTROIDS_CSV = os.path.join(PROJECT_ROOT, "data", "reference", "centroids.csv")


def build_database():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    # Remove existing database file if present to guarantee idempotent clean build
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed existing database at {DB_PATH}")

    engine = create_engine(DATABASE_URL, echo=False)

    # Enforce SQLite foreign key constraints
    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys = ON;"))

    print("Creating database schema tables and indexes...")
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    print(f"Loading data from {PROJECTS_CSV} and {CENTROIDS_CSV}...")
    df_projects = pd.read_csv(PROJECTS_CSV)
    df_centroids = pd.read_csv(CENTROIDS_CSV)

    # 1. Populate Districts
    district_map = {}
    print("Populating districts table...")
    for _, row in df_centroids.iterrows():
        district = District(
            state=str(row["state"]).strip(),
            district_name=str(row["district"]).strip(),
            clean_district_name=str(row["clean_district_name"]).strip(),
            latitude=float(row["latitude"]),
            longitude=float(row["longitude"]),
            total_allocations=0,
            flagged_allocations=0
        )
        session.add(district)
        session.flush()
        # Key by (state, district)
        district_map[(district.state.lower(), district.district_name.lower())] = district.id

    print(f"Inserted {len(district_map)} districts.")

    # 2. Populate MPs (Distinct parliamentary profiles)
    mp_map = {}
    print("Populating mps table...")
    mp_groups = df_projects.groupby(["mp_name", "house", "state", "constituency"], as_index=False).agg({
        "source_record_id": "count",
        "sanctioned_cost": "sum",
        "expenditure": "sum"
    })

    for _, row in mp_groups.iterrows():
        mp = MP(
            name=str(row["mp_name"]).strip(),
            house=str(row["house"]).strip(),
            state=str(row["state"]).strip(),
            constituency=str(row["constituency"]).strip(),
            total_allocations=int(row["source_record_id"]),
            total_sanctioned=round(float(row["sanctioned_cost"]), 2),
            total_expenditure=round(float(row["expenditure"]), 2)
        )
        session.add(mp)
        session.flush()
        mp_map[(mp.name.lower(), mp.constituency.lower())] = mp.id

    print(f"Inserted {len(mp_map)} MP profiles.")

    # 3. Populate Projects (Constituency Allocations)
    print("Populating projects table...")
    district_allocation_counts = {}

    for _, row in df_projects.iterrows():
        mp_name_key = str(row["mp_name"]).strip().lower()
        constituency_key = str(row["constituency"]).strip().lower() if pd.notnull(row["constituency"]) else ""
        mp_id = mp_map.get((mp_name_key, constituency_key))

        if not mp_id:
            # Fallback by name only if exact tuple not found
            matching_mps = [mid for (mname, _), mid in mp_map.items() if mname == mp_name_key]
            mp_id = matching_mps[0] if matching_mps else 1

        state_key = str(row["state"]).strip().lower()
        district_key = str(row["district"]).strip().lower()
        district_id = district_map.get((state_key, district_key))

        if not district_id:
            # Fallback by district name
            matching_districts = [did for (_, dname), did in district_map.items() if dname == district_key]
            district_id = matching_districts[0] if matching_districts else 1

        district_allocation_counts[district_id] = district_allocation_counts.get(district_id, 0) + 1

        project = Project(
            source_record_id=str(row["source_record_id"]).strip(),
            source_dataset=str(row["source_dataset"]).strip(),
            mp_id=mp_id,
            district_id=district_id,
            house=str(row["house"]).strip(),
            lok_sabha_term=int(row["lok_sabha_term"]),
            mp_name=str(row["mp_name"]).strip(),
            state=str(row["state"]).strip(),
            district=str(row["district"]).strip(),
            constituency=str(row["constituency"]).strip() if pd.notnull(row["constituency"]) else "",
            category=str(row["category"]).strip(),
            description=str(row["description"]).strip(),
            sanction_date=str(row["sanction_date"]).strip(),
            completion_date=str(row["completion_date"]).strip() if pd.notnull(row["completion_date"]) else "",
            sanctioned_cost=float(row["sanctioned_cost"]),
            expenditure=float(row["expenditure"]),
            entitlement=float(row["entitlement"]),
            released_amount=float(row["released_amount"]),
            unspent_balance=float(row["unspent_balance"]),
            status=str(row["status"]).strip(),
            pending_reason=str(row["pending_reason"]).strip() if pd.notnull(row["pending_reason"]) else "",
            has_reasons_flag=int(row["has_reasons_flag"])
        )
        session.add(project)

    session.flush()

    # Update District allocation counts
    for district_id, count in district_allocation_counts.items():
        session.query(District).filter(District.id == district_id).update({"total_allocations": count})

    session.commit()
    print(f"Committed {len(df_projects)} allocation records to projects table.")

    # Integrity verification
    count_projects = session.query(func.count(Project.id)).scalar()
    count_mps = session.query(func.count(MP.id)).scalar()
    count_districts = session.query(func.count(District.id)).scalar()

    print("\n--- Integrity Verification Summary ---")
    print(f"Projects (Allocations) in DB: {count_projects} (Expected: {len(df_projects)})")
    print(f"MPs in DB: {count_mps}")
    print(f"Districts in DB: {count_districts}")
    assert count_projects == len(df_projects), f"Project row count mismatch: {count_projects} != {len(df_projects)}"

    session.close()
    print(f"\nDatabase built successfully at {DB_PATH}")


if __name__ == "__main__":
    build_database()
