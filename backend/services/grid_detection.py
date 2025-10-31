import logging
import numpy as np
from PIL import Image
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

def detect_grid(image: Image.Image, min_cell_size: int = 4, max_cell_size: int = 100) -> Optional[Dict]:
    """
    Attempt to automatically detect a regular grid pattern in the image.

    Args:
        image: PIL Image object
        min_cell_size: Minimum expected cell size in pixels
        max_cell_size: Maximum expected cell size in pixels

    Returns:
        Dict with grid info or None if no grid detected:
        {
            'cell_width': int,
            'cell_height': int,
            'grid_cols': int,
            'grid_rows': int,
            'confidence': float (0-1)
        }
    """
    # Convert to grayscale for edge detection
    gray = image.convert('L')
    img_array = np.array(gray)

    width, height = image.size

    # Detect vertical lines (for columns)
    vertical_edges = detect_regular_spacing(img_array.T, min_cell_size, max_cell_size)

    # Detect horizontal lines (for rows)
    horizontal_edges = detect_regular_spacing(img_array, min_cell_size, max_cell_size)

    if vertical_edges is None or horizontal_edges is None:
        logger.info("No regular grid pattern detected")
        return None

    cell_width, v_confidence = vertical_edges
    cell_height, h_confidence = horizontal_edges

    grid_cols = width // cell_width
    grid_rows = height // cell_height

    # Overall confidence is the average of both directions
    confidence = (v_confidence + h_confidence) / 2

    result = {
        'cell_width': cell_width,
        'cell_height': cell_height,
        'grid_cols': grid_cols,
        'grid_rows': grid_rows,
        'confidence': confidence
    }

    logger.info(f"Grid detected: {grid_cols}x{grid_rows} cells of {cell_width}x{cell_height}px (confidence: {confidence:.2f})")

    return result


def detect_regular_spacing(arr: np.ndarray, min_spacing: int, max_spacing: int) -> Optional[Tuple[int, float]]:
    """
    Detect regular spacing in a 1D or 2D array by looking for repeating patterns.

    Args:
        arr: NumPy array (can be 1D profile or 2D image)
        min_spacing: Minimum expected spacing
        max_spacing: Maximum expected spacing

    Returns:
        Tuple of (spacing, confidence) or None
    """
    # If 2D, compute mean along first axis to get 1D profile
    if arr.ndim == 2:
        profile = np.mean(arr, axis=0)
    else:
        profile = arr

    # Compute gradient to find edges
    gradient = np.abs(np.diff(profile))

    # Try different spacings and find which one has the most consistent peaks
    best_spacing = None
    best_score = 0

    for spacing in range(min_spacing, min(max_spacing + 1, len(profile) // 2)):
        # Check how many expected grid lines we would have
        expected_lines = len(profile) // spacing

        if expected_lines < 2:
            continue

        # Sample at regular intervals and check gradient strength
        scores = []
        for i in range(1, expected_lines):
            pos = i * spacing
            if pos < len(gradient):
                # Look at a small window around the expected position
                window_start = max(0, pos - 2)
                window_end = min(len(gradient), pos + 3)
                window_max = np.max(gradient[window_start:window_end])
                scores.append(window_max)

        if len(scores) < 2:
            continue

        # Compute consistency score (high mean, low variance)
        mean_score = np.mean(scores)
        std_score = np.std(scores)

        # Penalize high variance
        consistency = mean_score / (1 + std_score)

        if consistency > best_score:
            best_score = consistency
            best_spacing = spacing

    if best_spacing is None:
        return None

    # Normalize confidence to 0-1 range
    confidence = min(1.0, best_score / 100)  # Assuming typical max score ~100

    return (best_spacing, confidence)
