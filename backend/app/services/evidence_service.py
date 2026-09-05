"""Evidence Service for MPLADS Samiksha (Phase 7).

Provides:
- Safe image validation (MIME, size, structure)
- EXIF metadata extraction using Pillow
- GPS coordinate conversion (DMS to decimal degrees)
- Haversine geodesic distance calculation
- Location consistency review evaluation
- Proximity clustering for nearby citizen reports
- Allocation-level report aggregation
"""

import os
import io
import math
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
from PIL import Image, ExifTags
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models import Complaint, ComplaintEvidence, Project, District

# Allowed MIME types & extensions
ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# Proximity thresholds (configurable review parameters, not proof)
DEFAULT_NEARBY_RADIUS_KM = 25.0
DISTRICT_CENTROID_REVIEW_THRESHOLD_KM = 100.0
EXIF_VS_BROWSER_GPS_REVIEW_THRESHOLD_KM = 25.0

UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "uploads", "evidence")
)


def ensure_upload_dir() -> str:
    """Ensures media uploads directory exists."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    return UPLOAD_DIR


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS coordinates using Haversine formula."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0

    r = 6371.0  # Earth's radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)


def _dms_to_decimal(dms: Tuple, ref: str) -> Optional[float]:
    """Converts EXIF Degree/Minute/Second tuple to signed decimal degrees."""
    try:
        degrees = float(dms[0])
        minutes = float(dms[1])
        seconds = float(dms[2])
        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
        if ref in ["S", "W"]:
            decimal = -decimal
        return round(decimal, 6)
    except Exception:
        return None


def extract_image_metadata(file_bytes: bytes, original_filename: str) -> Dict[str, Any]:
    """Extracts safe image metadata and EXIF tags using Pillow.
    
    Extracts dimensions, format, camera make/model, capture timestamp, and EXIF GPS coordinates.
    """
    result = {
        "is_valid_image": False,
        "mime_type": "application/octet-stream",
        "image_width": None,
        "image_height": None,
        "captured_at": None,
        "camera_make": None,
        "camera_model": None,
        "exif_available": 0,
        "gps_from_exif": 0,
        "exif_latitude": None,
        "exif_longitude": None,
        "metadata_status": "METADATA_UNAVAILABLE",
    }

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            result["is_valid_image"] = True
            result["image_width"], result["image_height"] = img.size
            img_format = (img.format or "").upper()

            if img_format in ["JPEG", "JPG"]:
                result["mime_type"] = "image/jpeg"
            elif img_format == "PNG":
                result["mime_type"] = "image/png"
            elif img_format == "WEBP":
                result["mime_type"] = "image/webp"

            # Parse EXIF
            exif_data = img.getexif()
            if exif_data:
                result["exif_available"] = 1
                result["metadata_status"] = "METADATA_AVAILABLE"

                # Extract basic tags
                for tag_id, value in exif_data.items():
                    tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                    if tag_name == "Make" and isinstance(value, str):
                        result["camera_make"] = value.strip()[:64]
                    elif tag_name == "Model" and isinstance(value, str):
                        result["camera_model"] = value.strip()[:64]
                    elif tag_name in ["DateTimeOriginal", "DateTime"] and isinstance(value, str):
                        result["captured_at"] = value.strip()[:32]

                # Extract GPS IFD tags if present
                gps_ifd = exif_data.get_ifd(ExifTags.IFD.GPSInfo) if hasattr(exif_data, "get_ifd") else None
                if gps_ifd:
                    gps_tags = {}
                    for k, v in gps_ifd.items():
                        sub_tag = ExifTags.GPSTAGS.get(k, k)
                        gps_tags[sub_tag] = v

                    lat_dms = gps_tags.get("GPSLatitude")
                    lat_ref = gps_tags.get("GPSLatitudeRef", "N")
                    lon_dms = gps_tags.get("GPSLongitude")
                    lon_ref = gps_tags.get("GPSLongitudeRef", "E")

                    if lat_dms and lon_dms:
                        exif_lat = _dms_to_decimal(lat_dms, lat_ref)
                        exif_lon = _dms_to_decimal(lon_dms, lon_ref)
                        if exif_lat is not None and exif_lon is not None:
                            result["exif_latitude"] = exif_lat
                            result["exif_longitude"] = exif_lon
                            result["gps_from_exif"] = 1
                            result["metadata_status"] = "GPS_METADATA_AVAILABLE"

    except Exception:
        result["is_valid_image"] = False

    return result


def evaluate_location_consistency(
    browser_lat: Optional[float],
    browser_lon: Optional[float],
    district_lat: Optional[float],
    district_lon: Optional[float],
    exif_lat: Optional[float] = None,
    exif_lon: Optional[float] = None,
) -> Dict[str, Any]:
    """Evaluates location consistency review signals without modifying analytical scoring."""
    dist_km = None
    delta_km = None
    review_status = "LOCATION_DATA_UNAVAILABLE"

    has_browser_gps = browser_lat is not None and browser_lon is not None
    has_district_coords = district_lat is not None and district_lon is not None
    has_exif_gps = exif_lat is not None and exif_lon is not None

    if has_browser_gps and has_district_coords:
        dist_km = haversine_distance_km(browser_lat, browser_lon, district_lat, district_lon)
        if dist_km <= DISTRICT_CENTROID_REVIEW_THRESHOLD_KM:
            review_status = "LOCATION_CONTEXT_AVAILABLE"
        else:
            review_status = "LOCATION_REQUIRES_REVIEW"
    elif has_browser_gps:
        review_status = "LOCATION_CONTEXT_AVAILABLE"

    if has_browser_gps and has_exif_gps:
        delta_km = haversine_distance_km(browser_lat, browser_lon, exif_lat, exif_lon)
        if delta_km > EXIF_VS_BROWSER_GPS_REVIEW_THRESHOLD_KM:
            review_status = "LOCATION_REQUIRES_REVIEW"

    return {
        "distance_from_district_centroid_km": dist_km,
        "exif_vs_browser_gps_delta_km": delta_km,
        "location_review_status": review_status,
    }


def save_evidence_file(file_bytes: bytes, original_filename: str, mime_type: str, complaint_id: str) -> str:
    """Saves evidence file to media storage and returns relative storage path."""
    upload_dir = ensure_upload_dir()
    ext = ALLOWED_MIME_TYPES.get(mime_type, ".jpg")
    safe_name = f"{complaint_id.lower().replace('-', '_')}_{uuid.uuid4().hex[:12]}{ext}"
    target_path = os.path.join(upload_dir, safe_name)

    with open(target_path, "wb") as f:
        f.write(file_bytes)

    # Return relative path
    return f"evidence/{safe_name}"


def calculate_nearby_reports(
    db: Session,
    complaint_id: str,
    latitude: Optional[float],
    longitude: Optional[float],
    radius_km: float = DEFAULT_NEARBY_RADIUS_KM,
) -> int:
    """Calculates number of distinct citizen reports with GPS within radius_km."""
    if latitude is None or longitude is None:
        return 0

    all_evidence = (
        db.query(ComplaintEvidence)
        .filter(
            ComplaintEvidence.complaint_id != complaint_id,
            ComplaintEvidence.latitude.isnot(None),
            ComplaintEvidence.longitude.isnot(None),
        )
        .all()
    )

    count = 0
    for ev in all_evidence:
        d = haversine_distance_km(latitude, longitude, ev.latitude, ev.longitude)
        if d <= radius_km:
            count += 1

    return count


def get_allocation_report_summary(db: Session, source_record_id: str) -> Dict[str, Any]:
    """Aggregates citizen complaint metrics for a specific parliamentary allocation."""
    if not source_record_id:
        return {
            "total_reports": 0,
            "open_reports": 0,
            "resolved_reports": 0,
            "categories": {},
            "latest_report_date": None,
            "has_reports": False,
        }

    reports = (
        db.query(Complaint)
        .filter(Complaint.linked_allocation_id == source_record_id.strip())
        .order_by(Complaint.id.desc())
        .all()
    )

    total = len(reports)
    if total == 0:
        return {
            "total_reports": 0,
            "open_reports": 0,
            "resolved_reports": 0,
            "categories": {},
            "latest_report_date": None,
            "has_reports": False,
        }

    open_count = sum(1 for r in reports if r.status not in ["RESOLVED", "FALSE_POSITIVE_INVALID"])
    resolved_count = sum(1 for r in reports if r.status in ["RESOLVED", "FALSE_POSITIVE_INVALID"])

    cat_counts = {}
    for r in reports:
        cat_counts[r.category] = cat_counts.get(r.category, 0) + 1

    latest_date = reports[0].submitted_at if reports else None

    return {
        "total_reports": total,
        "open_reports": open_count,
        "resolved_reports": resolved_count,
        "categories": cat_counts,
        "latest_report_date": latest_date,
        "has_reports": True,
    }
