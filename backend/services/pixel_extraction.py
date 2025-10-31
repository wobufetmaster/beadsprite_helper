import logging
from PIL import Image
from typing import Dict, List

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
