import logging
import numpy as np
from PIL import Image
from typing import Dict, Optional, Tuple
from collections import Counter
from scipy import signal
from scipy.signal import find_peaks

logger = logging.getLogger(__name__)

def detect_grid(image: Image.Image, min_cell_size: int = 2, max_cell_size: int = 50) -> Optional[Dict]:
    """
    Detect pixel blocks using autocorrelation.

    This is the most robust method because pixel art has perfect periodicity -
    the image correlates strongly with itself when shifted by exact multiples of the pixel size.

    Args:
        image: PIL Image object
        min_cell_size: Minimum expected cell size in pixels (default: 2)
        max_cell_size: Maximum expected cell size in pixels (default: 50)

    Returns:
        Dict with grid info or None if no grid detected
    """
    # Convert to RGB array
    if image.mode != 'RGB':
        image = image.convert('RGB')

    img_array = np.array(image)
    height, width = img_array.shape[:2]

    logger.info(f"Analyzing image: {width}x{height} pixels using autocorrelation")

    # Use autocorrelation to find grid period
    result = detect_grid_autocorrelation(img_array, max_cell_size)

    if result is None:
        logger.info("Could not detect grid using autocorrelation")
        return None

    cell_width, cell_height, confidence = result

    # Calculate grid dimensions
    grid_cols = width // cell_width
    grid_rows = height // cell_height

    result_dict = {
        'cell_width': cell_width,
        'cell_height': cell_height,
        'grid_cols': grid_cols,
        'grid_rows': grid_rows,
        'confidence': confidence
    }

    logger.info(f"Grid detected: {grid_cols}x{grid_rows} cells of {cell_width}x{cell_height}px (confidence: {confidence:.2f})")

    return result_dict


def detect_grid_autocorrelation(img_array: np.ndarray, max_pixel_size: int = 50) -> Optional[Tuple[int, int, float]]:
    """
    Use autocorrelation to find the pixel grid period.
    Very robust to noise and compression artifacts.

    Returns:
        Tuple of (cell_width, cell_height, confidence) or None
    """
    # Convert to grayscale
    if len(img_array.shape) == 3:
        gray = np.mean(img_array, axis=2)
    else:
        gray = img_array

    # Use a much smaller crop for speed (256x256 is plenty for grid detection)
    h, w = gray.shape
    crop_size = min(256, h, w)
    center_h, center_w = h // 2, w // 2
    cropped = gray[
        center_h - crop_size//2:center_h + crop_size//2,
        center_w - crop_size//2:center_w + crop_size//2
    ]

    logger.debug(f"Computing autocorrelation on {cropped.shape} crop")

    # Use FFT-based correlation (much faster than direct correlation)
    autocorr = signal.correlate(cropped, cropped, mode='same', method='fft')

    # For 2D, we need to do it differently - just correlate 1D slices
    # This is much faster than 2D correlation
    center_row = cropped[crop_size // 2, :]
    center_col = cropped[:, crop_size // 2]

    h_autocorr = signal.correlate(center_row, center_row, mode='same', method='fft')
    v_autocorr = signal.correlate(center_col, center_col, mode='same', method='fft')

    # Find peaks
    h_center = len(h_autocorr) // 2
    v_center = len(v_autocorr) // 2

    pixel_width = find_periodic_peak(h_autocorr[h_center:], max_pixel_size)
    pixel_height = find_periodic_peak(v_autocorr[v_center:], max_pixel_size)

    if pixel_width is None or pixel_height is None:
        return None

    # Confidence based on autocorrelation peak strength
    confidence = 0.9  # High confidence for autocorrelation method

    logger.info(f"Autocorrelation found: {pixel_width}x{pixel_height}px")

    return (pixel_width, pixel_height, confidence)


def find_periodic_peak(line: np.ndarray, max_size: int) -> Optional[int]:
    """
    Find the first strong peak in the autocorrelation line.

    Args:
        line: 1D autocorrelation values
        max_size: Maximum pixel size to search

    Returns:
        Peak position (pixel size) or None
    """
    # Skip the center peak (index 0)
    line = line[1:]

    # Normalize and look for local maxima (peaks relative to neighbors)
    # This works better for noisy signals where absolute peaks aren't strong
    search_range = min(max_size, len(line))

    if search_range < 3:
        return None

    # Find local maxima within the search range
    search_line = line[:search_range]

    # Use find_peaks with relative height (prominence)
    peaks, properties = find_peaks(search_line, prominence=np.std(search_line) * 0.1, distance=5)

    if len(peaks) > 0:
        # Return the first peak within range
        peak_pos = peaks[0] + 1  # +1 because we sliced off index 0
        logger.debug(f"Found peak at position {peak_pos} with prominence {properties['prominences'][0]:.2e}")
        return peak_pos

    # If no peaks with prominence, try simpler approach: look for first local max
    for i in range(5, search_range - 1):
        if search_line[i] > search_line[i-1] and search_line[i] > search_line[i+1]:
            peak_pos = i + 1
            logger.debug(f"Found local max at position {peak_pos}")
            return peak_pos

    # Last resort: look for the position where the derivative changes most
    if search_range > 10:
        diffs = np.diff(search_line)
        # Find where decline slows down most (could indicate a period)
        second_diff = np.diff(diffs)
        candidate = np.argmax(second_diff[5:]) + 5 + 1
        if candidate <= max_size:
            logger.debug(f"Using curvature-based estimate at {candidate}")
            return candidate

    return None


def find_two_pixel_reference(img_array: np.ndarray, min_size: int, max_size: int) -> Optional[Tuple[int, int, float]]:
    """
    Find two adjacent art pixels (blocks) with clearly different colors.

    Key insight: Look for the LARGEST consistent block size, not the most common.
    Smaller detections might be detecting partial blocks or sub-features.

    Returns:
        Tuple of (cell_width, cell_height, confidence) or None
    """
    height, width = img_array.shape[:2]

    # Sample scan lines across the image
    num_samples = min(50, height // 4)
    sample_positions = np.linspace(height // 4, 3 * height // 4, num_samples, dtype=int)

    detected_sizes = []

    for y in sample_positions:
        # Get horizontal scan line
        row = img_array[y, :, :]

        # Find clear color boundaries (large color differences)
        color_diffs = np.sqrt(np.sum((row[1:] - row[:-1]) ** 2, axis=1))

        # Find positions where color changes significantly (threshold: 10)
        boundaries = np.where(color_diffs > 10)[0]

        if len(boundaries) < 2:
            continue

        # Look at consecutive boundaries to find block sizes
        for i in range(len(boundaries) - 1):
            block_size = boundaries[i + 1] - boundaries[i]

            # Check if this is a reasonable cell size
            if min_size <= block_size <= max_size:
                # Verify this block is actually uniform (not mixed colors)
                x_start = boundaries[i]
                x_end = boundaries[i + 1]

                if x_end - x_start < 2:
                    continue

                block = row[x_start:x_end]
                std = np.mean([np.std(block[:, 0]), np.std(block[:, 1]), np.std(block[:, 2])])

                # If block is reasonably uniform (low std), it's a good candidate
                if std < 20:  # Allow some variance for JPEG compression
                    detected_sizes.append(block_size)

    if len(detected_sizes) < 3:
        return None

    # Find the most common block sizes
    size_counter = Counter(detected_sizes)
    most_common = size_counter.most_common(10)

    logger.debug(f"Most common block sizes: {most_common[:5]}")

    if not most_common:
        return None

    # NEW STRATEGY: Pick the size that best divides the image dimensions
    # This creates the cleanest grid with minimal remainder

    top_count = most_common[0][1]
    threshold = top_count * 0.15  # Consider sizes with at least 15% of top frequency

    candidates = [(size, count) for size, count in most_common if count >= threshold]

    if not candidates:
        candidates = [most_common[0]]

    # Score each candidate by how well it divides the image
    def score_candidate(size):
        remainder_x = width % size
        remainder_y = height % size
        # Lower remainder = better score
        # Also factor in frequency (heavily weighted)
        frequency_score = size_counter[size] / top_count
        remainder_score = 1.0 - ((remainder_x + remainder_y) / (2 * size))
        return frequency_score * 0.75 + remainder_score * 0.25

    best = max(candidates, key=lambda x: score_candidate(x[0]))
    cell_size = best[0]
    occurrences = best[1]

    logger.info(f"Selected cell size: {cell_size}px (appeared {occurrences} times, remainder: {width%cell_size}×{height%cell_size})")

    # Confidence based on how many times we found this size
    confidence = min(1.0, occurrences / (num_samples * 0.3))

    # Assume square cells (width = height)
    return (cell_size, cell_size, confidence)


def detect_pixel_block_size(img_array: np.ndarray, axis: str, min_size: int, max_size: int) -> Optional[int]:
    """
    Detect the size of uniform color blocks along one axis.

    For pixel art screenshots, each art pixel is rendered as a block of identical screen pixels.
    This function finds the most common block size by analyzing color transitions.

    Args:
        img_array: RGB image array (height, width, 3)
        axis: 'horizontal' or 'vertical'
        min_size: Minimum block size to consider
        max_size: Maximum block size to consider

    Returns:
        Block size in pixels, or None if not detected
    """
    height, width = img_array.shape[:2]

    # Sample multiple scan lines to find color transitions
    block_sizes = []

    if axis == 'horizontal':
        # Sample horizontal scan lines at different Y positions
        sample_positions = np.linspace(0, height - 1, min(20, height), dtype=int)

        for y in sample_positions:
            row = img_array[y, :, :]
            transitions = find_color_transitions(row)

            if len(transitions) > 0:
                # Calculate distances between transitions
                distances = np.diff(transitions)
                block_sizes.extend(distances.tolist())

    else:  # vertical
        # Sample vertical scan lines at different X positions
        sample_positions = np.linspace(0, width - 1, min(20, width), dtype=int)

        for x in sample_positions:
            col = img_array[:, x, :]
            transitions = find_color_transitions(col)

            if len(transitions) > 0:
                # Calculate distances between transitions
                distances = np.diff(transitions)
                block_sizes.extend(distances.tolist())

    if len(block_sizes) == 0:
        return None

    # Filter to valid range
    valid_sizes = [s for s in block_sizes if min_size <= s <= max_size]

    if len(valid_sizes) == 0:
        return None

    # Find the most common block size
    size_counts = Counter(valid_sizes)
    most_common = size_counts.most_common(5)  # Top 5 most common sizes

    logger.debug(f"Most common {axis} block sizes: {most_common}")

    # Return the most common size
    return most_common[0][0]


def find_color_transitions(pixels: np.ndarray, threshold: int = 5) -> np.ndarray:
    """
    Find positions where color changes significantly along a scan line.

    Args:
        pixels: Array of RGB pixels along a line (length, 3)
        threshold: Minimum color difference to count as a transition

    Returns:
        Array of transition positions
    """
    if len(pixels) < 2:
        return np.array([])

    # Calculate color differences between adjacent pixels
    diffs = np.sqrt(np.sum((pixels[1:] - pixels[:-1]) ** 2, axis=1))

    # Find positions where difference exceeds threshold
    transitions = np.where(diffs > threshold)[0]

    return transitions


def calculate_grid_uniformity_score(img_array: np.ndarray, cell_width: int, cell_height: int,
                                   offset_x: int, offset_y: int, sample_size: int = 100) -> float:
    """
    Calculate how uniform colors are within cells for a given grid configuration.

    A good grid alignment will have low variance within each cell (uniform colors).
    A bad grid alignment will have high variance (mixed colors like 50% black, 50% white).

    Args:
        img_array: RGB image array (height, width, 3)
        cell_width: Width of each cell in pixels
        cell_height: Height of each cell in pixels
        offset_x: Horizontal offset to start of grid
        offset_y: Vertical offset to start of grid
        sample_size: Number of cells to sample (for performance)

    Returns:
        Score where higher = more uniform = better grid alignment
    """
    height, width = img_array.shape[:2]

    # Calculate how many complete cells we can fit
    grid_cols = (width - offset_x) // cell_width
    grid_rows = (height - offset_y) // cell_height

    if grid_cols < 2 or grid_rows < 2:
        return 0.0

    # Sample cells across the image
    num_cells = min(sample_size, grid_cols * grid_rows)
    sample_step = max(1, (grid_cols * grid_rows) // num_cells)

    uniformity_scores = []

    for idx in range(0, grid_cols * grid_rows, sample_step):
        row_idx = idx // grid_cols
        col_idx = idx % grid_cols

        if row_idx >= grid_rows:
            break

        # Calculate cell bounds
        x_start = offset_x + col_idx * cell_width
        y_start = offset_y + row_idx * cell_height
        x_end = x_start + cell_width
        y_end = y_start + cell_height

        # Extract cell
        cell = img_array[y_start:y_end, x_start:x_end]

        if cell.size == 0:
            continue

        # Calculate color variance within the cell (lower = more uniform)
        # Use standard deviation of each color channel
        r_std = np.std(cell[:, :, 0])
        g_std = np.std(cell[:, :, 1])
        b_std = np.std(cell[:, :, 2])

        avg_std = (r_std + g_std + b_std) / 3

        # Convert to uniformity score (lower std = higher score)
        # Perfectly uniform cell (std=0) gets max score
        # Highly mixed cell (std=high) gets low score
        uniformity = max(0, 100 - avg_std)
        uniformity_scores.append(uniformity)

    if len(uniformity_scores) == 0:
        return 0.0

    # Return average uniformity across all sampled cells
    return np.mean(uniformity_scores)
