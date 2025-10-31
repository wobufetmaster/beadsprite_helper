import pytest
from PIL import Image
import numpy as np
from services.pixel_extraction import extract_pixels_simple

def test_extract_pixels_simple():
    """Test simple pixel extraction from a small image."""
    # Create a 2x2 test image
    img = Image.new('RGB', (2, 2))
    pixels = [
        (255, 0, 0),    # Red
        (0, 255, 0),    # Green
        (0, 0, 255),    # Blue
        (255, 255, 255) # White
    ]
    img.putdata(pixels)

    result = extract_pixels_simple(img)

    assert result['width'] == 2
    assert result['height'] == 2
    assert len(result['grid']) == 2  # 2 rows
    assert len(result['grid'][0]) == 2  # 2 cols

    # Check first pixel is red
    assert result['grid'][0][0]['r'] == 255
    assert result['grid'][0][0]['g'] == 0
    assert result['grid'][0][0]['b'] == 0
