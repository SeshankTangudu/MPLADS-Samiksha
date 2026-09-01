"""Automated verification tests for T05 District Centroid Reference."""

import os
import pandas as pd
import pytest

CENTROIDS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "reference", "centroids.csv")
PROJECTS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "projects_clean.csv")

def test_centroids_file_exists():
    assert os.path.exists(CENTROIDS_FILE), "centroids.csv must exist in data/reference"

def test_centroids_schema_and_bounds():
    df = pd.read_csv(CENTROIDS_FILE)
    assert "district" in df.columns
    assert "state" in df.columns
    assert "latitude" in df.columns
    assert "longitude" in df.columns

    assert (df["latitude"] >= 6.0).all() and (df["latitude"] <= 38.0).all(), "Latitudes must be within India bounds"
    assert (df["longitude"] >= 68.0).all() and (df["longitude"] <= 98.0).all(), "Longitudes must be within India bounds"

def test_match_rate_above_90_pct():
    df_proj = pd.read_csv(PROJECTS_FILE)
    df_cent = pd.read_csv(CENTROIDS_FILE)

    proj_districts = set(df_proj["district"].unique())
    cent_districts = set(df_cent["district"].unique())

    matched = proj_districts.intersection(cent_districts)
    match_rate = len(matched) / len(proj_districts)
    assert match_rate >= 0.90, f"Centroid match rate {match_rate*100:.1f}% is below 90% threshold"
