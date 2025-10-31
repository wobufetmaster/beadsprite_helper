import logging
import numpy as np
from PIL import Image
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

def extract_pixels_simple(image: Image.Image) -> Dict:
    """
    Extract all pixels from an image as a grid.

    Args:
        image: PIL Image object

    Returns:
        Dict with width, height, and grid of RGB values
    """
    width, height = image.size

    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')

    # Extract all pixels
    pixels = list(image.getdata())

    # Organize into grid (row-major order)
    grid = []
    for y in range(height):
        row = []
        for x in range(width):
            idx = y * width + x
            r, g, b = pixels[idx]
            row.append({'r': r, 'g': g, 'b': b})
        grid.append(row)

    logger.info(f"Extracted {width}x{height} pixel grid")

    return {
        'width': width,
        'height': height,
        'grid': grid
    }


def extract_pixels_from_grid(image: Image.Image, grid_info: Dict) -> Dict:
    """
    Extract pixel art by sampling from a detected grid.

    For screenshots where each art pixel is a block of screen pixels,
    this samples each cell to get the representative color.
    Uses median color to avoid JPEG compression artifacts at edges.

    Args:
        image: PIL Image object
        grid_info: Grid detection result with cell_width, cell_height, grid_cols, grid_rows

    Returns:
        Dict with:
        - width: number of art pixels wide (grid_cols)
        - height: number of art pixels tall (grid_rows)
        - grid: 2D list of RGB dicts [{r, g, b}, ...]
    """
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')

    img_array = np.array(image)

    cell_width = grid_info['cell_width']
    cell_height = grid_info['cell_height']
    grid_cols = grid_info['grid_cols']
    grid_rows = grid_info['grid_rows']

    logger.info(f"Sampling {grid_cols}x{grid_rows} grid with {cell_width}x{cell_height}px cells")

    # Sample each cell
    grid = []
    for row_idx in range(grid_rows):
        row = []
        for col_idx in range(grid_cols):
            # Calculate cell bounds
            x_start = col_idx * cell_width
            y_start = row_idx * cell_height
            x_end = min(x_start + cell_width, img_array.shape[1])
            y_end = min(y_start + cell_height, img_array.shape[0])

            # Extract cell region - sample from center to avoid edges
            # Use inner 60% of cell to avoid JPEG compression artifacts at edges
            margin_x = int(cell_width * 0.2)
            margin_y = int(cell_height * 0.2)

            inner_x_start = x_start + margin_x
            inner_y_start = y_start + margin_y
            inner_x_end = max(inner_x_start + 1, x_end - margin_x)
            inner_y_end = max(inner_y_start + 1, y_end - margin_y)

            cell = img_array[inner_y_start:inner_y_end, inner_x_start:inner_x_end]

            # Use median color instead of mean to avoid edge blur artifacts
            if cell.size > 0:
                median_color = np.median(cell, axis=(0, 1))
                r, g, b = int(median_color[0]), int(median_color[1]), int(median_color[2])
            else:
                # Fallback if cell is too small
                r, g, b = 0, 0, 0

            row.append({'r': r, 'g': g, 'b': b})

        grid.append(row)

    logger.info(f"Extracted {grid_cols}x{grid_rows} downsampled pixel grid")

    return {
        'width': grid_cols,
        'height': grid_rows,
        'grid': grid
    }
