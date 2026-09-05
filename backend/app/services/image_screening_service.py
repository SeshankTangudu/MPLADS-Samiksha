"""Damage / Condition Image Screening Aid Service (Phase D).

Provides deterministic technical image quality and basic visual screening metrics:
- Resolution, aspect, megapixels
- Average luminance / brightness
- Grayscale contrast / standard deviation
- Sharpness via Laplacian variance
- Edge & visual texture density ratio

IMPORTANT METHODOLOGICAL PRINCIPLE:
This is an automated screening aid to help human reviewers prioritize visual inspection.
It does NOT perform semantic damage classification (e.g., cracks, potholes, structural defects),
nor does it output a 'fraud probability' or claim computer vision proof of wrongdoing.
"""

import io
import os
import math
from typing import Dict, Any, Optional, List, Union
import numpy as np
from PIL import Image

# Technical image-quality screening thresholds (Configurable technical bounds)
MIN_SCREENING_WIDTH = 400
MIN_SCREENING_HEIGHT = 400
MIN_SCREENING_MEGAPIXELS = 0.15

LOW_BRIGHTNESS_THRESHOLD = 40.0      # Below this, image is underexposed/dark
HIGH_BRIGHTNESS_THRESHOLD = 220.0    # Above this, image is overexposed/washed out
LOW_CONTRAST_THRESHOLD = 20.0        # Below this, low contrast limits inspection
BLUR_THRESHOLD = 100.0               # Below this, Laplacian variance indicates soft focus/blur

HIGH_EDGE_TEXTURE_THRESHOLD = 0.12   # Edge density ratio triggering visual inspection recommendation

METHODOLOGY_DISCLAIMER = (
    "Damage / Condition Image Screening evaluates technical and basic visual characteristics of submitted images "
    "to support human review. It is not a validated damage-detection or fraud-detection system. "
    "Image characteristics may be affected by lighting, camera quality, compression, cropping, editing, or other factors. "
    "Automated image screening does not establish physical damage, construction quality, causation, or wrongdoing."
)


def _safe_laplacian_variance(gray: np.ndarray) -> float:
    """Computes discrete 2D Laplacian variance on a 2D float numpy array.
    
    Uses standard 4-neighbor discrete Laplacian stencil:
    [ 0,  1,  0]
    [ 1, -4,  1]
    [ 0,  1,  0]
    """
    h, w = gray.shape
    if h < 3 or w < 3:
        return 0.0

    laplacian = (
        gray[1:-1, :-2]
        + gray[1:-1, 2:]
        + gray[:-2, 1:-1]
        + gray[2:, 1:-1]
        - 4.0 * gray[1:-1, 1:-1]
    )
    return float(np.var(laplacian))


def _compute_edge_density(gray: np.ndarray, gradient_threshold: float = 25.0) -> float:
    """Computes ratio of pixels exceeding gradient magnitude threshold.
    
    Measures high-frequency visual texture and structural edges.
    """
    h, w = gray.shape
    if h < 2 or w < 2:
        return 0.0

    dx = np.abs(gray[:, 1:] - gray[:, :-1])
    dy = np.abs(gray[1:, :] - gray[:-1, :])
    
    # Overlap inner regions
    grad = (dx[1:, :] + dy[:, 1:]) / 2.0
    edge_pixels = np.sum(grad > gradient_threshold)
    total_pixels = grad.size
    
    return float(edge_pixels / total_pixels) if total_pixels > 0 else 0.0


def analyze_image_screening(
    image_input: Union[bytes, str, io.BytesIO],
    filename_context: Optional[str] = None,
) -> Dict[str, Any]:
    """Analyzes an image for technical quality metrics and basic visual screening characteristics.
    
    Parameters:
    - image_input: Raw image bytes, filesystem path, or BytesIO buffer.
    - filename_context: Optional filename for logging/diagnostics without leaking full server paths.
    
    Returns:
    - Structured dictionary conforming to ImageScreeningResponseSchema.
    """
    # Default unavailable response
    unavailable_response = {
        "status": "IMAGE_ANALYSIS_UNAVAILABLE",
        "signal_badge": "Analysis Unavailable",
        "image_width": None,
        "image_height": None,
        "megapixels": None,
        "brightness": None,
        "contrast": None,
        "sharpness": None,
        "edge_density": None,
        "quality_notes": ["Image file could not be accessed, read, or decoded safely."],
        "visual_review_notes": [],
        "interpretation": "Image screening is unavailable for this record because the image file is missing, corrupted, or in an unsupported format.",
        "disclaimer": METHODOLOGY_DISCLAIMER,
    }

    if image_input is None:
        return unavailable_response

    # If filepath string provided, verify existence
    if isinstance(image_input, str):
        if not os.path.exists(image_input) or not os.path.isfile(image_input):
            return unavailable_response
        try:
            with open(image_input, "rb") as f:
                raw_bytes = f.read()
        except Exception:
            return unavailable_response
    elif isinstance(image_input, io.BytesIO):
        raw_bytes = image_input.getvalue()
    elif isinstance(image_input, (bytes, bytearray)):
        raw_bytes = bytes(image_input)
    else:
        return unavailable_response

    if not raw_bytes or len(raw_bytes) < 32:
        return unavailable_response

    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            # Verify format support
            fmt = (img.format or "").upper()
            if fmt not in ["JPEG", "JPG", "PNG", "WEBP"]:
                return {
                    **unavailable_response,
                    "quality_notes": [f"Unsupported image format '{fmt}'. Supported formats: JPEG, PNG, WebP."],
                    "interpretation": f"Image format '{fmt}' is not supported for automated quality screening.",
                }

            w, h = img.size
            if w <= 0 or h <= 0:
                return unavailable_response

            megapixels = round((w * h) / 1_000_000.0, 2)

            # Convert to Grayscale for numerical screening metrics
            gray_img = img.convert("L")
            gray = np.array(gray_img, dtype=np.float64)

            # 1. Brightness: Mean luminance (0 - 255)
            brightness = round(float(np.mean(gray)), 1)

            # 2. Contrast: Standard deviation of luminance (0 - 128)
            contrast = round(float(np.std(gray)), 1)

            # 3. Sharpness: Laplacian variance
            sharpness = round(_safe_laplacian_variance(gray), 1)

            # 4. Edge / Texture density: Ratio of edge pixels
            edge_density = round(_compute_edge_density(gray, gradient_threshold=25.0), 3)

    except Exception:
        return unavailable_response

    # Evaluate Technical Quality Limitations
    quality_notes: List[str] = []
    is_low_res = (w < MIN_SCREENING_WIDTH) or (h < MIN_SCREENING_HEIGHT) or (megapixels < MIN_SCREENING_MEGAPIXELS)
    if is_low_res:
        quality_notes.append(f"Low resolution ({w}×{h} px, {megapixels} MP) limits fine detail inspection.")

    is_dark = brightness < LOW_BRIGHTNESS_THRESHOLD
    if is_dark:
        quality_notes.append(f"Low average luminance ({brightness}/255) indicates underexposed lighting.")

    is_bright = brightness > HIGH_BRIGHTNESS_THRESHOLD
    if is_bright:
        quality_notes.append(f"High average luminance ({brightness}/255) indicates overexposed lighting.")

    is_low_contrast = contrast < LOW_CONTRAST_THRESHOLD
    if is_low_contrast:
        quality_notes.append(f"Low contrast ({contrast}) limits differentiation of visual details.")

    is_blurred = sharpness < BLUR_THRESHOLD
    if is_blurred:
        quality_notes.append(f"Low sharpness score ({sharpness}) indicates soft focus or blur.")

    has_quality_limitation = bool(is_low_res or is_dark or is_bright or is_low_contrast or is_blurred)

    # Evaluate Visual Review Characteristics
    visual_review_notes: List[str] = []
    has_high_texture = edge_density >= HIGH_EDGE_TEXTURE_THRESHOLD

    if has_high_texture:
        visual_review_notes.append(
            f"Prominent visual texture / edge density ({edge_density * 100:.1f}%) observed; "
            f"closer visual inspection recommended to review site condition."
        )

    # Determine Review Status State
    if has_quality_limitation:
        status = "IMAGE_QUALITY_LIMITED"
        signal_badge = "Quality Limited"
        interpretation = (
            "Image technical quality is limited by resolution, lighting, contrast, or blur, "
            "which may constrain detailed visual review. On-site verification or higher-quality photos may be required."
        )
    elif has_high_texture:
        status = "IMAGE_REVIEW_RECOMMENDED"
        signal_badge = "Review Recommended"
        interpretation = (
            "Technical image quality is adequate and visual texture/edge characteristics warrant closer inspection "
            "by a human reviewer. This screening does not establish or confirm physical damage."
        )
    else:
        status = "NO_VISUAL_REVIEW_SIGNAL"
        signal_badge = "Usable - No Signal"
        interpretation = (
            "Technical image quality is adequate for human review. No prominent visual texture anomalies triggered "
            "prioritized inspection."
        )

    return {
        "status": status,
        "signal_badge": signal_badge,
        "image_width": int(w),
        "image_height": int(h),
        "megapixels": float(megapixels),
        "brightness": float(brightness),
        "contrast": float(contrast),
        "sharpness": float(sharpness),
        "edge_density": float(edge_density),
        "quality_notes": quality_notes,
        "visual_review_notes": visual_review_notes,
        "interpretation": interpretation,
        "disclaimer": METHODOLOGY_DISCLAIMER,
    }
